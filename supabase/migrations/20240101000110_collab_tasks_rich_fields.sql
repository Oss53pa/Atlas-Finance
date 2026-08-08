-- ============================================================================
-- Tâches collaboratives — champs riches de l'écran « Mes tâches »
-- ----------------------------------------------------------------------------
-- CONSTAT : collab_tasks ne portait que le noyau d'une tâche (titre, statut,
-- priorité, assigné, échéance, tags). L'écran CompleteTasksModule gère en plus
-- des sous-tâches, une checklist, des pièces jointes, un avancement et un
-- suivi de charge — tout cela vivait dans l'état du composant et disparaissait
-- au rechargement de la page.
--
-- Migration ADDITIVE : aucune colonne existante n'est touchée, aucune valeur
-- n'est réécrite. Les lignes déjà présentes prennent les valeurs par défaut.
-- Les commentaires de tâche ne sont PAS concernés : collab_task_comments les
-- porte déjà (voir 20240101000054_collaboration.sql).
--
-- Le mapping camelCase ↔ snake_case de SupabaseAdapter est générique : ces
-- colonnes sont exposées telles quelles au front (sub_tasks → subTasks…),
-- sans modification d'adaptateur.
-- ============================================================================

ALTER TABLE public.collab_tasks
  -- [{ id, title, completed, assignee?, dueDate? }] — décomposition de la tâche
  ADD COLUMN IF NOT EXISTS sub_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{ id, text, completed, completedBy?, completedAt? }] — points de contrôle
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{ id, name, url, size, type, uploadedAt, uploadedBy }] — pièces jointes
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- identifiants de tâches bloquantes
  ADD COLUMN IF NOT EXISTS dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 0–100 ; contraint pour qu'un avancement reste lisible comme un pourcentage
  ADD COLUMN IF NOT EXISTS progress integer,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric(10,2),
  ADD COLUMN IF NOT EXISTS actual_hours numeric(10,2),
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS project text;

-- Un avancement hors de [0,100] serait un défaut de saisie, pas une donnée.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'collab_tasks_progress_range'
  ) THEN
    ALTER TABLE public.collab_tasks
      ADD CONSTRAINT collab_tasks_progress_range
      CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100));
  END IF;
END $$;

COMMENT ON COLUMN public.collab_tasks.sub_tasks       IS 'Sous-tâches : [{ id, title, completed, assignee, dueDate }].';
COMMENT ON COLUMN public.collab_tasks.checklist       IS 'Points de contrôle : [{ id, text, completed, completedBy, completedAt }].';
COMMENT ON COLUMN public.collab_tasks.attachments     IS 'Pièces jointes : [{ id, name, url, size, type, uploadedAt, uploadedBy }].';
COMMENT ON COLUMN public.collab_tasks.dependencies    IS 'Identifiants des tâches bloquantes.';
COMMENT ON COLUMN public.collab_tasks.progress        IS 'Avancement 0–100 (%).';
COMMENT ON COLUMN public.collab_tasks.estimated_hours IS 'Charge estimée, en heures.';
COMMENT ON COLUMN public.collab_tasks.actual_hours    IS 'Charge réellement consommée, en heures.';
COMMENT ON COLUMN public.collab_tasks.start_date      IS 'Date de début planifiée.';
COMMENT ON COLUMN public.collab_tasks.category        IS 'Catégorie libre (rapprochement, clôture…).';
COMMENT ON COLUMN public.collab_tasks.project         IS 'Projet de rattachement (libellé libre).';

-- Aucune modification de RLS : les politiques existantes de collab_tasks
-- portent sur la ligne entière et couvrent donc ces colonnes.
