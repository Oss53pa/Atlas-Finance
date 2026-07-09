-- ============================================================================
-- MVA Lot 5 Vague D — Circuits payment_batch (Doc Maître C2/C6).
-- Préparateur (submitted_by) → DAF → (DG au-delà d'un seuil), signature OTP.
-- payment_batch = critique : exclu du lien externe (B6) et du lot bannette (C7).
-- Le blocage des paiements vers un RIB en quarantaine s'appuie sur
-- is_rib_under_quarantine (Vague B) au moment de l'exécution (hors périmètre v1).
-- ============================================================================
do $$
declare t uuid := '8da05584-3046-4f0d-8524-e3915be1c558'; defA uuid; defB uuid;
begin
  delete from public.wf_rule where tenant_id=t and object_type='payment_batch';
  delete from public.wf_stage where tenant_id=t and definition_id in (select id from public.wf_definition where tenant_id=t and object_type='payment_batch');
  delete from public.wf_definition where tenant_id=t and object_type='payment_batch';
  insert into public.wf_definition(tenant_id,object_type,name,version,status,is_default) values(t,'payment_batch','Paiement standard',1,'active',true) returning id into defA;
  insert into public.wf_stage(tenant_id,definition_id,position,name,mode,required_role,sla_hours,signature_level) values(t,defA,1,'DAF','ANY','daf',12,'otp');
  insert into public.wf_definition(tenant_id,object_type,name,version,status,is_default) values(t,'payment_batch','Paiement > seuil (DAF+DG)',1,'active',false) returning id into defB;
  insert into public.wf_stage(tenant_id,definition_id,position,name,mode,required_role,sla_hours,signature_level) values
    (t,defB,1,'DAF','ANY','daf',12,'otp'),(t,defB,2,'DG','ANY','dg',12,'otp');
  insert into public.wf_rule(tenant_id,object_type,conditions,definition_id,priority) values
    (t,'payment_batch','{"amount_xof":{"gte":10000000}}'::jsonb,defB,100);
end $$;
