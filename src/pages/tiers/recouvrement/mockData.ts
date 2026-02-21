import { DossierRecouvrement } from './types';
import {
  DollarSign, FileText, Bell, Calendar, AlertTriangle, BarChart3
} from 'lucide-react';

export const mockCreances = [
  {
    id: '1',
    clientId: 'CLI001',
    clientNom: 'SARL CONGO BUSINESS',
    clientCode: 'CLI001',
    // Données CRM enrichies
    crmData: {
      scoreRisque: 75,
      categoriePaiement: 'Bon payeur',
      chiffreAffairesAnnuel: 2500000,
      ancienneteClient: '3 ans',
      contactPrincipal: {
        nom: 'Jean MOUSSA',
        fonction: 'Directeur Financier',
        telephone: '+225 07 48 52 36 41',
        email: 'j.moussa@congobusiness.ci'
      },
      derniereInteraction: '2024-09-15',
      typeInteraction: 'Appel téléphonique'
    },
    // Données commerciales
    commercialData: {
      conditionsParticulieres: {
        delaiPaiement: '30 jours',
        remiseAccordee: '5%',
        plafondCredit: 150000
      },
      gestionnaireCom: 'Sophie KONE',
      secteurActivite: 'Industrie',
      litigesActifs: 0
    },
    factures: [
      {
        factureId: 'FAC-2024-001',
        numero: 'FAC-2024-001',
        date: '2024-08-15',
        dateEcheance: '2024-09-15',
        montantOriginal: 75000,
        montantRestant: 15000,
        joursRetard: 4
      },
      {
        factureId: 'FAC-2024-002',
        numero: 'FAC-2024-002',
        date: '2024-09-01',
        dateEcheance: '2024-10-01',
        montantOriginal: 45000,
        montantRestant: 45000,
        joursRetard: -12 // pas encore échu
      }
    ],
    montantTotal: 60000,
    joursRetard: 4,
    niveauRelance: 'RELANCE_1',
    derniereRelance: '2024-09-16',
    prochaineRelance: '2024-09-23',
    relances: [
      {
        id: 'r1',
        type: 'EMAIL',
        date: '2024-09-16',
        description: 'Premier rappel par email',
        moyenCommunication: 'EMAIL',
        responsable: 'Marie Kouam',
        resultat: 'Accusé de réception reçu'
      }
    ],
    statut: 'EN_COURS',
    assigneA: 'Marie Kouam',
    commentaires: 'Client généralement ponctuel, situation temporaire'
  },
  {
    id: '2',
    clientId: 'CLI003',
    clientNom: 'CAMEROUN INDUSTRIES',
    clientCode: 'CLI003',
    // Données CRM enrichies - Client à risque
    crmData: {
      scoreRisque: 25,
      categoriePaiement: 'Payeur lent',
      chiffreAffairesAnnuel: 850000,
      ancienneteClient: '5 ans',
      contactPrincipal: {
        nom: 'Michel BIYA',
        fonction: 'Comptable',
        telephone: '+237 6 75 23 41 87',
        email: 'm.biya@camerounindustries.cm'
      },
      derniereInteraction: '2024-09-10',
      typeInteraction: 'Courrier recommandé'
    },
    // Données commerciales
    commercialData: {
      conditionsParticulieres: {
        delaiPaiement: '45 jours',
        remiseAccordee: '2%',
        plafondCredit: 80000
      },
      gestionnaireCom: 'Paul MBEKI',
      secteurActivite: 'Industrie manufacturière',
      litigesActifs: 2
    },
    factures: [
      {
        factureId: 'FAC-2024-015',
        numero: 'FAC-2024-015',
        date: '2024-07-10',
        dateEcheance: '2024-08-10',
        montantOriginal: 125000,
        montantRestant: 125000,
        joursRetard: 40
      }
    ],
    montantTotal: 125000,
    joursRetard: 40,
    niveauRelance: 'RELANCE_3',
    derniereRelance: '2024-09-10',
    prochaineRelance: '2024-09-24',
    relances: [
      {
        id: 'r2',
        type: 'APPEL',
        date: '2024-08-15',
        description: 'Premier contact téléphonique',
        moyenCommunication: 'TELEPHONE',
        responsable: 'Paul Mbeki',
        resultat: 'Promesse de paiement sous 15 jours'
      },
      {
        id: 'r3',
        type: 'EMAIL',
        date: '2024-09-01',
        description: 'Relance formelle par email',
        moyenCommunication: 'EMAIL',
        responsable: 'Paul Mbeki',
        resultat: 'Pas de réponse'
      },
      {
        id: 'r4',
        type: 'COURRIER',
        date: '2024-09-10',
        description: 'Mise en demeure par courrier recommandé',
        moyenCommunication: 'COURRIER',
        responsable: 'Sophie Ndong',
        resultat: 'AR reçu, pas de réaction'
      }
    ],
    statut: 'EN_COURS',
    assigneA: 'Sophie Ndong',
    commentaires: 'Situation délicate, client en difficulté financière'
  },
  {
    id: '3',
    clientId: 'CLI004',
    clientNom: 'GABON LOGISTICS',
    clientCode: 'CLI004',
    // Données CRM enrichies - Excellent client
    crmData: {
      scoreRisque: 95,
      categoriePaiement: 'Excellent payeur',
      chiffreAffairesAnnuel: 1850000,
      ancienneteClient: '7 ans',
      contactPrincipal: {
        nom: 'Claire OBAMA',
        fonction: 'Directrice Administrative',
        telephone: '+241 05 47 23 89',
        email: 'c.obama@gabonlogistics.ga'
      },
      derniereInteraction: '2024-07-25',
      typeInteraction: 'Appel de courtoisie'
    },
    // Données commerciales
    commercialData: {
      conditionsParticulieres: {
        delaiPaiement: '15 jours',
        remiseAccordee: '8%',
        plafondCredit: 250000
      },
      gestionnaireCom: 'Marie KOUAM',
      secteurActivite: 'Transport et logistique',
      litigesActifs: 0
    },
    factures: [
      {
        factureId: 'FAC-2024-008',
        numero: 'FAC-2024-008',
        date: '2024-06-20',
        dateEcheance: '2024-07-20',
        montantOriginal: 85000,
        montantRestant: 0,
        joursRetard: 0
      }
    ],
    montantTotal: 0,
    joursRetard: 0,
    niveauRelance: 'AUCUNE',
    derniereRelance: null,
    prochaineRelance: null,
    relances: [
      {
        id: 'r5',
        type: 'APPEL',
        date: '2024-07-25',
        description: 'Appel de rappel courtois',
        moyenCommunication: 'TELEPHONE',
        responsable: 'Marie Kouam',
        resultat: 'Paiement reçu le jour même'
      }
    ],
    statut: 'RESOLU',
    assigneA: 'Marie Kouam',
    commentaires: 'Recouvrement réussi, excellent client'
  }
];

