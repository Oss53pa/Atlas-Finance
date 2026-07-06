-- ============================================================================
-- Espace collaboratif — documents VERSIONNÉS des espaces de résolution (CDC §9.1.2).
-- Une ligne = une version (v1, v2…) ; « courant » = version max par (space_id, name).
-- Contenu inline (data_url base64) pour petits fichiers ; storage_path réservé aux
-- gros fichiers (Supabase Storage, v2). RLS tenant standard. Miroir Dexie
-- collabDocuments (mapping camel→snake dans SupabaseAdapter).
-- ============================================================================

create table if not exists public.collab_documents (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null,
  space_id           text not null,
  name               text not null,
  version            int  not null default 1,
  size               bigint,
  mime               text,
  data_url           text,                 -- contenu inline (base64), petits fichiers
  storage_path       text,                 -- Supabase Storage (gros fichiers, v2)
  checksum           text,                 -- SHA-256 du contenu
  linked_decision_id text,
  linked_action_id   text,
  uploaded_by        text,
  uploaded_by_name   text,
  uploaded_at        timestamptz not null default now()
);
create index if not exists idx_collab_documents_space on public.collab_documents(space_id, name, version desc);
create index if not exists idx_collab_documents_tenant on public.collab_documents(tenant_id);

alter table public.collab_documents enable row level security;
do $$ begin
  create policy collab_documents_all on public.collab_documents for all
    using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
