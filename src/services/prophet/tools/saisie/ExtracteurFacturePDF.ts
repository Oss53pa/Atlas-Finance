
/**
 * ExtracteurFacturePDF — NLP extraction factures (texte brut → écriture SYSCOHADA)
 */
import type { ToolDefinition } from '../ToolRegistry';

interface LigneFacture { description: string; quantite: number; prix_unitaire: number; montant: number; }
interface EcritureComptable { compte_debit: string; compte_credit: string; libelle: string; montant: number; }

// Patterns fournisseurs africains
const PATTERNS_FOURNISSEURS: { regex: RegExp; nom: string; compte_defaut: string }[] = [
  { regex: /orange\s*(money|ci|sn|cm|bf|ml)/i, nom: 'Orange', compte_defaut: '6261' },
  { regex: /mtn\s*(momo|money|cm|ci)/i, nom: 'MTN', compte_defaut: '6261' },
  { regex: /ecobank/i, nom: 'Ecobank', compte_defaut: '627' },
  { regex: /sgbci|societe\s*generale/i, nom: 'SGBCI', compte_defaut: '627' },
  { regex: /boa|bank\s*of\s*africa/i, nom: 'BOA', compte_defaut: '627' },
  { regex: /nsia/i, nom: 'NSIA', compte_defaut: '616' },
  { regex: /cie|compagnie.*electricite/i, nom: 'CIE', compte_defaut: '6051' },
  { regex: /sodeci|eau/i, nom: 'SODECI', compte_defaut: '6052' },
  { regex: /moov/i, nom: 'Moov Africa', compte_defaut: '6261' },
  { regex: /wave/i, nom: 'Wave', compte_defaut: '6261' },
  { regex: /total\s*energ|total\s*ci/i, nom: 'TotalEnergies', compte_defaut: '6068' },
  { regex: /cfao|toyota|renault/i, nom: 'CFAO Motors', compte_defaut: '6241' },
  { regex: /sonatel/i, nom: 'Sonatel', compte_defaut: '6261' },
  { regex: /camtel/i, nom: 'Camtel', compte_defaut: '6261' },
  { regex: /senelec/i, nom: 'Senelec', compte_defaut: '6051' },
  { regex: /bicici|bni|sib|coris/i, nom: 'Banque', compte_defaut: '627' },
  { regex: /cabinet|fiduciaire|audit|conseil/i, nom: 'Cabinet conseil', compte_defaut: '6226' },
  { regex: /imprimerie|papeterie/i, nom: 'Fournitures bureau', compte_defaut: '6064' },
  { regex: /hotel|novotel|radisson|pullman/i, nom: 'Hôtel', compte_defaut: '6256' },
  { regex: /restaurant|traiteur/i, nom: 'Restaurant', compte_defaut: '6257' },
  { regex: /transport|logistique|dhl|fedex/i, nom: 'Transport', compte_defaut: '6133' },
  { regex: /loyer|bail|immobilier/i, nom: 'Loyer', compte_defaut: '6132' },
  { regex: /assurance|sanlam|axa|allianz/i, nom: 'Assurance', compte_defaut: '616' },
  { regex: /carburant|essence|gasoil|station/i, nom: 'Carburant', compte_defaut: '6068' },
  { regex: /informatique|pc|ordinateur|serveur/i, nom: 'Informatique', compte_defaut: '6063' },
];

// Comptes de charges par catégorie
const CATEGORIES_CHARGES: Record<string, string> = {
  'fournitures': '604', 'marchandises': '601', 'matières premières': '602',
  'loyer': '6132', 'entretien': '6155', 'assurance': '616',
  'honoraires': '6226', 'publicité': '627', 'téléphone': '6261',
  'électricité': '6051', 'eau': '6052', 'transport': '6133',
  'mission': '6256', 'formation': '6358', 'maintenance': '6155',
};

