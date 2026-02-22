import React from 'react';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { Task, TaskStatus, TaskPriority } from '../types/task.types';
import { formatDate } from '@/shared/utils/formatters';
import { CheckCircle2, Clock, AlertCircle, Circle, Ban, Pause } from 'lucide-react';

interface TaskTableProps {
  tasks: Task[];
  loading?: boolean;
  onTaskClick?: (task: Task) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  loading,
  onTaskClick
}) => {
  const getStatusIcon = (status: TaskStatus) => {
    const icons = {
      'todo': <Circle className="w-4 h-4 text-gray-700" />,
      'in-progress': <Clock className="w-4 h-4 text-blue-500" />,
      'review': <AlertCircle className="w-4 h-4 text-yellow-500" />,
      'done': <CheckCircle2 className="w-4 h-4 text-green-500" />,
      'cancelled': <Ban className="w-4 h-4 text-red-500" />,
      'blocked': <Pause className="w-4 h-4 text-orange-500" />
    };
    return icons[status];
  };

  const getStatusBadge = (status: TaskStatus) => {
    const styles = {
      'todo': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'review': 'bg-yellow-100 text-yellow-800',
      'done': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'blocked': 'bg-orange-100 text-orange-800'
    };
    return styles[status];
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const styles = {
      'low': 'bg-gray-100 text-gray-600',
      'medium': 'bg-blue-100 text-blue-600',
      'high': 'bg-orange-100 text-orange-600',
      'urgent': 'bg-red-100 text-red-600'
    };
    return styles[priority];
  };

  const columns = [
    {
      key: 'title',
      label: 'Tâche',
      sortable: true,
      render: (row: Task) => (
        <div>
          <div className="font-medium text-[#171717]">{row.title}</div>
          {row.description && (
            <div className="text-sm text-[#737373] truncate max-w-md">
              {row.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (row: Task) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.status)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(row.status)}`}>
            {row.status.replace('-', ' ').toUpperCase()}
          </span>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priorité',
      sortable: true,
      render: (row: Task) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(row.priority)}`}>
          {row.priority.toUpperCase()}
        </span>
      )
    },
    {
      key: 'assignee',
      label: 'Assigné à',
      sortable: true,
      render: (row: Task) => row.assignee || '-'
    },
    {
      key: 'dueDate',
      label: 'Échéance',
      sortable: true,
      render: (row: Task) => {
        if (!row.dueDate) return '-';
        const isOverdue = row.status !== 'done' && new Date(row.dueDate) < new Date();
        return (
          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
            {formatDate(row.dueDate)}
          </span>
        );
      }
    },
    {
      key: 'progress',
      label: 'Progression',
      render: (row: Task) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#171717] rounded-full transition-all"
              style={{ width: `${row.progress || 0}%` }}
            />
          </div>
          <span className="text-sm text-[#737373]">{row.progress || 0}%</span>
        </div>
      )
    }
  ];

  return (
    <DataTable
      data={tasks}
      columns={columns}
      loading={loading}
      onRowClick={onTaskClick}
      searchable
      searchPlaceholder="Rechercher une tâche..."
    />
  );
};