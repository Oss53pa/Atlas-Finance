/**
 * Report Builder — Types Complets
 * CDC V1 + V2 + V3 — Atlas Finance
 */

// ============================================================================
// Periods (CDC §11)
// ============================================================================

export type PeriodType = 'monthly' | 'quarterly' | 'annual' | 'ytd' | 'rolling12' | 'custom' | 'multi';

export interface PeriodSelection {
  type: PeriodType;
  startDate: string;
  endDate: string;
  label: string;
  compareWith?: 'n-1' | 'budget' | 'n-3months' | 'none';
  includeYTD?: boolean;
}

// ============================================================================
// Report Document (CDC §5)
// ============================================================================

export type ReportStatus = 'draft' | 'in_review' | 'in_validation' | 'validated' | 'archived';

export type PageFormat = 'a4-portrait' | 'a4-landscape' | 'letter' | 'a3';

export type NumberingStyle = 'arabic' | 'roman' | 'alpha';

export interface PageSettings {
  format: PageFormat;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showHeader: boolean;
  showFooter: boolean;
  headerText?: string;
  footerText?: string;
  headerLogo?: string;
  headerPosition?: 'left' | 'center' | 'right';
  numberingStyle: NumberingStyle;
  startPageNumber: number;
  watermark?: string;
  watermarkOpacity?: number;
}

export interface ReportTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  positive: string;
  negative: string;
  warning: string;
  borderColor: string;
}

export interface ReportTypography {
  fontMain: string;
  fontHeadings: string;
  fontData: string;
  baseFontSize: number;
  h1Size: number;
  h1Weight: number;
  h1Color: string;
  h2Size: number;
  h2Weight: number;
  h2Color: string;
  h3Size: number;
  h3Weight: number;
  h3Color: string;
  lineHeight: number;
  paragraphSpacing: number;
}

export interface ReportDocument {
  id: string;
  title: string;
  status: ReportStatus;
  period: PeriodSelection;
  pages: ReportPage[];
  pageSettings: PageSettings;
  theme: ReportTheme;
  typography: ReportTypography;
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  // CDC V3 — Master link
  masterId?: string;
  masterVersion?: number;
  // Workflow (CDC §13)
  validationCircuit?: ValidationCircuit;
  // Audiences (CDC V2 §D)
  audiences?: Audience[];
  // Scheduling (CDC §12/§14)
  isScheduled?: boolean;
  scheduleConfig?: ScheduleConfig;
  // Archive
  archivedAt?: string;
  pdfUrl?: string;
}

// ============================================================================
// Pages & Blocks (CDC §8)
// ============================================================================

export interface ReportPage {
  id: string;
  blocks: ReportBlock[];
  pageType: 'cover' | 'content' | 'back';
}

export type BlockType =
  | 'text'
  | 'kpi'
  | 'kpi-grid'
  | 'table'
  | 'chart'
  | 'separator'
  | 'page-break'
  | 'spacer'
  | 'image'
  | 'cover'
  | 'back-page'
  | 'columns'
  | 'comment'
  | 'callout'
  | 'manual-table'
  | 'formula'
  | 'toc-block';

export interface BlockBase {
  id: string;
  type: BlockType;
  locked: boolean;
  periodOverride?: PeriodSelection;
  style: BlockStyle;
  // CDC V2 §D — Visibility per audience
  audienceVisibility?: Record<string, boolean>;
  // Comments (CDC V2 §B.5)
  comments?: BlockComment[];
}

export interface BlockStyle {
  backgroundColor?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number;
  padding?: number;
  marginBottom?: number;
  opacity?: number;
  // Grid (CDC §10.1)
  gridColumns?: number; // out of 12
}

// ============================================================================
// Text Block
// ============================================================================

export type TextVariant = 'h1' | 'h2' | 'h3' | 'paragraph' | 'quote' | 'footnote';

