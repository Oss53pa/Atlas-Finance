import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, FileText, Scale, BarChart3, ArrowLeft,
  FileSpreadsheet, TrendingUp, PieChart
} from 'lucide-react';
import GrandLivre from '@/components/accounting/GrandLivre';
import Balance from '@/components/accounting/Balance';

const ReportsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('grand-livre');

  const tabs = [
    { id: 'grand-livre', label: 'Grand Livre', icon: BookOpen },
    { id: 'balance', label: t('accounting.balance'), icon: Scale },
    { id: 'compte-resultat', label: 'Compte de Résultat', icon: TrendingUp },
    { id: 'bilan', label: t('accounting.balanceSheet'), icon: FileSpreadsheet }
  ];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-screen ">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/accounting')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">{t('accounting.title')}</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-tertiary)] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">États Financiers</h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">Grand Livre, Balance et Rapports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
        <div className="px-6 border-b border-[var(--color-border)]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[#404040]'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div>
          {/* Grand Livre */}
          {activeTab === 'grand-livre' && <GrandLivre />}

          {/* Balance */}
          {activeTab === 'balance' && <Balance />}

          {/* Compte de Résultat */}
          {activeTab === 'compte-resultat' && (
            <div className="p-6">
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">
                  Compte de Résultat
                </h3>
                <p className="text-[var(--color-text-tertiary)]">
                  État des charges et produits de l'exercice
                </p>
                <button className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                  Générer le compte de résultat
                </button>
              </div>
            </div>
          )}

          {/* Bilan */}
          {activeTab === 'bilan' && (
            <div className="p-6">
              <div className="text-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-[var(--color-text-tertiary)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">
                  Bilan Comptable
                </h3>
                <p className="text-[var(--color-text-tertiary)]">
                  Situation patrimoniale de l'entreprise
                </p>
                <button className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                  Générer le bilan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;