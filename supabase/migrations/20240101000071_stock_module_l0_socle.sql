-- =====================================================================
-- Module STOCK — L0 : socle de données (SAP MM adapté SYSCOHADA)
-- Voir docs/stock-module/DESIGN.md. Tenancy : toutes les tables portent
-- tenant_id NOT NULL + RLS (tenant_id = get_user_company_id()).
-- Quantités numeric(18,3), coûts numeric(18,4), montants/valeurs numeric(18,2).
-- =====================================================================

-- --------------------------------------------------------------------
-- Helper RLS générique (FOR ALL) appliqué à chaque table via DO plus bas
-- --------------------------------------------------------------------

-- ============ 3.1 Organisation : sites / magasins / emplacements ============
create table if not exists public.stock_sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  code text not null,
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, code)
);

create table if not exists public.stock_warehouses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  site_id uuid references public.stock_sites(id),
  code text not null,
  name text not null,
  type text not null default 'principal'
    check (type in ('principal','transit','qualite','rebut','consignation')),
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, code)
);

create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  warehouse_id uuid not null references public.stock_warehouses(id),
  code text not null,
  name text,
  type text default 'standard',
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, warehouse_id, code)
);

-- ============ 3.2 Référentiel article (material master) ============
create table if not exists public.stock_materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  code text not null,
  name text not null,
  description text,
  material_type text not null default 'marchandise'
    check (material_type in ('marchandise','matiere','fourniture','emballage','produit_fini','produit_encours','service')),
  category text,
  base_uom text not null default 'U',
  purchase_uom text,
  sales_uom text,
  valuation_method text not null default 'CUMP' check (valuation_method in ('CUMP','FIFO')),
  valuation_class text not null default 'MARCH',
  moving_avg_cost numeric(18,4) not null default 0,
  standard_price numeric(18,4),
  currency text not null default 'XOF',
  batch_managed boolean not null default false,
  serial_managed boolean not null default false,
  shelf_life_days integer,
  hazmat boolean not null default false,
  reorder_point numeric(18,3),
  safety_stock numeric(18,3),
  max_level numeric(18,3),
  min_order_qty numeric(18,3),
  lead_time_days integer,
  default_warehouse_id uuid references public.stock_warehouses(id),
  default_supplier_id uuid,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, code)
);

create table if not exists public.stock_uom_conversions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  material_id uuid not null references public.stock_materials(id) on delete cascade,
  from_uom text not null,
  to_uom text not null,
  factor numeric(18,6) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 3.3 Lots & séries ============
create table if not exists public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  material_id uuid not null references public.stock_materials(id),
  batch_number text not null,
  manufacture_date date,
  expiry_date date,
  quality_status text not null default 'libre'
    check (quality_status in ('libre','bloque','quarantaine','rebut')),
  supplier_batch_ref text,
  attributes jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, material_id, batch_number)
);

create table if not exists public.stock_serials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  material_id uuid not null references public.stock_materials(id),
  serial_number text not null,
  batch_id uuid references public.stock_batches(id),
  status text not null default 'en_stock'
    check (status in ('en_stock','sorti','reserve','rebut')),
  current_location_id uuid references public.stock_locations(id),
  warranty_end date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, material_id, serial_number)
);

-- ============ 3.4 Stock (quants) & valorisation ============
create table if not exists public.stock_quants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  material_id uuid not null references public.stock_materials(id),
  warehouse_id uuid not null references public.stock_warehouses(id),
  location_id uuid references public.stock_locations(id),
  batch_id uuid references public.stock_batches(id),
  serial_id uuid references public.stock_serials(id),
  stock_status text not null default 'libre'
    check (stock_status in ('libre','bloque','qualite','transit')),
  quantity numeric(18,3) not null default 0,
  value numeric(18,2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists uidx_stock_quants_segment
  on public.stock_quants (tenant_id, material_id, warehouse_id,
    coalesce(location_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(batch_id,'00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(serial_id,'00000000-0000-0000-0000-000000000000'::uuid),
    stock_status);

create table if not exists public.stock_valuation_layers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  material_id uuid not null references public.stock_materials(id),
  warehouse_id uuid references public.stock_warehouses(id),
  remaining_qty numeric(18,3) not null,
  unit_cost numeric(18,4) not null,
  in_date date not null default current_date,
  document_line_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 3.6 Catalogue types de mouvements + détermination GL ============
create table if not exists public.stock_movement_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  code text not null,
  label text not null,
  direction text not null check (direction in ('in','out','transfer')),
  posts_gl boolean not null default true,
  reverses text,
  special text check (special in ('transfer','physinv','goods_receipt','goods_issue','scrap')),
  requires_reference boolean not null default false,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, code)
);

create table if not exists public.stock_gl_determination (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  valuation_class text not null,
  transaction_key text not null check (transaction_key in ('BSX','GBB','WRX','PRD','UMB')),
  movement_context text not null default '',
  debit_account text,
  credit_account text,
  analytic boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, valuation_class, transaction_key, movement_context)
);