export const mockDossiers: DossierRecouvrement[] = [
  {
    id: '1',
    numeroRef: 'REC-2024-001',
    client: 'SARL CONGO BUSINESS',
    montantPrincipal: 15000,
    interets: 750,
    frais: 250,
    montantTotal: 16000,
    montantPaye: 3200,
    nombreFactures: 3,
    dsoMoyen: 45,
    dateOuverture: '2024-01-15',
    statut: 'actif',
    typeRecouvrement: 'amiable',
    responsable: 'Marie Dupont',
    derniereAction: 'Appel téléphonique client contacté',
    dateAction: '2024-01-15',
    typeAction: 'APPEL',
    prochainEtape: 'Mise en demeure - 20/01/2024'
  },
  {
    id: '2',
    numeroRef: 'REC-2024-002',
    client: 'Entreprise Delta',
    montantPrincipal: 50000,
    interets: 3500,
    frais: 1500,
    montantTotal: 55000,
    montantPaye: 11000,
    nombreFactures: 2,
    dsoMoyen: 62,
    dateOuverture: '2024-01-05',
    statut: 'juridique',
    typeRecouvrement: 'judiciaire',
    responsable: 'Jean Martin',
    derniereAction: 'Saisie avocat pour procédure',
    dateAction: '2024-01-10',
    typeAction: 'PROCEDURE_JUDICIAIRE',
    prochainEtape: 'Audience tribunal - 25/01/2024'
  },
  {
    id: '3',
    numeroRef: 'REC-2023-156',
    client: 'Commerce Local',
    montantPrincipal: 8000,
    interets: 400,
    frais: 100,
    montantTotal: 8500,
    montantPaye: 1700,
    nombreFactures: 1,
    dsoMoyen: 38,
    dateOuverture: '2023-11-10',
    statut: 'suspendu',
    typeRecouvrement: 'amiable',
    responsable: 'Sophie Bernard',
    derniereAction: 'Email de relance envoyé',
    dateAction: '2024-01-05',
    typeAction: 'EMAIL',
    prochainEtape: 'En attente réponse client'
  }
];

export const tabs = [
  { id: 'creances', label: 'Créances', icon: DollarSign },
  { id: 'dossiers', label: 'Dossiers en Recouvrement', icon: FileText },
  { id: 'relances', label: 'Relances', icon: Bell },
  { id: 'repaymentplan', label: 'Plans de Remboursement', icon: Calendar },
  { id: 'contentieux', label: 'Contentieux', icon: AlertTriangle },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 }
];

