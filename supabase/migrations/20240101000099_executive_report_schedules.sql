-- Vue Dirigeant — planification de l'envoi du tableau de bord exécutif par email.
--
-- OBJECTIF : permettre à un dirigeant de recevoir automatiquement, par email et
-- au format HTML, une synthèse exécutive (CA, résultat net, trésorerie, marge,
-- tendance 12 mois, top clients, santé financière) à une cadence hebdomadaire
-- ou mensuelle.
--
-- MODÈLE : une planification par société (tenant). Le balayage des envois dus
-- est piloté par la colonne next_run_at (Edge Function `send-executive-report`
-- en mode `cron`, protégée par CRON_SECRET). Tenancy = tenant_id
-- (get_user_company_id), cohérente avec le reste du schéma.

create table if not exists public.executive_report_schedules (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid not null references public.societes(id) on delete cascade,
  enabled       boolean not null default true,
  -- Cadence d'envoi : 'weekly' (hebdomadaire) ou 'monthly' (mensuelle).
  frequency     text not null default 'monthly' check (frequency in ('weekly', 'monthly')),
  -- Heure d'envoi (0-23, UTC) et jour de déclenchement.
  send_hour     smallint not null default 7 check (send_hour between 0 and 23),
  -- weekly : jour de la semaine (0 = dimanche … 6 = samedi).
  weekday       smallint not null default 1 check (weekday between 0 and 6),
  -- monthly : jour du mois (1-28, borné à 28 pour couvrir février).
  month_day     smallint not null default 1 check (month_day between 1 and 28),
  -- Destinataires (emails). Au moins un requis pour un envoi effectif.
  recipients    text[] not null default '{}',
  -- Pilotage du balayage cron.
  last_sent_at  timestamptz,
  next_run_at   timestamptz,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Une seule planification par société : l'UI fait un upsert sur ce tenant.
  unique (tenant_id)
);

comment on table public.executive_report_schedules is
  'Vue Dirigeant : planification de l''envoi automatique du tableau de bord exécutif par email (HTML), en cadence hebdomadaire ou mensuelle. Une ligne par société (tenant_id = get_user_company_id). next_run_at pilote le balayage cron de l''Edge Function send-executive-report.';

-- Index de balayage : ne remonter que les planifications actives et dues.
create index if not exists idx_exec_report_sched_due
  on public.executive_report_schedules (next_run_at)
  where enabled = true;

-- updated_at auto (réutilise le trigger générique `update_updated_at` du schéma).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'update_updated_at') then
    execute 'create trigger trg_exec_report_sched_updated
             before update on public.executive_report_schedules
             for each row execute function update_updated_at()';
  end if;
exception when duplicate_object then
  -- trigger déjà présent : no-op idempotent.
  null;
end $$;

-- ─── RLS : scoping tenant strict (get_user_company_id) ───
alter table public.executive_report_schedules enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='executive_report_schedules' and policyname='exec_report_sched_sel') then
    create policy exec_report_sched_sel on public.executive_report_schedules
      for select using (tenant_id = get_user_company_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='executive_report_schedules' and policyname='exec_report_sched_ins') then
    create policy exec_report_sched_ins on public.executive_report_schedules
      for insert with check (tenant_id = get_user_company_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='executive_report_schedules' and policyname='exec_report_sched_upd') then
    create policy exec_report_sched_upd on public.executive_report_schedules
      for update using (tenant_id = get_user_company_id())
      with check (tenant_id = get_user_company_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='executive_report_schedules' and policyname='exec_report_sched_del') then
    create policy exec_report_sched_del on public.executive_report_schedules
      for delete using (tenant_id = get_user_company_id());
  end if;
end $$;
