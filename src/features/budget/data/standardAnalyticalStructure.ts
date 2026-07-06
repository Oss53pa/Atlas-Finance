/**
 * standardAnalyticalStructure — Structure analytique STANDARD prête à l'emploi
 * (axes + sections/centres de coût courants d'une PME/ETI). Sert à AMORCER la
 * comptabilité analytique en un clic : l'utilisateur n'a plus qu'à ventiler.
 *
 * Codes volontairement courts et parlants ; budgets à 0 (à chiffrer ensuite).
 */
export interface StandardAxe {
  code: string;
  libelle: string;
  type_axe: string;
}
export interface StandardSection {
  code: string;
  libelle: string;
  axeCode: string; // référence à StandardAxe.code
}

export const STANDARD_AXES: StandardAxe[] = [
  { code: 'FONCTION', libelle: 'Fonction / Département', type_axe: 'centre_cout' },
  { code: 'PROJET', libelle: 'Projet', type_axe: 'projet' },
  { code: 'ACTIVITE', libelle: "Activité / Ligne de métier", type_axe: 'activite' },
];

// Centres de coût standards, rattachés à l'axe FONCTION (le plus universel).
export const STANDARD_SECTIONS: StandardSection[] = [
  { code: 'DG', libelle: 'Direction générale', axeCode: 'FONCTION' },
  { code: 'ADM', libelle: 'Administration & Finance', axeCode: 'FONCTION' },
  { code: 'RH', libelle: 'Ressources humaines', axeCode: 'FONCTION' },
  { code: 'COM', libelle: 'Commercial & Ventes', axeCode: 'FONCTION' },
  { code: 'MKT', libelle: 'Marketing & Communication', axeCode: 'FONCTION' },
  { code: 'PROD', libelle: 'Production / Exploitation', axeCode: 'FONCTION' },
  { code: 'ACH', libelle: 'Achats & Approvisionnement', axeCode: 'FONCTION' },
  { code: 'LOG', libelle: 'Logistique & Transport', axeCode: 'FONCTION' },
  { code: 'MNT', libelle: 'Maintenance & Travaux', axeCode: 'FONCTION' },
  { code: 'SI', libelle: 'Systèmes d’information', axeCode: 'FONCTION' },
];

export const STANDARD_ANALYTICAL_STRUCTURE = { axes: STANDARD_AXES, sections: STANDARD_SECTIONS };
