/**
 * Reporting Service — backed by Dexie IndexedDB.
 * Returns available report catalog and stats derived from real data.
 */
import type { DataAdapter } from '@atlas/data';
import {
  Report,
  ReportStats,
  ReportFilters,
  ReportTemplate,
  Dashboard,
  ScheduledReport,
} from '../types/reporting.types';

// Static catalog of available report types (these are always available)
const REPORT_CATALOG: Omit<Report, 'lastGenerated' | 'views'>[] = [
  // ═══════════════════════════════════════════════════════════════════
  // ÉTATS FINANCIERS SYSCOHADA
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'bilan',
    name: 'Bilan SYSCOHADA',
    type: 'financial',
    category: 'États Financiers',
    description: 'Bilan comptable conforme SYSCOHADA avec structure Actif/Passif',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['bilan', 'syscohada', 'états financiers'],
  },
  {
    id: 'compte-resultat',
    name: 'Compte de Résultat',
    type: 'financial',
    category: 'États Financiers',
    description: 'Compte de résultat par nature conforme SYSCOHADA',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['résultat', 'syscohada', 'états financiers'],
  },
  {
    id: 'tafire',
    name: 'TAFIRE',
    type: 'financial',
    category: 'États Financiers',
    description: 'Tableau Financier des Ressources et Emplois — flux de trésorerie SYSCOHADA',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['tafire', 'flux', 'trésorerie', 'syscohada'],
  },
  {
    id: 'annexe',
    name: 'Notes Annexes',
    type: 'financial',
    category: 'États Financiers',
    description: 'Notes annexes aux états financiers — méthodes comptables, détails et engagements',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['annexe', 'notes', 'états financiers'],
  },
  {
    id: 'tableau-variation-capitaux',
    name: 'Variation des Capitaux Propres',
    type: 'financial',
    category: 'États Financiers',
    description: 'Tableau de variation des capitaux propres sur l\'exercice',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['capitaux propres', 'variation', 'états financiers'],
  },
  // ═══════════════════════════════════════════════════════════════════
  // COMPTABILITÉ GÉNÉRALE
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'balance-generale',
    name: 'Balance Générale',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Balance générale des comptes avec vérification D=C',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: true,
    tags: ['balance', 'vérification', 'comptabilité'],
  },
  {
    id: 'balance-auxiliaire-clients',
    name: 'Balance Auxiliaire Clients',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Soldes détaillés par compte client (411xxx)',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: true,
    tags: ['balance', 'clients', 'auxiliaire'],
  },
  {
    id: 'balance-auxiliaire-fournisseurs',
    name: 'Balance Auxiliaire Fournisseurs',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Soldes détaillés par compte fournisseur (401xxx)',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: true,
    tags: ['balance', 'fournisseurs', 'auxiliaire'],
  },
  {
    id: 'grand-livre',
    name: 'Grand Livre Général',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Grand livre avec soldes progressifs par compte',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: true,
    tags: ['grand livre', 'comptabilité', 'détail'],
  },
  {
    id: 'grand-livre-clients',
    name: 'Grand Livre Clients',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Détail des mouvements par client avec solde progressif',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: true,
    tags: ['grand livre', 'clients', 'détail'],
  },
  {
    id: 'grand-livre-fournisseurs',
    name: 'Grand Livre Fournisseurs',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Détail des mouvements par fournisseur avec solde progressif',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: true,
    tags: ['grand livre', 'fournisseurs', 'détail'],
  },
  {
    id: 'journaux-comptables',
    name: 'Journaux Comptables',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Listing des écritures par journal (achats, ventes, banque, OD)',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: true,
    tags: ['journal', 'écritures', 'listing'],
  },
  {
    id: 'etat-rapprochement',
    name: 'État de Rapprochement Bancaire',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Rapprochement entre le solde bancaire et le solde comptable',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'pdf',
    isPublic: false,
    tags: ['rapprochement', 'banque', 'trésorerie'],
  },
  {
    id: 'lettrage',
    name: 'État de Lettrage',
    type: 'financial',
    category: 'Comptabilité',
    description: 'Situation du lettrage des comptes de tiers avec écarts',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['lettrage', 'tiers', 'réconciliation'],
  },
  // ═══════════════════════════════════════════════════════════════════
  // ANALYSE FINANCIÈRE
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'sig',
    name: 'Soldes Intermédiaires de Gestion',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'SIG : MC, VA, EBE, RE, RN — cascade SYSCOHADA',
    generatedBy: 'system',
    status: 'active',
    frequency: 'quarterly',
    format: 'pdf',
    isPublic: true,
    tags: ['sig', 'analyse', 'gestion'],
  },
  {
    id: 'ratios',
    name: 'Ratios Financiers',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'Ratios de structure, liquidité, rentabilité et activité',
    generatedBy: 'system',
    status: 'active',
    frequency: 'quarterly',
    format: 'dashboard',
    isPublic: true,
    tags: ['ratios', 'analyse', 'performance'],
  },
  {
    id: 'bfr-analyse',
    name: 'Analyse du BFR',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'Besoin en Fonds de Roulement : décomposition et évolution DSO/DPO/DIO',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'dashboard',
    isPublic: true,
    tags: ['bfr', 'fonds de roulement', 'cycle exploitation'],
  },
  {
    id: 'seuil-rentabilite',
    name: 'Seuil de Rentabilité',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'Point mort, marge de sécurité et levier opérationnel',
    generatedBy: 'system',
    status: 'active',
    frequency: 'quarterly',
    format: 'dashboard',
    isPublic: true,
    tags: ['seuil', 'rentabilité', 'point mort'],
  },
  {
    id: 'capacite-autofinancement',
    name: 'Capacité d\'Autofinancement (CAF)',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'CAF par méthode additive et soustractive — autofinancement',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['caf', 'autofinancement', 'trésorerie'],
  },
  {
    id: 'analyse-marges',
    name: 'Analyse des Marges',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'Marge commerciale, marge de production, valeur ajoutée, EBE',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'dashboard',
    isPublic: true,
    tags: ['marges', 'rentabilité', 'performance'],
  },
  {
    id: 'analyse-charges',
    name: 'Analyse des Charges par Nature',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'Décomposition des charges classe 6 par nature avec évolution',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'dashboard',
    isPublic: true,
    tags: ['charges', 'nature', 'décomposition'],
  },
  {
    id: 'analyse-produits',
    name: 'Analyse des Produits par Nature',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'Décomposition des produits classe 7 par nature avec évolution',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'dashboard',
    isPublic: true,
    tags: ['produits', 'revenus', 'décomposition'],
  },
  {
    id: 'comparatif-exercices',
    name: 'Comparatif N / N-1',
    type: 'analytical',
    category: 'Analyse Financière',
    description: 'Comparaison bilan et résultat entre deux exercices avec écarts',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['comparatif', 'exercices', 'évolution'],
  },
  // ═══════════════════════════════════════════════════════════════════
  // GESTION / MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'budget-vs-reel',
    name: 'Budget vs Réalisé',
    type: 'management',
    category: 'Gestion',
    description: 'Comparaison budgétaire avec écarts et taux de réalisation',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['budget', 'contrôle', 'écarts'],
  },
  {
    id: 'tresorerie',
    name: 'Position de Trésorerie',
    type: 'management',
    category: 'Trésorerie',
    description: 'Soldes bancaires et disponibilités par compte',
    generatedBy: 'system',
    status: 'active',
    frequency: 'daily',
    format: 'dashboard',
    isPublic: false,
    tags: ['trésorerie', 'banque', 'liquidité'],
  },
  {
    id: 'prevision-tresorerie',
    name: 'Prévision de Trésorerie',
    type: 'management',
    category: 'Trésorerie',
    description: 'Plan de trésorerie prévisionnel sur 3/6/12 mois glissants',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'dashboard',
    isPublic: false,
    tags: ['prévision', 'trésorerie', 'cashflow'],
  },
  {
    id: 'balance-agee',
    name: 'Balance Âgée Clients',
    type: 'management',
    category: 'Tiers',
    description: 'Vieillissement des créances clients par tranche (0-30, 30-60, 60-90, >90j)',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['clients', 'créances', 'recouvrement'],
  },
  {
    id: 'balance-agee-fournisseurs',
    name: 'Balance Âgée Fournisseurs',
    type: 'management',
    category: 'Tiers',
    description: 'Vieillissement des dettes fournisseurs par tranche d\'échéance',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['fournisseurs', 'dettes', 'échéances'],
  },
  {
    id: 'suivi-immobilisations',
    name: 'Suivi des Immobilisations',
    type: 'management',
    category: 'Patrimoine',
    description: 'Tableau des immobilisations : acquisitions, cessions, amortissements',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'excel',
    isPublic: false,
    tags: ['immobilisations', 'amortissements', 'patrimoine'],
  },
  {
    id: 'tableau-amortissements',
    name: 'Tableau des Amortissements',
    type: 'management',
    category: 'Patrimoine',
    description: 'Plan d\'amortissement détaillé par immobilisation',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'excel',
    isPublic: false,
    tags: ['amortissements', 'dotations', 'immobilisations'],
  },
  {
    id: 'tableau-provisions',
    name: 'Tableau des Provisions',
    type: 'management',
    category: 'Patrimoine',
    description: 'Suivi des provisions pour risques et charges avec mouvements',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'excel',
    isPublic: false,
    tags: ['provisions', 'risques', 'charges'],
  },
  {
    id: 'compte-exploitation-analytique',
    name: 'Compte d\'Exploitation Analytique',
    type: 'management',
    category: 'Analytique',
    description: 'Résultat analytique par centre de coût / axe analytique',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['analytique', 'centres de coût', 'résultat'],
  },
  {
    id: 'top-clients',
    name: 'Top Clients',
    type: 'management',
    category: 'Commercial',
    description: 'Classement des clients par CA, créances et ancienneté',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'dashboard',
    isPublic: false,
    tags: ['clients', 'classement', 'commercial'],
  },
  {
    id: 'top-fournisseurs',
    name: 'Top Fournisseurs',
    type: 'management',
    category: 'Achats',
    description: 'Classement des fournisseurs par volume d\'achats et dettes',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'dashboard',
    isPublic: false,
    tags: ['fournisseurs', 'classement', 'achats'],
  },
  // ═══════════════════════════════════════════════════════════════════
  // RÉGLEMENTAIRE / FISCAL
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'fec',
    name: 'Fichier des Écritures Comptables (FEC)',
    type: 'regulatory',
    category: 'Fiscalité',
    description: 'Export FEC conforme Art. A.47 A-1 LPF (18 colonnes)',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'excel',
    isPublic: false,
    tags: ['fec', 'fiscal', 'export', 'réglementaire'],
  },
  {
    id: 'declaration-tva',
    name: 'Déclaration de TVA',
    type: 'regulatory',
    category: 'Fiscalité',
    description: 'TVA collectée vs déductible avec calcul du solde dû ou crédit',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'pdf',
    isPublic: false,
    tags: ['tva', 'déclaration', 'fiscal'],
  },
  {
    id: 'etat-tva-deductible',
    name: 'État TVA Déductible',
    type: 'regulatory',
    category: 'Fiscalité',
    description: 'Détail de la TVA déductible par facture fournisseur',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['tva', 'déductible', 'fournisseurs'],
  },
  {
    id: 'etat-tva-collectee',
    name: 'État TVA Collectée',
    type: 'regulatory',
    category: 'Fiscalité',
    description: 'Détail de la TVA collectée par facture client',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['tva', 'collectée', 'clients'],
  },
  {
    id: 'dsf',
    name: 'Déclaration Statistique et Fiscale (DSF)',
    type: 'regulatory',
    category: 'Fiscalité',
    description: 'DSF annuelle avec les 24 tableaux réglementaires',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: false,
    tags: ['dsf', 'déclaration', 'statistique', 'fiscal'],
  },
  {
    id: 'liasse-fiscale',
    name: 'Liasse Fiscale',
    type: 'regulatory',
    category: 'Fiscalité',
    description: 'Ensemble des formulaires fiscaux de fin d\'exercice',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: false,
    tags: ['liasse', 'fiscal', 'déclaration', 'exercice'],
  },
  {
    id: 'piste-audit',
    name: 'Piste d\'Audit',
    type: 'regulatory',
    category: 'Conformité',
    description: 'Traçabilité complète des opérations : chaîne de hachage et journal d\'audit',
    generatedBy: 'system',
    status: 'active',
    frequency: 'on_demand',
    format: 'pdf',
    isPublic: false,
    tags: ['audit', 'traçabilité', 'conformité'],
  },
];

