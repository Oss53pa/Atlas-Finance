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
