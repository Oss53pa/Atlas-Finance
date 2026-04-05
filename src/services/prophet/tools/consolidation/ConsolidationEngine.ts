// @ts-nocheck
/**
 * ConsolidationEngine — Consolidation SYSCOHADA complète
 * Réf. légales : OHADA AUDCIF art. 74–99
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

// ── TYPES ────────────────────────────────────────────────────

export type MethodeConsolidation = 'integration_globale' | 'integration_proportionnelle' | 'mise_en_equivalence';
export type PayOHADA = 'CI' | 'SN' | 'CM' | 'GA' | 'BF' | 'ML' | 'NE' | 'TG' | 'BJ' | 'TD' | 'CG' | 'CF' | 'GQ' | 'GN' | 'KM' | 'GW' | 'CD';

export interface LigneBalance {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  tiers?: string;
}

export interface TransactionInterco {
  entite_source: string;
  entite_cible: string;
  compte_source: string;
  compte_cible: string;
  montant: number;
  nature: 'creance_dette' | 'produit_charge' | 'dividende' | 'stock_interne';
  marge_interne?: number;
}

export interface EntiteConsolidable {
  id: string;
  nom: string;
  pays: PayOHADA;
  balance: LigneBalance[];
  intercompany_transactions: TransactionInterco[];
  capitaux_propres?: number;
  resultat_net?: number;
  actif_net_juste_valeur?: number;
  prix_acquisition?: number;
}

export interface ConsolidationInput {
  societe_mere: EntiteConsolidable;
  filiales: EntiteConsolidable[];
  methode: MethodeConsolidation;
  taux_detention: Record<string, number>;
  exercice: string;
  monnaie_consolidation: 'XOF' | 'XAF' | 'EUR' | 'USD';
}

export interface EliminationInterco {
  type: string;
  entite_source: string;
  entite_cible: string;
  compte_debit: string;
  compte_credit: string;
  montant: number;
  description: string;
}

export interface PosteBilan {
  poste: string;
  comptes: string;
  montant_brut: number;
  amortissements: number;
  montant_net: number;
}

export interface BilanConsolide {
  actif: PosteBilan[];
  passif: PosteBilan[];
  total_actif: number;
  total_passif: number;
  equilibre: boolean;
}

export interface PosteCR {
  poste: string;
  comptes: string;
  montant: number;
}

export interface CompteResultatConsolide {
  produits_exploitation: PosteCR[];
  charges_exploitation: PosteCR[];
  resultat_exploitation: number;
  produits_financiers: PosteCR[];
  charges_financieres: PosteCR[];
  resultat_financier: number;
  produits_hao: PosteCR[];
  charges_hao: PosteCR[];
  resultat_hao: number;
  resultat_net: number;
  resultat_part_groupe: number;
  resultat_minoritaires: number;
}

export interface ResultatConsolidation {
  bilan_consolide: BilanConsolide;
  compte_resultat_consolide: CompteResultatConsolide;
  goodwill: number;
  goodwill_amortissement_annuel: number;
  interets_minoritaires: number;
  eliminations: EliminationInterco[];
  perimetre: { entite: string; methode: MethodeConsolidation; taux: number }[];
  note_methodologie: string;
  alertes: string[];
}

// ── HELPERS ──────────────────────────────────────────────────

function classeCompte(compte: string): number {
  return parseInt(compte.charAt(0), 10) || 0;
}

function sommeParPrefixe(balance: LigneBalance[], prefixe: string, sens: 'solde' | 'debit' | 'credit' = 'solde'): number {
  return balance
    .filter(l => l.compte.startsWith(prefixe))
    .reduce((acc, l) => acc + (sens === 'debit' ? l.debit : sens === 'credit' ? l.credit : l.solde), 0);
}

function calculerCapitauxPropres(balance: LigneBalance[]): number {
  return balance
    .filter(l => l.compte.startsWith('1'))
    .reduce((acc, l) => acc + l.solde, 0);
}

function calculerResultat(balance: LigneBalance[]): number {
  const produits = balance.filter(l => l.compte.startsWith('7')).reduce((a, l) => a + l.credit - l.debit, 0);
  const charges = balance.filter(l => l.compte.startsWith('6')).reduce((a, l) => a + l.debit - l.credit, 0);
  return produits - charges;
}

function calculerTotalActif(balance: LigneBalance[]): number {
  return balance
    .filter(l => {
      const cl = classeCompte(l.compte);
      return cl >= 2 && cl <= 5 && l.solde > 0;
    })
    .reduce((a, l) => a + Math.abs(l.solde), 0);
}

// ── MOTEUR DE CONSOLIDATION ──────────────────────────────────

export function consoliderComptes(input: ConsolidationInput): ResultatConsolidation {
  const { societe_mere, filiales, methode, taux_detention, exercice } = input;
  const alertes: string[] = [];
  const eliminations: EliminationInterco[] = [];

  // 1. Périmètre de consolidation
  const perimetre = filiales.map(f => ({
    entite: f.nom,
    methode,
    taux: taux_detention[f.id] ?? 0,
  }));
  perimetre.unshift({ entite: societe_mere.nom, methode: 'integration_globale', taux: 100 });

  // Valider les taux
  for (const f of filiales) {
    const taux = taux_detention[f.id];
    if (taux === undefined) {
      alertes.push(`Taux de détention manquant pour ${f.nom} — utilisation de 0%`);
    } else if (methode === 'integration_globale' && taux <= 50) {
      alertes.push(`${f.nom}: taux ${taux}% insuffisant pour intégration globale (>50% requis, AUDCIF art. 80)`);
    } else if (methode === 'mise_en_equivalence' && (taux < 20 || taux > 50)) {
      alertes.push(`${f.nom}: taux ${taux}% hors plage pour mise en équivalence (20-50%, AUDCIF art. 82)`);
    }
  }

  // 2. Agrégation des balances selon la méthode
  const balanceConsolidee = new Map<string, { debit: number; credit: number; solde: number; libelle: string }>();

  function agregerBalance(balance: LigneBalance[], coefficient: number) {
    for (const ligne of balance) {
      const existing = balanceConsolidee.get(ligne.compte) || { debit: 0, credit: 0, solde: 0, libelle: ligne.libelle };
      existing.debit += ligne.debit * coefficient;
      existing.credit += ligne.credit * coefficient;
      existing.solde += ligne.solde * coefficient;
      existing.libelle = existing.libelle || ligne.libelle;
      balanceConsolidee.set(ligne.compte, existing);
    }
  }

  // Société mère : toujours intégrée à 100%
  agregerBalance(societe_mere.balance, 1);

  // Filiales selon méthode
  for (const filiale of filiales) {
    const taux = (taux_detention[filiale.id] ?? 0) / 100;

    if (methode === 'integration_globale') {
      agregerBalance(filiale.balance, 1); // 100% intégré
    } else if (methode === 'integration_proportionnelle') {
      agregerBalance(filiale.balance, taux); // prorata
    }
    // mise_en_equivalence : on ne reprend pas la balance ligne par ligne
  }

  // 3. Éliminations inter-sociétés
  const toutesEntites = [societe_mere, ...filiales];
  for (const entite of toutesEntites) {
    for (const tx of entite.intercompany_transactions) {
      let coeff = 1;
      if (methode === 'integration_proportionnelle') {
        const tauxSource = tx.entite_source === societe_mere.id ? 1 : (taux_detention[tx.entite_source] ?? 0) / 100;
        const tauxCible = tx.entite_cible === societe_mere.id ? 1 : (taux_detention[tx.entite_cible] ?? 0) / 100;
        coeff = Math.min(tauxSource, tauxCible);
      }

      if (tx.nature === 'creance_dette') {
        // Éliminer créance/dette réciproque
        const montantElim = tx.montant * coeff;
        eliminations.push({
          type: 'Créance/dette réciproque',
          entite_source: tx.entite_source,
          entite_cible: tx.entite_cible,
          compte_debit: tx.compte_cible, // dette (40X)
          compte_credit: tx.compte_source, // créance (41X)
          montant: montantElim,
          description: `Élimination créance ${tx.compte_source} / dette ${tx.compte_cible} — ${montantElim.toLocaleString('fr-FR')} FCFA`,
        });
        // Ajuster la balance
        const cptSource = balanceConsolidee.get(tx.compte_source);
        if (cptSource) cptSource.solde -= montantElim;
        const cptCible = balanceConsolidee.get(tx.compte_cible);
        if (cptCible) cptCible.solde += montantElim;

      } else if (tx.nature === 'produit_charge') {
        const montantElim = tx.montant * coeff;
        eliminations.push({
          type: 'Produit/charge réciproque',
          entite_source: tx.entite_source,
          entite_cible: tx.entite_cible,
          compte_debit: tx.compte_source, // produit (7XX)
          compte_credit: tx.compte_cible, // charge (6XX)
          montant: montantElim,
          description: `Élimination produit ${tx.compte_source} / charge ${tx.compte_cible} — ${montantElim.toLocaleString('fr-FR')} FCFA`,
        });
        const cptProd = balanceConsolidee.get(tx.compte_source);
        if (cptProd) { cptProd.credit -= montantElim; cptProd.solde += montantElim; }
        const cptCharge = balanceConsolidee.get(tx.compte_cible);
        if (cptCharge) { cptCharge.debit -= montantElim; cptCharge.solde += montantElim; }

      } else if (tx.nature === 'dividende') {
        const montantElim = tx.montant * coeff;
        eliminations.push({
          type: 'Dividende intra-groupe',
          entite_source: tx.entite_source,
          entite_cible: tx.entite_cible,
          compte_debit: '77X',
          compte_credit: '12X',
          montant: montantElim,
          description: `Élimination dividende intra-groupe — ${montantElim.toLocaleString('fr-FR')} FCFA`,
        });

      } else if (tx.nature === 'stock_interne' && tx.marge_interne) {
        const margeElim = tx.marge_interne * coeff;
        eliminations.push({
          type: 'Profit interne sur stocks',
          entite_source: tx.entite_source,
          entite_cible: tx.entite_cible,
          compte_debit: '603',
          compte_credit: '31X',
          montant: margeElim,
          description: `Élimination marge interne stocks — ${margeElim.toLocaleString('fr-FR')} FCFA (AUDCIF art. 87)`,
        });
        // Réduire la valeur des stocks de la marge non réalisée
        const cptStock = balanceConsolidee.get('31');
        if (cptStock) cptStock.solde -= margeElim;
      }
    }
  }

  // 4. Goodwill (écart d'acquisition)
  let goodwillTotal = 0;
  let goodwillAmortAnnuel = 0;
  const DUREE_AMORT_GOODWILL = 10; // Max 20 ans SYSCOHADA, prudence à 10

  for (const filiale of filiales) {
    const taux = (taux_detention[filiale.id] ?? 0) / 100;
    const actifNetJV = filiale.actif_net_juste_valeur ?? calculerCapitauxPropres(filiale.balance);
    const prixAcq = filiale.prix_acquisition ?? (actifNetJV * taux);
    const quotePartActifNet = actifNetJV * taux;
    const goodwill = prixAcq - quotePartActifNet;

    if (goodwill > 0) {
      goodwillTotal += goodwill;
      goodwillAmortAnnuel += goodwill / DUREE_AMORT_GOODWILL;
    } else if (goodwill < 0) {
      alertes.push(`${filiale.nom}: goodwill négatif (${goodwill.toLocaleString('fr-FR')} FCFA) = badwill → passif (AUDCIF art. 88)`);
    }
  }

  // Inscrire le goodwill au bilan (compte 2171)
  if (goodwillTotal > 0) {
    const existing = balanceConsolidee.get('2171') || { debit: 0, credit: 0, solde: 0, libelle: 'Écart d\'acquisition (goodwill)' };
    existing.solde += goodwillTotal;
    existing.debit += goodwillTotal;
    balanceConsolidee.set('2171', existing);
  }

  // 5. Intérêts minoritaires
  let interetsMinoritaires = 0;
  let resultatMinoritaires = 0;

  if (methode === 'integration_globale') {
    for (const filiale of filiales) {
      const taux = (taux_detention[filiale.id] ?? 0) / 100;
      const cpFiliale = filiale.capitaux_propres ?? calculerCapitauxPropres(filiale.balance);
      const resFiliale = filiale.resultat_net ?? calculerResultat(filiale.balance);
      interetsMinoritaires += cpFiliale * (1 - taux);
      resultatMinoritaires += resFiliale * (1 - taux);
    }
    // Inscrire au passif (compte 14)
    if (interetsMinoritaires !== 0) {
      const existing = balanceConsolidee.get('14') || { debit: 0, credit: 0, solde: 0, libelle: 'Intérêts minoritaires' };
      existing.solde -= interetsMinoritaires; // passif = solde négatif convention
      existing.credit += interetsMinoritaires;
      balanceConsolidee.set('14', existing);
    }
  }

  // 6. Mise en équivalence (traitement spécial)
  if (methode === 'mise_en_equivalence') {
    for (const filiale of filiales) {
      const taux = (taux_detention[filiale.id] ?? 0) / 100;
      const cpFiliale = filiale.capitaux_propres ?? calculerCapitauxPropres(filiale.balance);
      const quotePartCP = cpFiliale * taux;
      // Titre mis en équivalence (actif)
      const existing = balanceConsolidee.get('26') || { debit: 0, credit: 0, solde: 0, libelle: 'Titres mis en équivalence' };
      existing.solde += quotePartCP;
      existing.debit += quotePartCP;
      balanceConsolidee.set('26', existing);
      // Quote-part résultat
      const resFiliale = filiale.resultat_net ?? calculerResultat(filiale.balance);
      const quotePartRes = resFiliale * taux;
      const resCpt = balanceConsolidee.get('780') || { debit: 0, credit: 0, solde: 0, libelle: 'Quote-part résultat MEE' };
      if (quotePartRes >= 0) {
        resCpt.credit += quotePartRes;
        resCpt.solde -= quotePartRes;
      } else {
        resCpt.debit += Math.abs(quotePartRes);
        resCpt.solde += Math.abs(quotePartRes);
      }
      balanceConsolidee.set('780', resCpt);
    }
  }

  // 7. Construire bilan consolidé
  const actifPostes: PosteBilan[] = [];
  const passifPostes: PosteBilan[] = [];

  const regroupements = [
    { poste: 'Écart d\'acquisition', prefixes: ['217'], side: 'actif' },
    { poste: 'Immobilisations incorporelles', prefixes: ['21'], side: 'actif' },
    { poste: 'Immobilisations corporelles', prefixes: ['22', '23', '24'], side: 'actif' },
    { poste: 'Immobilisations financières', prefixes: ['25', '26', '27'], side: 'actif' },
    { poste: 'Stocks', prefixes: ['31', '32', '33', '34', '35', '36', '37', '38'], side: 'actif' },
    { poste: 'Créances clients', prefixes: ['41'], side: 'actif' },
    { poste: 'Autres créances', prefixes: ['42', '43', '44', '45', '46', '47', '48'], side: 'actif' },
    { poste: 'Trésorerie actif', prefixes: ['51', '52', '53', '54', '57', '58'], side: 'actif' },
    { poste: 'Capital social', prefixes: ['10'], side: 'passif' },
    { poste: 'Réserves', prefixes: ['11'], side: 'passif' },
    { poste: 'Report à nouveau', prefixes: ['12'], side: 'passif' },
    { poste: 'Résultat de l\'exercice', prefixes: ['13'], side: 'passif' },
    { poste: 'Intérêts minoritaires', prefixes: ['14'], side: 'passif' },
    { poste: 'Provisions', prefixes: ['15', '19'], side: 'passif' },
    { poste: 'Emprunts', prefixes: ['16', '17', '18'], side: 'passif' },
    { poste: 'Dettes fournisseurs', prefixes: ['40'], side: 'passif' },
    { poste: 'Autres dettes', prefixes: ['42', '43', '44', '45', '46', '47', '48'], side: 'passif' },
    { poste: 'Trésorerie passif', prefixes: ['56', '59'], side: 'passif' },
  ];

  for (const reg of regroupements) {
    let montant = 0;
    const comptesInclus: string[] = [];
    for (const [compte, data] of balanceConsolidee.entries()) {
      if (reg.prefixes.some(p => compte.startsWith(p))) {
        if (reg.side === 'actif' && data.solde > 0) {
          montant += data.solde;
          comptesInclus.push(compte);
        } else if (reg.side === 'passif' && data.solde < 0) {
          montant += Math.abs(data.solde);
          comptesInclus.push(compte);
        }
      }
    }
    if (montant > 0) {
      const poste: PosteBilan = {
        poste: reg.poste,
        comptes: comptesInclus.join(', ') || reg.prefixes.join(', '),
        montant_brut: montant,
        amortissements: 0,
        montant_net: montant,
      };
      if (reg.side === 'actif') actifPostes.push(poste);
      else passifPostes.push(poste);
    }
  }

  const totalActif = actifPostes.reduce((a, p) => a + p.montant_net, 0);
  const totalPassif = passifPostes.reduce((a, p) => a + p.montant_net, 0);
  const ecart = Math.abs(totalActif - totalPassif);

  if (ecart > 1) {
    alertes.push(`Bilan consolidé non équilibré : écart de ${ecart.toLocaleString('fr-FR')} FCFA`);
  }

  const bilanConsolide: BilanConsolide = {
    actif: actifPostes,
    passif: passifPostes,
    total_actif: totalActif,
    total_passif: totalPassif,
    equilibre: ecart <= 1,
  };

  // 8. Construire CR consolidé
  function sommerCR(prefixes: string[]): PosteCR[] {
    const result: PosteCR[] = [];
    for (const [compte, data] of balanceConsolidee.entries()) {
      if (prefixes.some(p => compte.startsWith(p)) && (data.debit > 0 || data.credit > 0)) {
        result.push({
          poste: data.libelle || compte,
          comptes: compte,
          montant: Math.abs(data.debit - data.credit),
        });
      }
    }
    return result;
  }

  const prodExpl = sommerCR(['70', '71', '72', '73', '75']);
  const chargesExpl = sommerCR(['60', '61', '62', '63', '64', '65']);
  const resExpl = prodExpl.reduce((a, p) => a + p.montant, 0) - chargesExpl.reduce((a, p) => a + p.montant, 0);

  const prodFin = sommerCR(['76', '77']);
  const chargesFin = sommerCR(['66', '67']);
  const resFin = prodFin.reduce((a, p) => a + p.montant, 0) - chargesFin.reduce((a, p) => a + p.montant, 0);

  const prodHAO = sommerCR(['82', '84', '86', '88']);
  const chargesHAO = sommerCR(['81', '83', '85', '87']);
  const resHAO = prodHAO.reduce((a, p) => a + p.montant, 0) - chargesHAO.reduce((a, p) => a + p.montant, 0);

  const resultatNet = resExpl + resFin + resHAO - goodwillAmortAnnuel;

  const compteResultatConsolide: CompteResultatConsolide = {
    produits_exploitation: prodExpl,
    charges_exploitation: chargesExpl,
    resultat_exploitation: resExpl,
    produits_financiers: prodFin,
    charges_financieres: chargesFin,
    resultat_financier: resFin,
    produits_hao: prodHAO,
    charges_hao: chargesHAO,
    resultat_hao: resHAO,
    resultat_net: resultatNet,
    resultat_part_groupe: resultatNet - resultatMinoritaires,
    resultat_minoritaires: resultatMinoritaires,
  };

  // 9. Note de méthodologie
  const methodeLabel = methode === 'integration_globale' ? 'intégration globale'
    : methode === 'integration_proportionnelle' ? 'intégration proportionnelle'
    : 'mise en équivalence';

  const note = [
    `RAPPORT DE CONSOLIDATION — Exercice ${exercice}`,
    `Monnaie de consolidation : ${input.monnaie_consolidation}`,
    `Méthode appliquée : ${methodeLabel} (AUDCIF art. ${methode === 'integration_globale' ? '80' : methode === 'integration_proportionnelle' ? '81' : '82'})`,
    ``,
    `PÉRIMÈTRE : ${perimetre.length} entités consolidées`,
    ...perimetre.map(p => `  - ${p.entite} : ${p.taux}% (${p.methode})`),
    ``,
    `ÉLIMINATIONS : ${eliminations.length} opérations inter-sociétés éliminées`,
    ...eliminations.map(e => `  - ${e.type} : ${e.description}`),
    ``,
    `GOODWILL : ${goodwillTotal.toLocaleString('fr-FR')} FCFA (amort. ${goodwillAmortAnnuel.toLocaleString('fr-FR')} FCFA/an sur ${DUREE_AMORT_GOODWILL} ans)`,
    methode === 'integration_globale' ? `INTÉRÊTS MINORITAIRES : ${interetsMinoritaires.toLocaleString('fr-FR')} FCFA` : '',
    ``,
    `BILAN CONSOLIDÉ : Actif = ${totalActif.toLocaleString('fr-FR')} / Passif = ${totalPassif.toLocaleString('fr-FR')} — ${ecart <= 1 ? 'ÉQUILIBRÉ' : 'NON ÉQUILIBRÉ (écart ' + ecart.toLocaleString('fr-FR') + ')'}`,
    `RÉSULTAT CONSOLIDÉ : ${resultatNet.toLocaleString('fr-FR')} FCFA`,
    resultatMinoritaires ? `  Part du groupe : ${(resultatNet - resultatMinoritaires).toLocaleString('fr-FR')} / Minoritaires : ${resultatMinoritaires.toLocaleString('fr-FR')}` : '',
    alertes.length > 0 ? `\nALERTES :\n${alertes.map(a => '  ⚠ ' + a).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  return {
    bilan_consolide: bilanConsolide,
    compte_resultat_consolide: compteResultatConsolide,
    goodwill: goodwillTotal,
    goodwill_amortissement_annuel: goodwillAmortAnnuel,
    interets_minoritaires: interetsMinoritaires,
    eliminations,
    perimetre,
    note_methodologie: note,
    alertes,
  };
}

// ── TOOL DEFINITION ──────────────────────────────────────────

export const consolidationTools: Record<string, ToolDefinition> = {
  consolider_comptes: {
    schema: {
      type: 'function',
      function: {
        name: 'consolider_comptes',
        description: 'Consolide les comptes d\'un groupe de sociétés selon SYSCOHADA (AUDCIF art. 74-99). Supporte intégration globale, proportionnelle et mise en équivalence. Élimine les transactions inter-sociétés, calcule le goodwill et les intérêts minoritaires.',
        parameters: {
          type: 'object',
          properties: {
            societe_mere: { type: 'object', description: 'Société mère avec balance et transactions interco' },
            filiales: { type: 'array', description: 'Liste des filiales à consolider', items: { type: 'object' } },
            methode: { type: 'string', enum: ['integration_globale', 'integration_proportionnelle', 'mise_en_equivalence'] },
            taux_detention: { type: 'object', description: 'Map filiale_id → pourcentage de détention' },
            exercice: { type: 'string', description: 'Exercice comptable (ex: 2025)' },
            monnaie_consolidation: { type: 'string', enum: ['XOF', 'XAF', 'EUR', 'USD'], default: 'XOF' },
          },
          required: ['societe_mere', 'filiales', 'methode', 'taux_detention', 'exercice'],
        },
      },
    },
    execute: async (args, adapter) => {
      const input = args as unknown as ConsolidationInput;

      // Enrichir la balance de la société mère depuis les données réelles
      if (adapter && (!input.societe_mere.balance || input.societe_mere.balance.length === 0)) {
        const rows = await adapter.getTrialBalance();
        input.societe_mere.balance = rows.map((r: any) => ({
          compte: r.accountCode,
          libelle: r.accountName,
          debit: r.totalDebit || 0,
          credit: r.totalCredit || 0,
          solde: (r.totalDebit || 0) - (r.totalCredit || 0),
        }));
      }

      const result = consoliderComptes(input);
      return JSON.stringify(result, null, 2);
    },
  },
};
