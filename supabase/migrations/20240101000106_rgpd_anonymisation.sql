-- ============================================================================
-- Paramètres · Lot B·4 — Anonymisation RGPD effective (CDC §13, critère #8).
--
-- À l'échéance de rétention, pseudonymise les COORDONNÉES hors-comptables d'un
-- tiers personne physique (nom, e-mail, téléphone, adresse, n° fiscal), tout en
-- PRÉSERVANT le code (411x), les écritures et les soldes (obligation SYSCOHADA
-- 10 ans). Irréversible, tracée dans un journal chaîné, réservée aux
-- administrateurs, éligibilité recalculée côté serveur.
-- ============================================================================

alter table public.third_parties
  add column if not exists est_personne_physique boolean not null default false,
  add column if not exists derniere_activite date,
  add column if not exists anonymise_le timestamptz;

create table if not exists public.anonymisation_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id) on delete cascade,
  tiers_code text not null,
  champs_avant jsonb,                         -- empreintes des anciennes valeurs (jamais le clair)
  motif text,
  par uuid, le timestamptz not null default now(),
  hash text, hash_precedent text
);
create index if not exists idx_anonymisation_log_tenant on public.anonymisation_log(tenant_id, le desc);
alter table public.anonymisation_log enable row level security;
-- Journal IMMUABLE : SELECT + INSERT seulement (aucune policy UPDATE/DELETE).
do $$ begin
  create policy anon_log_sel on public.anonymisation_log for select using (tenant_id = get_user_company_id());
  create policy anon_log_ins on public.anonymisation_log for insert with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create or replace function public.anonymize_tiers(p_code text, p_motif text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid(); tid uuid := get_user_company_id(); t record; pseudo text; prev text; retention int;
begin
  -- Autorisation : administrateur de la société courante.
  if not exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin' and p.company_id = tid) then
    raise exception 'Non autorisé : réservé aux administrateurs';
  end if;

  select * into t from public.third_parties where code = p_code and tenant_id = tid;
  if t.id is null then raise exception 'Tiers introuvable'; end if;
  if t.anonymise_le is not null then return jsonb_build_object('skipped', 'déjà anonymisé', 'code', p_code); end if;

  -- Gardes SERVEUR (le client ne décide jamais).
  if not t.est_personne_physique then raise exception 'Réservé aux personnes physiques'; end if;
  if t.derniere_activite is null then raise exception 'Dernière activité inconnue — éligibilité indéterminée'; end if;
  retention := coalesce((param_resolve('rgpd.retention_tiers_mois'))::text::int, 60);
  if (t.derniere_activite + retention * interval '1 month') > current_date then
    raise exception 'Rétention non échue (% mois après la dernière activité)', retention;
  end if;

  -- Pseudonymisation : coordonnées nominatives seulement. code/balance/comptes intacts.
  pseudo := 'ANONYMISÉ-' || left(md5(t.id::text), 8);
  update public.third_parties set
    name = pseudo, email = null, phone = null, address = null, tax_id = null,
    anonymise_le = now(), updated_at = now()
  where id = t.id;

  -- Journal chaîné (empreintes, pas le clair).
  select hash into prev from public.anonymisation_log where tenant_id = tid order by le desc limit 1;
  insert into public.anonymisation_log (tenant_id, tiers_code, champs_avant, motif, par, hash_precedent, hash)
  values (tid, p_code,
    jsonb_build_object('name_hash', md5(coalesce(t.name, '')), 'had_email', t.email is not null, 'had_phone', t.phone is not null),
    p_motif, uid, prev,
    md5(coalesce(prev, '') || p_code || now()::text));

  return jsonb_build_object('anonymise', p_code, 'pseudonyme', pseudo);
end $$;

revoke all on function public.anonymize_tiers(text, text) from public;
revoke all on function public.anonymize_tiers(text, text) from anon;
grant execute on function public.anonymize_tiers(text, text) to authenticated;
