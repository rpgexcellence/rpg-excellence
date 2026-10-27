-- RPG Excellence | Controlled finding management in the existing workspace
-- Run this COMPLETE file in Supabase SQL Editor before the next actions update.
-- Repository: supabase/migrations/20261027_nc_management_transactions.sql
-- Reuses existing findings, action access, CAPA and audit-event tables.
-- Existing records, policies, role assignments and administrator entitlements remain intact.
BEGIN;

DO $preflight$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['internal_audit_findings','internal_audit_events',
    'internal_audit_action_access','rca_cases','rca_actions','rca_8d_disciplines','rca_evidence'] LOOP
    IF to_regclass('public.'||name) IS NULL THEN RAISE EXCEPTION 'Required existing table is missing: %',name; END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='internal_audit_findings' AND column_name='source_audit_question_id') THEN
    RAISE EXCEPTION 'Apply file 1, audit finding question traceability, first.';
  END IF;
END $preflight$;

-- A manually raised finding has no native audit. Its history and assigned
-- response still use the established audit-event and action-access records.
ALTER TABLE public.internal_audit_events ALTER COLUMN audit_id DROP NOT NULL;
ALTER TABLE public.internal_audit_action_access ALTER COLUMN audit_id DROP NOT NULL;
ALTER TABLE public.internal_audit_events
  ADD COLUMN IF NOT EXISTS finding_id uuid,
  ADD COLUMN IF NOT EXISTS organization_id uuid;
