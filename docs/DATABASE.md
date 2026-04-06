# Database Architecture

Atlas Finance uses Supabase (PostgreSQL) with Row-Level Security, triggers for accounting integrity, and a SHA-256 audit chain.

## Tables

### Core Tables

| Table | Description |
|-------|-------------|
| `societes` | Company entities. Each tenant operates within a company. |
| `profiles` | User profiles linked to Supabase Auth. Includes role, 2FA, login tracking. |
| `roles` | Role definitions: admin, manager, accountant, user. |
| `permissions` | Granular permission codes per module. |
| `devises` | Currencies with exchange rates (FCFA as base). |
| `workspaces` | UI workspace definitions for role-based navigation. |

### Accounting Core

| Table | Description |
|-------|-------------|
| `fiscal_years` | Fiscal year periods. `is_closed` prevents modification. `is_active` marks the current working year. |
| `chart_of_accounts` | SYSCOHADA plan comptable. 9 account classes, hierarchical (parent_account_id). Supports auxiliary accounts and multi-currency. |
| `journals` | Journal definitions (AC, VE, BQ, CA, OD, AN, SAL, DEC, REG, CLO). Auto-numbering with prefix. |
| `journal_entries` | Entry headers. Linked to fiscal_year and journal. Includes balanced flag, validation state, and attachment count. |
| `journal_entry_lines` | Entry detail lines. Each line debits or credits an account. Supports multi-currency with exchange rate. Reconciliation tracking via `reconciliation_code`. |

### Third Parties

| Table | Description |
|-------|-------------|
| `tiers` | Generic third-party entity (customers, suppliers, employees). |
| `customers` | Customer-specific data: credit score, risk level, outstanding balance. |
| `suppliers` | Supplier-specific data: rating, outstanding balance. |

## Key Triggers

### Balance Validation Trigger

Fires on `journal_entries` INSERT/UPDATE. Ensures `total_debit = total_credit` by summing all related `journal_entry_lines`. Sets `is_balanced = true/false` automatically. Prevents validation (`is_validated`) of unbalanced entries.

```
-- Pseudocode
BEFORE INSERT OR UPDATE ON journal_entries:
  SELECT SUM(debit_amount), SUM(credit_amount) FROM journal_entry_lines WHERE entry_id = NEW.id
  NEW.is_balanced := (sum_debit = sum_credit)
  IF NEW.is_validated = true AND NOT NEW.is_balanced THEN RAISE EXCEPTION
```

### Period Lock Trigger

Fires on `journal_entries` INSERT/UPDATE. Checks that the entry date falls within a non-closed fiscal year. Prevents any modification to entries in a closed fiscal year.

```
-- Pseudocode
BEFORE INSERT OR UPDATE ON journal_entries:
  SELECT is_closed FROM fiscal_years WHERE id = NEW.fiscal_year_id
  IF is_closed THEN RAISE EXCEPTION 'Cannot modify entries in a closed fiscal year'
```

### Audit Protection Trigger

Fires on `journal_entries` UPDATE/DELETE. Prevents deletion of validated entries. On update of validated entries, only allows adding attachments (not changing amounts or accounts). Maintains immutability of the accounting record per SYSCOHADA Art. 19.

### Sequential Numbering Trigger

Fires on `journal_entries` INSERT. Assigns the next `piece_number` using the journal's `numbering_prefix` and `last_number`. Ensures gap-free chronological numbering within each journal.

## RLS Policies Pattern

All tables use Row-Level Security keyed on company membership:

```sql
-- Standard RLS policy pattern
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own company data"
ON <table>
FOR ALL
USING (company_id = (SELECT get_user_company_id()));
```

The `get_user_company_id()` function resolves the authenticated user's company from their profile. This ensures strict tenant isolation: users can only read/write data belonging to their own company.

Additional policies restrict write operations by role:
- `admin`: Full CRUD on all tables
- `manager`: CRUD on entries, read on configuration
- `accountant`: Create/read entries, validate own entries
- `user`: Read-only access

## Indexes

Key indexes for query performance:

| Table | Index | Purpose |
|-------|-------|---------|
| `journal_entries` | `(company_id, fiscal_year_id, entry_date)` | Filter entries by company and period |
| `journal_entries` | `(journal_id, piece_number)` | Unique sequential numbering |
| `journal_entries` | `(is_validated, company_id)` | Quickly find unvalidated entries |
| `journal_entry_lines` | `(entry_id)` | Join lines to entry |
| `journal_entry_lines` | `(account_id, entry_id)` | General ledger queries by account |
| `journal_entry_lines` | `(reconciliation_code)` | Reconciliation lookups |
| `chart_of_accounts` | `(company_id, code)` | Unique account codes per company |
| `chart_of_accounts` | `(company_id, account_class)` | Filter by class for financial statements |
| `fiscal_years` | `(company_id, is_active)` | Find active fiscal year |

## SHA-256 Audit Chain

Every validated journal entry participates in an immutable audit chain:

1. When an entry is validated, a SHA-256 hash is computed from:
   - Entry ID
   - Piece number
   - Entry date
   - Total debit and credit
   - All line account codes and amounts
   - The previous entry's hash (chain linkage)

2. The hash is stored in the audit trail table.

3. Any tampering with historical entries breaks the hash chain, which is detectable by the integrity verification service (`integrity.test.ts`).

4. The chain can be exported as part of the FEC (Fichier des Ecritures Comptables) for regulatory audit per Art. A.47 A-1 of the Livre des Procedures Fiscales.

This provides non-repudiation and ensures the accounting records have not been altered after validation, as required by SYSCOHADA and local tax authorities.
