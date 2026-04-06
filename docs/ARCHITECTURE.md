# Atlas Finance -- Architecture

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18, TypeScript 5, Vite |
| UI | Tailwind CSS, Radix UI, Framer Motion |
| State | Zustand (global), React Query (server) |
| Offline-first | Dexie.js (IndexedDB) |
| Backend | Supabase (PostgreSQL, Auth, RLS, Edge Functions) |
| AI | PROPH3T -- Ollama (local) / Anthropic (cloud) |
| Monnaie | Decimal.js (zero floating-point on monetary values) |

## DataAdapter Pattern

All data access passes through `IDataAdapter`, allowing transparent switching between storage backends.

```
IDataAdapter
  |-- DexieAdapter       (offline IndexedDB, Dexie.js)
  |-- SupabaseAdapter    (online PostgreSQL via Supabase client)
  |-- HybridAdapter      (offline-first with sync to Supabase)
```

The active adapter is provided through `DataContext`. Components never import Dexie or Supabase directly; they call `adapter.getAll()`, `adapter.create()`, etc.

Key methods:
- `getAll(table)` / `getById(table, id)`
- `create(table, data)` / `update(table, id, data)` / `delete(table, id)`
- `query(table, filters)`

Sync (HybridAdapter) uses a last-write-wins strategy with `updated_at` timestamps and a pending-changes queue that flushes when connectivity is restored.

## Money.ts -- Monetary Safety

All monetary values are stored and computed using `Decimal.js`:
- No native `number` for amounts (prevents floating-point rounding)
- FCFA (XOF/XAF) has zero decimals; formatting follows SYSCOHADA conventions
- Currency conversion uses Decimal throughout

## PROPH3T Architecture

PROPH3T is the embedded AI assistant for accounting professionals.

```
User Message
  --> ContextBuilder (fiscal year, accounts, balances, knowledge RAG)
  --> LLMProviderFactory
        |-- OllamaProvider   (local, free, tool-calling via v0.3+)
        |-- AnthropicProvider (cloud fallback)
  --> ToolExecutor (18+ tool categories)
  --> Response with citations
```

### LLMProviderFactory

Instantiates the correct provider based on configuration. Ollama is the default (runs locally, no API key); Anthropic is the cloud fallback.

### ContextBuilder

Assembles the system prompt with:
- Company context (fiscal year, SYSCOHADA plan, balances)
- RAG chunks from the knowledge base (`searchKnowledge`)
- Active fiscal year and closure status

### ToolExecutor

Dispatches tool calls from the LLM to registered tool implementations:
- `accountingTools` -- journal entries, account lookups
- `auditTools` -- Altman Z-Score, audit checks
- `calculationTools` -- financial calculations
- `closureTools` -- 15-step closure workflow
- `fiscalTools` / `fiscalDeclarationTools` -- tax simulation, declarations
- `depreciationTools` -- asset depreciation schedules
- `predictionTools` -- forecasting
- `treasuryTools` -- cash flow, bank reconciliation
- `consolidation/` -- group consolidation engine
- `analytique/` -- cost-center analytics
- `devises/` -- multi-currency engine
- `etats/` -- financial statement generation
- `immobilisations/` -- fixed asset management
- `controle/` -- BREX rule engine
- `saisie/` -- PDF invoice extraction
- `tresorerie/` -- credit scoring, bank reconciliation

### RAG (Retrieval-Augmented Generation)

Knowledge is stored in two tiers:
1. **Static chunks** -- built-in SYSCOHADA, fiscalite, audit, cloture, paie, consolidation knowledge compiled into the app.
2. **pgvector chunks** -- tenant-specific or curated knowledge stored in `knowledge_chunks` with 1536-dimension embeddings, searched via cosine similarity (`search_knowledge` RPC).

`searchKnowledge()` tries pgvector semantic search first, then falls back to keyword TF scoring.

## SYSCOHADA Compliance

### 15-Step Annual Closure

The closure workflow enforces the OHADA Uniform Act sequence:
1. Trial balance verification
2. Inventory adjustments
3. Depreciation computation
4. Provision computation
5. Accruals (charges/produits constates d'avance)
6. Foreign currency revaluation
7. Inter-company eliminations
8. Tax computation
9. Result allocation
10. Closing entries generation
11. Financial statements (Bilan, Compte de Resultat, TAFIRE)
12. Notes annexes
13. Period lock
14. Carry-forward (report a nouveau)
15. Audit trail finalization

### Immutability

- Journal entries in a closed period cannot be modified (enforced by DB triggers).
- Any correction creates a reversal + new entry.
- The `period_locks` table and `check_period_lock()` trigger guarantee this at the PostgreSQL level.

### Liasse Fiscale

84 SYSCOHADA-compliant forms: Bilan Actif/Passif, Compte de Resultat, TAFIRE, Tableau des Flux de Tresorerie, 30+ Notes Annexes, and complementary schedules.

## Security

### Row-Level Security (RLS)

Every table has RLS policies scoped to the tenant via `get_user_company_id()`. Users can only read/write data belonging to their company.

### Audit Trail

- SHA-256 hash chain on journal entries (`entry_hash` = SHA-256 of previous hash + entry data).
- `audit_log` table records every mutation with user, timestamp, old/new values.
- Tamper detection: any broken hash link is flagged.

### Authentication

- Supabase Auth (email/password, magic link).
- Atlas Studio SSO integration for enterprise tenants.
- JWT-based session with automatic refresh.
