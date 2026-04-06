
/**
 * fiscalTools — Calendrier fiscal et aide à la liasse fiscale.
 */
import type { ToolDefinition } from './ToolRegistry';

function tool(name: string, description: string, parameters: Record<string, unknown>, required: string[], execute: (args: Record<string, unknown>) => Promise<string>): [string, ToolDefinition] {
  return [name, {
    schema: { type: 'function', function: { name, description, parameters: { type: 'object', properties: parameters, required } } },
    execute,
  }];
}

/** Calendrier fiscal simplifié par pays */
const CALENDRIERS_FISCAUX: Record<string, Array<{ echeance: string; obligation: string; reference: string }>> = {
  CI: [
    { echeance: '15 de chaque mois', obligation: 'Déclaration TVA (régime réel normal)', reference: 'CGI-CI Art. 383' },
    { echeance: '15 de chaque mois', obligation: "Reversement retenues à la source (salaires, prestataires)", reference: 'CGI-CI Art. 115' },
    { echeance: '20 avril', obligation: "Déclaration annuelle IS + paiement solde", reference: 'CGI-CI Art. 34' },
    { echeance: '20 avril / 20 juillet / 20 octobre', obligation: "Acomptes trimestriels IS", reference: 'CGI-CI Art. 36' },
    { echeance: '30 avril', obligation: "Liasse fiscale (états financiers SYSCOHADA)", reference: 'AUDCIF Art. 23' },
    { echeance: '30 avril', obligation: "Déclaration annuelle IRPP", reference: 'CGI-CI Art. 153' },
    { echeance: '31 janvier', obligation: "DISA (Déclaration Individuelle des Salaires Annuels)", reference: 'CGI-CI Art. 117' },
    { echeance: '30 juin', obligation: "Patente et contribution foncière", reference: 'CGI-CI Art. 267' },
  ],
  SN: [
    { echeance: '15 de chaque mois', obligation: 'Déclaration TVA', reference: 'CGI-SN Art. 460' },
    { echeance: '30 avril', obligation: "Déclaration annuelle IS + liasse", reference: 'CGI-SN Art. 31' },
    { echeance: '15 février / 15 mai / 15 août / 15 novembre', obligation: "Acomptes IS", reference: 'CGI-SN Art. 33' },
    { echeance: '31 mars', obligation: "DAS (Déclaration Annuelle des Salaires)", reference: 'CGI-SN' },
  ],
  CM: [
    { echeance: '15 de chaque mois', obligation: 'Déclaration TVA + CAC', reference: 'CGI-CM Art. 149' },
    { echeance: '15 mars', obligation: "Déclaration annuelle IS", reference: 'CGI-CM Art. 17' },
    { echeance: '15 mars / 15 juin / 15 septembre', obligation: "Acomptes mensuels IS (1/12)", reference: 'CGI-CM Art. 19' },
    { echeance: '15 mars', obligation: "Liasse fiscale DSF", reference: 'CGI-CM' },
  ],
  GA: [
    { echeance: '20 de chaque mois', obligation: 'Déclaration TVA', reference: 'CGI-GA' },
    { echeance: '30 avril', obligation: "Déclaration annuelle IS", reference: 'CGI-GA Art. 13' },
    { echeance: 'Trimestriel', obligation: "Acomptes IS", reference: 'CGI-GA' },
  ],
};

// Add default for other OHADA countries
for (const code of ['BF', 'ML', 'NE', 'TG', 'BJ', 'GN', 'TD', 'CF', 'CG', 'CD', 'GQ', 'KM', 'GW']) {
  if (!CALENDRIERS_FISCAUX[code]) {
    CALENDRIERS_FISCAUX[code] = [
      { echeance: '15-20 de chaque mois', obligation: 'Déclaration TVA', reference: 'CGI local' },
      { echeance: '30 avril', obligation: "Déclaration annuelle IS + liasse SYSCOHADA", reference: 'AUDCIF Art. 23' },
      { echeance: 'Trimestriel', obligation: "Acomptes IS", reference: 'CGI local' },
    ];
  }
}

export const fiscalTools: Record<string, ToolDefinition> = Object.fromEntries([
  tool('calendrier_fiscal',
    "Afficher le calendrier des obligations fiscales pour un pays OHADA",
    {
      countryCode: { type: 'string', description: 'Code pays ISO (CI, SN, CM, GA...)' },
      mois: { type: 'number', description: 'Filtrer par mois (1-12, optionnel)' },
    },
    ['countryCode'],
    async (args) => {
      const code = (args.countryCode as string).toUpperCase();
      const obligations = CALENDRIERS_FISCAUX[code] || CALENDRIERS_FISCAUX['CI'];

      let filtered = obligations;
      if (args.mois) {
        const moisNoms = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
          'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
        const nomMois = moisNoms[(args.mois as number) - 1];
        filtered = obligations.filter(o =>
          o.echeance.toLowerCase().includes(nomMois) ||
          o.echeance.includes('chaque mois')
        );
      }

      return JSON.stringify({
        pays: code,
        nombreObligations: filtered.length,
        obligations: filtered,
        avertissement: CALENDRIERS_FISCAUX[code]
          ? null
          : 'Calendrier générique. Vérifier les spécificités locales.',
      });
    }),

  tool('generer_liasse',
    "Générer la structure de la liasse fiscale SYSCOHADA (états financiers obligatoires)",
    {
      systeme: { type: 'string', description: 'normal (Système Normal) ou allege (Système Allégé / SMT)' },
      countryCode: { type: 'string', description: 'Code pays ISO' },
    },
    [],
    async (args) => {
      const systeme = (args.systeme as string) || 'normal';

      const etatsNormal = [
        { code: 'BILAN', nom: 'Bilan (Actif / Passif)', reference: 'AUDCIF Art. 29-30' },
        { code: 'CR', nom: 'Compte de Résultat', reference: 'AUDCIF Art. 31' },
        { code: 'TAFIRE', nom: 'TAFIRE (Tableau Financier des Ressources et Emplois)', reference: 'AUDCIF Art. 32' },
        { code: 'NOTES', nom: 'Notes annexes (30+ tableaux)', reference: 'AUDCIF Art. 33-35' },
        { code: 'TFT', nom: 'Tableau des Flux de Trésorerie', reference: 'SYSCOHADA révisé 2017' },
        { code: 'TAB_VAR_CP', nom: 'Tableau de Variation des Capitaux Propres', reference: 'SYSCOHADA révisé 2017' },
      ];

      const etatsAllege = [
        { code: 'BILAN_SMT', nom: 'Bilan simplifié', reference: 'AUDCIF Art. 11' },
        { code: 'CR_SMT', nom: 'Compte de Résultat simplifié', reference: 'AUDCIF Art. 11' },
        { code: 'NOTES_SMT', nom: 'Notes annexes simplifiées', reference: 'AUDCIF Art. 11' },
      ];

      const etats = systeme === 'allege' ? etatsAllege : etatsNormal;

      return JSON.stringify({
        systeme: systeme === 'allege' ? 'Système Allégé (SMT)' : 'Système Normal',
        seuilCA: systeme === 'allege' ? 'CA < seuil local (souvent 100M FCFA)' : 'CA >= seuil local',
        etatsObligatoires: etats,
        delaiDepot: '30 avril N+1 (ou 4 mois après clôture)',
        sanctions: 'Amende de 25 000 à 500 000 FCFA + pénalités de retard (CGI local)',
      });
    }),
]);