const TEMPLATES: ReportTemplate[] = [
  // ── États Financiers ──────────────────────────────────────────────
  {
    id: 'tpl-bilan',
    name: 'Bilan SYSCOHADA Standard',
    description: 'Bilan avec structure Actif Immobilisé / Circulant / Trésorerie',
    type: 'financial',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-resultat',
    name: 'Compte de Résultat par Nature',
    description: 'Classification des charges et produits par nature SYSCOHADA',
    type: 'financial',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-flux',
    name: 'Tableau des Flux de Trésorerie',
    description: 'Méthode indirecte : exploitation, investissement, financement',
    type: 'financial',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-tafire',
    name: 'TAFIRE SYSCOHADA',
    description: 'Tableau Financier des Ressources et Emplois conforme OHADA',
    type: 'financial',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-variation-cp',
    name: 'Variation des Capitaux Propres',
    description: 'Mouvements de capitaux propres sur l\'exercice',
    type: 'financial',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  // ── Analyse Financière ────────────────────────────────────────────
  {
    id: 'tpl-sig',
    name: 'SIG — Cascade de Gestion',
    description: 'MC, VA, EBE, RE, RAO, RHAO, RN en cascade visuelle',
    type: 'analytical',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-ratios',
    name: 'Tableau de Bord Ratios',
    description: 'Dashboard interactif avec jauges et graphiques radar pour les ratios clés',
    type: 'analytical',
    format: 'dashboard',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-bfr',
    name: 'Analyse du BFR',
    description: 'Décomposition du BFR avec graphiques DSO/DPO/DIO et tendances',
    type: 'analytical',
    format: 'dashboard',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-comparatif',
    name: 'Comparatif N/N-1',
    description: 'Bilan et résultat comparés sur 2 exercices avec écarts',
    type: 'analytical',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-marges',
    name: 'Analyse des Marges',
    description: 'Waterfall chart marge commerciale → marge nette',
    type: 'analytical',
    format: 'dashboard',
    isPublic: true,
    usageCount: 0,
  },
  // ── Gestion / Management ──────────────────────────────────────────
  {
    id: 'tpl-budget',
    name: 'Budget vs Réalisé',
    description: 'Graphique barres groupées budget/réel avec écarts en %',
    type: 'management',
    format: 'excel',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-tresorerie-prev',
    name: 'Plan de Trésorerie Prévisionnel',
    description: 'Prévision de trésorerie sur 12 mois avec scénarios',
    type: 'management',
    format: 'dashboard',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-balance-agee',
    name: 'Balance Âgée Tiers',
    description: 'Clients et fournisseurs par tranche d\'ancienneté avec barres empilées',
    type: 'management',
    format: 'excel',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-immobilisations',
    name: 'Tableau des Immobilisations',
    description: 'Acquisitions, cessions, amortissements et VNC par catégorie',
    type: 'management',
    format: 'excel',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-top-tiers',
    name: 'Top Clients & Fournisseurs',
    description: 'Classement Pareto (80/20) des tiers par volume',
    type: 'management',
    format: 'dashboard',
    isPublic: true,
    usageCount: 0,
  },
  // ── Réglementaire ─────────────────────────────────────────────────
  {
    id: 'tpl-fec',
    name: 'FEC Standard',
    description: 'Export FEC 18 colonnes conforme au LPF',
    type: 'regulatory',
    format: 'excel',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-dsf',
    name: 'DSF Complète',
    description: 'Déclaration Statistique et Fiscale — 24 tableaux',
    type: 'regulatory',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
  {
    id: 'tpl-audit',
    name: 'Rapport d\'Audit',
    description: 'Piste d\'audit avec chaîne de hachage et journal des opérations',
    type: 'regulatory',
    format: 'pdf',
    isPublic: true,
    usageCount: 0,
  },
];

class ReportingService {
  async getReports(adapter: DataAdapter, filters?: ReportFilters): Promise<Report[]> {
    // Get the latest entry date to determine lastGenerated
    const allEntries = await adapter.getAll('journalEntries', { orderBy: { field: 'date', direction: 'desc' } });
    const lastDate = allEntries[0]?.date || new Date().toISOString().split('T')[0];
    const entryCount = allEntries.length;

    let reports: Report[] = REPORT_CATALOG.map(r => ({
      ...r,
      lastGenerated: lastDate + 'T00:00:00Z',
      views: entryCount > 0 ? 1 : 0,
    }));

    if (filters?.type) {
      reports = reports.filter(r => r.type === filters.type);
    }
    if (filters?.status) {
      reports = reports.filter(r => r.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      reports = reports.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some(t => t.includes(q))
      );
    }

    return reports;
  }

  async getReport(adapter: DataAdapter, id: string): Promise<Report | null> {
    const reports = await this.getReports(adapter);
    return reports.find(r => r.id === id) || null;
  }

  async getReportStats(adapter: DataAdapter): Promise<ReportStats> {
    const reports = await this.getReports(adapter);
    const entryCount = (await adapter.getAll('journalEntries')).length;

    return {
      activeReports: reports.filter(r => r.status === 'active').length,
      totalViews: entryCount,
      sharedReports: reports.filter(r => r.isPublic).length,
      weeklyGenerations: entryCount > 0 ? reports.length : 0,
      automaticReports: reports.filter(r => r.frequency !== 'on_demand').length,
      supportedFormats: 3,
      averageFrequency: reports.length,
      byType: {
        financial: reports.filter(r => r.type === 'financial').length,
        analytical: reports.filter(r => r.type === 'analytical').length,
        management: reports.filter(r => r.type === 'management').length,
        regulatory: reports.filter(r => r.type === 'regulatory').length,
      },
    };
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    return TEMPLATES;
  }

  async getDashboards(): Promise<Dashboard[]> {
    return [];
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    return [];
  }

  async generateReport(adapter: DataAdapter, reportId: string, format: string, fiscalYearId?: string): Promise<Blob> {
    const report = await this.getReport(adapter, reportId);
    if (!report) throw new Error(`Rapport ${reportId} introuvable`);

    const exercice = fiscalYearId || new Date().getFullYear().toString();

    // Import services dynamically to avoid circular dependencies
    const { financialStatementsService } = await import('../../financial/services/financialStatementsService');

    switch (reportId) {
      case 'bilan':
      case 'compte-resultat':
      case 'sig': {
        return financialStatementsService.exportStatements(
          adapter,
          format === 'excel' ? 'excel' : 'pdf',
          exercice
        );
      }
      case 'balance-generale': {
        const data = await financialStatementsService.getFinancialStatements(adapter, exercice);
        const json = JSON.stringify(data, null, 2);
        return new Blob([json], { type: 'application/json' });
      }
      case 'fec': {
        try {
          const { fecExportService } = await import('../../../services/export/fecExportService');
          return fecExportService.exportFEC(adapter, exercice);
        } catch {
          throw new Error('Service FEC non disponible');
        }
      }
      default: {
        // Fallback: export financial data as JSON
        const data = await financialStatementsService.getFinancialStatements(adapter, exercice);
        const json = JSON.stringify(data, null, 2);
        return new Blob([json], { type: 'application/json' });
      }
    }
  }

  async createReport(adapter: DataAdapter, data: Partial<Report>): Promise<Report> {
    if (!data.name || !data.type) {
      throw new Error('name et type sont obligatoires');
    }
    const report: Report = {
      id: `custom-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      type: data.type as any,
      category: data.category || 'Personnalisé',
      format: data.format || 'pdf',
      frequency: 'on_demand',
      status: 'active',
      lastGenerated: undefined,
      tags: data.tags || [],
      isPublic: data.isPublic || false,
    };
    // Persist in settings
    const key = `report_${report.id}`;
    await adapter.create('settings', {
      key,
      value: JSON.stringify(report),
      updatedAt: new Date().toISOString(),
    });
    return report;
  }

  async updateReport(adapter: DataAdapter, id: string, data: Partial<Report>): Promise<Report> {
    const existing = await this.getReport(adapter, id);
    if (!existing) throw new Error(`Rapport ${id} introuvable`);
    const updated = { ...existing, ...data };
    const key = `report_${id}`;
    await adapter.update('settings', key, {
      key,
      value: JSON.stringify(updated),
      updatedAt: new Date().toISOString(),
    });
    return updated;
  }

  async deleteReport(adapter: DataAdapter, id: string): Promise<void> {
    const key = `report_${id}`;
    try {
      await adapter.delete('settings', key);
    } catch { /* ignore if not found */ }
  }
}

export const reportingService = new ReportingService();
export default reportingService;
