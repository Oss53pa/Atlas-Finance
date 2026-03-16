// @ts-nocheck
/**
 * depreciationTools — Calcul et simulation d'amortissements SYSCOHADA.
 */
import type { ToolDefinition } from './ToolRegistry';
import { money } from '../../../utils/money';

function tool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute,
  }];
}

interface AmortissementLigne {
  annee: number;
  baseAmortissable: number;
  annuite: number;
  cumul: number;
  vnc: number;
}

function calculerTableauLineaire(valeurBrute: number, valeurResiduelle: number, dureeAnnees: number, dateAcquisition: string): AmortissementLigne[] {
  const base = valeurBrute - valeurResiduelle;
  const annuiteComplete = Math.round(base / dureeAnnees);
  const dateAcq = new Date(dateAcquisition);
  const moisDepart = dateAcq.getMonth(); // 0-based
  const prorata1 = (12 - moisDepart) / 12;

  const tableau: AmortissementLigne[] = [];
  let cumul = 0;
  const anneeDepart = dateAcq.getFullYear();

  for (let i = 0; i <= dureeAnnees; i++) {
    let annuite: number;
    if (i === 0) {
      annuite = Math.round(annuiteComplete * prorata1);
    } else if (i === dureeAnnees) {
      annuite = Math.round(annuiteComplete * (1 - prorata1));
    } else {
      annuite = annuiteComplete;
    }

    // Ne pas dépasser la base
    if (cumul + annuite > base) annuite = base - cumul;
    if (annuite <= 0) break;

    cumul += annuite;
    tableau.push({
      annee: anneeDepart + i,
      baseAmortissable: base,
      annuite,
      cumul,
      vnc: valeurBrute - cumul,
    });
  }
  return tableau;
}

function calculerTableauDegressif(valeurBrute: number, valeurResiduelle: number, dureeAnnees: number, dateAcquisition: string): AmortissementLigne[] {
  const base = valeurBrute - valeurResiduelle;
  const tauxLineaire = 1 / dureeAnnees;
  const coefficient = dureeAnnees <= 4 ? 1.5 : dureeAnnees <= 6 ? 2 : 2.5;
  const tauxDegressif = tauxLineaire * coefficient;
  const dateAcq = new Date(dateAcquisition);
  const moisDepart = dateAcq.getMonth();
  const prorata1 = (12 - moisDepart) / 12;

  const tableau: AmortissementLigne[] = [];
  let vnc = base;
  let cumul = 0;
  const anneeDepart = dateAcq.getFullYear();

  for (let i = 0; i < dureeAnnees + 1; i++) {
    if (vnc <= 0) break;

    const dureeRestante = dureeAnnees - i + (1 - prorata1);
    const tauxLineaireRestant = dureeRestante > 0 ? 1 / dureeRestante : 1;

    let annuite: number;
    if (i === 0) {
      annuite = Math.round(base * tauxDegressif * prorata1);
    } else if (tauxLineaireRestant >= tauxDegressif) {
      // Basculer en linéaire
      annuite = Math.round(vnc / Math.max(dureeRestante, 1));
    } else {
      annuite = Math.round(vnc * tauxDegressif);
    }

    if (annuite > vnc) annuite = Math.round(vnc);
    cumul += annuite;
    vnc = base - cumul;

    tableau.push({
      annee: anneeDepart + i,
      baseAmortissable: i === 0 ? base : Math.round(base - cumul + annuite),
      annuite,
      cumul,
      vnc: Math.max(vnc, 0),
    });
  }
  return tableau;
}

export const depreciationTools: Record<string, ToolDefinition> = Object.fromEntries([
  tool('calculer_amortissement',
    "Calculer le tableau d'amortissement d'une immobilisation (linéaire ou dégressif SYSCOHADA)",
    {
      valeurBrute: { type: 'number', description: "Valeur d'acquisition en FCFA" },
      valeurResiduelle: { type: 'number', description: 'Valeur résiduelle (défaut: 0)' },
      dureeAnnees: { type: 'number', description: "Durée d'amortissement en années" },
      methode: { type: 'string', description: 'lineaire ou degressif' },
      dateAcquisition: { type: 'string', description: "Date d'acquisition (YYYY-MM-DD)" },
    },
    ['valeurBrute', 'dureeAnnees', 'dateAcquisition'],
    async (args) => {
      const valeurBrute = args.valeurBrute as number;
      const valeurResiduelle = (args.valeurResiduelle as number) || 0;
      const duree = args.dureeAnnees as number;
      const methode = (args.methode as string) || 'lineaire';
      const dateAcq = (args.dateAcquisition as string) || `${new Date().getFullYear()}-01-01`;

      const tableau = methode === 'degressif'
        ? calculerTableauDegressif(valeurBrute, valeurResiduelle, duree, dateAcq)
        : calculerTableauLineaire(valeurBrute, valeurResiduelle, duree, dateAcq);

      const totalAmortissement = tableau.reduce((s, l) => s + l.annuite, 0);

      return JSON.stringify({
        methode,
        valeurBrute,
        valeurResiduelle,
        baseAmortissable: valeurBrute - valeurResiduelle,
        dureeAnnees: duree,
        tauxLineaire: `${(100 / duree).toFixed(2)}%`,
        totalAmortissement,
        tableau,
      });
    }),

  tool('simuler_amortissement',
    'Comparer amortissement linéaire vs dégressif pour une immobilisation',
    {
      valeurBrute: { type: 'number', description: "Valeur d'acquisition en FCFA" },
      dureeAnnees: { type: 'number', description: "Durée d'amortissement en années" },
      dateAcquisition: { type: 'string', description: "Date d'acquisition (YYYY-MM-DD)" },
    },
    ['valeurBrute', 'dureeAnnees'],
    async (args) => {
      const vb = args.valeurBrute as number;
      const duree = args.dureeAnnees as number;
      const dateAcq = (args.dateAcquisition as string) || `${new Date().getFullYear()}-01-01`;

      const lineaire = calculerTableauLineaire(vb, 0, duree, dateAcq);
      const degressif = calculerTableauDegressif(vb, 0, duree, dateAcq);

      return JSON.stringify({
        valeurBrute: vb,
        dureeAnnees: duree,
        lineaire: {
          annuiteConstante: lineaire.length > 1 ? lineaire[1].annuite : lineaire[0].annuite,
          tableau: lineaire,
        },
        degressif: {
          premiereAnnuite: degressif[0]?.annuite || 0,
          tableau: degressif,
        },
        conseil: duree >= 5
          ? 'Le dégressif permet une déduction fiscale plus importante les premières années.'
          : "Pour une durée courte (< 5 ans), le linéaire est souvent préférable en zone OHADA.",
      });
    }),
]);
