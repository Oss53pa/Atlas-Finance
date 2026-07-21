/**
 * remediationService — Moteur de correction des anomalies de clôture.
 *
 * Chaque contrôle de cohérence (C1…C17) produit des ANOMALIES typées (une ligne
 * par écriture / compte fautif). Ce service traduit ces anomalies en
 * PROPOSITIONS DE CORRECTION, dont une partie est APPLICABLE AUTOMATIQUEMENT
 * (écriture réelle en base, jamais un faux succès).
 *
 * Modes :
 *  - `auto`      : correction sûre et idempotente (validation de brouillons
 *                  équilibrés, lettrage automatique, dotations manquantes).
 *  - `assistee`  : génère une écriture comptable → confirmation explicite.
 *  - `manuelle`  : aucune correction automatisable, on renvoie l'utilisateur
 *                  vers l'écran capable de traiter le cas (avec le contexte).
 */
import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry } from '../../lib/db';
import { money } from '../../utils/money';
import { autoLettrage, applyLettrage } from '../lettrageService';
import { posterAmortissementsAnnuels } from '../postingService';
import { logAudit } from '../../lib/db';

// ============================================================================
// TYPES
// ============================================================================

/** Élément fautif concret remonté par un contrôle (drill-down). */
export interface ControleAnomalie {
  /** Référence fonctionnelle affichée (n° de pièce, code compte…) */
  ref: string;
  libelle: string;
  montant?: number;
  date?: string;
  entryId?: string;
  lineId?: string;
  accountCode?: string;
  thirdPartyCode?: string;
  /** Détails libres affichés en colonne « Info » */
  info?: string;
  /** L'anomalie est-elle éligible à la correction automatique du contrôle ? */
  corrigeable?: boolean;
}

export type RemediationMode = 'auto' | 'assistee' | 'manuelle';

export type RemediationAction =
  | 'VALIDER_BROUILLONS'
  | 'AUTO_LETTRAGE'
  | 'POSTER_DOTATIONS'
  | 'EQUILIBRER_SUR_ATTENTE'
  | 'NAVIGUER';

/** Aperçu d'une ligne d'écriture qui serait générée par la correction. */
export interface PreviewLine {
  accountCode: string;
  libelle: string;
  debit: number;
  credit: number;
}

export interface RemediationProposal {
  id: string;
  controleId: string;
  action: RemediationAction;
  titre: string;
  description: string;
  /** Effet concret annoncé — doit décrire ce qui sera RÉELLEMENT écrit. */
  impact: string;
  mode: RemediationMode;
  /** Nombre d'éléments traités par la correction. */
  cibles: number;
  /** Aperçu de l'écriture générée (mode `assistee`). */
  preview?: PreviewLine[];
  /** Cible de navigation (mode `manuelle`). */
  route?: string;
}

export interface RemediationOutcome {
  ok: boolean;
  message: string;
  /** Nombre d'éléments effectivement corrigés en base. */
  applied: number;
  errors: string[];
}

/** Contrat minimal attendu d'un résultat de contrôle (évite l'import circulaire). */
export interface ControleLike {
  id: string;
  nom: string;
  statut: string;
  anomalies?: ControleAnomalie[];
  anomaliesTotal?: number;
  valeurReelle?: number;
  ecart?: number;
}

export interface RemediationContext {
  fiscalYearId?: string;
  fiscalYearStart?: string;
  fiscalYearEnd?: string;
  userId?: string;
}

/** Compte d'attente SYSCOHADA utilisé pour absorber un déséquilibre de pièce. */
export const COMPTE_ATTENTE = '4718';

// ============================================================================
// CONSTRUCTION DES PROPOSITIONS
// ============================================================================

function nav(
  controleId: string,
  titre: string,
  description: string,
  route: string,
  cibles: number,
  impact = 'Aucune écriture générée — traitement manuel dans l\'écran cible.',
): RemediationProposal {
  return {
    id: `${controleId}.NAVIGUER`,
    controleId,
    action: 'NAVIGUER',
    titre,
    description,
    impact,
    mode: 'manuelle',
    cibles,
    route,
  };
}

/**
 * Traduit un contrôle en échec en propositions de correction.
 * Fonction PURE : ne lit ni n'écrit la base (testable unitairement).
 */