export interface TextBlock extends BlockBase {
  type: 'text';
  content: string;
  variant: TextVariant;
  alignment: 'left' | 'center' | 'right' | 'justify';
  // CDC V3 §E.2 — Narrative zone
  isNarrativeZone?: boolean;
  narrativeBehavior?: 'empty' | 'inherit' | 'ai';
  aiPrompt?: string;
}

// ============================================================================
// KPI Block
// ============================================================================

export type KPIFormat = 'currency' | 'percent' | 'number' | 'days';

export interface KPIBlock extends BlockBase {
  type: 'kpi';
  label: string;
  value: number | null;
  previousValue?: number | null;
  format: KPIFormat;
  unit?: string;
  source?: string;
  showTrend: boolean;
  showSparkline: boolean;
  size: 'small' | 'medium' | 'large';
}

// ============================================================================
// KPI Grid Block
// ============================================================================

export interface KPIGridBlock extends BlockBase {
  type: 'kpi-grid';
  columns: 2 | 3 | 4;
  kpis: Omit<KPIBlock, 'id' | 'type' | 'locked' | 'style'>[];
}

// ============================================================================
// Table Block
// ============================================================================

export interface TableColumn {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
  format?: 'text' | 'currency' | 'number' | 'percent' | 'date';
  width?: string;
  visible: boolean;
}

export interface ConditionalRule {
  id: string;
  condition: 'less_than' | 'greater_than' | 'equals' | 'between' | 'negative';
  value?: number;
  value2?: number;
  column?: string;
  style: 'text-red' | 'text-green' | 'bg-red-light' | 'bg-green-light' | 'bold' | 'icon-arrow';
}

