-- CAR (Capital Appropriation Request) — bascule de la tenancy org_id → tenant_id.
--
-- PROBLÈME : les 4 policies RLS de fna_car étaient scopées sur fna_auth_org_ids()
-- (modèle « organisations » hérité), alors que l'application est scopée par
-- societe/tenant (get_user_company_id()). Aucun utilisateur n'ayant de ligne dans
-- fna_user_orgs, TOUT SELECT/INSERT était refusé : le formulaire d'appropriation
-- (CarModal) ne pouvait ni lire ni écrire, et la table restait à 0 ligne — le CAR
-- était donc structurellement inaccessible depuis le module CAPEX.
--
-- CORRECTIF : org_id devient optionnel et des policies tenant sont ajoutées (les
-- policies permissives se cumulent en OU, donc les accès org existants restent
-- valides pour d'éventuels utilisateurs org). Additif, sans perte : 0 ligne à ce jour.

alter table public.fna_car alter column org_id drop not null;

create index if not exists idx_fna_car_tenant on public.fna_car(tenant_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='fna_car' and policyname='fna_car_tenant_sel') then
    create policy fna_car_tenant_sel on public.fna_car
      for select using (tenant_id = get_user_company_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='fna_car' and policyname='fna_car_tenant_ins') then
    create policy fna_car_tenant_ins on public.fna_car
      for insert with check (tenant_id = get_user_company_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='fna_car' and policyname='fna_car_tenant_upd') then
    create policy fna_car_tenant_upd on public.fna_car
      for update using (tenant_id = get_user_company_id())
      with check (tenant_id = get_user_company_id());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='fna_car' and policyname='fna_car_tenant_del') then
    create policy fna_car_tenant_del on public.fna_car
      for delete using (tenant_id = get_user_company_id());
  end if;
end $$;

comment on table public.fna_car is
  'Capital Appropriation Request : document d''appropriation des fonds d''un Business Case approuvé (référence, montant approprié, date, justification). Plusieurs CAR par BC, somme <= enveloppe du BC. Tenancy = tenant_id (get_user_company_id).';
