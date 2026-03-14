/**
 * Report Studio TypeScript Types
 * Based on EASY VIEW BI Specification v2.0
 */

// ============================================================================
// SECTION: Access Control & Permissions
// ============================================================================

export type AccessLevel = 'owner' | 'editor' | 'viewer' | 'none';

export type PermissionScope = 'public' | 'workspace' | 'restricted';

export interface ReportPermission {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  accessLevel: AccessLevel;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface ReportAccessControl {
  /** Who can access this report */
  scope: PermissionScope;
  /** Is the report locked (visible but not accessible) */
  isLocked: boolean;
  /** Lock reason shown to users without access */
  lockReason?: string;
  /** Owner of the report */
  ownerId: string;
  ownerName: string;
  /** List of users with specific permissions */
  permissions: ReportPermission[];
  /** Teams/groups with access */
  teamAccess?: {
    teamId: string;
    teamName: string;
    accessLevel: AccessLevel;
  }[];
  /** Can users request access */
  allowAccessRequests: boolean;
  /** Pending access requests */
  pendingRequests?: AccessRequest[];
}

export interface AccessRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedAt: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

// ============================================================================
// SECTION: Report Types & Categories
// ============================================================================

export type ReportCategory =
  | 'operational'
  | 'strategic'
  | 'opportunity'
  | 'feasibility'
  | 'risk'
  | 'predictive'
  | 'strategic_docs'
  | 'audit';

export type ReportComplexity = 'simple' | 'medium' | 'complex';

export interface ReportType {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description: string;
  category: ReportCategory;
  complexity: ReportComplexity;
  sections: SectionTemplate[];
  outputFormats: ExportFormat[];
  variants?: string[];
  aiFeatures?: string[];
  systemPrompt?: string;
  requiredData?: string[];
  questionsTemplate?: DataRequestTemplate[];
  recommendedCharts?: ChartType[];
  icon: string;
  estimatedPages?: string;
  idealFor?: string[];
  isActive: boolean;
  isPremium: boolean;
}

export interface ReportCombination {
  id: string;
  code: string;
  name: string;
  description: string;
  reportTypes: ReportType[];
  structureTemplate: Record<string, any>;
  transitionPrompts: Record<string, string>;
  estimatedPages?: string;
  idealFor?: string[];
  isSystem: boolean;
}

// ============================================================================
// SECTION: Report & Content Structure
// ============================================================================

export type ReportStatus =
  | 'collecting_data'
  | 'draft'
  | 'generating'
  | 'review'
  | 'published'
  | 'archived';

export interface Report {
  id: string;
  workspaceId: string;
  title: string;
  reportTypes: ReportType[];
  isCombinedReport: boolean;
  combinationTemplate?: ReportCombination;
  dataImports: DataImport[];
  additionalData?: Record<string, any>;

  // Period coverage
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;

