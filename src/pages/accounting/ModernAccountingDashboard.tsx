import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, FileText, BarChart3, ArrowLeft, Home, Plus
} from 'lucide-react';

const ModernAccountingDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header WiseBook */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#191919]">WiseBook - Module Comptabilité</h1>
              <p className="text-sm text-[#767676]">Gestion comptable SYSCOHADA</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
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

      {/* Actions rapides */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-lg font-semibold text-[#191919] mb-4">🚀 WiseBook - Actions Comptables</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Saisie écritures', icon: Plus, path: '/accounting/entries' },
            { label: 'Balance', icon: BarChart3, path: '/accounting/balance' },
            { label: 'États financiers', icon: FileText, path: '/financial-statements' },
            { label: 'Journaux', icon: Calculator, path: '/accounting/journals' }
          ].map((action, index) => {
            const IconComponent = action.icon;
            return (
              <button 
                key={index}
                onClick={() => navigate(action.path)}
                className="p-4 rounded-lg border border-[#E8E8E8] hover:border-[#6A8A82] hover:bg-[#6A8A82]/5 transition-colors group text-center"
              >
                <IconComponent className="w-6 h-6 text-[#6A8A82] mx-auto mb-2" />
                <span className="text-sm font-medium text-[#444444]">{action.label}</span>
              </button>
            );
          })}
        </div>
        
        <div className="mt-6 text-center">
          <h3 className="text-2xl font-bold text-[#6A8A82] mb-2">✅ VOUS ÊTES DANS WISEBOOK !</h3>
          <p className="text-[#444444]">Tous les modules ont été transformés avec onglets et couleurs WiseBook</p>
        </div>
      </div>
    </div>
  );
};

export default ModernAccountingDashboard;