-- ============================================================================
-- MVA Lot 5 Vague C — SLA, relances & escalades (Doc Maître §C5).
-- Tâche en retard (due_at dépassé) → escalade au rôle d'escalade (réassignation
-- tracée + priorité urgente), sinon alerte « action_overdue ». Événements
-- append-only à hash chaîné. Planifié par pg_cron (toutes les 15 min).
-- ============================================================================

alter table public.wf_task
  add column if not exists overdue_notified boolean not null default false,
  add column if not exists escalated boolean not null default false;

create extension if not exists pg_cron;

create or replace function public.wf_run_sla()
returns int
language plpgsql
security definer
set search_path to 'public', 'extensions'   -- digest() (pgcrypto) vit dans extensions
as $$
declare r record; prev text; eh text; cnt int := 0;
begin
  for r in
    select tk.*, st.escalate_to_role
    from public.wf_task tk
    join public.wf_stage st on st.id = tk.stage_id
    join public.wf_instance i on i.id = tk.instance_id
    where tk.status = 'pending' and tk.due_at is not null and tk.due_at < now()
      and not coalesce(tk.overdue_notified, false)
      and i.status = 'in_review'
  loop
    select event_hash into prev from public.wf_event where instance_id = r.instance_id order by created_at desc limit 1;
    if r.escalate_to_role is not null and not coalesce(r.escalated, false) then
      update public.wf_task set required_role = r.escalate_to_role, resolved_from = 'escalated_from:' || r.required_role, escalated = true, overdue_notified = true where id = r.id;
      update public.wf_instance set priority = 'urgent' where id = r.instance_id;
      eh := encode(digest(coalesce(prev, '') || 'escalated' || json_build_object('position', r.position, 'to', r.escalate_to_role)::text, 'sha256'), 'hex');
      insert into public.wf_event(tenant_id, instance_id, event_type, actor_id, actor_kind, payload, prev_hash, event_hash)
        values (r.tenant_id, r.instance_id, 'escalated', null, 'system', json_build_object('position', r.position, 'from', r.required_role, 'to', r.escalate_to_role), prev, eh);
    else
      update public.wf_task set overdue_notified = true where id = r.id;
      eh := encode(digest(coalesce(prev, '') || 'action_overdue' || json_build_object('position', r.position)::text, 'sha256'), 'hex');
      insert into public.wf_event(tenant_id, instance_id, event_type, actor_id, actor_kind, payload, prev_hash, event_hash)
        values (r.tenant_id, r.instance_id, 'action_overdue', null, 'system', json_build_object('position', r.position, 'required_role', r.required_role), prev, eh);
    end if;
    cnt := cnt + 1;
  end loop;
  return cnt;
end;
$$;

-- Planification (toutes les 15 min). Idempotent : dé-schedule puis re-schedule.
do $$ begin
  perform cron.unschedule('wf-sla');
exception when others then null; end $$;
select cron.schedule('wf-sla', '*/15 * * * *', $$select public.wf_run_sla()$$);
