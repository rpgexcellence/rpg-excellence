-- Apply this migration when the QBR table already exists but authenticated
-- users receive: permission denied for table supplier_quarterly_business_reviews.

grant usage on schema public to authenticated;
grant select, insert, update, delete
  on table public.supplier_quarterly_business_reviews
  to authenticated;

alter table public.supplier_quarterly_business_reviews enable row level security;

drop policy if exists "Supplier owners manage quarterly reviews"
  on public.supplier_quarterly_business_reviews;

create policy "Supplier owners manage quarterly reviews"
  on public.supplier_quarterly_business_reviews
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
