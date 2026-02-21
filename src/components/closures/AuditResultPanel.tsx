import React, { useState } from 'react';
import {
  AlertOctagon, XCircle, AlertTriangle, Info,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import type {
  AuditAnalysisResult,
  AuditFindingItem,
  FindingSeverity,
  FindingCategory,
} from '../../services/auditRevisionAnalyzer';

interface AuditResultPanelProps {
  result: AuditAnalysisResult | null;
  filterCategory?: FindingCategory | 'all';
  defaultExpanded?: boolean;
  onFindingClick?: (finding: AuditFindingItem) => void;
}

const SEVERITY_CONFIG: Record<FindingSeverity, {
  icon: React.ElementType;
  bgColor: string;
  borderColor: string;
  textColor: string;
  label: string;
}> = {
  critical: {
    icon: AlertOctagon,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    label: 'Critique',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    label: 'Erreur',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-700',
    label: 'Avertissement',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    label: 'Information',
  },
};

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  B: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  C: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  D: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  F: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

const AuditResultPanel: React.FC<AuditResultPanelProps> = ({
  result,
  filterCategory = 'all',
  defaultExpanded = false,
  onFindingClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  if (!result) return null;

  const findings = filterCategory === 'all'
    ? result.allFindings
    : result.allFindings.filter(f => f.category === filterCategory);

  const categoryResult = filterCategory !== 'all'
    ? result.categories.find(c => c.category === filterCategory)
    : null;

  const displayScore = categoryResult ? categoryResult.score : result.globalScore;
  const displayGrade = result.globalGrade;
  const gradeStyle = GRADE_COLORS[displayGrade] || GRADE_COLORS.F;

  const criticals = findings.filter(f => f.severity === 'critical');
  const errors = findings.filter(f => f.severity === 'error');
  const warnings = findings.filter(f => f.severity === 'warning');
  const infos = findings.filter(f => f.severity === 'info');

  const toggleFinding = (id: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderFindingGroup = (
    severity: FindingSeverity,
    items: AuditFindingItem[],
  ) => {
    if (items.length === 0) return null;
    const config = SEVERITY_CONFIG[severity];
    const Icon = config.icon;

    return (
      <div key={severity} className="space-y-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded ${config.bgColor}`}>
          <Icon className={`w-4 h-4 ${config.textColor}`} />
          <span className={`text-sm font-semibold ${config.textColor}`}>
            {config.label} ({items.length})
          </span>
        </div>
        {items.map(finding => (
          <div
            key={finding.id}
            className={`border rounded-lg ${config.borderColor} ${config.bgColor} overflow-hidden`}
          >
            <button
              onClick={() => {
                toggleFinding(finding.id);
                if (onFindingClick) onFindingClick(finding);
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${config.textColor}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${config.textColor} truncate`}>
                    {finding.title}
                  </p>
                  {finding.affectedLabel && (
                    <p className="text-xs text-gray-500 truncate">{finding.affectedLabel}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {finding.normeReference && (
                  <span className="text-xs px-2 py-0.5 bg-white/60 rounded text-gray-600">
                    {finding.normeReference}
                  </span>
                )}
                {expandedFindings.has(finding.id) ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>
            {expandedFindings.has(finding.id) && (
              <div className="px-4 pb-3 border-t border-white/50">
                <p className="text-sm text-gray-700 mt-2">{finding.detail}</p>
                {finding.suggestion && (
                  <div className="mt-2 px-3 py-2 bg-white/60 rounded text-sm">
                    <span className="font-medium text-gray-600">Suggestion : </span>
                    <span className="text-gray-700">{finding.suggestion}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Score badge */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${gradeStyle.bg} ${gradeStyle.border}`}>
            <span className={`text-lg font-bold ${gradeStyle.text}`}>
              {filterCategory === 'all' ? displayGrade : displayScore}
            </span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-[#191919]">
              {filterCategory === 'all' ? 'Résultat Global de l\'Analyse' : `Analyse — ${categoryResult?.label || filterCategory}`}
            </p>
            <p className="text-xs text-[#767676]">
              Score: {displayScore}/100 {filterCategory === 'all' ? `• Note: ${displayGrade}` : ''} • {findings.length} constat(s)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Counters */}
          {criticals.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 rounded text-xs font-medium text-red-700">
              <AlertOctagon className="w-3 h-3" /> {criticals.length}
            </span>
          )}
          {errors.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded text-xs font-medium text-orange-700">
              <XCircle className="w-3 h-3" /> {errors.length}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded text-xs font-medium text-yellow-700">
              <AlertTriangle className="w-3 h-3" /> {warnings.length}
            </span>
          )}
          {infos.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded text-xs font-medium text-blue-700">
              <Info className="w-3 h-3" /> {infos.length}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Summary alert */}
          {filterCategory === 'all' && (
            <div className={`px-4 py-3 rounded-lg border ${gradeStyle.bg} ${gradeStyle.border}`}>
              <p className={`text-sm ${gradeStyle.text}`}>{result.summary}</p>
            </div>
          )}

          {/* Findings grouped by severity */}
          {findings.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">Aucun constat pour cette catégorie.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {renderFindingGroup('critical', criticals)}
              {renderFindingGroup('error', errors)}
              {renderFindingGroup('warning', warnings)}
              {renderFindingGroup('info', infos)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditResultPanel;
