begin;

-- Existing installations retain their definitions and values. No POWRA counter is reset.
alter table public.organizations add column if not exists powra_reference_prefix text not null default 'POWRA',add column if not exists powra_reference_padding integer not null default 0;

create or replace function public.company_structure_administrator(p_org uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select public.company_document_member(p_org) and (
 exists(select 1 from public.organizations o where o.id=p_org and o.owner_id=auth.uid())
 or exists(select 1 from public.organization_people p join public.organization_person_authorizations a on a.person_id=p.id and a.organization_id=p.organization_id
   join public.organization_person_permissions m on m.person_id=p.id and m.organization_id=p.organization_id
   where p.organization_id=p_org and p.user_id=auth.uid() and a.function_key='company_administrator'
   and a.status='authorised' and (a.expires_at is null or a.expires_at>=current_date) and m.module_key='people_access' and m.access_level='admin'));
$$;
create table if not exists public.organization_departments(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 code text not null,name text not null,all_sites boolean not null default true,
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,id)
);
create unique index if not exists departments_company_code_idx on public.organization_departments(organization_id,lower(code));
create unique index if not exists departments_company_name_idx on public.organization_departments(organization_id,lower(name));
create table if not exists public.organization_department_sites(
 organization_id uuid not null references public.organizations(id),department_id uuid not null,site_id uuid not null references public.organization_sites(id),
 primary key(department_id,site_id),foreign key(organization_id,department_id) references public.organization_departments(organization_id,id)
);
create table if not exists public.organization_structure_events(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 actor_user_id uuid references auth.users(id),event_type text not null,record_id uuid,details jsonb not null,created_at timestamptz not null default now()
);
create or replace function public.seed_company_departments(p_org uuid)
returns void language sql security definer set search_path='' as $$
 insert into public.organization_departments(organization_id,code,name)
 select p_org,x.code,x.name from (values('HR','HR / People'),('RD','Research and Development'),('MKT','Marketing'),('SALES','Sales'),
 ('HSE','HSE'),('QA','Quality'),('OPS','Operations'),('ENG','Engineering'),('MAINT','Maintenance'),('FAC','Facilities'),
 ('FIN','Finance'),('IT','IT / Information Security'),('PROC','Procurement'),('LOG','Supply Chain / Logistics'),('TRAIN','Training'),('GOV','Leadership / Governance')) x(code,name)
 on conflict do nothing;
$$;
create or replace function public.bootstrap_company_departments() returns trigger language plpgsql security definer set search_path='' as $$
 begin perform public.seed_company_departments(new.id);return new;end $$;
drop trigger if exists organization_department_bootstrap on public.organizations;
create trigger organization_department_bootstrap after insert on public.organizations for each row execute function public.bootstrap_company_departments();
do $$ declare o record;begin for o in select id from public.organizations loop perform public.seed_company_departments(o.id);end loop;end $$;

create or replace function public.save_company_department(p_org uuid,p_id uuid,p_code text,p_name text,p_all_sites boolean,p_sites uuid[],p_status text)
returns uuid language plpgsql security definer set search_path='' as $$
 declare result uuid:=coalesce(p_id,gen_random_uuid());site uuid;
 begin
 if not public.company_structure_administrator(p_org) then raise exception 'Company administration permission required';end if;
 perform 1 from public.organizations where id=p_org for update;
 if p_id is not null and not exists(select 1 from public.organization_departments where id=p_id and organization_id=p_org) then raise exception 'Department unavailable';end if;
 if trim(p_code)!~'^[A-Za-z0-9_-]{1,20}$' or length(trim(p_name)) not between 2 and 150 or p_all_sites is null or p_status not in ('active','inactive') then raise exception 'Enter a valid code, name and department status';end if;
 if not p_all_sites and cardinality(coalesce(p_sites,'{}'))=0 then raise exception 'Select at least one applicable company site';end if;
 foreach site in array coalesce(p_sites,'{}') loop
  if not exists(select 1 from public.organization_sites s where s.id=site and s.organization_id=p_org and (s.status='active' or exists(select 1 from public.organization_department_sites l where l.department_id=result and l.site_id=s.id))) then raise exception 'Select sites belonging to this company';end if;
 end loop;
 if not p_all_sites and exists(select 1 from public.organization_people p where p.organization_id=p_org and p.department_id=result and (p.site_id is null or not(p.site_id=any(coalesce(p_sites,'{}'))))) then raise exception 'Reassign existing people before removing their department site applicability';end if;
 insert into public.organization_departments(id,organization_id,code,name,all_sites,status) values(result,p_org,upper(trim(p_code)),trim(p_name),p_all_sites,p_status)
 on conflict(id) do update set code=excluded.code,name=excluded.name,all_sites=excluded.all_sites,status=excluded.status,updated_at=now();
 delete from public.organization_department_sites where department_id=result;
 if not p_all_sites then insert into public.organization_department_sites(organization_id,department_id,site_id) select p_org,result,x from unnest(p_sites) x group by x;end if;
 insert into public.organization_structure_events(organization_id,actor_user_id,event_type,record_id,details) values(p_org,auth.uid(),'department_saved',result,jsonb_build_object('code',upper(trim(p_code)),'name',trim(p_name),'status',p_status,'all_sites',p_all_sites,'sites',p_sites));
 return result;
 end $$;

