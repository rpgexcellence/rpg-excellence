alter table public.supplier_quarterly_business_reviews
  add column if not exists buyer_person_id uuid
    references public.organization_people(id) on delete set null,
  add column if not exists supplier_contact_id uuid
    references public.supplier_contacts(id) on delete set null;

comment on column public.supplier_quarterly_business_reviews.buyer_person_id is
  'Buyer or internal QBR lead selected from the organisation people directory.';
comment on column public.supplier_quarterly_business_reviews.supplier_contact_id is
  'Supplier representative selected from the active contacts for this supplier.';
