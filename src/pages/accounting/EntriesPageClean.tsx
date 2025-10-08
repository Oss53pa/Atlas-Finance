import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, BarChart3, CheckCircle, Clock, ArrowLeft, Home,
  Calendar, DollarSign, Edit, Eye, Search, Filter, Download
} from 'lucide-react';
import JournalEntryModal from '../../components/accounting/JournalEntryModal';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';

const EntriesPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('saisie');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });

  // Onglets Écritures
  const tabs = [
    { id: 'saisie', label: 'Nouvelle Écriture', icon: Plus },
    { id: 'consultation', label: 'Consultation', icon: Eye },
    { id: 'validation', label: 'Validation', icon: CheckCircle, badge: '8' },
  ];

  return (
    <div className="h-screen bg-[#ECECEC] flex flex-col">
      {/* En-tête avec navigation de retour */}
      <div className="bg-white border-b border-[#E8E8E8] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/accounting')}
              className="flex items-center space-x-2 text-[#767676] hover:text-[#6A8A82] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#6A8A82]/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#6A8A82]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Écritures Comptables</h1>
                <p className="text-sm text-[#767676]">Saisie et gestion des écritures SYSCOHADA</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
              <Clock className="w-4 h-4" />
              <span>8 en attente</span>
            </div>
            
            <button 
              onClick={() => navigate('/dashboard/comptable')}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm mx-6 mt-6">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.id
                      ? 'border-[#6A8A82] text-[#6A8A82]'
                      : 'border-transparent text-[#767676] hover:text-[#6A8A82] hover:border-[#6A8A82]/30'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé */}
        <div className="p-6">
          {/* ONGLET 1 : SAISIE */}
          {activeTab === 'saisie' && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Nouvelle Écriture Comptable</h3>
              <p className="text-gray-600 mb-6">Utilisez le bouton ci-dessous pour créer une nouvelle écriture</p>
              <button
                onClick={() => setShowJournalModal(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nouvelle Écriture
              </button>
            </div>
          )}

          {/* ONGLET 2 : CONSULTATION */}
          {activeTab === 'consultation' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] mb-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#767676]" />
                    <input
                      type="text"
                      placeholder="Rechercher des écritures..."
                      className="w-full pl-10 pr-4 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                    />
                  </div>
                  <input type="date" className="px-3 py-2 border border-[#D9D9D9] rounded-lg" />
                  <input type="date" className="px-3 py-2 border border-[#D9D9D9] rounded-lg" />
                  <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50" aria-label="Filtrer">
                    <Filter className="w-4 h-4 text-[#767676]" />
                  </button>
                </div>
              </div>

              {/* Liste des écritures */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">{t('common.date')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">{t('accounting.journal')}</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">N° Pièce</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">{t('accounting.label')}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">{t('accounting.debit')}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">{t('accounting.credit')}</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">Statut</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Exemples d'écritures */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">15/01/2025</td>
                        <td className="px-4 py-3 text-sm font-mono">AC</td>
                        <td className="px-4 py-3 text-sm font-mono">AC-2025-00142</td>
                        <td className="px-4 py-3 text-sm">Achat fournitures bureau</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">250,000</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">250,000</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{t('accounting.validated')}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button className="text-blue-500 hover:text-blue-700" aria-label="Voir les détails">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-green-500 hover:text-green-700">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ONGLET 3 : VALIDATION */}
          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">Écritures en attente de validation</h3>
                <div className="text-sm text-[#767676]">
                  8 écritures nécessitent une validation avant comptabilisation.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de saisie d'écriture */}
      <JournalEntryModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
      />
    </div>
  

  {/* Modal de sélection de période */}

  <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />

  </div>

  );
};

export default EntriesPage;