alter table public.organization_people add column if not exists department_id uuid references public.organization_departments(id),add column if not exists department_legacy_text text;
update public.organization_people set department_legacy_text=department where department_legacy_text is null and nullif(trim(department),'') is not null;
create or replace function public.guard_company_person_department() returns trigger language plpgsql security definer set search_path='' as $$
 declare d public.organization_departments;unchanged boolean:=false;
 begin
 if new.department_id is null then return new;end if;
 select * into d from public.organization_departments where id=new.department_id and organization_id=new.organization_id;
 if not found then raise exception 'Department must belong to the person company';end if;
 if TG_OP='UPDATE' then unchanged:=old.department_id is not distinct from new.department_id and old.organization_id is not distinct from new.organization_id and old.site_id is not distinct from new.site_id;end if;
 if not unchanged then
  if d.status<>'active' then raise exception 'Select an active company department';end if;
  if not d.all_sites and (new.site_id is null or not exists(select 1 from public.organization_department_sites where department_id=d.id and site_id=new.site_id)) then raise exception 'Department is not applicable to the selected site';end if;
 end if;
 new.department:=d.name;return new;
 end $$;
drop trigger if exists company_person_department_guard on public.organization_people;
create trigger company_person_department_guard before insert or update of department_id,organization_id,site_id,department on public.organization_people for each row execute function public.guard_company_person_department();
update public.organization_people p set department_id=d.id from public.organization_departments d where p.department_id is null and p.organization_id=d.organization_id and d.status='active' and lower(trim(p.department))=lower(d.name) and d.all_sites;

create table if not exists public.document_classifications(
 key text primary key,label text not null,kind text not null check(kind in ('standard','family','continuity')),active boolean not null default true,position integer not null default 0
);
insert into public.document_classifications(key,label,kind,position) values
 ('iso9001_2026','ISO 9001:2026','standard',10),('iso9001_2015','ISO 9001:2015 / Amd 1:2024','standard',11),('iso14001_2026','ISO 14001:2026','standard',20),('iso14001_2015','ISO 14001:2015','standard',21),('iso45001','ISO 45001:2018','standard',30),('iso22301','ISO 22301:2019','standard',40),('iso27001','ISO/IEC 27001:2022','standard',50),('iso17025','ISO/IEC 17025:2017','standard',60),('iso17024','ISO/IEC 17024','standard',70),('as9100','AS9100 Rev D','standard',80),
 ('risk_assessments','Risk Assessments','family',10),('powra','POWRA','family',20),('permits','Permit to Work','family',30),('inspections','Workplace Inspections','family',40),('hse_change','HSE Management of Change','family',50),('incidents','Accident, Incident and Near Misses','family',60),('audit','Internal Audit','family',70),('findings','Findings and Actions','family',80),('capa','CAPA / 8D','family',90),('assets','Assets, PPM and Calibration','family',100),('suppliers','Supplier Assurance','family',110),('isms','Information Security','family',120),('continuity','Business Continuity','family',130),('people','People and Training','family',140),('governance','Company Governance','family',150),('documents','Document Control','family',160),
 ('bc_site','Site Continuity Profile','continuity',10),('bc_context','Context and Interested Parties','continuity',20),('bc_roles','Roles and Responsibilities','continuity',30),('bc_hazards','Hazard Scenarios','continuity',40),('bc_bia','Business Impact Analysis','continuity',50),('bc_outsourced','Outsourced Processes','continuity',60),('bc_strategy','Strategies and Solutions','continuity',70),('bc_response','Incident Response','continuity',80),('bc_plan','Continuity and Recovery Plans','continuity',90),('bc_learning','Learning, Exercises and Training','continuity',100)
 on conflict(key) do nothing;
