/**
 * Service de suivi des créances et dettes tiers.
 * Connecte les comptes 40x/41x aux écritures pour:
 * - Calcul des soldes tiers en temps réel
 * - Analyse de l'ancienneté (aging)
 * - Génération des provisions pour créances douteuses (compte 491/6594)
 *
 * Conforme SYSCOHADA révisé.
 */
import { money } from '../utils/money';
import { db, logAudit } from '../lib/db';
import type { DBJournalLine, DBThirdParty, DBProvision } from '../lib/db';
import { safeAddEntry } from './entryGuard';

// ============================================================================
// TYPES
// ============================================================================

export interface ThirdPartyBalance {
  thirdPartyId: string;
  code: string;
  name: string;
  type: 'customer' | 'supplier' | 'both';
  totalDebit: number;
  totalCredit: number;
  solde: number;
  /** Positive = the third party owes us (customer) or we owe them (supplier) */
  sensNormal: 'debiteur' | 'crediteur';
}

export interface AgingBucket {
  label: string;
  min: number; // days
  max: number; // days (Infinity for last bucket)
  amount: number;
  count: number;
}

export interface AgingAnalysis {
  thirdPartyId: string;
  thirdPartyName: string;
  totalDue: number;
  buckets: AgingBucket[];
  oldestEntryDate: string;
}

export interface ProvisionCreanceDouteuse {
  thirdPartyId: string;
  thirdPartyCode: string;
  thirdPartyName: string;
  solde: number;
  ancienneteJours: number;
  tauxProvision: number;
  montantProvision: number;
}

export interface ProvisionResult {
  success: boolean;
  provisions: ProvisionCreanceDouteuse[];
  totalProvision: number;
  entryId?: string;
  errors: string[];
}

// ============================================================================
// COMPTES SYSCOHADA
// ============================================================================

const COMPTES = {
  PROVISION_CREANCES: '491',       // Provisions pour dépréciation des comptes clients
  DOTATION_PROVISION: '6594',      // Charges provisionnées — créances
  REPRISE_PROVISION: '7594',       // Reprises de provisions — créances
  CREANCES_DOUTEUSES: '416',       // Clients douteux ou litigieux
};

/** Default aging buckets matching SYSCOHADA presentation */
const DEFAULT_AGING_BUCKETS = [
  { label: '0-30 jours', min: 0, max: 30 },
  { label: '31-60 jours', min: 31, max: 60 },
  { label: '61-90 jours', min: 61, max: 90 },
  { label: '91-180 jours', min: 91, max: 180 },
  { label: '181-360 jours', min: 181, max: 360 },
  { label: '+360 jours', min: 361, max: Infinity },
];

/** Provision rates by aging (OHADA recommended) */
const TAUX_PROVISION_PAR_ANCIENNETE: Record<number, number> = {
  30: 0,     // Current — no provision
  60: 10,    // 31-60 days
  90: 25,    // 61-90 days
  180: 50,   // 91-180 days
  360: 75,   // 181-360 days
  9999: 100, // +360 days — full provision
};

// ============================================================================
// SOLDES TIERS
// ============================================================================

/**
 * Calculate real-time balance for all third parties from journal entries.
 */
export async function getThirdPartyBalances(): Promise<ThirdPartyBalance[]> {
  const thirdParties = await db.thirdParties.toArray();
  const entries = await db.journalEntries.toArray();

  const balances: ThirdPartyBalance[] = [];

  for (const tp of thirdParties) {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.thirdPartyCode === tp.code) {
          totalDebit += line.debit;
          totalCredit += line.credit;
        }
      }
    }

    const solde = money(totalDebit).subtract(money(totalCredit)).toNumber();

    balances.push({
      thirdPartyId: tp.id,
      code: tp.code,
      name: tp.name,
      type: tp.type,
      totalDebit,
      totalCredit,
      solde,
      sensNormal: tp.type === 'supplier' ? 'crediteur' : 'debiteur',
    });
  }

  return balances;
}

/**
 * Get balance for a single third party.
 */
export async function getThirdPartyBalance(thirdPartyCode: string): Promise<ThirdPartyBalance | null> {
  const tp = await db.thirdParties.where('code').equals(thirdPartyCode).first();
  if (!tp) return null;

  const entries = await db.journalEntries.toArray();
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.thirdPartyCode === tp.code) {
        totalDebit += line.debit;
        totalCredit += line.credit;
      }
    }
  }

  const solde = money(totalDebit).subtract(money(totalCredit)).toNumber();

  return {
    thirdPartyId: tp.id,
    code: tp.code,
    name: tp.name,
    type: tp.type,
    totalDebit,
    totalCredit,
    solde,
    sensNormal: tp.type === 'supplier' ? 'crediteur' : 'debiteur',
  };
}

// ============================================================================
// AGING ANALYSIS
// ============================================================================

/**
 * Compute aging analysis for customer receivables.
 */
