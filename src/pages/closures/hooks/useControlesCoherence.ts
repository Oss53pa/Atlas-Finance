/**
 * Hook: useControlesCoherence
 * Executes 17 coherence controls against real Dexie data.
 * Controls for missing tables (stocks, paie, rapprochement) → non_applicable.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import type { DBJournalEntry, DBJournalLine, DBAsset, DBFiscalYear } from '../../../lib/db';
import { money } from '../../../utils/money';
import { formatCurrency } from '../../../utils/formatters';
import type { ControleAnomalie } from '../../../services/cloture/remediationService';

export type { ControleAnomalie };

/** Nombre maximum d'anomalies détaillées conservées par contrôle (le total reste exact). */
const MAX_ANOMALIES = 200;

// ============================================================================
// TYPES
// ============================================================================

export type ControleStatut = 'conforme' | 'non_conforme' | 'attention' | 'non_applicable' | 'en_attente';
export type ControlePriorite = 'critique' | 'elevee' | 'moyenne' | 'faible';
export type ControleCategorie = 'balance' | 'flux' | 'coherence_temporelle' | 'conformite_syscohada' | 'validation_croisee';

export interface ControleResult {
  id: string;
  nom: string;
  description: string;
  categorie: ControleCategorie;
  priorite: ControlePriorite;
  statut: ControleStatut;
  blocking: boolean;
  valeurAttendue?: number;
  valeurReelle?: number;
  ecart?: number;
  ecartPourcentage?: number;
  tolerance?: number;
  dateExecution: string;
  tempsExecution: number;
  messageResultat: string;
  recommandations: string[];
  reglesMetier: string[];
  comptesConcernes?: string[];
  modulesConcernes: string[];
  automatique: boolean;
  utilisateurExecution: string;
  /** Éléments fautifs concrets (drill-down) — tronqué à MAX_ANOMALIES. */
  anomalies: ControleAnomalie[];
  /** Nombre TOTAL d'anomalies détectées (avant troncature d'affichage). */
  anomaliesTotal: number;
}

/** Monthly control IDs (9/17) */
export const MONTHLY_CONTROL_IDS = ['C1', 'C2', 'C3', 'C5', 'C6', 'C8', 'C10', 'C11', 'C13'];

/** Les 17 contrôles (clôture annuelle). */
export const ALL_CONTROL_IDS = [
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
  'C10', 'C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17',
];

/** Annual blocking control IDs — uniquement les contrôles réellement gatés.
 *  C15 (TVA) et C16 (régularisations) sont INFORMATIFS (pas de test dur) →
 *  retirés du blocage : un contrôle « bloquant » toujours conforme ne protège
 *  rien et donnerait une fausse assurance. */
export const ANNUAL_BLOCKING_IDS = ['C1', 'C2', 'C3', 'C4', 'C14'];

// ============================================================================
// CONTROL RUNNERS
// ============================================================================

function runControl(
  id: string,
  nom: string,
  description: string,
  categorie: ControleCategorie,
  priorite: ControlePriorite,
  runner: () => { statut: ControleStatut; valeurAttendue?: number; valeurReelle?: number; tolerance?: number; messageResultat: string; recommandations: string[]; comptesConcernes?: string[]; anomalies?: ControleAnomalie[] },
  reglesMetier: string[],
  modulesConcernes: string[],
): ControleResult {
  const start = performance.now();
  const result = runner();
  const elapsed = performance.now() - start;
  const ecart = result.valeurAttendue !== undefined && result.valeurReelle !== undefined
    ? result.valeurReelle - result.valeurAttendue
    : undefined;
  const ecartPourcentage = ecart !== undefined && result.valeurAttendue && result.valeurAttendue !== 0
    ? (ecart / result.valeurAttendue) * 100
    : undefined;

  const anomalies = result.anomalies ?? [];

  return {
    id,
    nom,
    description,
    categorie,
    priorite,
    statut: result.statut,
    anomalies: anomalies.slice(0, MAX_ANOMALIES),
    anomaliesTotal: anomalies.length,
    blocking: ANNUAL_BLOCKING_IDS.includes(id),
    valeurAttendue: result.valeurAttendue,
    valeurReelle: result.valeurReelle,
    ecart,
    ecartPourcentage,
    tolerance: result.tolerance,
    dateExecution: new Date().toISOString(),
    tempsExecution: Math.round(elapsed * 10) / 10,
    messageResultat: result.messageResultat,
    recommandations: result.recommandations,
    reglesMetier,
    comptesConcernes: result.comptesConcernes,
    modulesConcernes,
    automatique: true,
    utilisateurExecution: 'Système',
  };
}

// ============================================================================
// HOOK
// ============================================================================

export interface ControlesScope {
  /** Borne basse (incluse) — restreint les contrôles à une période de l'exercice. */
  start?: string;
  /** Borne haute (incluse). */
  end?: string;
}

/**
 * Exécute les contrôles de cohérence.
 * @param controlIds sous-ensemble de contrôles (défaut : les 17)
 * @param scope      périmètre de dates — par défaut l'exercice actif entier.
 *                   Utilisé pour la clôture d'une PÉRIODE (verrouillage mensuel).
 */
export function useControlesCoherence(controlIds?: string[], scope?: ControlesScope) {
  const { adapter } = useData();
  const scopeStart = scope?.start;
  const scopeEnd = scope?.end;
  const [controles, setControles] = useState<ControleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string>('');

  const executeControles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get active fiscal year
      const fiscalYears = await adapter.getAll<any>('fiscalYears');
      const activeFY = fiscalYears.find((fy: any) => fy.isActive) || fiscalYears[0];
      if (!activeFY) {
        setError('Aucun exercice fiscal trouvé');
        setLoading(false);
        return;
      }

      // 2. Load all entries for this FY — restreintes au périmètre demandé
      // (période de clôture mensuelle) quand un `scope` est fourni.
      const rangeStart = scopeStart && scopeStart > activeFY.startDate ? scopeStart : activeFY.startDate;
      const rangeEnd = scopeEnd && scopeEnd < activeFY.endDate ? scopeEnd : activeFY.endDate;
      const allEntries = await adapter.getAll<any>('journalEntries');
      const periodEntries = allEntries.filter((e: any) =>
        e.date >= rangeStart && e.date <= rangeEnd
      );
      // Les contrôles de VALEUR (balance, résultat, bilan, TVA…) ne portent que
      // sur les écritures validées/comptabilisées — sinon les brouillons
      // (souvent incomplets/déséquilibrés) faussent tous les chiffres. Les
      // brouillons sont traités séparément par le seul contrôle C8.
      const entries = periodEntries.filter((e: any) => e.status === 'validated' || e.status === 'posted');
      const draftEntries = periodEntries.filter((e: any) => e.status === 'draft');

      // 3. Flatten all lines (validées uniquement)
      const allLines: (DBJournalLine & { entryDate: string; entryId: string; entryStatus: string })[] = [];
      for (const e of entries) {
        for (const l of e.lines) {
          allLines.push({ ...l, entryDate: e.date, entryId: e.id, entryStatus: e.status });
        }
      }

      // 4. Load assets
      const assets = await adapter.getAll<any>('assets');
      const activeAssets = assets.filter((a: any) => a.status === 'active');

      // 5. Load accounts
      const accounts = await adapter.getAll<any>('accounts');

      // 6. Run all 17 controls
      const results: ControleResult[] = [];

      // Anomalies partagées — pièces dont débit ≠ crédit (C1 agrégé / C2 pièce à pièce).
      // `montant` porte l'écart SIGNÉ (> 0 = excès de débit) : c'est ce que la
      // correction automatique passe au compte d'attente.
      const unbalancedEntries = entries.filter((e: any) => Math.abs(e.totalDebit - e.totalCredit) > 1);
      const unbalancedAnomalies: ControleAnomalie[] = unbalancedEntries.map((e: any) => ({
        ref: e.entryNumber || e.id,
        libelle: e.label || 'Écriture sans libellé',
        montant: Number((e.totalDebit - e.totalCredit).toFixed(2)),
        date: e.date,
        entryId: e.id,
        info: `D ${formatCurrency(e.totalDebit)} / C ${formatCurrency(e.totalCredit)}`,
        corrigeable: true,
      }));

      const entryNumberById = new Map<string, string>(
        entries.map((e: any) => [e.id, e.entryNumber || e.id]),
      );

      // Soldes par compte (réutilisés par C3, C6, C11, C14, C17).
      const soldesParCompte = new Map<string, number>();
      for (const l of allLines) {
        soldesParCompte.set(
          l.accountCode,
          (soldesParCompte.get(l.accountCode) || 0) + (l.debit || 0) - (l.credit || 0),
        );
      }

      // --- C1: Équilibre Balance Générale ---
      results.push(runControl('C1', 'Équilibre Balance Générale',
        'Vérification que le total des débits égale le total des crédits',
        'balance', 'critique',
        () => {
          let totalD = money(0);
          let totalC = money(0);
          for (const e of entries) {
            totalD = totalD.add(e.totalDebit);
            totalC = totalC.add(e.totalCredit);
          }
          const d = totalD.toNumber();
          const c = totalC.toNumber();
          const ecart = Math.abs(d - c);
          const tolerance = 1000;
          return {
            statut: ecart <= tolerance ? 'conforme' : 'non_conforme',
            valeurAttendue: 0,
            valeurReelle: ecart,
            tolerance,
            messageResultat: ecart <= tolerance
              ? `Balance équilibrée (écart: ${formatCurrency(ecart)})`
              : `Balance déséquilibrée — Écart: ${formatCurrency(ecart)}`,
            recommandations: ecart > tolerance
              ? ['Vérifier les écritures déséquilibrées', 'Contrôler les saisies récentes']
              : [],
            comptesConcernes: ['TOUS'],
            anomalies: ecart > tolerance ? unbalancedAnomalies : [],
          };
        },
        ['Total Débits = Total Crédits', 'Écart toléré < 1 000 FCFA'],
        ['Comptabilité Générale'],
      ));

      // --- C2: Écritures déséquilibrées ---
      results.push(runControl('C2', 'Écritures Déséquilibrées',
        'Détection des écritures dont débit ≠ crédit',
        'balance', 'critique',
        () => {
          const unbalanced = unbalancedEntries;
          return {
            statut: unbalanced.length === 0 ? 'conforme' : 'non_conforme',
            valeurAttendue: 0,
            valeurReelle: unbalanced.length,
            tolerance: 0,
            messageResultat: unbalanced.length === 0
              ? 'Aucune écriture déséquilibrée'
              : `${unbalanced.length} écriture(s) déséquilibrée(s) détectée(s)`,
            recommandations: unbalanced.length > 0
              ? ['Corriger les écritures déséquilibrées avant clôture']
              : [],
            comptesConcernes: unbalanced.flatMap((e: any) => e.lines.map((l: any) => l.accountCode)).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i),
            anomalies: unbalancedAnomalies,
          };
        },
        ['Débit = Crédit pour chaque écriture'],
        ['Saisie Comptable'],
      ));

      // --- C3: Validation Créances-Encaissements (comptes 411) ---
      results.push(runControl('C3', 'Solde Clients (411)',
        'Cohérence des soldes clients — débiteurs normaux',
        'validation_croisee', 'elevee',
        () => {
          const clientLines = allLines.filter(l => l.accountCode.startsWith('411'));
          let totalDebit = money(0);
          let totalCredit = money(0);
          for (const l of clientLines) {
            totalDebit = totalDebit.add(l.debit);
            totalCredit = totalCredit.add(l.credit);
          }
          const solde = totalDebit.subtract(totalCredit).toNumber();
          // Un solde AGRÉGÉ débiteur peut masquer des comptes clients individuellement
          // créditeurs (avoirs, acomptes) : on descend au compte.
          const anomalies: ControleAnomalie[] = [];
          for (const [code, s] of soldesParCompte) {
            if (code.startsWith('411') && s < -1000) {
              anomalies.push({
                ref: code,
                libelle: 'Compte client créditeur',
                montant: s,
                accountCode: code,
                info: `Solde ${formatCurrency(s)} (attendu débiteur)`,
              });
            }
          }
          anomalies.sort((a, b) => (a.montant ?? 0) - (b.montant ?? 0));
          const crediteurAnormal = solde < -1000 || anomalies.length > 0;
          return {
            statut: crediteurAnormal ? 'attention' : 'conforme',
            valeurAttendue: 0,
            valeurReelle: solde,
            tolerance: 1000,
            messageResultat: crediteurAnormal
              ? `${anomalies.length} compte(s) client créditeur(s) — solde global ${formatCurrency(solde)}`
              : `Solde clients débiteur: ${formatCurrency(Math.max(0, solde))}`,
            recommandations: crediteurAnormal
              ? ['Vérifier les avoirs non lettrés', 'Contrôler le lettrage des comptes 411']
              : [],
            comptesConcernes: ['411'],
            anomalies,
          };
        },
        ['Solde client normalement débiteur', 'Lettrage obligatoire'],
        ['Cycle Clients', 'Trésorerie'],
      ));

      // --- C4: Contrôle Amortissements SYSCOHADA ---
      results.push(runControl('C4', 'Contrôle Amortissements SYSCOHADA',
        'Vérification conformité des calculs d\'amortissements',
        'conformite_syscohada', 'elevee',
        () => {
          if (activeAssets.length === 0) {
            return {
              statut: 'conforme',
              messageResultat: 'Aucune immobilisation active — contrôle non requis',
              recommandations: [],
            };
          }
          // Sum of amortissement entries (account prefix 28)
          const amortLines = allLines.filter(l => l.accountCode.startsWith('28'));
          let totalAmortCompta = money(0);
          for (const l of amortLines) {
            totalAmortCompta = totalAmortCompta.add(l.credit).subtract(money(l.debit));
          }
          // Réconciliation CUMUL vs CUMUL : le solde des 28x (GL) doit égaler la
          // somme des amortissements cumulés du registre. (L'ancienne version
          // comparait un cumul pluriannuel à UNE dotation annuelle → toujours en
          // écart sur un parc amorti depuis des années.)
          let theoreticalAmort = money(0);
          for (const asset of activeAssets) {
            theoreticalAmort = theoreticalAmort.add(money(Number(asset.cumulDepreciation) || 0));
          }
          const comptaVal = totalAmortCompta.toNumber();
          const theoVal = theoreticalAmort.toNumber();
          const ecart = Math.abs(comptaVal - theoVal);
          const tolerance = 10000;

          // Cause racine actionnable : les immobilisations amortissables SANS
          // aucune écriture AMORT-* sur l'exercice (référence posée par le
          // moteur d'amortissement : AMORT-<période>-<id actif>).
          const amortis = new Set<string>();
          for (const e of entries) {
            const ref: string = e.reference || '';
            if (!ref.startsWith('AMORT-')) continue;
            for (const asset of activeAssets) {
              if (ref.endsWith(`-${asset.id}`)) amortis.add(asset.id);
            }
          }
          const anomalies: ControleAnomalie[] = activeAssets
            .filter((a: any) => !amortis.has(a.id))
            .map((a: any) => ({
              ref: a.code || a.id,
              libelle: a.name || 'Immobilisation',
              montant: Number(a.acquisitionValue) || Number(a.purchaseValue) || 0,
              accountCode: a.accountCode,
              info: 'Aucune dotation comptabilisée sur l\'exercice',
              corrigeable: true,
            }));

          return {
            statut: ecart <= tolerance && anomalies.length === 0 ? 'conforme' : 'attention',
            valeurAttendue: theoVal,
            valeurReelle: comptaVal,
            tolerance,
            messageResultat: ecart <= tolerance && anomalies.length === 0
              ? 'Amortissements conformes aux règles SYSCOHADA'
              : anomalies.length > 0
                ? `${anomalies.length} immobilisation(s) sans dotation sur l'exercice — écart cumul ${formatCurrency(ecart)}`
                : `Écart d'amortissement de ${formatCurrency(ecart)}`,
            recommandations: ecart > tolerance || anomalies.length > 0
              ? ['Vérifier les dotations manquantes', 'Contrôler les durées de vie']
              : [],
            comptesConcernes: ['2', '28', '681'],
            anomalies,
          };
        },
        ['Méthodes autorisées: linéaire, dégressive', 'Durées conformes SYSCOHADA', 'Calculs mathématiquement corrects'],
        ['Immobilisations'],
      ));

      // --- C5: Cohérence Temporelle Écritures ---
      // ⚠️ L'ancienne version testait `entries` — DÉJÀ filtré sur l'exercice —
      // donc structurellement toujours conforme (contrôle décoratif). On teste
      // désormais TOUTES les écritures : rattachement à un exercice et date future.
      results.push(runControl('C5', 'Cohérence Temporelle Écritures',
        'Écritures rattachées à aucun exercice ouvert, ou datées dans le futur',
        'coherence_temporelle', 'moyenne',
        () => {
          const today = new Date().toISOString().slice(0, 10);
          const anomalies: ControleAnomalie[] = [];
          for (const e of allEntries as any[]) {
            if (e.status === 'draft') continue;
            const rattachee = fiscalYears.some((fy: any) => e.date >= fy.startDate && e.date <= fy.endDate);
            const futur = e.date > today;
            if (rattachee && !futur) continue;
            anomalies.push({
              ref: e.entryNumber || e.id,
              libelle: e.label || 'Écriture sans libellé',
              montant: Number(e.totalDebit) || 0,
              date: e.date,
              entryId: e.id,
              info: !rattachee ? 'Aucun exercice fiscal ne couvre cette date' : 'Date postérieure à aujourd\'hui',
            });
          }
          return {
            statut: anomalies.length === 0 ? 'conforme' : 'non_conforme',
            valeurAttendue: 0,
            valeurReelle: anomalies.length,
            messageResultat: anomalies.length === 0
              ? 'Toutes les écritures sont rattachées à un exercice et antérieures à ce jour'
              : `${anomalies.length} écriture(s) hors exercice ou datée(s) dans le futur`,
            recommandations: anomalies.length > 0
              ? ['Corriger la date ou créer l\'exercice manquant']
              : [],
            anomalies,
          };
        },
        ['Toute écriture est rattachée à un exercice', 'Aucune écriture antidatée au futur'],
        ['Saisie Comptable'],
      ));

      // --- C6: Soldes Fournisseurs (401) ---
      results.push(runControl('C6', 'Solde Fournisseurs (401)',
        'Cohérence des soldes fournisseurs — créditeurs normaux',
        'validation_croisee', 'elevee',
        () => {
          const fournLines = allLines.filter(l => l.accountCode.startsWith('401'));
          let totalDebit = money(0);
          let totalCredit = money(0);
          for (const l of fournLines) {
            totalDebit = totalDebit.add(l.debit);
            totalCredit = totalCredit.add(l.credit);
          }
          const solde = totalCredit.subtract(totalDebit).toNumber();
          // Descente au compte : un solde agrégé créditeur masque les
          // fournisseurs individuellement débiteurs (acomptes, doubles règlements).
          const anomalies: ControleAnomalie[] = [];
          for (const [code, s] of soldesParCompte) {
            if (code.startsWith('401') && s > 1000) {
              anomalies.push({
                ref: code,
                libelle: 'Compte fournisseur débiteur',
                montant: s,
                accountCode: code,
                info: `Solde ${formatCurrency(s)} (attendu créditeur)`,
              });
            }
          }
          anomalies.sort((a, b) => (b.montant ?? 0) - (a.montant ?? 0));
          const debiteurAnormal = solde < -1000 || anomalies.length > 0;
          return {
            statut: debiteurAnormal ? 'attention' : 'conforme',
            valeurAttendue: 0,
            valeurReelle: solde,
            tolerance: 1000,
            messageResultat: debiteurAnormal
              ? `${anomalies.length} compte(s) fournisseur débiteur(s) — solde global ${formatCurrency(solde)}`
              : `Solde fournisseurs créditeur: ${formatCurrency(Math.max(0, solde))}`,
            recommandations: debiteurAnormal
              ? ['Vérifier les acomptes non imputés', 'Contrôler le lettrage 401']
              : [],
            comptesConcernes: ['401'],
            anomalies,
          };
        },
        ['Solde fournisseur normalement créditeur'],
        ['Cycle Fournisseurs'],
      ));

      // --- C7: Stocks — Module non disponible ---
      results.push(runControl('C7', 'Cohérence Stocks - Comptabilité',
        'Validation entre valeur stock physique et comptable',
        'validation_croisee', 'elevee',
        () => ({
          statut: 'non_applicable' as ControleStatut,
          messageResultat: 'Module Stocks non disponible',
          recommandations: [],
        }),
        ['Inventaire physique = valeur comptable'],
        ['Gestion Stocks'],
      ));

      // --- C8: Écritures en brouillon ---
      results.push(runControl('C8', 'Écritures Non Validées',
        'Détection des écritures encore en brouillon',
        'balance', 'elevee',
        () => {
          const drafts = draftEntries;
          // `corrigeable` = brouillon ÉQUILIBRÉ : lui seul peut être validé
          // automatiquement. Un brouillon déséquilibré doit repasser par la saisie.
          const anomalies: ControleAnomalie[] = drafts.map((e: any) => {
            const equilibree = Math.abs((e.totalDebit || 0) - (e.totalCredit || 0)) <= 1;
            return {
              ref: e.entryNumber || e.id,
              libelle: e.label || 'Écriture sans libellé',
              montant: Number(e.totalDebit) || 0,
              date: e.date,
              entryId: e.id,
              info: equilibree ? 'Équilibrée — validable' : 'Déséquilibrée — correction de saisie requise',
              corrigeable: equilibree,
            };
          });
          const validables = anomalies.filter(a => a.corrigeable).length;
          return {
            statut: drafts.length === 0 ? 'conforme' : 'attention',
            valeurAttendue: 0,
            valeurReelle: drafts.length,
            messageResultat: drafts.length === 0
              ? 'Aucune écriture en brouillon'
              : `${drafts.length} écriture(s) en brouillon (${validables} validable(s) automatiquement)`,
            recommandations: drafts.length > 0
              ? ['Valider ou supprimer les écritures en brouillon avant clôture']
              : [],
            anomalies,
          };
        },
        ['Toutes les écritures doivent être validées avant clôture'],
        ['Saisie Comptable'],
      ));

      // --- C9: Paie — Module non disponible ---
      results.push(runControl('C9', 'Cohérence Charges de Personnel',
        'Validation des charges de personnel et cotisations',
        'validation_croisee', 'moyenne',
        () => ({
          statut: 'non_applicable' as ControleStatut,
          messageResultat: 'Module Paie non disponible',
          recommandations: [],
        }),
        ['Charges salariales = bulletins de paie'],
        ['Paie', 'Comptabilité'],
      ));

      // --- C10: Comptes de résultat (classe 6+7) ---
      results.push(runControl('C10', 'Résultat de l\'Exercice',
        'Calcul et vérification du résultat (produits - charges)',
        'balance', 'critique',
        () => {
          let totalProduits = money(0);
          let totalCharges = money(0);
          for (const l of allLines) {
            const cls = l.accountCode.charAt(0);
            if (cls === '7') {
              totalProduits = totalProduits.add(l.credit).subtract(money(l.debit));
            } else if (cls === '6') {
              totalCharges = totalCharges.add(l.debit).subtract(money(l.credit));
            }
          }
          const resultat = totalProduits.subtract(totalCharges).toNumber();
          return {
            statut: 'conforme',
            valeurAttendue: undefined,
            valeurReelle: resultat,
            messageResultat: resultat >= 0
              ? `Bénéfice: ${formatCurrency(resultat)}`
              : `Perte: ${formatCurrency(Math.abs(resultat))}`,
            recommandations: [],
            comptesConcernes: ['6', '7'],
          };
        },
        ['Résultat = Σ Produits (cl.7) − Σ Charges (cl.6)'],
        ['Comptabilité Générale'],
      ));

      // --- C11: Comptes de trésorerie (classe 5) ---
      results.push(runControl('C11', 'Solde Trésorerie (classe 5)',
        'Vérification des soldes de trésorerie',
        'balance', 'elevee',
        () => {
          const tresoLines = allLines.filter(l => l.accountCode.startsWith('5'));
          let totalDebit = money(0);
          let totalCredit = money(0);
          for (const l of tresoLines) {
            totalDebit = totalDebit.add(l.debit);
            totalCredit = totalCredit.add(l.credit);
          }
          const solde = totalDebit.subtract(totalCredit).toNumber();
          // Détail par compte : un solde global positif masque les comptes
          // individuellement créditeurs (découverts). 58 = virements internes,
          // 59 = dépréciations → exclus (créditeurs par nature).
          const anomalies: ControleAnomalie[] = [];
          for (const [code, s] of soldesParCompte) {
            if (!code.startsWith('5')) continue;
            if (code.startsWith('58') || code.startsWith('59')) continue;
            if (s < -1000) {
              anomalies.push({
                ref: code,
                libelle: 'Compte de trésorerie créditeur',
                montant: s,
                accountCode: code,
                info: `Solde ${formatCurrency(s)} — découvert à justifier`,
              });
            }
          }
          anomalies.sort((a, b) => (a.montant ?? 0) - (b.montant ?? 0));
          return {
            statut: solde >= 0 && anomalies.length === 0 ? 'conforme' : 'attention',
            valeurReelle: solde,
            messageResultat: anomalies.length > 0
              ? `${anomalies.length} compte(s) de trésorerie créditeur(s) — position globale ${formatCurrency(solde)}`
              : solde >= 0
                ? `Trésorerie positive: ${formatCurrency(solde)}`
                : `Trésorerie négative: ${formatCurrency(solde)}`,
            recommandations: solde < 0 || anomalies.length > 0
              ? ['Vérifier les découverts bancaires', 'Contrôler la position de trésorerie']
              : [],
            comptesConcernes: ['5'],
            anomalies,
          };
        },
        ['Solde trésorerie = Σ Débits − Σ Crédits (classe 5)'],
        ['Trésorerie'],
      ));

      // --- C12: Rapprochement bancaire — Module non disponible ---
      results.push(runControl('C12', 'Rapprochement Bancaire',
        'Cohérence entre comptabilité et relevés bancaires',
        'validation_croisee', 'elevee',
        () => ({
          statut: 'non_applicable' as ControleStatut,
          messageResultat: 'Module Rapprochement Bancaire non disponible',
          recommandations: [],
        }),
        ['Solde comptable = Solde bancaire ajusté'],
        ['Trésorerie', 'Rapprochement'],
      ));

      // --- C13: Lettrage comptes tiers ---
      results.push(runControl('C13', 'Lettrage Comptes Tiers',
        'Vérification du lettrage des comptes clients et fournisseurs',
        'validation_croisee', 'moyenne',
        () => {
          const tiersLines = allLines.filter(l =>
            l.accountCode.startsWith('411') || l.accountCode.startsWith('401')
          );
          const nonLettrees = tiersLines.filter(l => !l.lettrageCode);
          const total = tiersLines.length;
          const tauxLettrage = total > 0 ? ((total - nonLettrees.length) / total) * 100 : 100;
          const anomalies: ControleAnomalie[] = nonLettrees
            .map(l => ({
              ref: entryNumberById.get(l.entryId) || l.entryId,
              libelle: l.label || l.accountName || 'Ligne non lettrée',
              montant: (l.debit || 0) - (l.credit || 0),
              date: l.entryDate,
              entryId: l.entryId,
              lineId: l.id,
              accountCode: l.accountCode,
              thirdPartyCode: l.thirdPartyCode,
              info: l.thirdPartyCode ? `Tiers ${l.thirdPartyCode}` : 'Sans tiers renseigné',
              corrigeable: true,
            }))
            .sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant));
          return {
            statut: tauxLettrage >= 80 ? 'conforme' : tauxLettrage >= 50 ? 'attention' : 'non_conforme',
            valeurAttendue: 100,
            valeurReelle: Math.round(tauxLettrage * 10) / 10,
            messageResultat: `Taux de lettrage: ${Math.round(tauxLettrage)}% (${nonLettrees.length} lignes non lettrées)`,
            recommandations: tauxLettrage < 80
              ? ['Compléter le lettrage des comptes tiers', 'Identifier les factures en suspens']
              : [],
            comptesConcernes: ['411', '401'],
            anomalies,
          };
        },
        ['Lettrage des comptes de tiers via lettrageCode'],
        ['Lettrage'],
      ));

      // --- C14: Comptes de bilan équilibrés (Actif = Passif) ---
      results.push(runControl('C14', 'Équilibre Bilan (Actif = Passif)',
        'Vérification Actif = Passif sur les comptes de bilan',
        'conformite_syscohada', 'critique',
        () => {
          // Agréger par COMPTE (un compte se solde globalement) puis placer
          // chaque compte cl.1-5 par SIGNE de son solde (règle bilan projet :
          // jamais par ligne isolée, qui gonfle actif ET passif).
          const soldesC14 = new Map<string, number>();
          for (const l of allLines) {
            soldesC14.set(l.accountCode, (soldesC14.get(l.accountCode) || 0) + (l.debit || 0) - (l.credit || 0));
          }
          let actif = money(0);
          let passif = money(0);
          let resultat = money(0); // résultat = Σ(crédit − débit) sur 6/7/8 (incl. IS 89)
          for (const [code, solde] of soldesC14) {
            const cls = code.charAt(0);
            if (['1', '2', '3', '4', '5'].includes(cls)) {
              if (solde >= 0) actif = actif.add(money(solde));
              else passif = passif.add(money(-solde));
            } else if (['6', '7', '8'].includes(cls)) {
              resultat = resultat.subtract(money(solde));
            }
          }
          // Résultat ajouté au passif. Avant clôture : porté par 6/7/8 (131=0) ;
          // après clôture : porté par 131 (classe 1, déjà comptée) et 6/7/8=0 →
          // pas de double comptage dans les deux cas.
          passif = passif.add(resultat);

          const actifVal = actif.toNumber();
          const passifVal = passif.toNumber();
          const ecart = Math.abs(actifVal - passifVal);
          // Cause racine la plus fréquente d'un bilan déséquilibré : un compte
          // dont la classe n'existe pas (code vide, alphanumérique, classe 0/9
          // non affectée) — il n'est ni au bilan ni au résultat.
          const anomalies: ControleAnomalie[] = [];
          if (ecart >= 1000) {
            for (const [code, solde] of soldesC14) {
              const cls = code.charAt(0);
              if (!['1', '2', '3', '4', '5', '6', '7', '8'].includes(cls)) {
                anomalies.push({
                  ref: code || '(code vide)',
                  libelle: 'Compte hors plan SYSCOHADA — ni bilan ni gestion',
                  montant: solde,
                  accountCode: code,
                  info: `Classe « ${cls || '—'} » non affectée`,
                });
              }
            }
          }
          return {
            statut: ecart < 1000 ? 'conforme' : 'non_conforme',
            anomalies,
            valeurAttendue: actifVal,
            valeurReelle: passifVal,
            tolerance: 1000,
            messageResultat: ecart < 1000
              ? `Bilan équilibré: Actif = Passif = ${formatCurrency(actifVal)}`
              : `Déséquilibre bilan: Actif ${formatCurrency(actifVal)} ≠ Passif ${formatCurrency(passifVal)}`,
            recommandations: ecart >= 1000
              ? ['Vérifier les comptes de classe 1 à 5', 'Contrôler le résultat de l\'exercice']
              : [],
            comptesConcernes: ['1', '2', '3', '4', '5'],
          };
        },
        ['Actif = Passif + Résultat', 'Classes 1-5 SYSCOHADA'],
        ['Comptabilité Générale'],
      ));

      // --- C15: TVA collectée vs déclarée ---
      results.push(runControl('C15', 'Cohérence TVA',
        'Vérification de la cohérence des comptes de TVA',
        'conformite_syscohada', 'elevee',
        () => {
          const tvaCollectee = allLines.filter(l => l.accountCode.startsWith('4431') || l.accountCode.startsWith('4432') || l.accountCode.startsWith('4434'));
          const tvaDeductible = allLines.filter(l => l.accountCode.startsWith('4451') || l.accountCode.startsWith('4452') || l.accountCode.startsWith('4453') || l.accountCode.startsWith('4454'));
          let collectee = money(0);
          let deductible = money(0);
          for (const l of tvaCollectee) collectee = collectee.add(l.credit).subtract(money(l.debit));
          for (const l of tvaDeductible) deductible = deductible.add(l.debit).subtract(money(l.credit));
          const tvaADecaisser = collectee.subtract(deductible).toNumber();
          return {
            statut: 'conforme',
            valeurReelle: tvaADecaisser,
            messageResultat: `TVA nette à décaisser: ${formatCurrency(tvaADecaisser)}`,
            recommandations: [],
            comptesConcernes: ['443', '445'],
          };
        },
        ['TVA collectée (443) − TVA déductible (445)'],
        ['Fiscalité'],
      ));

      // --- C16: Comptes de régularisation ---
      results.push(runControl('C16', 'Comptes de Régularisation',
        'Vérification des charges/produits constatés d\'avance',
        'conformite_syscohada', 'moyenne',
        () => {
          const regLines = allLines.filter(l =>
            l.accountCode.startsWith('476') || l.accountCode.startsWith('477') ||
            l.accountCode.startsWith('486') || l.accountCode.startsWith('487')
          );
          let soldeRegul = money(0);
          for (const l of regLines) {
            soldeRegul = soldeRegul.add(l.debit).subtract(money(l.credit));
          }
          return {
            statut: regLines.length > 0 ? 'conforme' : 'attention',
            valeurReelle: soldeRegul.toNumber(),
            messageResultat: regLines.length > 0
              ? `${regLines.length} ligne(s) de régularisation, solde net: ${formatCurrency(soldeRegul.toNumber())}`
              : 'Aucune écriture de régularisation — vérifier si nécessaire',
            recommandations: regLines.length === 0
              ? ['Vérifier si des charges/produits constatés d\'avance sont nécessaires']
              : [],
            comptesConcernes: ['476', '477', '486', '487'],
          };
        },
        ['Régularisations SYSCOHADA: CCA, PCA, FNP, FAE'],
        ['Régularisations'],
      ));

      // --- C17: Comptes à solde anormal ---
      results.push(runControl('C17', 'Comptes à Solde Anormal',
        'Détection des comptes avec solde inversé par rapport à leur nature normale',
        'balance', 'moyenne',
        () => {
          const balances = soldesParCompte;
          const anormaux: string[] = [];
          const anomalies: ControleAnomalie[] = [];
          for (const [code, solde] of balances) {
            const cls = code.charAt(0);
            // Classe 2,3,5 = normalement débiteur; Classe 1,4 = dépend du sous-compte.
            // Les amortissements/dépréciations (28x, 29x, 39x, 59x) sont créditeurs
            // par nature : les signaler serait un faux positif systématique.
            const contreCompte = /^(28|29|39|59)/.test(code);
            const debiteurAttendu =
              (['2', '3'].includes(cls) && !contreCompte) || (cls === '5' && code.startsWith('51'));
            if (debiteurAttendu && solde < -100) {
              anormaux.push(code);
              anomalies.push({
                ref: code,
                libelle: cls === '5' ? 'Compte bancaire créditeur' : 'Compte d\'actif à solde créditeur',
                montant: solde,
                accountCode: code,
                info: `Solde ${formatCurrency(solde)} (attendu débiteur)`,
              });
            }
          }
          anomalies.sort((a, b) => (a.montant ?? 0) - (b.montant ?? 0));
          return {
            anomalies,
            statut: anormaux.length === 0 ? 'conforme' : 'attention',
            valeurAttendue: 0,
            valeurReelle: anormaux.length,
            messageResultat: anormaux.length === 0
              ? 'Aucun compte à solde anormal détecté'
              : `${anormaux.length} compte(s) à solde anormal: ${anormaux.slice(0, 5).join(', ')}`,
            recommandations: anormaux.length > 0
              ? ['Analyser les comptes à solde inversé', 'Vérifier les erreurs d\'imputation']
              : [],
            comptesConcernes: anormaux.slice(0, 10),
          };
        },
        ['Immobilisations (cl.2) = débiteur', 'Stocks (cl.3) = débiteur', 'Banque (512) ≥ 0'],
        ['Comptabilité Générale'],
      ));

      const filtered = controlIds ? results.filter(r => controlIds.includes(r.id)) : results;
      setControles(filtered);
      setLastRun(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'exécution des contrôles');
    } finally {
      setLoading(false);
    }
  }, [controlIds, scopeStart, scopeEnd]);

  useEffect(() => {
    executeControles();
  }, [executeControles]);

  // Blocage RÉEL : un contrôle marqué `blocking` en échec (non conforme)
  // interdit la clôture. Le flag `blocking` n'était jusqu'ici jamais exploité.
  const blockingFailures = controles.filter(c => c.blocking && c.statut === 'non_conforme');

  return {
    controles,
    loading,
    error,
    lastRun,
    refresh: executeControles,
    blockingFailures,
    canClose: blockingFailures.length === 0,
  };
}