  executiveSummary: string;
  insights: Insight[];
  recommendations: Recommendation[];
  actionPlan?: ActionItem[];
  riskAnalysis?: RiskAnalysis;
  opportunityAnalysis?: OpportunityAnalysis;
  feasibilityAnalysis?: FeasibilityAnalysis;
  chartsConfig: ChartConfig[];
  predictions?: Prediction[];
  scenarios?: Scenario[];
  confidenceScore?: number;
  dataCompleteness?: number;
  limitations: string[];
  generationPrompt?: string;
  aiModelVersion?: string;
  generationTimeMs?: number;
  version: number;
  parentReportId?: string;
  status: ReportStatus;
  /** Access control and permissions */
  accessControl?: ReportAccessControl;
  /** Report design settings (typography, colors, page format, etc.) */
  designSettings?: import('./reportDesign').ReportDesignSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportContent {
  id: string;
  reportId: string;
  contentTree: ContentTree;
  lastEditedBy?: string;
  lastEditedAt: string;
  version: number;
  isDraft: boolean;
}

export interface ContentTree {
  sections: Section[];
}

// ============================================================================
// SECTION: Document Structure (Sections & Blocks)
// ============================================================================

export type SectionStatus = 'generated' | 'edited' | 'manual';

export interface Section {
  id: string;
  type: 'section';
  title: string;
  icon?: string;
  level: number;
  pageStart?: number;
  blocks: ContentBlock[];
  children: Section[];
  status: SectionStatus;
  isLocked: boolean;
  isCollapsed?: boolean;
  metadata?: {
    completionStatus?: 'complete' | 'draft' | 'needs_review';
    hasComments?: boolean;
    hasChanges?: boolean;
    aiConfidence?: number;
  };
}

export interface SectionTemplate {
  id: string;
  title: string;
  titleEn?: string;
  level: number;
  requiredBlocks?: BlockType[];
  description?: string;
}

// ============================================================================
// SECTION: Content Blocks
// ============================================================================

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'chart'
  | 'table'
  | 'image'
  | 'callout'
  | 'quote'
  | 'divider'
  | 'pagebreak'
  | 'list'
  | 'code';

export interface BaseBlock {
  id: string;
  type: BlockType;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    aiGenerated?: boolean;
    comments?: number;
  };
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  content: string;
  formatting?: TextFormatting;
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
  formatting?: TextFormatting;
}

export interface ChartBlock extends BaseBlock {
  type: 'chart';
  chartType: ChartType;
  data: ChartData;
  config: ChartConfig;
}

export interface TableBlock extends BaseBlock {
  type: 'table';
  headers: TableHeader[];
  rows: TableRow[];
  config: TableConfig;
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface CalloutBlock extends BaseBlock {
  type: 'callout';
  variant: 'info' | 'warning' | 'success' | 'error' | 'tip';
  title?: string;
  content: string;
  icon?: string;
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  content: string;
  source?: string;
  author?: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface PagebreakBlock extends BaseBlock {
  type: 'pagebreak';
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  listType: 'bullet' | 'numbered';
  items: ListItem[];
}

export interface ListItem {
  id: string;
  content: string;
  children?: ListItem[];
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ChartBlock
  | TableBlock
  | ImageBlock
  | CalloutBlock
  | QuoteBlock
  | DividerBlock
  | PagebreakBlock
  | ListBlock;

// ============================================================================
// SECTION: Text Formatting
// ============================================================================

export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

// ============================================================================
// SECTION: Charts & Visualizations
// ============================================================================

export type ChartType =
  // Basic Charts
  | 'line'
  | 'bar'
  | 'horizontal_bar'
  | 'stacked_bar'
  | 'grouped_bar'
  | 'pie'
  | 'donut'
  | 'area'
  | 'stacked_area'
  | 'scatter'
  | 'bubble'
  // Advanced Charts
  | 'radar'
  | 'treemap'
  | 'sankey'
  | 'funnel'
  | 'gauge'
  | 'heatmap'
  | 'waterfall'
  | 'candlestick'
  | 'boxplot'
  | 'map'
  | 'choropleth'
  // Combined/Hybrid Charts
  | 'combo'
  | 'dual_axis'
  | 'bullet'
  | 'lollipop'
  // Micro Charts
  | 'sparkline'
  | 'sparkbar'
  | 'sparkarea'
  // Strategic Charts
  | 'swot_matrix'
  | 'porter_diagram'
  | 'bcg_matrix'
  | 'perceptual_map'
  | 'ansoff_matrix'
  | 'risk_matrix'
  | 'priority_matrix'
  // Time-based Charts
  | 'timeline'
  | 'gantt'
  | 'calendar_heatmap'
  // Analysis Charts
  | 'pareto'
  | 'control_chart'
  | 'cohort'
  | 'rfm_matrix'
  | 'sunburst'
  | 'network'
  | 'word_cloud'
  // KPI & Cards
  | 'kpi_card'
  | 'progress_ring'
  | 'comparison_card';

export interface ChartData {
  labels?: string[];
  datasets: ChartDataset[];
  raw?: Record<string, any>[];
}

export interface ChartDataset {
  label: string;
  data: (number | null)[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
}

export interface ChartConfig {
  title?: string;
  subtitle?: string;
  source?: string;
  width?: number;
  height?: number;
  colorScheme?: 'corporate' | 'vibrant' | 'pastel' | 'monochrome' | 'custom';
  colors?: string[];
  legend?: {
    show: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  gridLines?: boolean;
  tooltips?: boolean;
  animations?: boolean;
  interactive?: boolean;
}

export interface AxisConfig {
  title?: string;
  min?: number;
  max?: number;
  format?: string;
  gridLines?: boolean;
}

// ============================================================================
// SECTION: Tables
// ============================================================================

export interface TableHeader {
  id: string;
  label: string;
  key: string;
  sortable?: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'currency' | 'percentage' | 'date';
}

export type TableRow = Record<string, TableCell>;

export interface TableCell {
  value: string | number | null;
  formatted?: string;
  style?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
  };
}

export interface TableConfig {
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
}

// ============================================================================
// SECTION: AI & Insights
// ============================================================================

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  value?: string;
  change?: number;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  relatedDataPoints?: string[];
  actions?: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  timeline?: string;
  responsible?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  assignee?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// SECTION: Risk & Analysis Types
// ============================================================================

export interface RiskAnalysis {
  risks: Risk[];
  matrix?: RiskMatrix;
  mitigationPlan?: MitigationAction[];
}

export interface Risk {
  id: string;
  category: string;
  title: string;
  description: string;
  probability: number; // 1-5
  impact: number; // 1-5
  criticality: number; // probability * impact
  status: 'identified' | 'mitigated' | 'accepted' | 'transferred';
  mitigation?: string;
  residualRisk?: number;
}

export interface RiskMatrix {
  dimensions: {
    probability: { label: string; levels: string[] };
    impact: { label: string; levels: string[] };
  };
  risks: { id: string; x: number; y: number }[];
}

export interface MitigationAction {
  id: string;
  riskId: string;
  action: string;
  responsible?: string;
  deadline?: string;
  status: 'planned' | 'in_progress' | 'completed';
}

export interface OpportunityAnalysis {
  score: number;
  recommendation: 'go' | 'no_go' | 'conditional';
  conditions?: string[];
  attractiveness: {
    marketSize?: number;
    trends?: string[];
    windowOfOpportunity?: string;
  };
  capability: {
    strategicAlignment?: number;
    resourcesAvailable?: number;
    competitiveAdvantage?: string[];
  };
}

export interface FeasibilityAnalysis {
  dimensions: FeasibilityDimension[];
  overallScore: number;
  recommendation: 'feasible' | 'partially_feasible' | 'not_feasible';
  criticalConstraints?: string[];
}

export interface FeasibilityDimension {
  name: string;
  score: number; // 1-10
  status: 'green' | 'yellow' | 'red';
  findings: string[];
  risks: string[];
}

export interface Prediction {
  id: string;
  metric: string;
  horizon: string;
  values: { date: string; value: number; confidence?: number }[];
  model: string;
  accuracy?: number;
}

export interface Scenario {
  id: string;
  name: string;
  type: 'optimistic' | 'pessimistic' | 'realistic' | 'custom';
  description: string;
  assumptions: string[];
  projections: Record<string, number[]>;
}

// ============================================================================
// SECTION: Data Import & Requests
// ============================================================================

export interface DataImport {
  id: string;
  workspaceId: string;
  originalFilename: string;
  fileType: 'excel' | 'csv' | 'word' | 'pdf' | 'json' | 'xml' | 'api' | 'image';
  filePath: string;
  fileSize: number;
  fileHash: string;
  detectedEncoding?: string;
  detectedLanguage?: string;
  parsedData?: Record<string, any>;
  columnMapping?: Record<string, string>;
  dataSchema?: DataSchema;
  rowCount?: number;
  columnCount?: number;
  aiSummary?: string;
  detectedDataType?: string;
  dataQualityScore?: number;
  completenessScore?: number;
  anomaliesDetected?: Anomaly[];
  missingDataSuggestions?: string[];
  status: 'pending' | 'processing' | 'completed' | 'needs_more_data' | 'error';
  tags: string[];
  importedBy: string;
  importedAt: string;

  // Period coverage
  periodStart?: string;
  periodEnd?: string;
  periodLabel?: string;

  // Versioning
  version: number;
  replacesImportId?: string;
  isLatest: boolean;
  versionNotes?: string;
}

export interface DataSchema {
  columns: ColumnDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  nullable: boolean;
  format?: string;
}

export interface Anomaly {
  type: 'outlier' | 'missing' | 'inconsistent' | 'duplicate';
  column?: string;
  row?: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DataRequest {
  id: string;
  reportId: string;
  question: string;
  questionContext: string;
  dataTypeExpected: string;
  responseFormat: 'text' | 'number' | 'date' | 'file' | 'selection' | 'multi_selection' | 'table' | 'yes_no';
  options?: SelectOption[];
  validationRules?: ValidationRule[];
  priority: 'critical' | 'important' | 'optional';
  impactOnAnalysis: string;
  response?: any;
  responseFileId?: string;
  respondedAt?: string;
  respondedBy?: string;
  status: 'pending' | 'answered' | 'skipped' | 'expired';
  order: number;
  createdAt: string;
}

export interface DataRequestTemplate {
  question: string;
  format: DataRequest['responseFormat'];
  options?: SelectOption[];
  priority: DataRequest['priority'];
  context?: string;
  condition?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'regex' | 'custom';
  value?: any;
  message: string;
}

// ============================================================================
// SECTION: Version Control
// ============================================================================

export interface ReportVersion {
  id: string;
  reportId: string;
  versionNumber: number;
  contentSnapshot: ContentTree;
  name?: string;
  description?: string;
  changesSummary?: VersionChange[];
  createdAt: string;
  createdBy: string;
}

export interface VersionChange {
  type: 'added' | 'modified' | 'deleted';
  path: string;
  description: string;
}

// ============================================================================
// SECTION: Comments & Collaboration
// ============================================================================

export interface ReportComment {
  id: string;
  reportId: string;
  blockId: string;
  content: string;
  parentId?: string;
  replies?: ReportComment[];
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  author: CommentAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
}

// ============================================================================
// SECTION: Export
// ============================================================================

export type ExportFormat = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'html' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  quality?: 'draft' | 'standard' | 'high';
  pageSize?: 'A4' | 'Letter' | 'A3';
  orientation?: 'portrait' | 'landscape';
  margins?: 'normal' | 'narrow' | 'wide';
  includeTableOfContents?: boolean;
  includeCoverPage?: boolean;
  includeComments?: boolean;
  includeAnnotations?: boolean;
  watermark?: string;
  password?: string;
  brandingFooter?: boolean;
  selectedSections?: string[];
  pageRange?: { start: number; end: number };
}

// ============================================================================
// SECTION: UI State & Editor
// ============================================================================

export interface ReportStudioState {
  report: Report | null;
  content: ReportContent | null;
  mode: 'view' | 'edit';
  selectedBlockId: string | null;
  selectedSectionId: string | null;
  activePanel: 'navigation' | 'ai' | 'both';
  zoom: number;
  viewMode: 'single' | 'double' | 'continuous';
  showThumbnails: boolean;
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
}

export interface EditorState {
  isEditing: boolean;
  activeBlockId: string | null;
  selection: TextSelection | null;
  clipboard: ContentBlock | null;
  undoStack: EditorAction[];
  redoStack: EditorAction[];
}

export interface TextSelection {
  blockId: string;
  start: number;
  end: number;
  text: string;
}

export interface EditorAction {
  type: 'insert' | 'delete' | 'update' | 'move' | 'reorder';
  targetId: string;
  previousState: any;
  newState: any;
  timestamp: number;
}

// ============================================================================
// SECTION: AI Panel
// ============================================================================

export interface AIPanelState {
  summary: string;
  kpis: KPICard[];
  insights: Insight[];
  attentionPoints: AttentionPoint[];
  recommendations: Recommendation[];
  chatMessages: ChatMessage[];
  isLoading: boolean;
}

export interface KPICard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  unit?: string;
  sparkline?: number[];
}

export interface AttentionPoint {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  relatedSection?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: 'insert' | 'replace' | 'create_section' | 'update_chart';
  label: string;
  data: any;
}

// ============================================================================
// SECTION: AI Writing Assistant
// ============================================================================

export type RewriteOption =
  | 'improve'
  | 'simplify'
  | 'formalize'
  | 'expand'
  | 'summarize'
  | 'translate'
  | 'custom';

export interface AIRewriteRequest {
  option: RewriteOption;
  text: string;
  targetLanguage?: string;
  customInstruction?: string;
  context?: {
    reportType: string;
    sectionTitle: string;
    previousContent?: string;
  };
}

export interface AIRewriteResponse {
  original: string;
  rewritten: string;
  changes: TextDiff[];
}

export interface TextDiff {
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  original?: string;
  new?: string;
}

// ============================================================================
// SECTION: Drag & Drop
// ============================================================================

export interface DragItem {
  type: 'section' | 'block';
  id: string;
  parentId?: string;
  index: number;
  data: Section | ContentBlock;
}

export interface DropTarget {
  type: 'section' | 'block' | 'trash';
  id: string;
  position: 'before' | 'after' | 'inside';
}

// ============================================================================
// SECTION: AI Messages (for store)
// ============================================================================

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatAction[];
}

// ============================================================================
// SECTION: User Report Configuration
// ============================================================================

export type ConfigVisibility = 'private' | 'workspace' | 'public';

export interface UserReportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  visibility: ConfigVisibility;
  createdBy: string;
  createdByName: string;
  createdByInfo?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  workspace: string;
  workspaceName?: string;

  // Report Types
  reportTypes: string[];
  reportTypesDetail?: ReportType[];
  reportTypesCount: number;
  reportTypeNames: string[];
  combinationTemplate?: string;
  combinationTemplateName?: string;

  // Data Sources
  defaultDataSources: string[];
  dataSourcesCount: number;
  dataSourceFilters: Record<string, unknown>;

  // Configuration
  sectionConfig: SectionConfigItem[];
  kpiSelection: KPISelectionItem[];
  chartPreferences: ChartPreferences;
  periodConfig: PeriodConfig;
  aiConfig: AIConfigPreferences;
  outputConfig: OutputConfigPreferences;

  // Status & Tracking
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  isDefault: boolean;
  tags: string[];

  // Permissions
  canEdit: boolean;
  canView: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface UserReportConfigListItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  visibility: ConfigVisibility;
  createdBy: string;
  createdByName: string;
  workspace: string;
  reportTypesCount: number;
  reportTypeNames: string[];
  usageCount: number;
  lastUsedAt?: string;
  isActive: boolean;
  isDefault: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export interface SectionConfigItem {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  blocks: string[];
}

export interface KPISelectionItem {
  code: string;
  displayName: string;
  format: 'currency' | 'percentage' | 'number' | 'text';
}

export interface ChartPreferences {
  defaultChartType: ChartType;
  colorScheme: string;
  showLegends: boolean;
  showDataLabels: boolean;
  preferredCharts: {
    timeSeries: ChartType;
    comparison: ChartType;
    distribution: ChartType;
    correlation: ChartType;
  };
}

export interface PeriodConfig {
  type: 'relative' | 'fixed';
  relative?: {
    unit: 'day' | 'week' | 'month' | 'quarter' | 'year';
    count: number;
    includeCurrent: boolean;
  };
  fixed?: {
    start: string;
    end: string;
  };
  labelTemplate?: string;
}

export interface AIConfigPreferences {
  enableInsights: boolean;
  enableRecommendations: boolean;
  enablePredictions: boolean;
  analysisDepth: 'summary' | 'standard' | 'detailed';
  language: string;
  tone: 'professional' | 'casual' | 'technical';
}

export interface OutputConfigPreferences {
  defaultFormat: ExportFormat;
  pageSize: 'A4' | 'Letter' | 'A3';
  orientation: 'portrait' | 'landscape';
  includeToc: boolean;
  includeCover: boolean;
  includeAppendix: boolean;
}

export interface CreateUserReportConfigData {
  name: string;
  description?: string;
  icon?: string;
  visibility?: ConfigVisibility;
  workspace: string;
  reportTypeCodes?: string[];
  combinationCode?: string;
  dataImportIds?: string[];
  sectionConfig?: SectionConfigItem[];
  kpiSelection?: KPISelectionItem[];
  chartPreferences?: Partial<ChartPreferences>;
  periodConfig?: Partial<PeriodConfig>;
  aiConfig?: Partial<AIConfigPreferences>;
  outputConfig?: Partial<OutputConfigPreferences>;
  dataSourceFilters?: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
  tags?: string[];
}

export interface UpdateUserReportConfigData extends Partial<CreateUserReportConfigData> {
  // All fields are optional for update
}

export interface ApplyUserReportConfigData {
  title: string;
  folder?: string;
  overrideDataImports?: string[];
  overridePeriod?: Partial<PeriodConfig>;
}

export interface ApplyUserReportConfigResult {
  reportId: string;
  reportTitle: string;
  message: string;
  configUsageCount: number;
}
