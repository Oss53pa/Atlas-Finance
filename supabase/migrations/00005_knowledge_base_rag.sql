-- ============================================================================
-- 00005_knowledge_base_rag.sql
-- Base de connaissances RAG pour Proph3t V2 — pgvector + SYSCOHADA + Fiscal
-- ============================================================================

-- Extension pgvector pour les embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. TABLE PRINCIPALE : knowledge_base (RAG)
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN (
    'syscohada', 'fiscal', 'audit', 'droit_ohada', 'social',
    'consolidation', 'analytique', 'normes_ias', 'pratique'
  )),
  subdomain TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  country_codes TEXT[] DEFAULT '{}',  -- ISO 2-letter codes; empty = all OHADA
  tags TEXT[] DEFAULT '{}',
  source TEXT,                         -- e.g. "AUDCIF Art. 35", "CGI-CI Art. 18"
  embedding VECTOR(1024),              -- nomic-embed-text / mxbai-embed-large
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche vectorielle (IVFFlat — bon pour <100k lignes)
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Index texte pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_knowledge_domain ON knowledge_base (domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_subdomain ON knowledge_base (subdomain);
CREATE INDEX IF NOT EXISTS idx_knowledge_country ON knowledge_base USING gin (country_codes);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base USING gin (tags);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_knowledge_fts
  ON knowledge_base USING gin (to_tsvector('french', title || ' ' || content));

-- ============================================================================
-- 2. TABLE : tax_rates (Taux d'imposition par pays)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  tax_type TEXT NOT NULL CHECK (tax_type IN (
    'IS', 'TVA', 'TVA_reduit', 'IRPP', 'IMF', 'patente',
    'retenue_source', 'taxe_apprentissage', 'contribution_fonciere'
  )),
  rate NUMERIC(8,4) NOT NULL,
  ceiling NUMERIC(18,2),              -- plafond si applicable
  effective_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  legal_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_rates_country ON tax_rates (country_code, tax_type);

-- ============================================================================
-- 3. TABLE : social_contributions (Cotisations sociales par pays)
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  organism TEXT NOT NULL,              -- CNPS, CSS, IPRES, etc.
  contribution_type TEXT NOT NULL,     -- PF, AT, retraite, maladie, etc.
  employer_rate NUMERIC(8,4) NOT NULL,
  employee_rate NUMERIC(8,4) NOT NULL DEFAULT 0,
  ceiling NUMERIC(18,2),
  effective_date DATE NOT NULL,
  end_date DATE,
  legal_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_country ON social_contributions (country_code, organism);

-- ============================================================================
-- 4. TABLE : plan_comptable_syscohada (Plan comptable SYSCOHADA révisé)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_comptable_syscohada (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_number TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  class INTEGER NOT NULL CHECK (class BETWEEN 1 AND 9),
  category TEXT NOT NULL CHECK (category IN (
    'bilan', 'gestion', 'engagements', 'analytique'
  )),
  parent_account TEXT,
  is_title_account BOOLEAN DEFAULT false,
  description TEXT,
  nature TEXT CHECK (nature IN ('debit', 'credit', 'mixte')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_comptable_class ON plan_comptable_syscohada (class);
CREATE INDEX IF NOT EXISTS idx_plan_comptable_parent ON plan_comptable_syscohada (parent_account);

-- ============================================================================
-- 5. TABLE : journal_entry_templates (Modèles d'écritures comptables)
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_entry_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL,        -- achat_marchandises, vente_services, salaires, etc.
  description TEXT NOT NULL,
  journal_code TEXT NOT NULL,          -- AC, VT, BQ, OD, etc.
  lines JSONB NOT NULL,               -- [{compte, libelle, sens: 'debit'|'credit', formula}]
  country_codes TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON journal_entry_templates (operation_type);

-- ============================================================================
-- 6. TABLE : irpp_brackets (Barèmes IRPP par pays)
-- ============================================================================
CREATE TABLE IF NOT EXISTS irpp_brackets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL,
  bracket_min NUMERIC(18,2) NOT NULL,
  bracket_max NUMERIC(18,2),          -- NULL = dernière tranche
  rate NUMERIC(8,4) NOT NULL,
  effective_year INTEGER NOT NULL,
  legal_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_irpp_country_year ON irpp_brackets (country_code, effective_year);

-- ============================================================================
-- 7. TABLE : chat_logs (Historique des conversations Proph3t)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_used INTEGER,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_logs (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_logs (user_id);

-- ============================================================================
-- 8. FONCTION RPC : search_knowledge (recherche RAG)
-- ============================================================================
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding VECTOR(1024),
  match_count INTEGER DEFAULT 5,
  filter_domain TEXT DEFAULT NULL,
  filter_country TEXT DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  domain TEXT,
  subdomain TEXT,
  title TEXT,
  content TEXT,
  country_codes TEXT[],
  source TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.domain,
    kb.subdomain,
    kb.title,
    kb.content,
    kb.country_codes,
    kb.source,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE
    (filter_domain IS NULL OR kb.domain = filter_domain)
    AND (filter_country IS NULL OR filter_country = ANY(kb.country_codes) OR kb.country_codes = '{}')
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 9. FONCTION RPC : search_knowledge_fts (recherche full-text)
-- ============================================================================
CREATE OR REPLACE FUNCTION search_knowledge_fts(
  search_query TEXT,
  match_count INTEGER DEFAULT 10,
  filter_domain TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  domain TEXT,
  subdomain TEXT,
  title TEXT,
  content TEXT,
  rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.domain,
    kb.subdomain,
    kb.title,
    kb.content,
    ts_rank(to_tsvector('french', kb.title || ' ' || kb.content), plainto_tsquery('french', search_query)) AS rank
  FROM knowledge_base kb
  WHERE
    to_tsvector('french', kb.title || ' ' || kb.content) @@ plainto_tsquery('french', search_query)
    AND (filter_domain IS NULL OR kb.domain = filter_domain)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- 10. RLS Policies
-- ============================================================================

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_comptable_syscohada ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE irpp_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Knowledge base : lecture pour tous les utilisateurs authentifiés
CREATE POLICY "knowledge_base_select" ON knowledge_base
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tax_rates_select" ON tax_rates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "social_contributions_select" ON social_contributions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "plan_comptable_select" ON plan_comptable_syscohada
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_select" ON journal_entry_templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "irpp_brackets_select" ON irpp_brackets
  FOR SELECT TO authenticated USING (true);

-- Chat logs : chaque utilisateur ne voit que ses propres conversations
CREATE POLICY "chat_logs_select" ON chat_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "chat_logs_insert" ON chat_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
