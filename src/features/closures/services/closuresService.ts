/**
 * Closures Service — Connected to Dexie IndexedDB.
 * Manages closure sessions, provisions, amortissements, and closure entries.
 * Conforme SYSCOHADA révisé.
 */
import type { DataAdapter } from '@atlas/data';
import { Money, money } from '../../../utils/money';
import { logAudit } from '../../../lib/db';
import type { DBClosureSession, DBProvision } from '../../../lib/db';
import { safeAddEntry } from '../../../services/entryGuard';
import {
  ClotureSession,
  BalanceAccount,
  Provision,
  EcritureCloture,
  Amortissement,
  ClotureStats,
  ClotureType,
} from '../types/closures.types';

// ============================================================================
// PROVISION AGING RULES (SYSCOHADA) — paramétrables via settings
// ============================================================================
const DEFAULT_AGING_RULES = [
  { maxDays: 90, rate: 0 },
  { maxDays: 180, rate: 25 },
  { maxDays: 270, rate: 50 },
  { maxDays: 360, rate: 75 },
  { maxDays: Infinity, rate: 100 },
];

let _cachedAgingRules: typeof DEFAULT_AGING_RULES | null = null;

async function loadAgingRules(adapter: DataAdapter): Promise<typeof DEFAULT_AGING_RULES> {
  if (_cachedAgingRules) return _cachedAgingRules;
  try {
    const setting = await adapter.getById<any>('settings', 'provision_aging_rules');
    if (setting?.value) {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        _cachedAgingRules = parsed.map((r: any) => ({
          maxDays: r.maxDays === null || r.maxDays === 'Infinity' ? Infinity : Number(r.maxDays),
          rate: Number(r.rate),
        }));
        return _cachedAgingRules!;
      }
    }
  } catch (error) {
  }
  return DEFAULT_AGING_RULES;
}

function getProvisionRate(ancienneteJours: number, rules = DEFAULT_AGING_RULES): number {
  for (const rule of rules) {
    if (ancienneteJours <= rule.maxDays) return rule.rate;
  }
  return 100;
}

// ============================================================================
// SERVICE
// ============================================================================