create table if not exists public.company_document_classifications(document_id uuid not null references public.company_documents(id),classification_key text not null references public.document_classifications(key),primary key(document_id,classification_key));
create table if not exists public.company_document_sites(document_id uuid not null references public.company_documents(id),site_id uuid not null references public.organization_sites(id),primary key(document_id,site_id));
create table if not exists public.company_document_departments(document_id uuid not null references public.company_documents(id),department_id uuid not null references public.organization_departments(id),primary key(document_id,department_id));
alter table public.company_documents add column if not exists applicability text not null default 'company' check(applicability in ('company','selected')),add column if not exists legacy_standard_text text;
update public.company_documents set legacy_standard_text=standard where legacy_standard_text is null and nullif(trim(standard),'') is not null;
-- No fuzzy conversion of legacy standard or department text.
insert into public.company_document_classifications(document_id,classification_key) select d.id,c.key from public.company_documents d join public.document_classifications c on lower(trim(d.standard))=lower(c.label) on conflict do nothing;

create table if not exists public.company_document_numbering(
 organization_id uuid primary key references public.organizations(id),company_code text not null default 'DOC',padding integer not null default 5 check(padding between 3 and 8)
);
create table if not exists public.company_reference_counters(
 organization_id uuid not null references public.organizations(id),series text not null,last_number bigint not null check(last_number>0),primary key(organization_id,series)
);
create table if not exists public.company_document_save_requests(
 organization_id uuid not null references public.organizations(id),request_id uuid not null,actor_user_id uuid not null references auth.users(id),document_id uuid not null references public.company_documents(id),operation_hash text not null,created_at timestamptz not null default now(),primary key(organization_id,request_id)
);

