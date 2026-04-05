// @ts-nocheck
/**
 * ProvisionsEngine — Provisions & dépréciations automatiques SYSCOHADA art. 38-42
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

interface TrancheBalanceAgee { jours_min: number; jours_max: number; taux_provision: number; }
interface Creance { compte: string; tiers: string; montant: number; jours_retard: number; }
interface StockItem { code: string; libelle: string; cout: number; valeur_nette_realisable: number; jours_rotation: number; }
interface ProvisionRisque { type: string; description: string; montant_estime: number; probabilite: 'probable' | 'possible' | 'eventuel'; }
interface EcritureComptable { compte_debit: string; compte_credit: string; libelle: string; montant: number; }

interface ConfigProvisions {
  creances: { methode: 'balance_agee' | 'taux_historique' | 'individuelle'; tranches?: TrancheBalanceAgee[]; taux_historique?: number; creances: Creance[] };
  stocks: { methode: 'valeur_nette_realisable' | 'taux_rotation'; seuil_rotation_critique?: number; items: StockItem[] };
  risques: ProvisionRisque[];
  provisions_existantes?: { creances: number; stocks: number; risques: number };
}

const TRANCHES_DEFAUT: TrancheBalanceAgee[] = [
  { jours_min: 0, jours_max: 30, taux_provision: 0 },
  { jours_min: 31, jours_max: 60, taux_provision: 0.10 },
  { jours_min: 61, jours_max: 90, taux_provision: 0.25 },
  { jours_min: 91, jours_max: 180, taux_provision: 0.50 },
  { jours_min: 181, jours_max: 365, taux_provision: 0.75 },
  { jours_min: 366, jours_max: 99999, taux_provision: 1.00 },
];

function calculerProvisions(config: ConfigProvisions) {
  const ecrituresDotation: EcritureComptable[] = [];
  const ecrituresReprise: EcritureComptable[] = [];
  const details: { categorie: string; montant_nouveau: number; montant_existant: number; dotation: number; reprise: number }[] = [];
  let totalNouvelles = 0, totalReprises = 0;

  // 1. Créances douteuses
  let provCreances = 0;
  const tranches = config.creances.tranches || TRANCHES_DEFAUT;

  if (config.creances.methode === 'balance_agee') {
    for (const creance of config.creances.creances) {
      const tranche = tranches.find(t => creance.jours_retard >= t.jours_min && creance.jours_retard <= t.jours_max);
      if (tranche && tranche.taux_provision > 0) {
        provCreances += creance.montant * tranche.taux_provision;
      }
    }
  } else if (config.creances.methode === 'taux_historique') {
    const totalCreances = config.creances.creances.reduce((a, c) => a + c.montant, 0);
    provCreances = totalCreances * (config.creances.taux_historique ?? 0.05);
  } else {
    // Individuelle — on prend les créances > 90 jours
    provCreances = config.creances.creances.filter(c => c.jours_retard > 90).reduce((a, c) => a + c.montant, 0);
  }

  provCreances = Math.round(provCreances);
  const existantCreances = config.provisions_existantes?.creances ?? 0;

  if (provCreances > existantCreances) {
    const dotation = provCreances - existantCreances;
    ecrituresDotation.push({ compte_debit: '6594', compte_credit: '491', libelle: `Dotation dépréciation créances douteuses (SYSCOHADA art. 40)`, montant: dotation });
    totalNouvelles += dotation;
  } else if (provCreances < existantCreances) {
    const reprise = existantCreances - provCreances;
    ecrituresReprise.push({ compte_debit: '491', compte_credit: '7594', libelle: `Reprise dépréciation créances`, montant: reprise });
    totalReprises += reprise;
  }
  details.push({ categorie: 'Créances douteuses (491)', montant_nouveau: provCreances, montant_existant: existantCreances, dotation: Math.max(0, provCreances - existantCreances), reprise: Math.max(0, existantCreances - provCreances) });

  // 2. Stocks
  let provStocks = 0;
  if (config.stocks.methode === 'valeur_nette_realisable') {
    for (const item of config.stocks.items) {
      if (item.valeur_nette_realisable < item.cout) {
        provStocks += item.cout - item.valeur_nette_realisable;
      }
    }
  } else {
    const seuil = config.stocks.seuil_rotation_critique ?? 180;
    for (const item of config.stocks.items) {
      if (item.jours_rotation > seuil) {
        const tauxDepreciation = Math.min(1, (item.jours_rotation - seuil) / seuil);
        provStocks += item.cout * tauxDepreciation;
      }
    }
  }

  provStocks = Math.round(provStocks);
  const existantStocks = config.provisions_existantes?.stocks ?? 0;

  if (provStocks > existantStocks) {
    const dotation = provStocks - existantStocks;
    ecrituresDotation.push({ compte_debit: '6593', compte_credit: '39', libelle: `Dotation dépréciation stocks (SYSCOHADA art. 41)`, montant: dotation });
    totalNouvelles += dotation;
  } else if (provStocks < existantStocks) {
    const reprise = existantStocks - provStocks;
    ecrituresReprise.push({ compte_debit: '39', compte_credit: '7593', libelle: `Reprise dépréciation stocks`, montant: reprise });
    totalReprises += reprise;
  }
  details.push({ categorie: 'Stocks (39X)', montant_nouveau: provStocks, montant_existant: existantStocks, dotation: Math.max(0, provStocks - existantStocks), reprise: Math.max(0, existantStocks - provStocks) });

  // 3. Risques et charges
  let provRisques = 0;
  for (const risque of config.risques) {
    if (risque.probabilite === 'probable') {
      provRisques += risque.montant_estime;
      const compteProvision = risque.type === 'litige' ? '1911' : risque.type === 'garantie' ? '194' : risque.type === 'restructuration' ? '195' : '198';
      ecrituresDotation.push({ compte_debit: '6911', compte_credit: compteProvision, libelle: `Provision pour ${risque.type} — ${risque.description}`, montant: risque.montant_estime });
      totalNouvelles += risque.montant_estime;
    }
  }

  provRisques = Math.round(provRisques);
  details.push({ categorie: 'Risques et charges (19X)', montant_nouveau: provRisques, montant_existant: config.provisions_existantes?.risques ?? 0, dotation: provRisques, reprise: 0 });

  const impactResultat = -(totalNouvelles - totalReprises);

  return {
    ecritures_dotation: ecrituresDotation,
    ecritures_reprise: ecrituresReprise,
    total_provisions_nouvelles: totalNouvelles,
    total_reprises: totalReprises,
    impact_resultat: impactResultat,
    detail_par_categorie: details,
    resume: `Dotations : ${totalNouvelles.toLocaleString('fr-FR')} FCFA | Reprises : ${totalReprises.toLocaleString('fr-FR')} FCFA | Impact résultat : ${impactResultat.toLocaleString('fr-FR')} FCFA`,
    reference_legale: 'SYSCOHADA art. 38-42 — Provisions pour dépréciation et provisions pour risques et charges',
  };
}

export const provisionsTools: Record<string, ToolDefinition> = {
  calculer_provisions_auto: {
    schema: {
      type: 'function',
      function: {
        name: 'calculer_provisions_auto',
        description: 'Calcule automatiquement les provisions et dépréciations : créances douteuses (balance âgée), stocks, risques et charges. Génère les écritures de dotation et reprise. SYSCOHADA art. 38-42.',
        parameters: {
          type: 'object',
          properties: {
            creances: { type: 'object', description: 'Config créances {methode, tranches, creances: [{compte, tiers, montant, jours_retard}]}' },
            stocks: { type: 'object', description: 'Config stocks {methode, seuil_rotation_critique, items: [{code, libelle, cout, valeur_nette_realisable, jours_rotation}]}' },
            risques: { type: 'array', items: { type: 'object' }, description: 'Provisions risques [{type, description, montant_estime, probabilite}]' },
            provisions_existantes: { type: 'object', description: '{creances, stocks, risques} montants existants' },
          },
          required: ['creances', 'stocks', 'risques'],
        },
      },
    },
    execute: async (args, adapter) => {
      const config = args as unknown as ConfigProvisions;

      // Enrichir les provisions existantes depuis la balance réelle
      if (adapter && !config.provisions_existantes) {
        const rows = await adapter.getTrialBalance();
        const solde = (prefix: string) => rows.filter((r: any) => r.accountCode?.startsWith(prefix)).reduce((a: number, r: any) => a + Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)), 0);
        config.provisions_existantes = {
          creances: solde('491'),
          stocks: solde('39'),
          risques: solde('19'),
        };
      }

      return JSON.stringify(calculerProvisions(config));
    },
  },
};
