import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Plus, Download, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { Select } from '@/shared/components/ui/Form';
import { useModal } from '@/shared/hooks';
import { useBudgetingData, useMonthlyBudgets, useBudgetAlerts } from '../hooks/useBudgetingData';
import { BudgetStats } from '../components/BudgetStats';
import { DepartmentsTable } from '../components/DepartmentsTable';
import { SessionsTable } from '../components/SessionsTable';
import { MonthlyBudgetChart } from '../components/MonthlyBudgetChart';
import { BudgetAlerts } from '../components/BudgetAlerts';
import { DepartmentBudget, BudgetSession } from '../types/budgeting.types';

const BudgetingPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions' | 'analysis'>('dashboard');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedPeriod, setSelectedPeriod] = useState('annual');
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>([]);

  const { departments, sessions, stats, loading, refetch } = useBudgetingData(
    selectedYear,
    selectedPeriod
  );
  const { data: monthlyData, loading: monthlyLoading } = useMonthlyBudgets(selectedYear);
  const { alerts, loading: alertsLoading } = useBudgetAlerts();

  const newSessionModal = useModal();
  const viewDepartmentModal = useModal();
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentBudget | null>(null);
  const [selectedSession, setSelectedSession] = useState<BudgetSession | null>(null);

  const handleViewDepartment = (dept: DepartmentBudget) => {
    setSelectedDepartment(dept);
    viewDepartmentModal.open();
  };

  const handleToggleExpand = (deptName: string) => {
    setExpandedDepartments((prev) =>
      prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName]
    );
  };

  const tabs = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: TrendingUp },
    { id: 'sessions', label: 'Sessions Budgétaires', icon: Calendar },
    { id: 'analysis', label: 'Analyse Mensuelle', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#191919]">Budget & Planification</h1>
          <p className="text-[#767676] mt-1">
            Gestion et suivi des budgets départementaux
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            options={[
              { value: '2024', label: '2024' },
              { value: '2025', label: '2025' },
              { value: '2026', label: '2026' },
            ]}
          />
          <Button variant="outline" icon={Download}>
            Exporter
          </Button>
          <Button icon={Plus} onClick={newSessionModal.open}>
            Nouvelle Session
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#D9D9D9]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#6A8A82] text-[#6A8A82] font-semibold'
                  : 'border-transparent text-[#767676] hover:text-[#191919]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <BudgetStats stats={stats} loading={loading} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
                <h2 className="text-lg font-semibold text-[#191919] mb-4">
                  Budgets par Département
                </h2>
                <DepartmentsTable
                  departments={departments}
                  loading={loading}
                  onView={handleViewDepartment}
                  expandable={true}
                  expandedDepartments={expandedDepartments}
                  onToggleExpand={handleToggleExpand}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
                <h2 className="text-lg font-semibold text-[#191919] mb-4">Alertes</h2>
                <BudgetAlerts alerts={alerts} loading={alertsLoading} maxDisplay={5} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
            <h2 className="text-lg font-semibold text-[#191919] mb-4">
              Sessions Budgétaires
            </h2>
            <SessionsTable sessions={sessions} loading={loading} />
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#191919]">
                Analyse Mensuelle {selectedYear}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 rounded ${
                    chartType === 'bar'
                      ? 'bg-[#6A8A82] text-white'
                      : 'bg-[#F5F5F5] text-[#767676]'
                  }`}
                >
                  Barres
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 rounded ${
                    chartType === 'line'
                      ? 'bg-[#6A8A82] text-white'
                      : 'bg-[#F5F5F5] text-[#767676]'
                  }`}
                >
                  Lignes
                </button>
              </div>
            </div>
            <MonthlyBudgetChart
              data={monthlyData}
              type={chartType}
              loading={monthlyLoading}
            />
          </div>
        </div>
      )}

      <Modal
        isOpen={newSessionModal.isOpen}
        onClose={newSessionModal.close}
        title="Nouvelle Session Budgétaire"
        size="lg"
      >
        <ModalBody>
          <p className="text-[#767676]">Formulaire de création de session à venir...</p>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newSessionModal.close}>
              Annuler
            </Button>
            <Button>{t('actions.create')}</Button>
          </div>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={viewDepartmentModal.isOpen}
        onClose={viewDepartmentModal.close}
        title={`Détails - ${selectedDepartment?.name}`}
        size="xl"
      >
        <ModalBody>
          {selectedDepartment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#767676]">{t('navigation.budget')}</p>
                  <p className="text-lg font-bold text-[#191919]">
                    {selectedDepartment.budget.toLocaleString()} FCFA
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#767676]">Réalisé</p>
                  <p className="text-lg font-bold text-[#6A8A82]">
                    {selectedDepartment.actual.toLocaleString()} FCFA
                  </p>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={viewDepartmentModal.close}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default BudgetingPage;