export const statutOptions = [
  { value: 'tous', label: 'Tous les statuts' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'RESOLU', label: 'Résolu' },
  { value: 'CONTENTIEUX', label: 'Contentieux' },
  { value: 'IRRECUPERABLE', label: 'Irrécupérable' }
];

export const niveauOptions = [
  { value: 'tous', label: 'Tous les niveaux' },
  { value: 'AUCUNE', label: 'Aucune relance' },
  { value: 'RELANCE_1', label: 'Relance 1' },
  { value: 'RELANCE_2', label: 'Relance 2' },
  { value: 'RELANCE_3', label: 'Relance 3' },
  { value: 'MISE_EN_DEMEURE', label: 'Mise en demeure' },
  { value: 'CONTENTIEUX', label: 'Contentieux' }
];

export const analyticsData = {
  statistiques: {
    montantTotalCreances: 1250000,
    montantRecouvre: 980000,
    tauxRecouvrement: 78.4,
    nombreCreances: 45,
    delaiMoyenRecouvrement: 18,
    creancesEnRetard: 12
  },
  evolutionRecouvrement: [
    { mois: 'Jan', recouvre: 150000, creances: 200000 },
    { mois: 'Fév', recouvre: 180000, creances: 220000 },
    { mois: 'Mar', recouvre: 165000, creances: 210000 },
    { mois: 'Avr', recouvre: 190000, creances: 240000 },
    { mois: 'Mai', recouvre: 175000, creances: 225000 },
    { mois: 'Juin', recouvre: 195000, creances: 250000 }
  ],
  repartitionNiveaux: [
    { niveau: 'Aucune relance', count: 8, montant: 125000 },
    { niveau: 'Relance 1', count: 15, montant: 380000 },
    { niveau: 'Relance 2', count: 12, montant: 295000 },
    { niveau: 'Relance 3', count: 7, montant: 285000 },
    { niveau: 'Contentieux', count: 3, montant: 165000 }
  ],
  anciennete: [
    { periode: '0-30 jours', nombre: 18, montant: 450000 },
    { periode: '31-60 jours', nombre: 12, montant: 320000 },
    { periode: '61-90 jours', nombre: 8, montant: 280000 },
    { periode: '+90 jours', nombre: 7, montant: 200000 }
  ]
};

export const integrationData = {
  // Flux depuis Comptabilité
  comptabilite: {
    facturesImpayees: [
      { id: 'F2024-001', client: 'SOCIETE ABIDJAN TRANSPORT', montant: 2500000, dateEcheance: '2024-01-15', jourRetard: 8, origine: 'Vente' },
      { id: 'F2024-002', client: 'ENTREPRISE BOUAKE SERVICES', montant: 1800000, dateEcheance: '2024-01-10', jourRetard: 13, origine: 'Service' },
      { id: 'F2024-003', client: 'SARL YAMOUSSOUKRO DISTRIBUTION', montant: 950000, dateEcheance: '2024-01-18', jourRetard: 5, origine: 'Marchandise' }
    ],
    avoirsNoteCredit: [
      { id: 'AV2024-001', client: 'SOCIETE ABIDJAN TRANSPORT', montant: 150000, motif: 'Retour marchandise', statut: 'En attente compensation' },
      { id: 'AV2024-002', client: 'ENTREPRISE BOUAKE SERVICES', montant: 75000, motif: 'Erreur facturation', statut: 'Validé' }
    ],
    reglementsPartiels: [
      { factureId: 'F2024-001', montant: 500000, date: '2024-01-20', mode: 'Virement', reste: 2000000 },
      { factureId: 'F2024-002', montant: 300000, date: '2024-01-18', mode: 'Chèque', reste: 1500000 }
    ]
  },

  // Flux depuis CRM
  crm: {
    donneesClient: [
      {
        clientId: 'CLI001',
        nom: 'SOCIETE ABIDJAN TRANSPORT',
        scoring: 'B+',
        risqueClient: 'Moyen',
        chiffreAffaires: 15000000,
        anciennete: 5,
        secteur: 'Transport',
        contacts: [
          { nom: 'Jean KOFFI', fonction: 'Directeur Financier', tel: '+225 07 12 34 56 78', email: 'j.koffi@abidjan-transport.ci' },
          { nom: 'Marie TRAORE', fonction: 'Responsable Comptabilité', tel: '+225 05 98 76 54 32', email: 'm.traore@abidjan-transport.ci' }
        ],
        historiqueRelationnel: [
          { date: '2024-01-15', type: 'Appel', contact: 'Jean KOFFI', sujet: 'Négociation délai paiement' },
          { date: '2024-01-10', type: 'Email', contact: 'Marie TRAORE', sujet: 'Demande relevé compte' }
        ]
      },
      {
        clientId: 'CLI002',
        nom: 'ENTREPRISE BOUAKE SERVICES',
        scoring: 'C',
        risqueClient: 'Élevé',
        chiffreAffaires: 8000000,
        anciennete: 2,
        secteur: 'Services',
        contacts: [
          { nom: 'Paul OUATTARA', fonction: 'Gérant', tel: '+225 07 11 22 33 44', email: 'p.ouattara@bouake-services.ci' }
        ],
        historiqueRelationnel: [
          { date: '2024-01-12', type: 'Visite', contact: 'Paul OUATTARA', sujet: 'Difficultés financières temporaires' }
        ]
      }
    ]
  },

  // Flux depuis Commercial
  commercial: {
    conditionsParticulieres: [
      { clientId: 'CLI001', conditionPaiement: '30 jours fin de mois', remiseAccordee: 5, plafondCredit: 5000000 },
      { clientId: 'CLI002', conditionPaiement: '45 jours date facture', remiseAccordee: 2, plafondCredit: 2000000 }
    ],
    litigesCommerciaux: [
      { clientId: 'CLI001', sujet: 'Qualité marchandise', statut: 'En cours', impact: 'Retard paiement', montant: 400000 },
      { clientId: 'CLI002', sujet: 'Livraison partielle', statut: 'Résolu', impact: 'Aucun', montant: 0 }
    ],
    contratsSpecifiques: [
      { clientId: 'CLI001', typeContrat: 'Contrat cadre', duree: '12 mois', clausesPaiement: 'Paiement échelonné' },
      { clientId: 'CLI002', typeContrat: 'Contrat ponctuel', duree: '6 mois', clausesPaiement: 'Paiement comptant' }
    ]
  },

  // Flux depuis Achats (pour litiges fournisseurs)
  achats: {
    litigesFournisseurs: [
      { fournisseur: 'FOURNISSEUR ABIDJAN PIECES', montant: 850000, sujet: 'Facture contestée', statut: 'En négociation' },
      { fournisseur: 'DISTRIBUTEUR BOUAKE MATERIAUX', montant: 1200000, sujet: 'Retard livraison', statut: 'Résolu' }
    ],
    compensations: [
      { client: 'SOCIETE ABIDJAN TRANSPORT', montantClient: 2500000, montantFournisseur: 850000, solde: 1650000 }
    ]
  }
};

