begin;

-- Verified suppliers read the invitation's linked Code of Conduct through
-- the server. The server validates the recipient, document and company.
grant select (id, supplier_id, organization_id, document_reference, version, sections, declaration, status)
on public.supplier_code_of_conduct_documents to service_role;

commit;
