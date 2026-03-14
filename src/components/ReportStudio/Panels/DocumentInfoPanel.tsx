/**
 * DocumentInfoPanel - Sidebar with vertical icon bar + expandable panel
 * Includes AI panel integration
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import {
  Sparkles,
  Info,
  GitBranch,
  History,
  MessageSquare,
  TrendingUp,
  Settings,
  Download,
  Share2,
  Printer,
  FileText,
  Lock,
  Trash2,
  X,
  Pencil,
  Highlighter,
  StickyNote,
  Lightbulb,
  User,
  Link2,
  GitCompare,
  RotateCcw,
  Eye,
  Paintbrush,
} from 'lucide-react';
import VersionHistoryPanel, { VersionItem } from '@/components/common/VersionHistoryPanel';

interface DocumentInfoPanelProps {
  document: DocumentInfo;
  collapsed: boolean;
  onCollapse: () => void;
  onAction: (action: string, data?: any) => void;
  aiPanel?: React.ReactNode;
}

interface DocumentInfo {
  id: string;
  title: string;
  type: string;
  size: string;
  version: string;
  pages: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  metadata: Record<string, string>;
  owner: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  };
  workflow?: WorkflowInfo;
  versions: VersionInfo[];
  linkedDocuments: LinkedDocument[];
  comments: CommentInfo[];
  activities: ActivityInfo[];
}

interface WorkflowInfo {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  currentStep: number;
  totalSteps: number;
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  assignee: string;
  assigneeInitials: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface VersionInfo {
  version: string;
  label: string;
  description: string;
  author: string;
  date: string;
  isCurrent: boolean;
}

interface LinkedDocument {
  id: string;
  title: string;
  type: 'annexe' | 'parent' | 'related';
  status: 'valid' | 'expired' | 'draft';
}

interface CommentInfo {
  id: string;
  author: string;
  authorInitials: string;
  date: string;
  content: string;
  resolved?: boolean;
}

interface ActivityInfo {
  id: string;
  action: string;
  author: string;
  time: string;
}

type PanelTab = 'ai' | 'info' | 'owner' | 'links' | 'workflow' | 'versions' | 'comments' | 'activity' | null;

export const DocumentInfoPanel: React.FC<DocumentInfoPanelProps> = ({
  document,
  collapsed,
  onCollapse,
  onAction,
  aiPanel,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>(null);

  // Transform document versions to VersionHistoryPanel format
  const mappedVersions = useMemo<VersionItem[]>(() => {
    return document.versions.map((v, index) => ({
      id: `v${index}`,
      versionNumber: index + 1,
      versionLabel: v.label,
      versionType: v.isCurrent ? 'publish' : 'manual' as const,
      createdAt: v.date,
      createdBy: {
        id: `user-${index}`,
        name: v.author,
        initials: v.author.split(' ').map(n => n[0]).join('').toUpperCase(),
      },
      changesSummary: v.description ? [v.description] : undefined,
      isCurrent: v.isCurrent,
      isMajorVersion: v.isCurrent,
      isPublished: v.isCurrent,
    }));
  }, [document.versions]);

  const tabs: { id: PanelTab; icon: React.ElementType; label: string; separator?: boolean }[] = [
    { id: 'ai', icon: Lightbulb, label: 'Proph3t' },
    { id: 'info', icon: Info, label: 'Informations', separator: true },
    { id: 'owner', icon: User, label: 'Proprietaire' },
    { id: 'links', icon: Link2, label: 'Documents lies' },
    { id: 'workflow', icon: GitBranch, label: 'Workflow', separator: true },
    { id: 'versions', icon: History, label: 'Versions' },
    { id: 'comments', icon: MessageSquare, label: 'Commentaires' },
    { id: 'activity', icon: TrendingUp, label: 'Activite' },
  ];

  const handleTabClick = (tabId: PanelTab) => {
    if (activeTab === tabId) {
      setActiveTab(null);
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="flex h-full">
      {/* Vertical icon bar */}
      <div className="w-14 bg-white border-l border-gray-200 flex flex-col items-center py-4">
        {/* Tab icons */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <React.Fragment key={tab.id}>
                {tab.separator && (
                  <div className="w-8 h-px bg-gray-200 my-2" />
                )}
                <button
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'relative p-2.5 rounded-lg transition-colors',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  )}
                  title={tab.label}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-1 pt-4 border-t border-gray-200 mt-4">
          <button
            onClick={() => onAction('settings')}
            className="p-2.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            title="Parametres"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expandable panel */}
      {activeTab && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
          {/* AI Panel */}
          {activeTab === 'ai' && aiPanel}

          {/* Document panels */}
          {activeTab !== 'ai' && (
            <>
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h2>
                <button
                  onClick={() => setActiveTab(null)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto">
                {/* INFO TAB */}
                {activeTab === 'info' && (
                  <div className="p-4 space-y-4">
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Type" value={document.type} />
                      <InfoRow label="Taille" value={document.size} />
                      <InfoRow label="Version" value={document.version} />
                      <InfoRow label="Pages" value={document.pages.toString()} />
                      <InfoRow label="Cree le" value={formatDate(document.createdAt)} />
                      <InfoRow label="Modifie le" value={formatDate(document.updatedAt)} />
                    </div>

                    {/* Tags */}
                    <div>
                      <span className="text-xs text-gray-500">Tags</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {document.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                        <button className="px-2 py-0.5 border border-dashed border-gray-300 text-gray-500 text-xs rounded-full hover:bg-gray-50">
                          + Ajouter
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* OWNER TAB */}
                {activeTab === 'owner' && (
                  <div className="p-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-medium text-lg">
                        {document.owner.initials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{document.owner.name}</p>
                        <p className="text-xs text-gray-500">Proprietaire du document</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onAction('transferOwnership')}
                      className="mt-4 w-full px-4 py-2 text-sm text-primary border border-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      Transferer la propriete
                    </button>
                  </div>
                )}

                {/* LINKS TAB */}
                {activeTab === 'links' && (
                  <div className="p-4 space-y-3">
                    {document.linkedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.title}</p>
                          <p className="text-xs text-gray-500">{doc.type}</p>
                        </div>
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded-full',
                          doc.status === 'valid' && 'bg-green-100 text-green-700',
                          doc.status === 'expired' && 'bg-red-100 text-red-700',
                          doc.status === 'draft' && 'bg-yellow-100 text-yellow-700'
                        )}>
                          {doc.status === 'valid' ? 'Valide' : doc.status === 'expired' ? 'Expire' : 'Brouillon'}
                        </span>
                      </div>
                    ))}
                    <button
                      onClick={() => onAction('addLinkedDocument')}
                      className="w-full px-3 py-2 border border-dashed border-gray-300 text-gray-500 text-sm rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      Ajouter un document lie
                    </button>
                  </div>
                )}

                {/* WORKFLOW TAB */}
                {activeTab === 'workflow' && document.workflow && (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{document.workflow.name}</p>
                        <p className="text-xs text-gray-500">
                          {document.workflow.currentStep} / {document.workflow.totalSteps} etapes
                        </p>
                      </div>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        document.workflow.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                        document.workflow.status === 'completed' && 'bg-green-100 text-green-700',
                        document.workflow.status === 'pending' && 'bg-gray-100 text-gray-700'
                      )}>
                        {document.workflow.status === 'in_progress' ? 'En cours' :
                         document.workflow.status === 'completed' ? 'Termine' : 'En attente'}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(document.workflow.currentStep / document.workflow.totalSteps) * 100}%` }}
                      />
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      {document.workflow.steps.map((step, index) => (
                        <div key={step.id} className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                            step.status === 'completed' && 'bg-green-100 text-green-700',
                            step.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                            step.status === 'pending' && 'bg-gray-100 text-gray-500'
                          )}>
                            {step.status === 'completed' ? '✓' : index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{step.name}</p>
                            <p className="text-xs text-gray-500">{step.assignee} • {step.dueDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* VERSIONS TAB */}
                {activeTab === 'versions' && (
                  <VersionHistoryPanel
                    versions={mappedVersions}
                    isLoading={false}
                    onRestore={(versionId) => {
                      const originalVersion = document.versions.find((_, i) => `v${i}` === versionId);
                      if (originalVersion) {
                        onAction('restoreVersion', originalVersion);
                      }
                    }}
                    onView={(versionId) => {
                      const originalVersion = document.versions.find((_, i) => `v${i}` === versionId);
                      if (originalVersion) {
                        onAction('viewVersion', originalVersion);
                      }
                    }}
                    onDelete={(versionId) => {
                      const originalVersion = document.versions.find((_, i) => `v${i}` === versionId);
                      if (originalVersion) {
                        onAction('deleteVersion', originalVersion);
                      }
                    }}
                    onCompare={(versionId1, versionId2) => {
                      const version1 = document.versions.find((_, i) => `v${i}` === versionId1);
                      const version2 = document.versions.find((_, i) => `v${i}` === versionId2);
                      if (version1 && version2) {
                        onAction('compareVersions', { version1, version2 });
                      }
                    }}
                    showCompare
                  />
                )}

                {/* COMMENTS TAB */}
                {activeTab === 'comments' && (
                  <div className="p-4 space-y-4">
                    <div className="space-y-3">
                      {document.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary text-xs flex items-center justify-center font-medium">
                            {comment.authorInitials}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 text-sm">{comment.author}</span>
                              <span className="text-xs text-gray-400">{comment.date}</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add comment */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ajouter un commentaire..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <button className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTIVITY TAB */}
                {activeTab === 'activity' && (
                  <div className="p-4">
                    <div className="space-y-4">
                      {document.activities.map((activity, index) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                            {index < document.activities.length - 1 && (
                              <div className="absolute top-4 left-0.5 w-0.5 h-full bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-sm text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {activity.author} • {activity.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => onAction('viewFullHistory')}
                      className="w-full text-sm text-primary hover:underline"
                    >
                      Voir tout l'historique
                    </button>
                  </div>
                )}
              </div>

              {/* Actions footer */}
              <div className="border-t border-gray-200 p-3">
                {/* Annotation tools */}
                <div className="flex justify-center gap-2 mb-3 pb-3 border-b border-gray-100">
                  <button
                    onClick={() => onAction('addNote')}
                    className="p-2 hover:bg-yellow-50 rounded-lg"
                    title="Ajouter une note"
                  >
                    <StickyNote className="w-5 h-5 text-yellow-600" />
                  </button>
                  <button
                    onClick={() => onAction('highlight')}
                    className="p-2 hover:bg-yellow-50 rounded-lg"
                    title="Surligner"
                  >
                    <Highlighter className="w-5 h-5 text-yellow-500" />
                  </button>
                  <button
                    onClick={() => onAction('annotate')}
                    className="p-2 hover:bg-blue-50 rounded-lg"
                    title="Annoter"
                  >
                    <Pencil className="w-5 h-5 text-blue-600" />
                  </button>
                </div>

                {/* Main actions */}
                <div className="grid grid-cols-4 gap-2">
                  <ActionButton icon={Paintbrush} label="Design" onClick={() => onAction('design')} />
                  <ActionButton icon={Share2} label="Partager" onClick={() => onAction('share')} />
                  <ActionButton icon={Download} label="Telecharger" onClick={() => onAction('download')} />
                  <ActionButton icon={Printer} label="Imprimer" onClick={() => onAction('print')} />
                  <ActionButton icon={FileText} label="Metadonnees" onClick={() => onAction('editMetadata')} />
                  <ActionButton icon={GitBranch} label="Workflow" onClick={() => onAction('startWorkflow')} />
                  <ActionButton icon={Lock} label="Verrouiller" onClick={() => onAction('lock')} />
                  <ActionButton icon={Trash2} label="Supprimer" onClick={() => onAction('delete')} danger />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Helper components
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 font-medium">{value}</span>
  </div>
);

const ActionButton: React.FC<{
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
      danger
        ? 'hover:bg-red-50 text-red-600'
        : 'hover:bg-gray-100 text-gray-600'
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="text-[10px]">{label}</span>
  </button>
);

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default DocumentInfoPanel;
