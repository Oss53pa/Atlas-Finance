/**
 * Hook: useControlesCoherence
 * Executes 17 coherence controls against real Dexie data.
 * Controls for missing tables (stocks, paie, rapprochement) → non_applicable.
 */
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/db';
import type { DBJournalEntry, DBJournalLine, DBAsset, DBFiscalYear } from '../../../lib/db';
import { money } from '../../../utils/money';
import { formatCurrency } from '../../../utils/formatters';

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
}

// ============================================================================
// CONTROL RUNNERS
// ============================================================================

function runControl(
  id: string,
  nom: string,
  description: string,
  categorie: ControleCategorie,
  priorite: ControlePriorite,
  runner: () => { statut: ControleStatut; valeurAttendue?: number; valeurReelle?: number; tolerance?: number; messageResultat: string; recommandations: string[]; comptesConcernes?: string[] },
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

  return {
    id,
    nom,
    description,
    categorie,
    priorite,
    statut: result.statut,
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

export function useControlesCoherence() {
  const [controles, setControles] = useState<ControleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string>('');

  const executeControles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get active fiscal year
      const fiscalYears = await db.fiscalYears.toArray();
      const activeFY = fiscalYears.find(fy => fy.isActive) || fiscalYears[0];
      if (!activeFY) {
        setError('Aucun exercice fiscal trouvé');
        setLoading(false);
        return;
      }

      // 2. Load all entries for this FY
      const entries = await db.journalEntries
        .where('date')
        .between(activeFY.startDate, activeFY.endDate, true, true)
        .toArray();

      // 3. Flatten all lines
      const allLines: (DBJournalLine & { entryDate: string; entryId: string; entryStatus: string })[] = [];
      for (const e of entries) {
        for (const l of e.lines) {
          allLines.push({ ...l, entryDate: e.date, entryId: e.id, entryStatus: e.status });
        }
      }

      // 4. Load assets
      const assets = await db.assets.toArray();
      const activeAssets = assets.filter(a => a.status === 'active');

      // 5. Load accounts
      const accounts = await db.accounts.toArray();

      // 6. Run all 17 controls
      const results: ControleResult[] = [];

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
          const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1);
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
            comptesConcernes: unbalanced.flatMap(e => e.lines.map(l => l.accountCode)).filter((v, i, a) => a.indexOf(v) === i),
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
          // Clients should normally have debit balance
          const crediteurAnormal = solde < -1000;
          return {
            statut: crediteurAnormal ? 'attention' : 'conforme',
            valeurAttendue: 0,
            valeurReelle: solde,
            tolerance: 1000,
            messageResultat: crediteurAnormal
              ? `Solde clients créditeur anormal: ${formatCurrency(solde)}`
              : `Solde clients débiteur: ${formatCurrency(Math.max(0, solde))}`,
            recommandations: crediteurAnormal
              ? ['Vérifier les avoirs non lettrés', 'Contrôler le lettrage des comptes 411']
              : [],
            comptesConcernes: ['411'],
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
          // Theoretical amortissement from assets
          let theoreticalAmort = money(0);
          for (const asset of activeAssets) {
            const annualAmort = money(asset.acquisitionValue - asset.residualValue)
              .divide(asset.usefulLifeYears);
            theoreticalAmort = theoreticalAmort.add(annualAmort);
          }
          const comptaVal = totalAmortCompta.toNumber();
          const theoVal = theoreticalAmort.toNumber();
          const ecart = Math.abs(comptaVal - theoVal);
          const tolerance = 10000;

          return {
            statut: ecart <= tolerance ? 'conforme' : 'attention',
            valeurAttendue: theoVal,
            valeurReelle: comptaVal,
            tolerance,
            messageResultat: ecart <= tolerance
              ? 'Amortissements conformes aux règles SYSCOHADA'
              : `Écart d'amortissement de ${formatCurrency(ecart)}`,
            recommandations: ecart > tolerance
              ? ['Vérifier les dotations manquantes', 'Contrôler les durées de vie']
              : [],
            comptesConcernes: ['2', '28', '681'],
          };
        },
        ['Méthodes autorisées: linéaire, dégressive', 'Durées conformes SYSCOHADA', 'Calculs mathématiquement corrects'],
        ['Immobilisations'],
      ));

      // --- C5: Cohérence Temporelle Écritures ---
      results.push(runControl('C5', 'Cohérence Temporelle Écritures',
        'Vérification que les dates d\'écriture sont dans l\'exercice',
        'coherence_temporelle', 'moyenne',
        () => {
          const outOfRange = entries.filter(e =>
            e.date < activeFY.startDate || e.date > activeFY.endDate
          );
          return {
            statut: outOfRange.length === 0 ? 'conforme' : 'non_conforme',
            valeurAttendue: 0,
            valeurReelle: outOfRange.length,
            messageResultat: outOfRange.length === 0
              ? 'Toutes les écritures dans la période de l\'exercice'
              : `${outOfRange.length} écriture(s) hors exercice`,
            recommandations: outOfRange.length > 0
              ? ['Corriger les dates des écritures hors exercice']
              : [],
          };
        },
        ['Date écriture dans l\'exercice', 'Exercice comptable cohérent'],
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
          const debiteurAnormal = solde < -1000;
          return {
            statut: debiteurAnormal ? 'attention' : 'conforme',
            valeurAttendue: 0,
            valeurReelle: solde,
            tolerance: 1000,
            messageResultat: debiteurAnormal
              ? `Solde fournisseurs débiteur anormal: ${formatCurrency(Math.abs(solde))}`
              : `Solde fournisseurs créditeur: ${formatCurrency(Math.max(0, solde))}`,
            recommandations: debiteurAnormal
              ? ['Vérifier les acomptes non imputés', 'Contrôler le lettrage 401']
              : [],
            comptesConcernes: ['401'],
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
          const drafts = entries.filter(e => e.status === 'draft');
          return {
            statut: drafts.length === 0 ? 'conforme' : 'attention',
            valeurAttendue: 0,
            valeurReelle: drafts.length,
            messageResultat: drafts.length === 0
              ? 'Aucune écriture en brouillon'
              : `${drafts.length} écriture(s) en brouillon à valider`,
            recommandations: drafts.length > 0
              ? ['Valider ou supprimer les écritures en brouillon avant clôture']
              : [],
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
          return {
            statut: solde >= 0 ? 'conforme' : 'attention',
            valeurReelle: solde,
            messageResultat: solde >= 0
              ? `Trésorerie positive: ${formatCurrency(solde)}`
              : `Trésorerie négative: ${formatCurrency(solde)}`,
            recommandations: solde < 0
              ? ['Vérifier les découverts bancaires', 'Contrôler la position de trésorerie']
              : [],
            comptesConcernes: ['5'],
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
          return {
            statut: tauxLettrage >= 80 ? 'conforme' : tauxLettrage >= 50 ? 'attention' : 'non_conforme',
            valeurAttendue: 100,
            valeurReelle: Math.round(tauxLettrage * 10) / 10,
            messageResultat: `Taux de lettrage: ${Math.round(tauxLettrage)}% (${nonLettrees.length} lignes non lettrées)`,
            recommandations: tauxLettrage < 80
              ? ['Compléter le lettrage des comptes tiers', 'Identifier les factures en suspens']
              : [],
            comptesConcernes: ['411', '401'],
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
          let actif = money(0);
          let passif = money(0);
          for (const l of allLines) {
            const cls = l.accountCode.charAt(0);
            if (['2', '3', '4', '5'].includes(cls)) {
              // Compute per normal balance
              const net = money(l.debit).subtract(money(l.credit));
              if (net.isPositive()) actif = actif.add(net);
              else passif = passif.add(net.abs());
            } else if (cls === '1') {
              const net = money(l.credit).subtract(money(l.debit));
              passif = passif.add(net);
            }
          }
          // Must also account for result (classe 6+7 → passif)
          let resultat = money(0);
          for (const l of allLines) {
            const cls = l.accountCode.charAt(0);
            if (cls === '7') resultat = resultat.add(l.credit).subtract(money(l.debit));
            else if (cls === '6') resultat = resultat.subtract(money(l.debit)).add(l.credit);
          }
          passif = passif.add(resultat);

          const actifVal = actif.toNumber();
          const passifVal = passif.toNumber();
          const ecart = Math.abs(actifVal - passifVal);
          return {
            statut: ecart < 1000 ? 'conforme' : 'non_conforme',
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
          const balances = new Map<string, number>();
          for (const l of allLines) {
            const prev = balances.get(l.accountCode) || 0;
            balances.set(l.accountCode, prev + l.debit - l.credit);
          }
          const anormaux: string[] = [];
          for (const [code, solde] of balances) {
            const cls = code.charAt(0);
            // Classe 2,3,5 = normalement débiteur; Classe 1,4 = dépend du sous-compte
            if (['2', '3'].includes(cls) && solde < -100) anormaux.push(code);
            if (cls === '5' && code.startsWith('51') && solde < -100) anormaux.push(code);
          }
          return {
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

      setControles(results);
      setLastRun(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'exécution des contrôles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    executeControles();
  }, [executeControles]);

  return {
    controles,
    loading,
    error,
    lastRun,
    refresh: executeControles,
  };
}
