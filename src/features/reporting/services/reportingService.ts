import {
  Report,
  ReportStats,
  ReportFilters,
  ReportTemplate,
  Dashboard,
  ScheduledReport,
} from '../types/reporting.types';

class ReportingService {
  async getReports(filters?: ReportFilters): Promise<Report[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockReports: Report[] = [
      {
        id: '1',
        name: 'Bilan Comptable Mensuel',
        type: 'financial',
        category: 'Comptabilité',
        description: 'Bilan comptable détaillé avec comparaison période précédente',
        lastGenerated: '2024-08-25T10:30:00Z',
        generatedBy: 'Marie Dubois',
        views: 245,
        status: 'active',
        frequency: 'monthly',
        format: 'pdf',
        isPublic: true,
        tags: ['bilan', 'comptabilité', 'syscohada'],
      },
      {
        id: '2',
        name: 'Tableau de Bord Commercial',
        type: 'management',
        category: 'Commercial',
        description: 'Indicateurs de performance commerciale en temps réel',
        lastGenerated: '2024-08-25T08:15:00Z',
        generatedBy: 'Jean Kouassi',
        views: 189,
        status: 'active',
        frequency: 'daily',
        format: 'dashboard',
        isPublic: false,
        tags: ['commercial', 'kpi', 'ventes'],
      },
      {
        id: '3',
        name: 'Analyse de Rentabilité',
        type: 'analytical',
        category: 'Analyse',
        description: 'Analyse détaillée de la rentabilité par produit et service',
        lastGenerated: '2024-08-24T16:45:00Z',
        generatedBy: 'Fatou Traoré',
        views: 127,
        status: 'active',
        frequency: 'weekly',
        format: 'excel',
        isPublic: true,
        tags: ['rentabilité', 'analyse', 'produits'],
      },
    ];

    return mockReports;
  }

  async getReport(id: string): Promise<Report | null> {
    const reports = await this.getReports();
    return reports.find((r) => r.id === id) || null;
  }

  async getReportStats(): Promise<ReportStats> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const reports = await this.getReports();

    return {
      activeReports: reports.filter((r) => r.status === 'active').length,
      totalViews: reports.reduce((sum, r) => sum + r.views, 0),
      sharedReports: reports.filter((r) => r.isPublic).length,
      weeklyGenerations: 247,
      automaticReports: reports.filter((r) => r.frequency !== 'on_demand').length,
      supportedFormats: 3,
      averageFrequency: 5.2,
      byType: {
        financial: reports.filter((r) => r.type === 'financial').length,
        analytical: reports.filter((r) => r.type === 'analytical').length,
        management: reports.filter((r) => r.type === 'management').length,
        regulatory: reports.filter((r) => r.type === 'regulatory').length,
      },
    };
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return [
      {
        id: '1',
        name: 'Bilan Standard',
        description: 'Modèle de bilan comptable standard',
        type: 'financial',
        format: 'pdf',
        isPublic: true,
        usageCount: 45,
      },
      {
        id: '2',
        name: 'Tableau de Bord KPI',
        description: 'Dashboard avec indicateurs clés de performance',
        type: 'management',
        format: 'dashboard',
        isPublic: true,
        usageCount: 32,
      },
    ];
  }

  async getDashboards(): Promise<Dashboard[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [];
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [];
  }

  async generateReport(reportId: string, format: string): Promise<Blob> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return new Blob(['mock report'], { type: 'application/octet-stream' });
  }

  async createReport(data: Partial<Report>): Promise<Report> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Not implemented');
  }

  async updateReport(id: string, data: Partial<Report>): Promise<Report> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    throw new Error('Not implemented');
  }

  async deleteReport(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

export const reportingService = new ReportingService();
export default reportingService;