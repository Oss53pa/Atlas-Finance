import React, { useState } from 'react';
import { 
  FileText, BarChart3, TrendingUp, TrendingDown, DollarSign,
  Calendar, Download, Upload, Eye, Edit, RefreshCw, Settings,
  PieChart, Activity, CheckCircle, AlertTriangle, Clock,
  Calculator, Building, Users, Package, CreditCard, Target,
  ArrowUpRight, ArrowDownRight, Percent, Hash, Globe
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface BalanceSheetItem {
  code: string;
  libelle: string;
  exerciceN: number;
  exerciceN1: number;
  note: string;
  type: 'actif' | 'passif';
  section: string;
  niveau: number;
}

interface IncomeStatementItem {
  code: string;
  libelle: string;
  exerciceN: number;
  exerciceN1: number;
  note: string;
  type: 'charge' | 'produit';
  nature: 'exploitation' | 'financier' | 'exceptionnel';
  niveau: number;
}

interface CashFlowItem {
  libelle: string;
  montant: number;
  type: 'exploitation' | 'investissement' | 'financement';
}

interface FinancialRatio {
  nom: string;
  valeur: number;
  unite: string;
  evolution: number;
  interpretation: 'bon' | 'moyen' | 'mauvais';
  categorie: 'liquidite' | 'rentabilite' | 'activite' | 'structure';
}

interface Note {
  numero: string;
  titre: string;
  contenu: string;
  tableaux: any[];
  obligatoire: boolean;
  complete: boolean;
}

const CompleteFinancialModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedExercice, setSelectedExercice] = useState('2023');
  const [viewMode, setViewMode] = useState<'complet' | 'synthese'>('synthese');

  // Données de démonstration - Bilan SYSCOHADA
  const bilanActif: BalanceSheetItem[] = [
    {
      code: 'AD',
      libelle: 'ACTIF IMMOBILISE',
      exerciceN: 2450000,
      exerciceN1: 2180000,
      note: '3',
      type: 'actif',
      section: 'immobilise',
      niveau: 1
    },
    {
      code: 'AE',
      libelle: 'Immobilisations incorporelles',
      exerciceN: 125000,
      exerciceN1: 95000,
      note: '3.1',
      type: 'actif',
      section: 'immobilise',
      niveau: 2
    },
    {
      code: 'AF',
      libelle: 'Immobilisations corporelles',
      exerciceN: 2150000,
      exerciceN1: 1920000,
      note: '3.2',
      type: 'actif',
      section: 'immobilise',
      niveau: 2
    },
    {
      code: 'AG',
      libelle: 'Avances et acomptes versés sur immobilisations',
      exerciceN: 175000,
      exerciceN1: 165000,
      note: '3.3',
      type: 'actif',
      section: 'immobilise',
      niveau: 2
    },
    {
      code: 'BH',
      libelle: 'ACTIF CIRCULANT',
      exerciceN: 1850000,
      exerciceN1: 1620000,
      note: '4',
      type: 'actif',
      section: 'circulant',
      niveau: 1
    },
    {
      code: 'BI',
      libelle: 'Actif circulant HAO',
      exerciceN: 0,
      exerciceN1: 0,
      note: '4.1',
      type: 'actif',
      section: 'circulant',
      niveau: 2
    },
    {
      code: 'BJ',
      libelle: 'Stocks',
      exerciceN: 850000,
      exerciceN1: 720000,
      note: '4.2',
      type: 'actif',
      section: 'circulant',
      niveau: 2
    },
    {
      code: 'BK',
      libelle: 'Créances et emplois assimilés',
      exerciceN: 750000,
      exerciceN1: 680000,
      note: '4.3',
      type: 'actif',
      section: 'circulant',
      niveau: 2
    },
    {
      code: 'BT',
      libelle: 'Trésorerie-Actif',
      exerciceN: 250000,
      exerciceN1: 220000,
      note: '4.4',
      type: 'actif',
      section: 'tresorerie',
      niveau: 2
    }
  ];

  const bilanPassif: BalanceSheetItem[] = [
    {
      code: 'CP',
      libelle: 'CAPITAUX PROPRES',
      exerciceN: 2800000,
      exerciceN1: 2450000,
      note: '5',
      type: 'passif',
      section: 'propres',
      niveau: 1
    },
    {
      code: 'CA',
      libelle: 'Capital',
      exerciceN: 1500000,
      exerciceN1: 1500000,
      note: '5.1',
      type: 'passif',
      section: 'propres',
      niveau: 2
    },
    {
      code: 'CB',
      libelle: 'Réserves et résultats reportés',
      exerciceN: 950000,
      exerciceN1: 650000,
      note: '5.2',
      type: 'passif',
      section: 'propres',
      niveau: 2
    },
    {
      code: 'CF',
      libelle: 'Résultat net de l\'exercice',
      exerciceN: 350000,
      exerciceN1: 300000,
      note: '5.3',
      type: 'passif',
      section: 'propres',
      niveau: 2
    },
    {
      code: 'DF',
      libelle: 'DETTES FINANCIERES',
      exerciceN: 950000,
      exerciceN1: 850000,
      note: '6',
      type: 'passif',
      section: 'financieres',
      niveau: 1
    },
    {
      code: 'DG',
      libelle: 'Emprunts et dettes financières',
      exerciceN: 750000,
      exerciceN1: 680000,
      note: '6.1',
      type: 'passif',
      section: 'financieres',
      niveau: 2
    },
    {
      code: 'DH',
      libelle: 'Dettes de crédit-bail et contrats assimilés',
      exerciceN: 200000,
      exerciceN1: 170000,
      note: '6.2',
      type: 'passif',
      section: 'financieres',
      niveau: 2
    },
    {
      code: 'DI',
      libelle: 'PASSIF CIRCULANT',
      exerciceN: 550000,
      exerciceN1: 500000,
      note: '7',
      type: 'passif',
      section: 'circulant',
      niveau: 1
    }
  ];

  const compteResultat: IncomeStatementItem[] = [
    {
      code: 'TA',
      libelle: 'Chiffre d\'affaires',
      exerciceN: 5200000,
      exerciceN1: 4800000,
      note: '8.1',
      type: 'produit',
      nature: 'exploitation',
      niveau: 1
    },
    {
      code: 'TB',
      libelle: 'Production stockée',
      exerciceN: 150000,
      exerciceN1: 120000,
      note: '8.2',
      type: 'produit',
      nature: 'exploitation',
      niveau: 2
    },
    {
      code: 'TC',
      libelle: 'Production immobilisée',
      exerciceN: 80000,
      exerciceN1: 65000,
      note: '8.3',
      type: 'produit',
      nature: 'exploitation',
      niveau: 2
    },
    {
      code: 'TD',
      libelle: 'Subventions d\'exploitation',
      exerciceN: 0,
      exerciceN1: 25000,
      note: '8.4',
      type: 'produit',
      nature: 'exploitation',
      niveau: 2
    },
    {
      code: 'TE',
      libelle: 'Autres produits',
      exerciceN: 45000,
      exerciceN1: 38000,
      note: '8.5',
      type: 'produit',
      nature: 'exploitation',
      niveau: 2
    },
    {
      code: 'TF',
      libelle: 'Reprises de provisions',
      exerciceN: 25000,
      exerciceN1: 18000,
      note: '8.6',
      type: 'produit',
      nature: 'exploitation',
      niveau: 2
    },
    {
      code: 'RX',
      libelle: 'Achats de marchandises',
      exerciceN: -2100000,
      exerciceN1: -1950000,
      note: '9.1',
      type: 'charge',
      nature: 'exploitation',
      niveau: 1
    },
    {
      code: 'RY',
      libelle: 'Variation de stocks de marchandises',
      exerciceN: -80000,
      exerciceN1: -65000,
      note: '9.2',
      type: 'charge',
      nature: 'exploitation',
      niveau: 2
    },
    {
      code: 'RZ',
      libelle: 'Achats de matières premières',
      exerciceN: -1250000,
      exerciceN1: -1150000,
      note: '9.3',
      type: 'charge',
      nature: 'exploitation',
      niveau: 2
    }
  ];

  const ratiosFinanciers: FinancialRatio[] = [
    {
      nom: 'Ratio de liquidité générale',
      valeur: 3.36,
      unite: '',
      evolution: 0.15,
      interpretation: 'bon',
      categorie: 'liquidite'
    },
    {
      nom: 'Ratio de liquidité réduite',
      valeur: 1.82,
      unite: '',
      evolution: 0.08,
      interpretation: 'bon',
      categorie: 'liquidite'
    },
    {
      nom: 'Ratio de liquidité immédiate',
      valeur: 0.45,
      unite: '',
      evolution: -0.03,
      interpretation: 'moyen',
      categorie: 'liquidite'
    },
    {
      nom: 'Rentabilité économique (ROA)',
      valeur: 8.1,
      unite: '%',
      evolution: 1.2,
      interpretation: 'bon',
      categorie: 'rentabilite'
    },
    {
      nom: 'Rentabilité financière (ROE)',
      valeur: 12.5,
      unite: '%',
      evolution: 0.8,
      interpretation: 'bon',
      categorie: 'rentabilite'
    },
    {
      nom: 'Marge nette',
      valeur: 6.7,
      unite: '%',
      evolution: 0.3,
      interpretation: 'bon',
      categorie: 'rentabilite'
    },
    {
      nom: 'Rotation des stocks',
      valeur: 6.1,
      unite: 'fois',
      evolution: 0.4,
      interpretation: 'bon',
      categorie: 'activite'
    },
    {
      nom: 'Délai de recouvrement client',
      valeur: 42,
      unite: 'jours',
      evolution: -3,
      interpretation: 'bon',
      categorie: 'activite'
    },
    {
      nom: 'Ratio d\'endettement',
      valeur: 34.0,
      unite: '%',
      evolution: 2.1,
      interpretation: 'bon',
      categorie: 'structure'
    },
    {
      nom: 'Ratio d\'autonomie financière',
      valeur: 66.0,
      unite: '%',
      evolution: -2.1,
      interpretation: 'bon',
      categorie: 'structure'
    }
  ];

  const notes: Note[] = [
    {
      numero: '1',
      titre: 'Principes comptables et méthodes d\'évaluation',
      contenu: 'Les états financiers sont établis selon le système comptable OHADA...',
      tableaux: [],
      obligatoire: true,
      complete: true
    },
    {
      numero: '2',
      titre: 'Faits caractéristiques de l\'exercice',
      contenu: 'L\'exercice a été marqué par l\'acquisition de nouveaux équipements...',
      tableaux: [],
      obligatoire: true,
      complete: true
    },
    {
      numero: '3',
      titre: 'Immobilisations',
      contenu: 'Détail des mouvements des immobilisations corporelles et incorporelles...',
      tableaux: [
        {
          nom: 'Tableau des immobilisations',
          colonnes: ['Valeur brute début', 'Acquisitions', 'Cessions', 'Valeur brute fin'],
          donnees: []
        }
      ],
      obligatoire: true,
      complete: false
    },
    {
      numero: '4',
      titre: 'Stocks',
      contenu: 'Les stocks sont évalués au coût moyen pondéré...',
      tableaux: [],
      obligatoire: true,
      complete: true
    },
    {
      numero: '5',
      titre: 'Capitaux propres',
      contenu: 'Variation des capitaux propres au cours de l\'exercice...',
      tableaux: [],
      obligatoire: true,
      complete: true
    }
  ];

  // Graphiques
  const evolutionCAData = {
    labels: ['2019', '2020', '2021', '2022', '2023'],
    datasets: [
      {
        label: 'Chiffre d\'affaires',
        data: [3800000, 4200000, 4500000, 4800000, 5200000],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      },
      {
        label: 'Résultat net',
        data: [185000, 220000, 265000, 300000, 350000],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      }
    ]
  };

  const repartitionActifData = {
    labels: ['Actif immobilisé', 'Stocks', 'Créances', 'Trésorerie'],
    datasets: [
      {
        data: [57, 20, 17, 6],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: { size: 11 }
        }
      }
    }
  };

  const getInterpretationBadge = (interpretation: string) => {
    const badges = {
      'bon': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'moyen': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
      'mauvais': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle }
    };
    const badge = badges[interpretation as keyof typeof badges];
    const Icon = badge?.icon || CheckCircle;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge?.bg} ${badge?.text}`}>
        <Icon className="w-3 h-3" />
        {interpretation}
      </span>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chiffre d'affaires"
          value="€5.2M"
          icon={DollarSign}
          trend={{ value: 8.3, type: 'increase' }}
          color="success"
          subtitle="Exercice 2023"
        />
        <StatCard
          title="Résultat net"
          value="€350K"
          icon={TrendingUp}
          trend={{ value: 16.7, type: 'increase' }}
          color="primary"
          subtitle="+€50K vs N-1"
        />
        <StatCard
          title="Total Actif"
          value="€4.3M"
          icon={Building}
          trend={{ value: 7.5, type: 'increase' }}
          color="info"
          subtitle="Bilan 2023"
        />
        <StatCard
          title="Capitaux propres"
          value="€2.8M"
          icon={Target}
          trend={{ value: 14.3, type: 'increase' }}
          color="secondary"
          subtitle="65% du passif"
        />
      </div>

      {/* Graphiques d'évolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader
            title="Évolution 5 ans"
            subtitle="CA et Résultat net"
            icon={BarChart3}
          />
          <CardBody>
            <div className="h-64">
              <Line data={evolutionCAData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader
            title="Structure de l'actif"
            subtitle="Répartition en %"
            icon={PieChart}
          />
          <CardBody>
            <div className="h-64">
              <Doughnut data={repartitionActifData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Ratios clés */}
      <ModernCard>
        <CardHeader
          title="Ratios financiers clés"
          subtitle="Analyse de performance"
          icon={Calculator}
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {ratiosFinanciers.slice(0, 5).map((ratio) => (
              <div key={ratio.nom} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-700">{ratio.nom}</p>
                  {getInterpretationBadge(ratio.interpretation)}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">
                    {ratio.valeur}{ratio.unite}
                  </p>
                  <div className={`flex items-center text-xs ${
                    ratio.evolution > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {ratio.evolution > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(ratio.evolution).toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </ModernCard>

      {/* État d'avancement des documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader
            title="Avancement des états financiers"
            subtitle="Exercice 2023"
            icon={FileText}
          />
          <CardBody>
            <div className="space-y-4">
              {[
                { nom: 'Bilan SYSCOHADA', progress: 100, statut: 'complete' },
                { nom: 'Compte de résultat', progress: 100, statut: 'complete' },
                { nom: 'TAFIRE', progress: 85, statut: 'en-cours' },
                { nom: 'Notes annexes', progress: 60, statut: 'en-cours' },
                { nom: 'Rapport de gestion', progress: 30, statut: 'brouillon' }
              ].map((doc) => (
                <div key={doc.nom} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{doc.nom}</p>
                      <span className="text-xs text-gray-700">{doc.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          doc.progress === 100 ? 'bg-green-500' :
                          doc.progress >= 70 ? 'bg-blue-500' :
                          doc.progress >= 40 ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      doc.statut === 'complete' ? 'bg-green-100 text-green-700' :
                      doc.statut === 'en-cours' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {doc.statut}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader
            title="Notes annexes"
            subtitle="État d'avancement"
            icon={FileText}
          />
          <CardBody>
            <div className="space-y-3">
              {notes.slice(0, 5).map((note) => (
                <div key={note.numero} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">
                      {note.numero}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{note.titre}</p>
                      <p className="text-xs text-gray-700">
                        {note.obligatoire ? 'Obligatoire' : 'Optionnel'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      note.complete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {note.complete ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Complète
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          En cours
                        </>
                      )}
                    </span>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit className="w-3 h-3 text-gray-700" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </ModernCard>
      </div>
    </div>
  );

  const renderBilan = () => (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bilan SYSCOHADA</h2>
          <p className="text-sm text-gray-700">Exercice clos le 31/12/2023</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'complet' | 'synthese')}
              className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82]/20"
          >
            <option value="synthese">Vue synthèse</option>
            <option value="complet">Vue complète</option>
          </select>
          <ModernButton variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export PDF
          </ModernButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACTIF */}
        <ModernCard>
          <CardHeader
            title="ACTIF"
            subtitle="En unités monétaires"
            icon={TrendingUp}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-semibold text-gray-600">LIBELLÉ</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-600">NOTE</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-600">N</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-600">N-1</th>
                  </tr>
                </thead>
                <tbody>
                  {bilanActif.map((item) => (
                    <tr key={item.code} className={`border-b border-gray-100 ${
                      item.niveau === 1 ? 'font-semibold bg-gray-50' : ''
                    }`}>
                      <td className={`py-2 ${item.niveau === 2 ? 'pl-4' : ''}`}>
                        <span className="text-xs text-gray-700 mr-2">{item.code}</span>
                        {item.libelle}
                      </td>
                      <td className="py-2 text-right text-xs text-gray-700">{item.note}</td>
                      <td className="py-2 text-right font-medium">
                        {item.exerciceN.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {item.exerciceN1.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-2">TOTAL ACTIF</td>
                    <td className="py-2"></td>
                    <td className="py-2 text-right">4,300,000</td>
                    <td className="py-2 text-right">3,800,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </ModernCard>

        {/* PASSIF */}
        <ModernCard>
          <CardHeader
            title="PASSIF"
            subtitle="En unités monétaires"
            icon={TrendingDown}
          />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs font-semibold text-gray-600">LIBELLÉ</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-600">NOTE</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-600">N</th>
                    <th className="text-right py-2 text-xs font-semibold text-gray-600">N-1</th>
                  </tr>
                </thead>
                <tbody>
                  {bilanPassif.map((item) => (
                    <tr key={item.code} className={`border-b border-gray-100 ${
                      item.niveau === 1 ? 'font-semibold bg-gray-50' : ''
                    }`}>
                      <td className={`py-2 ${item.niveau === 2 ? 'pl-4' : ''}`}>
                        <span className="text-xs text-gray-700 mr-2">{item.code}</span>
                        {item.libelle}
                      </td>
                      <td className="py-2 text-right text-xs text-gray-700">{item.note}</td>
                      <td className="py-2 text-right font-medium">
                        {item.exerciceN.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {item.exerciceN1.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-2">TOTAL PASSIF</td>
                    <td className="py-2"></td>
                    <td className="py-2 text-right">4,300,000</td>
                    <td className="py-2 text-right">3,800,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </ModernCard>
      </div>
    </div>
  );

  const renderCompteResultat = () => (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Compte de Résultat</h2>
          <p className="text-sm text-gray-700">Exercice du 01/01/2023 au 31/12/2023</p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <Calculator className="w-4 h-4 mr-1" />
            Retraitement
          </ModernButton>
          <ModernButton variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </ModernButton>
        </div>
      </div>

      <ModernCard>
        <CardHeader
          title="Compte de résultat par nature"
          subtitle="Système comptable OHADA"
          icon={BarChart3}
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-semibold text-gray-600">LIBELLÉ</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-600">NOTE</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-600">EXERCICE N</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-600">EXERCICE N-1</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50 font-semibold">
                  <td className="py-2" colSpan={4}>PRODUITS D'EXPLOITATION</td>
                </tr>
                {compteResultat
                  .filter(item => item.type === 'produit' && item.nature === 'exploitation')
                  .map((item) => (
                    <tr key={item.code} className="border-b border-gray-100">
                      <td className="py-2 pl-4">
                        <span className="text-xs text-gray-700 mr-2">{item.code}</span>
                        {item.libelle}
                      </td>
                      <td className="py-2 text-right text-xs text-gray-700">{item.note}</td>
                      <td className="py-2 text-right font-medium">
                        {item.exerciceN.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {item.exerciceN1.toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="py-2">TOTAL PRODUITS D'EXPLOITATION</td>
                  <td className="py-2"></td>
                  <td className="py-2 text-right">5,500,000</td>
                  <td className="py-2 text-right">5,066,000</td>
                </tr>

                <tr className="bg-red-50 font-semibold">
                  <td className="py-2 pt-4" colSpan={4}>CHARGES D'EXPLOITATION</td>
                </tr>
                {compteResultat
                  .filter(item => item.type === 'charge' && item.nature === 'exploitation')
                  .map((item) => (
                    <tr key={item.code} className="border-b border-gray-100">
                      <td className="py-2 pl-4">
                        <span className="text-xs text-gray-700 mr-2">{item.code}</span>
                        {item.libelle}
                      </td>
                      <td className="py-2 text-right text-xs text-gray-700">{item.note}</td>
                      <td className="py-2 text-right font-medium text-red-600">
                        {Math.abs(item.exerciceN).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {Math.abs(item.exerciceN1).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="py-2">TOTAL CHARGES D'EXPLOITATION</td>
                  <td className="py-2"></td>
                  <td className="py-2 text-right text-red-600">4,950,000</td>
                  <td className="py-2 text-right text-red-600">4,566,000</td>
                </tr>

                <tr className="border-t-2 border-gray-300 font-bold bg-green-50">
                  <td className="py-3">RÉSULTAT D'EXPLOITATION</td>
                  <td className="py-3"></td>
                  <td className="py-3 text-right text-green-600">550,000</td>
                  <td className="py-3 text-right text-green-600">500,000</td>
                </tr>

                <tr className="border-t-2 border-gray-300 font-bold bg-blue-50">
                  <td className="py-3">RÉSULTAT NET</td>
                  <td className="py-3"></td>
                  <td className="py-3 text-right text-blue-600">350,000</td>
                  <td className="py-3 text-right text-blue-600">300,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderRatios = () => (
    <div className="space-y-6">
      {/* Ratios par catégorie */}
      {['liquidite', 'rentabilite', 'activite', 'structure'].map((categorie) => (
        <ModernCard key={categorie}>
          <CardHeader
            title={`Ratios de ${categorie}`}
            subtitle="Analyse comparative"
            icon={
              categorie === 'liquidite' ? Activity :
              categorie === 'rentabilite' ? TrendingUp :
              categorie === 'activite' ? BarChart3 :
              Building
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ratiosFinanciers
                .filter(ratio => ratio.categorie === categorie)
                .map((ratio) => (
                  <div key={ratio.nom} className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{ratio.nom}</h4>
                      {getInterpretationBadge(ratio.interpretation)}
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-2xl font-bold text-blue-600">
                        {ratio.valeur}{ratio.unite}
                      </div>
                      <div className={`flex items-center text-sm ${
                        ratio.evolution > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {ratio.evolution > 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {Math.abs(ratio.evolution).toFixed(1)}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          ratio.interpretation === 'bon' ? 'bg-green-500' :
                          ratio.interpretation === 'moyen' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ 
                          width: `${
                            ratio.interpretation === 'bon' ? '80' :
                            ratio.interpretation === 'moyen' ? '50' : '20'
                          }%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardBody>
        </ModernCard>
      ))}
    </div>
  );

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header avec couleurs WiseBook */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#191919]">
                États Financiers SYSCOHADA
              </h1>
              <p className="text-sm text-[#767676]">
                Bilan, compte de résultat et analyses financières
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedExercice}
              onChange={(e) => setSelectedExercice(e.target.value)}
              className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82]/20"
          >
            <option value="2023">Exercice 2023</option>
            <option value="2022">Exercice 2022</option>
            <option value="2021">Exercice 2021</option>
          </select>
          <ModernButton variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Recalculer
          </ModernButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'bilan', label: 'Bilan', icon: Building },
            { id: 'resultat', label: 'Compte de résultat', icon: TrendingUp },
            { id: 'tafire', label: 'TAFIRE', icon: Activity },
            { id: 'ratios', label: 'Ratios', icon: Calculator },
            { id: 'notes', label: 'Notes annexes', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-700 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'bilan' && renderBilan()}
        {activeTab === 'resultat' && renderCompteResultat()}
        {activeTab === 'tafire' && <div>Module TAFIRE en cours de développement...</div>}
        {activeTab === 'ratios' && renderRatios()}
        {activeTab === 'notes' && <div>Module notes annexes en cours de développement...</div>}
      </div>
    </div>
  );
};

export default CompleteFinancialModule;