import { Money } from '@/utils/money';

export interface AssetClassification {
  assetClass: string;
  assetCategory: string;
  categoryCode: string;
  content: string;
  usefulLifeYears: {
    min: number;
    max: number;
  };
  depreciationRate: {
    min: number;
    max: number;
  };
  defaultUsefulLife: number;
  defaultDepreciationRate: number;
  examples: string[];
  syscohadaAccount: string;
  depreciationAccount: string;
}

export const assetClassificationTable: AssetClassification[] = [
  {
    assetClass: "21-Immobilisations incorporelles",
    assetCategory: "211 - Logiciels et apps",
    categoryCode: "211",
    content: "Logiciels de gestion (ERP, CRM, systèmes de paie). Applications mobiles pour les clients ou la gestion interne. Systèmes de gestion des stocks et inventaires.",
    usefulLifeYears: { min: 5, max: 7 },
    depreciationRate: { min: 14.29, max: 20 },
    defaultUsefulLife: 5,
    defaultDepreciationRate: 20,
    examples: ["ERP", "CRM", "Système de paie", "Applications mobiles", "Gestion stocks"],
    syscohadaAccount: "2135",
    depreciationAccount: "2812"
  },
  {
    assetClass: "21-Immobilisations incorporelles",
    assetCategory: "212 - Droits et licences",
    categoryCode: "212",
    content: "Droits d'utilisation de technologies brevetées. Licences commerciales (ex : logiciels, marques). Marques déposées et droits de propriété intellectuelle.",
    usefulLifeYears: { min: 5, max: 15 },
    depreciationRate: { min: 6.67, max: 20 },
    defaultUsefulLife: 10,
    defaultDepreciationRate: 10,
    examples: ["Brevets", "Marques", "Licences logiciels", "Propriété intellectuelle"],
    syscohadaAccount: "212",
    depreciationAccount: "2812"
  },
  {
    assetClass: "21-Immobilisations incorporelles",
    assetCategory: "213 - Frais de développement",
    categoryCode: "213",
    content: "Coûts de développement de projets internes (ex : développement d'applications, conception de systèmes). Capitalisés uniquement s'ils répondent aux critères du SYSCOHADA.",
    usefulLifeYears: { min: 3, max: 7 },
    depreciationRate: { min: 14.29, max: 33.33 },
    defaultUsefulLife: 5,
    defaultDepreciationRate: 20,
    examples: ["Développement applications", "Conception systèmes", "R&D"],
    syscohadaAccount: "211",
    depreciationAccount: "281"
  },
  {
    assetClass: "22-Terrains",
    assetCategory: "221 - Terrains bâtis",
    categoryCode: "221",
    content: "Terrains sur lesquels sont construits les bâtiments du centre commercial. Inclut les fondations et les aménagements liés à la construction.",
    usefulLifeYears: { min: 0, max: 0 },
    depreciationRate: { min: 0, max: 0 },
    defaultUsefulLife: 0,
    defaultDepreciationRate: 0,
    examples: ["Terrain bâti", "Fondations", "Aménagements terrain"],
    syscohadaAccount: "221",
    depreciationAccount: ""
  },
  {
    assetClass: "22-Terrains",
    assetCategory: "222- Terrains Non-bâtis",
    categoryCode: "222",
    content: "Terrains annexes (parkings extérieurs, espaces verts, réserves foncières). Terrains non encore exploités mais destinés à des projets futurs.",
    usefulLifeYears: { min: 0, max: 0 },
    depreciationRate: { min: 0, max: 0 },
    defaultUsefulLife: 0,
    defaultDepreciationRate: 0,
    examples: ["Parkings", "Espaces verts", "Réserves foncières"],
    syscohadaAccount: "222",
    depreciationAccount: ""
  },
  {
    assetClass: "23-Bâtiments, installations techniques et agencements",
    assetCategory: "231 - Bâtiments",
    categoryCode: "231",
    content: "Structure principale du centre commercial (murs, toiture, fondations). Charpente métallique et ouvrages d'infrastructure (ponts, passerelles). Escaliers, passerelles, et autres structures fixes. Étanchéité de la toiture, Terasse, Murs, facades et parking",
    usefulLifeYears: { min: 40, max: 60 },
    depreciationRate: { min: 1.67, max: 2.5 },
    defaultUsefulLife: 50,
    defaultDepreciationRate: 2,
    examples: ["Bâtiment principal", "Charpente", "Toiture", "Facades", "Parking"],
    syscohadaAccount: "223",
    depreciationAccount: "2823"
  },
  {
    assetClass: "23-Bâtiments, installations techniques et agencements",
    assetCategory: "232-Installations techniques",
    categoryCode: "232",
    content: "Systèmes de chauffage, ventilation et climatisation (CVC). Réseaux électriques, systèmes de distribution d'énergie et générateurs. Systèmes de sécurité (caméras, alarmes, contrôle d'accès). Systèmes de gestion des eaux pluviales et des déchets. Voirie et réseaux divers (réseaux d'eau, électricité, gaz, et voiries).",
    usefulLifeYears: { min: 10, max: 25 },
    depreciationRate: { min: 4, max: 10 },
    defaultUsefulLife: 15,
    defaultDepreciationRate: 6.67,
    examples: ["CVC", "Réseaux électriques", "Sécurité", "Plomberie", "Voirie"],
    syscohadaAccount: "231",
    depreciationAccount: "282"
  },
  {
    assetClass: "23-Bâtiments, installations techniques et agencements",
    assetCategory: "233 - Agencements",
    categoryCode: "233",
    content: "Revêtements de sol (carrelage, moquette, parquet). Cloisons fixes ou mobiles. Peintures et finitions murales. Menuiserie aluminium (portes, fenêtres). Serrurerie (serrures, gonds, équipements de fermeture). Escaliers, ascenseurs, escalators. Étanchéité des joints. Espaces verts et plantations",
    usefulLifeYears: { min: 10, max: 20 },
    depreciationRate: { min: 5, max: 10 },
    defaultUsefulLife: 15,
    defaultDepreciationRate: 6.67,
    examples: ["Revêtements", "Cloisons", "Menuiserie", "Ascenseurs", "Escalators"],
    syscohadaAccount: "231",
    depreciationAccount: "282"
  },
  {
    assetClass: "23-Bâtiments, installations techniques et agencements",
    assetCategory: "234 - Sécurité et sûreté",
    categoryCode: "234",
    content: "Systèmes de sécurité incendie (extincteurs, sprinklers, alarmes). Systèmes de détection d'intrusion. Systèmes de détection d'intrusion. Éclairage de sécurité et balisage d'évacuation.",
    usefulLifeYears: { min: 10, max: 20 },
    depreciationRate: { min: 5, max: 10 },
    defaultUsefulLife: 15,
    defaultDepreciationRate: 6.67,
    examples: ["Sécurité incendie", "Détection intrusion", "Éclairage sécurité", "Sprinklers"],
    syscohadaAccount: "231",
    depreciationAccount: "282"
  },
  {
    assetClass: "24 - Matériel, mobilier",
    assetCategory: "241 - Matériel technique",
    categoryCode: "241",
    content: "Équipements de cuisine (pour les restaurants). Caisses enregistreuses et terminaux de paiement. Équipements de nettoyage (balayeuses, aspirateurs industriels). Matériel informatique (ordinateurs, serveurs, imprimantes). Jeux interactifs (écrans tactiles, simulateurs). Consoles de jeux vidéo. Équipements de réalité virtuelle (VR).",
    usefulLifeYears: { min: 5, max: 12 },
    depreciationRate: { min: 8.33, max: 20 },
    defaultUsefulLife: 8,
    defaultDepreciationRate: 12.5,
    examples: ["Matériel cuisine", "Caisses", "Matériel informatique", "Jeux", "VR"],
    syscohadaAccount: "2183",
    depreciationAccount: "28183"
  },
  {
    assetClass: "24 - Matériel, mobilier",
    assetCategory: "242 - Véhicules",
    categoryCode: "242",
    content: "Véhicules de nettoyage (balayeuses, laveuses). Véhicules de sécurité (patrouille). Véhicules de maintenance (camionnettes, chariots élévateurs).",
    usefulLifeYears: { min: 5, max: 12 },
    depreciationRate: { min: 8.33, max: 20 },
    defaultUsefulLife: 8,
    defaultDepreciationRate: 12.5,
    examples: ["Véhicules nettoyage", "Véhicules sécurité", "Camionnettes", "Chariots élévateurs"],
    syscohadaAccount: "2182",
    depreciationAccount: "28182"
  },
  {
    assetClass: "24 - Matériel, mobilier",
    assetCategory: "243 - Mobilier",
    categoryCode: "243",
    content: "Bancs, chaises, tables. Poubelles et mobiliers urbains. Étals et présentoirs. Comptoirs d'accueil et de vente. Structures amovibles, Bornes d'arcade. Réfrigérateurs domestiques (espaces de repos, bureaux).",
    usefulLifeYears: { min: 5, max: 12 },
    depreciationRate: { min: 8.33, max: 20 },
    defaultUsefulLife: 10,
    defaultDepreciationRate: 10,
    examples: ["Mobilier", "Présentoirs", "Comptoirs", "Bornes", "Réfrigérateurs"],
    syscohadaAccount: "2154",
    depreciationAccount: "28154"
  },
  {
    assetClass: "24 - Matériel, mobilier",
    assetCategory: "244 - Équipements de manutention",
    categoryCode: "244",
    content: "Chariots élévateurs. Transpalettes. Convoyeurs et systèmes de transport interne.",
    usefulLifeYears: { min: 10, max: 18 },
    depreciationRate: { min: 5.56, max: 10 },
    defaultUsefulLife: 15,
    defaultDepreciationRate: 6.67,
    examples: ["Chariots élévateurs", "Transpalettes", "Convoyeurs"],
    syscohadaAccount: "2184",
    depreciationAccount: "28184"
  },
  {
    assetClass: "24 - Matériel, mobilier",
    assetCategory: "245 - Décoration et signalétique",
    categoryCode: "245",
    content: "Panneaux d'affichage (statiques et digitaux). Enseignes lumineuses. Écrans numériques et bornes interactives. Décoration intérieure (œuvres d'art, plantes, éléments thématiques).",
    usefulLifeYears: { min: 5, max: 12 },
    depreciationRate: { min: 8.33, max: 20 },
    defaultUsefulLife: 8,
    defaultDepreciationRate: 12.5,
    examples: ["Panneaux", "Enseignes", "Écrans", "Décoration", "Signalétique"],
    syscohadaAccount: "2184",
    depreciationAccount: "28184"
  }
];