class ClosuresService {
  /**
   * Get all closure sessions from Dexie.
   */
  async getSessions(adapter: DataAdapter): Promise<ClotureSession[]> {
    const sessions = await adapter.getAll<DBClosureSession>('closureSessions');
    if (sessions.length === 0) return [];
    return sessions
      .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))
      .map(s => ({ ...s }));
  }

  /**
   * Create a new closure session.
   */
  async createSession(adapter: DataAdapter, session: Omit<ClotureSession, 'id'>): Promise<ClotureSession> {
    const id = crypto.randomUUID();
    const newSession: DBClosureSession = {
      id,
      type: session.type as DBClosureSession['type'],
      periode: session.periode,
      exercice: session.exercice,
      dateDebut: session.dateDebut,
      dateFin: session.dateFin,
      dateCreation: session.dateCreation || new Date().toISOString(),
      statut: 'EN_COURS',
      creePar: session.creePar || 'system',
      progression: 0,
    };

    await adapter.create('closureSessions', newSession);

    await logAudit(
      'CLOSURE_SESSION_CREATE',
      'closureSession',
      id,
      `Création session ${session.type} — ${session.periode}`
    );

    return { ...newSession };
  }

  /**
   * Get balance snapshot for a closure session period from real journal entries.
   */
  async getBalance(adapter: DataAdapter, sessionId: string | number): Promise<BalanceAccount[]> {
    const session = await adapter.getById<DBClosureSession>('closureSessions', String(sessionId));
    if (!session) return [];

    const allEntries = await adapter.getAll<any>('journalEntries');
    const entries = allEntries.filter(
      (e: any) => e.date >= session.dateDebut && e.date <= session.dateFin &&
        (e.status === 'validated' || e.status === 'posted')
    );

    const balances = new Map<string, { name: string; debit: number; credit: number }>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        const existing = balances.get(line.accountCode) || {
          name: line.accountName,
          debit: 0,
          credit: 0,
        };
        existing.debit = money(existing.debit).add(money(line.debit)).toNumber();
        existing.credit = money(existing.credit).add(money(line.credit)).toNumber();
        balances.set(line.accountCode, existing);
      }
    }

    const result: BalanceAccount[] = [];
    for (const [code, data] of balances) {
      const net = money(data.debit).subtract(money(data.credit));
      const netValue = net.toNumber();
      result.push({
        compte: code,
        libelle: data.name,
        debit: data.debit,
        credit: data.credit,
        soldeDebiteur: netValue > 0 ? netValue : 0,
        soldeCrediteur: netValue < 0 ? Math.abs(netValue) : 0,
      });
    }

    return result.sort((a, b) => a.compte.localeCompare(b.compte));
  }

  /**
   * Compute provisions for doubtful debts based on aging analysis.
   * Scans 411xxx client accounts for overdue debit balances.
   */
  async getProvisions(adapter: DataAdapter, sessionId: string | number): Promise<Provision[]> {
    // First check if provisions are already stored
    const stored = await adapter.getAll<DBProvision>('provisions', { where: { sessionId: String(sessionId) } });
    if (stored.length > 0) {
      return stored.map(p => ({ ...p, id: p.id }));
    }

    // Compute from journal entries
    const session = await adapter.getById<DBClosureSession>('closureSessions', String(sessionId));
    if (!session) return [];

    const allEntries = await adapter.getAll<any>('journalEntries');
    const entries = allEntries.filter(
      (e: any) => e.date >= session.dateDebut && e.date <= session.dateFin &&
        (e.status === 'validated' || e.status === 'posted')
    );

    // Find 411xxx client accounts with debit balances
    const clientBalances = new Map<string, { name: string; debit: number; credit: number; earliestDate: string }>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (!line.accountCode.startsWith('411')) continue;
        const existing = clientBalances.get(line.accountCode) || {
          name: line.accountName || line.thirdPartyName || 'Client',
          debit: 0,
          credit: 0,
          earliestDate: entry.date,
        };
        existing.debit = money(existing.debit).add(money(line.debit)).toNumber();
        existing.credit = money(existing.credit).add(money(line.credit)).toNumber();
        if (entry.date < existing.earliestDate) {
          existing.earliestDate = entry.date;
        }
        clientBalances.set(line.accountCode, existing);
      }
    }

    const provisions: Provision[] = [];
    const now = new Date(session.dateFin);

    for (const [code, data] of clientBalances) {
      const solde = money(data.debit).subtract(money(data.credit)).toNumber();
      if (solde <= 0) continue; // Only debit balances (amounts owed)

      const earliest = new Date(data.earliestDate);
      const anciennete = Math.floor((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));
      const taux = getProvisionRate(anciennete);

      if (taux === 0) continue; // No provision needed

      const montant = money(solde).multiply(taux).divide(100).toNumber();
      const provision: Provision = {
        id: crypto.randomUUID(),
        compteClient: code,
        client: data.name,
        solde,
        anciennete,
        tauxProvision: taux,
        montantProvision: montant,
        statut: 'PROPOSEE',
        dateProposition: session.dateFin,
      };

      provisions.push(provision);

      // Store in DB
      await adapter.create('provisions', {
        ...provision,
        id: String(provision.id),
        sessionId: String(sessionId),
      });
    }

    return provisions;
  }

  /**
   * Validate or reject a provision.
   */
  async validerProvision(
    adapter: DataAdapter,
    provisionId: string | number,
    action: 'VALIDER' | 'REJETER'
  ): Promise<Provision> {
    const id = String(provisionId);
    const provision = await adapter.getById<DBProvision>('provisions', id);
    if (!provision) throw new Error(`Provision ${id} introuvable`);

    const newStatut = action === 'VALIDER' ? 'VALIDEE' : 'REJETEE';
    const dateValidation = new Date().toISOString();

    await adapter.update('provisions', id, {
      statut: newStatut,
      dateValidation,
    });

    await logAudit(
      'PROVISION_' + action,
      'provision',
      id,
      `Provision ${provision.compteClient}: ${action} (${provision.montantProvision})`
    );

    return {
      ...provision,
      statut: newStatut as Provision['statut'],
      dateValidation,
    };
  }

  /**
   * Compute depreciation (amortissements) from assets table.
   */
  async getAmortissements(adapter: DataAdapter, sessionId: string | number): Promise<Amortissement[]> {
    const session = await adapter.getById<DBClosureSession>('closureSessions', String(sessionId));
    if (!session) return [];

    const assets = await adapter.getAll<any>('assets', { where: { status: 'active' } });
    const result: Amortissement[] = [];

    for (const asset of assets) {
      if (asset.acquisitionDate > session.dateFin) continue;

      const acqDate = new Date(asset.acquisitionDate);
      const endDate = new Date(session.dateFin);
      const yearsElapsed = (endDate.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const taux = 100 / asset.usefulLifeYears;

      // Annual depreciation (linear)
      const dotationAnnuelle = money(asset.acquisitionValue)
        .subtract(money(asset.residualValue))
        .divide(asset.usefulLifeYears)
        .toNumber();

      // Cumulated depreciation
      const maxDepreciation = money(asset.acquisitionValue).subtract(money(asset.residualValue)).toNumber();
      const amortissementCumule = Math.min(
        money(dotationAnnuelle).multiply(Math.floor(yearsElapsed)).toNumber(),
        maxDepreciation
      );

      // Current year dotation
      const dotationExercice = amortissementCumule >= maxDepreciation ? 0 : dotationAnnuelle;

      result.push({
        id: asset.id,
        immobilisation: asset.accountCode,
        libelleImmobilisation: asset.name,
        valeurAcquisition: asset.acquisitionValue,
        amortissementCumule,
        dotationExercice,
        tauxAmortissement: taux,
        statut: 'CALCULE',
      });
    }

    return result;
  }

  /**
   * Get closure entries (OD journal entries in the session period with CL- prefix).
   */
  async getEcritures(adapter: DataAdapter, sessionId: string | number): Promise<EcritureCloture[]> {
    const session = await adapter.getById<DBClosureSession>('closureSessions', String(sessionId));
    if (!session) return [];

    const allEntries = await adapter.getAll<any>('journalEntries', { where: { journal: 'OD' } });
    const entries = allEntries.filter(
      (e: any) => e.date >= session.dateDebut && e.date <= session.dateFin &&
        e.entryNumber.startsWith('CL-')
    );

    return entries.map((e: any) => ({
      id: e.id,
      numero: e.entryNumber,
      date: e.date,
      libelle: e.label,
      compteDebit: e.lines[0]?.accountCode || '',
      compteCredit: e.lines[1]?.accountCode || '',
      montant: e.totalDebit,
      statut: e.status === 'validated' ? 'VALIDEE' as const : 'BROUILLON' as const,
      typeOperation: this.detectOperationType(e.label),
    }));
  }

  private detectOperationType(label: string): EcritureCloture['typeOperation'] {
    const lower = label.toLowerCase();
    if (lower.includes('provision')) return 'PROVISION';
    if (lower.includes('amortissement') || lower.includes('dotation')) return 'AMORTISSEMENT';
    if (lower.includes('régul') || lower.includes('cca') || lower.includes('fnp') || lower.includes('fae')) return 'REGULARISATION';
    return 'AUTRE';
  }

  /**
   * Create a closure journal entry (OD journal with CL- prefix).
   */
  async createEcriture(adapter: DataAdapter, ecriture: Omit<EcritureCloture, 'id'>): Promise<EcritureCloture> {
    const id = crypto.randomUUID();

    await safeAddEntry(adapter, {
      id,
      entryNumber: ecriture.numero,
      journal: 'OD',
      date: ecriture.date,
      reference: 'CLOTURE',
      label: ecriture.libelle,
      status: 'draft',
      lines: [
        {
          id: crypto.randomUUID(),
          accountCode: ecriture.compteDebit,
          accountName: ecriture.compteDebit,
          label: ecriture.libelle,
          debit: ecriture.montant,
          credit: 0,
        },
        {
          id: crypto.randomUUID(),
          accountCode: ecriture.compteCredit,
          accountName: ecriture.compteCredit,
          label: ecriture.libelle,
          debit: 0,
          credit: ecriture.montant,
        },
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'system',
    }, { skipSyncValidation: true });

    await logAudit(
      'CLOSURE_ENTRY_CREATE',
      'journalEntry',
      id,
      `Écriture de clôture: ${ecriture.libelle} — ${ecriture.montant}`
    );

    return { ...ecriture, id };
  }

  /**
   * Validate a closure entry (change status to validated).
   */
  async validerEcriture(adapter: DataAdapter, ecritureId: string | number): Promise<EcritureCloture> {
    const id = String(ecritureId);
    const entry = await adapter.getById<any>('journalEntries', id);
    if (!entry) throw new Error(`Écriture ${id} introuvable`);

    await adapter.update('journalEntries', id, {
      status: 'validated',
      updatedAt: new Date().toISOString(),
    });

    await logAudit(
      'CLOSURE_ENTRY_VALIDATE',
      'journalEntry',
      id,
      `Validation écriture clôture ${entry.entryNumber}`
    );

    return {
      id,
      numero: entry.entryNumber,
      date: entry.date,
      libelle: entry.label,
      compteDebit: entry.lines[0]?.accountCode || '',
      compteCredit: entry.lines[1]?.accountCode || '',
      montant: entry.totalDebit,
      statut: 'VALIDEE',
      typeOperation: this.detectOperationType(entry.label),
    };
  }

  /**
   * Compute closure session statistics from real data.
   */
  async getStats(adapter: DataAdapter, sessionId: string | number): Promise<ClotureStats> {
    const sid = String(sessionId);

    const provisions = await adapter.getAll<DBProvision>('provisions', { where: { sessionId: sid } });
    const amortissements = await this.getAmortissements(adapter, sessionId);
    const ecritures = await this.getEcritures(adapter, sessionId);

    const regularisations = ecritures.filter(e => e.typeOperation === 'REGULARISATION').length;

    return {
      totalProvisions: provisions.length,
      totalAmortissements: amortissements.length,
      totalRegularisations: regularisations,
      totalEcritures: ecritures.length,
      ecrituresValidees: ecritures.filter(e => e.statut === 'VALIDEE' || e.statut === 'COMPTABILISEE').length,
      ecrituresEnAttente: ecritures.filter(e => e.statut === 'BROUILLON').length,
    };
  }

  /**
   * Close a session: set status to CLOTUREE, progression to 100.
   */
  async cloturerSession(adapter: DataAdapter, sessionId: string | number): Promise<ClotureSession> {
    const id = String(sessionId);
    const session = await adapter.getById<DBClosureSession>('closureSessions', id);
    if (!session) throw new Error(`Session ${id} introuvable`);

    await adapter.update('closureSessions', id, {
      statut: 'CLOTUREE',
      progression: 100,
    });

    await logAudit(
      'CLOSURE_SESSION_CLOSE',
      'closureSession',
      id,
      `Clôture session ${session.type} — ${session.periode}`
    );

    return {
      ...session,
      statut: 'CLOTUREE',
      progression: 100,
    };
  }

  /**
   * Update session progression percentage.
   */
  async updateProgression(adapter: DataAdapter, sessionId: string | number, progression: number): Promise<void> {
    await adapter.update('closureSessions', String(sessionId), { progression });
  }

  /**
   * Validate that the period is ready for closure.
   * Checks: no draft entries, balanced accounts, provisions calculated.
   */
  async validateClosureReadiness(adapter: DataAdapter, sessionId: string | number): Promise<{
    ready: boolean;
    checks: Array<{ name: string; passed: boolean; message: string }>;
  }> {
    const sid = String(sessionId);
    const session = await adapter.getById<DBClosureSession>('closureSessions', sid);
    if (!session) throw new Error(`Session ${sid} introuvable`);

    const checks: Array<{ name: string; passed: boolean; message: string }> = [];

    // Check 1: No draft entries in period
    const allEntries = await adapter.getAll<any>('journalEntries');
    const draftEntries = allEntries.filter(
      (e: any) => e.date >= session.dateDebut && e.date <= session.dateFin && e.status === 'draft'
    ).length;
    checks.push({
      name: 'Ecritures validees',
      passed: draftEntries === 0,
      message: draftEntries === 0
        ? 'Toutes les ecritures sont validees'
        : `${draftEntries} ecriture(s) en brouillon`,
    });

    // Check 2: All entries are balanced (debit = credit)
    const unbalanced = allEntries.filter(
      (e: any) => e.date >= session.dateDebut && e.date <= session.dateFin &&
        Math.abs(e.totalDebit - e.totalCredit) > 0.01
    ).length;
    checks.push({
      name: 'Equilibre debit/credit',
      passed: unbalanced === 0,
      message: unbalanced === 0
        ? 'Toutes les ecritures sont equilibrees'
        : `${unbalanced} ecriture(s) desequilibree(s)`,
    });

    // Check 3: Provisions have been reviewed
    const allProvisions = await adapter.getAll<DBProvision>('provisions', { where: { sessionId: sid } });
    const pendingProvisions = allProvisions.filter(p => p.statut === 'PROPOSEE').length;
    checks.push({
      name: 'Provisions revues',
      passed: pendingProvisions === 0,
      message: pendingProvisions === 0
        ? 'Toutes les provisions ont ete traitees'
        : `${pendingProvisions} provision(s) en attente de validation`,
    });

    // Check 4: Session not already closed
    const notClosed = session.statut !== 'CLOTUREE';
    checks.push({
      name: 'Session active',
      passed: notClosed,
      message: notClosed
        ? 'La session est active'
        : 'La session est deja cloturee',
    });

    // Check 5: Bank reconciliations completed for the period
    try {
      const allSettings = await adapter.getAll<any>('settings');
      const reconSetting = allSettings.find((s: any) => s.key === 'bank_reconciliations');
      if (reconSetting) {
        const recons = JSON.parse(reconSetting.value || '[]');
        const openRecons = recons.filter(
          (r: any) => r.statut === 'ouvert' &&
            r.date >= session.dateDebut && r.date <= session.dateFin
        ).length;
        checks.push({
          name: 'Rapprochements bancaires',
          passed: openRecons === 0,
          message: openRecons === 0
            ? 'Tous les rapprochements bancaires sont clôturés'
            : `${openRecons} rapprochement(s) bancaire(s) non clôturé(s)`,
        });
      } else {
        checks.push({
          name: 'Rapprochements bancaires',
          passed: true,
          message: 'Aucun rapprochement bancaire configuré',
        });
      }
    } catch (error) {
      checks.push({
        name: 'Rapprochements bancaires',
        passed: true,
        message: 'Vérification rapprochements non disponible',
      });
    }

    // Check 6: No pending OCR invoices (warning, non-blocking)
    const ocrPending = allEntries.filter(
      (e: any) => e.date >= session.dateDebut && e.date <= session.dateFin &&
        e.status === 'ocr_pending'
    ).length;
    checks.push({
      name: 'Factures OCR en attente',
      passed: ocrPending === 0,
      message: ocrPending === 0
        ? 'Aucune facture OCR en attente'
        : `${ocrPending} facture(s) OCR en attente (avertissement)`,
    });

    // Check 7: Depreciation entries generated for the period (warning)
    const hasActiveAssets = (await adapter.getAll<any>('assets')).some(
      (a: any) => a.status === 'active' || a.status === 'actif'
    );
    const hasAmortEntries = allEntries.some(
      (e: any) => e.date >= session.dateDebut && e.date <= session.dateFin &&
        (e.status === 'validated' || e.status === 'posted') &&
        (e.journal === 'OD' || e.journal === 'AM') &&
        (e.label?.toLowerCase().includes('amort') || e.label?.toLowerCase().includes('dotation') ||
         e.reference?.startsWith('AMORT'))
    );
    checks.push({
      name: 'Dotations amortissements',
      passed: !hasActiveAssets || hasAmortEntries,
      message: (hasActiveAssets && !hasAmortEntries)
        ? 'Aucune écriture de dotation aux amortissements détectée — vérifier si nécessaire'
        : 'Dotations aux amortissements constatées',
    });

    // Blocking checks: first 5 are blocking, checks 6-7 are warnings
    const blockingChecks = checks.slice(0, 5);
    return {
      ready: blockingChecks.every(c => c.passed),
      checks,
    };
  }
}

export const closuresService = new ClosuresService();