export const statutIntegrations = [
  { module: 'Comptabilité', statut: 'Connecté', dernierSync: '2024-01-23 09:15', nbTransactions: 156 },
  { module: 'CRM', statut: 'Connecté', dernierSync: '2024-01-23 09:12', nbTransactions: 89 },
  { module: 'Commercial', statut: 'Connecté', dernierSync: '2024-01-23 09:18', nbTransactions: 45 },
  { module: 'Finance', statut: 'Connecté', dernierSync: '2024-01-23 09:10', nbTransactions: 23 },
  { module: 'Achats', statut: 'Synchronisation', dernierSync: '2024-01-23 08:45', nbTransactions: 12 },
  { module: 'Reporting', statut: 'Connecté', dernierSync: '2024-01-23 09:20', nbTransactions: 78 }
];

export const workflowValidation = {
  matriceApprobation: [
    { montantMin: 0, montantMax: 100000, approbateur: 'Agent Recouvrement', delaiMax: '24h' },
    { montantMin: 100001, montantMax: 500000, approbateur: 'Superviseur Recouvrement', delaiMax: '48h' },
    { montantMin: 500001, montantMax: 2000000, approbateur: 'Manager Crédit', delaiMax: '72h' },
    { montantMin: 2000001, montantMax: 999999999, approbateur: 'Directeur Financier', delaiMax: '5 jours' }
  ],
  enCoursValidation: [
    { dossier: 'CTX-2024-001', montant: 2500000, demandeur: 'Marie Diallo', approbateur: 'Directeur Financier', statut: 'En attente', depuis: '2 jours' },
    { dossier: 'AMI-2024-045', montant: 350000, demandeur: 'Jean Kouassi', approbateur: 'Superviseur Recouvrement', statut: 'En cours', depuis: '6h' }
  ]
};

export const notificationsEnCours = [
  { type: 'Email', destinataire: 'directeur.financier@atlasfinance.ci', sujet: 'Validation transfert contentieux - 2.5M FCFA', statut: 'Envoyé', heure: '09:15' },
  { type: 'SMS', destinataire: '+225 07 12 34 56 78', message: 'Rappel: Échéance paiement aujourd\'hui', statut: 'Envoyé', heure: '08:30' },
  { type: 'Dashboard', destinataire: 'Marie Diallo', alerte: 'Nouveau dossier contentieux assigné', statut: 'Non lu', heure: '09:20' },
  { type: 'Push Mobile', destinataire: 'Jean Kouassi', message: 'Client a effectué un paiement partiel', statut: 'Livré', heure: '09:10' }
];