export function buildRemediations(controle: ControleLike): RemediationProposal[] {
  const anomalies = controle.anomalies ?? [];
  const total = controle.anomaliesTotal ?? anomalies.length;
  if (controle.statut === 'conforme' || controle.statut === 'non_applicable') return [];

  const props: RemediationProposal[] = [];

  switch (controle.id) {
    // --- Déséquilibres de pièce (C1 agrégé, C2 pièce à pièce) -----------------
    case 'C1':
    case 'C2': {
      const corrigeables = anomalies.filter(a => a.corrigeable && a.entryId && a.montant);
      if (corrigeables.length > 0) {
        const first = corrigeables[0];
        const ecart = first.montant ?? 0;
        props.push({
          id: `${controle.id}.EQUILIBRER_SUR_ATTENTE`,
          controleId: controle.id,
          action: 'EQUILIBRER_SUR_ATTENTE',
          titre: `Équilibrer ${corrigeables.length} pièce(s) sur le compte d'attente ${COMPTE_ATTENTE}`,
          description:
            'Ajoute à chaque pièce déséquilibrée la ligne manquante sur le compte d\'attente ' +
            `${COMPTE_ATTENTE}. La pièce redevient équilibrée (D = C) et le solde du compte ` +
            'd\'attente matérialise le montant à ré-imputer.',
          impact:
            `${corrigeables.length} ligne(s) créée(s) sur ${COMPTE_ATTENTE} — ` +
            'le compte d\'attente devra être soldé avant la clôture définitive.',
          mode: 'assistee',
          cibles: corrigeables.length,
          preview: [
            ecart > 0
              ? { accountCode: COMPTE_ATTENTE, libelle: `Équilibrage pièce ${first.ref}`, debit: 0, credit: Math.abs(ecart) }
              : { accountCode: COMPTE_ATTENTE, libelle: `Équilibrage pièce ${first.ref}`, debit: Math.abs(ecart), credit: 0 },
          ],
        });
      }
      props.push(nav(controle.id, 'Ouvrir les écritures concernées',
        'Analyser et corriger la saisie à la source (recommandé si l\'écart provient d\'une ligne oubliée).',
        '/accounting/entries', total));
      break;
    }

    // --- Dotations aux amortissements manquantes ------------------------------
    case 'C4': {
      if (total > 0) props.push({
        id: 'C4.POSTER_DOTATIONS',
        controleId: 'C4',
        action: 'POSTER_DOTATIONS',
        titre: `Comptabiliser les dotations manquantes (${total} immobilisation(s))`,
        description:
          'Exécute le moteur d\'amortissement sur tous les mois de l\'exercice. Les dotations ' +
          'déjà comptabilisées sont ignorées (idempotent, référence AMORT-<période>-<actif>).',
        impact:
          'Génère les écritures 681x / 28x manquantes (statut validé) et synchronise le cumul ' +
          'd\'amortissement de chaque fiche immobilisation.',
        mode: 'auto',
        cibles: total,
      });
      props.push(nav('C4', 'Ouvrir le registre des immobilisations',
        'Vérifier durées, méthodes et dates de mise en service avant de comptabiliser.',
        '/assets/depreciation', total));
      break;
    }

    // --- Écritures hors exercice / datées dans le futur ------------------------
    case 'C5': {
      props.push(nav('C5', 'Corriger la date des écritures concernées',
        'Une date hors exercice ne peut pas être corrigée automatiquement : elle relève d\'un ' +
        'choix de rattachement (cut-off) qui doit être tracé.',
        '/accounting/entries', total));
      break;
    }

    // --- Brouillons non validés ------------------------------------------------
    case 'C8': {
      const corrigeables = anomalies.filter(a => a.corrigeable && a.entryId);
      if (corrigeables.length > 0) {
        props.push({
          id: 'C8.VALIDER_BROUILLONS',
          controleId: 'C8',
          action: 'VALIDER_BROUILLONS',
          titre: `Valider ${corrigeables.length} brouillon(s) équilibré(s)`,
          description:
            'Passe au statut « validé » les seuls brouillons dont le débit égale le crédit. ' +
            'Les brouillons déséquilibrés sont laissés en l\'état (ils doivent être corrigés à la saisie).',
          impact:
            `${corrigeables.length} écriture(s) deviennent comptabilisées et entrent dans la balance, ` +
            'les états financiers et le résultat.',
          mode: 'auto',
          cibles: corrigeables.length,
        });
      }
      const bloques = total - corrigeables.length;
      if (bloques > 0) {
        props.push(nav('C8', `Corriger ${bloques} brouillon(s) déséquilibré(s)`,
          'Ces brouillons ne peuvent pas être validés tant que débit ≠ crédit.',
          '/accounting/entries', bloques));
      }
      break;
    }

    // --- Lettrage des comptes de tiers -----------------------------------------
    case 'C13': {
      if (total > 0) props.push({
        id: 'C13.AUTO_LETTRAGE',
        controleId: 'C13',
        action: 'AUTO_LETTRAGE',
        titre: 'Lancer le lettrage automatique (401 / 411)',
        description:
          'Rapproche les débits et crédits de même tiers dont les montants correspondent ' +
          '(exact, référence, somme). Aucun lettrage existant n\'est écrasé.',
        impact: 'Écrit un code de lettrage sur les lignes rapprochées — opération réversible (délettrage).',
        mode: 'auto',
        cibles: total,
      });
      props.push(nav('C13', 'Ouvrir le lettrage manuel',
        'Traiter les lignes qui ne se rapprochent pas automatiquement (acomptes, avoirs partiels).',
        '/accounting/lettrage', total));
      break;
    }

    // --- Soldes anormaux (clients / fournisseurs / trésorerie / divers) --------
    case 'C3':
      props.push(nav('C3', 'Analyser les comptes clients créditeurs',
        'Avoirs non lettrés, acomptes reçus ou erreur d\'imputation : l\'arbitrage est comptable.',
        '/accounting/general-ledger', total));
      break;
    case 'C6':
      props.push(nav('C6', 'Analyser les comptes fournisseurs débiteurs',
        'Acomptes versés non imputés ou double règlement : l\'arbitrage est comptable.',
        '/accounting/general-ledger', total));
      break;
    case 'C11':
      props.push(nav('C11', 'Ouvrir la position de trésorerie',
        'Un compte de trésorerie créditeur doit être justifié (découvert autorisé) ou corrigé.',
        '/treasury/positions', total));
      break;
    case 'C17':
      props.push(nav('C17', 'Ouvrir le grand livre des comptes concernés',
        'Un solde inversé signale généralement une erreur d\'imputation à reprendre à la source.',
        '/accounting/general-ledger', total));
      break;

    // --- Bilan déséquilibré ------------------------------------------------------
    case 'C14':
      props.push(nav('C14', 'Ouvrir la balance générale',
        'Identifier le ou les comptes dont la classe est invalide ou dont le solde ne bascule pas ' +
        'du bon côté du bilan.',
        '/accounting/balance', total));
      break;

    // --- Régularisations absentes -------------------------------------------------
    case 'C16':
      props.push(nav('C16', 'Ouvrir les régularisations (CCA / PCA / FNP / FAE)',
        'Saisir les charges et produits constatés d\'avance de la période, avec extourne automatique.',
        '#tab:regularisations', total));
      break;

    default:
      break;
  }

  return props;
}

