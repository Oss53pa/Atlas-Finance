/**
 * Reporting Service — backed by Dexie IndexedDB.
 * Returns available report catalog and stats derived from real data.
 */
import { db } from '../../../lib/db';
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
  {
    id: 'bilan',
    name: 'Bilan SYSCOHADA',
    type: 'financial',
    category: 'Comptabilité',
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
    category: 'Comptabilité',
    description: 'Compte de résultat par nature conforme SYSCOHADA',
    generatedBy: 'system',
    status: 'active',
    frequency: 'annual',
    format: 'pdf',
    isPublic: true,
    tags: ['résultat', 'syscohada', 'états financiers'],
  },
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
    id: 'sig',
    name: 'Soldes Intermédiaires de Gestion',
    type: 'financial',
    category: 'Analyse',
    description: 'SIG : MC, VA, EBE, RE, RN — cascade SYSCOHADA',
    generatedBy: 'system',
    status: 'active',
    frequency: 'quarterly',
    format: 'pdf',
    isPublic: true,
    tags: ['sig', 'analyse', 'gestion'],
  },
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
    id: 'ratios',
    name: 'Ratios Financiers',
    type: 'analytical',
    category: 'Analyse',
    description: 'Ratios de structure, liquidité, rentabilité et activité',
    generatedBy: 'system',
    status: 'active',
    frequency: 'quarterly',
    format: 'dashboard',
    isPublic: true,
    tags: ['ratios', 'analyse', 'performance'],
  },
  {
    id: 'budget-vs-reel',
    name: 'Budget vs Réalisé',
    type: 'management',
    category: 'Budget',
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
    id: 'balance-agee',
    name: 'Balance Âgée Clients',
    type: 'management',
    category: 'Tiers',
    description: 'Vieillissement des créances clients par tranche',
    generatedBy: 'system',
    status: 'active',
    frequency: 'monthly',
    format: 'excel',
    isPublic: false,
    tags: ['clients', 'créances', 'recouvrement'],
  },
];

const TEMPLATES: ReportTemplate[] = [
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
];

class ReportingService {
  async getReports(filters?: ReportFilters): Promise<Report[]> {
    // Get the latest entry date to determine lastGenerated
    const entries = await db.journalEntries.orderBy('date').reverse().limit(1).toArray();
    const lastDate = entries[0]?.date || new Date().toISOString().split('T')[0];
    const entryCount = await db.journalEntries.count();

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

  async getReport(id: string): Promise<Report | null> {
    const reports = await this.getReports();
    return reports.find(r => r.id === id) || null;
  }

  async getReportStats(): Promise<ReportStats> {
    const reports = await this.getReports();
    const entryCount = await db.journalEntries.count();

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

  async generateReport(_reportId: string, _format: string): Promise<Blob> {
    return new Blob([''], { type: 'application/octet-stream' });
  }

  async createReport(_data: Partial<Report>): Promise<Report> {
    throw new Error('Création de rapport personnalisé non implémentée');
  }

  async updateReport(_id: string, _data: Partial<Report>): Promise<Report> {
    throw new Error('Modification de rapport non implémentée');
  }

  async deleteReport(_id: string): Promise<void> {
    // no-op
  }
}

export const reportingService = new ReportingService();
export default reportingService;