create or replace function public.company_document_command(p_org uuid,p_id uuid,p_command text,p_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare d public.company_documents; n public.company_documents; me uuid; person uuid; item jsonb; role_name text;
 can_edit boolean; current_id uuid; review_count integer; new_id uuid:=coalesce(nullif(p_data->>'draft_id','')::uuid,gen_random_uuid()); requested_status text;
begin
 if not public.company_document_member(p_org) then raise exception 'Company document access denied'; end if;
 select p.id into me from public.organization_people p where p.organization_id=p_org and p.user_id=auth.uid()
   and p.account_type='system' and p.account_status='active' limit 1;
 if me is null then raise exception 'An active linked company profile is required'; end if;
 if p_command='create' then
  if nullif(trim(p_data->>'document_number'),'') is null or nullif(trim(p_data->>'title'),'') is null
    or nullif(trim(p_data->>'revision'),'') is null or nullif(trim(p_data->>'change_reason'),'') is null
    or nullif(trim(p_data->>'change_impact'),'') is null then raise exception 'Complete the document details and change assessment'; end if;
  if exists(select 1 from public.company_documents where organization_id=p_org and document_number=trim(p_data->>'document_number'))
    then raise exception 'That document number already exists; create a revision from its current record'; end if;
  insert into public.company_documents(id,organization_id,series_id,document_number,title,document_type,standard,revision,description,
   author_user_id,owner_person_id,change_reason,change_impact)
   values(new_id,p_org,new_id,trim(p_data->>'document_number'),trim(p_data->>'title'),coalesce(p_data->>'document_type','Procedure'),
   coalesce(p_data->>'standard',''),trim(p_data->>'revision'),coalesce(p_data->>'description',''),auth.uid(),me,p_data->>'change_reason',p_data->>'change_impact') returning * into d;
 else
  select * into d from public.company_documents where id=p_id and organization_id=p_org for update;
  if not found or not public.can_read_company_document(d.id) then raise exception 'Document unavailable'; end if;
  can_edit:=d.author_user_id=auth.uid() or d.owner_person_id=me or public.company_document_controller(p_org);
  if p_command='revise' then
   if not can_edit or d.status<>'current' then raise exception 'Only an authorised owner, author or controller can revise a current document'; end if;
   if nullif(trim(p_data->>'revision'),'') is null or nullif(trim(p_data->>'change_reason'),'') is null
     or nullif(trim(p_data->>'change_impact'),'') is null then raise exception 'New revision, reason and impact assessment are required'; end if;
   insert into public.company_documents(id,organization_id,series_id,document_number,title,document_type,standard,revision,description,
    author_user_id,owner_person_id,previous_document_id,change_reason,change_impact)
    values(new_id,p_org,d.series_id,d.document_number,d.title,d.document_type,d.standard,trim(p_data->>'revision'),d.description,
    auth.uid(),d.owner_person_id,d.id,p_data->>'change_reason',p_data->>'change_impact') returning * into n;
   d:=n;
  elsif p_command='save' then
   if not can_edit or d.status<>'draft' then raise exception 'Only a draft can be edited'; end if;
   person:=(p_data->>'owner_person_id')::uuid;
   if not exists(select 1 from public.organization_people p where p.id=person and p.organization_id=p_org and p.account_status='active' and p.account_type='system' and p.user_id is not null)
      then raise exception 'Select an active company document owner'; end if;
   if nullif(trim(p_data->>'title'),'') is null or nullif(trim(p_data->>'change_reason'),'') is null
      or nullif(trim(p_data->>'change_impact'),'') is null then raise exception 'Title, reason and impact assessment are required'; end if;
   if (p_data->>'distribution') not in ('company','selected') then raise exception 'Select a distribution scope'; end if;
   if nullif(p_data->>'file_path','') is not null and ((p_data->>'file_path') not like p_org::text||'/'||d.id::text||'/%' or (p_data->>'file_path') like '%..%')
      then raise exception 'Invalid company file location'; end if;
   update public.company_documents set title=trim(p_data->>'title'),document_type=coalesce(p_data->>'document_type','Procedure'),
    standard=coalesce(p_data->>'standard',''),description=coalesce(p_data->>'description',''),owner_person_id=person,
    change_reason=p_data->>'change_reason',change_impact=p_data->>'change_impact',
    distribution=p_data->>'distribution',due_date=nullif(p_data->>'due_date','')::date,review_date=nullif(p_data->>'review_date','')::date,
    file_path=coalesce(nullif(p_data->>'file_path',''),file_path),file_name=coalesce(nullif(p_data->>'file_name',''),file_name),
    file_sha256=coalesce(nullif(p_data->>'file_sha256',''),file_sha256),updated_at=now() where id=d.id returning * into d;
   delete from public.company_document_reviews where document_id=d.id;
   for item in select * from jsonb_array_elements(coalesce(p_data->'reviews','[]'::jsonb)) loop
    person:=(item->>'person_id')::uuid;role_name:=item->>'role';
    if not exists(select 1 from public.organization_people p where p.id=person and p.organization_id=p_org and p.account_status='active'
      and p.account_type='system' and p.user_id is not null and p.user_id<>d.author_user_id and p.id<>d.owner_person_id)
      then raise exception 'Reviewers and approvers must be active independent company users'; end if;
    if exists(select 1 from public.company_document_reviews r join public.organization_people p on p.id=r.person_id where r.document_id=d.id and p.user_id=(select user_id from public.organization_people where id=person))
      then raise exception 'Choose different people for verification and approval'; end if;
    insert into public.company_document_reviews(document_id,person_id,role) values(d.id,person,role_name);
   end loop;
   delete from public.company_document_recipients where document_id=d.id;
   for item in select * from jsonb_array_elements(coalesce(p_data->'recipients','[]'::jsonb)) loop
    person:=(item#>>'{}')::uuid;
    if not exists(select 1 from public.organization_people p where p.id=person and p.organization_id=p_org and p.account_status='active'
       and p.account_type='system' and p.user_id is not null) then raise exception 'Distribution must use active users from this company'; end if;
    insert into public.company_document_recipients(document_id,person_id) values(d.id,person) on conflict do nothing;
   end loop;
  elsif p_command='recall' then
   if not can_edit or d.status not in ('in_review','approved') or nullif(trim(p_data->>'comments'),'') is null
     then raise exception 'An authorised recall and reason are required'; end if;
   update public.company_documents set status='draft',updated_at=now() where id=d.id;
   update public.company_document_reviews set accepted_at=null,decision=null,comments=null,decided_at=null,decided_by=null where document_id=d.id;
  elsif p_command='submit' then
   if not can_edit or d.status<>'draft' or d.file_path is null then raise exception 'Save a draft with a file before submitting'; end if;
   if not exists(select 1 from public.company_document_reviews where document_id=d.id and role='verifier')
      or not exists(select 1 from public.company_document_reviews where document_id=d.id and role='approver')
      then raise exception 'Assign at least one independent verifier and one approver'; end if;
   if d.distribution='selected' and not exists(select 1 from public.company_document_recipients where document_id=d.id)
      then raise exception 'Select the distribution recipients'; end if;
   update public.company_documents set status='in_review',updated_at=now() where id=d.id;
  elsif p_command in ('accept','confirm','changes_required') then
   if d.status<>'in_review' then raise exception 'This draft is not awaiting review'; end if;
   role_name:=p_data->>'role';
   if not exists(select 1 from public.company_document_reviews where document_id=d.id and person_id=me and role=role_name and decision is null)
     or d.author_user_id=auth.uid() or d.owner_person_id=me then raise exception 'Only the assigned independent person may record this decision'; end if;
   if p_command='accept' then
    update public.company_document_reviews set accepted_at=coalesce(accepted_at,now()) where document_id=d.id and person_id=me and role=role_name;
   else
    if not exists(select 1 from public.company_document_reviews where document_id=d.id and person_id=me and role=role_name and accepted_at is not null)
      then raise exception 'Accept the assignment before recording your decision'; end if;
    if nullif(trim(p_data->>'comments'),'') is null then raise exception 'Record the reason for your decision'; end if;
    if role_name='approver' and p_command='confirm' and exists(select 1 from public.company_document_reviews where document_id=d.id and role='verifier' and decision is distinct from 'confirmed')
      then raise exception 'All verifiers must confirm before approval'; end if;
    update public.company_document_reviews set decision=case when p_command='confirm' then 'confirmed' else 'changes_required' end,
      comments=p_data->>'comments',decided_at=now(),decided_by=auth.uid() where document_id=d.id and person_id=me and role=role_name;
    if p_command='changes_required' then
     update public.company_documents set status='draft',updated_at=now() where id=d.id;
    elsif not exists(select 1 from public.company_document_reviews where document_id=d.id and decision is distinct from 'confirmed') then
     update public.company_documents set status='approved',updated_at=now() where id=d.id;
    end if;
   end if;
  elsif p_command='release' then
   if not (d.author_user_id=auth.uid() or d.owner_person_id=me) or d.status<>'approved' then raise exception 'Only the author or owner can release an approved revision'; end if;
   if exists(select 1 from public.company_document_sites l join public.organization_sites s on s.id=l.site_id where l.document_id=d.id and s.status<>'active') or exists(select 1 from public.company_document_departments l join public.organization_departments dep on dep.id=l.department_id where l.document_id=d.id and dep.status<>'active') then raise exception 'Document applicability changed; recall the draft and review its sites and departments';end if;
   if not exists(select 1 from public.company_document_reviews where document_id=d.id and role='verifier')
    or not exists(select 1 from public.company_document_reviews where document_id=d.id and role='approver')
    or exists(select 1 from public.company_document_reviews r join public.organization_people p on p.id=r.person_id where r.document_id=d.id
      and (r.decision is distinct from 'confirmed' or r.accepted_at is null or p.organization_id<>p_org or p.account_status<>'active'
      or p.account_type<>'system' or p.user_id is null or r.decided_by is distinct from p.user_id or p.user_id=d.author_user_id or p.id=d.owner_person_id))
    then raise exception 'All independent review assignments must remain valid and confirmed'; end if;
   if d.distribution='company' then
    insert into public.company_document_recipients(document_id,person_id)
     select d.id,p.id from public.organization_people p where p.organization_id=p_org and p.account_status='active' and p.account_type='system' and p.user_id is not null on conflict do nothing;
   end if;
   if not exists(select 1 from public.company_document_recipients r join public.organization_people p on p.id=r.person_id where r.document_id=d.id and p.organization_id=p_org and p.account_status='active')
      then raise exception 'No active distribution recipients remain'; end if;
   -- Per-series advisory lock serialises concurrent release requests, in addition to the unique current index.
   perform pg_advisory_xact_lock(hashtextextended(d.series_id::text,0));
   if d.previous_document_id is not null and not exists(select 1 from public.company_documents where id=d.previous_document_id and organization_id=p_org and status='current')
      then raise exception 'The current revision changed; review this revision again'; end if;
   update public.company_documents set status='superseded',updated_at=now() where organization_id=p_org and series_id=d.series_id and status='current';
   update public.company_documents set status='current',issued_at=now(),released_by=auth.uid(),updated_at=now() where id=d.id;
  elsif p_command='acknowledge' then
   if d.status<>'current' then raise exception 'Only the current released revision can be acknowledged'; end if;
   if d.distribution='company' then
    insert into public.company_document_recipients(document_id,person_id) values(d.id,me) on conflict do nothing;
   end if;
   update public.company_document_recipients set acknowledged_at=coalesce(acknowledged_at,now()),acknowledged_by=auth.uid()
    where document_id=d.id and person_id=me;
   if not found then raise exception 'You are not a distribution recipient'; end if;
  elsif p_command='withdraw' then
   if not can_edit or d.status not in ('draft','approved','current') or nullif(trim(p_data->>'comments'),'') is null
      then raise exception 'An authorised withdrawal and reason are required'; end if;
   update public.company_documents set status='withdrawn',updated_at=now() where id=d.id;
  else raise exception 'Unknown document operation';
  end if;
 end if;
 insert into public.company_document_events(document_id,organization_id,actor_user_id,event_type,details)
 values(d.id,p_org,auth.uid(),p_command,jsonb_build_object('revision',d.revision,'reason',coalesce(p_data->>'comments',p_data->>'change_reason'),
 'role',p_data->>'role','file_sha256',coalesce(p_data->>'file_sha256',d.file_sha256),
 'reviews',case when p_command='save' then p_data->'reviews' else null end,
 'distribution',case when p_command='save' then p_data->>'distribution' else d.distribution end,
 'recipients',case when p_command='save' then p_data->'recipients' else null end));
 return d.id;
end;
$$;


create or replace function public.guard_department_site_company() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if not exists(select 1 from public.organization_sites where id=new.site_id and organization_id=new.organization_id) then raise exception 'Department site must belong to the same company';end if;
 return new;end $$;
drop trigger if exists department_site_company_guard on public.organization_department_sites;
create trigger department_site_company_guard before insert or update on public.organization_department_sites for each row execute function public.guard_department_site_company();
create or replace function public.guard_document_scope_company() returns trigger language plpgsql security definer set search_path='' as $$
 declare company uuid;target uuid;
 begin
 select organization_id into company from public.company_documents where id=new.document_id;
 if TG_TABLE_NAME='company_document_sites' then select organization_id into target from public.organization_sites where id=new.site_id;
 elsif TG_TABLE_NAME='company_document_departments' then select organization_id into target from public.organization_departments where id=new.department_id;
 else raise exception 'Unsupported document scope';end if;
 if company is null or target is distinct from company then raise exception 'Document scope must belong to the same company';end if;
 return new;end $$;
drop trigger if exists document_sites_company_guard on public.company_document_sites;
create trigger document_sites_company_guard before insert or update on public.company_document_sites for each row execute function public.guard_document_scope_company();
drop trigger if exists document_departments_company_guard on public.company_document_departments;
create trigger document_departments_company_guard before insert or update on public.company_document_departments for each row execute function public.guard_document_scope_company();
revoke all on function public.guard_department_site_company(),public.guard_document_scope_company() from public,anon,authenticated;

create or replace function public.save_company_document_draft(p_org uuid,p_id uuid,p_request uuid,p_submit boolean,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
 declare d public.company_documents;previous public.company_document_save_requests;numbering public.company_document_numbering;
 actor_person uuid;result uuid;seq bigint;v_series text;reference text;key_name text;selected_id uuid;labels text;fingerprint text;
 begin
 if not public.company_document_member(p_org) or p_request is null then raise exception 'Active company document access and request identity are required';end if;
 if coalesce(jsonb_array_length(p_data->'classifications'),0)>100 or coalesce(jsonb_array_length(p_data->'sites'),0)>500 or coalesce(jsonb_array_length(p_data->'departments'),0)>500 then raise exception 'Too many classification or scope selections';end if;
 fingerprint:=md5(jsonb_build_object('id',p_id,'submit',p_submit,'data',p_data)::text);
 perform pg_advisory_xact_lock(hashtextextended(p_org::text||p_request::text,0));
 select * into previous from public.company_document_save_requests where organization_id=p_org and request_id=p_request;
 if found then
  if previous.actor_user_id<>auth.uid() or previous.operation_hash<>fingerprint then raise exception 'This request changed; reload the document form';end if;
  if not public.can_read_company_document(previous.document_id) then raise exception 'Document unavailable';end if;
  return previous.document_id;
 end if;
 select id into actor_person from public.organization_people where organization_id=p_org and user_id=auth.uid() and account_type='system' and account_status='active' limit 1;
 if actor_person is null then raise exception 'Complete your linked company profile first';end if;
 if p_id is null then
  perform 1 from public.organizations where id=p_org for share;
  v_series:=case p_data->>'document_type' when 'Policy' then 'POL' when 'Procedure' then 'PRO' when 'Work Instruction' then 'WI' when 'Manual' then 'MAN' when 'Plan' then 'PLAN' when 'Form' then 'FRM' when 'Template' then 'TPL' when 'Register' then 'REG' when 'Assessment' then 'ASM' when 'Report' then 'RPT' when 'Guidance' then 'GDE' when 'Specification' then 'SPEC' when 'External Document' then 'EXT' when 'Record' then 'REC' when 'Other' then 'OTH' else null end;
  if v_series is null then raise exception 'Select a supported document type';end if;
  select * into numbering from public.company_document_numbering where organization_id=p_org;
  if not found then numbering.company_code:='DOC';numbering.padding:=5;end if;
  loop
   insert into public.company_reference_counters(organization_id,series,last_number) values(p_org,v_series,1)
    on conflict(organization_id,series) do update set last_number=public.company_reference_counters.last_number+1 returning last_number into seq;
   reference:=numbering.company_code||'-'||v_series||'-'||lpad(seq::text,greatest(numbering.padding,length(seq::text)),'0');
   exit when not exists(select 1 from public.company_documents where organization_id=p_org and document_number=reference);
  end loop;
  result:=public.company_document_command(p_org,null,'create',p_data||jsonb_build_object('document_number',reference));
 else
  select * into d from public.company_documents where id=p_id and organization_id=p_org for update;
  if not found or not public.can_read_company_document(d.id) or d.status<>'draft' then raise exception 'The document draft is unavailable';end if;
  if nullif(p_data->>'expected_updated_at','') is null or d.updated_at is distinct from (p_data->>'expected_updated_at')::timestamptz then raise exception 'This draft changed in another session; reload before saving';end if;
  result:=p_id;
 end if;
 perform public.company_document_command(p_org,result,'save',p_data||jsonb_build_object('owner_person_id',coalesce(nullif(p_data->>'owner_person_id','')::uuid,actor_person)));
 if (p_data->>'applicability') not in ('company','selected') then raise exception 'Select document applicability';end if;
 delete from public.company_document_classifications where document_id=result;
 for key_name in select jsonb_array_elements_text(coalesce(p_data->'classifications','[]'::jsonb)) loop
  if not exists(select 1 from public.document_classifications where key=key_name and active) then raise exception 'Select current document classifications';end if;
  insert into public.company_document_classifications values(result,key_name) on conflict do nothing;
 end loop;
 if exists(select 1 from public.company_document_classifications l join public.document_classifications c on c.key=l.classification_key where l.document_id=result and c.kind='continuity') then
  insert into public.company_document_classifications values(result,'continuity') on conflict do nothing;
 end if;
 delete from public.company_document_sites where document_id=result;
 delete from public.company_document_departments where document_id=result;
 if p_data->>'applicability'='selected' then
  for selected_id in select jsonb_array_elements_text(coalesce(p_data->'sites','[]'::jsonb))::uuid loop
   if not exists(select 1 from public.organization_sites where id=selected_id and organization_id=p_org and status='active') then raise exception 'Select active sites from this company';end if;
   insert into public.company_document_sites values(result,selected_id) on conflict do nothing;
  end loop;
  for selected_id in select jsonb_array_elements_text(coalesce(p_data->'departments','[]'::jsonb))::uuid loop
   if not exists(select 1 from public.organization_departments where id=selected_id and organization_id=p_org and status='active') then raise exception 'Select active departments from this company';end if;
   if exists(select 1 from public.company_document_sites where document_id=result) and not exists(select 1 from public.organization_departments dep where dep.id=selected_id and (dep.all_sites or exists(select 1 from public.organization_department_sites l join public.company_document_sites s on s.site_id=l.site_id where l.department_id=dep.id and s.document_id=result))) then raise exception 'A selected department does not apply to the selected sites';end if;
   insert into public.company_document_departments values(result,selected_id) on conflict do nothing;
  end loop;
  if not exists(select 1 from public.company_document_sites where document_id=result) and not exists(select 1 from public.company_document_departments where document_id=result) then raise exception 'Select at least one site or department';end if;
 end if;
 select string_agg(c.label,' · ' order by c.kind,c.position,c.key) into labels from public.company_document_classifications l join public.document_classifications c on c.key=l.classification_key where l.document_id=result;
 update public.company_documents set applicability=p_data->>'applicability',standard=coalesce(labels,'') where id=result;
 insert into public.company_document_events(document_id,organization_id,actor_user_id,event_type,details) values(result,p_org,auth.uid(),'classification_and_scope_saved',jsonb_build_object('classifications',p_data->'classifications','applicability',p_data->>'applicability','sites',p_data->'sites','departments',p_data->'departments'));
 if p_submit then perform public.company_document_command(p_org,result,'submit','{}'::jsonb);end if;
 insert into public.company_document_save_requests values(p_org,p_request,auth.uid(),result,fingerprint,now());
 return result;
 end $$;

create or replace function public.save_company_document_settings(p_org uuid,p_code text,p_padding integer,p_powra_prefix text,p_powra_padding integer)
returns void language plpgsql security definer set search_path='' as $$
 begin
 if not public.company_structure_administrator(p_org) then raise exception 'Company administration permission required';end if;
 if p_code!~'^[A-Z0-9][A-Z0-9_-]{0,19}$' or p_padding not between 3 and 8 or p_powra_prefix!~'^[A-Za-z0-9_-]{1,40}$' or p_powra_padding not between 0 and 8 then raise exception 'Check the numbering code, prefix and padding';end if;
 perform 1 from public.organizations where id=p_org for update;
 insert into public.company_document_numbering values(p_org,p_code,p_padding) on conflict(organization_id) do update set company_code=excluded.company_code,padding=excluded.padding;
 -- Preserve the deployed POWRA allocator and its counter; only move its settings UI.
 update public.organizations set powra_reference_prefix=p_powra_prefix,powra_reference_padding=p_powra_padding where id=p_org;
 insert into public.organization_structure_events(organization_id,actor_user_id,event_type,details) values(p_org,auth.uid(),'document_numbering_settings',jsonb_build_object('code',p_code,'padding',p_padding,'powra_prefix',p_powra_prefix,'powra_padding',p_powra_padding));
 end $$;

create or replace function public.copy_company_document_scope() returns trigger language plpgsql security definer set search_path='' as $$
 declare parent public.company_documents;
 begin
 if new.previous_document_id is null then return new;end if;
 select * into parent from public.company_documents where id=new.previous_document_id and organization_id=new.organization_id;
 if not found then raise exception 'Revision parent must belong to the same company';end if;
 insert into public.company_document_classifications select new.id,classification_key from public.company_document_classifications where document_id=parent.id;
 insert into public.company_document_sites select new.id,site_id from public.company_document_sites where document_id=parent.id;
 insert into public.company_document_departments select new.id,department_id from public.company_document_departments where document_id=parent.id;
 insert into public.company_document_recipients(document_id,person_id) select new.id,person_id from public.company_document_recipients where document_id=parent.id;
 update public.company_documents set applicability=parent.applicability,distribution=parent.distribution where id=new.id;
 return new;
 end $$;
drop trigger if exists company_document_revision_scope on public.company_documents;
create trigger company_document_revision_scope after insert on public.company_documents for each row execute function public.copy_company_document_scope();
revoke all on function public.copy_company_document_scope() from public,anon,authenticated;

-- Request-scoped reads; mutation functions derive the actor from auth.uid().
do $$ declare t text;begin
 foreach t in array array['organization_departments','organization_department_sites','organization_structure_events','company_document_numbering','company_reference_counters','company_document_save_requests'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
  execute format('drop policy if exists company_structure_read on public.%I',t);
  execute format('create policy company_structure_read on public.%I for select to authenticated using(public.%s(organization_id))',t,case when t in ('organization_structure_events','company_reference_counters','company_document_save_requests') then 'company_structure_administrator' else 'company_document_member' end);
 end loop;
 foreach t in array array['company_document_classifications','company_document_sites','company_document_departments'] loop
  execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);execute format('grant all on public.%I to service_role',t);
  execute format('drop policy if exists document_scope_read on public.%I',t);
  execute format('create policy document_scope_read on public.%I for select to authenticated using(public.can_read_company_document(document_id))',t);
 end loop;
 end $$;
alter table public.document_classifications enable row level security;
drop policy if exists document_catalogue_read on public.document_classifications;
create policy document_catalogue_read on public.document_classifications for select to authenticated using(true);
revoke all on public.document_classifications from anon,authenticated;grant select on public.document_classifications to authenticated;grant all on public.document_classifications to service_role;
revoke all on function public.company_structure_administrator(uuid),public.seed_company_departments(uuid),public.bootstrap_company_departments(),public.guard_company_person_department(),public.save_company_department(uuid,uuid,text,text,boolean,uuid[],text),public.save_company_document_draft(uuid,uuid,uuid,boolean,jsonb),public.save_company_document_settings(uuid,text,integer,text,integer) from public,anon,authenticated;
grant execute on function public.company_structure_administrator(uuid),public.save_company_department(uuid,uuid,text,text,boolean,uuid[],text),public.save_company_document_draft(uuid,uuid,uuid,boolean,jsonb),public.save_company_document_settings(uuid,text,integer,text,integer) to authenticated;
commit;