// ============================================================================
// APPLICATION DES CORRECTIONS (écritures RÉELLES)
// ============================================================================

/**
 * Ajoute une ligne à une écriture existante.
 * SaaS : insertion directe dans `journal_lines` (table séparée).
 * Dexie / offline : lignes imbriquées dans l'écriture.
 */
async function appendJournalLine(
  adapter: DataAdapter,
  entryId: string,
  line: { accountCode: string; accountName: string; label: string; debit: number; credit: number },
): Promise<void> {
  const client = (adapter as any).client;
  const isSaas = adapter.getMode?.() === 'saas' && client;
  if (isSaas) {
    const { error } = await client.from('journal_lines').insert({
      id: crypto.randomUUID(),
      entry_id: entryId,
      tenant_id: (adapter as any).tenantId,
      account_code: line.accountCode,
      account_name: line.accountName,
      label: line.label,
      debit: line.debit,
      credit: line.credit,
    });
    if (error) throw new Error(error.message);
    (adapter as any).invalidateCache?.();
    return;
  }
  const entry = await adapter.getById<DBJournalEntry>('journalEntries', entryId);
  if (!entry) throw new Error(`Écriture ${entryId} introuvable`);
  const lines = [...(entry.lines || []), { id: crypto.randomUUID(), ...line }];
  const totalDebit = money(0).add(lines.reduce((s, l) => s + (l.debit || 0), 0)).toNumber();
  const totalCredit = money(0).add(lines.reduce((s, l) => s + (l.credit || 0), 0)).toNumber();
  await adapter.update('journalEntries', entryId, {
    lines,
    totalDebit,
    totalCredit,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Applique une proposition de correction. Écrit réellement en base.
 * Les propositions `manuelle` ne sont pas applicables ici.
 */
export async function applyRemediation(
  adapter: DataAdapter,
  controle: ControleLike,
  proposal: RemediationProposal,
  ctx: RemediationContext = {},
): Promise<RemediationOutcome> {
  const anomalies = controle.anomalies ?? [];
  const errors: string[] = [];
  let applied = 0;

  switch (proposal.action) {
    // ------------------------------------------------------------------------
    case 'VALIDER_BROUILLONS': {
      const cibles = anomalies.filter(a => a.corrigeable && a.entryId);
      for (const a of cibles) {
        try {
          await adapter.update('journalEntries', a.entryId!, {
            status: 'validated',
            updatedAt: new Date().toISOString(),
          });
          applied++;
        } catch (err) {
          errors.push(`${a.ref} : ${err instanceof Error ? err.message : 'erreur'}`);
        }
      }
      (adapter as any).invalidateCache?.();
      await safeLogAudit('CLOSURE_REMEDIATION_VALIDATE_DRAFTS', proposal, ctx, { applied, errors: errors.length });
      return {
        ok: errors.length === 0,
        applied,
        errors,
        message: `${applied} brouillon(s) validé(s)${errors.length ? ` — ${errors.length} en erreur` : ''}`,
      };
    }

    // ------------------------------------------------------------------------
    case 'AUTO_LETTRAGE': {
      try {
        const result = await autoLettrage(adapter, { accounts: ['401', '411'] });
        if (result.matches.length === 0) {
          return {
            ok: true, applied: 0, errors: [],
            message: 'Aucun rapprochement automatique possible — traiter en lettrage manuel.',
          };
        }
        applied = await applyLettrage(adapter, result.matches);
        (adapter as any).invalidateCache?.();
        await safeLogAudit('CLOSURE_REMEDIATION_AUTO_LETTRAGE', proposal, ctx, {
          matches: result.matches.length, applied,
        });
        return {
          ok: true, applied, errors: result.errors,
          message: `${applied} ligne(s) lettrée(s) via ${result.matches.length} rapprochement(s)`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur de lettrage';
        return { ok: false, applied: 0, errors: [msg], message: msg };
      }
    }

    // ------------------------------------------------------------------------
    case 'POSTER_DOTATIONS': {
      if (!ctx.fiscalYearId) {
        return { ok: false, applied: 0, errors: ['Exercice non sélectionné'], message: 'Sélectionnez un exercice avant de comptabiliser les dotations.' };
      }
      try {
        const result = await posterAmortissementsAnnuels(adapter, ctx.fiscalYearId);
        (adapter as any).invalidateCache?.();
        await safeLogAudit('CLOSURE_REMEDIATION_POST_DEPRECIATION', proposal, ctx, {
          assetsProcessed: result.assetsProcessed, totalAmount: result.totalAmount,
        });
        return {
          ok: result.success,
          applied: result.assetsProcessed,
          errors: result.errors,
          message: result.assetsProcessed === 0
            ? 'Aucune dotation à comptabiliser — toutes les périodes sont déjà à jour.'
            : `${result.assetsProcessed} dotation(s) comptabilisée(s)`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur de comptabilisation';
        return { ok: false, applied: 0, errors: [msg], message: msg };
      }
    }

    // ------------------------------------------------------------------------
    case 'EQUILIBRER_SUR_ATTENTE': {
      const cibles = anomalies.filter(a => a.corrigeable && a.entryId && a.montant);
      for (const a of cibles) {
        try {
          const ecart = a.montant ?? 0; // > 0 → excès de débit
          await appendJournalLine(adapter, a.entryId!, {
            accountCode: COMPTE_ATTENTE,
            accountName: 'Compte d\'attente — régularisation clôture',
            label: `Équilibrage automatique pièce ${a.ref}`,
            debit: ecart < 0 ? Math.abs(ecart) : 0,
            credit: ecart > 0 ? Math.abs(ecart) : 0,
          });
          applied++;
        } catch (err) {
          errors.push(`${a.ref} : ${err instanceof Error ? err.message : 'erreur'}`);
        }
      }
      await safeLogAudit('CLOSURE_REMEDIATION_BALANCE_ENTRY', proposal, ctx, { applied, errors: errors.length });
      return {
        ok: errors.length === 0,
        applied,
        errors,
        message: `${applied} pièce(s) équilibrée(s) sur ${COMPTE_ATTENTE}${errors.length ? ` — ${errors.length} en erreur` : ''}`,
      };
    }

    // ------------------------------------------------------------------------
    case 'NAVIGUER':
    default:
      return {
        ok: false, applied: 0, errors: [],
        message: 'Cette correction se traite manuellement dans l\'écran dédié.',
      };
  }
}

/** L'audit ne doit jamais faire échouer une correction déjà appliquée. */
async function safeLogAudit(
  action: string,
  proposal: RemediationProposal,
  ctx: RemediationContext,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await logAudit(action, 'journalEntry', proposal.controleId, JSON.stringify({
      proposal: proposal.id,
      exercice: ctx.fiscalYearId,
      utilisateur: ctx.userId,
      ...payload,
    }));
  } catch {
    /* audit best-effort */
  }
}