export async function getAgingAnalysis(
  type: 'customer' | 'supplier' = 'customer',
  asOfDate?: string
): Promise<AgingAnalysis[]> {
  const refDate = asOfDate ? new Date(asOfDate) : new Date();
  const thirdParties = await db.thirdParties
    .where('type')
    .anyOf(type === 'customer' ? ['customer', 'both'] : ['supplier', 'both'])
    .toArray();

  const entries = await db.journalEntries.toArray();
  const analyses: AgingAnalysis[] = [];

  for (const tp of thirdParties) {
    // Find all unlettered (unreconciled) entries for this third party
    const openLines: { date: string; amount: number }[] = [];

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.thirdPartyCode !== tp.code) continue;
        if (line.lettrageCode) continue; // Already reconciled

        const amount = type === 'customer'
          ? line.debit - line.credit
          : line.credit - line.debit;

        if (amount > 0) {
          openLines.push({ date: entry.date, amount });
        }
      }
    }

    if (openLines.length === 0) continue;

    const buckets: AgingBucket[] = DEFAULT_AGING_BUCKETS.map(b => ({
      ...b,
      amount: 0,
      count: 0,
    }));

    let totalDue = 0;
    let oldestDate = refDate.toISOString().split('T')[0];

    for (const ol of openLines) {
      const days = Math.floor(
        (refDate.getTime() - new Date(ol.date).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (ol.date < oldestDate) oldestDate = ol.date;
      totalDue += ol.amount;

      for (const bucket of buckets) {
        if (days >= bucket.min && days <= bucket.max) {
          bucket.amount += ol.amount;
          bucket.count++;
          break;
        }
      }
    }

    analyses.push({
      thirdPartyId: tp.id,
      thirdPartyName: tp.name,
      totalDue,
      buckets,
      oldestEntryDate: oldestDate,
    });
  }

  return analyses.sort((a, b) => b.totalDue - a.totalDue);
}

// ============================================================================
// PROVISIONS POUR CRÉANCES DOUTEUSES
// ============================================================================

/**
 * Calculate provisions for doubtful receivables based on aging.
 */
export async function calculerProvisions(
  sessionId?: string,
  asOfDate?: string
): Promise<ProvisionCreanceDouteuse[]> {
  const agingData = await getAgingAnalysis('customer', asOfDate);
  const provisions: ProvisionCreanceDouteuse[] = [];

  for (const analysis of agingData) {
    const tp = await db.thirdParties.get(analysis.thirdPartyId);
    if (!tp) continue;

    // Determine aging in days from oldest entry
    const refDate = asOfDate ? new Date(asOfDate) : new Date();
    const days = Math.floor(
      (refDate.getTime() - new Date(analysis.oldestEntryDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Find applicable provision rate
    let tauxProvision = 0;
    for (const [maxDays, taux] of Object.entries(TAUX_PROVISION_PAR_ANCIENNETE)) {
      if (days <= parseInt(maxDays)) {
        tauxProvision = taux;
        break;
      }
    }

    if (tauxProvision === 0) continue;

    const montantProvision = money(analysis.totalDue).multiply(tauxProvision).divide(100).toNumber();

    provisions.push({
      thirdPartyId: analysis.thirdPartyId,
      thirdPartyCode: tp.code,
      thirdPartyName: tp.name,
      solde: analysis.totalDue,
      ancienneteJours: days,
      tauxProvision,
      montantProvision,
    });
  }

  // Save provisions to DB if sessionId provided
  if (sessionId) {
    for (const p of provisions) {
      const dbProvision: DBProvision = {
        id: crypto.randomUUID(),
        sessionId,
        compteClient: p.thirdPartyCode,
        client: p.thirdPartyName,
        solde: p.solde,
        anciennete: p.ancienneteJours,
        tauxProvision: p.tauxProvision,
        montantProvision: p.montantProvision,
        statut: 'PROPOSEE',
        dateProposition: new Date().toISOString(),
      };
      await db.provisions.add(dbProvision);
    }
  }

  return provisions;
}

/**
 * Generate journal entry for doubtful receivable provisions.
 * Debit: 6594 (Dotation provisions) / Credit: 491 (Provision créances)
 */
export async function posterProvisions(
  provisions: ProvisionCreanceDouteuse[]
): Promise<ProvisionResult> {
  if (provisions.length === 0) {
    return { success: true, provisions: [], totalProvision: 0, errors: [] };
  }

  const totalProvision = provisions.reduce((s, p) => s + p.montantProvision, 0);

  const lines: DBJournalLine[] = [
    {
      id: crypto.randomUUID(),
      accountCode: COMPTES.DOTATION_PROVISION,
      accountName: 'Dotation provisions créances douteuses',
      label: 'Dotation provision créances douteuses',
      debit: totalProvision,
      credit: 0,
    },
    {
      id: crypto.randomUUID(),
      accountCode: COMPTES.PROVISION_CREANCES,
      accountName: 'Provisions pour dépréciation comptes clients',
      label: `Provision créances: ${provisions.length} client(s)`,
      debit: 0,
      credit: totalProvision,
    },
  ];

  const now = new Date().toISOString();
  const datePart = now.split('T')[0].replace(/-/g, '');
  const entryId = crypto.randomUUID();

  await safeAddEntry({
    id: entryId,
    entryNumber: `PROV-${datePart}-001`,
    journal: 'OD',
    date: now.split('T')[0],
    reference: `PROV-CREANCES-${datePart}`,
    label: `Dotation provision créances douteuses (${provisions.length} clients)`,
    status: 'draft',
    lines,
    createdAt: now,
    createdBy: 'system',
  }, { skipSyncValidation: true });

  await logAudit(
    'PROVISION_CREANCES',
    'journalEntry',
    entryId,
    `Provision créances douteuses: ${money(totalProvision).toString()} FCFA pour ${provisions.length} client(s)`
  );

  return {
    success: true,
    provisions,
    totalProvision,
    entryId,
    errors: [],
  };
}

/**
 * Sync third-party balances in the thirdParties table from journal entries.
 * Updates the `balance` field for each third party.
 */
export async function syncThirdPartyBalances(): Promise<number> {
  const balances = await getThirdPartyBalances();
  let updated = 0;

  for (const b of balances) {
    await db.thirdParties.update(b.thirdPartyId, { balance: b.solde });
    updated++;
  }

  return updated;
}
