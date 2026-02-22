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
    <div className="p-6 bg-[#e5e5e5] min-h-screen ">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#171717] to-[#737373] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#171717]">États Financiers</h1>
                <p className="text-sm text-[#737373]">Grand Livre, Balance et Rapports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
        <div className="px-6 border-b border-[#e5e5e5]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#171717] text-[#171717]'
                      : 'border-transparent text-[#737373] hover:text-[#404040]'
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
                <TrendingUp className="w-16 h-16 text-[#737373] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#171717] mb-2">
                  Compte de Résultat
                </h3>
                <p className="text-[#737373]">
                  État des charges et produits de l'exercice
                </p>
                <button className="mt-4 px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] transition-colors">
                  Générer le compte de résultat
                </button>
              </div>
            </div>
          )}

          {/* Bilan */}
          {activeTab === 'bilan' && (
            <div className="p-6">
              <div className="text-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-[#737373] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#171717] mb-2">
                  Bilan Comptable
                </h3>
                <p className="text-[#737373]">
                  Situation patrimoniale de l'entreprise
                </p>
                <button className="mt-4 px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] transition-colors">
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