-- ============ 3.5 Documents de mouvement (material document) ============
create table if not exists public.stock_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  doc_number text not null,
  doc_date date not null default current_date,
  posting_date date not null default current_date,
  movement_type_code text not null,
  status text not null default 'draft' check (status in ('draft','posted','cancelled')),
  reference text,
  reversal_of uuid references public.stock_documents(id),
  journal_entry_id uuid,
  hash text,
  created_by uuid,
  posted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, doc_number)
);

create table if not exists public.stock_document_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  document_id uuid not null references public.stock_documents(id) on delete cascade,
  line_no integer not null,
  material_id uuid not null references public.stock_materials(id),
  warehouse_id uuid not null references public.stock_warehouses(id),
  location_id uuid references public.stock_locations(id),
  batch_id uuid references public.stock_batches(id),
  serial_id uuid references public.stock_serials(id),
  direction text not null check (direction in ('in','out')),
  quantity numeric(18,3) not null,
  unit_cost numeric(18,4) not null default 0,
  amount numeric(18,2) not null default 0,
  to_warehouse_id uuid references public.stock_warehouses(id),
  to_location_id uuid references public.stock_locations(id),
  reason text,
  cost_center_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 3.7 Inventaire physique ============
create table if not exists public.stock_count_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  doc_number text not null,
  warehouse_id uuid not null references public.stock_warehouses(id),
  count_date date not null default current_date,
  type text not null default 'total' check (type in ('total','tournant','ponctuel')),
  status text not null default 'ouvert' check (status in ('ouvert','compte','valide','annule')),
  team jsonb,
  period_code text,
  hash text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, doc_number)
);

create table if not exists public.stock_count_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  count_doc_id uuid not null references public.stock_count_documents(id) on delete cascade,
  material_id uuid not null references public.stock_materials(id),
  location_id uuid references public.stock_locations(id),
  batch_id uuid references public.stock_batches(id),
  book_qty numeric(18,3) not null default 0,
  counted_qty numeric(18,3),
  variance_qty numeric(18,3),
  unit_cost numeric(18,4) not null default 0,
  variance_value numeric(18,2),
  recount boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 3.8 Réservations ============
create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.societes(id),
  material_id uuid not null references public.stock_materials(id),
  warehouse_id uuid not null references public.stock_warehouses(id),
  quantity numeric(18,3) not null,
  reserved_for text not null default 'manuel' check (reserved_for in ('OF','commande','manuel')),
  reference text,
  status text not null default 'active' check (status in ('active','consommee','annulee')),
  valid_until date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ Numérotation des documents (number ranges) ============
create table if not exists public.stock_number_ranges (
  tenant_id uuid not null references public.societes(id),
  object text not null,
  prefix text not null default '',
  next_val bigint not null default 1,
  width integer not null default 6,
  primary key (tenant_id, object)
);
alter table public.stock_number_ranges enable row level security;
do $$ begin
  create policy stock_number_ranges_all on public.stock_number_ranges
    using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;

