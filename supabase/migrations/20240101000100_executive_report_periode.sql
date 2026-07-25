-- Vue Dirigeant — période couverte par la synthèse programmée.
-- Colonne additive, non destructive : les lignes existantes prennent le défaut
-- 'exercice'. Valeurs applicatives : 'exercice' | 'mois' | 'trimestre' | 'cumul'.
ALTER TABLE public.executive_report_schedules
  ADD COLUMN IF NOT EXISTS periode text NOT NULL DEFAULT 'exercice';
