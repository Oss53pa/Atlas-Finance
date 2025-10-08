import React from 'react';
import { FileText, Users, Eye, Calendar } from 'lucide-react';
import { Report } from '../types/reporting.types';
import { formatDate } from '@/shared/utils/formatters';

interface ReportCardProps {
  report: Report;
  onClick?: () => void;
}

const typeColors: Record<string, string> = {
  financial: 'bg-blue-100 text-blue-700',
  analytical: 'bg-purple-100 text-purple-700',
  management: 'bg-green-100 text-green-700',
  regulatory: 'bg-orange-100 text-orange-700',
};

const typeLabels: Record<string, string> = {
  financial: 'Financier',
  analytical: 'Analytique',
  management: 'Gestion',
  regulatory: 'Réglementaire',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  active: 'Actif',
  draft: 'Brouillon',
  archived: 'Archivé',
};

export const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {report.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-700 mb-3">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {report.generatedBy}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {report.views} vues
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(report.lastGenerated)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[report.type]}`}>
          {typeLabels[report.type]}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
          {statusLabels[report.status]}
        </span>
      </div>
    </div>
  );
};