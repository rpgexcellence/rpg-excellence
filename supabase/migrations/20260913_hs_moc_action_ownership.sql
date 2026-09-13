begin;
alter table public.hs_moc_actions add column if not exists responsible_email text;
create index if not exists hs_moc_action_owner_email_idx on public.hs_moc_actions(lower(responsible_email));
commit;
