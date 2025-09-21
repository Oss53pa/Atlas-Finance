import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, Search, Filter, Download, ArrowLeft, Home, Plus,
  Edit, Eye, Check, X, BarChart3, Building2, Package, Users,
  DollarSign, TrendingUp, CreditCard, FileText, ChevronRight,
  ChevronDown
} from 'lucide-react';

const PlanSYSCOHADAPageV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('classes');
  const [selectedClasse, setSelectedClasse] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>('1');

  // Onglets plan comptable
  const tabs = [
    { id: 'classes', label: 'Classes', icon: BarChart3 },
    { id: 'recherche', label: 'Recherche', icon: Search },
    { id: 'personnalisation', label: 'Personnalisation', icon: Edit },
    { id: 'import', label: 'Import/Export', icon: Download },
    { id: 'validation', label: 'Validation', icon: Check },
  ];

  // Plan comptable SYSCOHADA par classes
  const planComptable = {
    '1': {
      nom: 'Comptes de ressources',
      color: '#6A8A82',
      icon: Building2,
      comptes: [
        { code: '101', libelle: 'Capital social', solde: 1500000, type: 'capital' },
        { code: '111', libelle: 'Réserve légale', solde: 150000, type: 'reserve' },
        { code: '121', libelle: 'Report à nouveau', solde: 325000, type: 'reporte' },
        { code: '131', libelle: 'Résultat en instance', solde: 0, type: 'resultat' }
      ]
    },
    '2': {
      nom: 'Actif immobilisé',
      color: '#B87333',
      icon: Building2,
      comptes: [
        { code: '211', libelle: 'Immobilisations incorporelles', solde: 450000, type: 'incorporel' },
        { code: '221', libelle: 'Terrains', solde: 1200000, type: 'terrain' },
        { code: '231', libelle: 'Bâtiments', solde: 2100000, type: 'batiment' },
        { code: '241', libelle: 'Matériel et outillage', solde: 890000, type: 'materiel' }
      ]
    },
    '3': {
      nom: 'Comptes de stocks',
      color: '#7A99AC',
      icon: Package,
      comptes: [
        { code: '311', libelle: 'Marchandises A', solde: 234000, type: 'stock' },
        { code: '321', libelle: 'Matières premières', solde: 156000, type: 'matiere' },
        { code: '331', libelle: 'Autres approvisionnements', solde: 89000, type: 'appro' }
      ]
    },
    '4': {
      nom: 'Comptes de tiers',
      color: '#B87333',
      icon: Users,
      comptes: [
        { code: '411', libelle: 'Clients ordinaires', solde: 680000, type: 'client' },
        { code: '401', libelle: 'Fournisseurs ordinaires', solde: -450000, type: 'fournisseur' },
        { code: '421', libelle: 'Personnel', solde: -125000, type: 'personnel' },
        { code: '431', libelle: 'Sécurité sociale', solde: -67000, type: 'social' }
      ]
    },
    '5': {
      nom: 'Comptes financiers',
      color: '#6A8A82',
      icon: DollarSign,
      comptes: [
        { code: '521', libelle: 'Banques locales', solde: 890000, type: 'banque' },
        { code: '531', libelle: 'Chèques postaux', solde: 45000, type: 'postal' },
        { code: '571', libelle: 'Caisse', solde: 75000, type: 'caisse' }
      ]
    },
    '6': {
      nom: 'Comptes de charges',
      color: '#B85450',
      icon: TrendingUp,
      comptes: [
        { code: '601', libelle: 'Achats de marchandises', solde: 780000, type: 'achat' },
        { code: '611', libelle: 'Transport sur achats', solde: 125000, type: 'transport' },
        { code: '621', libelle: 'Sous-traitance', solde: 89000, type: 'soustraitance' }
      ]
    },
    '7': {
      nom: 'Comptes de produits',
      color: '#6A8A82',
      icon: TrendingUp,
      comptes: [
        { code: '701', libelle: 'Ventes de marchandises', solde: 1250000, type: 'vente' },
        { code: '721', libelle: 'Production vendue', solde: 890000, type: 'production' },
        { code: '751', libelle: 'Autres produits', solde: 310000, type: 'autre' }
      ]
    }
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/config')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Configuration</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Plan Comptable SYSCOHADA</h1>
                <p className="text-sm text-[#767676]">Gestion du référentiel comptable</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              <Check className="w-4 h-4" />
              <span>247 comptes validés</span>
            </div>
            
            <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span className="text-sm">Nouveau compte</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[#6A8A82] text-[#6A8A82]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé */}
        <div className="p-6">
          {activeTab === 'classes' && (
            <div className="space-y-6">
              {/* Classes SYSCOHADA */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {Object.entries(planComptable).map(([numero, classe]) => {
                  const IconComponent = classe.icon;
                  const isExpanded = expandedClass === numero;
                  
                  return (
                    <button
                      key={numero}
                      onClick={() => setExpandedClass(isExpanded ? null : numero)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isExpanded 
                          ? 'border-current shadow-lg' 
                          : 'border-[#E8E8E8] hover:border-current hover:shadow-md'
                      }`}
                      style={{color: classe.color}}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div 
                          className="w-12 h-12 rounded-lg text-white text-xl font-bold flex items-center justify-center"
                          style={{backgroundColor: classe.color}}
                        >
                          {numero}
                        </div>
                        <div className="text-right">
                          <IconComponent className="w-5 h-5 mb-1" />
                          <div className="text-xs">
                            {planComptable[numero].comptes.length} comptes
                          </div>
                        </div>
                      </div>
                      <h3 className="font-semibold text-[#191919] text-sm mb-1">Classe {numero}</h3>
                      <p className="text-xs text-[#444444] leading-relaxed">{classe.nom}</p>
                      <div className="mt-2 text-xs font-medium">
                        {isExpanded ? 'Masquer' : 'Voir comptes'} →
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Détail classe sélectionnée */}
              {expandedClass && (
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#191919]">
                      Classe {expandedClass} - {planComptable[expandedClass].nom}
                    </h3>
                    <button 
                      onClick={() => setExpandedClass(null)}
                      className="text-[#767676] hover:text-[#444444]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {planComptable[expandedClass].comptes.map((compte, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all">
                        <div className="flex items-center space-x-3">
                          <span className="w-12 text-xs font-mono text-[#767676] bg-gray-100 px-2 py-1 rounded">
                            {compte.code}
                          </span>
                          <span className="text-sm text-[#444444] flex-1">{compte.libelle}</span>
                        </div>
                        <div className="text-right">
                          {compte.solde !== 0 && (
                            <span className={`text-sm font-semibold ${
                              compte.solde > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {Math.abs(compte.solde).toLocaleString()}€
                            </span>
                          )}
                          <div className="flex items-center space-x-1 mt-1">
                            <button className="text-[#6A8A82] hover:text-[#5A7A72]">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button className="text-[#B87333] hover:text-[#A86323]">
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'recherche' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#767676]" />
                      <input
                        type="text"
                        placeholder="Rechercher un compte (code ou libellé)..."
                        className="w-full pl-10 pr-4 py-3 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                      />
                    </div>
                  </div>
                  <button className="p-3 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4 text-[#767676]" />
                  </button>
                </div>

                {/* Résultats de recherche simulés */}
                <div className="space-y-2">
                  {[
                    { code: '607001', libelle: 'Achats de marchandises - Groupe A', classe: '6', solde: 456000 },
                    { code: '701001', libelle: 'Ventes de marchandises - Groupe A', classe: '7', solde: 1250000 },
                    { code: '411001', libelle: 'Clients ordinaires - Zone 1', classe: '4', solde: 125000 }
                  ].map((resultat, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-8 h-8 rounded text-white text-sm font-bold flex items-center justify-center"
                          style={{backgroundColor: planComptable[resultat.classe]?.color || '#767676'}}
                        >
                          {resultat.classe}
                        </div>
                        <div>
                          <p className="font-mono text-sm text-[#191919]">{resultat.code}</p>
                          <p className="text-xs text-[#767676]">{resultat.libelle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-[#191919]">
                          {resultat.solde.toLocaleString()}€
                        </span>
                        <div className="flex items-center space-x-1 mt-1">
                          <button className="text-[#6A8A82] hover:text-[#5A7A72]">
                            <Eye className="w-3 h-3" />
                          </button>
                          <button className="text-[#B87333] hover:text-[#A86323]">
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personnalisation' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Comptes personnalisés */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">✏️ Comptes Personnalisés</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Code compte</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 607001"
                        className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Libellé</label>
                      <input 
                        type="text" 
                        placeholder="Libellé du compte"
                        className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Type de compte</label>
                      <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20">
                        <option>Détail</option>
                        <option>Collectif</option>
                        <option>Auxiliaire</option>
                      </select>
                    </div>

                    <button className="w-full py-3 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors font-medium">
                      Ajouter le compte
                    </button>
                  </div>
                </div>

                {/* Règles de gestion */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">⚙️ Règles de Gestion</h3>
                  <div className="space-y-3">
                    {[
                      { regle: 'Validation soldes débiteurs classe 1-5', active: true },
                      { regle: 'Contrôle TVA automatique', active: true },
                      { regle: 'Lettrage obligatoire comptes 41-40', active: true },
                      { regle: 'Seuil d\'alerte découvert', active: false }
                    ].map((regle, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <span className="text-sm text-[#444444]">{regle.regle}</span>
                        <div className="relative inline-block w-10 h-6">
                          <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                            regle.active ? 'bg-[#6A8A82]' : 'bg-gray-300'
                          }`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                              regle.active ? 'ml-4' : 'ml-0'
                            }`}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">✅ Validation SYSCOHADA</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Statut validation */}
                  <div>
                    <h4 className="font-medium text-[#6A8A82] mb-3">Statut de Validation</h4>
                    <div className="space-y-2">
                      {[
                        { element: 'Structure des classes', statut: 'conforme', pourcentage: 100 },
                        { element: 'Codification comptes', statut: 'conforme', pourcentage: 98 },
                        { element: 'Libellés normalisés', statut: 'conforme', pourcentage: 95 },
                        { element: 'Règles de gestion', statut: 'conforme', pourcentage: 92 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                          <span className="text-sm text-[#444444]">{item.element}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-green-700">{item.pourcentage}%</span>
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions validation */}
                  <div>
                    <h4 className="font-medium text-[#B87333] mb-3">Actions Recommandées</h4>
                    <div className="space-y-2">
                      {[
                        { action: 'Synchroniser avec OHADA 2024', priorite: 'moyenne' },
                        { action: 'Valider comptes personnalisés', priorite: 'basse' },
                        { action: 'Optimiser performance recherche', priorite: 'basse' }
                      ].map((action, index) => (
                        <div key={index} className="p-3 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[#444444]">{action.action}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              action.priorite === 'haute' ? 'bg-red-100 text-red-700' :
                              action.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {action.priorite}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanSYSCOHADAPageV2;