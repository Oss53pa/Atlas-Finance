// @ts-nocheck

/**
 * calculationTools — Les 8 tools de calcul fiscal/comptable existants,
 * extraits du switch-case ProphetV2 dans le format ToolRegistry.
 */
import type { ToolDefinition } from './ToolRegistry';
import { calculateIS } from '../../../utils/isCalculation';
import { calculerTVAPays, calculerTVACameroun, TVAValidator } from '../../../utils/tvaValidation';
import { calculateIRPP } from '../../../utils/irppCalculation';
import { calculerBulletinPaie } from '../../../utils/paieCalculation';
import { genererEcriture, validerEcriture } from '../../../utils/ecritureGenerator';
import { analyserBenford, genererRapportBenford } from '../../../utils/benfordAnalysis';
import { calculerRetenue } from '../../../utils/retenueSourceCalc';
import { calculerSIG } from '../../../utils/ratiosFinanciers';

function tool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute,
  }];
}

export const calculationTools: Record<string, ToolDefinition> = Object.fromEntries([
  tool('calculer_is',
    "Calculer l'Impôt sur les Sociétés (IS) pour un pays OHADA",
    {
      countryCode: { type: 'string', description: 'Code pays ISO (CI, SN, CM, GA, BF, ML, NE, TG, BJ, GN, TD, CF, CG, CD, GQ, KM, GW)' },
      resultatComptable: { type: 'number', description: 'Résultat comptable avant impôt en FCFA' },
      chiffreAffaires: { type: 'number', description: "Chiffre d'affaires HT" },
      reintegrations: { type: 'number', description: 'Charges non déductibles à réintégrer' },
      deductions: { type: 'number', description: 'Produits exonérés à déduire' },
      deficitsAnterieurs: { type: 'number', description: 'Déficits reportables des exercices antérieurs' },
      acomptesVerses: { type: 'number', description: 'Acomptes IS déjà versés' },
    },
    ['countryCode', 'resultatComptable'],
    async (args) => {
      const result = calculateIS({
        countryCode: args.countryCode,
        resultatComptable: args.resultatComptable,
        reintegrations: args.reintegrations || 0,
        deductions: args.deductions || 0,
        deficitsAnterieurs: args.deficitsAnterieurs || 0,
        chiffreAffaires: args.chiffreAffaires,
        acomptesVerses: args.acomptesVerses || 0,
      });
      return JSON.stringify({
        resultatFiscal: result.resultatFiscal.toNumber(),
        tauxIS: result.tauxIS,
        impotBrut: result.impotBrut.toNumber(),
        minimumIS: result.minimumIS.toNumber(),
        impotDu: result.impotDu.toNumber(),
        acomptesVerses: result.acomptesVerses.toNumber(),
        impotNet: result.impotNet.toNumber(),
        acomptesTrimestriels: result.acomptesTrimestriels.toNumber(),
      });
    }),

  tool('calculer_tva',
    'Calculer la TVA pour un pays OHADA (taux standards et réduits)',
    {
      montantHT: { type: 'number', description: 'Montant hors taxes en FCFA' },
      countryCode: { type: 'string', description: 'Code pays ISO' },
      tauxReduit: { type: 'boolean', description: 'Utiliser le taux réduit si disponible' },
    },
    ['montantHT', 'countryCode'],
    async (args) => {
      if (args.countryCode === 'CM') {
        const result = calculerTVACameroun(args.montantHT);
        return JSON.stringify({ ...result, montantHT: args.montantHT, montantTTC: args.montantHT + result.total });
      }
      const montantTVA = calculerTVAPays(args.montantHT, args.countryCode, args.tauxReduit);
      const montantTTC = TVAValidator.calculerTTC(args.montantHT, montantTVA / args.montantHT * 100);
      return JSON.stringify({ montantHT: args.montantHT, montantTVA, montantTTC });
    }),

  tool('calculer_irpp',
    "Calculer l'IRPP (Impôt sur le Revenu des Personnes Physiques)",
    {
      countryCode: { type: 'string', description: 'Code pays ISO' },
      revenuBrutAnnuel: { type: 'number', description: 'Revenu brut annuel en FCFA' },
      situationFamiliale: { type: 'string', description: 'celibataire, marie, divorce, veuf' },
      nombreEnfants: { type: 'number', description: "Nombre d'enfants à charge" },
    },
    ['countryCode', 'revenuBrutAnnuel'],
    async (args) => {
      const result = calculateIRPP({
        countryCode: args.countryCode,
        revenuBrutAnnuel: args.revenuBrutAnnuel,
        situationFamiliale: args.situationFamiliale,
        nombreEnfants: args.nombreEnfants,
      });
      return JSON.stringify({
        revenuBrut: result.revenuBrut.toNumber(),
        abattement: result.abattement.toNumber(),
        revenuNet: result.revenuNet.toNumber(),
        nombreParts: result.nombreParts,
        impotBrut: result.impotBrut.toNumber(),
        cac: result.cac.toNumber(),
        impotNet: result.impotNet.toNumber(),
        tauxEffectif: result.tauxEffectif,
        detailTranches: result.detailTranches,
      });
    }),

  tool('calculer_bulletin_paie',
    'Générer un bulletin de paie complet avec cotisations sociales',
    {
      countryCode: { type: 'string', description: 'Code pays ISO' },
      salaireBrut: { type: 'number', description: 'Salaire brut mensuel en FCFA' },
      primes: { type: 'number', description: 'Total des primes' },
      estCadre: { type: 'boolean', description: 'Salarié cadre (true) ou non-cadre (false)' },
    },
    ['countryCode', 'salaireBrut'],
    async (args) => {
      const result = calculerBulletinPaie({
        countryCode: args.countryCode,
        salaireBrut: args.salaireBrut,
        primes: args.primes,
        estCadre: args.estCadre,
      });
      return JSON.stringify({
        salaireBrut: result.salaireBrut.toNumber(),
        salaireImposable: result.salaireImposable.toNumber(),
        cotisations: result.cotisations,
        totalCotisationsEmployeur: result.totalCotisationsEmployeur.toNumber(),
        totalCotisationsSalarie: result.totalCotisationsSalarie.toNumber(),
        salaireNet: result.salaireNet.toNumber(),
        netAPayer: result.netAPayer.toNumber(),
      });
    }),

  tool('generer_ecriture',
    'Générer une écriture comptable SYSCOHADA (achat, vente, salaires, immobilisation)',
    {
      type: { type: 'string', description: 'Type: achat_marchandises, vente_marchandises, salaires, immobilisation' },
      montantHT: { type: 'number', description: 'Montant HT en FCFA' },
      montantTVA: { type: 'number', description: 'Montant TVA' },
      tiers: { type: 'string', description: 'Nom du tiers' },
    },
    ['type', 'montantHT'],
    async (args) => {
      const ecriture = genererEcriture(args.type, {
        montantHT: args.montantHT,
        montantTVA: args.montantTVA,
        montantTTC: args.montantTVA ? args.montantHT + args.montantTVA : undefined,
        tiers: args.tiers,
      });
      const validation = validerEcriture(ecriture);
      return JSON.stringify({ ecriture, equilibree: validation.valide, ecart: validation.ecart });
    }),

  tool('analyser_benford',
    "Analyse de Benford pour détecter les anomalies comptables (fraude ISA 240)",
    {
      montants: { type: 'array', items: { type: 'number' }, description: 'Liste de montants à analyser' },
    },
    ['montants'],
    async (args) => {
      const result = analyserBenford(args.montants);
      const rapport = genererRapportBenford(result);
      return JSON.stringify({ ...result, rapport });
    }),

  tool('calculer_retenue_source',
    'Calculer la retenue à la source sur revenus versés à des tiers',
    {
      countryCode: { type: 'string', description: 'Code pays ISO' },
      typeRevenu: { type: 'string', description: 'honoraires, loyers, dividendes, interets, prestations' },
      montantBrut: { type: 'number', description: 'Montant brut en FCFA' },
    },
    ['countryCode', 'typeRevenu', 'montantBrut'],
    async (args) => {
      const result = calculerRetenue({
        countryCode: args.countryCode,
        typeRevenu: args.typeRevenu,
        montantBrut: args.montantBrut,
      });
      return JSON.stringify({
        montantBrut: result.montantBrut.toNumber(),
        taux: result.taux,
        montantRetenue: result.montantRetenue.toNumber(),
        montantNet: result.montantNet.toNumber(),
        libelle: result.libelle,
      });
    }),

  tool('calculer_ratios',
    'Calculer les SIG (Soldes Intermédiaires de Gestion) et ratios financiers SYSCOHADA',
    {
      ventesMarchandises: { type: 'number' },
      achatsMarchandises: { type: 'number' },
      chargesPersonnel: { type: 'number' },
      dotationsAmortissements: { type: 'number' },
      productionVendue: { type: 'number' },
      autresAchatsChargesExternes: { type: 'number' },
      impotsTaxes: { type: 'number' },
      chargesFinancieres: { type: 'number' },
      produitsFinanciers: { type: 'number' },
    },
    [],
    async (args) => {
      const sigInput = {
        ventesMarchandises: args.ventesMarchandises || 0,
        achatsMarchandises: args.achatsMarchandises || 0,
        variationStockMarchandises: 0,
        productionVendue: args.productionVendue || 0,
        productionStockee: 0,
        productionImmobilisee: 0,
        achatsMatieresApprovisionnements: 0,
        variationStockMatieres: 0,
        autresAchatsChargesExternes: args.autresAchatsChargesExternes || 0,
        autresProduits: 0,
        autresCharges: 0,
        impotsTaxes: args.impotsTaxes || 0,
        chargesPersonnel: args.chargesPersonnel || 0,
        dotationsAmortissements: args.dotationsAmortissements || 0,
        reprisesProvisions: 0,
        produitsFinanciers: args.produitsFinanciers || 0,
        chargesFinancieres: args.chargesFinancieres || 0,
        produitsHAO: 0,
        chargesHAO: 0,
        impotsSurResultat: 0,
      };
      const sig = calculerSIG(sigInput);
      return JSON.stringify({
        margeCommerciale: sig.margeCommerciale.toNumber(),
        valeurAjoutee: sig.valeurAjoutee.toNumber(),
        ebe: sig.excedentBrutExploitation.toNumber(),
        resultatExploitation: sig.resultatExploitation.toNumber(),
        resultatNet: sig.resultatNet.toNumber(),
      });
    }),
]);
