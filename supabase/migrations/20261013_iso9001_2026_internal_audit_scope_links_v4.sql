-- ISO 9001:2026 audit-bank process mapping correction.
-- Selecting every ISO 9001 process loads the complete question bank; selecting
-- fewer processes loads only the questions applicable to those selections.

do $$
declare
  sid uuid;
begin
  select id into sid
  from public.internal_audit_standard_catalogue
  where upper(regexp_replace(standard_code,'[^A-Z0-9]','','g')) = 'ISO90012026'
  order by active desc
  limit 1;

  if sid is null then
    raise exception 'ISO 9001:2026 standard catalogue record not found';
  end if;

  -- Remove only links belonging to the new 2026 bank. ISO 9001:2015 and every
  -- other standard remain unchanged.
  delete from public.internal_audit_question_scope_links l
  using public.internal_audit_questions q
  where l.question_id = q.id
    and q.standard_id = sid
    and q.question_code like 'QMS26-%';

  insert into public.internal_audit_question_scope_links
    (question_id, standard_id, scope_key, clause, requirement_summary)
  select q.id, sid, m.scope_key, q.clause, q.process_area
  from (values
    ('QMS26-4.1','qms-governance'), ('QMS26-4.2','qms-governance'),
    ('QMS26-4.3','qms-governance'), ('QMS26-4.4','qms-governance'),
    ('QMS26-5.1.1','qms-governance'), ('QMS26-5.1.2','qms-governance'),
    ('QMS26-5.1.2','customer-contract'), ('QMS26-5.2','qms-governance'),
    ('QMS26-5.3','qms-governance'), ('QMS26-6.1.1','qms-governance'),
    ('QMS26-6.1.2','qms-governance'), ('QMS26-6.1.2','capa'),
    ('QMS26-6.1.3','qms-governance'), ('QMS26-6.1.3','capa'),
    ('QMS26-6.2','qms-governance'), ('QMS26-6.2','measurement'),
    ('QMS26-6.3','change'), ('QMS26-7.1.1','qms-governance'),
    ('QMS26-7.1.2','competence'), ('QMS26-7.1.3','production-service'),
    ('QMS26-7.1.4','production-service'), ('QMS26-7.1.5','calibration'),
    ('QMS26-7.1.6','competence'), ('QMS26-7.1.6','documented-information'),
    ('QMS26-7.2','competence'), ('QMS26-7.3','competence'),
    ('QMS26-7.4','qms-governance'), ('QMS26-7.4','documented-information'),
    ('QMS26-7.5','documented-information'), ('QMS26-8.1','production-service'),
    ('QMS26-8.2.1','customer-contract'), ('QMS26-8.2.2','customer-contract'),
    ('QMS26-8.2.3','customer-contract'), ('QMS26-8.2.4','customer-contract'),
    ('QMS26-8.2.4','change'), ('QMS26-8.3.1','design'),
    ('QMS26-8.3.2','design'), ('QMS26-8.3.3','design'),
    ('QMS26-8.3.4','design'), ('QMS26-8.3.5','design'),
    ('QMS26-8.3.6','design'), ('QMS26-8.3.6','change'),
    ('QMS26-8.4.1','supplier'), ('QMS26-8.4.2','supplier'),
    ('QMS26-8.4.3','supplier'), ('QMS26-8.5.1','production-service'),
    ('QMS26-8.5.2','production-service'), ('QMS26-8.5.3','production-service'),
    ('QMS26-8.5.4','production-service'), ('QMS26-8.5.5','production-service'),
    ('QMS26-8.5.5','customer-contract'), ('QMS26-8.5.6','production-service'),
    ('QMS26-8.5.6','change'), ('QMS26-8.6','production-service'),
    ('QMS26-8.7','nonconforming-output'), ('QMS26-9.1.1','measurement'),
    ('QMS26-9.1.2','measurement'), ('QMS26-9.1.2','customer-contract'),
    ('QMS26-9.1.3','measurement'), ('QMS26-9.2.1','internal-audit'),
    ('QMS26-9.2.2','internal-audit'), ('QMS26-9.3.1','management-review'),
    ('QMS26-9.3.2','management-review'), ('QMS26-9.3.3','management-review'),
    ('QMS26-10.1','capa'), ('QMS26-10.1','qms-governance'),
    ('QMS26-10.2','capa'), ('QMS26-10.2','nonconforming-output')
  ) as m(question_code, scope_key)
  join public.internal_audit_questions q
    on q.standard_id = sid and q.question_code = m.question_code
  where q.active = true;

  if not exists (
    select 1 from public.internal_audit_question_scope_links
    where standard_id = sid
  ) then
    raise exception 'No ISO 9001:2026 scope links were created';
  end if;
end $$;
