import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Eye, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { DepartmentBudget } from '../types/budgeting.types';
import { formatCurrency, formatPercent } from '@/shared/utils/formatters';

interface DepartmentsTableProps {
  departments: DepartmentBudget[];
  loading?: boolean;
  onView?: (department: DepartmentBudget) => void;
  onEdit?: (department: DepartmentBudget) => void;
  expandable?: boolean;
  expandedDepartments?: string[];
  onToggleExpand?: (deptName: string) => void;
}

const getVarianceBadge = (variancePercent: number) => {
  if (variancePercent < -5) {
    return <Badge variant="error">Dépassement</Badge>;
  }
  if (variancePercent < 5) {
    return <Badge variant="success">Conforme</Badge>;
  }
  if (variancePercent < 15) {
    return <Badge variant="warning">Attention</Badge>;
  }
  return <Badge variant="success">Économie</Badge>;
};

export const DepartmentsTable: React.FC<DepartmentsTableProps> = ({
  departments,
  loading,
  onView,
  onEdit,
  expandable = false,
  expandedDepartments = [],
  onToggleExpand,
}) => {
  const columns: Column<DepartmentBudget>[] = [
    {
      key: 'name',
      header: 'Département',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {expandable && onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(row.name);
              }}
              className="text-[#767676] hover:text-[#191919] transition-colors"
            >
              {expandedDepartments.includes(row.name) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'budget',
      header: 'Budget',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'actual',
      header: 'Réalisé',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'variance',
      header: 'Écart',
      sortable: true,
      render: (value, row) => {
        const isNegative = (value as number) < 0;
        return (
          <span className={isNegative ? 'text-[#B85450]' : 'text-[#6A8A82]'}>
            {formatCurrency(Math.abs(value as number))}
          </span>
        );
      },
      align: 'right',
    },
    {
      key: 'variancePercent',
      header: 'Écart %',
      sortable: true,
      render: (value) => formatPercent((value as number) / 100),
      align: 'right',
    },
    {
      key: 'status',
      header: 'Statut',
      render: (_, row) => getVarianceBadge(row.variancePercent),
      align: 'center',
    },
  ];

  return (
    <DataTable
      data={departments}
      columns={columns}
      loading={loading}
      onRowClick={onView}
      actions={
        onView || onEdit
          ? (department) => (
              <>
                {onView && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(department);
                    }}
                  >
                    Voir
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Edit}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(department);
                    }}
                  >
                    Éditer
                  </Button>
                )}
              </>
            )
          : undefined
      }
      striped
      hoverable
    />
  );
};