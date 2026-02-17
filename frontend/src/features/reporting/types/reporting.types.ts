export type ReportType = 'financial' | 'analytical' | 'management' | 'regulatory';

export type ReportStatus = 'active' | 'draft' | 'archived';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand';

export type ReportFormat = 'pdf' | 'excel' | 'dashboard';

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  category: string;
  description: string;
  lastGenerated: string;
  generatedBy: string;
  views: number;
  status: ReportStatus;
  frequency: ReportFrequency;
  format: ReportFormat;
  isPublic: boolean;
  tags: string[];
}

export interface ReportStats {
  activeReports: number;
  totalViews: number;
  sharedReports: number;
  weeklyGenerations: number;
  automaticReports: number;
  supportedFormats: number;
  averageFrequency: number;
  byType: Record<ReportType, number>;
}

export interface ReportFilters {
  type?: ReportType;
  status?: ReportStatus;
  search?: string;
  tags?: string[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  format: ReportFormat;
  thumbnail?: string;
  isPublic: boolean;
  usageCount: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  dataSource: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: ReportFrequency;
  nextRun: string;
  recipients: string[];
  format: ReportFormat;
  enabled: boolean;
}