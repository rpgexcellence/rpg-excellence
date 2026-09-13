begin;

alter table public.hs_moc_actions drop constraint if exists hs_moc_actions_status_check;
alter table public.hs_moc_actions add constraint hs_moc_actions_status_check
  check (status in ('open','awaiting_verification','verified','rejected','cancelled'));
alter table public.hs_moc_actions add column if not exists evidence_storage_path text;
alter table public.hs_moc_actions add column if not exists evidence_file_name text;
alter table public.hs_moc_actions add column if not exists evidence_mime_type text;
alter table public.hs_moc_actions add column if not exists evidence_size_bytes bigint;
alter table public.hs_moc_actions add column if not exists verification_result text check (verification_result in ('successful','rejected'));
alter table public.hs_moc_actions add column if not exists verifier_name text;
alter table public.hs_moc_actions add column if not exists verification_comments text;
alter table public.hs_moc_actions add column if not exists verified_at timestamptz;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hs-moc-evidence','hs-moc-evidence',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "MOC owners read evidence" on storage.objects;
create policy "MOC owners read evidence" on storage.objects for select to authenticated
using(bucket_id='hs-moc-evidence' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "MOC owners upload evidence" on storage.objects;
create policy "MOC owners upload evidence" on storage.objects for insert to authenticated
with check(bucket_id='hs-moc-evidence' and (storage.foldername(name))[1]=auth.uid()::text);

commit;
