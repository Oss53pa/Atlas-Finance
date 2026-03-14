/**
 * ScheduledExport - Export personnalisé avec planification
 * Permet de choisir les sections, format, branding et programmer l'envoi
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import {
  Download,
  Send,
  Clock,
  Calendar,
  Mail,
  Users,
  FileText,
  Image,
  Table2,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Settings,
  Palette,
  Eye,
  X,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Play,
  Pause,
  RefreshCw,
  Bell,
  Link,
  Lock,
  Unlock,
  Globe,
  Building2,
  AlertCircle
} from 'lucide-react';

export interface ReportSection {
  id: string;
  name: string;
  type: 'text' | 'chart' | 'table' | 'kpi' | 'image' | 'mixed';
  isRequired?: boolean;
  order: number;
}

export interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  icon: React.ReactNode;
  description: string;
  options?: Record<string, any>;
}

export interface BrandingConfig {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  headerText?: string;
  footerText?: string;
  showPageNumbers: boolean;
  showDate: boolean;
  watermark?: string;
}

export interface ExportSchedule {
  id: string;
  name: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm
  timezone: string;
  recipients: { email: string; name?: string }[];
  format: string;
  sections: string[];
  branding: BrandingConfig;
  isActive: boolean;
  nextRun?: string;
  lastRun?: string;
  createdAt: string;
}

interface ScheduledExportProps {
  sections: ReportSection[];
  schedules: ExportSchedule[];
  onExportNow: (config: ExportConfig) => void;
  onCreateSchedule: (schedule: Omit<ExportSchedule, 'id' | 'createdAt' | 'nextRun' | 'lastRun'>) => void;
  onUpdateSchedule: (scheduleId: string, updates: Partial<ExportSchedule>) => void;
  onDeleteSchedule: (scheduleId: string) => void;
  onToggleSchedule: (scheduleId: string, isActive: boolean) => void;
  defaultBranding?: BrandingConfig;
  className?: string;
}

interface ExportConfig {
  format: string;
  sections: string[];
  branding: BrandingConfig;
  includeComments?: boolean;
  includeVersionHistory?: boolean;
  password?: string;
}

const defaultFormats: ExportFormat[] = [
  {
    id: 'pdf',
    name: 'PDF',
    extension: '.pdf',
    icon: <FileText className="w-5 h-5 text-red-500" />,
    description: 'Document portable, idéal pour l\'impression et le partage',
  },
  {
    id: 'excel',
    name: 'Excel',
    extension: '.xlsx',
    icon: <Table2 className="w-5 h-5 text-green-600" />,
    description: 'Tableur avec données éditables et formules',
  },
  {
    id: 'powerpoint',
    name: 'PowerPoint',
    extension: '.pptx',
    icon: <BarChart3 className="w-5 h-5 text-orange-500" />,
    description: 'Présentation pour vos réunions',
  },
  {
    id: 'html',
    name: 'HTML',
    extension: '.html',
    icon: <Globe className="w-5 h-5 text-blue-500" />,
    description: 'Page web interactive',
  },
  {
    id: 'image',
    name: 'Image (PNG)',
    extension: '.png',
    icon: <Image className="w-5 h-5 text-purple-500" />,
    description: 'Image haute résolution',
  },
];

const defaultBrandingConfig: BrandingConfig = {
  primaryColor: '#1C3163',
  secondaryColor: '#D6B585',
  fontFamily: 'Inter',
  showPageNumbers: true,
  showDate: true,
};

export const ScheduledExport: React.FC<ScheduledExportProps> = ({
  sections,
  schedules,
  onExportNow,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onToggleSchedule,
  defaultBranding = defaultBrandingConfig,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'schedule' | 'history'>('export');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(sections.filter(s => s.isRequired).map(s => s.id))
  );
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [showBrandingPanel, setShowBrandingPanel] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExportSchedule | null>(null);

  // Schedule form state
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1); // Monday
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleRecipients, setScheduleRecipients] = useState<{ email: string; name?: string }[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');

  // Export options
  const [includeComments, setIncludeComments] = useState(false);
  const [includeVersionHistory, setIncludeVersionHistory] = useState(false);
  const [password, setPassword] = useState('');

  const toggleSection = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.isRequired) return;

    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const selectAllSections = () => {
    setSelectedSections(new Set(sections.map(s => s.id)));
  };

  const selectRequiredOnly = () => {
    setSelectedSections(new Set(sections.filter(s => s.isRequired).map(s => s.id)));
  };

  const handleExportNow = useCallback(() => {
    onExportNow({
      format: selectedFormat,
      sections: Array.from(selectedSections),
      branding,
      includeComments,
      includeVersionHistory,
      password: password || undefined,
    });
  }, [selectedFormat, selectedSections, branding, includeComments, includeVersionHistory, password, onExportNow]);

  const handleAddRecipient = useCallback(() => {
    if (!newRecipientEmail.trim()) return;
    if (!newRecipientEmail.includes('@')) return;

    setScheduleRecipients(prev => [...prev, { email: newRecipientEmail.trim() }]);
    setNewRecipientEmail('');
  }, [newRecipientEmail]);

  const handleRemoveRecipient = (index: number) => {
    setScheduleRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateSchedule = useCallback(() => {
    if (!scheduleName.trim()) return;
    if (scheduleRecipients.length === 0) return;

    onCreateSchedule({
      name: scheduleName.trim(),
      frequency: scheduleFrequency,
      dayOfWeek: scheduleFrequency === 'weekly' ? scheduleDayOfWeek : undefined,
      dayOfMonth: scheduleFrequency === 'monthly' ? scheduleDayOfMonth : undefined,
      time: scheduleTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      recipients: scheduleRecipients,
      format: selectedFormat,
      sections: Array.from(selectedSections),
      branding,
      isActive: true,
    });

    // Reset form
    setScheduleName('');
    setScheduleRecipients([]);
    setShowScheduleModal(false);
  }, [
    scheduleName, scheduleFrequency, scheduleDayOfWeek, scheduleDayOfMonth,
    scheduleTime, scheduleRecipients, selectedFormat, selectedSections, branding, onCreateSchedule
  ]);

  const getFrequencyLabel = (schedule: ExportSchedule) => {
    switch (schedule.frequency) {
      case 'once': return 'Une fois';
      case 'daily': return 'Quotidien';
      case 'weekly':
        const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return `Hebdo (${days[schedule.dayOfWeek || 0]})`;
      case 'monthly': return `Mensuel (${schedule.dayOfMonth})`;
      case 'quarterly': return 'Trimestriel';
      default: return schedule.frequency;
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'chart': return <BarChart3 className="w-4 h-4" />;
      case 'table': return <Table2 className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'kpi': return <BarChart3 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { id: 'export', label: 'Export immédiat', icon: <Download className="w-4 h-4" /> },
            { id: 'schedule', label: 'Planification', icon: <Calendar className="w-4 h-4" /> },
            { id: 'history', label: 'Historique', icon: <Clock className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'schedule' && schedules.length > 0 && (
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {schedules.filter(s => s.isActive).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="p-4 space-y-6">
          {/* Format selection */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Format d'export</h4>
            <div className="grid grid-cols-5 gap-2">
              {defaultFormats.map(format => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-lg border-2 transition-all',
                    selectedFormat === format.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {format.icon}
                  <span className="mt-1 text-xs font-medium">{format.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Sections à inclure</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllSections}
                  className="text-xs text-primary hover:underline"
                >
                  Tout sélectionner
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={selectRequiredOnly}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Requis uniquement
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sections.sort((a, b) => a.order - b.order).map(section => (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id)}
                  disabled={section.isRequired}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left',
                    selectedSections.has(section.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300',
                    section.isRequired && 'cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                    selectedSections.has(section.id)
                      ? 'bg-primary border-primary'
                      : 'border-gray-300'
                  )}>
                    {selectedSections.has(section.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="text-gray-500">{getSectionIcon(section.type)}</span>
                  <span className="text-sm text-gray-700">{section.name}</span>
                  {section.isRequired && (
                    <span className="ml-auto text-xs text-gray-400">Requis</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Branding & Options */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowBrandingPanel(!showBrandingPanel)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Palette className="w-4 h-4" />
                Personnalisation & Options
              </span>
              {showBrandingPanel ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showBrandingPanel && (
              <div className="mt-4 space-y-4">
                {/* Colors */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Couleur principale</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Couleur secondaire</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Text options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Texte en-tête</label>
                    <input
                      type="text"
                      value={branding.headerText || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, headerText: e.target.value }))}
                      placeholder="Nom de l'entreprise"
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Texte pied de page</label>
                    <input
                      type="text"
                      value={branding.footerText || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, footerText: e.target.value }))}
                      placeholder="Confidentiel"
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={branding.showPageNumbers}
                      onChange={(e) => setBranding(prev => ({ ...prev, showPageNumbers: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Numéros de page</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={branding.showDate}
                      onChange={(e) => setBranding(prev => ({ ...prev, showDate: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Date d'export</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeComments}
                      onChange={(e) => setIncludeComments(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Commentaires</span>
                  </label>
                </div>

                {/* Password protection */}
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Protection par mot de passe (optionnel)
                  </label>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Laisser vide pour aucune protection"
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Planifier l'envoi
            </button>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Eye className="w-4 h-4" />
                Aperçu
              </button>
              <button
                onClick={handleExportNow}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporter maintenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="p-4">
          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">Aucune planification configurée</p>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Créer une planification
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => (
                <div
                  key={schedule.id}
                  className={cn(
                    'p-4 rounded-lg border transition-colors',
                    schedule.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleSchedule(schedule.id, !schedule.isActive)}
                        className={cn(
                          'mt-0.5 p-1 rounded-full transition-colors',
                          schedule.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                        )}
                      >
                        {schedule.isActive ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </button>
                      <div>
                        <h4 className="font-medium text-gray-900">{schedule.name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {getFrequencyLabel(schedule)} à {schedule.time}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {schedule.recipients.length} destinataire(s)
                          </span>
                          <span className="text-gray-300">•</span>
                          <span>{defaultFormats.find(f => f.id === schedule.format)?.name}</span>
                        </div>
                        {schedule.nextRun && schedule.isActive && (
                          <p className="text-xs text-green-600 mt-1">
                            Prochain envoi: {schedule.nextRun}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSchedule(schedule);
                          setShowScheduleModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteSchedule(schedule.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowScheduleModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter une planification
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="p-4">
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>L'historique des exports sera disponible ici</p>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                {editingSchedule ? 'Modifier la planification' : 'Nouvelle planification'}
              </h3>
              <button onClick={() => {
                setShowScheduleModal(false);
                setEditingSchedule(null);
              }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la planification
                </label>
                <input
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="ex: Rapport hebdomadaire"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fréquence
                </label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value as typeof scheduleFrequency)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="once">Une seule fois</option>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                  <option value="quarterly">Trimestriel</option>
                </select>
              </div>

              {/* Day of week for weekly */}
              {scheduleFrequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jour de la semaine
                  </label>
                  <select
                    value={scheduleDayOfWeek}
                    onChange={(e) => setScheduleDayOfWeek(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value={1}>Lundi</option>
                    <option value={2}>Mardi</option>
                    <option value={3}>Mercredi</option>
                    <option value={4}>Jeudi</option>
                    <option value={5}>Vendredi</option>
                    <option value={6}>Samedi</option>
                    <option value={0}>Dimanche</option>
                  </select>
                </div>
              )}

              {/* Day of month for monthly */}
              {scheduleFrequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jour du mois
                  </label>
                  <select
                    value={scheduleDayOfMonth}
                    onChange={(e) => setScheduleDayOfMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 28 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure d'envoi
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destinataires
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                  />
                  <button
                    onClick={handleAddRecipient}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {scheduleRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {scheduleRecipients.map((recipient, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        <Mail className="w-3 h-3 text-gray-400" />
                        {recipient.email}
                        <button
                          onClick={() => handleRemoveRecipient(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Résumé:</strong> Export {defaultFormats.find(f => f.id === selectedFormat)?.name} de {selectedSections.size} section(s)
                  envoyé à {scheduleRecipients.length} destinataire(s)
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setEditingSchedule(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={!scheduleName.trim() || scheduleRecipients.length === 0}
                className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {editingSchedule ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledExport;
