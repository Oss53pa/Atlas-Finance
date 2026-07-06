-- ============================================================================
-- Espace collaboratif : discussions (canaux/messages), tâches (Kanban),
-- commentaires, présence. Scoping tenant + RLS (get_user_company_id()).
-- Miroir SaaS des tables Dexie collabChannels/collabMessages/collabTasks/
-- collabTaskComments/collabPresence (mapping camel→snake dans SupabaseAdapter).
-- ============================================================================

create table if not exists public.collab_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  description text,
  type text not null default 'channel',      -- channel | dm
  is_private boolean not null default false,
  members jsonb,                              -- userIds (dm/privé)
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived boolean not null default false
);
create index if not exists idx_collab_channels_tenant on public.collab_channels(tenant_id, updated_at desc);

create table if not exists public.collab_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null,
  tenant_id uuid not null,
  author_id uuid,
  author_name text,
  body text not null,
  mentions jsonb,                            -- userIds mentionnés
  parent_id uuid,                            -- réponse (thread)
  reactions jsonb,                           -- emoji -> userIds
  attachments jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_collab_messages_channel on public.collab_messages(channel_id, created_at);
create index if not exists idx_collab_messages_tenant on public.collab_messages(tenant_id);

create table if not exists public.collab_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  description text,
  status text not null default 'todo',       -- todo | in_progress | review | done
  priority text not null default 'medium',   -- low | medium | high | urgent
  assignee_id uuid,
  assignee_name text,
  due_date date,
  tags jsonb,
  watchers jsonb,
  linked_type text,
  linked_id text,
  "order" bigint,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_collab_tasks_tenant on public.collab_tasks(tenant_id, status);

create table if not exists public.collab_task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  tenant_id uuid not null,
  author_id uuid,
  author_name text,
  body text not null,
  mentions jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_collab_task_comments_task on public.collab_task_comments(task_id, created_at);

create table if not exists public.collab_presence (
  id uuid primary key,                        -- = user id
  tenant_id uuid not null,
  user_name text,
  status text not null default 'online',
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_collab_presence_tenant on public.collab_presence(tenant_id, last_seen_at desc);

alter table public.collab_channels       enable row level security;
alter table public.collab_messages       enable row level security;
alter table public.collab_tasks          enable row level security;
alter table public.collab_task_comments  enable row level security;
alter table public.collab_presence       enable row level security;

do $$ begin
  create policy collab_channels_all on public.collab_channels for all
    using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id());
  create policy collab_messages_all on public.collab_messages for all
    using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id());
  create policy collab_tasks_all on public.collab_tasks for all
    using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id());
  create policy collab_task_comments_all on public.collab_task_comments for all
    using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id());
  create policy collab_presence_all on public.collab_presence for all
    using (tenant_id = get_user_company_id()) with check (tenant_id = get_user_company_id());
exception when duplicate_object then null; end $$;
