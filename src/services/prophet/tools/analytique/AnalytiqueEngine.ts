// @ts-nocheck

/**
 * AnalytiqueEngine — Comptabilité analytique SYSCOHADA (Classe 9)
 * 3 outils : creer_centre_cout, imputer_analytique, rapport_analytique
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

// ── TYPES ────────────────────────────────────────────────────

export interface CleRepartition {
  nature: 'fixe' | 'prorata_ca' | 'prorata_effectif' | 'prorata_surface' | 'manuelle';
  valeur?: number;
}

export interface CentreCout {
  code: string;
  libelle: string;
  type: 'cout' | 'profit' | 'investissement' | 'service';
  responsable?: string;
  budget_annuel?: number;
  cles_repartition: CleRepartition[];
}

export interface ImputationAnalytique {
  centre_code: string;
  centre_libelle: string;
  pourcentage: number;
  montant: number;
}

export interface EcritureAnalytique {
  compte_analytique: string;
  centre_cout: string;
  libelle: string;
  montant: number;
  sens: 'debit' | 'credit';
}

export interface LigneRapport {
  compte: string;
  libelle: string;
  valeurs: Record<string, { budget: number; realise: number; ecart: number; ecart_pct: number }>;
  total: { budget: number; realise: number; ecart: number; ecart_pct: number };
}

// ── MOTEUR ───────────────────────────────────────────────────

function validerCentreCout(centre: CentreCout): { valide: boolean; erreurs: string[] } {
  const erreurs: string[] = [];
  if (!centre.code || centre.code.length < 2) erreurs.push('Code centre trop court (min 2 caractères)');
  if (!centre.libelle) erreurs.push('Libellé obligatoire');
  if (!['cout', 'profit', 'investissement', 'service'].includes(centre.type)) erreurs.push(`Type invalide: ${centre.type}`);

  const clesFixes = centre.cles_repartition.filter(c => c.nature === 'fixe' || c.nature === 'manuelle');
  if (clesFixes.length > 0) {
    const totalFixe = clesFixes.reduce((a, c) => a + (c.valeur ?? 0), 0);
    if (totalFixe > 100) erreurs.push(`Total des clés fixes (${totalFixe}%) dépasse 100%`);
  }

  return { valide: erreurs.length === 0, erreurs };
}

function calculerImputations(
  montant: number,
  centres: CentreCout[],
  donneesProrata?: { ca_par_centre?: Record<string, number>; effectif_par_centre?: Record<string, number>; surface_par_centre?: Record<string, number> }
): ImputationAnalytique[] {
  const imputations: ImputationAnalytique[] = [];
  let totalPct = 0;

  for (const centre of centres) {
    let pct = 0;
    for (const cle of centre.cles_repartition) {
      if (cle.nature === 'fixe' || cle.nature === 'manuelle') {
        pct += cle.valeur ?? 0;
      } else if (cle.nature === 'prorata_ca' && donneesProrata?.ca_par_centre) {
        const totalCA = Object.values(donneesProrata.ca_par_centre).reduce((a, v) => a + v, 0);
        const caCenter = donneesProrata.ca_par_centre[centre.code] ?? 0;
        pct += totalCA > 0 ? (caCenter / totalCA) * 100 : 0;
      } else if (cle.nature === 'prorata_effectif' && donneesProrata?.effectif_par_centre) {
        const totalEff = Object.values(donneesProrata.effectif_par_centre).reduce((a, v) => a + v, 0);
        const effCenter = donneesProrata.effectif_par_centre[centre.code] ?? 0;
        pct += totalEff > 0 ? (effCenter / totalEff) * 100 : 0;
      } else if (cle.nature === 'prorata_surface' && donneesProrata?.surface_par_centre) {
        const totalSurf = Object.values(donneesProrata.surface_par_centre).reduce((a, v) => a + v, 0);
        const surfCenter = donneesProrata.surface_par_centre[centre.code] ?? 0;
        pct += totalSurf > 0 ? (surfCenter / totalSurf) * 100 : 0;
      }
    }
    totalPct += pct;
    imputations.push({
      centre_code: centre.code,
      centre_libelle: centre.libelle,
      pourcentage: Math.round(pct * 100) / 100,
      montant: Math.round(montant * pct / 100),
    });
  }

  // Ajustement arrondi sur le dernier centre
  const totalImpute = imputations.reduce((a, i) => a + i.montant, 0);
  if (imputations.length > 0 && totalImpute !== montant && Math.abs(totalPct - 100) < 1) {
    imputations[imputations.length - 1].montant += montant - totalImpute;
  }

  return imputations;
}

function genererRapportAnalytique(
  donnees: { compte: string; libelle: string; centre: string; budget: number; realise: number }[],
  centres: string[],
  afficher: string[]
): { lignes: LigneRapport[]; totaux_par_centre: Record<string, { budget: number; realise: number; ecart: number }> } {
  const comptesUniques = [...new Set(donnees.map(d => d.compte))];
  const lignes: LigneRapport[] = [];

  for (const compte of comptesUniques) {
    const donneesCompte = donnees.filter(d => d.compte === compte);
    const libelle = donneesCompte[0]?.libelle ?? compte;
    const valeurs: Record<string, { budget: number; realise: number; ecart: number; ecart_pct: number }> = {};
    let totalBudget = 0, totalRealise = 0;

    for (const centre of centres) {
      const dc = donneesCompte.filter(d => d.centre === centre);
      const budget = dc.reduce((a, d) => a + d.budget, 0);
      const realise = dc.reduce((a, d) => a + d.realise, 0);
      const ecart = realise - budget;
      const ecart_pct = budget !== 0 ? (ecart / budget) * 100 : 0;
      valeurs[centre] = { budget, realise, ecart, ecart_pct: Math.round(ecart_pct * 10) / 10 };
      totalBudget += budget;
      totalRealise += realise;
    }

    const ecartTotal = totalRealise - totalBudget;
    lignes.push({
      compte,
      libelle,
      valeurs,
      total: {
        budget: totalBudget,
        realise: totalRealise,
        ecart: ecartTotal,
        ecart_pct: totalBudget !== 0 ? Math.round((ecartTotal / totalBudget) * 1000) / 10 : 0,
      },
    });
  }

  const totaux_par_centre: Record<string, { budget: number; realise: number; ecart: number }> = {};
  for (const centre of centres) {
    const budget = lignes.reduce((a, l) => a + (l.valeurs[centre]?.budget ?? 0), 0);
    const realise = lignes.reduce((a, l) => a + (l.valeurs[centre]?.realise ?? 0), 0);
    totaux_par_centre[centre] = { budget, realise, ecart: realise - budget };
  }

  return { lignes, totaux_par_centre };
}

// ── TOOL DEFINITIONS ─────────────────────────────────────────

export const analytiqueTools: Record<string, ToolDefinition> = {
  creer_centre_cout: {
    schema: {
      type: 'function',
      function: {
        name: 'creer_centre_cout',
        description: 'Crée et valide un centre de coût pour la comptabilité analytique SYSCOHADA (classe 9). Supporte les clés de répartition fixes, prorata CA, effectif, surface.',
        parameters: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Code unique du centre (ex: CC-VENTE-ABJ)' },
            libelle: { type: 'string', description: 'Libellé descriptif' },
            type: { type: 'string', enum: ['cout', 'profit', 'investissement', 'service'] },
            responsable: { type: 'string', description: 'Nom du responsable' },
            budget_annuel: { type: 'number', description: 'Budget annuel en FCFA' },
            cles_repartition: { type: 'array', description: 'Clés de répartition', items: { type: 'object', properties: { nature: { type: 'string', enum: ['fixe', 'prorata_ca', 'prorata_effectif', 'prorata_surface', 'manuelle'] }, valeur: { type: 'number' } } } },
          },
          required: ['code', 'libelle', 'type', 'cles_repartition'],
        },
      },
    },
    execute: async (args, _adapter) => {
      const centre = args as unknown as CentreCout;
      const validation = validerCentreCout(centre);
      return JSON.stringify({
        centre,
        validation,
        message: validation.valide
          ? `Centre de coût "${centre.code}" créé avec succès (${centre.type}, ${centre.cles_repartition.length} clé(s) de répartition)`
          : `Erreurs de validation : ${validation.erreurs.join('; ')}`,
      });
    },
  },

  imputer_analytique: {
    schema: {
      type: 'function',
      function: {
        name: 'imputer_analytique',
        description: 'Propose la ventilation analytique d\'une écriture comptable selon les clés de répartition configurées. Valide que le total = 100%. Peut lire l\'écriture par numéro de pièce depuis la base.',
        parameters: {
          type: 'object',
          properties: {
            montant: { type: 'number', description: 'Montant de l\'écriture à ventiler' },
            compte: { type: 'string', description: 'Numéro de compte comptable' },
            piece: { type: 'string', description: 'Numéro de pièce pour lire l\'écriture depuis la base' },
            libelle: { type: 'string', description: 'Libellé de l\'écriture' },
            sens: { type: 'string', enum: ['debit', 'credit'] },
            centres: { type: 'array', description: 'Centres de coût avec clés', items: { type: 'object' } },
            donnees_prorata: { type: 'object', description: 'Données pour calcul prorata (ca_par_centre, effectif_par_centre, surface_par_centre)' },
          },
          required: ['centres'],
        },
      },
    },
    execute: async (args, adapter) => {
      let { montant, compte, libelle, sens, centres, donnees_prorata, piece } = args as Record<string, unknown>;

      // Lire l'écriture depuis la base si pièce fournie
      if ((!montant || !compte) && adapter && piece) {
        try {
          const entries = await adapter.getJournalEntries({ where: { reference: piece }, limit: 1 });
          if (entries.length > 0) {
            const entry = entries[0];
            const firstLine = (entry.lines || [])[0];
            if (firstLine) {
              montant = montant || firstLine.debit || firstLine.credit || 0;
              compte = compte || firstLine.accountCode;
              libelle = libelle || entry.label;
              sens = sens || (firstLine.debit > 0 ? 'debit' : 'credit');
            }
          }
        } catch (_) { /* fallback aux paramètres fournis */ }
      }
      const imputations = calculerImputations(montant, centres, donnees_prorata);
      const totalPct = imputations.reduce((a, i) => a + i.pourcentage, 0);
      const totalMontant = imputations.reduce((a, i) => a + i.montant, 0);
      const valide = Math.abs(totalPct - 100) < 0.5 && totalMontant === montant;

      const ecritures: EcritureAnalytique[] = imputations.map(imp => ({
        compte_analytique: `9${compte}`,
        centre_cout: imp.centre_code,
        libelle: `${libelle || compte} — ${imp.centre_libelle}`,
        montant: imp.montant,
        sens: sens || 'debit',
      }));

      return JSON.stringify({
        imputations,
        ecritures_analytiques: ecritures,
        total_pourcentage: Math.round(totalPct * 100) / 100,
        total_montant: totalMontant,
        valide,
        message: valide
          ? `Ventilation analytique de ${montant.toLocaleString('fr-FR')} FCFA sur ${imputations.length} centres — 100% réparti`
          : `Attention : répartition incomplète (${totalPct.toFixed(1)}%) — ajustement nécessaire`,
      });
    },
  },

  rapport_analytique: {
    schema: {
      type: 'function',
      function: {
        name: 'rapport_analytique',
        description: 'Génère un rapport analytique croisé : comptes de charges/produits × centres de coût, avec budget, réalisé, écarts et pourcentages. Lit les écritures depuis la base si données non fournies.',
        parameters: {
          type: 'object',
          properties: {
            periode: { type: 'object', properties: { debut: { type: 'string' }, fin: { type: 'string' } }, required: ['debut', 'fin'] },
            dimension: { type: 'string', enum: ['centre_cout', 'projet', 'produit', 'region'] },
            afficher: { type: 'array', items: { type: 'string', enum: ['budget', 'realise', 'ecart', 'ecart_pct'] } },
            donnees: { type: 'array', description: 'Données analytiques [{compte, libelle, centre, budget, realise}]', items: { type: 'object' } },
            centres: { type: 'array', items: { type: 'string' }, description: 'Liste des codes centres' },
          },
          required: ['periode', 'centres'],
        },
      },
    },
    execute: async (args, adapter) => {
      let { periode, dimension, afficher, donnees, centres } = args as Record<string, unknown>;

      // Construire les données analytiques depuis la balance réelle si non fournies
      if ((!donnees || donnees.length === 0) && adapter && periode) {
        try {
          const rows = await adapter.getTrialBalance({ start: periode.debut, end: periode.fin });
          // Générer des données analytiques à partir des comptes de charges (6) et produits (7)
          donnees = rows
            .filter((r: any) => r.accountCode?.startsWith('6') || r.accountCode?.startsWith('7'))
            .map((r: any) => ({
              compte: r.accountCode,
              libelle: r.accountName,
              centre: centres?.[0] || 'GENERAL',
              budget: 0,
              realise: Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)),
            }));
        } catch (_) { /* fallback */ }
      }
      const rapport = genererRapportAnalytique(donnees || [], centres || [], afficher || ['budget', 'realise', 'ecart', 'ecart_pct']);

      const alertes: string[] = [];
      for (const [centre, totaux] of Object.entries(rapport.totaux_par_centre)) {
        const t = totaux as Record<string, number>;
        if (t.ecart > 0 && t.budget > 0) {
          const pct = (t.ecart / t.budget * 100).toFixed(1);
          if (Math.abs(t.ecart / t.budget) > 0.1) {
            alertes.push(`${centre} : dépassement budget de ${pct}% (${t.ecart.toLocaleString('fr-FR')} FCFA)`);
          }
        }
      }

      return JSON.stringify({
        periode,
        dimension: dimension || 'centre_cout',
        nb_comptes: rapport.lignes.length,
        nb_centres: centres?.length ?? 0,
        lignes: rapport.lignes,
        totaux_par_centre: rapport.totaux_par_centre,
        alertes,
        message: `Rapport analytique ${periode?.debut} → ${periode?.fin} : ${rapport.lignes.length} comptes × ${centres?.length ?? 0} centres`,
      });
    },
  },
};