CREATE INDEX IF NOT EXISTS nc_management_history_idx
  ON public.internal_audit_events(owner_id,organization_id,finding_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS nc_management_request_once_idx
  ON public.internal_audit_events(owner_id,finding_id,(event_data->>'management_request_id'))
  WHERE finding_id IS NOT NULL AND event_data ? 'management_request_id';

-- Internal transaction boundary. Only the trusted server may call this helper,
-- after freshly checking the signed-in user, company, module and required role.
-- The browser does not receive this privilege or supply its own update bundle.
CREATE OR REPLACE FUNCTION public.apply_nc_management_change(
  p_owner_id uuid, p_organization_id uuid, p_actor_id uuid, p_finding_id uuid,
  p_request_id uuid, p_operation text, p_reason text,
  p_expected_updated_at timestamptz, p_changes jsonb, p_case_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
DECLARE
  f public.internal_audit_findings%ROWTYPE;
  saved_event public.internal_audit_events%ROWTYPE;
  change jsonb; patch jsonb; old_row jsonb; new_row jsonb;
  history jsonb:='[]'::jsonb; allowed text[]; insert_allowed text[];
  target_table text; kind text; row_id uuid; cols text; bad_key text;
  digest text; actor_email text; result jsonb; now_at timestamptz:=clock_timestamp();
  access_row jsonb; case_row jsonb; selected_count integer;
BEGIN
  IF p_owner_id IS NULL OR p_organization_id IS NULL OR p_actor_id IS NULL
    OR p_finding_id IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'A verified account, company, finding and request identity are required.'; END IF;
  IF p_operation NOT IN ('save_details','assign_owner','start_capa','link_capa',
    'review_response','verify_action','verify_finding','close_advisory','reopen') THEN
    RAISE EXCEPTION 'Unsupported finding management operation.';
  END IF;
  IF length(btrim(coalesce(p_reason,'')))<5 OR length(p_reason)>12000 THEN RAISE EXCEPTION 'Record a clear management reason (5 to 12000 characters).'; END IF;
  IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR jsonb_array_length(p_changes)<1
    OR jsonb_array_length(p_changes)>50 OR octet_length(p_changes::text)>500000 THEN
    RAISE EXCEPTION 'Invalid controlled update bundle.';
  END IF;
  SELECT lower(email) INTO actor_email FROM auth.users WHERE id=p_actor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'The authenticated actor no longer exists.'; END IF;
  SELECT * INTO f FROM public.internal_audit_findings WHERE id=p_finding_id
    AND owner_id=p_owner_id AND organization_id=p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Finding unavailable in the authorised company.'; END IF;
  digest:=encode(sha256(convert_to(jsonb_build_object('actor',p_actor_id,'company',p_organization_id,'operation',p_operation,
    'reason',p_reason,'expected',p_expected_updated_at,'changes',p_changes,'case',p_case_id)::text,'UTF8')),'hex');
  SELECT * INTO saved_event FROM public.internal_audit_events
    WHERE owner_id=p_owner_id AND finding_id=p_finding_id
      AND event_data->>'management_request_id'=p_request_id::text;
  IF FOUND THEN
    IF saved_event.event_data->>'request_digest' IS DISTINCT FROM digest THEN
      RAISE EXCEPTION 'This request identity was already used for different management content.';
    END IF;
    RETURN (saved_event.event_data->'result')||jsonb_build_object('replayed',true);
  END IF;
  IF f.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'The finding changed. Refresh and review its latest record before saving.'; END IF;
  IF (f.status='closed' OR f.closure_verified IS TRUE) AND p_operation<>'reopen' THEN
    RAISE EXCEPTION 'Reopen the controlled finding before making further changes.';
  END IF;
  IF p_operation='close_advisory' AND f.finding_type NOT IN ('observation','ofi') THEN RAISE EXCEPTION 'Only an Observation or OFI uses advisory closure.'; END IF;
  IF p_operation IN ('start_capa','link_capa','verify_action','verify_finding','review_response')
    AND f.finding_type NOT IN ('major_nc','minor_nc') THEN RAISE EXCEPTION 'This operation requires a Major or Minor NC.'; END IF;
  IF p_case_id IS NOT NULL AND f.linked_rca_case_id IS NOT NULL AND p_case_id<>f.linked_rca_case_id THEN
    RAISE EXCEPTION 'The existing controlled CAPA link cannot be replaced by this operation.';
  END IF;
  SELECT to_jsonb(a) INTO access_row FROM public.internal_audit_action_access a WHERE a.finding_id=f.id AND a.owner_id=p_owner_id FOR UPDATE;
  IF p_operation IN ('verify_action','verify_finding','review_response') THEN
    IF access_row IS NULL THEN RAISE EXCEPTION 'A controlled action-owner response is required.'; END IF;
    IF access_row->>'assignee_user_id'=p_actor_id::text OR lower(access_row->>'assignee_email')=actor_email THEN RAISE EXCEPTION 'An action owner cannot review or verify their own response.'; END IF;
  END IF;
  -- Existing accountable-human triggers see the real, server-verified actor.
  PERFORM set_config('request.jwt.claim.sub',p_actor_id::text,true);
  PERFORM set_config('request.jwt.claims',
    (coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
      ||jsonb_build_object('sub',p_actor_id::text))::text,true);

  FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    target_table:=change->>'table'; kind:=change->>'kind'; row_id:=(change->>'id')::uuid;
    patch:=change->'values'; old_row:=NULL; new_row:=NULL;
    IF kind IS NULL OR kind NOT IN ('insert','update') OR row_id IS NULL
      OR jsonb_typeof(patch) IS DISTINCT FROM 'object' OR patch='{}'::jsonb THEN RAISE EXCEPTION 'Invalid controlled row change.'; END IF;
    CASE target_table
      WHEN 'internal_audit_findings' THEN
        IF kind<>'update' OR row_id<>f.id THEN RAISE EXCEPTION 'Finding source identity is immutable.'; END IF;
        allowed:=ARRAY['title','finding_type','criteria','objective_evidence','failure_statement','process_area','risk_level',
          'responsible_owner_name','responsible_owner_email','responsible_owner_person_id','responsible_owner_supplier_contact_id',
          'agreed_date','status','linked_rca_case_id','closure_verified','closure_verified_by','closure_verified_at','closed_at'];
        IF patch ?| ARRAY['title','finding_type','criteria','objective_evidence','failure_statement'] THEN
          IF f.audit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.internal_audits a
            WHERE a.id=f.audit_id AND a.owner_id=p_owner_id AND a.organization_id=p_organization_id
              AND a.current_gate='fieldwork' AND a.status<>'closed') THEN
            RAISE EXCEPTION 'Issued audit findings require the controlled audit revision process before statement changes.';
          END IF;
        END IF;
        IF patch ? 'finding_type' AND coalesce(patch->>'finding_type','') NOT IN ('major_nc','minor_nc','observation','ofi') THEN RAISE EXCEPTION 'Choose Major NC, Minor NC, Observation or OFI.'; END IF;
        IF patch ? 'linked_rca_case_id' AND nullif(patch->>'linked_rca_case_id','')::uuid IS DISTINCT FROM coalesce(f.linked_rca_case_id,p_case_id) THEN RAISE EXCEPTION 'Invalid controlled CAPA link.'; END IF;
        IF patch ? 'status' AND patch->>'status'='closed' AND p_operation NOT IN ('verify_finding','close_advisory') THEN RAISE EXCEPTION 'A controlled closure decision is required.'; END IF;
        IF patch ?| ARRAY['closure_verified','closure_verified_by','closure_verified_at','closed_at'] AND p_operation NOT IN ('verify_finding','close_advisory','reopen') THEN RAISE EXCEPTION 'Verification fields require a controlled decision.'; END IF;
      WHEN 'internal_audit_action_access' THEN
        allowed:=ARRAY['assignee_user_id','assignee_name','assignee_email','rca_case_id','status','auditor_response','auditor_response_at','auditor_response_by',
          'effectiveness_result','verification_method','verification_evidence','verified_at','verified_by','d6_verification_completed_at',
          'secure_token_hash','secure_token_expires_at','correction_and_containment','root_cause_response','extent_and_systemic_review','corrective_action_plan','effectiveness_measure'];
      WHEN 'rca_cases' THEN
        IF row_id IS DISTINCT FROM coalesce(f.linked_rca_case_id,p_case_id) THEN RAISE EXCEPTION 'The CAPA case is outside this finding.'; END IF;
        IF kind='insert' AND (p_operation<>'start_capa' OR f.linked_rca_case_id IS NOT NULL) THEN RAISE EXCEPTION 'A new CAPA requires an explicit initiation decision.'; END IF;
        allowed:=ARRAY['case_reference','method','source_type','title','problem_statement','severity','status','current_discipline',
          'sponsor_name','customer_or_stakeholder','product_service_process','location','detected_at','target_close_date','closed_at','closure_summary'];
      WHEN 'rca_actions' THEN
        IF kind<>'update' OR p_operation<>'verify_action' THEN RAISE EXCEPTION 'Use the established CAPA workspace to create or amend actions.'; END IF;
        allowed:=ARRAY['effectiveness_result','implementation_evidence','effectiveness_verification_method','effectiveness_verification_conclusion','verified_by','verified_at','status'];
      WHEN 'rca_8d_disciplines' THEN
        IF kind<>'update' THEN RAISE EXCEPTION 'Use the established CAPA workflow to initialise disciplines.'; END IF;
        allowed:=ARRAY['status','completion_score','human_approved','approved_by','approved_at'];
      ELSE RAISE EXCEPTION 'Unsupported controlled table.';
    END CASE;
    SELECT key INTO bad_key FROM jsonb_object_keys(patch) key WHERE NOT(key=ANY(allowed)) LIMIT 1;
    IF bad_key IS NOT NULL THEN RAISE EXCEPTION 'This field is not editable through finding management: %',bad_key; END IF;
    IF patch ? 'verified_by' AND patch->>'verified_by' IS NOT NULL AND nullif(patch->>'verified_by','')::uuid IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'Verification must identify the authenticated decision maker.'; END IF;
    IF patch ? 'approved_by' AND patch->>'approved_by' IS NOT NULL AND nullif(patch->>'approved_by','')::uuid IS DISTINCT FROM p_actor_id THEN RAISE EXCEPTION 'Approval must identify the authenticated decision maker.'; END IF;
    EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',target_table) INTO old_row USING row_id;
    IF kind='update' THEN
      IF old_row IS NULL OR old_row->>'owner_id' IS DISTINCT FROM p_owner_id::text THEN RAISE EXCEPTION 'Controlled row unavailable for this owner.'; END IF;
      IF NOT(change ? 'expected_updated_at') THEN RAISE EXCEPTION 'The current row version is required.'; END IF;
      IF (old_row->>'updated_at')::timestamptz IS DISTINCT FROM (change->>'expected_updated_at')::timestamptz THEN RAISE EXCEPTION 'A linked record changed. Refresh and review before saving.'; END IF;
      IF target_table='internal_audit_action_access' AND old_row->>'finding_id' IS DISTINCT FROM f.id::text THEN RAISE EXCEPTION 'The response does not belong to this finding.'; END IF;
      IF target_table IN ('rca_actions','rca_8d_disciplines') AND old_row->>'case_id' IS DISTINCT FROM coalesce(f.linked_rca_case_id,p_case_id)::text THEN RAISE EXCEPTION 'The controlled CAPA row belongs to another finding.'; END IF;
      IF target_table='rca_cases' AND old_row->>'organization_id' IS DISTINCT FROM p_organization_id::text THEN RAISE EXCEPTION 'The CAPA case belongs to another company.'; END IF;
      IF target_table='rca_actions' AND (old_row->>'discipline'<>'5' OR old_row->>'selection_status'<>'selected') THEN RAISE EXCEPTION 'Only selected D5 actions are verified through D6.'; END IF;
      IF target_table='rca_actions' AND patch->>'effectiveness_result' IN ('effective','effective_verified') THEN
        IF NOT EXISTS(SELECT 1 FROM public.rca_evidence e WHERE e.case_id=f.linked_rca_case_id AND e.owner_id=p_owner_id AND e.discipline=6 AND e.action_id=row_id) THEN RAISE EXCEPTION 'Action-linked objective evidence is required for effective verification.'; END IF;
      END IF;
    ELSE
      IF old_row IS NOT NULL THEN RAISE EXCEPTION 'This controlled row already exists. Refresh its saved identity.'; END IF;
      IF target_table NOT IN ('rca_cases','internal_audit_action_access') THEN RAISE EXCEPTION 'Unsupported controlled insertion.'; END IF;
      IF target_table='internal_audit_action_access' AND p_operation<>'assign_owner' THEN RAISE EXCEPTION 'Creating owner access requires a controlled assignment.'; END IF;
      patch:=patch||jsonb_build_object('id',row_id,'owner_id',p_owner_id);
      IF target_table='rca_cases' THEN
        IF coalesce(patch->>'method','')<>'8d' OR coalesce(patch->>'status','')<>'draft' OR coalesce((patch->>'current_discipline')::integer,-1)<>0 THEN RAISE EXCEPTION 'Initiate CAPA as a draft 8D case at D0.'; END IF;
        patch:=patch||jsonb_build_object('organization_id',p_organization_id);
      ELSE patch:=patch||jsonb_build_object('finding_id',f.id,'audit_id',f.audit_id,'rca_case_id',coalesce(f.linked_rca_case_id,p_case_id)); END IF;
    END IF;
    IF target_table='internal_audit_action_access' AND patch ? 'secure_token_hash' AND coalesce(patch->>'secure_token_hash','') !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid private access credential hash.'; END IF;
    IF target_table='internal_audit_action_access' AND patch ? 'rca_case_id'
      AND nullif(patch->>'rca_case_id','')::uuid IS DISTINCT FROM coalesce(f.linked_rca_case_id,p_case_id) THEN RAISE EXCEPTION 'Response and CAPA links must match.'; END IF;
    IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=target_table AND c.column_name='updated_at') THEN patch:=patch||jsonb_build_object('updated_at',now_at); END IF;
    SELECT string_agg(format('%I',key),',' ORDER BY key) INTO cols FROM jsonb_object_keys(patch) key;
    IF kind='insert' THEN
      EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) RETURNING to_jsonb(%I)',target_table,cols,cols,target_table,target_table) INTO new_row USING patch;
    ELSE
      EXECUTE format('UPDATE public.%I t SET (%s)=(SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1)) WHERE id=$2 RETURNING to_jsonb(t)',target_table,cols,cols,target_table) INTO new_row USING patch,row_id;
    END IF;
    history:=history||jsonb_build_array(jsonb_build_object('table',target_table,'id',row_id,'kind',kind,
      'before',(SELECT coalesce(jsonb_object_agg(k,old_row->k),'{}'::jsonb) FROM jsonb_object_keys(patch) k WHERE k<>'secure_token_hash'),
      'after',(SELECT coalesce(jsonb_object_agg(k,new_row->k),'{}'::jsonb) FROM jsonb_object_keys(patch) k WHERE k<>'secure_token_hash')));
  END LOOP;
  UPDATE public.internal_audit_findings SET updated_at=now_at WHERE id=f.id RETURNING * INTO f;
  IF p_operation IN ('start_capa','link_capa') AND (p_case_id IS NULL OR f.linked_rca_case_id IS DISTINCT FROM p_case_id) THEN RAISE EXCEPTION 'The CAPA initiation and finding link must be saved together.'; END IF;
  IF f.linked_rca_case_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rca_cases c WHERE c.id=f.linked_rca_case_id AND c.owner_id=p_owner_id AND c.organization_id=p_organization_id) THEN RAISE EXCEPTION 'The linked CAPA is outside the authorised company.'; END IF;
  IF f.status='closed' AND f.finding_type IN ('major_nc','minor_nc') THEN
    SELECT to_jsonb(a) INTO access_row FROM public.internal_audit_action_access a WHERE a.finding_id=f.id AND a.owner_id=p_owner_id FOR UPDATE;
    SELECT to_jsonb(c) INTO case_row FROM public.rca_cases c WHERE c.id=f.linked_rca_case_id AND c.owner_id=p_owner_id AND c.organization_id=p_organization_id FOR UPDATE;
    IF NOT f.closure_verified OR f.closure_verified_by IS DISTINCT FROM p_actor_id OR f.closure_verified_at IS NULL OR f.closed_at IS NULL OR access_row IS NULL OR case_row IS NULL THEN RAISE EXCEPTION 'Closure requires a recorded independent effectiveness decision and controlled CAPA response.'; END IF;
    IF access_row->>'assignee_user_id'=p_actor_id::text OR lower(access_row->>'assignee_email')=actor_email THEN RAISE EXCEPTION 'An action owner cannot verify their own finding.'; END IF;
    IF coalesce((case_row->>'current_discipline')::integer,0)<8 AND case_row->>'status' NOT IN ('effectiveness_review','closed') THEN RAISE EXCEPTION 'The CAPA must reach its final effectiveness review before closure.'; END IF;
    PERFORM 1 FROM public.rca_actions a WHERE a.case_id=f.linked_rca_case_id AND a.owner_id=p_owner_id AND a.discipline=5 AND a.selection_status='selected' FOR UPDATE;
    SELECT count(*) INTO selected_count FROM public.rca_actions a WHERE a.case_id=f.linked_rca_case_id AND a.owner_id=p_owner_id AND a.discipline=5 AND a.selection_status='selected';
    IF selected_count=0 OR EXISTS(SELECT 1 FROM public.rca_actions a WHERE a.case_id=f.linked_rca_case_id AND a.owner_id=p_owner_id AND a.discipline=5 AND a.selection_status='selected' AND (a.status IS DISTINCT FROM 'verified' OR coalesce(a.effectiveness_result,'') NOT IN ('effective','effective_verified') OR a.verified_by IS NULL OR a.verified_at IS NULL)) THEN RAISE EXCEPTION 'Every selected corrective action requires recorded effective verification.'; END IF;
    IF EXISTS(SELECT 1 FROM public.rca_actions a LEFT JOIN auth.users u ON u.id=a.verified_by WHERE a.case_id=f.linked_rca_case_id AND a.owner_id=p_owner_id AND a.discipline=5 AND a.selection_status='selected' AND (a.verified_by::text=access_row->>'assignee_user_id' OR lower(u.email)=lower(access_row->>'assignee_email'))) THEN RAISE EXCEPTION 'Corrective actions require independent verification by someone other than their response owner.'; END IF;
  END IF;
  result:=jsonb_build_object('finding_id',f.id,'status',f.status,'updated_at',f.updated_at,'linked_rca_case_id',f.linked_rca_case_id,'replayed',false);
  INSERT INTO public.internal_audit_events(owner_id,organization_id,audit_id,finding_id,event_type,summary,event_data,created_by)
    VALUES(p_owner_id,p_organization_id,f.audit_id,f.id,'nc_management_changed',p_operation||': '||p_reason,
      jsonb_build_object('management_request_id',p_request_id,'request_digest',digest,'operation',p_operation,'reason',p_reason,'changes',history,'result',result),p_actor_id);
  RETURN result;
END $function$;

REVOKE ALL ON FUNCTION public.apply_nc_management_change(uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_nc_management_change(uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,jsonb,uuid) TO service_role;
COMMENT ON FUNCTION public.apply_nc_management_change(uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,jsonb,uuid) IS
  'Server-only atomic finding management. Existing application roles must be checked before invocation. One saved request identity, locked versions, bounded changes, company-bound rows and durable audit history.';
NOTIFY pgrst,'reload schema';
COMMIT;

SELECT 'finding_management_transaction' AS check_name,
  CASE WHEN to_regprocedure('public.apply_nc_management_change(uuid,uuid,uuid,uuid,uuid,text,text,timestamptz,jsonb,uuid)') IS NOT NULL THEN 'READY' ELSE 'MISSING' END AS readiness
UNION ALL SELECT 'finding_management_history',CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='internal_audit_events' AND column_name='finding_id') THEN 'READY' ELSE 'MISSING' END
UNION ALL SELECT 'finding_management_replay_protection',CASE WHEN to_regclass('public.nc_management_request_once_idx') IS NOT NULL THEN 'READY' ELSE 'MISSING' END;
