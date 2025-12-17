import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import {
  FileSearch, CheckCircle, AlertTriangle, Clock, Filter,
  Download, Eye, ChevronRight, X, FileText, User,
  Calendar, MessageSquare, Edit, Trash2, Plus, Search,
  AlertCircle, CheckSquare, XCircle, Flag, RefreshCw,
  Shield, Target, TrendingUp, TrendingDown, BarChart3,
  Layers, BookOpen, ClipboardCheck, Scale, FileCheck,
  AlertOctagon, Info, ChevronDown, ChevronUp, Printer,
  History, Link, Upload, Bot, Zap, PieChart, Activity
} from 'lucide-react';
import { Progress } from '../../components/ui/progress';

// ==================== TYPES ET INTERFACES ====================

// Assertions d'audit selon ISA (International Standards on Auditing)
type AssertionAudit =
  | 'existence'        // Les actifs/passifs existent à la date du bilan
  | 'exhaustivite'     // Toutes les transactions sont enregistrées
  | 'droits_obligations' // L'entité détient les droits sur les actifs
  | 'valorisation'     // Évaluation correcte selon le référentiel
  | 'presentation'     // Présentation conforme aux normes
  | 'exactitude'       // Montants et données correctement enregistrés
  | 'cut_off'          // Rattachement à la bonne période
  | 'classification';  // Correct classement dans les comptes

// Niveau de risque selon ISA 315
type NiveauRisque = 'faible' | 'modere' | 'eleve' | 'tres_eleve';

// Types de tests d'audit
type TypeTest =
  | 'substantif'       // Test de détail
  | 'analytique'       // Procédure analytique
  | 'controle'         // Test de contrôle
  | 'circularisation'  // Confirmation externe
  | 'inspection'       // Inspection physique
  | 'recalcul'         // Recalcul/re-exécution
  | 'observation';     // Observation

// Statut de la revue
type StatutRevue = 'non_demarre' | 'en_cours' | 'termine' | 'revise' | 'approuve';

// Référentiel comptable
type Referentiel = 'SYSCOHADA' | 'IFRS' | 'PCG' | 'US_GAAP';

interface AssertionDetail {
  code: AssertionAudit;
  libelle: string;
  description: string;
  risque: NiveauRisque;
  testEffectue: boolean;
  conclusion?: string;
}

interface RevisionItem {
  id: string;
  compte: string;
  libelleCompte: string;
  classeCompte: string; // Classe SYSCOHADA (1-8)
  type: 'anomalie' | 'correction' | 'ajustement' | 'regularisation' | 'reclassement';
  statut: 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'revise';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  montant: number;
  montantDebit?: number;
  montantCredit?: number;
  impact: string;
  description: string;
  dateDetection: string;
  dateEcheance?: string;
  responsable?: string;
  reviseur?: string;
  commentaires?: CommentaireRevision[];
  documents?: DocumentRevision[];
  // Nouveaux champs ISA
  assertions: AssertionAudit[];
  niveauRisque: NiveauRisque;
  typeTest?: TypeTest;
  referentiel: Referentiel;
  pieceJustificative?: string;
  ecritureProposee?: EcritureAjustement;
  historiqueModifications?: HistoriqueModification[];
}

interface CommentaireRevision {
  id: string;
  auteur: string;
  date: string;
  contenu: string;
  type: 'note' | 'question' | 'reponse' | 'validation';
}

interface DocumentRevision {
  id: string;
  nom: string;
  type: string;
  taille: string;
  dateAjout: string;
  reference?: string;
}

interface EcritureAjustement {
  id: string;
  type: 'PAJE' | 'AAJE'; // Proposed/Actual Adjusting Journal Entry
  lignes: LigneEcriture[];
  montantTotal: number;
  statut: 'propose' | 'accepte' | 'refuse' | 'comptabilise';
  reference?: string;
  justification: string;
}

interface LigneEcriture {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
}

interface HistoriqueModification {
  date: string;
  auteur: string;
  action: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
}

// Lead Schedule - Feuille de révision par cycle
interface LeadSchedule {
  id: string;
  cycle: string;
  comptes: string[];
  soldePrecedent: number;
  soldeActuel: number;
  variation: number;
  variationPourcent: number;
  seuilSignificativite: number;
  risqueInherent: NiveauRisque;
  risqueControle: NiveauRisque;
  risqueDetection: NiveauRisque;
  assertions: AssertionDetail[];
  statutRevue: StatutRevue;
  preparePar?: string;
  revisePar?: string;
  datePreparation?: string;
  dateRevision?: string;
  conclusion?: string;
  recommandations?: string[];
}

// Matrice des risques
interface RisqueControle {
  id: string;
  cycle: string;
  risque: string;
  assertion: AssertionAudit;
  probabilite: NiveauRisque;
  impact: NiveauRisque;
  controleExistant: string;
  efficaciteControle: 'efficace' | 'partiellement_efficace' | 'inefficace';
  testControle?: string;
  recommandation?: string;
}

// ==================== COMPOSANT PRINCIPAL ====================

