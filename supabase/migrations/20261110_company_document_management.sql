begin;

-- RPG's original collection remains intact and is no longer customer-shared.
create or replace function public.is_rpg_document_administrator()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null
   and lower(u.email) in ('r.pereszczako@sky.com','info@rpgexcellence.com'))
 or exists(select 1 from public.portal_admins p where p.user_id=auth.uid() and p.active=true and p.role in ('admin','document_controller'));
$$;
revoke all on function public.is_rpg_document_administrator() from public,anon;
grant execute on function public.is_rpg_document_administrator() to authenticated;
alter table public.controlled_documents enable row level security;
-- RESTRICTIVE also constrains any old permissive audience policies.
drop policy if exists rpg_documents_private on public.controlled_documents;
create policy rpg_documents_private on public.controlled_documents as restrictive for all to authenticated
 using(public.is_rpg_document_administrator()) with check(public.is_rpg_document_administrator());
revoke all on public.controlled_documents from anon;
drop policy if exists rpg_documents_anonymous on public.controlled_documents;
create policy rpg_documents_anonymous on public.controlled_documents as restrictive for all to anon using(false) with check(false);
drop policy if exists rpg_document_storage_private on storage.objects;
create policy rpg_document_storage_private on storage.objects as restrictive for all to authenticated
 using(bucket_id<>'controlled-documents' or public.is_rpg_document_administrator())
 with check(bucket_id<>'controlled-documents' or public.is_rpg_document_administrator());
drop policy if exists rpg_document_storage_anonymous on storage.objects;
create policy rpg_document_storage_anonymous on storage.objects as restrictive for all to anon
 using(bucket_id<>'controlled-documents') with check(bucket_id<>'controlled-documents');
update storage.buckets set public=false where id='controlled-documents';
insert into storage.buckets(id,name,public,file_size_limit)
 values('company-controlled-documents','company-controlled-documents',false,3145728)
 on conflict(id) do update set public=false,file_size_limit=3145728;
-- Company files are served through an authenticated download route only.
drop policy if exists company_document_storage_private on storage.objects;
create policy company_document_storage_private on storage.objects as restrictive for all to authenticated,anon
 using(bucket_id<>'company-controlled-documents') with check(bucket_id<>'company-controlled-documents');

create table if not exists public.company_documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 series_id uuid not null, document_number text not null, title text not null,
 document_type text not null default 'Procedure', standard text not null default '', revision text not null,
 description text not null default '', status text not null default 'draft'
   check(status in ('draft','in_review','approved','current','superseded','withdrawn')),
 author_user_id uuid not null references auth.users(id), owner_person_id uuid not null references public.organization_people(id),
 previous_document_id uuid references public.company_documents(id),
 change_reason text not null, change_impact text not null,
 distribution text not null default 'selected' check(distribution in ('company','selected')),
 due_date date, review_date date, file_path text, file_name text, file_sha256 text,
 issued_at timestamptz, released_by uuid references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(organization_id,document_number,revision)
);
create unique index if not exists company_document_current_idx on public.company_documents(organization_id,series_id) where status='current';
create unique index if not exists company_document_working_idx on public.company_documents(organization_id,series_id) where status in ('draft','in_review','approved');
create index if not exists company_documents_company_status_idx on public.company_documents(organization_id,status);
create table if not exists public.company_document_reviews (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references public.company_documents(id),
 person_id uuid not null references public.organization_people(id), role text not null check(role in ('verifier','approver')),
 accepted_at timestamptz, decision text check(decision in ('confirmed','changes_required')),
 comments text, decided_at timestamptz, decided_by uuid references auth.users(id),
 unique(document_id,person_id,role),unique(document_id,person_id)
);
create table if not exists public.company_document_recipients (
 document_id uuid not null references public.company_documents(id),person_id uuid not null references public.organization_people(id),
 acknowledged_at timestamptz,acknowledged_by uuid references auth.users(id),primary key(document_id,person_id)
);
create table if not exists public.company_document_events (
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.company_documents(id),
 organization_id uuid not null references public.organizations(id),actor_user_id uuid not null references auth.users(id),
 event_type text not null,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);