export class AssetClassificationService {
  static getAllClassifications(): AssetClassification[] {
    return assetClassificationTable;
  }

  static getClassificationByCode(code: string): AssetClassification | undefined {
    return assetClassificationTable.find(item => item.categoryCode === code);
  }

  static getClassificationsByClass(assetClass: string): AssetClassification[] {
    return assetClassificationTable.filter(item => item.assetClass === assetClass);
  }

  static searchClassifications(query: string): AssetClassification[] {
    const normalizedQuery = query.toLowerCase();
    return assetClassificationTable.filter(item =>
      item.assetCategory.toLowerCase().includes(normalizedQuery) ||
      item.content.toLowerCase().includes(normalizedQuery) ||
      item.examples.some(example => example.toLowerCase().includes(normalizedQuery))
    );
  }

  static getDepreciationInfo(categoryCode: string): {
    usefulLife: number;
    depreciationRate: number;
    account: string;
    depreciationAccount: string;
  } | null {
    const classification = this.getClassificationByCode(categoryCode);
    if (!classification) return null;

    return {
      usefulLife: classification.defaultUsefulLife,
      depreciationRate: classification.defaultDepreciationRate,
      account: classification.syscohadaAccount,
      depreciationAccount: classification.depreciationAccount
    };
  }

  static validateUsefulLife(categoryCode: string, usefulLife: number): boolean {
    const classification = this.getClassificationByCode(categoryCode);
    if (!classification) return false;

    if (classification.usefulLifeYears.min === 0 && classification.usefulLifeYears.max === 0) {
      return usefulLife === 0; // Terrains non amortissables
    }

    return usefulLife >= classification.usefulLifeYears.min &&
           usefulLife <= classification.usefulLifeYears.max;
  }

  static calculateDepreciationRate(usefulLife: number): number {
    if (usefulLife === 0) return 0;
    return new Money(100).divide(usefulLife).round().toNumber();
  }

  static getAssetClasses(): string[] {
    return [...new Set(assetClassificationTable.map(item => item.assetClass))];
  }
}