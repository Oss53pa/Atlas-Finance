# Sync Conflict Resolution Strategy

## Overview

Atlas Finance uses an offline-first architecture where Dexie.js (IndexedDB) serves as the local data store and Supabase PostgreSQL as the remote source of truth. When the user goes back online, local changes must be reconciled with remote state.

## Conflict Detection

A conflict occurs when both sides have modified the same record since the last sync:

1. **Last-write timestamp**: Every record carries `updatedAt`. During sync, if both local and remote have a newer `updatedAt` than the last sync checkpoint, a conflict is detected.
2. **Hash chain (audit logs)**: Audit logs use SHA-256 hash chaining. A broken chain signals tampering or missed sync events.

## Conflict Resolution Rules

### Journal Entries (accounting data)

| Scenario | Resolution | Rationale |
|---|---|---|
| Both sides modified same draft entry | **Remote wins** | Server is the shared source of truth for multi-user edits |
| Local created, remote has no record | **Local wins** (push to remote) | Offline entry creation is the primary use case |
| Remote entry is `posted`, local is `draft` | **Remote wins** | Posted entries are immutable per SYSCOHADA Art. 19 |
| Both sides posted same entry | **Flag for manual review** | Should not happen; indicates a workflow issue |
| Local deleted, remote still exists | **Remote wins** | Soft delete prevents data loss; remote state is authoritative |

### Immutable Records

- **Posted journal entries**: Never overwritten. If a conflict is detected on a posted entry, the sync logs a warning and skips the local version.
- **Audit logs**: INSERT-only, append-only. Conflicts are resolved by merging both sides chronologically and re-computing the hash chain.

### Reference Data (accounts, fiscal years, third parties)

- **Remote wins** by default. These are typically managed by a single admin user.
- Local modifications made offline are preserved as "pending changes" until confirmed.

## Sync Process

1. **Pull phase**: Fetch all remote records modified since last sync checkpoint.
2. **Detect conflicts**: Compare local `updatedAt` with remote `updatedAt` for overlapping records.
3. **Resolve**: Apply the rules above. Unresolvable conflicts are queued for user review.
4. **Push phase**: Send local-only changes to remote.
5. **Checkpoint**: Record the new sync timestamp.

## User-Facing Conflict UI

When conflicts cannot be auto-resolved:

- A notification badge appears on the sync status indicator.
- The user can review each conflict side-by-side (local vs remote).
- Actions: "Keep local", "Keep remote", or "Merge manually".
- All conflict resolutions are logged in the audit trail.

## Edge Cases

- **Clock skew**: Timestamps use server time when available. Offline timestamps are adjusted on sync using the delta between local and server clocks.
- **Schema migration during offline period**: If the remote schema has been migrated while the user was offline, the sync adapter detects version mismatches and prompts the user to refresh the application before syncing.
- **Large batch conflicts**: If more than 50 conflicts are detected in a single sync, the sync is paused and the user is prompted to review before continuing.

## Data Integrity Guarantees

- No accounting data is ever hard-deleted (soft delete with `deleted_at` column).
- The audit log hash chain is verified on every sync to detect tampering.
- Conflict resolution actions are themselves audited.