create or replace function public.company_document_member(p_org uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 exists(select 1 from public.organization_people p where p.organization_id=p_org and p.user_id=auth.uid()
    and p.account_type='system' and p.account_status='active')
 or (exists(select 1 from public.organizations o where o.id=p_org and o.owner_id=auth.uid())
    and not exists(select 1 from public.organization_people p where p.organization_id=p_org and p.user_id=auth.uid()
       and p.account_status in ('suspended','closed'))));
$$;
create or replace function public.company_document_controller(p_org uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select public.company_document_member(p_org) and (
 exists(select 1 from public.organizations o where o.id=p_org and o.owner_id=auth.uid())
 or exists(select 1 from public.organization_people p join public.organization_person_permissions m on m.person_id=p.id and m.organization_id=p.organization_id
    where p.organization_id=p_org and p.user_id=auth.uid() and m.module_key='documents' and m.access_level='admin')
 or exists(select 1 from public.organization_people p join public.organization_person_authorizations a on a.person_id=p.id and a.organization_id=p.organization_id
    where p.organization_id=p_org and p.user_id=auth.uid() and a.function_key in ('company_administrator','document_controller')
      and a.status='authorised' and (a.expires_at is null or a.expires_at>=current_date)));
$$;
create or replace function public.can_read_company_document(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.company_documents d where d.id=p_id
 and public.company_document_member(d.organization_id) and (
 public.company_document_controller(d.organization_id) or d.author_user_id=auth.uid()
 or exists(select 1 from public.organization_people p where p.id=d.owner_person_id and p.user_id=auth.uid())
 or exists(select 1 from public.company_document_reviews r join public.organization_people p on p.id=r.person_id where r.document_id=d.id and p.user_id=auth.uid())
 or (d.status='current' and (d.distribution='company' or exists(
   select 1 from public.company_document_recipients r join public.organization_people p on p.id=r.person_id where r.document_id=d.id and p.user_id=auth.uid())))));
$$;
-- All writes go through one transaction and the authenticated actor is never supplied by the browser.
create or replace function public.company_document_command(p_org uuid,p_id uuid,p_command text,p_data jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare d public.company_documents; n public.company_documents; me uuid; person uuid; item jsonb; role_name text;
 can_edit boolean; current_id uuid; review_count integer; new_id uuid:=gen_random_uuid(); requested_status text;
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

alter table public.company_documents enable row level security;
alter table public.company_document_reviews enable row level security;
alter table public.company_document_recipients enable row level security;
alter table public.company_document_events enable row level security;
drop policy if exists company_documents_read on public.company_documents;
create policy company_documents_read on public.company_documents for select to authenticated using(public.can_read_company_document(id));
drop policy if exists company_document_reviews_read on public.company_document_reviews;
create policy company_document_reviews_read on public.company_document_reviews for select to authenticated using(public.can_read_company_document(document_id));
drop policy if exists company_document_recipients_read on public.company_document_recipients;
create policy company_document_recipients_read on public.company_document_recipients for select to authenticated using(public.can_read_company_document(document_id) and (
 exists(select 1 from public.organization_people p where p.id=person_id and p.user_id=auth.uid())
 or exists(select 1 from public.company_documents d where d.id=document_id and (d.author_user_id=auth.uid() or public.company_document_controller(d.organization_id)
 or exists(select 1 from public.organization_people p where p.id=d.owner_person_id and p.user_id=auth.uid())))));
drop policy if exists company_document_events_read on public.company_document_events;
create policy company_document_events_read on public.company_document_events for select to authenticated using(public.can_read_company_document(document_id));
revoke all on public.company_documents,public.company_document_reviews,public.company_document_recipients,public.company_document_events from anon,authenticated;
grant select on public.company_documents,public.company_document_reviews,public.company_document_recipients,public.company_document_events to authenticated;
grant all on public.company_documents,public.company_document_reviews,public.company_document_recipients,public.company_document_events to service_role;
revoke all on function public.company_document_member(uuid),public.company_document_controller(uuid),public.can_read_company_document(uuid),public.company_document_command(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.company_document_member(uuid),public.company_document_controller(uuid),public.can_read_company_document(uuid),public.company_document_command(uuid,uuid,text,jsonb) to authenticated;
commit;
