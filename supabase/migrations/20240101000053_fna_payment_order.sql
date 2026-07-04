-- ============================================================================
-- Ordres de paiement (module Paiements). Écriture de règlement générée à
-- l'EXÉCUTION : Dr 401 fournisseur / Cr 521 banque (ou 571 caisse).
-- Table dédiée (la legacy public.payment_orders = schéma Atlas Studio distinct).
-- (Appliqué en prod le 2026-06-15 ; fichier de parité repo↔prod.)
-- ============================================================================
create table if not exists public.fna_payment_order (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  reference text,
  beneficiary text,
  third_party_code text,
  method text not null default 'sepa',
  amount numeric not null default 0,
  currency text not null default 'XOF',
  scheduled_date date,
  status text not null default 'draft',
  bank_account text,
  charge_account text,
  description text,
  journal_entry_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  executed_at timestamptz
);
create index if not exists idx_fna_payorder_tenant on public.fna_payment_order(tenant_id, scheduled_date desc);
alter table public.fna_payment_order enable row level security;
do $$ begin
  create policy fna_payorder_sel on public.fna_payment_order for select using (tenant_id = get_user_company_id());
  create policy fna_payorder_ins on public.fna_payment_order for insert with check (tenant_id = get_user_company_id());
  create policy fna_payorder_upd on public.fna_payment_order for update using (tenant_id = get_user_company_id());
  create policy fna_payorder_del on public.fna_payment_order for delete using (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
