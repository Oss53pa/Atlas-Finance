-- ============================================================================
-- Espace collaboratif → modèle « ESPACE DE RÉSOLUTION » (CDC v1.0).
-- Enrichit les tables collab_* (schéma initial : messagerie simple) avec les
-- colonnes du modèle de résolution : problème/objectif/convergence/ancrage/
-- critères/solutions/échéances côté espaces (collab_channels type='space'),
-- fil TYPÉ + payload côté messages (collab_messages), actions de résolution
-- côté tâches (collab_tasks). Mapping camelCase→snake_case dans SupabaseAdapter.
-- Idempotent (add column if not exists).
-- ============================================================================

-- ── Espaces (collab_channels sert de conteneur d'espace, type='space') ───────
alter table public.collab_channels
  add column if not exists problem          text,
  add column if not exists objective        text,
  add column if not exists responsible_id   text,
  add column if not exists responsible_name text,
  add column if not exists deadline         text,
  add column if not exists status           text,
  add column if not exists convergence_bp   int,
  add column if not exists convergence      jsonb,
  add column if not exists exit_criteria    jsonb,
  add column if not exists solutions        jsonb,
  add column if not exists milestones       jsonb,
  add column if not exists anchors          jsonb,
  add column if not exists decision_seq     int,
  add column if not exists linked_type      text,
  add column if not exists linked_id        text,
  add column if not exists linked_label     text,
  add column if not exists linked_path      text,
  add column if not exists abandon_reason   text,
  add column if not exists closed_at        timestamptz,
  add column if not exists closure_hash     text;

-- ── Fil unifié typé (collab_messages = space_event) ──────────────────────────
-- actor_id peut valoir 'system'/'proph3t' → author_id doit accepter du texte.
alter table public.collab_messages
  alter column author_id type text using author_id::text;
alter table public.collab_messages
  add column if not exists type    text,
  add column if not exists via     text,
  add column if not exists payload jsonb;

-- ── Actions de résolution (collab_tasks = space_action) ──────────────────────
alter table public.collab_tasks
  add column if not exists space_id      text,
  add column if not exists critical_path boolean,
  add column if not exists blocks_count  int,
  add column if not exists blocked_reason text,
  add column if not exists linked_ref    text;
create index if not exists idx_collab_tasks_space on public.collab_tasks(space_id);
