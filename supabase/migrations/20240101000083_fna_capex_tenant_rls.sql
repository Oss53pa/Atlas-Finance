-- Gouvernance CAPEX (matrice d'approbation, approbations, PIR, notes) —
-- bascule de la tenancy org_id → tenant_id, dans la continuité de la migration
-- 20240101000082 qui a débloqué fna_car.
--
-- PROBLÈME : ces 4 tables portent déjà une colonne tenant_id (backfill L5) mais
-- leurs policies RLS restent scopées fna_auth_org_ids(). Aucun utilisateur n'ayant
-- de ligne dans fna_user_orgs, la matrice d'approbation, les décisions, le PIR et
-- les notes/pièces jointes étaient inaccessibles depuis l'application.
--
-- PAS DE BACKFILL — volontaire. Dans fna_capex_approval_matrix, les lignes à
-- tenant_id NULL appartiennent à une AUTRE organisation (org-b362…) et sont des
-- doublons exacts des 4 tranches par défaut. Les rattacher au tenant courant
-- dupliquerait la matrice (8 tranches) et fausserait la résolution des seuils
-- d'approbation. Le tenant possède déjà ses 4 tranches correctes ; les lignes de
-- l'autre organisation restent simplement hors de sa portée, ce qui est le
-- comportement attendu.

alter table public.fna_capex_approval        alter column org_id drop not null;
alter table public.fna_capex_approval_matrix alter column org_id drop not null;
alter table public.fna_capex_note            alter column org_id drop not null;
alter table public.fna_capex_pir             alter column org_id drop not null;

create index if not exists idx_fna_capex_approval_tenant        on public.fna_capex_approval(tenant_id);
create index if not exists idx_fna_capex_approval_matrix_tenant on public.fna_capex_approval_matrix(tenant_id, seuil_min);
create index if not exists idx_fna_capex_note_tenant            on public.fna_capex_note(tenant_id);
create index if not exists idx_fna_capex_pir_tenant             on public.fna_capex_pir(tenant_id);

do $$
declare t text;
begin
  foreach t in array array['fna_capex_approval','fna_capex_approval_matrix','fna_capex_note','fna_capex_pir'] loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_sel') then
      execute format('create policy %I on public.%I for select using (tenant_id = get_user_company_id())', t||'_tenant_sel', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_ins') then
      execute format('create policy %I on public.%I for insert with check (tenant_id = get_user_company_id())', t||'_tenant_ins', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_upd') then
      execute format('create policy %I on public.%I for update using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id())', t||'_tenant_upd', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=t||'_tenant_del') then
      execute format('create policy %I on public.%I for delete using (tenant_id = get_user_company_id())', t||'_tenant_del', t);
    end if;
  end loop;
end $$;
