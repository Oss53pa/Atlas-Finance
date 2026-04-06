
/**
 * SimulateurFiscal — Simulation what-if d'impact fiscal
 * Couvre les 17 pays OHADA
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

type TypeScenario = 'investissement' | 'recrutement' | 'acquisition' | 'dividendes' | 'restructuration';

const TAUX_IS: Record<string, number> = { CI: 0.25, SN: 0.30, CM: 0.33, GA: 0.30, BF: 0.275, ML: 0.30, NE: 0.30, TG: 0.27, BJ: 0.30, TD: 0.35, CG: 0.30, CF: 0.30, GQ: 0.35, GN: 0.35, KM: 0.50, GW: 0.25, CD: 0.30 };
const TAUX_TVA: Record<string, number> = { CI: 0.18, SN: 0.18, CM: 0.1925, GA: 0.18, BF: 0.18, ML: 0.18, NE: 0.19, TG: 0.18, BJ: 0.18, TD: 0.18, CG: 0.18, CF: 0.19, GQ: 0.15, GN: 0.18, KM: 0.10, GW: 0.15, CD: 0.16 };

function simuler(type: TypeScenario, params: Record<string, any>, pays: string, exercice: string) {
  const tauxIS = TAUX_IS[pays] ?? 0.30;
  const tauxTVA = TAUX_TVA[pays] ?? 0.18;
  const resultatBase = params.resultat_avant_operation ?? 0;

  let impactIS = 0, impactTVA = 0, impactResultatNet = 0;
  let recommandation = '';
  const risques: { type: string; description: string; probabilite: string }[] = [];
  const scenarios: { nom: string; impact_is: number; impact_net: number }[] = [];
  let breakeven = 0;
  const amortissements: any[] = [];

  if (type === 'investissement') {
    const montant = params.montant_investissement ?? 0;
    const dureeLineaire = params.duree_amortissement ?? 5;
    const dureeDegressif = Math.max(3, Math.ceil(dureeLineaire * 0.6));
    const tvaRecuperable = montant * tauxTVA / (1 + tauxTVA);

    // Scénario linéaire
    const amortAnnuelLin = montant / dureeLineaire;
    const economieISLin = amortAnnuelLin * tauxIS;
    scenarios.push({ nom: `Amortissement linéaire (${dureeLineaire} ans)`, impact_is: -economieISLin, impact_net: amortAnnuelLin - economieISLin });

    // Scénario dégressif
    const tauxDegressif = (1 / dureeLineaire) * (dureeLineaire <= 4 ? 1.5 : dureeLineaire <= 6 ? 2 : 2.5);
    const amortAn1Deg = montant * tauxDegressif;
    const economieISDeg = amortAn1Deg * tauxIS;
    scenarios.push({ nom: `Amortissement dégressif (coeff ${tauxDegressif.toFixed(2)})`, impact_is: -economieISDeg, impact_net: amortAn1Deg - economieISDeg });

    impactIS = -economieISLin;
    impactTVA = tvaRecuperable;
    impactResultatNet = -(montant - economieISLin * dureeLineaire);
    breakeven = Math.ceil(montant / economieISLin);

    for (let i = 1; i <= dureeLineaire; i++) {
      amortissements.push({ annee: parseInt(exercice) + i, dotation: amortAnnuelLin, vnc: montant - amortAnnuelLin * i, economie_is: economieISLin });
    }

    recommandation = `Investissement de ${montant.toLocaleString('fr-FR')} FCFA : économie IS annuelle de ${economieISLin.toLocaleString('fr-FR')} FCFA en linéaire. TVA récupérable : ${Math.round(tvaRecuperable).toLocaleString('fr-FR')} FCFA. Breakeven fiscal en ${breakeven} ans. ${amortAn1Deg > amortAnnuelLin ? 'Le dégressif est plus avantageux la 1ère année.' : ''}`;

  } else if (type === 'recrutement') {
    const salaireBrut = params.salaire_brut_annuel ?? 0;
    const nbPostes = params.nombre_postes ?? 1;
    const chargesPatronales = salaireBrut * 0.22; // CNPS moyen
    const coutTotal = (salaireBrut + chargesPatronales) * nbPostes;
    impactIS = coutTotal * tauxIS; // charges déductibles = économie IS
    impactResultatNet = -coutTotal + impactIS;

    recommandation = `Recrutement de ${nbPostes} poste(s) : coût total ${coutTotal.toLocaleString('fr-FR')} FCFA/an (salaire + charges patronales ~22%). Économie IS : ${Math.round(impactIS).toLocaleString('fr-FR')} FCFA. Impact net résultat : ${Math.round(impactResultatNet).toLocaleString('fr-FR')} FCFA.`;

  } else if (type === 'dividendes') {
    const montantDistribue = params.montant_dividendes ?? 0;
    const retenueSorce = montantDistribue * 0.15; // IRVM standard OHADA
    impactIS = 0; // dividendes non déductibles
    impactResultatNet = -montantDistribue;

    risques.push({ type: 'fiscal', description: 'IRVM (15%) retenue à la source sur dividendes versés', probabilite: 'certain' });
    if (montantDistribue > resultatBase * 0.5) {
      risques.push({ type: 'financier', description: 'Distribution > 50% du résultat : impact sur l\'autofinancement', probabilite: 'élevé' });
    }

    recommandation = `Distribution de ${montantDistribue.toLocaleString('fr-FR')} FCFA : retenue IRVM de ${Math.round(retenueSorce).toLocaleString('fr-FR')} FCFA (15%). Non déductible de l'IS. ${montantDistribue > resultatBase * 0.5 ? 'Attention : distribution élevée, risque d\'affaiblissement des capitaux propres.' : ''}`;

  } else if (type === 'acquisition') {
    const prixAcquisition = params.prix_acquisition ?? 0;
    const actifNetCible = params.actif_net_cible ?? 0;
    const goodwill = prixAcquisition - actifNetCible;
    const amortGoodwill = goodwill > 0 ? goodwill / 10 : 0;
    impactIS = -amortGoodwill * tauxIS;
    impactResultatNet = -amortGoodwill;
    breakeven = goodwill > 0 ? Math.ceil(goodwill / (amortGoodwill * tauxIS)) : 0;

    recommandation = `Acquisition à ${prixAcquisition.toLocaleString('fr-FR')} FCFA : goodwill ${goodwill.toLocaleString('fr-FR')} FCFA amorti sur 10 ans. Économie IS annuelle : ${Math.round(Math.abs(impactIS)).toLocaleString('fr-FR')} FCFA.`;

  } else if (type === 'restructuration') {
    const coutRestructuration = params.cout_restructuration ?? 0;
    const economiesAnnuelles = params.economies_annuelles ?? 0;
    impactIS = coutRestructuration * tauxIS;
    impactResultatNet = -coutRestructuration;
    breakeven = economiesAnnuelles > 0 ? Math.ceil(coutRestructuration / economiesAnnuelles) : 999;

    recommandation = `Restructuration : coût ${coutRestructuration.toLocaleString('fr-FR')} FCFA (déductible → économie IS ${Math.round(impactIS).toLocaleString('fr-FR')} FCFA). Retour sur investissement en ${breakeven} an(s) grâce aux économies de ${economiesAnnuelles.toLocaleString('fr-FR')} FCFA/an.`;
  }

  return {
    type_scenario: type,
    pays,
    exercice_cible: exercice,
    taux_is_applicable: tauxIS,
    impact_is: Math.round(impactIS),
    impact_tva: Math.round(impactTVA),
    impact_resultat_net: Math.round(impactResultatNet),
    breakeven_fiscal: breakeven,
    scenarios_comparatifs: scenarios,
    amortissements_additionnels: amortissements,
    risques_fiscaux: risques,
    recommandation_ia: recommandation,
  };
}

export const simulateurFiscalTools: Record<string, ToolDefinition> = {
  simuler_impact_fiscal: {
    schema: {
      type: 'function',
      function: {
        name: 'simuler_impact_fiscal',
        description: 'Simule l\'impact fiscal d\'un scénario what-if (investissement, recrutement, acquisition, dividendes, restructuration) pour les 17 pays OHADA.',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['investissement', 'recrutement', 'acquisition', 'dividendes', 'restructuration'] },
            parametres: { type: 'object', description: 'Paramètres du scénario' },
            pays: { type: 'string', description: 'Code pays OHADA (CI, SN, CM, etc.)' },
            exercice_cible: { type: 'string' },
          },
          required: ['type', 'parametres', 'pays', 'exercice_cible'],
        },
      },
    },
    execute: async (args, adapter) => {
      const { type, parametres, pays, exercice_cible } = args as Record<string, any>;

      // Enrichir les paramètres avec le résultat réel si disponible
      if (adapter && !parametres.resultat_avant_operation) {
        try {
          const rows = await adapter.getTrialBalance({ start: `${exercice_cible}-01-01`, end: `${exercice_cible}-12-31` });
          const produits = rows.filter((r: any) => r.accountCode?.startsWith('7')).reduce((a: number, r: any) => a + (r.totalCredit || 0) - (r.totalDebit || 0), 0);
          const charges = rows.filter((r: any) => r.accountCode?.startsWith('6')).reduce((a: number, r: any) => a + (r.totalDebit || 0) - (r.totalCredit || 0), 0);
          parametres.resultat_avant_operation = produits - charges;
        } catch (_) { /* fallback */ }
      }

      return JSON.stringify(simuler(type, parametres, pays, exercice_cible));
    },
  },
};