create or replace function public.stock_next_number(p_tenant uuid, p_object text, p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare v_next bigint; v_width integer;
begin
  insert into public.stock_number_ranges(tenant_id, object, prefix)
    values (p_tenant, p_object, p_prefix)
    on conflict (tenant_id, object) do nothing;
  update public.stock_number_ranges
    set next_val = next_val + 1
    where tenant_id = p_tenant and object = p_object
    returning next_val - 1, width into v_next, v_width;
  return coalesce(p_prefix, '') || lpad(v_next::text, v_width, '0');
end $$;

-- ============ RLS + index sur toutes les tables stock_* ============
do $$
declare t text;
begin
  foreach t in array array[
    'stock_sites','stock_warehouses','stock_locations','stock_materials',
    'stock_uom_conversions','stock_batches','stock_serials','stock_quants',
    'stock_valuation_layers','stock_movement_types','stock_gl_determination',
    'stock_documents','stock_document_lines','stock_count_documents',
    'stock_count_lines','stock_reservations'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy %I on public.%I
      using (tenant_id = get_user_company_id())
      with check (tenant_id = get_user_company_id())$p$, t||'_all', t);
    execute format('create index if not exists %I on public.%I (tenant_id)', 'idx_'||t||'_tenant', t);
  end loop;
exception when duplicate_object then null;
end $$;

create index if not exists idx_stock_quants_material on public.stock_quants(tenant_id, material_id, warehouse_id);
create index if not exists idx_stock_doc_lines_doc on public.stock_document_lines(tenant_id, document_id);
create index if not exists idx_stock_doc_lines_material on public.stock_document_lines(tenant_id, material_id, warehouse_id);
create index if not exists idx_stock_vallayers_material on public.stock_valuation_layers(tenant_id, material_id, in_date);
create index if not exists idx_stock_count_lines_doc on public.stock_count_lines(tenant_id, count_doc_id);
create index if not exists idx_stock_batches_material on public.stock_batches(tenant_id, material_id);

-- ============ Seeds par tenant (types de mouvement + détermination GL) ============
-- Idempotent : à appeler à l'ACTIVATION du module pour un tenant (L1).
create or replace function public.stock_seed_defaults(p_tenant uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Catalogue des types de mouvements (SAP-aligned)
  insert into public.stock_movement_types(tenant_id, code, label, direction, posts_gl, reverses, special, requires_reference)
  values
    (p_tenant,'101','Entrée sur achat (réception)','in',true,'102','goods_receipt',true),
    (p_tenant,'102','Annulation entrée sur achat','out',true,null,'goods_receipt',true),
    (p_tenant,'201','Sortie pour charge (centre de coût)','out',true,'202','goods_issue',false),
    (p_tenant,'202','Annulation sortie pour charge','in',true,null,'goods_issue',false),
    (p_tenant,'261','Sortie sur ordre de fabrication','out',true,'262','goods_issue',true),
    (p_tenant,'262','Annulation sortie sur OF','in',true,null,'goods_issue',true),
    (p_tenant,'301','Transfert magasin↔magasin','transfer',true,null,'transfer',false),
    (p_tenant,'311','Transfert emplacement','transfer',false,null,'transfer',false),
    (p_tenant,'309','Transfert article↔article','transfer',true,null,'transfer',false),
    (p_tenant,'501','Entrée sans commande','in',true,null,'goods_receipt',false),
    (p_tenant,'551','Mise au rebut','out',true,null,'scrap',false),
    (p_tenant,'561','Reprise initiale de stock','in',true,null,'goods_receipt',false),
    (p_tenant,'701','Écart d''inventaire positif','in',true,null,'physinv',true),
    (p_tenant,'702','Écart d''inventaire négatif','out',true,null,'physinv',true)
  on conflict (tenant_id, code) do nothing;

  -- Détermination comptable SYSCOHADA (seeds par défaut, éditables en L2)
  insert into public.stock_gl_determination(tenant_id, valuation_class, transaction_key, debit_account, credit_account, analytic)
  values
    -- BSX = compte de stock (bilan) ; le sens réel est géré par le moteur selon la direction
    (p_tenant,'MARCH','BSX','311',null,false),
    (p_tenant,'MP','BSX','321',null,false),
    (p_tenant,'APPRO','BSX','331',null,false),
    (p_tenant,'EMB','BSX','335',null,false),
    (p_tenant,'PF','BSX','361',null,false),
    (p_tenant,'ENCOURS','BSX','341',null,false),
    -- GBB = contrepartie de sortie/charge
    (p_tenant,'MARCH','GBB','6031',null,true),
    (p_tenant,'MP','GBB','6032',null,true),
    (p_tenant,'APPRO','GBB','6033',null,true),
    (p_tenant,'EMB','GBB','6036',null,true),
    (p_tenant,'PF','GBB','736',null,true),
    (p_tenant,'ENCOURS','GBB','734',null,true),
    -- WRX = réception non facturée (GR/IR)
    (p_tenant,'MARCH','WRX',null,'408',false),
    (p_tenant,'MP','WRX',null,'408',false),
    (p_tenant,'APPRO','WRX',null,'408',false),
    (p_tenant,'EMB','WRX',null,'408',false),
    -- UMB = écart d'inventaire
    (p_tenant,'MARCH','UMB','6031','758',false),
    (p_tenant,'MP','UMB','6032','758',false),
    (p_tenant,'APPRO','UMB','6033','758',false),
    (p_tenant,'PF','UMB','736','758',false)
  on conflict (tenant_id, valuation_class, transaction_key, movement_context) do nothing;
end $$;