const RevisionsModule: React.FC = () => {
  const { t } = useLanguage();
  const [activeMainTab, setActiveMainTab] = useState<'revisions' | 'lead_schedule' | 'risques' | 'ajustements' | 'analytique'>('revisions');
  const [activeTab, setActiveTab] = useState('tous');
  const [filterType, setFilterType] = useState('tous');
  const [filterPriorite, setFilterPriorite] = useState('tous');
  const [filterCycle, setFilterCycle] = useState('tous');
  const [filterAssertion, setFilterAssertion] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAjustementModal, setShowAjustementModal] = useState(false);
  const [selectedLeadSchedule, setSelectedLeadSchedule] = useState<LeadSchedule | null>(null);
  const [showLeadScheduleModal, setShowLeadScheduleModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['general', 'assertions', 'comptable']);

  // ==================== DONNÉES ====================

  // Assertions d'audit ISA avec descriptions
  const assertionsAudit: Record<AssertionAudit, { libelle: string; description: string }> = {
    existence: {
      libelle: 'Existence / Réalité',
      description: 'Les actifs, passifs et capitaux propres existent à la date du bilan. Les transactions enregistrées se sont réellement produites.'
    },
    exhaustivite: {
      libelle: 'Exhaustivité',
      description: 'Toutes les transactions et événements qui auraient dû être enregistrés l\'ont été. Il n\'y a pas d\'omission.'
    },
    droits_obligations: {
      libelle: 'Droits et Obligations',
      description: 'L\'entité détient les droits sur les actifs et est redevable des passifs enregistrés.'
    },
    valorisation: {
      libelle: 'Valorisation / Évaluation',
      description: 'Les actifs, passifs, produits et charges sont enregistrés à leur juste valeur selon le référentiel applicable.'
    },
    presentation: {
      libelle: 'Présentation et Information',
      description: 'Les informations sont présentées, classées et décrites conformément au référentiel comptable.'
    },
    exactitude: {
      libelle: 'Exactitude',
      description: 'Les montants et autres données relatives aux transactions sont correctement enregistrés.'
    },
    cut_off: {
      libelle: 'Séparation des exercices (Cut-off)',
      description: 'Les transactions sont comptabilisées dans la bonne période comptable.'
    },
    classification: {
      libelle: 'Classification',
      description: 'Les transactions sont enregistrées dans les comptes appropriés.'
    }
  };

  // Cycles de révision SYSCOHADA
  const cyclesRevision = [
    { id: 'immobilisations', label: 'Immobilisations (Classe 2)', comptes: ['20', '21', '22', '23', '24', '27', '28'] },
    { id: 'stocks', label: 'Stocks (Classe 3)', comptes: ['31', '32', '33', '34', '35', '36', '37', '38', '39'] },
    { id: 'tiers', label: 'Tiers (Classe 4)', comptes: ['40', '41', '42', '43', '44', '45', '46', '47', '48', '49'] },
    { id: 'tresorerie', label: 'Trésorerie (Classe 5)', comptes: ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59'] },
    { id: 'charges', label: 'Charges (Classe 6)', comptes: ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69'] },
    { id: 'produits', label: 'Produits (Classe 7)', comptes: ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'] },
    { id: 'capitaux', label: 'Capitaux (Classe 1)', comptes: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'] },
    { id: 'comptes_speciaux', label: 'Comptes Spéciaux (Classe 8)', comptes: ['80', '81', '82', '83', '84', '85', '86', '87', '88'] }
  ];

  // Données de révision enrichies
  const [revisions] = useState<RevisionItem[]>([
    {
      id: 'REV-2025-001',
      compte: '401100',
      libelleCompte: 'Fournisseurs - Achats de biens',
      classeCompte: '4',
      type: 'anomalie',
      statut: 'en_cours',
      priorite: 'haute',
      montant: 4500000,
      montantDebit: 0,
      montantCredit: 4500000,
      impact: 'Impact sur le résultat net et la trésorerie',
      description: 'Écart de rapprochement fournisseur non justifié - Facture n°FA-2025-0145 du fournisseur SODECI non comptabilisée',
      dateDetection: '2025-01-15',
      dateEcheance: '2025-01-25',
      responsable: 'Kouamé Marie',
      reviseur: 'Diallo Amadou',
      assertions: ['exhaustivite', 'exactitude', 'cut_off'],
      niveauRisque: 'eleve',
      typeTest: 'circularisation',
      referentiel: 'SYSCOHADA',
      pieceJustificative: 'Relevé fournisseur + Facture FA-2025-0145',
      commentaires: [
        { id: '1', auteur: 'Kouamé Marie', date: '2025-01-15', contenu: 'Facture en attente de réception du service achats', type: 'note' },
        { id: '2', auteur: 'Diallo Amadou', date: '2025-01-16', contenu: 'Confirmer avec le fournisseur le montant exact', type: 'question' }
      ],
      documents: [
        { id: '1', nom: 'Releve_SODECI_012025.pdf', type: 'PDF', taille: '245 KB', dateAjout: '2025-01-15' },
        { id: '2', nom: 'Facture_FA-2025-0145.pdf', type: 'PDF', taille: '156 KB', dateAjout: '2025-01-16' }
      ],
      ecritureProposee: {
        id: 'PAJE-001',
        type: 'PAJE',
        lignes: [
          { compte: '601100', libelle: 'Achats de marchandises', debit: 4500000, credit: 0 },
          { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 4500000 }
        ],
        montantTotal: 4500000,
        statut: 'propose',
        justification: 'Régularisation facture fournisseur SODECI - Période janvier 2025'
      }
    },
    {
      id: 'REV-2025-002',
      compte: '521100',
      libelleCompte: 'Banque SGBCI - Compte courant',
      classeCompte: '5',
      type: 'correction',
      statut: 'valide',
      priorite: 'moyenne',
      montant: 1250000,
      montantDebit: 1250000,
      montantCredit: 0,
      impact: 'Trésorerie',
      description: 'Correction des frais bancaires mal comptabilisés - Double enregistrement commission virement',
      dateDetection: '2025-01-10',
      responsable: 'Koné Jean',
      assertions: ['exactitude', 'existence'],
      niveauRisque: 'modere',
      typeTest: 'substantif',
      referentiel: 'SYSCOHADA',
      commentaires: [
        { id: '1', auteur: 'Koné Jean', date: '2025-01-10', contenu: 'Correction effectuée et validée', type: 'validation' }
      ],
      documents: [
        { id: '1', nom: 'Releve_bancaire_SGBCI_01.pdf', type: 'PDF', taille: '890 KB', dateAjout: '2025-01-10' }
      ]
    },
    {
      id: 'REV-2025-003',
      compte: '311000',
      libelleCompte: 'Stocks de marchandises',
      classeCompte: '3',
      type: 'ajustement',
      statut: 'en_attente',
      priorite: 'critique',
      montant: 12500000,
      montantDebit: 0,
      montantCredit: 12500000,
      impact: 'Marge commerciale et résultat d\'exploitation',
      description: 'Ajustement suite à inventaire physique - Écart de 2.5% sur le stock de marchandises diverses',
      dateDetection: '2025-01-18',
      dateEcheance: '2025-01-20',
      responsable: 'Bamba Sophie',
      assertions: ['existence', 'valorisation', 'exhaustivite'],
      niveauRisque: 'tres_eleve',
      typeTest: 'inspection',
      referentiel: 'SYSCOHADA',
      documents: [
        { id: '1', nom: 'PV_inventaire_physique.pdf', type: 'PDF', taille: '1.2 MB', dateAjout: '2025-01-18' },
        { id: '2', nom: 'Ecart_stock_detail.xlsx', type: 'Excel', taille: '345 KB', dateAjout: '2025-01-18' }
      ],
      ecritureProposee: {
        id: 'PAJE-002',
        type: 'PAJE',
        lignes: [
          { compte: '603100', libelle: 'Variation de stocks de marchandises', debit: 12500000, credit: 0 },
          { compte: '311000', libelle: 'Stocks de marchandises', debit: 0, credit: 12500000 }
        ],
        montantTotal: 12500000,
        statut: 'propose',
        justification: 'Ajustement stock suite inventaire physique du 15/01/2025'
      }
    },
    {
      id: 'REV-2025-004',
      compte: '411100',
      libelleCompte: 'Clients - Ventes de biens',
      classeCompte: '4',
      type: 'regularisation',
      statut: 'en_cours',
      priorite: 'haute',
      montant: 6780000,
      montantDebit: 0,
      montantCredit: 6780000,
      impact: 'Créances clients et provision pour dépréciation',
      description: 'Régularisation provision créance douteuse - Client SODEPAL en redressement judiciaire',
      dateDetection: '2025-01-12',
      dateEcheance: '2025-01-28',
      responsable: 'Touré Pierre',
      assertions: ['valorisation', 'droits_obligations'],
      niveauRisque: 'eleve',
      typeTest: 'circularisation',
      referentiel: 'SYSCOHADA',
      commentaires: [
        { id: '1', auteur: 'Touré Pierre', date: '2025-01-12', contenu: 'Client en procédure de redressement judiciaire depuis le 05/01/2025', type: 'note' }
      ],
      documents: [
        { id: '1', nom: 'Balance_agee_clients.pdf', type: 'PDF', taille: '567 KB', dateAjout: '2025-01-12' },
        { id: '2', nom: 'Jugement_RJ_SODEPAL.pdf', type: 'PDF', taille: '234 KB', dateAjout: '2025-01-13' }
      ]
    },
    {
      id: 'REV-2025-005',
      compte: '281100',
      libelleCompte: 'Amortissements des immobilisations corporelles',
      classeCompte: '2',
      type: 'correction',
      statut: 'rejete',
      priorite: 'basse',
      montant: 540000,
      montantDebit: 540000,
      montantCredit: 0,
      impact: 'Dotations aux amortissements',
      description: 'Correction calcul amortissement dégressif - Matériel informatique acquis en N-1',
      dateDetection: '2025-01-05',
      responsable: 'Kouamé Marie',
      assertions: ['valorisation', 'exactitude'],
      niveauRisque: 'faible',
      typeTest: 'recalcul',
      referentiel: 'SYSCOHADA',
      commentaires: [
        { id: '1', auteur: 'Diallo Amadou', date: '2025-01-06', contenu: 'Calcul initial correct - Révision non nécessaire', type: 'validation' }
      ]
    },
    {
      id: 'REV-2025-006',
      compte: '701100',
      libelleCompte: 'Ventes de marchandises - Zone UEMOA',
      classeCompte: '7',
      type: 'anomalie',
      statut: 'en_cours',
      priorite: 'critique',
      montant: 25000000,
      montantDebit: 25000000,
      montantCredit: 0,
      impact: 'Chiffre d\'affaires et TVA collectée',
      description: 'Factures de décembre 2024 comptabilisées en janvier 2025 - Problème de cut-off',
      dateDetection: '2025-01-20',
      dateEcheance: '2025-01-22',
      responsable: 'Bamba Sophie',
      assertions: ['cut_off', 'exhaustivite', 'exactitude'],
      niveauRisque: 'tres_eleve',
      typeTest: 'substantif',
      referentiel: 'SYSCOHADA',
      ecritureProposee: {
        id: 'PAJE-003',
        type: 'PAJE',
        lignes: [
          { compte: '701100', libelle: 'Ventes de marchandises', debit: 25000000, credit: 0 },
          { compte: '411100', libelle: 'Clients', debit: 0, credit: 25000000 }
        ],
        montantTotal: 25000000,
        statut: 'propose',
        justification: 'Extourne ventes décembre comptabilisées à tort en janvier'
      }
    }
  ]);

  // Lead Schedules par cycle
  const [leadSchedules] = useState<LeadSchedule[]>([
    {
      id: 'LS-001',
      cycle: 'Trésorerie',
      comptes: ['521100', '521200', '531000', '571000'],
      soldePrecedent: 125000000,
      soldeActuel: 142500000,
      variation: 17500000,
      variationPourcent: 14,
      seuilSignificativite: 5000000,
      risqueInherent: 'modere',
      risqueControle: 'faible',
      risqueDetection: 'modere',
      assertions: [
        { code: 'existence', libelle: 'Existence', description: 'Les soldes bancaires existent', risque: 'faible', testEffectue: true, conclusion: 'Confirmations bancaires obtenues' },
        { code: 'exhaustivite', libelle: 'Exhaustivité', description: 'Tous les comptes sont enregistrés', risque: 'faible', testEffectue: true, conclusion: 'Rapprochement bancaire effectué' },
        { code: 'valorisation', libelle: 'Valorisation', description: 'Conversion devises correcte', risque: 'modere', testEffectue: true, conclusion: 'Cours de clôture vérifié' }
      ],
      statutRevue: 'termine',
      preparePar: 'Kouamé Marie',
      revisePar: 'Diallo Amadou',
      datePreparation: '2025-01-15',
      dateRevision: '2025-01-18',
      conclusion: 'Cycle trésorerie correctement présenté. Ajustements mineurs effectués.',
      recommandations: ['Améliorer la fréquence des rapprochements bancaires', 'Mettre en place un contrôle des virements > 10M FCFA']
    },
    {
      id: 'LS-002',
      cycle: 'Clients et Comptes rattachés',
      comptes: ['411100', '411200', '416000', '491000'],
      soldePrecedent: 350000000,
      soldeActuel: 425000000,
      variation: 75000000,
      variationPourcent: 21.4,
      seuilSignificativite: 10000000,
      risqueInherent: 'eleve',
      risqueControle: 'modere',
      risqueDetection: 'eleve',
      assertions: [
        { code: 'existence', libelle: 'Existence', description: 'Les créances existent', risque: 'modere', testEffectue: true, conclusion: 'Circularisation en cours - 65% de réponses' },
        { code: 'valorisation', libelle: 'Valorisation', description: 'Provisions adéquates', risque: 'eleve', testEffectue: true, conclusion: 'Provision à ajuster de 6.78M FCFA' },
        { code: 'cut_off', libelle: 'Cut-off', description: 'Bonnes périodes', risque: 'tres_eleve', testEffectue: false }
      ],
      statutRevue: 'en_cours',
      preparePar: 'Touré Pierre',
      datePreparation: '2025-01-16',
      recommandations: ['Finaliser circularisation clients', 'Réviser politique de provisionnement']
    },
    {
      id: 'LS-003',
      cycle: 'Stocks',
      comptes: ['311000', '321000', '331000', '391000'],
      soldePrecedent: 180000000,
      soldeActuel: 167500000,
      variation: -12500000,
      variationPourcent: -6.9,
      seuilSignificativite: 8000000,
      risqueInherent: 'tres_eleve',
      risqueControle: 'eleve',
      risqueDetection: 'eleve',
      assertions: [
        { code: 'existence', libelle: 'Existence', description: 'Les stocks existent physiquement', risque: 'eleve', testEffectue: true, conclusion: 'Inventaire physique assisté - écart 2.5%' },
        { code: 'valorisation', libelle: 'Valorisation', description: 'Méthode CUMP correcte', risque: 'modere', testEffectue: true, conclusion: 'CUMP vérifié sur échantillon' },
        { code: 'exhaustivite', libelle: 'Exhaustivité', description: 'Tous les mouvements enregistrés', risque: 'eleve', testEffectue: false }
      ],
      statutRevue: 'en_cours',
      preparePar: 'Bamba Sophie',
      datePreparation: '2025-01-18'
    },
    {
      id: 'LS-004',
      cycle: 'Fournisseurs',
      comptes: ['401100', '401200', '408000', '409000'],
      soldePrecedent: 85000000,
      soldeActuel: 112000000,
      variation: 27000000,
      variationPourcent: 31.8,
      seuilSignificativite: 5000000,
      risqueInherent: 'modere',
      risqueControle: 'faible',
      risqueDetection: 'modere',
      assertions: [
        { code: 'exhaustivite', libelle: 'Exhaustivité', description: 'Toutes les dettes enregistrées', risque: 'eleve', testEffectue: true, conclusion: 'Facture SODECI 4.5M non comptabilisée' },
        { code: 'valorisation', libelle: 'Valorisation', description: 'Montants corrects', risque: 'faible', testEffectue: true, conclusion: 'RAS' }
      ],
      statutRevue: 'en_cours',
      preparePar: 'Kouamé Marie',
      datePreparation: '2025-01-15'
    }
  ]);

  // Matrice des risques
  const [risquesControles] = useState<RisqueControle[]>([
    {
      id: 'RC-001',
      cycle: 'Ventes / Clients',
      risque: 'Factures fictives ou erronées',
      assertion: 'existence',
      probabilite: 'modere',
      impact: 'eleve',
      controleExistant: 'Validation hiérarchique des factures > 5M FCFA',
      efficaciteControle: 'efficace',
      testControle: 'Échantillon de 25 factures testées',
      recommandation: 'Étendre le contrôle aux factures > 2M FCFA'
    },
    {
      id: 'RC-002',
      cycle: 'Ventes / Clients',
      risque: 'Cut-off incorrect des ventes',
      assertion: 'cut_off',
      probabilite: 'eleve',
      impact: 'tres_eleve',
      controleExistant: 'Contrôle mensuel des BL non facturés',
      efficaciteControle: 'partiellement_efficace',
      testControle: 'Analyse des factures de janvier N+1',
      recommandation: 'Automatiser le contrôle cut-off en fin de mois'
    },
    {
      id: 'RC-003',
      cycle: 'Achats / Fournisseurs',
      risque: 'Factures non comptabilisées',
      assertion: 'exhaustivite',
      probabilite: 'modere',
      impact: 'eleve',
      controleExistant: 'Rapprochement mensuel avec relevés fournisseurs',
      efficaciteControle: 'efficace',
      testControle: 'Circularisation fournisseurs principaux'
    },
    {
      id: 'RC-004',
      cycle: 'Stocks',
      risque: 'Écarts d\'inventaire non détectés',
      assertion: 'existence',
      probabilite: 'eleve',
      impact: 'eleve',
      controleExistant: 'Inventaire physique annuel',
      efficaciteControle: 'partiellement_efficace',
      testControle: 'Participation à l\'inventaire physique',
      recommandation: 'Mettre en place des inventaires tournants mensuels'
    },
    {
      id: 'RC-005',
      cycle: 'Trésorerie',
      risque: 'Détournement de fonds',
      assertion: 'existence',
      probabilite: 'faible',
      impact: 'tres_eleve',
      controleExistant: 'Séparation des fonctions + double signature > 10M',
      efficaciteControle: 'efficace',
      testControle: 'Test des rapprochements bancaires'
    }
  ]);

  // ==================== STATISTIQUES ====================

  const getStatistiques = () => {
    const total = revisions.length;
    const enCours = revisions.filter(r => r.statut === 'en_cours' || r.statut === 'en_attente').length;
    const validees = revisions.filter(r => r.statut === 'valide').length;
    const critiques = revisions.filter(r => r.priorite === 'critique').length;
    const montantTotal = revisions.reduce((sum, r) => sum + r.montant, 0);
    const montantAjustements = revisions
      .filter(r => r.ecritureProposee && r.ecritureProposee.statut === 'propose')
      .reduce((sum, r) => sum + (r.ecritureProposee?.montantTotal || 0), 0);
    const tauxCompletion = total > 0 ? Math.round((validees / total) * 100) : 0;

    return { total, enCours, validees, critiques, montantTotal, montantAjustements, tauxCompletion };
  };

  const stats = getStatistiques();

  // ==================== HANDLERS ====================

  const handleCreateRevision = () => {
    setShowCreateModal(true);
    toast.success('Ouverture du formulaire de création');
  };

  const handleEditRevision = (revision: RevisionItem) => {
    setSelectedRevision(revision);
    setShowEditModal(true);
  };

  const handleValidateRevision = (revision: RevisionItem) => {
    toast.success(`Révision ${revision.id} validée avec succès`);
  };

  const handleRejectRevision = (revision: RevisionItem) => {
    toast.error(`Révision ${revision.id} rejetée`);
  };

  const handleCreateAjustement = (revision: RevisionItem) => {
    setSelectedRevision(revision);
    setShowAjustementModal(true);
  };

  const handleExportRevisions = () => {
    toast.success('Export des révisions en cours...');
  };

  const handleLancerAnalyseIA = () => {
    toast.success('Analyse IA des anomalies en cours...');
  };

  const openDetail = (revision: RevisionItem) => {
    setSelectedRevision(revision);
    setShowDetailModal(true);
  };

  const openLeadScheduleDetail = (ls: LeadSchedule) => {
    setSelectedLeadSchedule(ls);
    setShowLeadScheduleModal(true);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  // ==================== FILTRAGE ====================

  const filteredRevisions = revisions.filter(revision => {
    let matchTab = true;
    let matchType = true;
    let matchPriorite = true;
    let matchCycle = true;
    let matchAssertion = true;
    let matchSearch = true;

    if (activeTab === 'en-cours') {
      matchTab = revision.statut === 'en_cours' || revision.statut === 'en_attente';
    } else if (activeTab === 'validees') {
      matchTab = revision.statut === 'valide';
    } else if (activeTab === 'rejetees') {
      matchTab = revision.statut === 'rejete';
    } else if (activeTab === 'critiques') {
      matchTab = revision.priorite === 'critique' || revision.niveauRisque === 'tres_eleve';
    }

    if (filterType !== 'tous') {
      matchType = revision.type === filterType;
    }

    if (filterPriorite !== 'tous') {
      matchPriorite = revision.priorite === filterPriorite;
    }

    if (filterCycle !== 'tous') {
      const cycle = cyclesRevision.find(c => c.id === filterCycle);
      if (cycle) {
        matchCycle = cycle.comptes.some(prefix => revision.compte.startsWith(prefix));
      }
    }

    if (filterAssertion !== 'tous') {
      matchAssertion = revision.assertions.includes(filterAssertion as AssertionAudit);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matchSearch =
        revision.id.toLowerCase().includes(query) ||
        revision.compte.toLowerCase().includes(query) ||
        revision.libelleCompte.toLowerCase().includes(query) ||
        revision.description.toLowerCase().includes(query);
    }

    return matchTab && matchType && matchPriorite && matchCycle && matchAssertion && matchSearch;
  });

  // ==================== HELPERS ====================

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'anomalie': return 'text-red-700 bg-red-50 border-red-200';
      case 'correction': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'ajustement': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'regularisation': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'reclassement': return 'text-cyan-700 bg-cyan-50 border-cyan-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'critique': return 'bg-red-100 text-red-800 border border-red-300';
      case 'haute': return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'moyenne': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'basse': return 'bg-green-100 text-green-800 border border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRisqueColor = (risque: NiveauRisque) => {
    switch (risque) {
      case 'tres_eleve': return 'bg-red-600 text-white';
      case 'eleve': return 'bg-orange-500 text-white';
      case 'modere': return 'bg-yellow-500 text-white';
      case 'faible': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'valide': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejete': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'en_cours': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'revise': return <Eye className="w-5 h-5 text-purple-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatutRevueColor = (statut: StatutRevue) => {
    switch (statut) {
      case 'approuve': return 'bg-green-100 text-green-800';
      case 'revise': return 'bg-blue-100 text-blue-800';
      case 'termine': return 'bg-purple-100 text-purple-800';
      case 'en_cours': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
  };

  // ==================== RENDER ====================

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen">
      {/* Header Principal */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#191919] flex items-center gap-3">
              <FileSearch className="w-7 h-7 text-[#6A8A82]" />
              Module de Révisions Comptables
            </h1>
            <p className="text-[#767676] mt-1">
              Conforme aux normes ISA (International Standards on Auditing) et SYSCOHADA révisé
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLancerAnalyseIA}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2"
            >
              <Bot className="w-4 h-4" />
              <span>Analyse IA</span>
            </button>
            <button
              onClick={handleExportRevisions}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72] flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Exporter</span>
            </button>
            <button
              onClick={handleCreateRevision}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72] flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle révision</span>
            </button>
          </div>
        </div>

        {/* Onglets Principaux */}
        <div className="flex items-center space-x-1 mb-6 border-b border-[#E8E8E8]">
          {[
            { id: 'revisions', label: 'Points de Révision', icon: FileSearch },
            { id: 'lead_schedule', label: 'Lead Schedules', icon: Layers },
            { id: 'risques', label: 'Matrice des Risques', icon: Shield },
            { id: 'ajustements', label: 'Ajustements (PAJE/AAJE)', icon: Scale },
            { id: 'analytique', label: 'Revue Analytique', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id as typeof activeMainTab)}
              className={`px-4 py-3 flex items-center space-x-2 font-medium border-b-2 transition-colors ${
                activeMainTab === tab.id
                  ? 'border-[#6A8A82] text-[#6A8A82]'
                  : 'border-transparent text-[#767676] hover:text-[#191919]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700">Total Points</span>
              <FileSearch className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-orange-700">En cours</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-900">{stats.enCours}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700">Validées</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.validees}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-red-700">Critiques</span>
              <AlertOctagon className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-900">{stats.critiques}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-700">Impact Total</span>
              <TrendingDown className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-900">{formatMontant(stats.montantTotal)}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg p-4 border border-cyan-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-cyan-700">PAJE Proposés</span>
              <Scale className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-lg font-bold text-cyan-900">{formatMontant(stats.montantAjustements)}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-indigo-700">Complétion</span>
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-900">{stats.tauxCompletion}%</p>
            <Progress value={stats.tauxCompletion} className="h-1 mt-2" />
          </div>
        </div>
      </div>

      {/* ==================== TAB: REVISIONS ==================== */}
      {activeMainTab === 'revisions' && (
        <>
          {/* Filtres et recherche */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Onglets de statut */}
                <div className="flex items-center space-x-1">
                  {[
                    { id: 'tous', label: 'Toutes' },
                    { id: 'en-cours', label: 'En cours' },
                    { id: 'critiques', label: 'Critiques' },
                    { id: 'validees', label: 'Validées' },
                    { id: 'rejetees', label: 'Rejetées' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-[#6A8A82] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Filtres */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="tous">Tous types</option>
                  <option value="anomalie">Anomalies</option>
                  <option value="correction">Corrections</option>
                  <option value="ajustement">Ajustements</option>
                  <option value="regularisation">Régularisations</option>
                  <option value="reclassement">Reclassements</option>
                </select>

                <select
                  value={filterCycle}
                  onChange={(e) => setFilterCycle(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="tous">Tous cycles</option>
                  {cyclesRevision.map(cycle => (
                    <option key={cycle.id} value={cycle.id}>{cycle.label}</option>
                  ))}
                </select>

                <select
                  value={filterAssertion}
                  onChange={(e) => setFilterAssertion(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="tous">Toutes assertions</option>
                  {Object.entries(assertionsAudit).map(([code, info]) => (
                    <option key={code} value={code}>{info.libelle}</option>
                  ))}
                </select>

                <select
                  value={filterPriorite}
                  onChange={(e) => setFilterPriorite(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="tous">Toutes priorités</option>
                  <option value="critique">Critique</option>
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="basse">Basse</option>
                </select>
              </div>

              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par compte, référence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm w-64"
                />
              </div>
            </div>
          </div>

          {/* Liste des révisions */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-4 font-semibold text-[#191919]">Statut</th>
                    <th className="text-left p-4 font-semibold text-[#191919]">Réf.</th>
                    <th className="text-left p-4 font-semibold text-[#191919]">Compte</th>
                    <th className="text-left p-4 font-semibold text-[#191919]">Type</th>
                    <th className="text-left p-4 font-semibold text-[#191919]">Description</th>
                    <th className="text-left p-4 font-semibold text-[#191919]">Assertions ISA</th>
                    <th className="text-right p-4 font-semibold text-[#191919]">Montant</th>
                    <th className="text-center p-4 font-semibold text-[#191919]">Risque</th>
                    <th className="text-left p-4 font-semibold text-[#191919]">Responsable</th>
                    <th className="text-center p-4 font-semibold text-[#191919]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevisions.map((revision) => (
                    <tr
                      key={revision.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => openDetail(revision)}
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {getStatutIcon(revision.statut)}
                          <span className={`px-2 py-0.5 rounded text-xs ${getPrioriteColor(revision.priorite)}`}>
                            {revision.priorite}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm font-medium text-[#6A8A82]">{revision.id}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-mono text-sm text-[#191919]">{revision.compte}</p>
                          <p className="text-xs text-[#767676] max-w-[150px] truncate">{revision.libelleCompte}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getTypeColor(revision.type)}`}>
                          {revision.type}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        <p className="text-sm text-[#191919] line-clamp-2">{revision.description}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {revision.assertions.slice(0, 2).map(assertion => (
                            <span
                              key={assertion}
                              className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs"
                              title={assertionsAudit[assertion]?.description}
                            >
                              {assertion.substring(0, 4).toUpperCase()}
                            </span>
                          ))}
                          {revision.assertions.length > 2 && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{revision.assertions.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono font-semibold text-[#191919]">
                          {formatMontant(revision.montant)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRisqueColor(revision.niveauRisque)}`}>
                          {revision.niveauRisque.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-[#191919]">{revision.responsable || '-'}</p>
                        {revision.dateEcheance && (
                          <p className="text-xs text-[#767676]">
                            Éch: {new Date(revision.dateEcheance).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetail(revision); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditRevision(revision); }}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {revision.statut !== 'valide' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCreateAjustement(revision); }}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                              title="Créer PAJE"
                            >
                              <Scale className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRevisions.length === 0 && (
                <div className="text-center py-12">
                  <FileSearch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune révision trouvée</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== TAB: LEAD SCHEDULES ==================== */}
      {activeMainTab === 'lead_schedule' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#191919] flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#6A8A82]" />
                  Lead Schedules par Cycle
                </h2>
                <p className="text-sm text-[#767676]">
                  Feuilles de travail principales selon la méthodologie ISA
                </p>
              </div>
              <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72] flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Nouveau cycle</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {leadSchedules.map((ls) => (
              <div
                key={ls.id}
                className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openLeadScheduleDetail(ls)}
              >
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-[#191919]">{ls.cycle}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatutRevueColor(ls.statutRevue)}`}>
                      {ls.statutRevue.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[#767676] font-mono">
                    Comptes: {ls.comptes.join(', ')}
                  </p>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-[#767676]">Solde N-1</p>
                      <p className="font-mono font-semibold">{formatMontant(ls.soldePrecedent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#767676]">Solde N</p>
                      <p className="font-mono font-semibold">{formatMontant(ls.soldeActuel)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#767676]">Variation</p>
                      <p className={`font-mono font-semibold ${ls.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {ls.variation >= 0 ? '+' : ''}{formatMontant(ls.variation)} ({ls.variationPourcent}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#767676]">Seuil significativité</p>
                      <p className="font-mono text-sm">{formatMontant(ls.seuilSignificativite)}</p>
                    </div>
                  </div>

                  {/* Évaluation des risques */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#767676]">RI:</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getRisqueColor(ls.risqueInherent)}`}>
                        {ls.risqueInherent}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#767676]">RC:</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getRisqueColor(ls.risqueControle)}`}>
                        {ls.risqueControle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#767676]">RD:</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${getRisqueColor(ls.risqueDetection)}`}>
                        {ls.risqueDetection}
                      </span>
                    </div>
                  </div>

                  {/* Assertions testées */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[#767676]">Assertions testées:</p>
                    <div className="flex flex-wrap gap-2">
                      {ls.assertions.map((assertion) => (
                        <div
                          key={assertion.code}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                            assertion.testEffectue
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-200'
                          }`}
                        >
                          {assertion.testEffectue ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{assertion.libelle}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-[#767676]">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{ls.preparePar || 'Non assigné'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{ls.datePreparation || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB: MATRICE DES RISQUES ==================== */}
      {activeMainTab === 'risques' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#191919] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#6A8A82]" />
                  Matrice des Risques et Contrôles
                </h2>
                <p className="text-sm text-[#767676]">
                  Évaluation selon ISA 315 - Identification et évaluation des risques
                </p>
              </div>
              <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72] flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Nouveau risque</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-[#191919]">Cycle</th>
                  <th className="text-left p-4 font-semibold text-[#191919]">Risque Identifié</th>
                  <th className="text-center p-4 font-semibold text-[#191919]">Assertion</th>
                  <th className="text-center p-4 font-semibold text-[#191919]">Probabilité</th>
                  <th className="text-center p-4 font-semibold text-[#191919]">Impact</th>
                  <th className="text-left p-4 font-semibold text-[#191919]">Contrôle Existant</th>
                  <th className="text-center p-4 font-semibold text-[#191919]">Efficacité</th>
                  <th className="text-left p-4 font-semibold text-[#191919]">Recommandation</th>
                </tr>
              </thead>
              <tbody>
                {risquesControles.map((rc) => (
                  <tr key={rc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 font-medium text-[#191919]">{rc.cycle}</td>
                    <td className="p-4 text-sm">{rc.risque}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                        {assertionsAudit[rc.assertion]?.libelle || rc.assertion}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getRisqueColor(rc.probabilite)}`}>
                        {rc.probabilite}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getRisqueColor(rc.impact)}`}>
                        {rc.impact}
                      </span>
                    </td>
                    <td className="p-4 text-sm max-w-xs">{rc.controleExistant}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        rc.efficaciteControle === 'efficace'
                          ? 'bg-green-100 text-green-800'
                          : rc.efficaciteControle === 'partiellement_efficace'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rc.efficaciteControle.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[#767676] max-w-xs">{rc.recommandation || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB: AJUSTEMENTS (PAJE/AAJE) ==================== */}
      {activeMainTab === 'ajustements' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#191919] flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#6A8A82]" />
                  Écritures d'Ajustement (PAJE / AAJE)
                </h2>
                <p className="text-sm text-[#767676]">
                  Proposed Adjusting Journal Entries / Actual Adjusting Journal Entries
                </p>
              </div>
            </div>

            {/* Résumé des ajustements */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-orange-700">PAJE Proposés</p>
                <p className="text-2xl font-bold text-orange-900">
                  {revisions.filter(r => r.ecritureProposee?.statut === 'propose').length}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-700">AAJE Acceptés</p>
                <p className="text-2xl font-bold text-green-900">
                  {revisions.filter(r => r.ecritureProposee?.statut === 'accepte').length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700">Comptabilisés</p>
                <p className="text-2xl font-bold text-blue-900">
                  {revisions.filter(r => r.ecritureProposee?.statut === 'comptabilise').length}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-700">Montant Total</p>
                <p className="text-lg font-bold text-purple-900">
                  {formatMontant(stats.montantAjustements)}
                </p>
              </div>
            </div>
          </div>

          {/* Liste des PAJE */}
          <div className="space-y-4">
            {revisions.filter(r => r.ecritureProposee).map((revision) => (
              <div key={revision.id} className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      revision.ecritureProposee?.type === 'PAJE' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {revision.ecritureProposee?.type}
                    </span>
                    <div>
                      <p className="font-medium text-[#191919]">{revision.ecritureProposee?.id}</p>
                      <p className="text-sm text-[#767676]">Révision: {revision.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      revision.ecritureProposee?.statut === 'propose' ? 'bg-orange-100 text-orange-800' :
                      revision.ecritureProposee?.statut === 'accepte' ? 'bg-green-100 text-green-800' :
                      revision.ecritureProposee?.statut === 'comptabilise' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {revision.ecritureProposee?.statut}
                    </span>
                    <p className="font-mono font-bold text-[#191919]">
                      {formatMontant(revision.ecritureProposee?.montantTotal || 0)}
                    </p>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm text-[#767676] mb-3">{revision.ecritureProposee?.justification}</p>
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-[#767676] border-b border-gray-100">
                        <th className="text-left py-2">Compte</th>
                        <th className="text-left py-2">Libellé</th>
                        <th className="text-right py-2">Débit</th>
                        <th className="text-right py-2">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revision.ecritureProposee?.lignes.map((ligne, index) => (
                        <tr key={index} className="text-sm">
                          <td className="py-2 font-mono">{ligne.compte}</td>
                          <td className="py-2">{ligne.libelle}</td>
                          <td className="py-2 text-right font-mono">
                            {ligne.debit > 0 ? formatMontant(ligne.debit) : '-'}
                          </td>
                          <td className="py-2 text-right font-mono">
                            {ligne.credit > 0 ? formatMontant(ligne.credit) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {revision.ecritureProposee?.statut === 'propose' && (
                  <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                    <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">
                      Refuser
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Accepter
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== TAB: REVUE ANALYTIQUE ==================== */}
      {activeMainTab === 'analytique' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#191919] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#6A8A82]" />
                  Procédures Analytiques (ISA 520)
                </h2>
                <p className="text-sm text-[#767676]">
                  Analyse des variations significatives et des ratios clés
                </p>
              </div>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Lancer analyse IA</span>
              </button>
            </div>
          </div>

          {/* Variations significatives */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm p-6">
            <h3 className="font-bold text-[#191919] mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Variations Significatives Détectées
            </h3>
            <div className="space-y-4">
              {leadSchedules.filter(ls => Math.abs(ls.variationPourcent) > 15).map((ls) => (
                <div key={ls.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-[#191919]">{ls.cycle}</p>
                    <p className="text-sm text-[#767676]">
                      {formatMontant(ls.soldePrecedent)} → {formatMontant(ls.soldeActuel)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${ls.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {ls.variation >= 0 ? '+' : ''}{ls.variationPourcent}%
                    </p>
                    <p className="text-sm text-[#767676]">
                      {ls.variation >= 0 ? '+' : ''}{formatMontant(ls.variation)}
                    </p>
                  </div>
                  <button className="px-3 py-2 bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-100">
                    Analyser
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ratios SYSCOHADA */}
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm p-6">
            <h3 className="font-bold text-[#191919] mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Ratios Clés SYSCOHADA
            </h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { nom: 'Ratio de liquidité générale', valeur: '1.45', norme: '> 1', statut: 'ok' },
                { nom: 'Ratio d\'endettement', valeur: '42%', norme: '< 50%', statut: 'ok' },
                { nom: 'Rotation des stocks (jours)', valeur: '85', norme: '< 60', statut: 'attention' },
                { nom: 'Délai clients (jours)', valeur: '72', norme: '< 45', statut: 'alerte' },
                { nom: 'Délai fournisseurs (jours)', valeur: '58', norme: '> 30', statut: 'ok' },
                { nom: 'Marge brute', valeur: '28.5%', norme: '> 25%', statut: 'ok' },
                { nom: 'Rentabilité des capitaux', valeur: '12.3%', norme: '> 10%', statut: 'ok' },
                { nom: 'Capacité d\'autofinancement', valeur: '15.2M', norme: '> 0', statut: 'ok' }
              ].map((ratio, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    ratio.statut === 'ok' ? 'bg-green-50 border-green-200' :
                    ratio.statut === 'attention' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  <p className="text-xs text-[#767676] mb-1">{ratio.nom}</p>
                  <p className="text-xl font-bold text-[#191919]">{ratio.valeur}</p>
                  <p className="text-xs text-[#767676]">Norme: {ratio.norme}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DETAIL REVISION ==================== */}
      {showDetailModal && selectedRevision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-[#6A8A82]/10 text-[#6A8A82] p-2 rounded-lg">
                  <FileSearch className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#191919]">Détail de la Révision</h2>
                  <p className="text-sm text-[#767676]">{selectedRevision.id} - {selectedRevision.referentiel}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Section Informations Générales */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('general')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                  >
                    <h3 className="text-sm font-bold text-[#191919] uppercase tracking-wide flex items-center gap-2">
                      <span className="w-1 h-4 bg-[#6A8A82] rounded"></span>
                      Informations Générales
                    </h3>
                    {expandedSections.includes('general') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.includes('general') && (
                    <div className="p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Compte</p>
                          <p className="font-mono font-medium">{selectedRevision.compte}</p>
                          <p className="text-sm text-[#767676]">{selectedRevision.libelleCompte}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Type</p>
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getTypeColor(selectedRevision.type)}`}>
                            {selectedRevision.type}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Statut</p>
                          <div className="flex items-center gap-2">
                            {getStatutIcon(selectedRevision.statut)}
                            <span className="text-sm">{selectedRevision.statut.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Priorité</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPrioriteColor(selectedRevision.priorite)}`}>
                            {selectedRevision.priorite}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Niveau de Risque</p>
                          <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getRisqueColor(selectedRevision.niveauRisque)}`}>
                            {selectedRevision.niveauRisque.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Type de Test</p>
                          <p className="text-sm capitalize">{selectedRevision.typeTest || 'Non défini'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Montant</p>
                          <p className="text-xl font-bold text-[#191919]">{formatMontant(selectedRevision.montant)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Impact</p>
                          <p className="text-sm">{selectedRevision.impact}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#767676] mb-1">Responsable</p>
                          <p className="text-sm">{selectedRevision.responsable || '-'}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-xs text-[#767676] mb-1">Description</p>
                        <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedRevision.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section Assertions ISA */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('assertions')}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                  >
                    <h3 className="text-sm font-bold text-[#191919] uppercase tracking-wide flex items-center gap-2">
                      <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                      Assertions d'Audit (ISA)
                    </h3>
                    {expandedSections.includes('assertions') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  {expandedSections.includes('assertions') && (
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {selectedRevision.assertions.map((assertion) => (
                          <div key={assertion} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                            <Target className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-indigo-900">{assertionsAudit[assertion]?.libelle}</p>
                              <p className="text-xs text-indigo-700 mt-1">{assertionsAudit[assertion]?.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section Écriture Proposée */}
                {selectedRevision.ecritureProposee && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('comptable')}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                    >
                      <h3 className="text-sm font-bold text-[#191919] uppercase tracking-wide flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded"></span>
                        Écriture d'Ajustement ({selectedRevision.ecritureProposee.type})
                      </h3>
                      {expandedSections.includes('comptable') ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    {expandedSections.includes('comptable') && (
                      <div className="p-4">
                        <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800">{selectedRevision.ecritureProposee.justification}</p>
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-[#767676] border-b border-gray-200">
                              <th className="text-left py-2 px-3">Compte</th>
                              <th className="text-left py-2 px-3">Libellé</th>
                              <th className="text-right py-2 px-3">Débit</th>
                              <th className="text-right py-2 px-3">Crédit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedRevision.ecritureProposee.lignes.map((ligne, index) => (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="py-2 px-3 font-mono text-sm">{ligne.compte}</td>
                                <td className="py-2 px-3 text-sm">{ligne.libelle}</td>
                                <td className="py-2 px-3 text-right font-mono text-sm">
                                  {ligne.debit > 0 ? formatMontant(ligne.debit) : ''}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-sm">
                                  {ligne.credit > 0 ? formatMontant(ligne.credit) : ''}
                                </td>
                              </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                              <td colSpan={2} className="py-2 px-3 text-right">Total:</td>
                              <td className="py-2 px-3 text-right font-mono">{formatMontant(selectedRevision.ecritureProposee.montantTotal)}</td>
                              <td className="py-2 px-3 text-right font-mono">{formatMontant(selectedRevision.ecritureProposee.montantTotal)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Commentaires */}
                {selectedRevision.commentaires && selectedRevision.commentaires.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Commentaires ({selectedRevision.commentaires.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedRevision.commentaires.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            comment.type === 'validation' ? 'bg-green-100 text-green-600' :
                            comment.type === 'question' ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{comment.auteur}</span>
                              <span className="text-xs text-[#767676]">{comment.date}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                comment.type === 'validation' ? 'bg-green-100 text-green-700' :
                                comment.type === 'question' ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {comment.type}
                              </span>
                            </div>
                            <p className="text-sm text-[#191919]">{comment.contenu}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents */}
                {selectedRevision.documents && selectedRevision.documents.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documents Associés ({selectedRevision.documents.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedRevision.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{doc.nom}</p>
                              <p className="text-xs text-[#767676]">{doc.type} - {doc.taille}</p>
                            </div>
                          </div>
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-between">
              <div className="flex gap-3">
                <button
                  onClick={() => toast.success('Impression en cours...')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={() => toast.success('Export en cours...')}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter</span>
                </button>
              </div>
              <div className="flex gap-3">
                {selectedRevision.statut === 'en_attente' && (
                  <>
                    <button
                      onClick={() => { handleValidateRevision(selectedRevision); setShowDetailModal(false); }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Valider</span>
                    </button>
                    <button
                      onClick={() => { handleRejectRevision(selectedRevision); setShowDetailModal(false); }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rejeter</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL LEAD SCHEDULE ==================== */}
      {showLeadScheduleModal && selectedLeadSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-[#6A8A82]/10 text-[#6A8A82] p-2 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#191919]">Lead Schedule - {selectedLeadSchedule.cycle}</h2>
                  <p className="text-sm text-[#767676]">Feuille de travail principale</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeadScheduleModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Soldes et variations */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-[#767676]">Solde N-1</p>
                    <p className="text-xl font-bold">{formatMontant(selectedLeadSchedule.soldePrecedent)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-[#767676]">Solde N</p>
                    <p className="text-xl font-bold">{formatMontant(selectedLeadSchedule.soldeActuel)}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${selectedLeadSchedule.variation >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-[#767676]">Variation</p>
                    <p className={`text-xl font-bold ${selectedLeadSchedule.variation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedLeadSchedule.variation >= 0 ? '+' : ''}{selectedLeadSchedule.variationPourcent}%
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-xs text-[#767676]">Seuil de significativité</p>
                    <p className="text-lg font-bold text-purple-800">{formatMontant(selectedLeadSchedule.seuilSignificativite)}</p>
                  </div>
                </div>

                {/* Évaluation des risques */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-bold text-orange-800 mb-3">Évaluation des Risques (ISA 315)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-orange-700">Risque Inhérent</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded ${getRisqueColor(selectedLeadSchedule.risqueInherent)}`}>
                        {selectedLeadSchedule.risqueInherent}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-orange-700">Risque de Contrôle</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded ${getRisqueColor(selectedLeadSchedule.risqueControle)}`}>
                        {selectedLeadSchedule.risqueControle}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-orange-700">Risque de Détection</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded ${getRisqueColor(selectedLeadSchedule.risqueDetection)}`}>
                        {selectedLeadSchedule.risqueDetection}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assertions testées */}
                <div>
                  <h3 className="font-bold text-[#191919] mb-3">Assertions Testées</h3>
                  <div className="space-y-3">
                    {selectedLeadSchedule.assertions.map((assertion) => (
                      <div key={assertion.code} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {assertion.testEffectue ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                            <span className="font-medium">{assertion.libelle}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getRisqueColor(assertion.risque)}`}>
                              {assertion.risque}
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            assertion.testEffectue ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {assertion.testEffectue ? 'Testé' : 'En attente'}
                          </span>
                        </div>
                        <p className="text-sm text-[#767676]">{assertion.description}</p>
                        {assertion.conclusion && (
                          <p className="text-sm text-green-700 mt-2 bg-green-50 p-2 rounded">
                            <strong>Conclusion:</strong> {assertion.conclusion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conclusion */}
                {selectedLeadSchedule.conclusion && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-blue-800 mb-2">Conclusion</h3>
                    <p className="text-sm text-blue-900">{selectedLeadSchedule.conclusion}</p>
                  </div>
                )}

                {/* Recommandations */}
                {selectedLeadSchedule.recommandations && selectedLeadSchedule.recommandations.length > 0 && (
                  <div>
                    <h3 className="font-bold text-[#191919] mb-3">Recommandations</h3>
                    <ul className="space-y-2">
                      {selectedLeadSchedule.recommandations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setShowLeadScheduleModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CREATION ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#191919]">Nouvelle Révision Comptable</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Informations de base */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3">Informations de Base</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Compte SYSCOHADA *</label>
                      <input
                        type="text"
                        placeholder="Ex: 401100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Libellé du compte</label>
                      <input
                        type="text"
                        placeholder="Libellé automatique"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Type de révision *</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">Sélectionner...</option>
                        <option value="anomalie">Anomalie</option>
                        <option value="correction">Correction</option>
                        <option value="ajustement">Ajustement</option>
                        <option value="regularisation">Régularisation</option>
                        <option value="reclassement">Reclassement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Priorité *</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="basse">Basse</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="haute">Haute</option>
                        <option value="critique">Critique</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Montant (FCFA) *</label>
                      <input
                        type="number"
                        placeholder="Montant"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Niveau de risque</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="faible">Faible</option>
                        <option value="modere">Modéré</option>
                        <option value="eleve">Élevé</option>
                        <option value="tres_eleve">Très élevé</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Assertions ISA */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3">Assertions ISA Concernées</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(assertionsAudit).map(([code, info]) => (
                      <label key={code} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input type="checkbox" className="rounded border-gray-300" />
                        <span className="text-sm">{info.libelle}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description et impact */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3">Description et Impact</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Description détaillée *</label>
                      <textarea
                        rows={3}
                        placeholder="Décrivez l'anomalie ou l'ajustement..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Impact</label>
                      <input
                        type="text"
                        placeholder="Ex: Impact sur le résultat net"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Assignation */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3">Assignation</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Responsable</label>
                      <input
                        type="text"
                        placeholder="Nom du responsable"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Date d'échéance</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('Révision créée avec succès');
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72]"
              >
                Créer la révision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CREATION AJUSTEMENT (PAJE/AAJE) ==================== */}
      {showAjustementModal && selectedRevision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#191919]">Créer une Écriture d'Ajustement</h2>
                    <p className="text-sm text-[#767676]">
                      Révision: {selectedRevision.id} - {selectedRevision.compte} {selectedRevision.libelleCompte}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAjustementModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Type d'ajustement */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-purple-500 rounded"></span>
                    Type d'Écriture
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 p-4 border-2 border-orange-300 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100">
                      <input type="radio" name="typeAjustement" value="PAJE" defaultChecked className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="font-semibold text-orange-800">PAJE</p>
                        <p className="text-xs text-orange-700">Proposed Adjusting Journal Entry</p>
                        <p className="text-xs text-[#767676] mt-1">Écriture proposée en attente de validation</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border-2 border-green-300 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100">
                      <input type="radio" name="typeAjustement" value="AAJE" className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">AAJE</p>
                        <p className="text-xs text-green-700">Actual Adjusting Journal Entry</p>
                        <p className="text-xs text-[#767676] mt-1">Écriture validée à comptabiliser</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Informations de l'ajustement */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded"></span>
                    Informations de l'Ajustement
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Référence *</label>
                      <input
                        type="text"
                        defaultValue={`PAJE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Date de l'écriture</label>
                      <input
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-[#191919] mb-1">Justification *</label>
                      <textarea
                        rows={2}
                        defaultValue={selectedRevision.description}
                        placeholder="Justification de l'ajustement..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Lignes d'écriture */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#191919] flex items-center gap-2">
                      <span className="w-1 h-4 bg-green-500 rounded"></span>
                      Lignes d'Écriture Comptable
                    </h3>
                    <button className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 text-sm">
                      <Plus className="w-4 h-4" />
                      Ajouter une ligne
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-3 font-semibold text-[#191919]">Compte</th>
                          <th className="text-left p-3 font-semibold text-[#191919]">Libellé</th>
                          <th className="text-right p-3 font-semibold text-[#191919]">Débit (FCFA)</th>
                          <th className="text-right p-3 font-semibold text-[#191919]">Crédit (FCFA)</th>
                          <th className="text-center p-3 font-semibold text-[#191919]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Ligne 1 - Débit */}
                        <tr className="border-b border-gray-100">
                          <td className="p-3">
                            <input
                              type="text"
                              defaultValue={selectedRevision.type === 'anomalie' ? '6' + selectedRevision.compte.substring(1) : selectedRevision.compte}
                              placeholder="N° compte"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded font-mono text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              defaultValue={selectedRevision.libelleCompte}
                              placeholder="Libellé"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              defaultValue={selectedRevision.montant}
                              placeholder="0"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-right font-mono text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              placeholder="0"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-right font-mono text-sm bg-gray-50"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {/* Ligne 2 - Crédit */}
                        <tr className="border-b border-gray-100">
                          <td className="p-3">
                            <input
                              type="text"
                              defaultValue={selectedRevision.compte}
                              placeholder="N° compte"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded font-mono text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              defaultValue={selectedRevision.libelleCompte}
                              placeholder="Libellé"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              placeholder="0"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-right font-mono text-sm bg-gray-50"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              defaultValue={selectedRevision.montant}
                              placeholder="0"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-right font-mono text-sm"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button className="p-1 text-red-500 hover:bg-red-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {/* Totaux */}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={2} className="p-3 text-right">TOTAL :</td>
                          <td className="p-3 text-right font-mono text-green-700">{formatMontant(selectedRevision.montant)}</td>
                          <td className="p-3 text-right font-mono text-green-700">{formatMontant(selectedRevision.montant)}</td>
                          <td className="p-3"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Vérification équilibre */}
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-800">L'écriture est équilibrée (Débit = Crédit)</span>
                  </div>
                </div>

                {/* Assertions concernées */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                    Assertions ISA Concernées
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRevision.assertions.map((assertion) => (
                      <span
                        key={assertion}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm border border-indigo-200"
                      >
                        {assertionsAudit[assertion]?.libelle}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pièces justificatives */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-500 rounded"></span>
                    Pièces Justificatives
                  </h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#6A8A82] hover:bg-gray-50 cursor-pointer transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-[#767676]">Glissez-déposez vos fichiers ici ou cliquez pour parcourir</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Excel, Images (max 10 MB)</p>
                  </div>
                  {selectedRevision.documents && selectedRevision.documents.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-[#767676]">Documents de la révision :</p>
                      {selectedRevision.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{doc.nom}</span>
                          <span className="text-xs text-gray-400">({doc.taille})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes et commentaires */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-gray-500 rounded"></span>
                    Notes et Commentaires
                  </h3>
                  <textarea
                    rows={3}
                    placeholder="Ajoutez des notes ou commentaires supplémentaires..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-[#767676]">
                  <Info className="w-4 h-4" />
                  <span>L'écriture sera soumise à validation avant comptabilisation</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAjustementModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      toast.success('Écriture d\'ajustement enregistrée en brouillon');
                      setShowAjustementModal(false);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Enregistrer brouillon
                  </button>
                  <button
                    onClick={() => {
                      toast.success('PAJE créé et soumis à validation');
                      setShowAjustementModal(false);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Scale className="w-4 h-4" />
                    Créer le PAJE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL EDITION REVISION ==================== */}
      {showEditModal && selectedRevision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                    <Edit className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#191919]">Modifier la Révision</h2>
                    <p className="text-sm text-[#767676]">{selectedRevision.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Informations du compte */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[#6A8A82] rounded"></span>
                    Informations du Compte
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Compte SYSCOHADA *</label>
                      <input
                        type="text"
                        defaultValue={selectedRevision.compte}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Libellé du compte</label>
                      <input
                        type="text"
                        defaultValue={selectedRevision.libelleCompte}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Type et Priorité */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-orange-500 rounded"></span>
                    Classification
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Type de révision *</label>
                      <select
                        defaultValue={selectedRevision.type}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="anomalie">Anomalie</option>
                        <option value="correction">Correction</option>
                        <option value="ajustement">Ajustement</option>
                        <option value="regularisation">Régularisation</option>
                        <option value="reclassement">Reclassement</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Priorité *</label>
                      <select
                        defaultValue={selectedRevision.priorite}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="basse">Basse</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="haute">Haute</option>
                        <option value="critique">Critique</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Statut</label>
                      <select
                        defaultValue={selectedRevision.statut}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="en_attente">En attente</option>
                        <option value="en_cours">En cours</option>
                        <option value="valide">Validé</option>
                        <option value="rejete">Rejeté</option>
                        <option value="revise">Révisé</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Montant et Risque */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-purple-500 rounded"></span>
                    Montant et Évaluation
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Montant (FCFA) *</label>
                      <input
                        type="number"
                        defaultValue={selectedRevision.montant}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Niveau de risque</label>
                      <select
                        defaultValue={selectedRevision.niveauRisque}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="faible">Faible</option>
                        <option value="modere">Modéré</option>
                        <option value="eleve">Élevé</option>
                        <option value="tres_eleve">Très élevé</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Type de test</label>
                      <select
                        defaultValue={selectedRevision.typeTest || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Non défini</option>
                        <option value="substantif">Test substantif</option>
                        <option value="analytique">Procédure analytique</option>
                        <option value="controle">Test de contrôle</option>
                        <option value="circularisation">Circularisation</option>
                        <option value="inspection">Inspection physique</option>
                        <option value="recalcul">Recalcul</option>
                        <option value="observation">Observation</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description et Impact */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded"></span>
                    Description et Impact
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Description détaillée *</label>
                      <textarea
                        rows={3}
                        defaultValue={selectedRevision.description}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Impact</label>
                      <input
                        type="text"
                        defaultValue={selectedRevision.impact}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Assertions ISA */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-500 rounded"></span>
                    Assertions ISA Concernées
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(assertionsAudit).map(([code, info]) => (
                      <label key={code} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={selectedRevision.assertions.includes(code as AssertionAudit)}
                          className="rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-sm">{info.libelle}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Assignation */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-green-500 rounded"></span>
                    Assignation et Délais
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Responsable</label>
                      <input
                        type="text"
                        defaultValue={selectedRevision.responsable || ''}
                        placeholder="Nom du responsable"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Réviseur</label>
                      <input
                        type="text"
                        defaultValue={selectedRevision.reviseur || ''}
                        placeholder="Nom du réviseur"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#191919] mb-1">Date d'échéance</label>
                      <input
                        type="date"
                        defaultValue={selectedRevision.dateEcheance || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Pièce justificative */}
                <div>
                  <h3 className="text-sm font-bold text-[#191919] mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 bg-yellow-500 rounded"></span>
                    Pièce Justificative
                  </h3>
                  <input
                    type="text"
                    defaultValue={selectedRevision.pieceJustificative || ''}
                    placeholder="Référence de la pièce justificative"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
              <div className="flex justify-between items-center">
                <div className="text-sm text-[#767676]">
                  Dernière modification: {new Date(selectedRevision.dateDetection).toLocaleDateString('fr-FR')}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      toast.success(`Révision ${selectedRevision.id} mise à jour avec succès`);
                      setShowEditModal(false);
                    }}
                    className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72] flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Enregistrer les modifications
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionsModule;
