import React, { useState } from 'react';
import { 
  FileText, Calculator, Calendar, AlertTriangle, CheckCircle,
  TrendingUp, Download, Upload, Clock, DollarSign, Receipt,
  Building, Users, CreditCard, PieChart, BarChart3, Filter,
  Search, Plus, Edit, Trash2, Eye, Settings, RefreshCw,
  ArrowRight, Info, AlertCircle, Send, Archive, FileCheck
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Types
interface TaxDeclaration {
  id: string;
  type: 'TVA' | 'IS' | 'IRPP' | 'TSS' | 'PATENTE' | 'CF';
  periode: string;
  montantDu: number;
  montantPaye: number;
  statut: 'en-cours' | 'validee' | 'envoyee' | 'payee' | 'retard';
  dateEcheance: string;
  dateDeclaration?: string;
  datePaiement?: string;
  reference?: string;
  fichiers: string[];
}

interface TaxSchedule {
  id: string;
  impot: string;
  periodicite: 'mensuelle' | 'trimestrielle' | 'annuelle';
  prochaine: string;
  montantEstime: number;
  rappel: boolean;
  joursRestants: number;
}

interface LiasseFiscale {
  id: string;
  exercice: string;
  statut: 'brouillon' | 'en-cours' | 'validee' | 'deposee';
  dateCreation: string;
  dateDepot?: string;
  formulaires: {
    code: string;
    libelle: string;
    statut: 'vide' | 'partiel' | 'complet';
    progression: number;
  }[];
  anomalies: number;
  alertes: number;
}

interface TaxPayment {
  id: string;
  date: string;
  impot: string;
  periode: string;
  montant: number;
  modePaiement: 'virement' | 'cheque' | 'especes' | 'prelevement';
  reference: string;
  statut: 'en-attente' | 'confirme' | 'rejete';
}

const CompleteTaxationModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclaration | null>(null);

  // Données de démonstration
  const stats = {
    totalDu: 145600,
    totalPaye: 98400,
    aVenir: 47200,
    retard: 3,
    declarationsEnCours: 5,
    prochainePaiement: 15600,
    tauxConformite: 92
  };

  const declarations: TaxDeclaration[] = [
    {
      id: '1',
      type: 'TVA',
      periode: 'Janvier 2024',
      montantDu: 24500,
      montantPaye: 24500,
      statut: 'payee',
      dateEcheance: '2024-02-15',
      dateDeclaration: '2024-02-10',
      datePaiement: '2024-02-14',
      reference: 'TVA-2024-01',
      fichiers: ['declaration_tva_01_2024.pdf']
    },
    {
      id: '2',
      type: 'IS',
      periode: '1er Acompte 2024',
      montantDu: 45000,
      montantPaye: 0,
      statut: 'en-cours',
      dateEcheance: '2024-03-15',
      reference: 'IS-2024-AC1',
      fichiers: []
    },
    {
      id: '3',
      type: 'TVA',
      periode: 'Février 2024',
      montantDu: 28300,
      montantPaye: 0,
      statut: 'retard',
      dateEcheance: '2024-03-15',
      fichiers: []
    },
    {
      id: '4',
      type: 'TSS',
      periode: 'Q1 2024',
      montantDu: 8500,
      montantPaye: 8500,
      statut: 'payee',
      dateEcheance: '2024-01-31',
      dateDeclaration: '2024-01-25',
      datePaiement: '2024-01-30',
      reference: 'TSS-2024-Q1',
      fichiers: ['tss_q1_2024.pdf']
    },
    {
      id: '5',
      type: 'PATENTE',
      periode: '2024',
      montantDu: 12000,
      montantPaye: 0,
      statut: 'en-cours',
      dateEcheance: '2024-03-31',
      fichiers: []
    }
  ];

  const schedule: TaxSchedule[] = [
    {
      id: '1',
      impot: 'TVA Mensuelle',
      periodicite: 'mensuelle',
      prochaine: '2024-03-15',
      montantEstime: 26000,
      rappel: true,
      joursRestants: 5
    },
    {
      id: '2',
      impot: 'Acompte IS',
      periodicite: 'trimestrielle',
      prochaine: '2024-03-15',
      montantEstime: 45000,
      rappel: true,
      joursRestants: 5
    },
    {
      id: '3',
      impot: 'TSS',
      periodicite: 'trimestrielle',
      prochaine: '2024-04-30',
      montantEstime: 8500,
      rappel: false,
      joursRestants: 50
    },
    {
      id: '4',
      impot: 'IRPP Salaires',
      periodicite: 'mensuelle',
      prochaine: '2024-03-10',
      montantEstime: 15000,
      rappel: true,
      joursRestants: 0
    }
  ];

  const liasseFiscale: LiasseFiscale = {
    id: '1',
    exercice: '2023',
    statut: 'en-cours',
    dateCreation: '2024-01-15',
    formulaires: [
      { code: 'DSF', libelle: 'Déclaration Statistique et Fiscale', statut: 'complet', progression: 100 },
      { code: 'BILAN', libelle: 'Bilan SYSCOHADA', statut: 'complet', progression: 100 },
      { code: 'CR', libelle: 'Compte de Résultat', statut: 'complet', progression: 100 },
      { code: 'TAFIRE', libelle: 'Tableau Financier des Ressources', statut: 'partiel', progression: 75 },
      { code: 'ANNEXES', libelle: 'Annexes fiscales', statut: 'partiel', progression: 60 },
      { code: 'TVA-CA12', libelle: 'Récapitulatif TVA annuel', statut: 'vide', progression: 0 }
    ],
    anomalies: 3,
    alertes: 5
  };

  const payments: TaxPayment[] = [
    {
      id: '1',
      date: '2024-02-14',
      impot: 'TVA',
      periode: 'Janvier 2024',
      montant: 24500,
      modePaiement: 'virement',
      reference: 'VIR-24500-TVA',
      statut: 'confirme'
    },
    {
      id: '2',
      date: '2024-01-30',
      impot: 'TSS',
      periode: 'Q1 2024',
      montant: 8500,
      modePaiement: 'virement',
      reference: 'VIR-8500-TSS',
      statut: 'confirme'
    },
    {
      id: '3',
      date: '2024-03-10',
      impot: 'IRPP',
      periode: 'Février 2024',
      montant: 15000,
      modePaiement: 'prelevement',
      reference: 'PRLV-15000-IRPP',
      statut: 'en-attente'
    }
  ];

  // Graphiques
  const evolutionData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Impôts dus',
        data: [45000, 48000, 52000, 49000, 51000, 53000, 50000, 52000, 54000, 51000, 53000, 58000],
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      },
      {
        label: 'Impôts payés',
        data: [45000, 48000, 52000, 49000, 51000, 53000, 50000, 52000, 54000, 51000, 53000, 0],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      }
    ]
  };

  const repartitionData = {
    labels: ['TVA', 'IS', 'IRPP', 'TSS', 'Patente', 'Autres'],
    datasets: [
      {
        data: [35, 25, 20, 10, 5, 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(107, 114, 128, 0.8)'
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

  const getStatutBadge = (statut: string) => {
    const badges = {
      'en-cours': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      'validee': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'envoyee': { bg: 'bg-purple-100', text: 'text-purple-700', icon: Send },
      'payee': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'retard': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
      'brouillon': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Edit },
      'deposee': { bg: 'bg-green-100', text: 'text-green-700', icon: Archive },
      'confirme': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'en-attente': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      'rejete': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle }
    };
    const badge = badges[statut as keyof typeof badges];
    const Icon = badge?.icon || Info;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge?.bg} ${badge?.text}`}>
        <Icon className="w-3 h-3" />
        {statut.replace('-', ' ')}
      </span>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total dû"
          value={`€${stats.totalDu.toLocaleString('fr-FR')}`}
          icon={DollarSign}
          trend={{ value: 8.5, type: 'increase' }}
          color="error"
        />
        <StatCard
          title="Total payé"
          value={`€${stats.totalPaye.toLocaleString('fr-FR')}`}
          icon={CheckCircle}
          trend={{ value: 12.3, type: 'increase' }}
          color="success"
        />
        <StatCard
          title="En retard"
          value={stats.retard.toString()}
          icon={AlertTriangle}
          color="warning"
          subtitle="déclarations"
        />
        <StatCard
          title="Conformité"
          value={`${stats.tauxConformite}%`}
          icon={FileCheck}
          trend={{ value: 3.2, type: 'increase' }}
          color="info"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader
            title="Évolution des impôts"
            subtitle="Dus vs Payés"
            icon={BarChart3}
          />
          <CardBody>
            <div className="h-64">
              <Line data={evolutionData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader
            title="Répartition par type"
            subtitle="Année 2024"
            icon={PieChart}
          />
          <CardBody>
            <div className="h-64">
              <Doughnut data={repartitionData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Échéancier */}
      <ModernCard>
        <CardHeader
          title="Prochaines échéances"
          icon={Calendar}
          action={
            <ModernButton size="sm" variant="outline">
              <Settings className="w-4 h-4 mr-1" />
              Paramètres
            </ModernButton>
          }
        />
        <CardBody>
          <div className="space-y-3">
            {schedule.map((item) => (
              <div key={item.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                item.joursRestants <= 5 ? 'border-red-200 bg-red-50' :
                item.joursRestants <= 15 ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    item.joursRestants <= 5 ? 'bg-red-100' :
                    item.joursRestants <= 15 ? 'bg-yellow-100' :
                    'bg-gray-100'
                  }`}>
                    <Calendar className={`w-6 h-6 ${
                      item.joursRestants <= 5 ? 'text-red-600' :
                      item.joursRestants <= 15 ? 'text-yellow-600' :
                      'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.impot}</p>
                    <p className="text-xs text-gray-500">
                      {item.periodicite} • Échéance: {new Date(item.prochaine).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">€{item.montantEstime.toLocaleString('fr-FR')}</p>
                    <p className={`text-xs font-medium ${
                      item.joursRestants <= 5 ? 'text-red-600' :
                      item.joursRestants <= 15 ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>
                      {item.joursRestants === 0 ? 'Aujourd\'hui' :
                       item.joursRestants === 1 ? 'Demain' :
                       `Dans ${item.joursRestants} jours`}
                    </p>
                  </div>
                  <ModernButton size="sm" variant={item.joursRestants <= 5 ? 'primary' : 'outline'}>
                    Déclarer
                  </ModernButton>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderDeclarations = () => (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une déclaration..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] w-64"
            />
          </div>
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option value="all">Tous les types</option>
            <option value="TVA">TVA</option>
            <option value="IS">IS</option>
            <option value="IRPP">IRPP</option>
            <option value="TSS">TSS</option>
          </select>
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option value="all">Tous les statuts</option>
            <option value="en-cours">En cours</option>
            <option value="validee">Validée</option>
            <option value="payee">Payée</option>
            <option value="retard">En retard</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1" />
            Importer
          </ModernButton>
          <ModernButton variant="primary" size="sm" onClick={() => setShowDeclarationModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle déclaration
          </ModernButton>
        </div>
      </div>

      {/* Table des déclarations */}
      <ModernCard>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Période</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Montant dû</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Montant payé</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Échéance</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Documents</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {declarations.map((declaration) => (
                  <tr key={declaration.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        {declaration.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{declaration.periode}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      €{declaration.montantDu.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      €{declaration.montantPaye.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      {new Date(declaration.dateEcheance).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatutBadge(declaration.statut)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {declaration.fichiers.length > 0 ? (
                        <button className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs">{declaration.fichiers.length}</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Voir">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Modifier">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Télécharger">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderLiasseFiscale = () => (
    <div className="space-y-6">
      {/* En-tête liasse */}
      <ModernCard>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Liasse Fiscale - Exercice {liasseFiscale.exercice}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Créée le {new Date(liasseFiscale.dateCreation).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatutBadge(liasseFiscale.statut)}
              <ModernButton variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Exporter
              </ModernButton>
              <ModernButton variant="primary" size="sm">
                <Send className="w-4 h-4 mr-1" />
                Transmettre
              </ModernButton>
            </div>
          </div>

          {/* Alertes */}
          {(liasseFiscale.anomalies > 0 || liasseFiscale.alertes > 0) && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  {liasseFiscale.anomalies} anomalie(s) et {liasseFiscale.alertes} alerte(s) détectées
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Veuillez corriger les erreurs avant la transmission
                </p>
              </div>
              <button className="text-sm text-yellow-700 hover:text-yellow-800 font-medium">
                Voir les détails
              </button>
            </div>
          )}
        </CardBody>
      </ModernCard>

      {/* Formulaires */}
      <ModernCard>
        <CardHeader
          title="Formulaires fiscaux"
          subtitle="États et progression"
          icon={FileText}
        />
        <CardBody>
          <div className="space-y-4">
            {liasseFiscale.formulaires.map((formulaire) => (
              <div key={formulaire.code} className="p-4 border border-gray-200 rounded-lg hover:border-[var(--color-primary)] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{formulaire.code}</p>
                    <p className="text-xs text-gray-500">{formulaire.libelle}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      formulaire.statut === 'complet' ? 'bg-green-100 text-green-700' :
                      formulaire.statut === 'partiel' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {formulaire.statut}
                    </span>
                    <ModernButton size="sm" variant="outline">
                      <Edit className="w-3 h-3 mr-1" />
                      Éditer
                    </ModernButton>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progression</span>
                    <span>{formulaire.progression}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        formulaire.progression === 100 ? 'bg-green-500' :
                        formulaire.progression >= 50 ? 'bg-yellow-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${formulaire.progression}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      {/* Statistiques paiements */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total payé ce mois</p>
              <p className="text-xl font-bold mt-1">€52,500</p>
            </div>
            <CreditCard className="w-8 h-8 text-green-500" />
          </div>
        </ModernCard>
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">En attente</p>
              <p className="text-xl font-bold mt-1">€15,000</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </ModernCard>
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Prochain paiement</p>
              <p className="text-xl font-bold mt-1">€26,000</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </ModernCard>
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Économies réalisées</p>
              <p className="text-xl font-bold mt-1">€3,200</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </ModernCard>
      </div>

      {/* Table des paiements */}
      <ModernCard>
        <CardHeader
          title="Historique des paiements"
          icon={Receipt}
          action={
            <ModernButton size="sm" variant="primary" onClick={() => setShowPaymentModal(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Nouveau paiement
            </ModernButton>
          }
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Impôt</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Période</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Montant</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Mode</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Référence</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">
                      {new Date(payment.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium">{payment.impot}</td>
                    <td className="py-3 px-4 text-sm">{payment.periode}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium">
                      €{payment.montant.toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs text-gray-600">{payment.modePaiement}</span>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-xs">{payment.reference}</td>
                    <td className="py-3 px-4 text-center">
                      {getStatutBadge(payment.statut)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Voir">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Télécharger reçu">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Gestion Fiscale
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Déclarations, paiements et conformité fiscale
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="2024">Exercice 2024</option>
            <option value="2023">Exercice 2023</option>
            <option value="2022">Exercice 2022</option>
          </select>
          <ModernButton variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualiser
          </ModernButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
            { id: 'declarations', label: 'Déclarations', icon: FileText },
            { id: 'liasse', label: 'Liasse fiscale', icon: Archive },
            { id: 'payments', label: 'Paiements', icon: CreditCard },
            { id: 'schedule', label: 'Échéancier', icon: Calendar },
            { id: 'settings', label: 'Paramètres', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
        {activeTab === 'declarations' && renderDeclarations()}
        {activeTab === 'liasse' && renderLiasseFiscale()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'schedule' && <div>Échéancier fiscal détaillé en cours de développement...</div>}
        {activeTab === 'settings' && <div>Paramètres fiscaux en cours de développement...</div>}
      </div>
    </div>
  );
};

export default CompleteTaxationModule;