function extraireFacture(texte: string, devise?: string) {
  const dev = devise || 'XOF';
  const lignes = texte.split('\n').map(l => l.trim()).filter(Boolean);

  // Extraction fournisseur
  let fournisseur = { nom: '', nif: '', adresse: '' };
  for (const pattern of PATTERNS_FOURNISSEURS) {
    if (pattern.regex.test(texte)) {
      fournisseur.nom = pattern.nom;
      break;
    }
  }
  if (!fournisseur.nom) {
    // Heuristique : première ligne non-montant
    fournisseur.nom = lignes.find(l => l.length > 3 && !/\d{3}/.test(l)) || 'Fournisseur inconnu';
  }

  // NIF
  const nifMatch = texte.match(/(?:NIF|NCC|RCCM|RC|IFU)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i);
  if (nifMatch) fournisseur.nif = nifMatch[1];

  // Numéro facture
  const numMatch = texte.match(/(?:facture|fact|invoice|n°|num[eé]ro)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i);
  const numeroFacture = numMatch ? numMatch[1] : '';

  // Date
  const dateMatch = texte.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  const dateFacture = dateMatch ? `${dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : '';

  // Montants
  const montantRegex = /(\d[\d\s.,]*\d)\s*(?:FCFA|XOF|XAF|CFA|F\b|EUR|USD)?/gi;
  const montants: number[] = [];
  let match;
  while ((match = montantRegex.exec(texte)) !== null) {
    const val = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
    if (!isNaN(val) && val > 0) montants.push(val);
  }

  // TTC = max, chercher HT et TVA
  montants.sort((a, b) => b - a);
  let montantTTC = montants[0] || 0;
  let montantTVA = 0;
  let montantHT = 0;
  let tauxTVA = 0.18;

  const tvaMatch = texte.match(/(?:TVA|tva)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (tvaMatch) tauxTVA = parseFloat(tvaMatch[1].replace(',', '.')) / 100;

  const htMatch = texte.match(/(?:HT|hors\s*taxe|sous.?total)\s*[:\-]?\s*(\d[\d\s.,]*\d)/i);
  const tvaValMatch = texte.match(/(?:TVA|montant\s*TVA)\s*[:\-]?\s*(\d[\d\s.,]*\d)/i);

  if (htMatch) {
    montantHT = parseFloat(htMatch[1].replace(/\s/g, '').replace(',', '.'));
    montantTVA = tvaValMatch ? parseFloat(tvaValMatch[1].replace(/\s/g, '').replace(',', '.')) : montantHT * tauxTVA;
    montantTTC = montantHT + montantTVA;
  } else {
    montantHT = Math.round(montantTTC / (1 + tauxTVA));
    montantTVA = montantTTC - montantHT;
  }

  // Compte de charge proposé
  let comptePropose = '604'; // fournitures par défaut
  let confiance = 0.4;

  for (const pattern of PATTERNS_FOURNISSEURS) {
    if (pattern.regex.test(texte)) {
      comptePropose = pattern.compte_defaut;
      confiance = 0.85;
      break;
    }
  }

  // Recherche par mots-clés
  if (confiance < 0.7) {
    for (const [keyword, compte] of Object.entries(CATEGORIES_CHARGES)) {
      if (texte.toLowerCase().includes(keyword)) {
        comptePropose = compte;
        confiance = 0.70;
        break;
      }
    }
  }

  const justification = `Compte ${comptePropose} proposé basé sur ${confiance >= 0.8 ? 'identification du fournisseur' : confiance >= 0.6 ? 'mots-clés détectés dans la facture' : 'catégorie par défaut (fournitures)'}`;

  // Écriture proposée
  const ecritureProposee: EcritureComptable[] = [
    { compte_debit: comptePropose, compte_credit: '', libelle: `${fournisseur.nom} — Fact. ${numeroFacture}`, montant: montantHT },
  ];
  if (montantTVA > 0) {
    ecritureProposee.push({ compte_debit: '4452', compte_credit: '', libelle: `TVA déductible ${(tauxTVA * 100).toFixed(0)}%`, montant: Math.round(montantTVA) });
  }
  ecritureProposee.push({ compte_debit: '', compte_credit: '401', libelle: `${fournisseur.nom}`, montant: Math.round(montantTTC) });

  return {
    fournisseur,
    date_facture: dateFacture,
    numero_facture: numeroFacture,
    montant_ht: Math.round(montantHT),
    taux_tva: tauxTVA,
    montant_tva: Math.round(montantTVA),
    montant_ttc: Math.round(montantTTC),
    devise: dev,
    compte_charge_propose: comptePropose,
    confiance: Math.round(confiance * 100) / 100,
    justification,
    ecriture_proposee: ecritureProposee,
    lignes_detail: [],
    avertissements: [
      ...(numeroFacture ? [] : ['Numéro de facture non détecté']),
      ...(dateFacture ? [] : ['Date de facture non détectée']),
      ...(montantTTC === 0 ? ['Aucun montant détecté'] : []),
      ...(confiance < 0.5 ? ['Compte de charge incertain — vérification manuelle recommandée'] : []),
    ],
  };
}

export const extracteurTools: Record<string, ToolDefinition> = {
  extraire_facture_pdf: {
    schema: {
      type: 'function',
      function: {
        name: 'extraire_facture_pdf',
        description: 'Extrait les données d\'une facture à partir du texte brut : fournisseur, montants, TVA, et propose une écriture comptable SYSCOHADA. Reconnaît 25+ fournisseurs africains courants.',
        parameters: {
          type: 'object',
          properties: {
            texte: { type: 'string', description: 'Texte brut extrait du PDF de la facture' },
            devise: { type: 'string', default: 'XOF' },
          },
          required: ['texte'],
        },
      },
    },
    execute: async (args, _adapter) => {
      const { texte, devise } = args as Record<string, any>;
      return JSON.stringify(extraireFacture(texte, devise));
    },
  },
};