export interface TableBlock extends BlockBase {
  type: 'table';
  title?: string;
  source?: string;
  columns: TableColumn[];
  rows: Record<string, string | number | null>[];
  showHeader: boolean;
  showTotal: boolean;
  striped: boolean;
  bordered: boolean;
  highlightNegative: boolean;
  maxRows?: number;
  // CDC V2 §C.3 — Conditional formatting
  conditionalRules?: ConditionalRule[];
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

// ============================================================================
// Chart Block
// ============================================================================

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'waterfall' | 'stacked-bar' | 'grouped-bar' | 'horizontal-bar' | 'radar';

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface ChartBlock extends BlockBase {
  type: 'chart';
  title?: string;
  chartType: ChartType;
  source?: string;
  data: Record<string, string | number>[];
  xAxisKey: string;
  series: ChartSeries[];
  showLegend: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  height: number;
  showGrid: boolean;
  // Comparison
  showComparison?: boolean;
  comparisonLabel?: string;
}

// ============================================================================
// Layout Blocks
// ============================================================================

export interface SeparatorBlock extends BlockBase {
  type: 'separator';
  lineStyle: 'solid' | 'dashed' | 'dotted';
  color?: string;
  thickness: number;
}

export interface PageBreakBlock extends BlockBase {
  type: 'page-break';
}

export interface SpacerBlock extends BlockBase {
  type: 'spacer';
  height: number;
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;
  alt: string;
  width?: string;
  alignment: 'left' | 'center' | 'right';
  caption?: string;
}

// ============================================================================
// Cover & Back Pages (CDC §8.2, §10.2)
// ============================================================================

export interface CoverBlock extends BlockBase {
  type: 'cover';
  companyName: string;
  reportTitle: string;
  subtitle?: string;
  logoUrl?: string;
  backgroundStyle: 'corporate-classic' | 'executive-dark' | 'finance-modern' | 'formal' | 'annual-report' | 'custom';
  confidentiality?: 'confidentiel' | 'usage-interne' | 'public';
  signatories?: string[];
  versionNumber?: string;
  backgroundImage?: string;
  backgroundColor?: string;
}

export interface BackPageBlock extends BlockBase {
  type: 'back-page';
  companyName: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  legalMention?: string;
  backgroundStyle: 'corporate-classic' | 'executive-dark' | 'minimal' | 'custom';
}

// ============================================================================
// Columns Block
// ============================================================================

export interface ColumnsBlock extends BlockBase {
  type: 'columns';
  columnCount: 2 | 3;
  children: ReportBlock[][];
}

// ============================================================================
// Comment Block (CDC V2 §B.5)
// ============================================================================

export interface CommentBlock extends BlockBase {
  type: 'comment';
  content: string;
  author?: string;
  hideOnPrint: boolean;
}

// ============================================================================
// Callout / Encadré Block (CDC §8.1)
// ============================================================================

export type CalloutVariant = 'info' | 'warning' | 'success' | 'error' | 'neutral';

export interface CalloutBlock extends BlockBase {
  type: 'callout';
  content: string;
  title?: string;
  variant: CalloutVariant;
}

// ============================================================================
// Manual Table Block (CDC §8.1)
// ============================================================================

export interface ManualTableBlock extends BlockBase {
  type: 'manual-table';
  title?: string;
  headers: string[];
  rows: string[][];
  bordered: boolean;
  striped: boolean;
}

// ============================================================================
// Formula Block (CDC V2 §C.2)
// ============================================================================

export interface FormulaBlock extends BlockBase {
  type: 'formula';
  label: string;
  expression: string;
  format: KPIFormat;
  result?: number | null;
  error?: string;
}

// ============================================================================
// TOC Block (auto-generated)
// ============================================================================

export interface TOCBlock extends BlockBase {
  type: 'toc-block';
  title: string;
  maxDepth: 1 | 2 | 3;
}

// ============================================================================
// Discriminated Union
// ============================================================================

export type ReportBlock =
  | TextBlock
  | KPIBlock
  | KPIGridBlock
  | TableBlock
  | ChartBlock
  | SeparatorBlock
  | PageBreakBlock
  | SpacerBlock
  | ImageBlock
  | CoverBlock
  | BackPageBlock
  | ColumnsBlock
  | CommentBlock
  | CalloutBlock
  | ManualTableBlock
  | FormulaBlock
  | TOCBlock;

// ============================================================================
// Block Comments (CDC V2 §B.5)
// ============================================================================

export interface BlockComment {
  id: string;
  blockId: string;
  author: { id: string; name: string; role: string };
  content: string;
  status: 'open' | 'resolved' | 'rejected';
  mentions?: string[];
  replies?: BlockComment[];
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ============================================================================
// Workflow & Validation (CDC §13)
// ============================================================================

export type ValidationAction = 'approve' | 'reject' | 'request_revision' | 'comment';

export interface ValidationLevel {
  level: number;
  label: string;
  actors: { id: string; name: string; role: string }[];
  deadline?: number; // hours
  required: boolean;
}

export interface ValidationCircuit {
  levels: ValidationLevel[];
  currentLevel: number;
  history: ValidationEvent[];
}

export interface ValidationEvent {
  id: string;
  level: number;
  action: ValidationAction;
  actor: { id: string; name: string };
  comment?: string;
  timestamp: string;
}

// ============================================================================
// Audiences (CDC V2 §D)
// ============================================================================

export interface Audience {
  id: string;
  name: string;
  description?: string;
  members: { id?: string; name: string; email: string }[];
  deliveryFormat: 'pdf' | 'pdf+excel' | 'link';
}

// ============================================================================
// Scheduling (CDC §12, §14)
// ============================================================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  dayOfMonth?: number;
  time: string; // HH:MM
  periodMode: 'previous_month' | 'previous_quarter' | 'previous_year' | 'custom';
  autoSendValidation: boolean;
  notifyReaders: boolean;
  archivePath?: string;
  namingPattern: string; // e.g. "{type}_{YYYY}_{MM}"
}

// ============================================================================
// Dynamic Variables (CDC §12.2)
// ============================================================================

export interface VariableContext {
  period: PeriodSelection;
  company?: { name: string; address?: string };
  user?: { fullname: string };
  report?: { name: string; version: number };
  kpis?: Record<string, number | string>;
  generatedDate?: string;
}

// ============================================================================
// Report Master / Instance (CDC V3 §E)
// ============================================================================

export type Periodicity = 'monthly' | 'quarterly' | 'annual' | 'manual';

export type NarrativeBehavior = 'empty' | 'inherit' | 'ai';

export interface NarrativeZoneConfig {
  blockId: string;
  behavior: NarrativeBehavior;
  aiPrompt?: string;
}

export interface ReportMaster {
  id: string;
  name: string;
  description?: string;
  periodicity: Periodicity;
  content: ReportPage[]; // Structure without data
  narrativeZones: NarrativeZoneConfig[];
  theme: ReportTheme;
  typography: ReportTypography;
  pageSettings: PageSettings;
  audienceConfig?: Audience[];
  validationCircuit?: ValidationCircuit;
  scheduleConfig?: ScheduleConfig;
  createdBy?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportInstance {
  id: string;
  masterId: string;
  period: PeriodSelection;
  status: ReportStatus;
  narrativeContent: Record<string, string>; // blockId → text
  dataSnapshot?: Record<string, unknown>; // Frozen values on validation
  generatedBy: 'manual' | 'scheduled' | 'closure_trigger';
  masterVersion: number;
  pdfUrl?: string;
  pdfVersions?: Record<string, string>; // audience → url
  validatedBy?: string;
  validatedAt?: string;
  archivedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Block Catalog
// ============================================================================

export type CatalogCategory = 'text' | 'data' | 'layout' | 'structure' | 'enrichment';

export interface CatalogItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: CatalogCategory;
  blockType: BlockType;
  defaultBlock: Omit<ReportBlock, 'id'>;
}

// ============================================================================
// Export Options (CDC §14)
// ============================================================================

export type ExportFormat = 'pdf' | 'pdf-a' | 'xlsx' | 'pptx' | 'html' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  quality: 'high' | 'low'; // 300 DPI vs 72 DPI
  password?: string;
  watermark?: string;
  includeComments: boolean;
  audience?: string; // Filter by audience
  pageRange?: { from: number; to: number };
}

// ============================================================================
// AI Features (CDC §16)
// ============================================================================

export interface AIInsightRequest {
  type: 'executive_summary' | 'pl_analysis' | 'treasury_analysis' | 'anomaly_detection' | 'points_attention';
  period: PeriodSelection;
  context?: Record<string, unknown>;
}

export interface AIInsightResult {
  text: string;
  confidence: number;
  sources: string[];
  timestamp: string;
}

// ============================================================================
// Default Factories — PROJECT COLORS
// ============================================================================

export const DEFAULT_THEME: ReportTheme = {
  primaryColor: '#171717',
  secondaryColor: '#737373',
  backgroundColor: '#fafafa',
  cardBackground: '#ffffff',
  textPrimary: '#0a0a0a',
  textSecondary: '#404040',
  positive: '#22c55e',
  negative: '#ef4444',
  warning: '#f59e0b',
  borderColor: '#e5e5e5',
};

export const DEFAULT_TYPOGRAPHY: ReportTypography = {
  fontMain: 'Exo 2, sans-serif',
  fontHeadings: 'Exo 2, sans-serif',
  fontData: 'JetBrains Mono, monospace',
  baseFontSize: 14,
  h1Size: 24,
  h1Weight: 600,
  h1Color: '#0a0a0a',
  h2Size: 20,
  h2Weight: 600,
  h2Color: '#171717',
  h3Size: 16,
  h3Weight: 500,
  h3Color: '#404040',
  lineHeight: 1.6,
  paragraphSpacing: 16,
};

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  format: 'a4-portrait',
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 25,
  marginRight: 20,
  showHeader: true,
  showFooter: true,
  headerText: '',
  footerText: 'Page {page} sur {total}',
  numberingStyle: 'arabic',
  startPageNumber: 1,
};
