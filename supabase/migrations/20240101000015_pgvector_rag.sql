-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base for PROPH3T RAG
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES companies(id),
  category TEXT NOT NULL CHECK (category IN ('syscohada', 'fiscalite', 'audit', 'cloture', 'paie', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  legal_references TEXT[],
  country_codes TEXT[],
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_chunks(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON knowledge_chunks(tenant_id);

-- RLS
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_select ON knowledge_chunks FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = get_user_company_id());

CREATE POLICY knowledge_insert ON knowledge_chunks FOR INSERT
  WITH CHECK (tenant_id = get_user_company_id());

-- Semantic search function
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  content TEXT,
  legal_references TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id, kc.category, kc.title, kc.content, kc.legal_references,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE (filter_category IS NULL OR kc.category = filter_category)
    AND (kc.tenant_id IS NULL OR kc.tenant_id = get_user_company_id())
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Updated_at trigger
CREATE TRIGGER trg_knowledge_updated_at
  BEFORE UPDATE ON knowledge_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
