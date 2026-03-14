import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { BarChart3, Lightbulb, AlertTriangle, MessageSquare, CheckCircle, Sparkles } from 'lucide-react';
import { Report, ContentBlock, Insight, Recommendation, KPICard, AttentionPoint, ChatMessage } from '@/types/reportStudio';
import { AISummary } from './AISummary';
import { KPICards } from './KPICards';
import { InsightsList } from './InsightsList';
import { AttentionPoints } from './AttentionPoints';
import { RecommendationsList } from './RecommendationsList';
import { AIChat } from './AIChat';

interface AIPanelProps {
  report: Report;
  selectedText: string | null;
  selectedBlockId: string | null;
  collapsed: boolean;
  onInsertContent: (content: ContentBlock) => void;
  onAction: (action: { type: string; data: any }) => void;
  onCollapse: () => void;
}

type PanelSection = 'summary' | 'kpis' | 'insights' | 'attention' | 'recommendations' | 'chat';

export const AIPanel: React.FC<AIPanelProps> = ({
  report,
  selectedText,
  selectedBlockId,
  collapsed,
  onInsertContent,
  onAction,
  onCollapse,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<PanelSection>>(
    new Set(['summary', 'kpis', 'insights', 'attention'])
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSection = useCallback((section: PanelSection) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const handleRegenerateSummary = useCallback(async () => {
    setIsLoading(true);
    // TODO: Call AI API to regenerate summary
    setTimeout(() => setIsLoading(false), 2000);
  }, []);

  const handleChatSubmit = useCallback(async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // TODO: Call AI API
      await new Promise(resolve => setTimeout(resolve, 1500));

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Je comprends votre demande concernant "${message}". Voici ma suggestion basée sur l'analyse du rapport...`,
        timestamp: new Date().toISOString(),
        actions: [
          { type: 'insert', label: 'Insérer dans le document', data: {} },
        ],
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChatAction = useCallback((action: { type: string; data: any }) => {
    onAction(action);
  }, [onAction]);

  // Extract KPIs from report
  const kpis: KPICard[] = report.insights
    .filter(i => i.value)
    .slice(0, 6)
    .map(insight => ({
      id: insight.id,
      label: insight.title,
      value: insight.value || '',
      change: insight.change,
      changeType: insight.type === 'positive' ? 'positive' : insight.type === 'negative' ? 'negative' : 'neutral',
    }));

  // Filter insights by type
  const positiveInsights = report.insights.filter(i => i.type === 'positive' || i.type === 'opportunity');
  const attentionPoints: AttentionPoint[] = report.insights
    .filter(i => i.type === 'warning' || i.type === 'negative')
    .map(i => ({
      id: i.id,
      severity: i.priority === 'high' ? 'critical' : i.priority === 'medium' ? 'warning' : 'info',
      title: i.title,
      description: i.description,
    }));

  // The DocumentInfoPanel handles visibility via tabs, so we always render
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-primary-200 flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">P</span>
        </div>
        <h2 className="font-display text-lg text-primary-900">Proph3t</h2>
        <span className="text-xs text-primary-400 ml-auto">Assistant IA</span>
      </div>

      {/* Selected text context */}
      {selectedText && (
        <div className="p-3 bg-info/10 border-b border-info/20">
          <p className="text-xs text-info mb-1">Texte sélectionné:</p>
          <p className="text-sm text-primary-800 line-clamp-2">&quot;{selectedText}&quot;</p>
          <div className="mt-2 flex gap-2">
            <button className="text-xs text-info hover:underline">Améliorer</button>
            <button className="text-xs text-info hover:underline">Simplifier</button>
            <button className="text-xs text-info hover:underline">Traduire</button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Summary Section */}
        <CollapsibleSection
          title="Résumé IA"
          icon={<Sparkles className="w-4 h-4 text-primary-500" />}
          isExpanded={expandedSections.has('summary')}
          onToggle={() => toggleSection('summary')}
        >
          <AISummary
            content={report.executiveSummary}
            isLoading={isLoading}
            onRegenerate={handleRegenerateSummary}
            onEdit={() => {}}
            onCopy={() => navigator.clipboard.writeText(report.executiveSummary)}
          />
        </CollapsibleSection>

        {/* KPIs Section */}
        <CollapsibleSection
          title="KPIs Clés"
          icon={<BarChart3 className="w-4 h-4 text-primary-500" />}
          count={kpis.length}
          isExpanded={expandedSections.has('kpis')}
          onToggle={() => toggleSection('kpis')}
        >
          <KPICards
            kpis={kpis}
            onHighlight={(id) => onAction({ type: 'highlight', data: { kpiId: id } })}
          />
        </CollapsibleSection>

        {/* Insights Section */}
        <CollapsibleSection
          title="Insights"
          icon={<Lightbulb className="w-4 h-4 text-primary-500" />}
          count={positiveInsights.length}
          isExpanded={expandedSections.has('insights')}
          onToggle={() => toggleSection('insights')}
        >
          <InsightsList
            insights={positiveInsights}
            onAction={(insight) => onAction({ type: 'focus_insight', data: insight })}
          />
        </CollapsibleSection>

        {/* Attention Points Section */}
        <CollapsibleSection
          title="Points d'Attention"
          icon={<AlertTriangle className="w-4 h-4 text-warning" />}
          count={attentionPoints.length}
          isExpanded={expandedSections.has('attention')}
          onToggle={() => toggleSection('attention')}
          badgeColor={attentionPoints.some(p => p.severity === 'critical') ? 'red' : 'yellow'}
        >
          <AttentionPoints
            points={attentionPoints}
            onAction={(point) => onAction({ type: 'focus_attention', data: point })}
          />
        </CollapsibleSection>

        {/* Recommendations Section */}
        <CollapsibleSection
          title="Recommandations"
          icon={<CheckCircle className="w-4 h-4 text-success" />}
          count={report.recommendations.length}
          isExpanded={expandedSections.has('recommendations')}
          onToggle={() => toggleSection('recommendations')}
        >
          <RecommendationsList
            recommendations={report.recommendations}
            onAccept={(id) => onAction({ type: 'accept_recommendation', data: { id } })}
            onReject={(id) => onAction({ type: 'reject_recommendation', data: { id } })}
            onModify={(id) => onAction({ type: 'modify_recommendation', data: { id } })}
          />
        </CollapsibleSection>

        {/* Chat Section */}
        <CollapsibleSection
          title="Assistant Chat"
          icon={<MessageSquare className="w-4 h-4 text-primary-500" />}
          isExpanded={expandedSections.has('chat')}
          onToggle={() => toggleSection('chat')}
        >
          <AIChat
            messages={chatMessages}
            isLoading={isLoading}
            onSubmit={handleChatSubmit}
            onAction={handleChatAction}
            suggestedQueries={[
              "Résume cette section",
              "Ajoute des chiffres clés",
              "Propose une recommandation",
              "Traduis en anglais",
            ]}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
};

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  badgeColor?: 'red' | 'yellow' | 'green' | 'blue';
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  count,
  badgeColor,
  isExpanded,
  onToggle,
  children,
}) => {
  const badgeColors = {
    red: 'bg-error/10 text-error',
    yellow: 'bg-warning/10 text-warning',
    green: 'bg-success/10 text-success',
    blue: 'bg-info/10 text-info',
  };

  return (
    <div className="border-b border-primary-100">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary-50"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-medium text-sm text-primary-700">{title}</span>
          {count !== undefined && (
            <span className={cn(
              'px-1.5 py-0.5 text-xs rounded-full',
              badgeColor ? badgeColors[badgeColor] : 'bg-primary-100 text-primary-600'
            )}>
              {count}
            </span>
          )}
        </div>
        <svg
          className={cn(
            'w-4 h-4 text-primary-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};
