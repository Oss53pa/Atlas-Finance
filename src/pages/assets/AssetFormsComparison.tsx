import React, { useState } from 'react';
import {
  FileText,
  Package,
  Building,
  Calculator,
  Settings,
  ChevronRight,
  Eye,
  Edit,
  Copy,
  X
} from 'lucide-react';

const AssetFormsComparison: React.FC = () => {
  const [selectedForm, setSelectedForm] = useState<string | null>(null);

  const forms = [
    {
      id: 'complete',
      name: 'Formulaire Complet',
      description: 'Formulaire détaillé avec tous les champs',
      icon: FileText,
      color: '#6A8A82',
      fields: 45,
      sections: 8,
      features: ['Photos', 'QR Codes', 'Géolocalisation', 'Documents attachés']
    },
    {
      id: 'registry',
      name: 'Registre des Actifs',
      description: 'Vue registre avec gestion en tableau',
      icon: Package,
      color: '#B87333',
      fields: 38,
      sections: 6,
      features: ['Import/Export', 'Filtres avancés', 'Actions groupées', 'Historique']
    },
    {
      id: 'simplified',
      name: 'Formulaire Simplifié',
      description: 'Version allégée pour saisie rapide',
      icon: Building,
      color: '#7A99AC',
      fields: 20,
      sections: 4,
      features: ['Saisie rapide', 'Validation automatique', 'Templates', 'Auto-complétion']
    },
    {
      id: 'financial',
      name: 'Formulaire Financier',
      description: 'Focus sur les données comptables',
      icon: Calculator,
      color: '#E8D7D3',
      fields: 25,
      sections: 5,
      features: ['Calculs automatiques', 'Amortissements', 'Valeurs fiscales', 'Rapports']
    },
    {
      id: 'maintenance',
      name: 'Formulaire Maintenance',
      description: 'Gestion de la maintenance et réparations',
      icon: Settings,
      color: '#A37A74',
      fields: 30,
      sections: 6,
      features: ['Calendrier maintenance', 'Alertes', 'Historique interventions', 'Coûts']
    }
  ];

  const FormCard = ({ form }: { form: typeof forms[0] }) => (
    <div
      className="bg-white rounded-lg border border-[#E8E8E8] hover:border-[#6A8A82]/30 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => setSelectedForm(form.id)}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${form.color}15` }}
          >
            <form.icon className="w-6 h-6" style={{ color: form.color }} />
          </div>
          <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-[#6A8A82] transition-colors" />
        </div>

        {/* Title and Description */}
        <h3 className="text-lg font-bold text-[#191919] mb-2">{form.name}</h3>
        <p className="text-sm text-[#767676] mb-4">{form.description}</p>

        {/* Stats */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: form.color }}>{form.fields}</p>
            <p className="text-xs text-[#767676]">Champs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#444444]">{form.sections}</p>
            <p className="text-xs text-[#767676]">Sections</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          {form.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: form.color }} />
              <span className="text-xs text-[#767676]">{feature}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100">
          <button
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center space-x-2"
            style={{
              borderColor: form.color,
              color: form.color,
              backgroundColor: `${form.color}10`
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/assets/${form.id}`;
            }}
          >
            <Eye className="w-4 h-4" />
            <span>Voir</span>
          </button>
          <button
            className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2 hover:bg-gray-50 border border-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Edit form:', form.id);
            }}
          >
            <Edit className="w-4 h-4" />
            <span>Éditer</span>
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Clone form:', form.id);
            }}
          >
            <Copy className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E8E8] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#191919]">Comparaison des Formulaires d'Actifs</h1>
            <p className="text-sm text-[#767676] mt-1">
              Choisissez le formulaire adapté à vos besoins
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm font-medium text-[#767676] hover:text-[#191919] border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {forms.map((form) => (
            <FormCard key={form.id} form={form} />
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-[#6A8A82]/5 to-[#B87333]/5 border-b border-[#E8E8E8]">
            <h2 className="text-lg font-bold text-[#191919]">Tableau Comparatif Détaillé</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E8E8]">
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#767676] uppercase tracking-wider">
                    Fonctionnalité
                  </th>
                  {forms.map((form) => (
                    <th
                      key={form.id}
                      className="px-6 py-3 text-center text-xs font-medium text-[#767676] uppercase tracking-wider"
                    >
                      {form.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  'Identification de base',
                  'Données financières',
                  'Amortissements',
                  'Localisation',
                  'Documents attachés',
                  'Historique complet',
                  'Maintenance',
                  'Photos/QR Codes',
                  'Import/Export Excel',
                  'Workflow validation'
                ].map((feature, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-6 py-4 text-sm font-medium text-[#444444]">
                      {feature}
                    </td>
                    {forms.map((form) => (
                      <td key={form.id} className="px-6 py-4 text-center">
                        <div
                          className="w-6 h-6 rounded-full mx-auto"
                          style={{
                            backgroundColor:
                              (index < 4 || form.id === 'complete') ? `${form.color}20` : '#F3F4F6'
                          }}
                        >
                          {(index < 4 || form.id === 'complete') && (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                              <path
                                d="M5 13l4 4L19 7"
                                stroke={form.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-8 bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10 rounded-lg border border-[#D5D0CD] p-6">
          <h3 className="text-lg font-bold text-[#191919] mb-3">Recommandation</h3>
          <p className="text-sm text-[#767676] mb-4">
            Pour une gestion complète des immobilisations avec suivi détaillé et reporting avancé,
            nous recommandons le <span className="font-semibold text-[#6A8A82]">Formulaire Complet</span>.
            Pour une saisie rapide au quotidien, le <span className="font-semibold text-[#7A99AC]">Formulaire Simplifié</span> est plus adapté.
          </p>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.location.href = '/assets/registry'}
              className="px-4 py-2 bg-[#6A8A82] text-white font-medium rounded-lg hover:bg-[#5A7A72] transition-colors"
            >
              Utiliser le Formulaire Recommandé
            </button>
            <button
              onClick={() => window.location.href = '/assets'}
              className="px-4 py-2 border border-[#D5D0CD] text-[#767676] font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Voir tous les modules
            </button>
          </div>
        </div>
      </div>

      {/* Modal for detailed view */}
      {selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-[#E8E8E8] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#191919]">
                {forms.find(f => f.id === selectedForm)?.name}
              </h2>
              <button
                onClick={() => setSelectedForm(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[#767676] mb-4">
                {forms.find(f => f.id === selectedForm)?.description}
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-[#191919] mb-3">Caractéristiques principales</h3>
                  <ul className="space-y-2">
                    {forms.find(f => f.id === selectedForm)?.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-[#6A8A82]" />
                        <span className="text-sm text-[#767676]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-[#191919] mb-3">Cas d'usage recommandés</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-4 h-4 text-[#6A8A82] mt-0.5" />
                      <span className="text-sm text-[#767676]">Gestion quotidienne des actifs</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-4 h-4 text-[#6A8A82] mt-0.5" />
                      <span className="text-sm text-[#767676]">Suivi des amortissements</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="w-4 h-4 text-[#6A8A82] mt-0.5" />
                      <span className="text-sm text-[#767676]">Reporting financier</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 flex items-center space-x-3">
                <button
                  onClick={() => window.location.href = `/assets/${selectedForm}`}
                  className="px-4 py-2 bg-[#6A8A82] text-white font-medium rounded-lg hover:bg-[#5A7A72] transition-colors"
                >
                  Utiliser ce formulaire
                </button>
                <button
                  onClick={() => setSelectedForm(null)}
                  className="px-4 py-2 border border-[#E8E8E8] text-[#767676] font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetFormsComparison;