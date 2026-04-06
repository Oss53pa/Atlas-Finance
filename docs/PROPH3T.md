# PROPH3T -- AI Assistant for Atlas Finance

PROPH3T is the embedded AI assistant that helps accountants with SYSCOHADA-compliant bookkeeping, fiscal declarations, auditing, and financial analysis.

## Ollama Setup

PROPH3T uses Ollama as the default LLM provider (runs locally, free, no API key).

### Installation

1. Download and install Ollama from https://ollama.ai
2. Pull a recommended model:

```bash
# Recommended -- best quality for accounting tasks
ollama pull mistral-large

# Alternative -- good balance of speed and quality
ollama pull qwen2.5:14b

# Lightweight -- faster responses, less accurate on complex tasks
ollama pull llama3
```

3. Verify Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

### Recommended Models

| Model | Size | Quality | Speed | Best For |
|-------|------|---------|-------|----------|
| `mistral-large` | ~70B | Excellent | Slow | Complex fiscal analysis, audit |
| `qwen2.5:14b` | 14B | Very Good | Medium | General accounting, daily use |
| `llama3` | 8B | Good | Fast | Quick lookups, simple queries |
| `mistral:7b` | 7B | Good | Fast | Lightweight alternative |
| `deepseek-coder-v2` | 16B | Very Good | Medium | Code generation, formula calc |

For production use, `mistral-large` or `qwen2.5:14b` is recommended. For development/testing, `llama3` provides fast iteration.

## Configuration

Environment variables (set in `.env`):

```env
# Ollama (default provider -- local, free)
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=mistral-large

# Anthropic (cloud fallback -- requires API key)
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_ANTHROPIC_MODEL=claude-sonnet-4-20250514

# RAG embedding model for pgvector semantic search
VITE_EMBEDDING_MODEL=nomic-embed-text
VITE_EMBEDDING_DIM=1536

# General
VITE_AI_TEMPERATURE=0.1
VITE_AI_MAX_TOKENS=4096
VITE_AI_TIMEOUT=60000
```

### Provider Priority

1. **Ollama** -- checked first. If the model is available locally, all requests go through Ollama.
2. **Anthropic** -- used as fallback when Ollama is unavailable or the request times out.

## Available Tools (18+ categories)

PROPH3T exposes tools that the LLM can call to interact with the accounting system:

### Core Accounting
- **accountingTools** -- Create/search journal entries, lookup accounts, trial balance
- **calculationTools** -- Financial ratio computation, amortization tables, compound interest

### Fiscal & Tax
- **fiscalTools** -- Tax rate lookup, fiscal regime analysis
- **fiscalDeclarationTools** -- Generate fiscal declarations (DSF, TVA, IS, IRPP)
- **fiscal/SimulateurFiscal** -- Tax simulation and optimization

### Audit & Control
- **auditTools** -- Audit procedures, anomaly detection
- **audit/AltmanZScore** -- Bankruptcy risk scoring (Altman Z-Score)
- **controle/MoteurReglesBrex** -- BREX rule engine for compliance checks

### Closure & Provisions
- **closureTools** -- 15-step SYSCOHADA annual closure workflow
- **cloture/ProvisionsEngine** -- Automatic provision computation

### Assets & Depreciation
- **depreciationTools** -- Depreciation schedules (linear, degressive, SYSCOHADA)
- **immobilisations/ImmobilisationsComplet** -- Full asset lifecycle management

### Treasury & Cash
- **treasuryTools** -- Cash flow forecasting, bank reconciliation
- **tresorerie/ReconciliationBancaireIA** -- AI-powered bank reconciliation
- **tresorerie/ScoreCreditClient** -- Client credit scoring

### Financial Statements
- **etats/GenerateurEtatsFinanciers** -- Bilan, Compte de Resultat, TAFIRE generation
- **predictionTools** -- Revenue/expense forecasting

### Multi-entity & Currency
- **consolidation/ConsolidationEngine** -- Group consolidation (SYSCOHADA norms)
- **devises/MultiDeviseEngine** -- Multi-currency conversion and revaluation
- **analytique/AnalytiqueEngine** -- Cost-center and analytical accounting

### Document Processing
- **saisie/ExtracteurFacturePDF** -- PDF invoice extraction with OCR

## RAG Knowledge Base

PROPH3T uses Retrieval-Augmented Generation to ground responses in authoritative accounting knowledge.

### Knowledge Categories

| Category | Content |
|----------|---------|
| `syscohada` | OHADA Uniform Act, chart of accounts, booking rules |
| `fiscalite` | Tax codes by country (CI, SN, CM, GA, BF, ML, NE, TG, BJ) |
| `audit` | Audit standards, procedures, materiality thresholds |
| `cloture` | Annual closure steps, cut-off rules, provisions |
| `paie` | Payroll regulations, social charges by country |
| `custom` | Tenant-specific knowledge (uploaded by users) |

### Search Strategy

1. **Semantic search** (pgvector) -- Query is embedded via `nomic-embed-text`, then matched against `knowledge_chunks` using cosine similarity with a 0.7 threshold.
2. **Keyword fallback** (TF scoring) -- If pgvector is unavailable or returns no results, a token-based scoring system matches query terms against chunk titles, keywords, and content.

### Adding Custom Knowledge

Tenants can add custom knowledge chunks via the API. These are scoped by `tenant_id` and only visible to users in that company (enforced by RLS).

## Continuous Learning

PROPH3T improves over time through:

1. **Conversation history** -- Previous exchanges inform context for follow-up questions.
2. **Custom knowledge** -- Tenant-specific chunks accumulate domain expertise.
3. **Tool usage patterns** -- Frequently used tools are prioritized in context building.
4. **Feedback loop** -- User corrections and validations refine future responses.

The system never sends data to external services without explicit configuration. When using Ollama, all processing happens locally.
