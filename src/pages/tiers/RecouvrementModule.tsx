import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Plus, Search, Filter, Download, Eye, Edit, Trash2, X,
  ArrowLeft, Phone, Mail, Calendar, Clock, AlertTriangle, AlertCircle,
  CheckCircle, XCircle, TrendingUp, Users, FileText, Building,
  BarChart3, PieChart, Activity, CreditCard, MessageSquare,
  Target, Award, RefreshCw, Send, Bell, ChevronDown, ChevronRight,
  MoreVertical, Settings, Banknote, Scale, UserCircle, Receipt,
  ScrollText, History, Percent, Upload, Share, Trash, Wallet,
  ArrowDown, ArrowRight, UserCheck, FolderOpen, Gavel, Briefcase, CheckSquare,
  FileSignature, Hammer, Coins, Archive, Lock, Calculator,
  ShoppingCart, Package, Link, Zap, Cloud, TrendingDown, LineChart as LineChartIcon,
  Building2, Paperclip, Reply, Forward, Shield
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from 'recharts';
import { DebtCollection, CollectionAction, InvoiceDebt } from '../../types/tiers';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingSpinner } from '../../components/ui';
import { createTransfertContentieuxSchema } from '../../services/modules/tiers.service';
import { createRecoveryService } from '../../features/recovery/services/recoveryService';
import { z } from 'zod';
import { toast } from 'react-hot-toast';

interface CrmContact {
  nom: string;
  fonction: string;
  telephone: string;
  email: string;
}

interface CrmData {
  scoreRisque: number;
  categoriePaiement: string;
  chiffreAffairesAnnuel: number;
  ancienneteClient: string;
  contactPrincipal: CrmContact;
  derniereInteraction: string;
  typeInteraction: string;
}

interface CommercialData {
  conditionsParticulieres: {
    delaiPaiement: string;
    remiseAccordee: string;
    plafondCredit: number;
  };
  gestionnaireCom: string;
  secteurActivite: string;
  litigesActifs: number;
}

interface CreanceEnrichie extends DebtCollection {
  clientNom: string;
  clientCode: string;
  /** Langue préférée du tiers (`languePrefere`) : la relance part dans CETTE langue. */
  clientLangue?: string;
  crmData?: CrmData;
  commercialData?: CommercialData;
}

interface PlanRemboursement {
  reference: string;
  client: string;
  montantTotal: number;
  mensualite: number;
  echeancesPayees: number | string;
  progression: number;
  prochaineEcheance: string;
  statut: string;
  montantPaye: number;
  montantRestant: number;
}

interface ContentieuxDepense {
  id: number;
  type: string;
  date: string;
  montant: number;
  destinataire: string;
  reference: string;
  notes: string;
}

interface SuiviEtape {
  id: number;
  type: string;
  date: string;
  heure: string;
  intervenant: string;
  roleIntervenant: string;
  contact: string;
  resultat: string;
  notes: string;
  prochainRdv: string;
  documentsJoints: string;
  createdAt?: string;
}

interface ContentieuxFormData {
  id: string;
  numeroRef?: string;
  client?: string;
  statutJuridique: string;
  typeProcedure: string;
  avocat: string;
  avocatTel: string;
  avocatEmail: string;
  huissier: string;
  huissierTel: string;
  huissierEmail: string;
  tribunal: string;
  tribunalAdresse: string;
  numeroRG: string;
  chambre: string;
  dateTransfert: string;
  dateMiseEnDemeure: string;
  dateAssignation: string;
  dateAudience: string;
  dateTitreExecutoire: string;
  dateExecution: string;
  provision: number;
  debiteurAdresse: string;
  debiteurTel: string;
  debiteurEmail?: string;
  debiteurRepresentant?: string;
  motifTransfert?: string;
  resultatAttendu?: string;
  risques?: string;
  chancesSucces?: string;
  prochaineEcheance?: string;
  priorite?: string;
  notes?: string;
  dernierContact?: string;
  prochainContact?: string;
  [key: string]: unknown;
}

interface DossierContentieux {
  id: string;
  numeroRef: string;
  client: string;
  montantPrincipal: number;
  interetsRetard?: number;
  fraisProcedure?: number;
  honorairesAvocat?: number;
  montantTotal: number;
  statutJuridique?: string;
  typeProcedure?: string;
  avocat?: string;
  avocatTel?: string;
  avocatEmail?: string;
  huissier?: string;
  huissierTel?: string;
  huissierEmail?: string;
  tribunal?: string;
  tribunalAdresse?: string;
  numeroRG?: string;
  chambre?: string;
  dateTransfert?: string;
  dateMiseEnDemeure?: string;
  dateAssignation?: string;
  dateAudience?: string;
  dateTitreExecutoire?: string;
  dateExecution?: string;
  provision?: number;
  debiteurAdresse?: string;
  debiteurTel?: string;
  debiteurEmail?: string;
  debiteurRepresentant?: string;
  motifTransfert?: string;
  resultatAttendu?: string;
  risques?: string;
  chancesSucces?: string;
  prochaineEcheance?: string;
  priorite?: string;
  notes?: string;
  dernierContact?: string;
  prochainContact?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface DossierWorkflow {
  id: string;
  numeroRef: string;
  client: string;
  [key: string]: unknown;
}

interface WorkflowEtape {
  id: number;
  code: string;
  titre: string;
  description: string;
  [key: string]: unknown;
}

type ActionTypeRecouvrement = 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE' | 'PROCEDURE_JUDICIAIRE';

interface DossierRecouvrement {
  id: string;
  numeroRef: string;
  client: string;
  montantPrincipal: number;
  interets: number;
  frais: number;
  montantTotal: number;
  montantPaye: number;
  nombreFactures: number;
  dsoMoyen: number;
  dateOuverture: string;
  statut: 'actif' | 'suspendu' | 'cloture' | 'juridique';
  typeRecouvrement: 'amiable' | 'judiciaire' | 'huissier';
  responsable: string;
  derniereAction: string;
  dateAction: string;
  typeAction: ActionTypeRecouvrement;
  prochainEtape: string;
}


// ─── AnalyticsData type ──────────────────────────────────────────────────────
interface AnalyticsData {
  statistiques: {
    montantTotalCreances: number;
    montantRecouvre: number;
    tauxRecouvrement: number;
    nombreCreances: number;
    delaiMoyenRecouvrement: number;
    creancesEnRetard: number;
  };
  evolutionRecouvrement: Array<{ mois: string; recouvre: number; creances: number }>;
  repartitionNiveaux: Array<{ niveau: string; count: number; montant: number }>;
  anciennete: Array<{ periode: string; nombre: number; montant: number }>;
}

// Module-level chart color palette (shared by sub-components)
const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#2D7D9A', '#F4A228', '#6B9E6E', '#8BBCCC'];

// ─── AnalyticsTab (module level — was nested, caused focus loss) ─────────────
interface AnalyticsTabProps { analyticsData: AnalyticsData; }
const AnalyticsTab = ({ analyticsData }: AnalyticsTabProps) => {
  const { t } = useLanguage();
  const [analyticsView, setAnalyticsView] = useState('dashboard');

  const analyticsSubTabs = [
    { id: 'dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'repartition', label: 'Répartition', icon: PieChart },
    { id: 'tendances', label: 'Tendances', icon: Activity },
    { id: 'comparaison', label: 'Comparaison', icon: LineChartIcon },
    { id: 'previsions', label: 'Prévisions', icon: Calculator }
  ];

  function renderAnalyticsContent() {
    switch (analyticsView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* KPIs principaux avec intégrations temps réel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.totalReceivables')}</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      {formatCurrency(analyticsData.statistiques.montantTotalCreances)}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{analyticsData.statistiques.nombreCreances} dossiers</p>
                    <div className="flex items-center mt-2 text-xs text-blue-600">
                      <Link className="w-3 h-3 mr-1" />
                      <span>{t('recovery.accountingSync')}</span>
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.collectedThisMonth')}</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      {formatCurrency(analyticsData.statistiques.montantRecouvre)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">{t('recovery.vsPrevMonth12')}</p>
                    <div className="flex items-center mt-2 text-xs text-green-600">
                      <Zap className="w-3 h-3 mr-1" />
                      <span>{t('recovery.realTime')}</span>
                    </div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.successRate')}</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      {analyticsData.statistiques.tauxRecouvrement}%
                    </p>
                    <p className="text-xs text-blue-600 mt-1">Objectif: 85%</p>
                    <div className="flex items-center mt-2 text-xs text-primary-600">
                      <Cloud className="w-3 h-3 mr-1" />
                      <span>IA enrichie</span>
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.averageDelay')}</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      {analyticsData.statistiques.delaiMoyenRecouvrement}j
                    </p>
                    <p className="text-xs text-orange-600 mt-1">{analyticsData.statistiques.creancesEnRetard} en retard</p>
                    <div className="flex items-center mt-2 text-xs text-blue-600">
                      <Calculator className="w-3 h-3 mr-1" />
                      <span>CRM scoring</span>
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Panel des intégrations en temps réel */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('recovery.dataFlowAtlas')}</h3>
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{t('recovery.syncActive')}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">{t('accounting.title')}</p>
                      <p className="text-xs text-blue-600">156 factures sync</p>
                      <p className="text-xs text-blue-600">{t('recovery.newUnpaid23')}</p>
                    </div>
                    <Calculator className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">CRM</p>
                      <p className="text-xs text-green-600">89 clients enrichis</p>
                      <p className="text-xs text-green-600">{t('recovery.riskScoreUpdated')}</p>
                    </div>
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-800">Commercial</p>
                      <p className="text-xs text-primary-600">23 conditions part.</p>
                      <p className="text-xs text-primary-600">7 litiges actifs</p>
                    </div>
                    <ShoppingCart className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">Finance</p>
                      <p className="text-xs text-orange-600">{t('recovery.budgetsUpToDate')}</p>
                      <p className="text-xs text-orange-600">{t('recovery.provisionsComputed')}</p>
                    </div>
                    <Package className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Graphiques principaux */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Évolution mensuelle */}
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.collectionTrend')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.evolutionRecouvrement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="creances" stackId="1" stroke="#C0322B" fill="#C0322B" fillOpacity={0.3} name="Créances" />
                    <Area type="monotone" dataKey="recouvre" stackId="2" stroke="#15803D" fill="#15803D" fillOpacity={0.6} name="Recouvré" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Répartition par niveau */}
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.breakdownByLevel')}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      dataKey="montant"
                      data={analyticsData.repartitionNiveaux}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#235A6E"
                      label={({ niveau, count }) => `${niveau} (${count})`}
                    >
                      {analyticsData.repartitionNiveaux.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tableau de bord activités récentes — pas de suivi journalier en base -> "—" */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.todayActivities')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">{t('recovery.newReceivables')}</p>
                      <p className="text-lg font-bold text-blue-900">—</p>
                    </div>
                    <Plus className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">{t('recovery.collectionsCompleted')}</p>
                      <p className="text-lg font-bold text-green-900">—</p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">{t('recovery.pendingActions')}</p>
                      <p className="text-lg font-bold text-orange-900">—</p>
                    </div>
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            {/* Performance par agent */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.perfByAgent')}</h3>
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                <div className="text-center">
                  <UserCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p>{t('recovery.noAgentPerfData')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('recovery.configureAgents')}</p>
                </div>
              </div>
            </div>

            {/* Graphique performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.successRateTrend')}</h3>
                {analyticsData.evolutionRecouvrement.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.evolutionRecouvrement.map(d => ({
                      mois: d.mois,
                      taux: d.creances > 0 ? Math.round((d.recouvre / d.creances) * 100) : 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mois" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Line type="monotone" dataKey="taux" stroke="#235A6E" strokeWidth={3} name="Taux recouvrement %" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                    {t('recovery.notEnoughData')}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.timeBreakdown')}</h3>
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                  {t('recovery.noDataNotImported')}
                </div>
              </div>
            </div>
          </div>
        );

      case 'repartition':
        return (
          <div className="space-y-6">
            {/* Répartition géographique */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.geoBreakdown')}</h3>
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                  {t('recovery.noGeoData')}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.sectorBreakdown')}</h3>
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                  {t('recovery.noSectorData')}
                </div>
              </div>
            </div>

            {/* Ancienneté détaillée */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.receivablesAging')}</h3>
              {analyticsData.anciennete.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.anciennete}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periode" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="montant" fill="#235A6E" name="Montant" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                  {t('recovery.noAgingData')}
                </div>
              )}
            </div>
          </div>
        );

      case 'tendances':
        return (
          <div className="space-y-6">
            {/* Tendances temporelles */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.trends12Months')}</h3>
              {analyticsData.evolutionRecouvrement.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analyticsData.evolutionRecouvrement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Area type="monotone" dataKey="creances" stroke="#C0322B" fill="#C0322B" fillOpacity={0.3} name="Créances" />
                    <Area type="monotone" dataKey="recouvre" stroke="#15803D" fill="#15803D" fillOpacity={0.6} name="Recouvré" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-sm text-gray-500">
                  {t('recovery.noTrendData')}
                </div>
              )}
            </div>

            {/* Analyse des cycles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.avgCollectionCycle')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-blue-600">1</span>
                      </div>
                      <span className="font-medium text-gray-900">{t('recovery.firstContact')}</span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">0-3j</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-yellow-600">2</span>
                      </div>
                      <span className="font-medium text-gray-900">{t('recovery.multipleReminders')}</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-600">4-15j</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-orange-600">3</span>
                      </div>
                      <span className="font-medium text-gray-900">{t('recovery.negotiation')}</span>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">16-25j</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-semibold text-green-600">4</span>
                      </div>
                      <span className="font-medium text-gray-900">{t('recovery.resolution')}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">26-30j</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.successFactors')}</h3>
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  {t('recovery.noDataNotImported')}
                </div>
              </div>
            </div>
          </div>
        );

      case 'comparaison':
        return (
          <div className="space-y-6">
            {/* Comparaison périodes */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('recovery.periodComparison')}</h3>
                <div className="flex space-x-2">
                  <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                    <option>{t('recovery.thisMonthVsPrev')}</option>
                    <option>{t('recovery.thisQuarterVsPrev')}</option>
                    <option>{t('recovery.thisYearVsPrev')}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                {t('recovery.noComparisonHistory')}
              </div>
            </div>

            {/* Comparaison détaillée — pas d'historique N-1 disponible */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.comparativeTrend')}</h3>
              <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                {t('recovery.noComparativeData')}
              </div>
            </div>

            {/* Benchmark secteur — pas de référentiel sectoriel en base */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.sectorBenchmark')}</h3>
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                {t('recovery.noDataNotImported')}
              </div>
            </div>
          </div>
        );

      case 'previsions':
        return (
          <div className="space-y-6">
            {/* Prévisions financières — aucune projection fiable sans historique / scénarios paramétrés */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.forecastNext6Months')}</h3>
              <div className="flex items-center justify-center h-[350px] text-sm text-gray-500">
                {t('recovery.noForecastData')}
              </div>
            </div>

            {/* Facteurs de risque / opportunités — non dérivables des données importées */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.identifiedRiskFactors')}</h3>
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  {t('recovery.noDataNotImported')}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.improvementOpportunities')}</h3>
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  {t('recovery.noDataNotImported')}
                </div>
              </div>
            </div>

            {/* Simulation scenarios — pas de modèle de projection alimenté */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.scenarioSimulation')}</h3>
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                {t('recovery.noDataNotImported')}
              </div>
            </div>
          </div>
        );

      default:
        return <div>{t('recovery.contentUnavailable')}</div>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Navigation sous-onglets */}
      <div className="bg-white rounded-lg p-2 border border-[var(--color-border)] shadow-sm">
        <div className="flex flex-wrap gap-1">
          {analyticsSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAnalyticsView(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                analyticsView === tab.id
                  ? 'bg-[var(--color-text-tertiary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu selon le sous-onglet actif */}
      {renderAnalyticsContent()}
    </div>
  );
};

// ─── ContentieuxTab (module level — was nested, caused focus loss) ──────────
interface ContentieuxTabProps {
  allJournalEntries: any[];
  getStatutColor: (statut: string) => string;
  setShowRapportMensuelModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAnalyseROIModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPerformanceEquipeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPrevisionTresorerieModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowDossiersRisqueModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowExportPersonnaliseModal: React.Dispatch<React.SetStateAction<boolean>>;
}
const ContentieuxTab = ({
  allJournalEntries,
  getStatutColor,
  setShowRapportMensuelModal,
  setShowAnalyseROIModal,
  setShowPerformanceEquipeModal,
  setShowPrevisionTresorerieModal,
  setShowDossiersRisqueModal,
  setShowExportPersonnaliseModal,
}: ContentieuxTabProps) => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const { user } = useAuth();
  const [contentieuxView, setContentieuxView] = useState('dashboard'); // dashboard, liste, detail, workflow, couts, execution
  const [selectedContentieux, setSelectedContentieux] = useState<DossierContentieux | null>(null);
  const [filterStatutContentieux, setFilterStatutContentieux] = useState('tous');
  const [filterProcedure, setFilterProcedure] = useState('tous');
  const [showTransferContentieuxModal, setShowTransferContentieuxModal] = useState(false);
  const [selectedDossierTransfer, setSelectedDossierTransfer] = useState<DossierContentieux | null>(null);
  const [formData, setFormData] = useState({
    creance_ids: [] as string[],
    motif: '',
    service_recouvrement: '',
    date_transfert: new Date().toISOString().split('T')[0],
    provision_montant: '',
    documents: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const [activeWorkflowPhase, setActiveWorkflowPhase] = useState('all');

  // Create transfert contentieux mutation
  const createMutation = useMutation({
    mutationFn: async (data: { tiers_id?: string; factures?: string[]; motif: string; date_transfert?: string; responsable_contentieux?: string; }) => {
      const newCase = {
        ...data,
        id: crypto.randomUUID(),
        statut: 'juridique',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await adapter.create('recoveryCases', newCase);
      return newCase;
    },
    onSuccess: () => {
      toast.success(t('recovery.toastTransferCreated'));
      queryClient.invalidateQueries({ queryKey: ['transferts-contentieux'] });
      setShowTransferContentieuxModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const resetForm = () => {
    setFormData({
      creance_ids: [],
      motif: '',
      service_recouvrement: '',
      date_transfert: new Date().toISOString().split('T')[0],
      provision_montant: '',
      documents: [],
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | string[] | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrors({});

      // Convert provision_montant to number if not empty
      const processedData = {
        ...formData,
        provision_montant: formData.provision_montant ? Number(formData.provision_montant) : undefined,
      };

      const validatedData = createTransfertContentieuxSchema.parse(processedData);
      await createMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error(t('recovery.toastFixFormErrors'));
      } else {
        toast.error(t('recovery.toastCreateError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // États pour les modals d'actions contentieuses
  const [showAssignationModal, setShowAssignationModal] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showConclusionsModal, setShowConclusionsModal] = useState(false);
  const [showJugementModal, setShowJugementModal] = useState(false);
  const [showContactAvocatModal, setShowContactAvocatModal] = useState(false);
  const [showRetourAmiableModal, setShowRetourAmiableModal] = useState(false);
  const [showExpertiseModal, setShowExpertiseModal] = useState(false);
  const [showClotureModal, setShowClotureModal] = useState(false);
  const [actionContentieuxData, setActionContentieuxData] = useState<Record<string, unknown>>({});

  // États pour les modales d'exécution
  const [showExecutionDetailModal, setShowExecutionDetailModal] = useState(false);
  const [selectedExecutionDossier, setSelectedExecutionDossier] = useState<DossierContentieux | null>(null);

  // États pour la page détaillée des dossiers contentieux
  const [showContentieuxDetailPage, setShowContentieuxDetailPage] = useState(false);
  const [selectedContentieuxDetail, setSelectedContentieuxDetail] = useState<DossierContentieux | null>(null);
  const [activeContentieuxTab, setActiveContentieuxTab] = useState('general');

  // Hooks pour les onglets enrichis
  // Documents Tab
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentFilter, setDocumentFilter] = useState('all');

  // Frais Tab
  const [showAddFraisModal, setShowAddFraisModal] = useState(false);
  const [fraisFilter, setFraisFilter] = useState('all');

  // Correspondance Tab
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [correspondanceFilter, setCorrespondanceFilter] = useState('all');
  const [selectedCorrespondant, setSelectedCorrespondant] = useState<{
    sujet: string;
    correspondant: string;
    dateEnvoi: string;
    message: string;
    pieces: string[];
  } | null>(null);

  // Execution Tab
  const [showNewMesureModal, setShowNewMesureModal] = useState(false);
  const [executionFilter, setExecutionFilter] = useState('all');

  // Results Tab
  const [showCloturerModal, setShowCloturerModal] = useState(false);

  // États pour la modal de mise à jour dossier contentieux
  const [showEditContentieuxModal, setShowEditContentieuxModal] = useState(false);
  const [editContentieuxActiveTab, setEditContentieuxActiveTab] = useState('statut');

  // Types de dépenses pour le contentieux
  const typesDepenses = [
    { value: 'creance_principale', label: 'Créance principale' },
    { value: 'interets_retard', label: 'Intérêts de retard' },
    { value: 'frais_procedure', label: 'Frais de procédure' },
    { value: 'honoraires_avocat', label: 'Honoraires avocat' },
    { value: 'frais_huissier', label: 'Frais huissier' },
    { value: 'frais_greffe', label: 'Frais de greffe' },
    { value: 'frais_expertise', label: 'Frais d\'expertise' },
    { value: 'frais_signification', label: 'Frais de signification' },
    { value: 'frais_execution', label: 'Frais d\'exécution' },
    { value: 'provision', label: 'Provision comptable' },
    { value: 'autres', label: 'Autres frais' }
  ];

  // État pour les dépenses du contentieux
  const [contentieuxDepenses, setContentieuxDepenses] = useState<ContentieuxDepense[]>([]);
  const [newDepense, setNewDepense] = useState({
    type: 'creance_principale',
    date: new Date().toISOString().split('T')[0],
    montant: 0,
    destinataire: '',
    reference: '',
    notes: ''
  });

  const [editContentieuxFormData, setEditContentieuxFormData] = useState<ContentieuxFormData>({
    id: '',
    statutJuridique: '',
    typeProcedure: '',
    // Intervenants
    avocat: '',
    avocatTel: '',
    avocatEmail: '',
    huissier: '',
    huissierTel: '',
    huissierEmail: '',
    // Tribunal
    tribunal: '',
    tribunalAdresse: '',
    numeroRG: '',
    chambre: '',
    // Dates clés
    dateTransfert: '',
    dateMiseEnDemeure: '',
    dateAssignation: '',
    dateAudience: '',
    dateTitreExecutoire: '',
    dateExecution: '',
    // Provision comptable
    provision: 0,
    // Débiteur
    debiteurAdresse: '',
    debiteurTel: '',
    debiteurEmail: '',
    debiteurRepresentant: '',
    // Procédure
    motifTransfert: '',
    resultatAttendu: '',
    risques: '',
    chancesSucces: 'moyenne',
    // Suivi
    prochaineEcheance: '',
    priorite: 'normale',
    notes: '',
    dernierContact: '',
    prochainContact: ''
  });

  // Fonction pour ajouter une dépense
  const addDepense = () => {
    if (newDepense.montant <= 0) {
      toast.error(t('recovery.toastAmountMustBePositive'));
      return;
    }
    const depense = {
      id: Date.now(),
      ...newDepense
    };
    setContentieuxDepenses([...contentieuxDepenses, depense]);
    setNewDepense({
      type: 'creance_principale',
      date: new Date().toISOString().split('T')[0],
      montant: 0,
      destinataire: '',
      reference: '',
      notes: ''
    });
    toast.success(t('recovery.toastExpenseAdded'));
  };

  // Fonction pour supprimer une dépense
  const removeDepense = (id: number) => {
    setContentieuxDepenses(contentieuxDepenses.filter(d => d.id !== id));
    toast.success(t('recovery.toastExpenseDeleted'));
  };

  // Calcul des totaux par type
  const getTotalByType = (type: string) => {
    return contentieuxDepenses
      .filter(d => d.type === type)
      .reduce((sum, d) => sum + d.montant, 0);
  };

  // Total général des dépenses
  const getTotalDepenses = () => {
    return contentieuxDepenses.reduce((sum, d) => sum + d.montant, 0);
  };

  // Types d'étapes de suivi
  const typesEtapesSuivi = [
    { value: 'appel_telephonique', label: 'Appel téléphonique', icon: 'phone' },
    { value: 'envoi_courrier', label: 'Envoi de courrier', icon: 'mail' },
    { value: 'envoi_email', label: 'Envoi email', icon: 'mail' },
    { value: 'reunion', label: 'Réunion / Rendez-vous', icon: 'users' },
    { value: 'mise_demeure', label: 'Mise en demeure', icon: 'alert' },
    { value: 'depot_greffe', label: 'Dépôt au greffe', icon: 'file' },
    { value: 'audience', label: 'Audience tribunal', icon: 'scale' },
    { value: 'signification', label: 'Signification huissier', icon: 'gavel' },
    { value: 'saisie', label: 'Saisie / Exécution', icon: 'lock' },
    { value: 'paiement_recu', label: 'Paiement reçu', icon: 'check' },
    { value: 'negociation', label: 'Négociation', icon: 'handshake' },
    { value: 'autre', label: 'Autre', icon: 'circle' }
  ];

  // État pour les étapes de suivi
  const [suiviEtapes, setSuiviEtapes] = useState<SuiviEtape[]>([]);
  const [newSuiviEtape, setNewSuiviEtape] = useState({
    type: 'appel_telephonique',
    date: new Date().toISOString().split('T')[0],
    heure: '',
    intervenant: '',
    roleIntervenant: '',
    contact: '',
    resultat: 'en_attente',
    notes: '',
    prochainRdv: '',
    documentsJoints: ''
  });

  // Résultats possibles pour une étape
  const resultatsEtape = [
    { value: 'en_attente', label: 'En attente', color: 'gray' },
    { value: 'reussi', label: 'Réussi', color: 'green' },
    { value: 'echoue', label: 'Échoué', color: 'red' },
    { value: 'reporte', label: 'Reporté', color: 'yellow' },
    { value: 'annule', label: 'Annulé', color: 'orange' }
  ];

  // Fonction pour ajouter une étape de suivi
  const addSuiviEtape = () => {
    if (!newSuiviEtape.date) {
      toast.error(t('recovery.toastDateRequired'));
      return;
    }
    const etape = {
      id: Date.now(),
      ...newSuiviEtape,
      createdAt: new Date().toISOString()
    };
    setSuiviEtapes([etape, ...suiviEtapes]); // Ajouter en premier (plus récent en haut)
    setNewSuiviEtape({
      type: 'appel_telephonique',
      date: new Date().toISOString().split('T')[0],
      heure: '',
      intervenant: '',
      roleIntervenant: '',
      contact: '',
      resultat: 'en_attente',
      notes: '',
      prochainRdv: '',
      documentsJoints: ''
    });
    toast.success(t('recovery.toastStepAdded'));
  };

  // Fonction pour supprimer une étape de suivi
  const removeSuiviEtape = (id: number) => {
    setSuiviEtapes(suiviEtapes.filter(e => e.id !== id));
    toast.success(t('recovery.toastStepDeleted'));
  };

  // Fonction pour mettre à jour le résultat d'une étape
  const updateSuiviEtapeResultat = (id: number, resultat: string) => {
    setSuiviEtapes(suiviEtapes.map(e =>
      e.id === id ? { ...e, resultat } : e
    ));
  };

  // Fonction pour ouvrir la modal d'édition avec les données du dossier
  const openEditContentieuxModal = (dossier: DossierContentieux) => {
    setEditContentieuxFormData({
      id: dossier.id ?? '',
      numeroRef: dossier.numeroRef ?? '',
      client: dossier.client,
      statutJuridique: dossier.statutJuridique ?? '',
      typeProcedure: dossier.typeProcedure ?? '',
      // Intervenants
      avocat: dossier.avocat || '',
      avocatTel: dossier.avocatTel || '',
      avocatEmail: dossier.avocatEmail || '',
      huissier: dossier.huissier || '',
      huissierTel: dossier.huissierTel || '',
      huissierEmail: dossier.huissierEmail || '',
      // Tribunal
      tribunal: dossier.tribunal || 'Tribunal de Commerce',
      tribunalAdresse: dossier.tribunalAdresse || '',
      numeroRG: dossier.numeroRG || '',
      chambre: dossier.chambre || '',
      // Dates clés
      dateTransfert: dossier.dateTransfert || '',
      dateMiseEnDemeure: dossier.dateMiseEnDemeure || '',
      dateAssignation: dossier.dateAssignation || '',
      dateAudience: dossier.dateAudience || '',
      dateTitreExecutoire: dossier.dateTitreExecutoire || '',
      dateExecution: dossier.dateExecution || '',
      // Provision comptable
      provision: dossier.provision || 0,
      // Débiteur
      debiteurAdresse: dossier.debiteurAdresse || '',
      debiteurTel: dossier.debiteurTel || '',
      debiteurEmail: dossier.debiteurEmail || '',
      debiteurRepresentant: dossier.debiteurRepresentant || '',
      // Procédure
      motifTransfert: dossier.motifTransfert || '',
      resultatAttendu: dossier.resultatAttendu || '',
      risques: dossier.risques || '',
      chancesSucces: dossier.chancesSucces || 'moyenne',
      // Suivi
      prochaineEcheance: dossier.prochaineEcheance || '',
      priorite: dossier.priorite || 'normale',
      notes: dossier.notes || '',
      dernierContact: dossier.dernierContact || '',
      prochainContact: dossier.prochainContact || ''
    });

    // Initialiser les dépenses à partir des données existantes du dossier
    const depensesInitiales: ContentieuxDepense[] = [];
    if (dossier.montantPrincipal > 0) {
      depensesInitiales.push({
        id: 1,
        type: 'creance_principale',
        date: dossier.dateTransfert || new Date().toISOString().split('T')[0],
        montant: dossier.montantPrincipal,
        destinataire: dossier.client,
        reference: dossier.numeroRef,
        notes: 'Créance principale'
      });
    }
    if ((dossier.interetsRetard ?? 0) > 0) {
      depensesInitiales.push({
        id: 2,
        type: 'interets_retard',
        date: dossier.dateTransfert || new Date().toISOString().split('T')[0],
        montant: dossier.interetsRetard ?? 0,
        destinataire: dossier.client,
        reference: '',
        notes: 'Intérêts de retard'
      });
    }
    if ((dossier.fraisProcedure ?? 0) > 0) {
      depensesInitiales.push({
        id: 3,
        type: 'frais_procedure',
        date: dossier.dateTransfert || new Date().toISOString().split('T')[0],
        montant: dossier.fraisProcedure ?? 0,
        destinataire: 'Greffe',
        reference: '',
        notes: 'Frais de procédure'
      });
    }
    setContentieuxDepenses(depensesInitiales);
    setEditContentieuxActiveTab('statut');
    setShowEditContentieuxModal(true);
  };

  // Fonction pour sauvegarder les modifications
  const handleSaveContentieux = async () => {
    try {
      const { id, ...fields } = editContentieuxFormData;
      await adapter.update('recoveryCases', id, {
        ...fields,
        updatedAt: new Date().toISOString(),
      });
      // Rafraîchir la liste locale
      const updated = await adapter.getAll<any>('recoveryCases', { where: { statut: 'juridique' } });
      setDossiersContentieux(updated);
      toast.success(t('recovery.toastCaseUpdated', { ref: String(editContentieuxFormData.numeroRef) }));
      setShowEditContentieuxModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      toast.error(msg);
    }
  };

  // Onglets pour la page détaillée contentieux
  const contentieuxDetailTabs = [
    { id: 'general', label: 'Informations Générales', icon: FileText },
    { id: 'procedure', label: 'Procédure Juridique', icon: Scale },
    { id: 'chronologie', label: 'Chronologie', icon: Clock },
    { id: 'documents', label: 'Documents', icon: Archive },
    { id: 'frais', label: 'Frais & Coûts', icon: DollarSign },
    { id: 'correspondance', label: 'Correspondance', icon: Mail },
    { id: 'execution', label: 'Exécution', icon: Hammer },
    { id: 'resultats', label: 'Résultats', icon: Award }
  ];

  // Dossiers d'exécution — pas de modèle de données dédié (huissier, saisies).
  // Vidé pour ne pas afficher de données fabriquées ; à brancher quand le
  // modèle d'exécution forcée existera.
  const dossiersExecution: any[] = [];

  // Dossiers contentieux — chargés depuis l'adaptateur
  const [dossiersContentieux, setDossiersContentieux] = useState<any[]>([]);
  useEffect(() => {
    adapter.getAll<any>('recoveryCases', { where: { statut: 'juridique' } })
      .then(setDossiersContentieux)
      .catch((err) => {
        console.error('[RecouvrementModule] Erreur chargement dossiers contentieux:', err);
        toast.error(t('recovery.toastCasesLoadError'));
        setDossiersContentieux([]);
      });
  }, [adapter]);

  // Workflow de contentieux avec les étapes correctes
  const statutsContentieux = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'reglement_amiable', label: '1. Règlement à l\'amiable' },
    { value: 'mise_demeure_huissier', label: '2. Mise en demeure (Huissier)' },
    { value: 'saisine_tribunal', label: '3. Saisine au tribunal' },
    { value: 'procedure_injonction', label: '4. Procédure d\'injonction' },
    { value: 'titre_executoire', label: '5. Titre exécutoire obtenu' },
    { value: 'execution_forcee', label: '6. Exécution forcée / Saisie' },
    { value: 'cloture', label: 'Clôturé' }
  ];

  const typesProcedure = [
    { value: 'tous', label: 'Toutes les procédures' },
    { value: 'injonction_payer', label: 'Injonction de payer' },
    { value: 'refere_provision', label: 'Référé provision' },
    { value: 'procedure_fond', label: 'Procédure au fond' },
    { value: 'saisie_attribution', label: 'Saisie-attribution' },
    { value: 'saisie_vente', label: 'Saisie-vente' },
    { value: 'saisie_immobiliere', label: 'Saisie immobilière' }
  ];

  // États pour le workflow personnalisable
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedDossierWorkflow, setSelectedDossierWorkflow] = useState<DossierWorkflow | null>(null);
  const [showAddEtapeModal, setShowAddEtapeModal] = useState(false);
  const [newEtape, setNewEtape] = useState({ titre: '', description: '', datePrevu: '' });
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedEtape, setSelectedEtape] = useState<WorkflowEtape | null>(null);
  const [newComment, setNewComment] = useState('');

  // Structure des étapes du workflow par défaut
  const defaultWorkflowEtapes = [
    {
      id: 1,
      code: 'reglement_amiable',
      titre: 'Règlement à l\'amiable',
      description: 'Tentative de recouvrement amiable avant procédure judiciaire',
      ordre: 1,
      obligatoire: true,
      delaiJours: 15
    },
    {
      id: 2,
      code: 'mise_demeure_huissier',
      titre: 'Mise en demeure par Huissier',
      description: 'Signification de la mise en demeure par voie d\'huissier de justice',
      ordre: 2,
      obligatoire: true,
      delaiJours: 8
    },
    {
      id: 3,
      code: 'saisine_tribunal',
      titre: 'Saisine au tribunal',
      description: 'Dépôt de la requête auprès du tribunal compétent',
      ordre: 3,
      obligatoire: true,
      delaiJours: 30
    },
    {
      id: 4,
      code: 'procedure_injonction',
      titre: 'Procédure d\'injonction',
      description: 'Procédure d\'injonction de payer devant le tribunal',
      ordre: 4,
      obligatoire: true,
      delaiJours: 45
    },
    {
      id: 5,
      code: 'titre_executoire',
      titre: 'Obtention du titre exécutoire',
      description: 'Ordonnance d\'injonction de payer revêtue de la formule exécutoire',
      ordre: 5,
      obligatoire: true,
      delaiJours: 15
    },
    {
      id: 6,
      code: 'execution_forcee',
      titre: 'Exécution forcée / Saisie',
      description: 'Mise en œuvre des mesures d\'exécution forcée (saisie-attribution, saisie-vente, etc.)',
      ordre: 6,
      obligatoire: true,
      delaiJours: 30
    }
  ];

  // État pour les étapes du workflow avec leurs statuts et commentaires
  const [workflowData, setWorkflowData] = useState<{[key: string]: {
    etapes: Array<{
      id: number;
      code: string;
      titre: string;
      description: string;
      ordre: number;
      obligatoire: boolean;
      delaiJours: number;
      statut: 'pending' | 'in_progress' | 'completed' | 'skipped';
      dateDebut?: string;
      dateFin?: string;
      commentaires: Array<{
        id: number;
        texte: string;
        auteur: string;
        date: string;
      }>;
      custom?: boolean;
    }>;
  }}>({});

  // Persistance du suivi + workflow judiciaire (settings.recovery_workflow) — fini le
  // useState volatil : les etapes/commentaires survivent au rechargement.
  const wfLoadedRef = React.useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const s = await adapter.getById<{ value: string }>('settings', 'recovery_workflow');
        if (s?.value) {
          const p = JSON.parse(s.value);
          if (Array.isArray(p.suiviEtapes)) setSuiviEtapes(p.suiviEtapes);
          if (p.workflowData && typeof p.workflowData === 'object') setWorkflowData(p.workflowData);
        }
      } catch { /* ignore */ }
      wfLoadedRef.current = true;
    })();
  }, [adapter]);
  useEffect(() => {
    if (!wfLoadedRef.current) return;
    (async () => {
      try {
        const value = JSON.stringify({ suiviEtapes, workflowData });
        const cur = await adapter.getById('settings', 'recovery_workflow').catch(() => null);
        if (cur) await adapter.update('settings', 'recovery_workflow', { value } as any);
        else await adapter.create('settings', { key: 'recovery_workflow', value } as any);
      } catch { /* best-effort */ }
    })();
  }, [suiviEtapes, workflowData, adapter]);

  // Fonction pour initialiser le workflow d'un dossier
  const initWorkflowForDossier = (dossierId: string) => {
    if (!workflowData[dossierId]) {
      setWorkflowData(prev => ({
        ...prev,
        [dossierId]: {
          etapes: defaultWorkflowEtapes.map(etape => ({
            ...etape,
            statut: 'pending',
            commentaires: []
          }))
        }
      }));
    }
  };

  // Fonction pour mettre à jour le statut d'une étape
  const updateEtapeStatus = (dossierId: string, etapeId: number, newStatut: 'pending' | 'in_progress' | 'completed' | 'skipped') => {
    setWorkflowData(prev => ({
      ...prev,
      [dossierId]: {
        ...prev[dossierId],
        etapes: prev[dossierId].etapes.map(etape =>
          etape.id === etapeId
            ? {
                ...etape,
                statut: newStatut,
                dateDebut: newStatut === 'in_progress' ? new Date().toISOString().split('T')[0] : etape.dateDebut,
                dateFin: newStatut === 'completed' ? new Date().toISOString().split('T')[0] : etape.dateFin
              }
            : etape
        )
      }
    }));
    toast.success(`Étape mise à jour: ${newStatut === 'completed' ? 'Terminée' : newStatut === 'in_progress' ? 'En cours' : 'En attente'}`);
  };

  // Fonction pour ajouter un commentaire à une étape
  const addCommentToEtape = (dossierId: string, etapeId: number, commentText: string) => {
    const newCommentObj = {
      id: Date.now(),
      texte: commentText,
      auteur: user?.name || user?.email || 'Utilisateur',
      date: new Date().toISOString().split('T')[0]
    };
    setWorkflowData(prev => ({
      ...prev,
      [dossierId]: {
        ...prev[dossierId],
        etapes: prev[dossierId].etapes.map(etape =>
          etape.id === etapeId
            ? { ...etape, commentaires: [...etape.commentaires, newCommentObj] }
            : etape
        )
      }
    }));
    toast.success(t('recovery.toastCommentAdded'));
    setShowCommentModal(false);
    setNewComment('');
  };

  // Fonction pour ajouter une étape personnalisée
  const addCustomEtape = (dossierId: string) => {
    const dossierWorkflow = workflowData[dossierId];
    const maxOrdre = Math.max(...dossierWorkflow.etapes.map(e => e.ordre));
    const newEtapeObj = {
      id: Date.now(),
      code: `custom_${Date.now()}`,
      titre: newEtape.titre,
      description: newEtape.description,
      ordre: maxOrdre + 1,
      obligatoire: false,
      delaiJours: 0,
      statut: 'pending' as const,
      commentaires: [],
      custom: true
    };
    setWorkflowData(prev => ({
      ...prev,
      [dossierId]: {
        ...prev[dossierId],
        etapes: [...prev[dossierId].etapes, newEtapeObj]
      }
    }));
    toast.success(t('recovery.toastCustomStepAdded'));
    setShowAddEtapeModal(false);
    setNewEtape({ titre: '', description: '', datePrevu: '' });
  };

  const getProcedureStatutColor = (statut: string) => {
    switch (statut) {
      case 'reglement_amiable': return 'bg-blue-100 text-blue-800';
      case 'mise_demeure_huissier': return 'bg-yellow-100 text-yellow-800';
      case 'mise_demeure': return 'bg-yellow-100 text-yellow-800';
      case 'saisine_tribunal': return 'bg-orange-100 text-orange-800';
      case 'assignation': return 'bg-orange-100 text-orange-800';
      case 'procedure_injonction': return 'bg-primary-100 text-primary-800';
      case 'titre_executoire': return 'bg-primary-100 text-primary-800';
      case 'jugement': return 'bg-primary-100 text-primary-800';
      case 'execution_forcee': return 'bg-red-100 text-red-800';
      case 'execution': return 'bg-red-100 text-red-800';
      case 'appel': return 'bg-primary-100 text-primary-800';
      case 'cloture': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgenceIndicator = (jours: number) => {
    if (jours <= 3) return 'text-red-600';
    if (jours <= 7) return 'text-orange-600';
    return 'text-gray-600';
  };

  const filteredContentieux = dossiersContentieux.filter(dossier => {
    const matchStatut = filterStatutContentieux === 'tous' || dossier.statutJuridique === filterStatutContentieux;
    const matchProcedure = filterProcedure === 'tous' || dossier.typeProcedure === filterProcedure;
    return matchStatut && matchProcedure;
  });

  // Sous-onglets du contentieux
  const contentieuxSubTabs = [
    { id: 'dashboard', label: t('dashboard.title'), icon: BarChart3 },
    { id: 'liste', label: 'Dossiers', icon: FileText },
    { id: 'workflow', label: 'Workflow', icon: Activity },
    { id: 'couts', label: 'Coûts & Budget', icon: DollarSign },
    { id: 'execution', label: 'Exécution', icon: Scale },
    { id: 'kpi', label: 'KPIs & Reporting', icon: TrendingUp }
  ];

  // Vue principale avec sous-onglets
  return (
    <div className="space-y-6">
      {/* Barre de sous-navigation */}
      <div className="bg-white rounded-lg p-2 border border-[var(--color-border)] shadow-sm">
        <div className="flex space-x-1">
          {contentieuxSubTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setContentieuxView(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                contentieuxView === tab.id
                  ? 'bg-[var(--color-text-tertiary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenu selon le sous-onglet actif */}
      {renderContentieuxContent()}

      {/* Modals d'actions contentieuses */}
      {/* Modal Préparer Assignation */}
      {showAssignationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.prepareSummonsTitle')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.summonsType')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.summonsInterim')}</option>
                  <option>{t('recovery.summonsMerits')}</option>
                  <option>{t('recovery.summonsPaymentOrder')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.competentCourt')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.courtAbidjanCommercial')}</option>
                  <option>{t('recovery.courtAbidjanFirstInstance')}</option>
                  <option>{t('recovery.courtBouakeCommercial')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.claimedAmount')}</label>
                <input
                  type="text"
                  value={selectedContentieux ? formatCurrency(selectedContentieux.montantTotal) : ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.ancillaryClaims')}</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.lateInterest')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.contractualPenalties')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.damages')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.procedureFees')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.specialInstructions')}</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder={t('recovery.lawyerInstructionsPh')}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAssignationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement de l'assignation
                  setShowAssignationModal(false);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {t('recovery.prepareSummons')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Planifier Audience */}
      {showAudienceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.scheduleHearingTitle')}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.hearingDate')}</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.time')}</label>
                  <input
                    type="time"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.hearingType')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.hearingConciliation')}</option>
                  <option>{t('recovery.hearingCaseManagement')}</option>
                  <option>{t('recovery.hearingPleadings')}</option>
                  <option>{t('recovery.hearingJudgment')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.assignedLawyer')}</label>
                <input
                  type="text"
                  value={selectedContentieux ? selectedContentieux.avocat : ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.claimantOurClient')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.defendant')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.courtExpert')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.preparationNotes')}</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder={t('recovery.pointsToAddressPh')}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAudienceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement de la planification
                  setShowAudienceModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('recovery.scheduleHearing')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Générer Conclusions */}
      {showConclusionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.generateSubmissionsTitle')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.submissionsType')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.submissionsMain')}</option>
                  <option>{t('recovery.submissionsAlternative')}</option>
                  <option>{t('recovery.submissionsRejoinder')}</option>
                  <option>{t('recovery.submissionsDefence')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.legalPointsToDevelop')}</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.claimCertainLiquidDue')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.debtorBreach')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.counterclaim')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.nonPerformanceException')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Demandes</label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Principal</span>
                    <span className="font-medium">{selectedContentieux ? formatCurrency(selectedContentieux.montantPrincipal) : ''}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{t('recovery.lateInterest')}</span>
                    <span className="font-medium">{selectedContentieux ? formatCurrency(selectedContentieux.interetsRetard ?? 0) : ''}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{t('recovery.procedureFees')}</span>
                    <span className="font-medium">{selectedContentieux ? formatCurrency(selectedContentieux.fraisProcedure ?? 0) : ''}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.exhibitsToAttach')}</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.mainContract')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.unpaidInvoices')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.formalNotice')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Correspondances</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConclusionsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement de la génération
                  setShowConclusionsModal(false);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('recovery.generateSubmissions')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enregistrer Jugement */}
      {showJugementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.recordJudgmentTitle')}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.judgmentDate')}</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.caseNumber')}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder={t('recovery.docketNumberPh')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.judgmentOutcome')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.judgmentFavorable')}</option>
                  <option>{t('recovery.judgmentUnfavorable')}</option>
                  <option>{t('recovery.judgmentPartial')}</option>
                  <option>{t('recovery.judgmentInterlocutory')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.awardedAmount')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('recovery.awardAmountPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.provisionalEnforcement')}</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="radio" name="execution" className="mr-2" />
                    <span className="text-sm">{t('recovery.yesByLaw')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="execution" className="mr-2" />
                    <span className="text-sm">{t('recovery.yesUpTo')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="execution" className="mr-2" />
                    <span className="text-sm">{t('recovery.no')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observations</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder={t('recovery.judgmentRemarksPh')}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowJugementModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement de l'enregistrement
                  setShowJugementModal(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {t('recovery.recordJudgment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Contacter Avocat */}
      {showContactAvocatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.contactLawyerTitle')}</h3>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <UserCircle className="w-12 h-12 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-blue-900">{selectedContentieux ? selectedContentieux.avocat : ''}</h4>
                    <p className="text-sm text-blue-700">Cabinet KONE & Associés</p>
                    <p className="text-sm text-blue-600">+225 27 20 30 40 50</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.contactMode')}</label>
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">Appel</span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 border border-blue-300 rounded-lg">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">Email</span>
                  </button>
                  <button className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Message</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Objet</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.procedureUpdate')}</option>
                  <option>{t('recovery.updateRequest')}</option>
                  <option>{t('recovery.specificInstructions')}</option>
                  <option>{t('recovery.proceduralUrgency')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                  placeholder={t('recovery.messageToLawyerPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.attachments')}</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Upload className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">{t('recovery.dropFilesOrBrowse')}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowContactAvocatModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement de l'envoi
                  setShowContactAvocatModal(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('recovery.sendMessage')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retour en Amiable */}
      {showRetourAmiableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.returnToAmicableTitle')}</h3>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Attention</h4>
                  <p className="text-sm text-yellow-700">{t('recovery.returnToAmicableWarn')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.returnReason')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.reasonSettlementOffer')}</option>
                  <option>{t('recovery.reasonInstalmentsAccepted')}</option>
                  <option>{t('recovery.reasonTemporaryDifficulty')}</option>
                  <option>{t('recovery.reasonSettlementPending')}</option>
                  <option>{t('recovery.reasonOther')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.newAmicableStrategy')}</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.negotiatedClearancePlan')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.commercialDiscountGranted')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.additionalGuarantees')}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.agentAssignedFollowUp')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>Marie Diallo (Senior)</option>
                  <option>Jean Kouassi (Junior)</option>
                  <option>Aminata Traoré (Négociatrice)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.specificInstructions')}</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder={t('recovery.newAmicableInstructionsPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.litigationResumeDeadline')}</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowRetourAmiableModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement du retour
                  setShowRetourAmiableModal(false);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {t('recovery.confirmReturnAmicable')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Demander Expertise */}
      {showExpertiseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.requestExpertiseTitle')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.expertiseType')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.expertiseAccounting')}</option>
                  <option>{t('recovery.expertiseTechnical')}</option>
                  <option>{t('recovery.expertiseManagement')}</option>
                  <option>{t('recovery.expertiseAmicable')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.expertisePurpose')}</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder={t('recovery.expertisePurposePh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.suggestedExpert')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('recovery.suggestedExpertPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.estimatedBudget')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('recovery.estimatedCostPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.desiredDeadline')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>1 mois</option>
                  <option>2 mois</option>
                  <option>3 mois</option>
                  <option>6 mois</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.documentsForExpert')}</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    <span className="text-sm">{t('recovery.fullLitigationFile')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.accountingDocuments')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">Correspondances</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExpertiseModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement de la demande
                  setShowExpertiseModal(false);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('recovery.requestExpertise')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clôturer Dossier */}
      {showClotureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.closeLitigationCaseTitle')}</h3>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">{t('recovery.irreversibleAction')}</h4>
                  <p className="text-sm text-red-700">{t('recovery.closingIsFinalWarn')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.closingReason')}</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option>{t('recovery.fullRecovery')}</option>
                  <option>{t('recovery.settlementAgreement')}</option>
                  <option>{t('recovery.provenInsolvency')}</option>
                  <option>{t('recovery.claimTimeBarred')}</option>
                  <option>{t('recovery.debtWriteOff')}</option>
                  <option>{t('recovery.finalAdverseJudgment')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.finalAmountCollected')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('recovery.totalAmountRecoveredPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.totalProcedureCosts')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('recovery.feesBreakdownPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.finalSummary')}</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                  placeholder={t('recovery.finalSummaryPh')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.postClosingActions')}</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.archiveCase')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.updateCustomerScoring')}</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{t('recovery.notifyManagement')}</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowClotureModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => {
                  // Traitement de la clôture
                  setShowClotureModal(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('recovery.closeDefinitively')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier Dossier Contentieux */}
      {showEditContentieuxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-primary)]">
                  {t('recovery.editLitigationCase')}
                </h2>
                <p className="text-gray-600 mt-1">
                  {editContentieuxFormData.numeroRef} - {editContentieuxFormData.client}
                </p>
              </div>
              <button
                onClick={() => setShowEditContentieuxModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation par onglets */}
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto px-4">
                {[
                  { id: 'statut', label: 'Statut', icon: Scale, color: 'blue' },
                  { id: 'dates', label: 'Dates', icon: Calendar, color: 'primary' },
                  { id: 'juridiction', label: 'Juridiction', icon: Building, color: 'primary' },
                  { id: 'intervenants', label: 'Intervenants', icon: Users, color: 'primary' },
                  { id: 'debiteur', label: 'Débiteur', icon: UserCircle, color: 'red' },
                  { id: 'montants', label: 'Montants', icon: DollarSign, color: 'orange' },
                  { id: 'suivi', label: 'Suivi', icon: Phone, color: 'green' },
                  { id: 'notes', label: 'Notes', icon: MessageSquare, color: 'gray' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setEditContentieuxActiveTab(tab.id)}
                    className={`flex items-center px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                      editContentieuxActiveTab === tab.id
                        ? `border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Onglet: Statut & Procédure */}
              {editContentieuxActiveTab === 'statut' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Scale className="w-5 h-5 mr-2" />
                    {t('recovery.statusAndProcedure')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.currentStepReq')}</label>
                      <select
                        value={editContentieuxFormData.statutJuridique}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, statutJuridique: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="reglement_amiable">{t('recovery.step1Amicable')}</option>
                        <option value="mise_demeure_huissier">{t('recovery.step2FormalNotice')}</option>
                        <option value="saisine_tribunal">{t('recovery.step3CourtFiling')}</option>
                        <option value="procedure_injonction">{t('recovery.step4Injunction')}</option>
                        <option value="titre_executoire">{t('recovery.step5EnforceableTitle')}</option>
                        <option value="execution_forcee">{t('recovery.step6ForcedEnforcement')}</option>
                        <option value="cloture">{t('recovery.closed')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.procedureTypeReq')}</label>
                      <select
                        value={editContentieuxFormData.typeProcedure}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, typeProcedure: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="injonction_payer">{t('recovery.paymentOrder')}</option>
                        <option value="assignation_fond">{t('recovery.summonsMerits')}</option>
                        <option value="refere">{t('recovery.interimProvision')}</option>
                        <option value="saisie_conservatoire">{t('recovery.protectiveSeizure')}</option>
                        <option value="saisie_attribution">Saisie-attribution</option>
                        <option value="saisie_vente">Saisie-vente</option>
                        <option value="procedure_collective">{t('recovery.insolvencyProceedings')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.priority')}</label>
                      <select
                        value={editContentieuxFormData.priorite}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, priorite: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="basse">Basse</option>
                        <option value="normale">Normale</option>
                        <option value="haute">Haute</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.chancesOfSuccess')}</label>
                      <select
                        value={editContentieuxFormData.chancesSucces}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, chancesSucces: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="faible">{t('recovery.chanceLow')}</option>
                        <option value="moyenne">{t('recovery.chanceMedium')}</option>
                        <option value="elevee">{t('recovery.chanceHigh')}</option>
                        <option value="tres_elevee">{t('recovery.chanceVeryHigh')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet: Dates Clés */}
              {editContentieuxActiveTab === 'dates' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary-900 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    {t('recovery.keyProcedureDates')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.dateLitigationTransfer')}</label>
                      <input
                        type="date"
                        value={editContentieuxFormData.dateTransfert}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateTransfert: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.dateFormalNotice')}</label>
                      <input
                        type="date"
                        value={editContentieuxFormData.dateMiseEnDemeure}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateMiseEnDemeure: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.dateSummons')}</label>
                      <input
                        type="date"
                        value={editContentieuxFormData.dateAssignation}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateAssignation: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.dateHearing')}</label>
                      <input
                        type="date"
                        value={editContentieuxFormData.dateAudience}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateAudience: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.dateEnforceableTitle')}</label>
                      <input
                        type="date"
                        value={editContentieuxFormData.dateTitreExecutoire}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateTitreExecutoire: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.dateEnforcement')}</label>
                      <input
                        type="date"
                        value={editContentieuxFormData.dateExecution}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, dateExecution: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.nextDueDate')}</label>
                    <input
                      type="text"
                      value={editContentieuxFormData.prochaineEcheance}
                      onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, prochaineEcheance: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                      placeholder={t('recovery.nextDueDatePh')}
                    />
                  </div>
                </div>
              )}

              {/* Onglet: Juridiction */}
              {editContentieuxActiveTab === 'juridiction' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary-900 mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    {t('recovery.jurisdiction')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.competentCourt')}</label>
                      <input
                        type="text"
                        value={editContentieuxFormData.tribunal}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, tribunal: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                        placeholder={t('recovery.courtPh')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.docketNumberLabel')}</label>
                      <input
                        type="text"
                        value={editContentieuxFormData.numeroRG}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, numeroRG: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                        placeholder="ex: RG 2024/001234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chambre</label>
                      <input
                        type="text"
                        value={editContentieuxFormData.chambre}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, chambre: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                        placeholder={t('recovery.chamberPh')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.courtAddress')}</label>
                      <input
                        type="text"
                        value={editContentieuxFormData.tribunalAdresse}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, tribunalAdresse: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                        placeholder={t('recovery.courtAddressPh')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet: Intervenants */}
              {editContentieuxActiveTab === 'intervenants' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary-900 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    {t('recovery.participants')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Avocat */}
                    <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                      <h4 className="font-medium text-primary-800 mb-3 flex items-center">
                        <Briefcase className="w-4 h-4 mr-2" />
                        {t('recovery.lawyer')}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Nom</label>
                          <input
                            type="text"
                            value={editContentieuxFormData.avocat}
                            onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, avocat: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder={t('recovery.lawyerNamePh')}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">{t('recovery.phone')}</label>
                          <input
                            type="tel"
                            value={editContentieuxFormData.avocatTel}
                            onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, avocatTel: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="+242 06 XXX XX XX"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Email</label>
                          <input
                            type="email"
                            value={editContentieuxFormData.avocatEmail}
                            onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, avocatEmail: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="avocat@cabinet.com"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Huissier */}
                    <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                      <h4 className="font-medium text-primary-800 mb-3 flex items-center">
                        <Gavel className="w-4 h-4 mr-2" />
                        {t('recovery.bailiff')}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">{t('recovery.nameOrFirm')}</label>
                          <input
                            type="text"
                            value={editContentieuxFormData.huissier}
                            onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, huissier: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="SCP Huissiers..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">{t('recovery.phone')}</label>
                          <input
                            type="tel"
                            value={editContentieuxFormData.huissierTel}
                            onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, huissierTel: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="+242 06 XXX XX XX"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Email</label>
                          <input
                            type="email"
                            value={editContentieuxFormData.huissierEmail}
                            onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, huissierEmail: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="contact@huissier.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet: Informations Débiteur */}
              {editContentieuxActiveTab === 'debiteur' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-red-900 mb-4 flex items-center">
                    <UserCircle className="w-5 h-5 mr-2" />
                    {t('recovery.debtorInfo')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.fullAddress')}</label>
                      <textarea
                        value={editContentieuxFormData.debiteurAdresse}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurAdresse: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 h-20"
                        placeholder={t('recovery.debtorAddressPh')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.phone')}</label>
                      <input
                        type="tel"
                        value={editContentieuxFormData.debiteurTel}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurTel: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                        placeholder="+242 06 XXX XX XX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editContentieuxFormData.debiteurEmail}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurEmail: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                        placeholder="email@debiteur.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.legalRepresentative')}</label>
                      <input
                        type="text"
                        value={editContentieuxFormData.debiteurRepresentant}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, debiteurRepresentant: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                        placeholder={t('recovery.representativeNamePh')}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet: Montants & Frais */}
              {editContentieuxActiveTab === 'montants' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-orange-900 mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    {t('recovery.amountsAndFees')}
                  </h3>

                  {/* Formulaire d'ajout de dépense */}
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-3 flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('recovery.addExpense')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('recovery.expenseTypeReq')}</label>
                        <select
                          value={newDepense.type}
                          onChange={(e) => setNewDepense({...newDepense, type: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                        >
                          {typesDepenses.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('recovery.dateReq')}</label>
                        <input
                          type="date"
                          value={newDepense.date}
                          onChange={(e) => setNewDepense({...newDepense, date: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('recovery.amountFcfaReq')}</label>
                        <input
                          type="number"
                          value={newDepense.montant || ''}
                          onChange={(e) => setNewDepense({...newDepense, montant: Number(e.target.value)})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Destinataire</label>
                        <input
                          type="text"
                          value={newDepense.destinataire}
                          onChange={(e) => setNewDepense({...newDepense, destinataire: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                          placeholder={t('recovery.payeePh')}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={addDepense}
                          className="w-full bg-orange-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-700 transition-colors flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t('recovery.add')}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{t('recovery.referenceDocNo')}</label>
                        <input
                          type="text"
                          value={newDepense.reference}
                          onChange={(e) => setNewDepense({...newDepense, reference: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                          placeholder={t('recovery.invoiceReceiptPh')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        <input
                          type="text"
                          value={newDepense.notes}
                          onChange={(e) => setNewDepense({...newDepense, notes: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                          placeholder="Observations..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Liste des dépenses */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('recovery.type')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('recovery.date')}</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('recovery.amount')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinataire</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('recovery.reference')}</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('recovery.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contentieuxDepenses.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              {t('recovery.noExpenseRecorded')}
                            </td>
                          </tr>
                        ) : (
                          contentieuxDepenses.map((dep) => (
                            <tr key={dep.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  dep.type === 'creance_principale' ? 'bg-blue-100 text-blue-800' :
                                  dep.type === 'interets_retard' ? 'bg-primary-100 text-primary-800' :
                                  dep.type === 'honoraires_avocat' ? 'bg-primary-100 text-primary-800' :
                                  dep.type === 'frais_huissier' ? 'bg-primary-100 text-primary-800' :
                                  dep.type === 'provision' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {typesDepenses.find(t => t.value === dep.type)?.label || dep.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(dep.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                {formatCurrency(dep.montant)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {dep.destinataire || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {dep.reference || '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => removeDepense(dep.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title={t('recovery.delete')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Récapitulatif des totaux */}
                  {contentieuxDepenses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Totaux par type */}
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-3">{t('recovery.summaryByType')}</h4>
                        <div className="space-y-2">
                          {typesDepenses.map(type => {
                            const total = getTotalByType(type.value);
                            if (total === 0) return null;
                            return (
                              <div key={type.value} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{type.label}:</span>
                                <span className="font-medium text-gray-800">{formatCurrency(total)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Total général */}
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-300">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm text-gray-600">{t('recovery.claimPrincipalInterest')}</span>
                          <span className="font-semibold text-orange-700">
                            {formatCurrency((getTotalByType('creance_principale') + getTotalByType('interets_retard')))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm text-gray-600">{t('recovery.procedureFeesColon')}</span>
                          <span className="font-semibold text-orange-700">
                            {formatCurrency((getTotalDepenses() - getTotalByType('creance_principale') - getTotalByType('interets_retard') - getTotalByType('provision')))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                          <span className="font-medium text-gray-700">MONTANT TOTAL:</span>
                          <span className="text-lg font-bold text-orange-600">
                            {formatCurrency(getTotalDepenses())}
                          </span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-orange-200">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{t('recovery.provisionRecorded')}</span>
                            <span className="font-medium text-yellow-700">
                              {formatCurrency(getTotalByType('provision'))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Onglet: Suivi & Contacts */}
              {editContentieuxActiveTab === 'suivi' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    {t('recovery.stepsHistoryTitle')}
                  </h3>

                  {/* Formulaire d'ajout d'étape */}
                  <div className="bg-gradient-to-br from-green-50 to-primary-50 p-5 rounded-xl border border-green-200 shadow-sm">
                    <h4 className="font-semibold text-green-800 mb-4 flex items-center text-base">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                        <Plus className="w-5 h-5 text-white" />
                      </div>
                      {t('recovery.newFollowUpStep')}
                    </h4>

                    {/* Section 1: Informations principales */}
                    <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {t('recovery.stepInformation')}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.actionTypeReq')}</label>
                          <select
                            value={newSuiviEtape.type}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, type: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                          >
                            {typesEtapesSuivi.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.dateReq')}</label>
                          <input
                            type="date"
                            value={newSuiviEtape.date}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, date: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.time')}</label>
                          <input
                            type="time"
                            value={newSuiviEtape.heure}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, heure: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.result')}</label>
                          <select
                            value={newSuiviEtape.resultat}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, resultat: e.target.value})}
                            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                              newSuiviEtape.resultat === 'reussi' ? 'bg-green-50 border-green-300 text-green-800' :
                              newSuiviEtape.resultat === 'echoue' ? 'bg-red-50 border-red-300 text-red-800' :
                              newSuiviEtape.resultat === 'reporte' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                              'bg-white border-gray-300'
                            }`}
                          >
                            {resultatsEtape.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Intervenants */}
                    <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {t('recovery.participants')}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.whoPerformedAction')}</label>
                          <input
                            type="text"
                            value={newSuiviEtape.intervenant}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, intervenant: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Ex: Jean DUPONT"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.functionRole')}</label>
                          <select
                            value={newSuiviEtape.roleIntervenant}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, roleIntervenant: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                          >
                            <option value="">{t('recovery.selectPlaceholder')}</option>
                            <option value="responsable_recouvrement">{t('recovery.collectionsManager')}</option>
                            <option value="agent_recouvrement">{t('recovery.collectionsAgent')}</option>
                            <option value="comptable">Comptable</option>
                            <option value="directeur_financier">{t('recovery.financeDirector')}</option>
                            <option value="commercial">Commercial</option>
                            <option value="avocat">{t('recovery.lawyer')}</option>
                            <option value="huissier">{t('recovery.judicialOfficer')}</option>
                            <option value="expert">{t('recovery.expertConsultant')}</option>
                            <option value="autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.contactedPerson')}</label>
                          <input
                            type="text"
                            value={newSuiviEtape.contact}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, contact: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Ex: M. KOUASSI (DG)"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Notes et suivi */}
                    <div className="bg-white p-4 rounded-lg border border-green-100 mb-4">
                      <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {t('recovery.reportAndFollowUp')}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('recovery.detailedNotes')}
                          </label>
                          <textarea
                            value={newSuiviEtape.notes}
                            onChange={(e) => setNewSuiviEtape({...newSuiviEtape, notes: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
                            rows={5}
                            placeholder={t('recovery.detailedNotesPh')}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <ArrowRight className="w-4 h-4 inline mr-1 text-orange-500" />
                              {t('recovery.nextActionToTake')}
                            </label>
                            <input
                              type="text"
                              value={newSuiviEtape.prochainRdv}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, prochainRdv: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder={t('recovery.nextActionPh')}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <FileText className="w-4 h-4 inline mr-1 text-blue-500" />
                              {t('recovery.attachedDocsRefs')}
                            </label>
                            <input
                              type="text"
                              value={newSuiviEtape.documentsJoints}
                              onChange={(e) => setNewSuiviEtape({...newSuiviEtape, documentsJoints: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder={t('recovery.attachedDocsPh')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bouton d'ajout */}
                    <button
                      onClick={addSuiviEtape}
                      className="w-full bg-gradient-to-r from-green-600 to-primary-600 text-white rounded-lg px-6 py-3 font-medium hover:from-green-700 hover:to-primary-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      {t('recovery.saveFollowUpStep')}
                    </button>
                  </div>

                  {/* Timeline des étapes */}
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-800 mb-4">
                      Chronologie ({suiviEtapes.length} étape{suiviEtapes.length > 1 ? 's' : ''})
                    </h4>

                    {suiviEtapes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <Clock className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p>{t('recovery.noFollowUpStep')}</p>
                        <p className="text-sm">{t('recovery.useFormToAddSteps')}</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Ligne verticale de timeline */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-green-200"></div>

                        <div className="space-y-4">
                          {suiviEtapes.map((etape, index) => (
                            <div key={etape.id} className="relative flex items-start">
                              {/* Point de timeline */}
                              <div className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                                etape.resultat === 'reussi' ? 'bg-green-500 border-green-600' :
                                etape.resultat === 'echoue' ? 'bg-red-500 border-red-600' :
                                etape.resultat === 'reporte' ? 'bg-yellow-500 border-yellow-600' :
                                etape.resultat === 'annule' ? 'bg-orange-500 border-orange-600' :
                                'bg-gray-300 border-gray-400'
                              }`}>
                                {etape.resultat === 'reussi' && <CheckCircle className="w-3 h-3 text-white m-0.5" />}
                              </div>

                              {/* Carte de l'étape */}
                              <div className="ml-12 flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        etape.type === 'appel_telephonique' ? 'bg-blue-100 text-blue-800' :
                                        etape.type === 'envoi_courrier' || etape.type === 'envoi_email' ? 'bg-primary-100 text-primary-800' :
                                        etape.type === 'reunion' ? 'bg-primary-100 text-primary-800' :
                                        etape.type === 'mise_demeure' ? 'bg-red-100 text-red-800' :
                                        etape.type === 'audience' ? 'bg-primary-100 text-primary-800' :
                                        etape.type === 'paiement_recu' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {typesEtapesSuivi.find(t => t.value === etape.type)?.label || etape.type}
                                      </span>
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        etape.resultat === 'reussi' ? 'bg-green-100 text-green-800' :
                                        etape.resultat === 'echoue' ? 'bg-red-100 text-red-800' :
                                        etape.resultat === 'reporte' ? 'bg-yellow-100 text-yellow-800' :
                                        etape.resultat === 'annule' ? 'bg-orange-100 text-orange-800' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {resultatsEtape.find(r => r.value === etape.resultat)?.label || 'En attente'}
                                      </span>
                                    </div>

                                    <div className="flex items-center text-sm text-gray-500 mb-2">
                                      <Calendar className="w-4 h-4 mr-1" />
                                      {new Date(etape.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                      {etape.heure && <span className="ml-2">à {etape.heure}</span>}
                                    </div>

                                    {(etape.intervenant || etape.contact) && (
                                      <div className="flex flex-wrap gap-3 text-sm mb-2">
                                        {etape.intervenant && (
                                          <div className="flex items-center text-gray-600">
                                            <Users className="w-4 h-4 mr-1 text-green-600" />
                                            <span className="font-medium">{etape.intervenant}</span>
                                            {etape.roleIntervenant && (
                                              <span className="text-gray-400 ml-1">({etape.roleIntervenant})</span>
                                            )}
                                          </div>
                                        )}
                                        {etape.contact && (
                                          <div className="flex items-center text-gray-600">
                                            <UserCircle className="w-4 h-4 mr-1 text-blue-600" />
                                            Contact: {etape.contact}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {etape.notes && (
                                      <div className="bg-gray-50 p-2 rounded text-sm text-gray-700 mb-2">
                                        {etape.notes}
                                      </div>
                                    )}

                                    {etape.prochainRdv && (
                                      <div className="text-sm text-orange-600 flex items-center">
                                        <ArrowRight className="w-4 h-4 mr-1" />
                                        Prochaine action: {etape.prochainRdv}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2 ml-4">
                                    <select
                                      value={etape.resultat}
                                      onChange={(e) => updateSuiviEtapeResultat(etape.id, e.target.value)}
                                      className="text-xs border border-gray-300 rounded px-2 py-1"
                                    >
                                      {resultatsEtape.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => removeSuiviEtape(etape.id)}
                                      className="text-red-500 hover:text-red-700 p-1"
                                      title={t('recovery.delete')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Résumé des étapes */}
                  {suiviEtapes.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                      <h4 className="font-medium text-gray-800 mb-3">{t('recovery.followUpSummary')}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-lg font-bold text-gray-700">{suiviEtapes.length}</div>
                          <div className="text-xs text-gray-500">{t('recovery.totalSteps')}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-lg font-bold text-green-600">
                            {suiviEtapes.filter(e => e.resultat === 'reussi').length}
                          </div>
                          <div className="text-xs text-gray-500">{t('recovery.successful')}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-lg font-bold text-red-600">
                            {suiviEtapes.filter(e => e.resultat === 'echoue').length}
                          </div>
                          <div className="text-xs text-gray-500">{t('recovery.failed')}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-lg font-bold text-yellow-600">
                            {suiviEtapes.filter(e => e.resultat === 'reporte').length}
                          </div>
                          <div className="text-xs text-gray-500">{t('recovery.postponed')}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-lg font-bold text-gray-500">
                            {suiviEtapes.filter(e => e.resultat === 'en_attente').length}
                          </div>
                          <div className="text-xs text-gray-500">{t('recovery.pending')}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Onglet: Analyse & Notes */}
              {editContentieuxActiveTab === 'notes' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    {t('recovery.analysisAndNotes')}
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.litigationTransferReason')}</label>
                    <textarea
                      value={editContentieuxFormData.motifTransfert}
                      onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, motifTransfert: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-gray-500"
                      placeholder={t('recovery.transferReasonPh')}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.expectedOutcome')}</label>
                      <textarea
                        value={editContentieuxFormData.resultatAttendu}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, resultatAttendu: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-gray-500"
                        placeholder={t('recovery.procedureObjectivePh')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.identifiedRisks')}</label>
                      <textarea
                        value={editContentieuxFormData.risques}
                        onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, risques: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-gray-500"
                        placeholder={t('recovery.potentialRisksPh')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.additionalNotes')}</label>
                    <textarea
                      value={editContentieuxFormData.notes}
                      onChange={(e) => setEditContentieuxFormData({...editContentieuxFormData, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 focus:ring-2 focus:ring-gray-500"
                      placeholder={t('recovery.additionalNotesPh')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Dernière modification: {new Date().toLocaleDateString()}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditContentieuxModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t('recovery.cancel')}
                </button>
                <button
                  onClick={handleSaveContentieux}
                  className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('recovery.saveChanges')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestion Workflow Contentieux */}
      {showWorkflowModal && selectedDossierWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-600">
              <div className="text-white">
                <h2 className="text-lg font-semibold flex items-center">
                  <Activity className="w-6 h-6 mr-2" />
                  {t('recovery.litigationWorkflowTitle')}
                </h2>
                <p className="text-primary-100 mt-1">
                  {selectedDossierWorkflow.numeroRef} - {selectedDossierWorkflow.client}
                </p>
              </div>
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="text-white hover:text-primary-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Barre de progression */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{t('recovery.caseProgress')}</span>
                  <span className="text-sm font-medium text-primary-600">
                    {workflowData[selectedDossierWorkflow.id]?.etapes.filter(e => e.statut === 'completed').length || 0} / {workflowData[selectedDossierWorkflow.id]?.etapes.length || 6} étapes
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary-600 to-primary-600 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${((workflowData[selectedDossierWorkflow.id]?.etapes.filter(e => e.statut === 'completed').length || 0) / (workflowData[selectedDossierWorkflow.id]?.etapes.length || 6)) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Liste des étapes */}
              <div className="space-y-4">
                {(workflowData[selectedDossierWorkflow.id]?.etapes || defaultWorkflowEtapes.map(e => ({ ...e, statut: 'pending', commentaires: [] }))).map((etape, index) => (
                  <div
                    key={etape.id}
                    className={`border rounded-lg p-4 ${
                      etape.statut === 'completed' ? 'border-green-300 bg-green-50' :
                      etape.statut === 'in_progress' ? 'border-blue-300 bg-blue-50' :
                      etape.statut === 'skipped' ? 'border-gray-300 bg-gray-50 opacity-60' :
                      'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* Numéro de l'étape */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          etape.statut === 'completed' ? 'bg-green-500' :
                          etape.statut === 'in_progress' ? 'bg-blue-500' :
                          etape.statut === 'skipped' ? 'bg-gray-400' :
                          'bg-gray-300'
                        }`}>
                          {etape.statut === 'completed' ? <CheckCircle className="w-5 h-5" /> : index + 1}
                        </div>

                        {/* Détails de l'étape */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900">{etape.titre}</h4>
                            {etape.custom && (
                              <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">{t('recovery.custom')}</span>
                            )}
                            {etape.obligatoire && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Obligatoire</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{etape.description}</p>
                          {etape.delaiJours > 0 && (
                            <p className="text-xs text-gray-500 mt-1">Délai estimé: {etape.delaiJours} jours</p>
                          )}
                          {etape.dateDebut && (
                            <p className="text-xs text-blue-600 mt-1">Démarré le: {etape.dateDebut}</p>
                          )}
                          {etape.dateFin && (
                            <p className="text-xs text-green-600 mt-1">Terminé le: {etape.dateFin}</p>
                          )}

                          {/* Commentaires de l'étape */}
                          {etape.commentaires && etape.commentaires.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-xs font-medium text-gray-700">Commentaires ({etape.commentaires.length}):</p>
                              {etape.commentaires.map(comment => (
                                <div key={comment.id} className="bg-white border border-gray-200 rounded p-2 text-sm">
                                  <p className="text-gray-700">{comment.texte}</p>
                                  <p className="text-xs text-gray-500 mt-1">{comment.auteur} - {comment.date}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2">
                        {/* Boutons de statut */}
                        <div className="flex space-x-1">
                          {etape.statut !== 'completed' && (
                            <button
                              onClick={() => updateEtapeStatus(selectedDossierWorkflow.id, etape.id, 'in_progress')}
                              className={`px-2 py-1 text-xs rounded ${etape.statut === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                              title={t('recovery.inProgress')}
                            >
                              <Clock className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => updateEtapeStatus(selectedDossierWorkflow.id, etape.id, 'completed')}
                            className={`px-2 py-1 text-xs rounded ${etape.statut === 'completed' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                            title={t('recovery.completed')}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </button>
                          {!etape.obligatoire && (
                            <button
                              onClick={() => updateEtapeStatus(selectedDossierWorkflow.id, etape.id, 'skipped')}
                              className={`px-2 py-1 text-xs rounded ${etape.statut === 'skipped' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                              title="Passer"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Bouton commentaire */}
                        <button
                          onClick={() => {
                            setSelectedEtape(etape);
                            setShowCommentModal(true);
                          }}
                          className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200 flex items-center justify-center space-x-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Commenter</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bouton ajouter étape */}
              <button
                onClick={() => setShowAddEtapeModal(true)}
                className="mt-4 w-full py-3 border-2 border-dashed border-primary-300 rounded-lg text-primary-600 hover:bg-primary-50 flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>{t('recovery.addCustomStep')}</span>
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowWorkflowModal(false)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('recovery.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter Étape Personnalisée */}
      {showAddEtapeModal && selectedDossierWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('recovery.addCustomStep')}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.stepTitle')}</label>
                <input
                  type="text"
                  value={newEtape.titre}
                  onChange={(e) => setNewEtape({ ...newEtape, titre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  placeholder={t('recovery.stepTitlePh')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.description')}</label>
                <textarea
                  value={newEtape.description}
                  onChange={(e) => setNewEtape({ ...newEtape, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 focus:ring-2 focus:ring-primary-500"
                  placeholder={t('recovery.stepDescriptionPh')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('recovery.plannedDateOptional')}</label>
                <input
                  type="date"
                  value={newEtape.datePrevu}
                  onChange={(e) => setNewEtape({ ...newEtape, datePrevu: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddEtapeModal(false);
                  setNewEtape({ titre: '', description: '', datePrevu: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => addCustomEtape(selectedDossierWorkflow.id)}
                disabled={!newEtape.titre}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {t('recovery.addStep')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter Commentaire */}
      {showCommentModal && selectedEtape && selectedDossierWorkflow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('recovery.addComment')}</h3>
              <p className="text-sm text-gray-600 mt-1">Étape: {selectedEtape.titre}</p>
            </div>
            <div className="p-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 focus:ring-2 focus:ring-primary-500"
                placeholder={t('recovery.addCommentPh')}
              />
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                  setSelectedEtape(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={() => addCommentToEtape(selectedDossierWorkflow.id, selectedEtape.id, newComment)}
                disabled={!newComment}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {t('recovery.submitComment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Dossier d'Exécution */}
      {showExecutionDetailModal && selectedExecutionDossier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-primary)]">
                  Détail Exécution - {selectedExecutionDossier.reference}
                </h2>
                <p className="text-gray-600 mt-1">Client: {selectedExecutionDossier.client}</p>
              </div>
              <button
                onClick={() => setShowExecutionDetailModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.generalInfo')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.referenceColon')}</span>
                      <span className="font-medium">{selectedExecutionDossier.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.enforcementTypeColon')}</span>
                      <span className="font-medium">{selectedExecutionDossier.typeExecution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.amountToCollectColon')}</span>
                      <span className="font-medium text-[var(--color-primary)]">{formatCurrency(selectedExecutionDossier.montant)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Statut:</span>
                      <span className={`font-medium ${
                        selectedExecutionDossier.statut === 'Exécuté' ? 'text-green-600' :
                        selectedExecutionDossier.statut === 'En cours' ? 'text-yellow-600' :
                        'text-orange-600'
                      }`}>
                        {selectedExecutionDossier.statut}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.datesAndDeadlines')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.startDateColon')}</span>
                      <span className="font-medium">{new Date(selectedExecutionDossier.dateDebut).toLocaleDateString()}</span>
                    </div>
                    {selectedExecutionDossier.dateFin && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('recovery.endDateColon')}</span>
                        <span className="font-medium">{new Date(selectedExecutionDossier.dateFin).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedExecutionDossier.datePrevisionnelle && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('recovery.expectedDateColon')}</span>
                        <span className="font-medium">{new Date(selectedExecutionDossier.datePrevisionnelle).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Huissier:</span>
                      <span className="font-medium">{selectedExecutionDossier.huissier}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Détails spécifiques selon le type d'exécution */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-[var(--color-primary)]">{t('recovery.enforcementDetails')}</h3>
                </div>
                <div className="p-4">
                  {selectedExecutionDossier.typeExecution === 'Saisie-attribution' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">{t('recovery.seizedAccounts')}</h4>
                        <div className="space-y-2">
                          {selectedExecutionDossier.comptesSaisis?.map((compte: string, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{compte}</span>
                              <span className="text-xs text-green-600">Actif</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{t('recovery.seizedAmountColon')}</span>
                          <span className="font-semibold text-green-600">{formatCurrency(selectedExecutionDossier.montantSaisi)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedExecutionDossier.typeExecution === 'Saisie-vente' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">{t('recovery.seizedAssets')}</h4>
                        <div className="space-y-2">
                          {selectedExecutionDossier.biensSaisis?.map((bien: string, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{bien}</span>
                              <span className="text-xs text-blue-600">{t('recovery.underValuation')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{t('recovery.estimatedValueColon')}</span>
                          <span className="font-semibold text-blue-600">{formatCurrency(selectedExecutionDossier.montantEstime)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedExecutionDossier.typeExecution === 'Saisie sur salaire' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Employeur:</span>
                          <span className="font-medium">{selectedExecutionDossier.employeur}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">{t('recovery.monthlySeizureColon')}</span>
                          <span className="font-medium">{formatCurrency(selectedExecutionDossier.montantMensuel)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">{t('recovery.recoveredAmountColon')}</span>
                          <span className="font-semibold text-green-600">{formatCurrency(selectedExecutionDossier.montantRecupere)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{t('recovery.bailiffFeesColon')}</span>
                      <span className="font-medium text-red-600">{formatCurrency(selectedExecutionDossier.fraisHuissier)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowExecutionDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.close')}
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('recovery.editEnforcement')}
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  {t('recovery.generateReport')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  function renderContentieuxDetailPage() {
    if (!selectedContentieuxDetail) return null;
    return (
      <div className="space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setShowContentieuxDetailPage(false);
                setSelectedContentieuxDetail(null);
                setActiveContentieuxTab('general');
              }}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('recovery.backToLitigationCases')}</span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Dossier Contentieux {selectedContentieuxDetail.numeroRef}
              </h1>
              <p className="text-gray-600">{selectedContentieuxDetail.client}</p>
            </div>
          </div>

          {/* Statut et actions rapides */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-700">{t('recovery.status')}</div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                selectedContentieuxDetail.statutJuridique === 'execution' ? 'bg-primary-100 text-primary-800' :
                selectedContentieuxDetail.statutJuridique === 'jugement' ? 'bg-green-100 text-green-800' :
                selectedContentieuxDetail.statutJuridique === 'assignation' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {selectedContentieuxDetail.statutJuridique?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-700">{t('recovery.totalAmount')}</div>
              <div className="text-lg font-bold text-red-600">
                {formatCurrency(selectedContentieuxDetail.montantTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {contentieuxDetailTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveContentieuxTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                      ${activeContentieuxTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
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

          {/* Contenu des onglets */}
          <div className="p-6">
            {renderContentieuxTabContent()}
          </div>
        </div>
      </div>
    );
  }

  function renderContentieuxTabContent() {
    switch (activeContentieuxTab) {
      case 'general':
        return renderGeneralTab();
      case 'procedure':
        return renderProcedureTab();
      case 'chronologie':
        return renderChronologieTab();
      case 'documents':
        return renderDocumentsTab();
      case 'frais':
        return renderFraisTab();
      case 'correspondance':
        return renderCorrespondanceTab();
      case 'execution':
        return renderExecutionTab();
      case 'resultats':
        return renderResultatsTab();
      default:
        return renderGeneralTab();
    }
  }

  function renderGeneralTab() {
    if (!selectedContentieuxDetail) return null;
    return (
      <div className="space-y-6">
        {/* Informations générales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.litigationInfo')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('recovery.referenceColon')}</span>
                <span className="font-medium">{selectedContentieuxDetail.numeroRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('recovery.amicableOriginColon')}</span>
                <span className="font-medium text-blue-600">{selectedContentieuxDetail.origineAmiable}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('recovery.transferDateColon')}</span>
                <span className="font-medium">{selectedContentieuxDetail.dateTransfert}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('recovery.daysRemainingColon')}</span>
                <span className={`font-medium ${selectedContentieuxDetail.joursRestants <= 5 ? 'text-red-600' : 'text-orange-600'}`}>
                  {selectedContentieuxDetail.joursRestants} jours
                </span>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.amounts')}</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Principal:</span>
                <span className="font-medium text-[var(--color-primary)]">{formatCurrency(selectedContentieuxDetail.montantPrincipal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('recovery.lateInterestColon')}</span>
                <span className="font-medium text-orange-600">{formatCurrency(selectedContentieuxDetail.interetsRetard ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('recovery.procedureFeesColon')}</span>
                <span className="font-medium text-red-600">{formatCurrency(selectedContentieuxDetail.fraisProcedure ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600 font-semibold">{t('recovery.totalAmountColon')}</span>
                <span className="font-bold text-[var(--color-primary)]">{formatCurrency(selectedContentieuxDetail.montantTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Motif du transfert */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.litigationTransferReasonTitle')}</h3>
          <p className="text-gray-700 leading-relaxed">{selectedContentieuxDetail.motifTransfert}</p>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveContentieuxTab('procedure')}
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Scale className="w-6 h-6 text-blue-600 mb-2" />
            <div className="font-medium text-blue-900">{t('recovery.manageProcedure')}</div>
            <div className="text-sm text-blue-600">Assignation, audiences, jugement</div>
          </button>
          <button
            onClick={() => setActiveContentieuxTab('documents')}
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Archive className="w-6 h-6 text-green-600 mb-2" />
            <div className="font-medium text-green-900">Documents</div>
            <div className="text-sm text-green-600">{t('recovery.docsActsCorrespondence')}</div>
          </button>
          <button
            onClick={() => setActiveContentieuxTab('execution')}
            className="p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <Hammer className="w-6 h-6 text-primary-600 mb-2" />
            <div className="font-medium text-primary-900">{t('recovery.enforcement')}</div>
            <div className="text-sm text-primary-600">{t('recovery.seizuresEnforcement')}</div>
          </button>
        </div>
      </div>
    );
  }

  function renderProcedureTab() {
    if (!selectedContentieuxDetail) return null;
    // Étapes de procédure : aucune source réelle (recovery_cases vide) → état vide.
    const etapesProcedure: any[] = [];
    const _etapesProcedureSample = [
      {
        id: 1,
        titre: 'Mise en Demeure',
        statut: 'complete',
        date: '2024-01-10',
        description: 'Mise en demeure préalable envoyée au débiteur',
        documents: ['Mise en demeure', 'AR postal'],
        prochaine: false
      },
      {
        id: 2,
        titre: 'Assignation',
        statut: selectedContentieuxDetail.statutJuridique === 'assignation' ? 'current' :
                selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? 'complete' : 'pending',
        date: selectedContentieuxDetail.statutJuridique !== 'mise_demeure' ? '2024-01-20' : null,
        description: 'Assignation du débiteur devant le tribunal compétent',
        documents: ['Acte d\'assignation', 'Exploit d\'huissier'],
        prochaine: selectedContentieuxDetail.statutJuridique === 'mise_demeure'
      },
      {
        id: 3,
        titre: 'Audience',
        statut: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? 'complete' : 'pending',
        date: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? '2024-02-15' : selectedContentieuxDetail.prochaineEcheance,
        description: 'Comparution devant le tribunal',
        documents: ['Dossier de plaidoirie', 'Conclusions'],
        prochaine: selectedContentieuxDetail.statutJuridique === 'assignation'
      },
      {
        id: 4,
        titre: 'Jugement',
        statut: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? 'complete' : 'pending',
        date: selectedContentieuxDetail.statutJuridique === 'jugement' || selectedContentieuxDetail.statutJuridique === 'execution' ? '2024-02-20' : null,
        description: 'Prononcé du jugement par le tribunal',
        documents: ['Jugement', 'Certificat de non-appel'],
        prochaine: false
      },
      {
        id: 5,
        titre: 'Exécution',
        statut: selectedContentieuxDetail.statutJuridique === 'execution' ? 'current' : 'pending',
        date: selectedContentieuxDetail.statutJuridique === 'execution' ? '2024-03-01' : null,
        description: 'Mise en œuvre des mesures d\'exécution forcée',
        documents: ['Commandement', 'PV de saisie'],
        prochaine: selectedContentieuxDetail.statutJuridique === 'jugement'
      }
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('recovery.litigationProcedureSteps')}</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Avocat:</span>
            <span className="font-medium">{selectedContentieuxDetail.avocat}</span>
          </div>
        </div>

        {/* Timeline des étapes */}
        <div className="space-y-4">
          {etapesProcedure.map((etape, index) => (
            <div key={etape.id} className="relative">
              {index !== etapesProcedure.length - 1 && (
                <div className={`absolute left-4 top-8 h-16 w-0.5 ${
                  etape.statut === 'complete' ? 'bg-green-400' : 'bg-gray-300'
                }`} />
              )}

              <div className={`flex items-start space-x-4 p-4 rounded-lg border-2 ${
                etape.statut === 'current' ? 'border-blue-200 bg-blue-50' :
                etape.statut === 'complete' ? 'border-green-200 bg-green-50' :
                etape.prochaine ? 'border-orange-200 bg-orange-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  etape.statut === 'current' ? 'bg-blue-500 text-white' :
                  etape.statut === 'complete' ? 'bg-green-500 text-white' :
                  etape.prochaine ? 'bg-orange-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {etape.statut === 'complete' ? <CheckCircle className="w-5 h-5" /> : etape.id}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${
                      etape.statut === 'current' ? 'text-blue-900' :
                      etape.statut === 'complete' ? 'text-green-900' :
                      etape.prochaine ? 'text-orange-900' :
                      'text-gray-600'
                    }`}>
                      {etape.titre}
                      {etape.prochaine && <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">{t('recovery.nextStepCaps')}</span>}
                      {etape.statut === 'current' && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">{t('recovery.inProgressCaps')}</span>}
                    </h4>
                    {etape.date && (
                      <span className="text-sm text-gray-700">{new Date(etape.date).toLocaleDateString()}</span>
                    )}
                  </div>

                  <p className="text-gray-700 mb-3">{etape.description}</p>

                  {etape.documents.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {etape.documents.map((doc: string, idx: number) => (
                        <span key={idx} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {doc}
                        </span>
                      ))}
                    </div>
                  )}

                  {etape.prochaine && (
                    <div className="mt-3 flex space-x-2">
                      <button className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
                        Programmer {etape.titre}
                      </button>
                      <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                        {t('recovery.viewTemplates')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderChronologieTab() {
    if (!selectedContentieuxDetail) return null;
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('recovery.fullCaseTimeline')}</h3>

        {/* Timeline détaillée */}
        <div className="space-y-4">
          {[
            {
              date: '2024-01-15',
              type: 'Transfert',
              titre: 'Transfert en contentieux',
              description: `Dossier ${selectedContentieuxDetail.origineAmiable} transféré en contentieux après échec du recouvrement amiable`,
              utilisateur: 'Système',
              statut: 'info'
            },
            {
              date: '2024-01-16',
              type: 'Assignation',
              titre: 'Assignation avocat',
              description: `Dossier assigné à ${selectedContentieuxDetail.avocat}`,
              utilisateur: '',
              statut: 'success'
            },
            {
              date: '2024-01-20',
              type: 'Procédure',
              titre: 'Préparation assignation',
              description: 'Préparation des pièces pour assignation devant le tribunal',
              utilisateur: selectedContentieuxDetail.avocat,
              statut: 'warning'
            },
            {
              date: selectedContentieuxDetail.prochaineEcheance,
              type: 'Échéance',
              titre: 'Prochaine action prévue',
              description: 'Action programmée selon le planning contentieux',
              utilisateur: selectedContentieuxDetail.avocat,
              statut: 'pending'
            }
          ].map((event, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className={`w-3 h-3 rounded-full mt-2 ${
                event.statut === 'success' ? 'bg-green-500' :
                event.statut === 'warning' ? 'bg-orange-500' :
                event.statut === 'pending' ? 'bg-blue-500' :
                'bg-gray-400'
              }`} />

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">{event.titre}</h4>
                  <div className="text-right">
                    <div className="text-sm text-gray-700">{new Date(event.date ?? '').toLocaleDateString()}</div>
                    <div className="text-xs text-gray-700">{event.utilisateur}</div>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{event.description}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                  event.statut === 'success' ? 'bg-green-100 text-green-800' :
                  event.statut === 'warning' ? 'bg-orange-100 text-orange-800' :
                  event.statut === 'pending' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {event.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Placeholder functions pour les autres onglets
  function renderDocumentsTab() {

    // Documents contentieux : aucune source réelle (recovery_cases vide) → état vide.
    const documentsContentieux: any[] = [];
    const _documentsContentieuxSample = [
      {
        id: 1,
        type: 'procedure',
        nom: 'Acte d\'assignation',
        dateCreation: '2024-01-15',
        statut: 'final',
        taille: '2.3 MB',
        auteur: 'Me —',
        description: 'Assignation devant le Tribunal de Commerce'
      },
      {
        id: 2,
        type: 'procedure',
        nom: 'Mise en demeure préalable',
        dateCreation: '2024-01-10',
        statut: 'final',
        taille: '1.1 MB',
        auteur: 'SCP Avocats DELTA',
        description: 'Mise en demeure avec délai de 8 jours'
      },
      {
        id: 3,
        type: 'justificatif',
        nom: 'Facture impayée',
        dateCreation: '2023-11-15',
        statut: 'final',
        taille: '458 KB',
        auteur: 'Atlas FnA Auto',
        description: 'Facture N°FAC-2023-1156'
      },
      {
        id: 4,
        type: 'justificatif',
        nom: 'Bon de livraison',
        dateCreation: '2023-11-10',
        statut: 'final',
        taille: '312 KB',
        auteur: 'Service Logistique',
        description: 'Preuve de livraison avec signature'
      },
      {
        id: 5,
        type: 'procedure',
        nom: 'Conclusions principales',
        dateCreation: '2024-02-01',
        statut: 'brouillon',
        taille: '4.7 MB',
        auteur: 'Me —',
        description: 'Conclusions en cours de finalisation'
      },
      {
        id: 6,
        type: 'correspondance',
        nom: 'Échange email avocat',
        dateCreation: '2024-01-28',
        statut: 'final',
        taille: '145 KB',
        auteur: 'Me —',
        description: 'Stratégie de défense et points de droit'
      },
      {
        id: 7,
        type: 'expertise',
        nom: 'Rapport d\'expertise comptable',
        dateCreation: '2024-01-25',
        statut: 'final',
        taille: '8.2 MB',
        auteur: 'Cabinet EXPERTISE+',
        description: 'Évaluation des préjudices subis'
      },
      {
        id: 8,
        type: 'huissier',
        nom: 'Procès-verbal de signification',
        dateCreation: '2024-01-20',
        statut: 'final',
        taille: '1.8 MB',
        auteur: 'SCP Huissiers ALPHA',
        description: 'Signification de l\'assignation'
      }
    ];

    const filteredDocuments = documentFilter === 'all'
      ? documentsContentieux
      : documentsContentieux.filter(d => d.type === documentFilter);

    return (
      <div className="space-y-6">
        {/* En-tête avec actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('recovery.legalDocuments')}</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('recovery.addDocument')}
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              {t('recovery.downloadAll')}
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">{t('recovery.filterByTypeColon')}</label>
          <select
            value={documentFilter}
            onChange={(e) => setDocumentFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tous les documents ({documentsContentieux.length})</option>
            <option value="procedure">Actes de procédure ({documentsContentieux.filter(d => d.type === 'procedure').length})</option>
            <option value="justificatif">Pièces justificatives ({documentsContentieux.filter(d => d.type === 'justificatif').length})</option>
            <option value="correspondance">Correspondance ({documentsContentieux.filter(d => d.type === 'correspondance').length})</option>
            <option value="expertise">Expertises ({documentsContentieux.filter(d => d.type === 'expertise').length})</option>
            <option value="huissier">Actes d'huissier ({documentsContentieux.filter(d => d.type === 'huissier').length})</option>
          </select>
        </div>

        {/* Liste des documents */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.document')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Auteur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common.date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.size')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => {
                  const typeIcons = {
                    procedure: <Scale className="w-4 h-4 text-red-500" />,
                    justificatif: <FileText className="w-4 h-4 text-blue-500" />,
                    correspondance: <Mail className="w-4 h-4 text-green-500" />,
                    expertise: <Calculator className="w-4 h-4 text-primary-500" />,
                    huissier: <Gavel className="w-4 h-4 text-orange-500" />
                  };

                  const typeLabels = {
                    procedure: 'Procédure',
                    justificatif: 'Justificatif',
                    correspondance: 'Correspondance',
                    expertise: 'Expertise',
                    huissier: 'Huissier'
                  };

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {typeIcons[doc.type as keyof typeof typeIcons]}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{doc.nom}</div>
                            <div className="text-sm text-gray-700">{doc.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {typeLabels[doc.type as keyof typeof typeLabels]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{doc.auteur}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{doc.dateCreation}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.statut === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {doc.statut === 'final' ? 'Finalisé' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{doc.taille}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800" aria-label={t('recovery.viewDetailsAria')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800" aria-label={t('recovery.download')}>
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-800" aria-label={t('recovery.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistiques documents */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">{t('recovery.proceduralActs')}</p>
                <p className="text-lg font-bold text-blue-900">{documentsContentieux.filter(d => d.type === 'procedure').length}</p>
              </div>
              <Scale className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">{t('recovery.supportingDocuments')}</p>
                <p className="text-lg font-bold text-green-900">{documentsContentieux.filter(d => d.type === 'justificatif').length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">{t('recovery.bailiffActs')}</p>
                <p className="text-lg font-bold text-orange-900">{documentsContentieux.filter(d => d.type === 'huissier').length}</p>
              </div>
              <Gavel className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600">Expertises</p>
                <p className="text-lg font-bold text-primary-900">{documentsContentieux.filter(d => d.type === 'expertise').length}</p>
              </div>
              <Calculator className="w-8 h-8 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Modal d'upload */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.addDocumentTitle')}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.documentType')}</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>{t('recovery.proceduralAct')}</option>
                    <option>{t('recovery.supportingDocument')}</option>
                    <option>Correspondance</option>
                    <option>Expertise</option>
                    <option>{t('recovery.bailiffAct')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.documentName')}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: Conclusions subsidiaires"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.description')}</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                    placeholder={t('recovery.documentDescriptionPh')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fichier</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto text-gray-700 mb-2" />
                    <p className="text-sm text-gray-600">{t('recovery.dragDropFileOr')}<span className="text-blue-600 cursor-pointer">parcourez</span></p>
                    <p className="text-xs text-gray-700 mt-1">{t('recovery.fileFormatsUpTo10Mb')}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.cancel')}
                </button>
                <button
                  onClick={() => {
                    // Traitement de l'upload
                    setShowUploadModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('recovery.submitDocument')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderFraisTabDetailed() {

    // Frais de contentieux : aucune source réelle (table recovery_cases vide, pas de
    // registre de frais en base) → liste vide plutôt que des frais fabriqués.
    const fraisContentieux: Array<{
      id: number; type: string; description: string; montant: number;
      dateEngagement: string; dateFacturation: string | null; statut: string;
      fournisseur: string; imputable: boolean;
    }> = [];

    const totalFrais = fraisContentieux.reduce((sum, f) => sum + f.montant, 0);
    const fraisPayes = fraisContentieux.filter(f => f.statut === 'paye').reduce((sum, f) => sum + f.montant, 0);
    const fraisFactures = fraisContentieux.filter(f => f.statut === 'facture').reduce((sum, f) => sum + f.montant, 0);
    const fraisPrevus = fraisContentieux.filter(f => f.statut === 'prevu').reduce((sum, f) => sum + f.montant, 0);
    const fraisImputables = fraisContentieux.filter(f => f.imputable).reduce((sum, f) => sum + f.montant, 0);

    const filteredFrais = fraisFilter === 'all'
      ? fraisContentieux
      : fraisContentieux.filter(f => f.type === fraisFilter);

    return (
      <div className="space-y-6">
        {/* Tableau de bord financier */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">{t('recovery.totalFees')}</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency((totalFrais))}</p>
              </div>
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">{t('recovery.paidPlural')}</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency((fraisPayes))}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">{t('recovery.toPay')}</p>
                <p className="text-lg font-bold text-orange-900">{formatCurrency((fraisFactures))}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600">Imputables</p>
                <p className="text-lg font-bold text-primary-900">{formatCurrency((fraisImputables))}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Actions et filtres */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('recovery.feesAndCostsDetail')}</h3>
            <select
              value={fraisFilter}
              onChange={(e) => setFraisFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">{t('recovery.allFees')}</option>
              <option value="avocat">Avocats</option>
              <option value="huissier">Huissiers</option>
              <option value="tribunal">Tribunal</option>
              <option value="expertise">Expertises</option>
              <option value="divers">Divers</option>
            </select>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddFraisModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('recovery.addFee')}
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4 mr-2" />
              {t('recovery.detailedExport')}
            </button>
          </div>
        </div>

        {/* Table des frais */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.description')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Fournisseur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.amount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Imputable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFrais.map((frais) => {
                  const typeIcons = {
                    avocat: <Briefcase className="w-4 h-4 text-blue-500" />,
                    huissier: <Gavel className="w-4 h-4 text-orange-500" />,
                    tribunal: <Scale className="w-4 h-4 text-red-500" />,
                    expertise: <Calculator className="w-4 h-4 text-primary-500" />,
                    divers: <FileText className="w-4 h-4 text-gray-700" />
                  };

                  const statutColors = {
                    paye: 'bg-green-100 text-green-800',
                    facture: 'bg-orange-100 text-orange-800',
                    prevu: 'bg-gray-100 text-gray-800'
                  };

                  const statutLabels = {
                    paye: 'Payé',
                    facture: 'Facturé',
                    prevu: 'Prévu'
                  };

                  return (
                    <tr key={frais.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {typeIcons[frais.type as keyof typeof typeIcons]}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{frais.description}</div>
                            <div className="text-sm text-gray-700">Engagé le {frais.dateEngagement}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {frais.type.charAt(0).toUpperCase() + frais.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{frais.fournisseur}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{formatCurrency(frais.montant)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[frais.statut as keyof typeof statutColors]}`}>
                          {statutLabels[frais.statut as keyof typeof statutLabels]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {frais.imputable ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('recovery.yes')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {t('recovery.no')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800" aria-label={t('recovery.viewDetailsAria')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800">
                            <Edit className="w-4 h-4" />
                          </button>
                          {frais.statut === 'facture' && (
                            <button className="text-primary-600 hover:text-primary-800">
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal ajouter frais */}
        {showAddFraisModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.addFeeTitle')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.feeType')}</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>{t('recovery.lawyerFees')}</option>
                    <option>{t('recovery.bailiffFees')}</option>
                    <option>{t('recovery.courtFees')}</option>
                    <option>Expertise</option>
                    <option>Divers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.amountFcfa')}</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.description')}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: Honoraires conclusions principales"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder={t('recovery.supplierNamePh')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.commitmentDate')}</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.status')}</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="prevu">{t('recovery.planned')}</option>
                    <option value="facture">{t('recovery.invoiced')}</option>
                    <option value="paye">{t('recovery.paid')}</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">{t('recovery.feeChargeableToDebtor')}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddFraisModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.cancel')}
                </button>
                <button
                  onClick={() => {
                    // Traitement de l'ajout
                    setShowAddFraisModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('recovery.submitFee')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderFraisTab() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('recovery.litigationFeesTitle')}</h3>
        <div className="bg-red-50 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 mb-3">{t('recovery.costsSummary')}</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{t('recovery.lawyerFeesColon')}</span>
              <span className="font-medium">250,000 FCFA</span>
            </div>
            <div className="flex justify-between">
              <span>{t('recovery.bailiffFeesColon')}</span>
              <span className="font-medium">75,000 FCFA</span>
            </div>
            <div className="flex justify-between">
              <span>{t('recovery.courtFeesColon')}</span>
              <span className="font-medium">50,000 FCFA</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold">
              <span>{t('recovery.totalFeesColon')}</span>
              <span>375,000 FCFA</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderCorrespondanceTab() {

    // Correspondances contentieux : aucune source réelle (recovery_cases vide) → état vide.
    const correspondances: any[] = [];
    const _correspondancesSample = [
      {
        id: 1,
        type: 'avocat',
        correspondant: 'Me —',
        sujet: 'Point sur l\'avancement de la procédure',
        dateEnvoi: '2024-02-15 14:30',
        statut: 'lu',
        priorite: 'normale',
        message: 'Nous avons reçu les conclusions adverses. Je prépare notre réponse...',
        pieces: ['conclusions_adverses.pdf'],
        direction: 'recu'
      },
      {
        id: 2,
        type: 'huissier',
        correspondant: 'SCP Huissiers ALPHA',
        sujet: 'Signification effectuée',
        dateEnvoi: '2024-02-10 09:15',
        statut: 'lu',
        priorite: 'haute',
        message: 'Signification réalisée avec succès. PV ci-joint.',
        pieces: ['pv_signification.pdf'],
        direction: 'recu'
      },
      {
        id: 3,
        type: 'debiteur',
        correspondant: 'SARL TECH SOLUTIONS',
        sujet: 'Demande d\'échelonnement',
        dateEnvoi: '2024-02-08 16:45',
        statut: 'repondu',
        priorite: 'haute',
        message: 'Suite à votre mise en demeure, nous sollicitons un échelonnement...',
        pieces: [],
        direction: 'recu'
      },
      {
        id: 4,
        type: 'avocat',
        correspondant: 'Me —',
        sujet: 'Stratégie procédurale',
        dateEnvoi: '2024-02-05 11:20',
        statut: 'envoye',
        priorite: 'normale',
        message: 'Voici notre analyse de la situation et les prochaines étapes...',
        pieces: ['note_strategique.pdf'],
        direction: 'envoye'
      },
      {
        id: 5,
        type: 'tribunal',
        correspondant: 'Tribunal de Commerce',
        sujet: 'Fixation audience',
        dateEnvoi: '2024-01-30 10:00',
        statut: 'lu',
        priorite: 'haute',
        message: 'Audience fixée au 15 mars 2024 à 14h30. Salle 3.',
        pieces: ['convocation_audience.pdf'],
        direction: 'recu'
      }
    ];

    const filteredCorrespondances = correspondanceFilter === 'all'
      ? correspondances
      : correspondances.filter(c => c.type === correspondanceFilter);

    const correspondantsUniques = [...new Set(correspondances.map(c => c.correspondant))];

    return (
      <div className="space-y-6">
        {/* Header avec actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('recovery.correspondenceTitle')}</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              {t('recovery.newMessage')}
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Archive className="w-4 h-4 mr-2" />
              {t('recovery.archiveSelection')}
            </button>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Messages</p>
                <p className="text-lg font-bold text-blue-900">{correspondances.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">{t('recovery.unread')}</p>
                <p className="text-lg font-bold text-red-900">{correspondances.filter(c => c.statut === 'non_lu').length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">{t('recovery.highPriority')}</p>
                <p className="text-lg font-bold text-orange-900">{correspondances.filter(c => c.priorite === 'haute').length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Correspondants</p>
                <p className="text-lg font-bold text-green-900">{correspondantsUniques.length}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">{t('recovery.filterByTypeColon')}</label>
          <select
            value={correspondanceFilter}
            onChange={(e) => setCorrespondanceFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">{t('recovery.allCorrespondence')}</option>
            <option value="avocat">Avocats</option>
            <option value="huissier">Huissiers</option>
            <option value="debiteur">{t('recovery.debtor')}</option>
            <option value="tribunal">Tribunal</option>
            <option value="expert">Experts</option>
          </select>
        </div>

        {/* Liste des correspondances */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="divide-y divide-gray-200">
            {filteredCorrespondances.map((corresp) => {
              const typeIcons = {
                avocat: <Briefcase className="w-5 h-5 text-blue-500" />,
                huissier: <Gavel className="w-5 h-5 text-orange-500" />,
                debiteur: <Building2 className="w-5 h-5 text-red-500" />,
                tribunal: <Scale className="w-5 h-5 text-primary-500" />,
                expert: <Calculator className="w-5 h-5 text-green-500" />
              };

              const prioriteColors = {
                haute: 'bg-red-100 text-red-800',
                normale: 'bg-gray-100 text-gray-800',
                basse: 'bg-blue-100 text-blue-800'
              };

              const statutColors = {
                lu: 'bg-gray-100 text-gray-800',
                non_lu: 'bg-red-100 text-red-800',
                repondu: 'bg-green-100 text-green-800',
                envoye: 'bg-blue-100 text-blue-800'
              };

              return (
                <div
                  key={corresp.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCorrespondant(corresp)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {typeIcons[corresp.type as keyof typeof typeIcons]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {corresp.correspondant}
                          </h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioriteColors[corresp.priorite as keyof typeof prioriteColors]}`}>
                            {corresp.priorite}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[corresp.statut as keyof typeof statutColors]}`}>
                            {corresp.statut}
                          </span>
                          {corresp.direction === 'envoye' && (
                            <Send className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{corresp.sujet}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{corresp.message}</p>
                        {corresp.pieces.length > 0 && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Paperclip className="w-4 h-4 text-gray-700" />
                            <span className="text-xs text-gray-700">{corresp.pieces.length} pièce(s) jointe(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      <span className="text-xs text-gray-700">{corresp.dateEnvoi}</span>
                      <button className="text-gray-700 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal nouveau message */}
        {showNewMessageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.newMessageTitle')}</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Destinataire</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>{t('recovery.chooseRecipient')}</option>
                      <option>Me — (Avocat)</option>
                      <option>SCP Huissiers ALPHA</option>
                      <option>SARL TECH SOLUTIONS (Débiteur)</option>
                      <option>Cabinet EXPERTISE+</option>
                      <option>{t('recovery.commercialCourt')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.priority')}</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option value="normale">Normale</option>
                      <option value="haute">Haute</option>
                      <option value="basse">Basse</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sujet</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder={t('recovery.messageSubjectPh')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                    placeholder={t('recovery.yourMessagePh')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.attachments')}</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Paperclip className="w-6 h-6 mx-auto text-gray-700 mb-2" />
                    <p className="text-sm text-gray-600">{t('recovery.dropFilesOr')}<span className="text-blue-600 cursor-pointer">parcourez</span></p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">{t('recovery.markConfidential')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-700">{t('recovery.requestReadReceipt')}</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.cancel')}
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  {t('recovery.saveDraft')}
                </button>
                <button
                  onClick={() => {
                    setShowNewMessageModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('recovery.send')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal détail correspondance */}
        {selectedCorrespondant && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedCorrespondant.sujet}</h3>
                <button
                  onClick={() => setSelectedCorrespondant(null)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {selectedCorrespondant.correspondant.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedCorrespondant.correspondant}</p>
                      <p className="text-sm text-gray-700">{selectedCorrespondant.dateEnvoi}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Reply className="w-4 h-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-800">
                      <Forward className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pprimary max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedCorrespondant.message}</p>
                </div>

                {selectedCorrespondant.pieces.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">{t('recovery.attachments')}</h4>
                    <div className="space-y-2">
                      {selectedCorrespondant.pieces.map((piece, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-gray-700" />
                            <span className="text-sm text-gray-900">{piece}</span>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800" aria-label={t('recovery.download')}>
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderExecutionTab() {

    // Mesures d'exécution : aucune source réelle (recovery_cases vide) → état vide.
    const mesuresExecution: any[] = [];
    const _mesuresExecutionSample = [
      {
        id: 1,
        type: 'saisie_attribution',
        nom: 'Saisie-attribution compte principal',
        dateOrdonnance: '2024-02-01',
        dateExecution: '2024-02-05',
        statut: 'executee',
        huissier: 'SCP Huissiers ALPHA',
        montantSaisi: 125000,
        etablissement: 'Banque Atlantique',
        resultat: 'Compte insuffisamment provisionné'
      },
      {
        id: 2,
        type: 'saisie_attribution',
        nom: 'Saisie-attribution compte secondaire',
        dateOrdonnance: '2024-02-01',
        dateExecution: '2024-02-05',
        statut: 'executee',
        huissier: 'SCP Huissiers ALPHA',
        montantSaisi: 45000,
        etablissement: 'UBA Bénin',
        resultat: 'Somme recouvrée intégralement'
      },
      {
        id: 3,
        type: 'saisie_vente',
        nom: 'Saisie-vente mobilier bureau',
        dateOrdonnance: '2024-02-10',
        dateExecution: '2024-02-15',
        statut: 'en_cours',
        huissier: 'SCP Huissiers ALPHA',
        montantEstime: 180000,
        lieu: 'Siège social SARL TECH SOLUTIONS',
        resultat: 'Inventaire en cours'
      },
      {
        id: 4,
        type: 'saisie_immobiliere',
        nom: 'Saisie immobilière',
        dateOrdonnance: '2024-01-20',
        dateExecution: null,
        statut: 'programmee',
        huissier: 'SCP Huissiers BETA',
        montantEstime: 850000,
        lieu: 'Terrain Lot 45 Zone Industrielle',
        resultat: 'Expertise en cours'
      },
      {
        id: 5,
        type: 'astreinte',
        nom: 'Astreinte quotidienne',
        dateOrdonnance: '2024-01-15',
        dateExecution: '2024-01-16',
        statut: 'executee',
        montantAstreinte: 10000,
        joursEcoules: 25,
        totalAstreinte: 250000,
        resultat: 'Débiteur reste en défaut'
      },
      {
        id: 6,
        type: 'opposition',
        nom: 'Opposition administrative',
        dateOrdonnance: '2024-02-08',
        dateExecution: '2024-02-10',
        statut: 'executee',
        organisme: 'Direction Générale des Impôts',
        montantBloque: 85000,
        resultat: 'Remboursement TVA bloqué'
      }
    ];

    const totalRecouvert = mesuresExecution
      .filter(m => m.statut === 'executee' && (m.montantSaisi || m.montantBloque))
      .reduce((sum, m) => sum + (m.montantSaisi || m.montantBloque || 0), 0);

    const mesuresActives = mesuresExecution.filter(m => ['en_cours', 'programmee'].includes(m.statut)).length;

    const filteredMesures = executionFilter === 'all'
      ? mesuresExecution
      : mesuresExecution.filter(m => m.type === executionFilter);

    return (
      <div className="space-y-6">
        {/* En-tête et actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('recovery.enforcementMeasures')}</h3>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowNewMesureModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('recovery.newMeasure')}
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4 mr-2" />
              {t('recovery.enforcementReport')}
            </button>
          </div>
        </div>

        {/* Tableau de bord exécution */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">{t('recovery.collectedAmount')}</p>
                <p className="text-lg font-bold text-green-900">{formatCurrency(totalRecouvert)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">{t('recovery.activeMeasures')}</p>
                <p className="text-lg font-bold text-orange-900">{mesuresActives}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">{t('recovery.totalMeasures')}</p>
                <p className="text-lg font-bold text-blue-900">{mesuresExecution.length}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600">{t('recovery.successRateShort')}</p>
                <p className="text-lg font-bold text-primary-900">
                  {Math.round((totalRecouvert / 2500000) * 100)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary-600" />
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">{t('recovery.measureTypeColon')}</label>
          <select
            value={executionFilter}
            onChange={(e) => setExecutionFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">{t('recovery.allMeasures')}</option>
            <option value="saisie_attribution">Saisies-attributions</option>
            <option value="saisie_vente">Saisies-ventes</option>
            <option value="saisie_immobiliere">{t('recovery.realEstateSeizures')}</option>
            <option value="astreinte">Astreintes</option>
            <option value="opposition">Oppositions</option>
          </select>
        </div>

        {/* Liste des mesures */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Mesure</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.executor')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.amount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMesures.map((mesure) => {
                  const typeIcons = {
                    saisie_attribution: <CreditCard className="w-4 h-4 text-blue-500" />,
                    saisie_vente: <Package className="w-4 h-4 text-orange-500" />,
                    saisie_immobiliere: <Building className="w-4 h-4 text-green-500" />,
                    astreinte: <Clock className="w-4 h-4 text-primary-500" />,
                    opposition: <Shield className="w-4 h-4 text-red-500" />
                  };

                  const typeLabels = {
                    saisie_attribution: 'Saisie-Attribution',
                    saisie_vente: 'Saisie-Vente',
                    saisie_immobiliere: 'Saisie Immobilière',
                    astreinte: 'Astreinte',
                    opposition: 'Opposition'
                  };

                  const statutColors = {
                    executee: 'bg-green-100 text-green-800',
                    en_cours: 'bg-orange-100 text-orange-800',
                    programmee: 'bg-blue-100 text-blue-800',
                    echec: 'bg-red-100 text-red-800'
                  };

                  const statutLabels = {
                    executee: 'Exécutée',
                    en_cours: 'En cours',
                    programmee: 'Programmée',
                    echec: 'Échec'
                  };

                  return (
                    <tr key={mesure.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {typeIcons[mesure.type as keyof typeof typeIcons]}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{mesure.nom}</div>
                            <div className="text-sm text-gray-700">{mesure.lieu || mesure.etablissement || mesure.organisme}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {typeLabels[mesure.type as keyof typeof typeLabels]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{mesure.huissier}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">Ord: {mesure.dateOrdonnance}</div>
                        {mesure.dateExecution && (
                          <div className="text-sm text-gray-700">Exec: {mesure.dateExecution}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency((mesure.montantSaisi || mesure.montantEstime || mesure.totalAstreinte || mesure.montantBloque || 0))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[mesure.statut as keyof typeof statutColors]}`}>
                          {statutLabels[mesure.statut as keyof typeof statutLabels]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-800" aria-label={t('recovery.viewDetailsAria')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-primary-600 hover:text-primary-800">
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal nouvelle mesure */}
        {showNewMesureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.newEnforcementMeasure')}</h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.measureType')}</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Saisie-attribution</option>
                      <option>Saisie-vente</option>
                      <option>{t('recovery.realEstateSeizure')}</option>
                      <option>Astreinte</option>
                      <option>{t('recovery.administrativeObjection')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Huissier</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>SCP Huissiers ALPHA</option>
                      <option>SCP Huissiers BETA</option>
                      <option>Cabinet JUSTICE+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.measureName')}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: Saisie-attribution compte principal"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.orderDate')}</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.plannedEnforcementDate')}</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.placeEstablishment')}</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Ex: Banque Atlantique"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.estimatedAmountFcfa')}</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observations</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                    placeholder={t('recovery.additionalInfoPh')}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowNewMesureModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.cancel')}
                </button>
                <button
                  onClick={() => {
                    setShowNewMesureModal(false);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {t('recovery.scheduleMeasure')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderResultatsTab() {
    if (!selectedContentieuxDetail) return null;

    // Métriques dérivées des dossiers contentieux réels (statut juridique).
    const montantInitial = dossiersContentieux.reduce((s: number, d: any) => s + Number(d.montantTotal || 0), 0);
    const montantRecouvert = dossiersContentieux.reduce((s: number, d: any) => s + Number(d.montantPaye || 0), 0);
    const fraisTotaux = dossiersContentieux.reduce((s: number, d: any) => s + Number(d.frais || 0), 0);
    const tauxRecouvrement = montantInitial > 0 ? (montantRecouvert / montantInitial) * 100 : 0;
    const beneficeNet = montantRecouvert - fraisTotaux;
    const rentabilite = fraisTotaux > 0 ? (beneficeNet / fraisTotaux) * 100 : 0;

    // Chronologie des recouvrements : pas de journal d'encaissements de
    // recouvrement dédié → vide (pas de données fabriquées).
    const chronologieResultats: Array<{
      id: number | string;
      date: string;
      type: string;
      description: string;
      montant: number;
      source: string;
    }> = [];

    const analyseRentabilite = {
      montantInitial,
      montantRecouvert,
      fraisTotaux,
      beneficeNet,
      dureeRecouvrement: 45, // jours
      tauxRecouvrement,
      rentabilite
    };

    const comparaison = {
      moyenneMarche: 65,
      dureeMoyenne: 120,
      fraisisMoyens: 18
    };

    return (
      <div className="space-y-6">
        {/* En-tête avec actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('recovery.litigationResultsTitle')}</h3>
          <div className="flex space-x-3">
            {selectedContentieuxDetail.statutJuridique === 'execution' && (
              <button
                onClick={() => setShowCloturerModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('recovery.closeCase')}
              </button>
            )}
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <FileText className="w-4 h-4 mr-2" />
              {t('recovery.finalReport')}
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4 mr-2" />
              {t('recovery.exportData')}
            </button>
          </div>
        </div>

        {/* Indicateurs clés de performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">{t('recovery.collectionRateTitle')}</p>
                <p className="text-lg font-bold text-green-900">{tauxRecouvrement.toFixed(1)}%</p>
                <p className="text-xs text-green-600 mt-1">Objectif: 80%</p>
              </div>
              <Target className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">{t('recovery.collectedAmount')}</p>
                <p className="text-lg font-bold text-blue-900">{formatCurrency(montantRecouvert)}</p>
                <p className="text-xs text-blue-600 mt-1">/ {formatCurrency(montantInitial)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="bg-primary-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-600">{t('recovery.profitability')}</p>
                <p className="text-lg font-bold text-primary-900">{rentabilite.toFixed(1)}%</p>
                <p className="text-xs text-primary-600 mt-1">ROI excellent</p>
              </div>
              <TrendingUp className="w-10 h-10 text-primary-600" />
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">{t('recovery.duration')}</p>
                <p className="text-lg font-bold text-orange-900">{analyseRentabilite.dureeRecouvrement}</p>
                <p className="text-xs text-orange-600 mt-1">jours</p>
              </div>
              <Clock className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Graphique de recouvrement */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.collectionTrend')}</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>{t('recovery.collectionProgress')}</span>
              <span className="font-medium">{tauxRecouvrement.toFixed(1)}% complété</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full"
                style={{ width: `${tauxRecouvrement}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="font-medium text-gray-900">{formatCurrency(montantRecouvert)}</p>
                <p className="text-gray-700">{t('recovery.collected')}</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-red-900">{formatCurrency((montantInitial - montantRecouvert))}</p>
                <p className="text-gray-700">{t('recovery.remainingToCollect')}</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-blue-900">{formatCurrency(fraisTotaux)}</p>
                <p className="text-gray-700">{t('recovery.feesIncurred')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chronologie des recouvrements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.collectionsTimeline')}</h4>
            <div className="space-y-4">
              {chronologieResultats.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">{t('recovery.noCollectionReceipt')}</p>
              )}
              {chronologieResultats.map((item) => (
                <div key={item.id} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      item.type === 'recouvrement' ? 'bg-red-500' : 'bg-green-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <span className="text-sm font-bold text-green-600">+{formatCurrency(item.montant)}</span>
                    </div>
                    <p className="text-xs text-gray-700">{item.source}</p>
                    <p className="text-xs text-gray-700">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analyse comparative */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.comparativeAnalysis')}</h4>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('recovery.collectionRate')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-green-600">{tauxRecouvrement.toFixed(1)}%</span>
                    <span className="text-xs text-gray-700">vs {comparaison.moyenneMarche}% (marché)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(tauxRecouvrement/100)*100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('recovery.collectionDuration')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-blue-600">{analyseRentabilite.dureeRecouvrement}j</span>
                    <span className="text-xs text-gray-700">vs {comparaison.dureeMoyenne}j (marché)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '62%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{t('recovery.feeRate')}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-primary-600">{(montantInitial > 0 ? (fraisTotaux/montantInitial)*100 : 0).toFixed(1)}%</span>
                    <span className="text-xs text-gray-700">vs {comparaison.fraisisMoyens}% (marché)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{t('recovery.overallAssessment')}</span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {t('recovery.excellent')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analyse financière détaillée */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.detailedFinancialAnalysis')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-gray-900 mb-3">{t('recovery.collectionsBreakdown')}</h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.voluntaryPayments')}</span>
                  <span className="text-sm font-medium text-gray-400">—</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.enforcementMeasuresLower')}</span>
                  <span className="text-sm font-medium text-gray-400">—</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">{t('recovery.totalCollected')}</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(montantRecouvert)}</span>
                </div>
              </div>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-3">{t('recovery.costBreakdown')}</h5>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.lawyerFees')}</span>
                  <span className="text-sm font-medium">250,000 FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.bailiffFees')}</span>
                  <span className="text-sm font-medium">135,000 FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.courtFees')}</span>
                  <span className="text-sm font-medium">65,000 FCFA</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-900">{t('recovery.totalFeesLower')}</span>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(fraisTotaux)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">{t('recovery.netProfit')}</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(beneficeNet)}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1">
              Rentabilité: {rentabilite.toFixed(1)}% | Efficacité: {tauxRecouvrement.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Modal clôture */}
        {showCloturerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.closeLitigationCaseTitle')}</h3>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Attention</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        {t('recovery.closingIsFinalShort')}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.closingReason')}</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option>{t('recovery.fullRecovery')}</option>
                    <option>{t('recovery.partialRecoveryInsolvent')}</option>
                    <option>{t('recovery.settlementAgreement')}</option>
                    <option>Prescription</option>
                    <option>{t('recovery.debtWriteOff')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.closingComments')}</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                    placeholder={t('recovery.finalReviewPh')}
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{t('recovery.finalSummaryTitle')}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{t('recovery.initialAmountColon')}</span>
                      <span>{formatCurrency(montantInitial)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('recovery.collectedAmountColon')}</span>
                      <span className="text-green-600">{formatCurrency(montantRecouvert)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('recovery.collectionRateColon')}</span>
                      <span className="font-medium">{tauxRecouvrement.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCloturerModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.cancel')}
                </button>
                <button
                  onClick={() => {
                    setShowCloturerModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('recovery.confirmClosing')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderContentieuxContent() {
    // Page détaillée du dossier contentieux
    if (showContentieuxDetailPage && selectedContentieuxDetail) {
      return renderContentieuxDetailPage();
    }

    // Vue Dashboard KPIs
    if (contentieuxView === 'dashboard') {
      return (
        <div className="space-y-6">
          {/* KPIs consolidés */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.overallPerformance')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">73%</p>
                  <p className="text-xs text-green-600">+5% vs mois dernier</p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.amicableToLitigationRate')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">18%</p>
                  <p className="text-xs text-orange-600">{t('recovery.up2PercentThisMonth')}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">ROI Contentieux</p>
                  <p className="text-lg font-bold text-green-600">3.2x</p>
                  <p className="text-xs text-gray-600">{t('recovery.costVsCollection')}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.averageDelayTitle')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">127j</p>
                  <p className="text-xs text-gray-600">{t('recovery.transferToJudgment')}</p>
                </div>
                <Clock className="w-8 h-8 text-primary-600" />
              </div>
            </div>
          </div>

          {/* Graphiques comparatifs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Amiable vs Contentieux */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">
                {t('recovery.amicableVsLitigation')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { phase: 'Amiable', taux_succes: 82, delai_moyen: 45, cout_moyen: 50000 },
                  { phase: 'Contentieux', taux_succes: 67, delai_moyen: 127, cout_moyen: 250000 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="phase" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar radius={[6,6,0,0]} dataKey="taux_succes" fill="url(#gradPetrol)" name="Taux succès %" />
                  <Bar radius={[6,6,0,0]} dataKey="delai_moyen" fill="url(#gradAmber)" name="Délai (jours)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Flux entre processus */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">
                {t('recovery.monthlyFlowAmicableLitig')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { mois: 'Sept', transferts: 12, retours: 3 },
                  { mois: 'Oct', transferts: 15, retours: 5 },
                  { mois: 'Nov', transferts: 18, retours: 4 },
                  { mois: 'Déc', transferts: 14, retours: 6 },
                  { mois: 'Jan', transferts: 20, retours: 7 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="transferts" stroke="#C0322B" name="Transferts vers contentieux" />
                  <Line type="monotone" dataKey="retours" stroke="#15803D" name="Retours en amiable" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statistiques par type de procédure */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.perfByProcedureType')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.procedure')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.caseCount')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.successRateShort')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.averageDelayTitle')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.averageCost')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm">{t('recovery.paymentOrder')}</td>
                    <td className="px-4 py-3 text-sm text-center">45</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">78%</span></td>
                    <td className="px-4 py-3 text-sm text-center">60 jours</td>
                    <td className="px-4 py-3 text-sm text-center">150K FCFA</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">4.2x</span></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">{t('recovery.interimProvision')}</td>
                    <td className="px-4 py-3 text-sm text-center">23</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-yellow-600 font-semibold">65%</span></td>
                    <td className="px-4 py-3 text-sm text-center">90 jours</td>
                    <td className="px-4 py-3 text-sm text-center">250K FCFA</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-yellow-600 font-semibold">2.8x</span></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">{t('recovery.mainProceedings')}</td>
                    <td className="px-4 py-3 text-sm text-center">18</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-orange-600 font-semibold">55%</span></td>
                    <td className="px-4 py-3 text-sm text-center">180 jours</td>
                    <td className="px-4 py-3 text-sm text-center">450K FCFA</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-orange-600 font-semibold">1.9x</span></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm">Saisie-attribution</td>
                    <td className="px-4 py-3 text-sm text-center">12</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">85%</span></td>
                    <td className="px-4 py-3 text-sm text-center">45 jours</td>
                    <td className="px-4 py-3 text-sm text-center">100K FCFA</td>
                    <td className="px-4 py-3 text-sm text-center"><span className="text-green-600 font-semibold">5.1x</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // Vue Workflow
    if (contentieuxView === 'workflow') {
      return (
        <div className="space-y-6">
          {/* Sélecteur de phase */}
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('recovery.fullModuleWorkflow')}</h3>
              <select
                value={activeWorkflowPhase}
                onChange={(e) => setActiveWorkflowPhase(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('recovery.allPhases')}</option>
                <option value="amiable">{t('recovery.amicablePhaseRange')}</option>
                <option value="transfert">{t('recovery.transferDay91')}</option>
                <option value="contentieux">{t('recovery.litigationPhase')}</option>
                <option value="execution">{t('recovery.enforcementAndClosing')}</option>
              </select>
            </div>
          </div>

          {/* Visualisation du workflow */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <div className="relative">
              {/* Phase 1: Amiable */}
              <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'amiable' ? 'opacity-30' : ''}`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.phase1Title')}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.autoDetectUnpaid')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.assignCollectionsAgent')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.phoneAndWrittenReminders')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.negotiationsAndOffers')}</span>
                      </div>
                      <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <span className="text-sm font-medium text-yellow-800">
                          {t('recovery.decisionPointAmicable')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flèche de connexion */}
              <div className="flex justify-center my-4">
                <ArrowDown className="w-6 h-6 text-gray-700" />
              </div>

              {/* Phase 2: Transfert */}
              <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'transfert' ? 'opacity-30' : ''}`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.phase2Title')}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{t('recovery.amicableFailureConfirmed')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{t('recovery.transferRequestJustified')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{t('recovery.hierarchicalApproval')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FolderOpen className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{t('recovery.autoCaseCreation')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flèche de connexion */}
              <div className="flex justify-center my-4">
                <ArrowDown className="w-6 h-6 text-gray-700" />
              </div>

              {/* Phase 3: Contentieux */}
              <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'contentieux' ? 'opacity-30' : ''}`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.phase3Title')}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Scale className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{t('recovery.legalCaseAnalysis')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Send className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{t('recovery.formalNoticeByBailiff')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Gavel className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{t('recovery.chooseSuitableProcedure')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{t('recovery.manageCourtCase')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckSquare className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{t('recovery.obtainCourtDecision')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flèche de connexion */}
              <div className="flex justify-center my-4">
                <ArrowDown className="w-6 h-6 text-gray-700" />
              </div>

              {/* Phase 4: Exécution */}
              <div className={`mb-8 ${activeWorkflowPhase !== 'all' && activeWorkflowPhase !== 'execution' ? 'opacity-30' : ''}`}>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">4</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.phase4Title')}</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center space-x-2">
                        <FileSignature className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.serviceOfJudgment')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Hammer className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.forcedEnforcementMeasures')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.collectionOfSums')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.globalRoiAnalysis')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Archive className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('recovery.closingAndArchiving')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Points de contrôle */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">{t('recovery.controlPointsAndSwitches')}</h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>{t('recovery.bulletReturnAmicable')}</li>
                  <li>{t('recovery.bulletAutoEscalation')}</li>
                  <li>{t('recovery.bulletMandatoryApproval')}</li>
                  <li>{t('recovery.bulletRealTimeReporting')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Vue Coûts & Budget
    if (contentieuxView === 'couts') {
      // Derive cost categories from real journal entries (class 6 accounts or AC journal)
      const coutsByCategory: Record<string, number> = {};
      let totalDepensesEngagees = 0;
      let totalMontantsRecouVres = 0;
      for (const entry of allJournalEntries) {
        const isAchat = (entry.journalCode || '').toUpperCase().includes('AC');
        for (const line of (entry.lines || [])) {
          const acc: string = line.accountCode || '';
          if (isAchat || acc.startsWith('6')) {
            const debit = line.debit || 0;
            if (debit > 0) {
              // Group by first 3 chars of account code for a meaningful category label
              const prefix = acc.slice(0, 3);
              coutsByCategory[prefix] = (coutsByCategory[prefix] || 0) + debit;
              totalDepensesEngagees += debit;
            }
          }
          // Sum credits on recouvrement accounts (411xxx + 42x/43x/44x/46x/47x) as recovered amounts
          if (isRecouvrementAccount(acc) && (line.credit || 0) > 0) {
            totalMontantsRecouVres += line.credit;
          }
        }
      }

      // Map account prefixes to human-readable labels
      const accountPrefixLabels: Record<string, string> = {
        '601': 'Achats marchandises', '602': 'Achats mat. premières', '603': 'Variation stocks',
        '604': 'Achats fournitures', '605': 'Achats matériel', '606': 'Achats emballages',
        '607': 'Achats matières', '608': 'Frais accessoires', '609': 'Remises fournisseurs',
        '611': 'Transport sur achats', '612': 'Services extérieurs', '613': 'Locations',
        '614': 'Charges locatives', '615': 'Entretien réparations', '616': 'Primes assurances',
        '617': 'Documentation', '618': 'Divers services', '621': 'Rémunérations',
        '622': 'Honoraires', '623': 'Publicité', '624': 'Transport livraisons',
        '625': 'Déplacements', '626': 'Communications', '627': 'Services bancaires',
        '628': 'Cotisations', '629': 'Divers charges', '631': 'Impôts taxes',
        '632': 'Taxes apprentissage', '633': 'Taxes formation', '641': 'Rémunérations personnel',
        '645': 'Charges sociales', '651': 'Pertes créances', '661': 'Charges intérêts',
        '671': 'Dotations amortissements', '681': 'Dotations provisions',
      };

      const costChartData = Object.entries(coutsByCategory)
        .map(([prefix, montant]) => ({
          name: accountPrefixLabels[prefix] || `Compte ${prefix}xx`,
          montant,
        }))
        .sort((a, b) => b.montant - a.montant)
        .slice(0, 7); // top 7 categories

      const totalCouts = costChartData.reduce((s, c) => s + c.montant, 0);
      const roiLabel = totalDepensesEngagees > 0
        ? `ROI: ${(totalMontantsRecouVres / totalDepensesEngagees).toFixed(1)}x`
        : '—';
      const budgetPct = totalDepensesEngagees > 0 && totalMontantsRecouVres > 0
        ? `${Math.round((totalDepensesEngagees / (totalMontantsRecouVres || 1)) * 100)}% du récupéré`
        : '—';

      return (
        <div className="space-y-6">
          {/* Budget global */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.totalLitigationBudget')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {totalMontantsRecouVres > 0 ? formatCurrency(totalMontantsRecouVres) : '—'}
                  </p>
                  <p className="text-xs text-gray-600">{t('recovery.collectedReceivables')}</p>
                </div>
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.incurredExpenses')}</p>
                  <p className="text-lg font-bold text-orange-600">
                    {totalDepensesEngagees > 0 ? formatCurrency(totalDepensesEngagees) : '—'}
                  </p>
                  <p className="text-xs text-gray-600">{budgetPct}</p>
                </div>
                <CreditCard className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.collectedAmounts')}</p>
                  <p className="text-lg font-bold text-green-600">
                    {totalMontantsRecouVres > 0 ? formatCurrency(totalMontantsRecouVres) : '—'}
                  </p>
                  <p className="text-xs text-green-600">{roiLabel}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Détail des coûts par type */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.costBreakdownTitle')}</h3>
            {costChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <PieChart className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">{t('recovery.noExpenseClass6')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        dataKey="montant"
                        data={costChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#235A6E"
                        label
                      >
                        {costChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {costChartData.map((cat, index) => {
                    const pct = totalCouts > 0 ? Math.round((cat.montant / totalCouts) * 100) : 0;
                    return (
                      <div key={cat.name} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-sm font-bold">{formatCurrency(cat.montant)}</span>
                        </div>
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Analyse coût/bénéfice par dossier */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.costBenefitByCase')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">Dossier</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.receivable')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.incurredCosts')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.collected')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.netProfit')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.profitability')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dossiersContentieux.slice(0, 4).map(dossier => (
                    <tr key={dossier.id}>
                      <td className="px-4 py-3 text-sm">{dossier.numeroRef}</td>
                      <td className="px-4 py-3 text-sm text-center">{formatCurrency(dossier.montantTotal)}</td>
                      <td className="px-4 py-3 text-sm text-center">{formatCurrency(dossier.fraisProcedure)}</td>
                      <td className="px-4 py-3 text-sm text-center font-semibold text-green-600">
                        {formatCurrency(dossier.montantTotal * 0.7)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-semibold">
                        {formatCurrency(dossier.montantTotal * 0.7 - dossier.fraisProcedure)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {Math.round((dossier.montantTotal * 0.7 - dossier.fraisProcedure) / dossier.fraisProcedure * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // Vue Exécution
    if (contentieuxView === 'execution') {
      return (
        <div className="space-y-6">
          {/* Statistiques exécution */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.judgmentsToEnforce')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">8</p>
                </div>
                <Gavel className="w-8 h-8 text-primary-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.seizuresInProgress')}</p>
                  <p className="text-lg font-bold text-orange-600">5</p>
                </div>
                <Lock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.seizedAmounts')}</p>
                  <p className="text-lg font-bold text-green-600">12.3M</p>
                </div>
                <Coins className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.enforcementRate')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">62%</p>
                </div>
                <CheckSquare className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Liste des exécutions */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.casesInEnforcement')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.reference')}</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.customer')}</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.enforcementType')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.amount')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.status')}</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-700 uppercase">{t('recovery.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dossiersExecution.map((dossier) => (
                    <tr key={dossier.id}>
                      <td className="px-4 py-3 text-sm">{dossier.reference}</td>
                      <td className="px-4 py-3 text-sm">{dossier.client}</td>
                      <td className="px-4 py-3 text-sm">{dossier.typeExecution}</td>
                      <td className="px-4 py-3 text-sm text-center font-semibold">{formatCurrency(dossier.montant)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          dossier.statut === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                          dossier.statut === 'Huissier mandaté' ? 'bg-orange-100 text-orange-800' :
                          dossier.statut === 'Exécuté' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {dossier.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedExecutionDossier(dossier);
                            setShowExecutionDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title={t('recovery.viewEnforcementDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Types de mesures d'exécution */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.availableEnforcementMeasures')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Saisie-attribution</h4>
                <p className="text-sm text-blue-700">{t('recovery.directBankSeizure')}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-2">Saisie-vente</h4>
                <p className="text-sm text-orange-700">{t('recovery.forcedSaleOfAssets')}</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                <h4 className="font-semibold text-primary-900 mb-2">{t('recovery.wageGarnishment')}</h4>
                <p className="text-sm text-primary-700">{t('recovery.salaryDeduction')}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">{t('recovery.judicialMortgage')}</h4>
                <p className="text-sm text-green-700">{t('recovery.realEstateGuarantee')}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2">Astreinte</h4>
                <p className="text-sm text-red-700">{t('recovery.dailyLatePenalty')}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">{t('recovery.instalmentPlan')}</h4>
                <p className="text-sm text-gray-700">{t('recovery.approvedSplitPayment')}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }


    // Vue KPIs & Reporting
    if (contentieuxView === 'kpi') {
      return (
        <div className="space-y-6">
          {/* KPIs consolidés */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.kpiConsolidatedView')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-[var(--color-primary)]">82%</p>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.amicableSuccessRate')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-[var(--color-primary)]">67%</p>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.litigationSuccessRate')}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-green-600">3.2x</p>
                <p className="text-sm text-gray-600 mt-1">ROI global</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-[var(--color-primary)]">45j</p>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.amicableAverageDelay')}</p>
              </div>
            </div>
          </div>

          {/* Évolution temporelle */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.performanceTrend')}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={[
                { mois: 'Août', amiable: 78, contentieux: 62, roi: 2.8 },
                { mois: 'Sept', amiable: 80, contentieux: 65, roi: 2.9 },
                { mois: 'Oct', amiable: 82, contentieux: 64, roi: 3.0 },
                { mois: 'Nov', amiable: 81, contentieux: 68, roi: 3.1 },
                { mois: 'Déc', amiable: 83, contentieux: 66, roi: 3.2 },
                { mois: 'Jan', amiable: 82, contentieux: 67, roi: 3.2 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="amiable" stroke="#15803D" name="Taux succès amiable %" />
                <Line yAxisId="left" type="monotone" dataKey="contentieux" stroke="#C0322B" name="Taux succès contentieux %" />
                <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#235A6E" name="ROI (x)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Analyse prédictive */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.predictiveAnalysis')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">{t('recovery.forecastQ1')}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">{t('recovery.estimatedTransfers')}</span>
                    <span className="text-sm font-semibold">65 dossiers</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t('recovery.forecastLitigationAmount')}</span>
                    <span className="text-sm font-semibold">42M FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t('recovery.expectedSuccessRate')}</span>
                    <span className="text-sm font-semibold">69%</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-3">{t('recovery.aiRecommendations')}</h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>{t('recovery.bulletIncreaseReminders')}</li>
                  <li>{t('recovery.bulletPreferPaymentOrders')}</li>
                  <li>{t('recovery.bulletFocusCases')}</li>
                  <li>{t('recovery.bulletReinforceTeam')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions de reporting */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.availableReports')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setShowRapportMensuelModal(true)}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-blue-400"
              >
                <FileText className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-semibold text-[var(--color-primary)]">{t('recovery.consolidatedMonthlyReport')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.amicablePlusLitigation')}</p>
              </button>
              <button
                onClick={() => setShowAnalyseROIModal(true)}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-green-400"
              >
                <BarChart3 className="w-6 h-6 text-green-600 mb-2" />
                <h4 className="font-semibold text-[var(--color-primary)]">{t('recovery.detailedRoiAnalysis')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.byPhaseAndProcedure')}</p>
              </button>
              <button
                onClick={() => setShowPerformanceEquipeModal(true)}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-orange-400"
              >
                <Users className="w-6 h-6 text-orange-600 mb-2" />
                <h4 className="font-semibold text-[var(--color-primary)]">{t('recovery.teamPerformance')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.agentsAndManagers')}</p>
              </button>
              <button
                onClick={() => setShowPrevisionTresorerieModal(true)}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-primary-400"
              >
                <TrendingUp className="w-6 h-6 text-primary-600 mb-2" />
                <h4 className="font-semibold text-[var(--color-primary)]">{t('recovery.treasuryForecast')}</h4>
                <p className="text-sm text-gray-600 mt-1">3-6 mois glissants</p>
              </button>
              <button
                onClick={() => setShowDossiersRisqueModal(true)}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-red-400"
              >
                <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
                <h4 className="font-semibold text-[var(--color-primary)]">{t('recovery.casesAtRisk')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.alertsAndEscalations')}</p>
              </button>
              <button
                onClick={() => setShowExportPersonnaliseModal(true)}
                className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left transition-colors hover:border-gray-500"
              >
                <Download className="w-6 h-6 text-gray-600 mb-2" />
                <h4 className="font-semibold text-[var(--color-primary)]">{t('recovery.customExport')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('recovery.excelPdfCsv')}</p>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Vue Liste des dossiers
    if (contentieuxView === 'liste') {
      return (
        <div className="space-y-6">
          {/* En-tête avec statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.activeCases')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">12</p>
                </div>
                <Scale className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.amountInLitigation')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">28.4M</p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.successRate')}</p>
                <p className="text-lg font-bold text-green-600">67%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.hearingsThisMonth')}</p>
                <p className="text-lg font-bold text-[var(--color-primary)]">8</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Filtres et actions */}
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStatutContentieux}
                onChange={(e) => setFilterStatutContentieux(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statutsContentieux.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                value={filterProcedure}
                onChange={(e) => setFilterProcedure(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {typesProcedure.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors" aria-label={t('recovery.download')}>
                <Download className="w-4 h-4" />
                <span>{t('common.export')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tableau des dossiers contentieux */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.reference')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.customer')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.totalAmount')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.legalStatus')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.procedure')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.lawyer')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.nextDueDateCol')}
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContentieux.map(dossier => (
                  <tr key={dossier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-[var(--color-primary)]">{dossier.numeroRef}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-[var(--color-primary)]">{dossier.client}</div>
                        <div className="text-xs text-gray-700">Origine: {dossier.origineAmiable}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-primary)]">
                          {formatCurrency(dossier.montantTotal)}
                        </div>
                        <div className="text-xs text-gray-700">
                          Principal: {formatCurrency(dossier.montantPrincipal)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProcedureStatutColor(dossier.statutJuridique)}`}>
                        {dossier.statutJuridique.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[var(--color-primary)]">
                        {dossier.typeProcedure.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-[var(--color-primary)]">{dossier.avocat}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-[var(--color-primary)]">{dossier.prochaineEcheance}</div>
                        <div className={`text-xs font-medium ${getUrgenceIndicator(dossier.joursRestants)}`}>
                          Dans {dossier.joursRestants} jours
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedContentieux(dossier);
                            setContentieuxView('detail');
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditContentieuxModal(dossier)}
                          className="text-orange-600 hover:text-orange-800"
                          title={t('recovery.editCase')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            initWorkflowForDossier(dossier.id);
                            setSelectedDossierWorkflow(dossier);
                            setShowWorkflowModal(true);
                          }}
                          className="text-primary-600 hover:text-primary-800"
                          title={t('recovery.manageWorkflow')}
                        >
                          <Activity className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContentieuxDetail(dossier);
                            setShowContentieuxDetailPage(true);
                            setActiveContentieuxTab('general');
                          }}
                          className="text-green-600 hover:text-green-800"
                          title={t('recovery.caseDetailPage')}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      );
    }

    // Vue Détail d'un dossier contentieux
    if (contentieuxView === 'detail' && selectedContentieux) {
      return (
        <div className="space-y-6">
        {/* Header détail */}
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <button
                  onClick={() => {
                    setContentieuxView('liste');
                    setSelectedContentieux(null);
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-[var(--color-primary)]">
                  Dossier Contentieux {selectedContentieux.numeroRef}
                </h2>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getProcedureStatutColor(selectedContentieux.statutJuridique ?? '')}`}>
                  {selectedContentieux.statutJuridique?.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-sm text-gray-600">
                  Transféré le {selectedContentieux.dateTransfert}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Send className="w-4 h-4" />
                <span>{t('recovery.sendUpdate')}</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                <Download className="w-4 h-4" />
                <span>{t('recovery.generateReport')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations principales */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline de la procédure */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.procedureTimeline')}</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-[var(--color-primary)]">{t('recovery.transferToLitigation')}</span>
                      <span className="text-sm text-gray-700">15/01/2024</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{selectedContentieux.motifTransfert}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-[var(--color-primary)]">{t('recovery.caseCreation')}</span>
                      <span className="text-sm text-gray-700">16/01/2024</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Dossier complet transmis à {selectedContentieux.avocat}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-[var(--color-primary)]">{t('recovery.formalNoticeSent')}</span>
                      <span className="text-sm text-gray-700">18/01/2024</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{t('recovery.awaitingDebtorReply')}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-gray-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">{t('recovery.summonsPlanned')}</span>
                      <span className="text-sm text-gray-700">{selectedContentieux.prochaineEcheance}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents du dossier */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.legalDocumentsShort')}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-700" />
                    <div>
                      <span className="text-sm font-medium text-[var(--color-primary)]">Factures impayées.pdf</span>
                      <span className="text-xs text-gray-700 ml-2">2.4 MB</span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800" aria-label={t('recovery.download')}>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-700" />
                    <div>
                      <span className="text-sm font-medium text-[var(--color-primary)]">Contrat client.pdf</span>
                      <span className="text-xs text-gray-700 ml-2">1.2 MB</span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800" aria-label={t('recovery.download')}>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-700" />
                    <div>
                      <span className="text-sm font-medium text-[var(--color-primary)]">Mise en demeure.pdf</span>
                      <span className="text-xs text-gray-700 ml-2">450 KB</span>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800" aria-label={t('recovery.download')}>
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Upload className="w-4 h-4" />
                <span>{t('recovery.addDocument')}</span>
              </button>
            </div>

            {/* Actions disponibles */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.proceduralActions')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowAssignationModal(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200">
                  <Scale className="w-5 h-5" />
                  <span>{t('recovery.prepareSummonsShort')}</span>
                </button>
                <button
                  onClick={() => setShowAudienceModal(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                  <Calendar className="w-5 h-5" />
                  <span>{t('recovery.scheduleHearingShort')}</span>
                </button>
                <button
                  onClick={() => setShowConclusionsModal(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200">
                  <FileText className="w-5 h-5" />
                  <span>{t('recovery.generateSubmissionsShort')}</span>
                </button>
                <button
                  onClick={() => setShowJugementModal(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                  <CheckCircle className="w-5 h-5" />
                  <span>{t('recovery.recordJudgmentShort')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar avec informations complémentaires */}
          <div className="space-y-6">
            {/* Détails financiers */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.financialDetails')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.principalAmount')}</span>
                  <span className="text-sm font-semibold text-[var(--color-primary)]">
                    {formatCurrency(selectedContentieux.montantPrincipal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.lateInterest')}</span>
                  <span className="text-sm font-semibold text-[var(--color-primary)]">
                    {formatCurrency(selectedContentieux.interetsRetard ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('recovery.procedureFees')}</span>
                  <span className="text-sm font-semibold text-[var(--color-primary)]">
                    {formatCurrency(selectedContentieux.fraisProcedure ?? 0)}
                  </span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-700">{t('recovery.totalToCollect')}</span>
                  <span className="text-lg font-bold text-[var(--color-primary)]">
                    {formatCurrency(selectedContentieux.montantTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Informations avocat */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.lawyerInCharge')}</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <UserCircle className="w-10 h-10 text-gray-700" />
                  <div>
                    <p className="font-semibold text-[var(--color-primary)]">{selectedContentieux.avocat}</p>
                    <p className="text-sm text-gray-600">Cabinet KONE & Associés</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-700" />
                    <span className="text-sm text-gray-600">+225 27 20 30 40 50</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-700" />
                    <span className="text-sm text-gray-600">contact@kone-associes.ci</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowContactAvocatModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('recovery.contactLawyer')}
                </button>
              </div>
            </div>

            {/* Prochaines échéances */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.upcomingDeadlines')}</h3>
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-[var(--color-primary)]">{t('recovery.formalNoticeReplyDelay')}</p>
                      <p className="text-sm text-gray-600 mt-1">01/02/2024</p>
                    </div>
                    <span className="text-xs font-semibold text-red-600">8 jours</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-[var(--color-primary)]">{t('recovery.commercialCourtHearing')}</p>
                      <p className="text-sm text-gray-600 mt-1">15/02/2024</p>
                    </div>
                    <span className="text-xs font-semibold text-yellow-600">22 jours</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.quickActions')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowRetourAmiableModal(true)}
                  className="w-full px-4 py-2 text-left bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100">
                  {t('recovery.returnToAmicable')}
                </button>
                <button
                  onClick={() => setShowExpertiseModal(true)}
                  className="w-full px-4 py-2 text-left bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100">
                  {t('recovery.requestExpertiseShort')}
                </button>
                <button
                  onClick={() => setShowClotureModal(true)}
                  className="w-full px-4 py-2 text-left bg-gray-50 text-red-600 rounded-lg hover:bg-red-50">
                  {t('recovery.closeCase')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      );
    }

    return null;
  }

};

/**
 * isRecouvrementAccount — étend la sélection de comptes du module Recouvrement.
 * Inclut les comptes clients (411), personnel (42x) et tiers divers SYSCOHADA
 * (431 Sécurité sociale, 441 État, 461 Débiteurs divers, 471 Débiteurs provisoires, etc.).
 * Préfixes couverts : 411, 421, 422, 423, 424, 425, 431, 441, 461, 471.
 */
const RECOUVREMENT_PREFIXES = ['411', '421', '422', '423', '424', '425', '431', '441', '461', '471'];
const isRecouvrementAccount = (accountCode: string): boolean =>
  RECOUVREMENT_PREFIXES.some(prefix => accountCode.startsWith(prefix));

/**
 * Modèles de relance TRILINGUES (fr/en/es).
 *
 * ⚠️ Ce sont des DONNÉES métier (contenu de la lettre envoyée au client), pas des
 * libellés d'interface : ils ne passent donc PAS par t(). Une lettre de relance part
 * chez le CLIENT → elle est rédigée dans la langue du client destinataire
 * (`languePrefere` du tiers), jamais dans la langue de l'interface.
 */
type RelanceLang = 'fr' | 'en' | 'es';

const RELANCE_EMAIL_TEMPLATES: Record<RelanceLang, Record<string, string>> = {
  fr: {
    rappel_amical: `Objet: Rappel de paiement - {invoice_list}

Madame, Monsieur {client_name},

Nous vous rappelons que les factures suivantes restent impayées:
{invoice_details}

Montant total dû: {total_amount} FCFA

Il s'agit probablement d'un oubli de votre part. Nous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.

Si le règlement a été effectué entre-temps, nous vous prions de ne pas tenir compte de ce message.

Cordialement,
{company_name}`,
    relance_ferme: `Objet: 2ème Relance - {invoice_count} factures impayées

Madame, Monsieur {client_name},

Malgré notre précédent rappel, nous constatons que les factures suivantes restent impayées:
{invoice_details}

Montant total: {total_amount} FCFA
Retard moyen: {avg_days_overdue} jours

Nous vous demandons de procéder au règlement sous 48 heures.

Sans réponse de votre part, nous serons contraints d'engager des procédures de recouvrement.

Service Comptabilité
{company_name}`,
    dernier_avis: `Objet: DERNIER AVIS avant procédure - {invoice_count} factures

Madame, Monsieur {client_name},

DERNIER AVIS AVANT ENGAGEMENT DE POURSUITES

Malgré nos multiples relances, les factures suivantes demeurent impayées:
{invoice_details}

TOTAL DÛ: {total_amount} FCFA

Sans règlement sous 72 heures, votre dossier sera transmis à notre service contentieux.

Ceci est notre dernier avis amiable.

Direction Financière
{company_name}`,
    mise_demeure: `Objet: MISE EN DEMEURE - Créances impayées

LETTRE RECOMMANDÉE AVEC ACCUSÉ DE RÉCEPTION

Madame, Monsieur {client_name},

MISE EN DEMEURE

Par la présente, nous vous mettons en demeure de régler sous HUIT (8) jours:

{invoice_details}

MONTANT PRINCIPAL: {total_amount} FCFA
INTÉRÊTS DE RETARD: {interest_amount} FCFA
FRAIS DE RELANCE: {fees_amount} FCFA
TOTAL À RÉGLER: {grand_total} FCFA

À défaut de règlement dans ce délai, nous engagerons toute procédure judiciaire utile.

{company_name}
Service Juridique`,
    pre_contentieux: `Objet: TRANSMISSION AU CONTENTIEUX - Dossier {client_code}

Madame, Monsieur {client_name},

Votre dossier a été transmis à notre service contentieux.

Créances en souffrance:
{invoice_details}

- Montant principal: {total_amount} FCFA
- Intérêts de retard: {interest_amount} FCFA
- Frais de relance: {fees_amount} FCFA
- TOTAL: {grand_total} FCFA

Une procédure judiciaire sera engagée sous 48 heures.

Pour éviter ces poursuites, contactez immédiatement:
Tel: +242 06 XXX XX XX
Email: contentieux@{company_domain}

Service Contentieux
{company_name}`,
  },
  en: {
    rappel_amical: `Subject: Payment reminder - {invoice_list}

Dear {client_name},

We would like to remind you that the following invoices remain unpaid:
{invoice_details}

Total amount due: {total_amount} FCFA

This is most likely an oversight on your part. We would be grateful if you could settle this matter at your earliest convenience.

If payment has been made in the meantime, please disregard this message.

Kind regards,
{company_name}`,
    relance_ferme: `Subject: 2nd Reminder - {invoice_count} unpaid invoices

Dear {client_name},

Despite our previous reminder, we note that the following invoices remain unpaid:
{invoice_details}

Total amount: {total_amount} FCFA
Average overdue: {avg_days_overdue} days

We request that payment be made within 48 hours.

Failing a reply from you, we will be compelled to start collection proceedings.

Accounting Department
{company_name}`,
    dernier_avis: `Subject: FINAL NOTICE before proceedings - {invoice_count} invoices

Dear {client_name},

FINAL NOTICE BEFORE LEGAL ACTION

Despite our repeated reminders, the following invoices remain unpaid:
{invoice_details}

TOTAL DUE: {total_amount} FCFA

Without payment within 72 hours, your file will be transferred to our litigation department.

This is our last amicable notice.

Finance Department
{company_name}`,
    mise_demeure: `Subject: FORMAL NOTICE - Unpaid receivables

REGISTERED LETTER WITH ACKNOWLEDGEMENT OF RECEIPT

Dear {client_name},

FORMAL NOTICE

By this letter, we formally require you to pay within EIGHT (8) days:

{invoice_details}

PRINCIPAL AMOUNT: {total_amount} FCFA
LATE PAYMENT INTEREST: {interest_amount} FCFA
COLLECTION FEES: {fees_amount} FCFA
TOTAL PAYABLE: {grand_total} FCFA

Failing payment within this period, we will start any appropriate legal proceedings.

{company_name}
Legal Department`,
    pre_contentieux: `Subject: TRANSFER TO LITIGATION - File {client_code}

Dear {client_name},

Your file has been transferred to our litigation department.

Outstanding receivables:
{invoice_details}

- Principal amount: {total_amount} FCFA
- Late payment interest: {interest_amount} FCFA
- Collection fees: {fees_amount} FCFA
- TOTAL: {grand_total} FCFA

Legal proceedings will be started within 48 hours.

To avoid this action, please contact us immediately:
Tel: +242 06 XXX XX XX
Email: contentieux@{company_domain}

Litigation Department
{company_name}`,
  },
  es: {
    rappel_amical: `Asunto: Recordatorio de pago - {invoice_list}

Estimado/a {client_name}:

Le recordamos que las siguientes facturas siguen pendientes de pago:
{invoice_details}

Importe total adeudado: {total_amount} FCFA

Probablemente se trate de un olvido por su parte. Le agradecemos que regularice esta situación con la mayor brevedad posible.

Si el pago ya se ha efectuado, le rogamos que no tenga en cuenta este mensaje.

Atentamente,
{company_name}`,
    relance_ferme: `Asunto: 2.º Recordatorio - {invoice_count} facturas impagadas

Estimado/a {client_name}:

A pesar de nuestro recordatorio anterior, constatamos que las siguientes facturas siguen impagadas:
{invoice_details}

Importe total: {total_amount} FCFA
Retraso medio: {avg_days_overdue} días

Le solicitamos que efectúe el pago en un plazo de 48 horas.

De no recibir respuesta por su parte, nos veremos obligados a iniciar procedimientos de cobro.

Departamento de Contabilidad
{company_name}`,
    dernier_avis: `Asunto: ÚLTIMO AVISO antes de procedimiento - {invoice_count} facturas

Estimado/a {client_name}:

ÚLTIMO AVISO ANTES DE EMPRENDER ACCIONES LEGALES

A pesar de nuestros múltiples recordatorios, las siguientes facturas siguen impagadas:
{invoice_details}

TOTAL ADEUDADO: {total_amount} FCFA

Sin el pago en un plazo de 72 horas, su expediente será remitido a nuestro departamento de litigios.

Este es nuestro último aviso amistoso.

Dirección Financiera
{company_name}`,
    mise_demeure: `Asunto: REQUERIMIENTO FORMAL DE PAGO - Créditos impagados

CARTA CERTIFICADA CON ACUSE DE RECIBO

Estimado/a {client_name}:

REQUERIMIENTO FORMAL DE PAGO

Por la presente, le requerimos formalmente el pago en un plazo de OCHO (8) días de:

{invoice_details}

IMPORTE PRINCIPAL: {total_amount} FCFA
INTERESES DE DEMORA: {interest_amount} FCFA
GASTOS DE RECLAMACIÓN: {fees_amount} FCFA
TOTAL A PAGAR: {grand_total} FCFA

De no efectuarse el pago en dicho plazo, emprenderemos cuantas acciones judiciales resulten oportunas.

{company_name}
Departamento Jurídico`,
    pre_contentieux: `Asunto: REMISIÓN AL DEPARTAMENTO JURÍDICO - Expediente {client_code}

Estimado/a {client_name}:

Su expediente ha sido remitido a nuestro departamento de litigios.

Créditos pendientes:
{invoice_details}

- Importe principal: {total_amount} FCFA
- Intereses de demora: {interest_amount} FCFA
- Gastos de reclamación: {fees_amount} FCFA
- TOTAL: {grand_total} FCFA

Se emprenderá un procedimiento judicial en un plazo de 48 horas.

Para evitar estas acciones, póngase en contacto de inmediato:
Tel: +242 06 XXX XX XX
Email: contentieux@{company_domain}

Departamento Jurídico
{company_name}`,
  },
};

const RELANCE_SMS_TEMPLATES: Record<RelanceLang, Record<string, string>> = {
  fr: {
    rappel_amical: `Rappel: {invoice_count} factures de {total_amount} FCFA en retard. Merci de régulariser.`,
    relance_ferme: `2e RAPPEL: {invoice_count} factures impayées, total {total_amount} FCFA. Règlement sous 48h. {company_name}`,
    dernier_avis: `DERNIER AVIS: {invoice_count} factures. Sans règlement sous 72h, procédure contentieux. {company_name}`,
    mise_demeure: `MISE EN DEMEURE: Règlement {grand_total} FCFA sous 8 jours. Procédure judiciaire sinon. {company_name}`,
    pre_contentieux: `CONTENTIEUX: Dossier transmis service juridique. Total {grand_total} FCFA. Contact urgent: +242 06 XXX XX XX`,
  },
  en: {
    rappel_amical: `Reminder: {invoice_count} invoices for {total_amount} FCFA are overdue. Please settle them.`,
    relance_ferme: `2nd REMINDER: {invoice_count} unpaid invoices, total {total_amount} FCFA. Payment within 48h. {company_name}`,
    dernier_avis: `FINAL NOTICE: {invoice_count} invoices. Without payment within 72h, litigation proceedings. {company_name}`,
    mise_demeure: `FORMAL NOTICE: Pay {grand_total} FCFA within 8 days. Legal proceedings otherwise. {company_name}`,
    pre_contentieux: `LITIGATION: File sent to legal department. Total {grand_total} FCFA. Urgent contact: +242 06 XXX XX XX`,
  },
  es: {
    rappel_amical: `Recordatorio: {invoice_count} facturas de {total_amount} FCFA vencidas. Le rogamos regularice el pago.`,
    relance_ferme: `2.º RECORDATORIO: {invoice_count} facturas impagadas, total {total_amount} FCFA. Pago en 48h. {company_name}`,
    dernier_avis: `ÚLTIMO AVISO: {invoice_count} facturas. Sin pago en 72h, procedimiento de litigio. {company_name}`,
    mise_demeure: `REQUERIMIENTO FORMAL: Pago de {grand_total} FCFA en 8 días. En su defecto, acción judicial. {company_name}`,
    pre_contentieux: `LITIGIO: Expediente remitido al departamento jurídico. Total {grand_total} FCFA. Contacto urgente: +242 06 XXX XX XX`,
  },
};

/** Langues proposées dans l'éditeur de modèles (ordre d'affichage). */
const RELANCE_LANGS: RelanceLang[] = ['fr', 'en', 'es'];

/**
 * Normalise la langue préférée d'un tiers (`languePrefere`) vers 'fr' | 'en' | 'es'.
 * Accepte les libellés ('Français', 'English', 'Español', 'Anglais', 'Espagnol'…)
 * comme les codes ISO ('fr', 'en', 'es'). Défaut : 'fr'.
 */
const clientLang = (v?: string): RelanceLang => {
  // Les 2 premières lettres suffisent et sont toujours ASCII ('Français',
  // 'Español', 'Inglés'…) : pas besoin de dépoussiérer les diacritiques.
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return 'fr';
  if (s.startsWith('en') || s.startsWith('an') || s.startsWith('in')) return 'en'; // en / english / anglais / ingles
  if (s.startsWith('es') || s.startsWith('sp')) return 'es'; // es / espanol / espagnol / spanish
  return 'fr'; // fr / francais / french / inconnu
};

/** Substitue les variables {xxx} ; une variable non disponible devient vide. */
const applyRelanceVars = (template: string, vars: Record<string, string | number | null | undefined>): string =>
  template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? '' : String(value);
  });

/** Sépare la 1ʳᵉ ligne « Objet:/Subject:/Asunto: » (objet) du reste (corps). */
const splitRelanceSubjectBody = (template: string): { subject: string; body: string } => {
  const lines = template.split('\n');
  const match = lines[0]?.match(/^\s*(?:objet|subject|asunto)\s*:\s*(.*)$/i);
  if (!match) return { subject: '', body: template };
  return { subject: match[1].trim(), body: lines.slice(1).join('\n').replace(/^\n+/, '') };
};

/** Construit un lien mailto: pré-rempli (objet + corps) à partir d'un modèle. */
const buildRelanceMailto = (
  email: string,
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string => {
  const { subject, body } = splitRelanceSubjectBody(applyRelanceVars(template, vars));
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${email}${params.length ? `?${params.join('&')}` : ''}`;
};

/** Étiquettes du détail des factures, dans la langue du destinataire (données). */
const RELANCE_INVOICE_LABELS: Record<RelanceLang, { due: string; days: string }> = {
  fr: { due: 'échéance', days: 'j de retard' },
  en: { due: 'due', days: 'days overdue' },
  es: { due: 'vencimiento', days: 'días de retraso' },
};

const RecouvrementModule: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('creances');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterNiveau, setFilterNiveau] = useState('tous');
  const [selectedCreance, setSelectedCreance] = useState<CreanceEnrichie | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionFormData, setActionFormData] = useState({
    typeAction: 'APPEL' as 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE',
    date: new Date().toISOString().split('T')[0],
    heure: new Date().toTimeString().slice(0, 5),
    responsable: '',
    details: '',
    montantPromis: '',
    datePromesse: ''
  });
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [selectedFactures, setSelectedFactures] = useState<Set<string>>(new Set());

  // États pour les modales de rapports
  const [showRapportMensuelModal, setShowRapportMensuelModal] = useState(false);
  const [showAnalyseROIModal, setShowAnalyseROIModal] = useState(false);
  const [showPerformanceEquipeModal, setShowPerformanceEquipeModal] = useState(false);
  const [showPrevisionTresorerieModal, setShowPrevisionTresorerieModal] = useState(false);
  const [showDossiersRisqueModal, setShowDossiersRisqueModal] = useState(false);
  const [showExportPersonnaliseModal, setShowExportPersonnaliseModal] = useState(false);

  // États pour les modales des plans de remboursement
  const [showPlanDetailModal, setShowPlanDetailModal] = useState(false);
  const [showEnregistrerPaiementModal, setShowEnregistrerPaiementModal] = useState(false);
  const [showRelancePlanModal, setShowRelancePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanRemboursement | null>(null);
  const [showCreateDossierModal, setShowCreateDossierModal] = useState(false);
  const [showDossierActionModal, setShowDossierActionModal] = useState(false);
  const [selectedDossierAction, setSelectedDossierAction] = useState<DossierRecouvrement | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [showDossierDetail, setShowDossierDetail] = useState(false);
  const [selectedDossierDetail, setSelectedDossierDetail] = useState<DossierRecouvrement | null>(null);
  const [showDossierSummary, setShowDossierSummary] = useState(false);
  const [selectedDossierSummary, setSelectedDossierSummary] = useState<DossierRecouvrement | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState('dashboard');
  const [activeRelanceSubTab, setActiveRelanceSubTab] = useState('historique');
  const [activeParametresTab, setActiveParametresTab] = useState('configuration');
  const [selectedTemplateType, setSelectedTemplateType] = useState('rappel_amical');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTransferDossier, setSelectedTransferDossier] = useState<DossierRecouvrement | null>(null);
  const [transferDetails, setTransferDetails] = useState({
    destinataire: '',
    motif: '',
    notes: '',
    validationStatus: 'pending' as 'pending' | 'approved' | 'rejected'
  });
  // Langue d'ÉDITION des modèles (l'utilisateur peut éditer chaque langue).
  // Défaut = langue de l'interface si supportée, sinon 'fr'.
  const [templateLang, setTemplateLang] = useState<RelanceLang>(
    () => (RELANCE_LANGS as string[]).includes(language) ? (language as RelanceLang) : 'fr',
  );
  const [emailTemplates, setEmailTemplates] = useState<Record<RelanceLang, Record<string, string>>>(
    () => ({ fr: { ...RELANCE_EMAIL_TEMPLATES.fr }, en: { ...RELANCE_EMAIL_TEMPLATES.en }, es: { ...RELANCE_EMAIL_TEMPLATES.es } }),
  );
  const [smsTemplates, setSmsTemplates] = useState<Record<RelanceLang, Record<string, string>>>(
    () => ({ fr: { ...RELANCE_SMS_TEMPLATES.fr }, en: { ...RELANCE_SMS_TEMPLATES.en }, es: { ...RELANCE_SMS_TEMPLATES.es } }),
  );
  const [multipleInvoices, setMultipleInvoices] = useState(false);

  /**
   * Lien mailto: pré-rempli (objet + corps) pour une créance donnée.
   * Le modèle utilisé est celui du type de relance courant, DANS LA LANGUE DU
   * CLIENT destinataire (`clientLangue`) — pas celle de l'interface.
   * Les variables non disponibles ici (intérêts, frais, total général…) sont
   * remplacées par une chaîne vide plutôt que laissées en placeholder.
   */
  const buildCreanceMailto = React.useCallback((
    creance: {
      clientNom?: string;
      clientCode?: string;
      clientLangue?: string;
      montantTotal?: number;
      dsoMoyen?: number;
      factures?: Array<{ numero: string; montantRestant: number; dateEcheance: string; joursRetard: number }>;
    },
    email: string,
  ): string => {
    const lang = clientLang(creance.clientLangue);
    const template = emailTemplates[lang]?.[selectedTemplateType]
      || RELANCE_EMAIL_TEMPLATES[lang][selectedTemplateType]
      || '';
    const factures = creance.factures ?? [];
    const labels = RELANCE_INVOICE_LABELS[lang];
    return buildRelanceMailto(email, template, {
      client_name: creance.clientNom ?? '',
      client_code: creance.clientCode ?? '',
      company_name: user?.company ?? '',
      invoice_count: factures.length,
      invoice_list: factures.map(f => f.numero).join(', '),
      invoice_details: factures
        .map(f => `- ${f.numero} : ${formatCurrency(f.montantRestant)} FCFA (${labels.due} ${f.dateEcheance}, ${Math.max(0, f.joursRetard)} ${labels.days})`)
        .join('\n'),
      total_amount: formatCurrency(creance.montantTotal ?? 0),
      avg_days_overdue: creance.dsoMoyen ?? '',
    });
  }, [emailTemplates, selectedTemplateType, user]);

  // Onglets de la page de modification du dossier
  const dossierTabs = [
    { id: 'dashboard', label: t('dashboard.title'), icon: BarChart3 },
    { id: 'client', label: 'Client', icon: UserCircle },
    { id: 'creances', label: 'Créances', icon: Receipt },
    { id: 'contract', label: 'Contract', icon: ScrollText },
    { id: 'reminders', label: 'Reminders history', icon: Bell },
    { id: 'payments', label: 'Payments history', icon: CreditCard },
    { id: 'interest', label: 'Interest and penalties', icon: Percent },
    { id: 'repayment', label: 'Repayment plan', icon: Banknote },
    { id: 'actions', label: 'Historique des actions', icon: History },
    { id: 'attachments', label: 'Attachments', icon: FileText }
  ];

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.relative')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdownId]);

  // --- Data from DataContext for customer third parties and journal entries ---
  const { adapter } = useData();
  const recoverySvc = useMemo(() => createRecoveryService(adapter), [adapter]);
  const [customerThirdParties, setCustomerThirdParties] = useState<any[]>([]);
  const [allJournalEntries, setAllJournalEntries] = useState<any[]>([]);
  const [recoveryCases, setRecoveryCases] = useState<any[]>([]);

  // ─── Pénalités de retard (persistées, fini le mock FAC001-003) ───────────────
  interface Penalite {
    id: string; dateCreation: string; factures: string; montantCreance: number;
    joursRetard: number; tauxApplique: number; montantPenalite: number;
    statut: 'En attente validation' | 'Validée' | 'Envoyée facturation' | 'Rejetée';
    dateValidation: string | null; validateur: string | null;
  }
  const [penalites, setPenalites] = useState<Penalite[]>([]);
  const [penForm, setPenForm] = useState({ factures: '', montantCreance: '', joursRetard: '', taux: '5' });

  const loadPenalites = React.useCallback(async () => {
    try {
      const s = await adapter.getById<{ value: string }>('settings', 'recovery_penalties');
      setPenalites(s?.value ? JSON.parse(s.value) : []);
    } catch { setPenalites([]); }
  }, [adapter]);
  useEffect(() => { loadPenalites(); }, [loadPenalites]);

  const savePenalites = async (list: Penalite[]) => {
    setPenalites(list);
    const payload = { key: 'recovery_penalties', value: JSON.stringify(list), updatedAt: new Date().toISOString() };
    try {
      const cur = await adapter.getById('settings', 'recovery_penalties');
      if (cur) await adapter.update('settings', 'recovery_penalties', payload);
      else await adapter.create('settings', payload);
    } catch { /* persistance best-effort */ }
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const validatePenalite = (id: string) => savePenalites(penalites.map(p => p.id === id ? { ...p, statut: 'Validée', dateValidation: today() } : p));
  const rejectPenalite = (id: string) => savePenalites(penalites.map(p => p.id === id ? { ...p, statut: 'Rejetée', dateValidation: today() } : p));
  const sendPenalite = (id: string) => savePenalites(penalites.map(p => p.id === id ? { ...p, statut: 'Envoyée facturation' } : p));
  const createPenalite = () => {
    const creance = Number(penForm.montantCreance) || 0;
    const taux = Number(penForm.taux) || 0;
    if (creance <= 0 || taux <= 0) { toast.error(t('recovery.toastInvalidPenaltyInput')); return; }
    const p: Penalite = {
      id: `PEN-${Date.now()}`, dateCreation: today(),
      factures: penForm.factures.trim() || '—', montantCreance: creance,
      joursRetard: Number(penForm.joursRetard) || 0, tauxApplique: taux,
      montantPenalite: Math.round(creance * (taux / 100)),
      statut: 'En attente validation', dateValidation: null, validateur: null,
    };
    savePenalites([p, ...penalites]);
    setPenForm({ factures: '', montantCreance: '', joursRetard: '', taux: '5' });
    toast.success(t('recovery.toastPenaltyCreated'));
  };

  // KPIs pénalités calculés depuis la liste réelle.
  const penStats = useMemo(() => {
    const actives = penalites.filter(p => p.statut !== 'Rejetée');
    const total = actives.reduce((s, p) => s + p.montantPenalite, 0);
    const attente = penalites.filter(p => p.statut === 'En attente validation');
    const validees = penalites.filter(p => p.statut === 'Validée' || p.statut === 'Envoyée facturation');
    const tauxMoyen = actives.length ? actives.reduce((s, p) => s + p.tauxApplique, 0) / actives.length : 0;
    return {
      total,
      attente: attente.reduce((s, p) => s + p.montantPenalite, 0), attenteCount: attente.length,
      validees: validees.reduce((s, p) => s + p.montantPenalite, 0),
      tauxMoyen: Math.round(tauxMoyen * 10) / 10,
    };
  }, [penalites]);

  const reloadRecovery = React.useCallback(async () => {
    const [tps, entries, cases] = await Promise.all([
      adapter.getAll('thirdParties'),
      adapter.getAll('journalEntries'),
      adapter.getAll('recoveryCases').catch(() => []),
    ]);
    const allTps = tps as Record<string, unknown>[];
    setCustomerThirdParties(allTps.filter(tp => tp.type === 'customer' || tp.type === 'both'));
    setAllJournalEntries(entries as Record<string, unknown>[]);
    setRecoveryCases(cases as Record<string, unknown>[]);
  }, [adapter]);

  useEffect(() => { reloadRecovery(); }, [reloadRecovery]);

  // Plans de remboursement — dérivés des dossiers de recouvrement réels (recoveryCases).
  // Les champs sans source réelle (échéancier mensuel) restent volontairement vides.
  const repaymentPlans = useMemo(() => {
    return recoveryCases
      .filter((c: any) => Number(c.montantTotal || 0) > 0)
      .map((c: any) => {
        const montantTotal = Number(c.montantTotal || 0);
        const montantPaye = Number(c.montantPaye || 0);
        const montantRestant = Math.max(0, montantTotal - montantPaye);
        const progression = montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0;
        const statut = progression >= 100 ? 'Respecté' : progression > 0 ? 'Partiel' : 'En retard';
        return {
          id: c.id,
          reference: c.numeroRef || c.id,
          client: c.clientName || c.client || '—',
          montantTotal,
          montantPaye,
          montantRestant,
          progression,
          statut,
          // Champs sans source réelle (échéancier) — défauts sûrs pour les modals
          mensualite: 0,
          echeancesPayees: 0,
          prochaineEcheance: '',
        };
      });
  }, [recoveryCases]);

  const repaymentKpis = useMemo(() => {
    const actifs = repaymentPlans.filter(p => p.statut !== 'Respecté').length;
    const respectes = repaymentPlans.filter(p => p.statut === 'Respecté').length;
    const enRetard = repaymentPlans.filter(p => p.statut === 'En retard').length;
    const montantTotal = repaymentPlans.reduce((s, p) => s + p.montantRestant, 0);
    const tauxRespect = repaymentPlans.length > 0
      ? Math.round((respectes / repaymentPlans.length) * 100)
      : 0;
    return { actifs, enRetard, montantTotal, tauxRespect };
  }, [repaymentPlans]);

  // Historique des relances — dérivé des actions réelles des dossiers (recoveryCases.actions).
  const relancesData = useMemo(() => {
    return recoveryCases
      .filter((c: any) => Array.isArray(c.actions) && c.actions.length > 0)
      .map((c: any) => {
        const actions = (c.actions as any[]);
        const sorted = [...actions].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        const reponses = actions.filter(a => a.reponse || a.resultat).length;
        return {
          client: c.clientName || c.client || '—',
          nombreRelances: actions.length,
          derniereRelance: sorted[0]?.date || '',
          montantTotal: Math.max(0, Number(c.montantTotal || 0) - Number(c.montantPaye || 0)),
          statut: c.statut === 'juridique' ? 'Critique' : c.statut === 'suspendu' ? 'En attente' : 'En cours',
          tauxReponse: actions.length > 0 ? Math.round((reponses / actions.length) * 100) : 0,
          relances: sorted.map(a => ({
            date: a.date || '',
            type: a.type || 'Email',
            objet: a.resultat || a.notes || '',
            statut: 'Envoyé',
            reponse: Boolean(a.reponse),
          })),
        };
      });
  }, [recoveryCases]);

  // Build receivables per customer from recouvrement journal lines (411xxx + 42x + selected 43x/44x/46x/47x)
  const mockCreances = useMemo(() => {
    const today = new Date();
    // Group debit lines on recouvrement accounts by thirdPartyCode
    const byClient: Record<string, {
      totalDebit: number;
      totalCredit: number;
      lines: Array<{
        entryId: string;
        reference: string;
        date: string;
        debit: number;
        credit: number;
        label: string;
        thirdPartyName: string;
        thirdPartyCode: string;
        journal: string;
      }>;
    }> = {};

    for (const entry of allJournalEntries) {
      if (entry.status === 'draft') continue;
      for (const line of entry.lines) {
        if (!isRecouvrementAccount(line.accountCode)) continue;
        if (line.lettrageCode) continue; // créance lettrée = soldée → hors recouvrement
        const code = line.thirdPartyCode || line.accountCode;
        if (!byClient[code]) {
          byClient[code] = { totalDebit: 0, totalCredit: 0, lines: [] };
        }
        byClient[code].totalDebit += line.debit;
        byClient[code].totalCredit += line.credit;
        byClient[code].lines.push({
          entryId: entry.id,
          reference: entry.reference || entry.entryNumber,
          date: entry.date,
          debit: line.debit,
          credit: line.credit,
          label: line.label || entry.label,
          thirdPartyName: line.thirdPartyName || '',
          thirdPartyCode: code,
          journal: String(entry.journal || ''),
        });
      }
    }

    // Build CreanceEnrichie[] from the grouped data
    return Object.entries(byClient)
      .map(([code, data], idx) => {
        const solde = data.totalDebit - data.totalCredit;
        if (solde <= 0) return null; // No outstanding receivable

        // Lookup the third party for enrichment
        const tp = customerThirdParties.find(t => t.code === code);
        const clientName = tp?.name || data.lines[0]?.thirdPartyName || code;

        // Build invoice-like factures.
        // ⚠️ Les à-nouveaux (RAN) décomposent le solde d'ouverture en lignes
        // DÉBIT + CRÉDIT brutes (historique reporté). Les exploser en « factures »
        // gonflerait l'encours (débits bruts) et le CA. On les COLLAPSE en UN
        // seul « solde reporté » NET, et on ne garde comme vraies factures que
        // les lignes débit HORS à-nouveau (dates réelles).
        const isAN = (j: string) => j === 'AN' || j === 'RAN';
        const anLines = data.lines.filter(l => isAN(l.journal));
        const anNet = anLines.reduce((s, l) => s + l.debit - l.credit, 0);
        const mkRetard = (dateStr: string) => {
          const ech = new Date(dateStr); ech.setDate(ech.getDate() + 30);
          return Math.floor((today.getTime() - ech.getTime()) / (1000 * 60 * 60 * 24));
        };
        const mkEcheance = (dateStr: string) => {
          const ech = new Date(dateStr); ech.setDate(ech.getDate() + 30);
          return ech.toISOString().slice(0, 10);
        };
        const factures: Array<{
          factureId: string; numero: string; date: string; dateEcheance: string;
          montantOriginal: number; montantRestant: number; joursRetard: number; libelle: string; credit: number;
        }> = [];
        if (anNet > 0.005) {
          const anDate = anLines[0]?.date || `${today.getFullYear()}-01-01`;
          factures.push({
            factureId: `${code}-AN`, numero: 'Report à nouveau', date: anDate,
            dateEcheance: mkEcheance(anDate), montantOriginal: anNet, montantRestant: anNet,
            joursRetard: mkRetard(anDate), libelle: 'Solde reporté (à-nouveau)', credit: 0,
          });
        }
        data.lines.filter(l => !isAN(l.journal) && l.debit > 0).forEach((l, fIdx) => {
          factures.push({
            factureId: `${l.entryId}-${fIdx}`, numero: l.reference, date: l.date,
            dateEcheance: mkEcheance(l.date), montantOriginal: l.debit, montantRestant: l.debit,
            joursRetard: mkRetard(l.date), libelle: l.label, credit: l.credit,
          });
        });

        const maxRetard = Math.max(0, ...factures.map(f => f.joursRetard));
        // DSO moyen RÉEL = moyenne des jours de retard des factures (pas le max).
        const dsoMoyen = factures.length > 0
          ? Math.round(factures.reduce((s, f) => s + Math.max(0, f.joursRetard), 0) / factures.length)
          : 0;
        let niveauRelance: string = 'AUCUNE';
        if (maxRetard > 90) niveauRelance = 'CONTENTIEUX';
        else if (maxRetard > 60) niveauRelance = 'RELANCE_3';
        else if (maxRetard > 30) niveauRelance = 'RELANCE_2';
        else if (maxRetard > 0) niveauRelance = 'RELANCE_1';

        return {
          id: String(idx + 1),
          clientId: code,
          clientNom: clientName,
          clientCode: code,
          // Langue du destinataire : une relance se rédige dans la langue du client.
          clientLangue: (tp?.languePrefere as string | undefined) ?? '',
          factures,
          montantTotal: solde,
          joursRetard: maxRetard,
          dsoMoyen,
          niveauRelance,
          derniereRelance: null as string | null,
          prochaineRelance: null as string | null,
          relances: [] as Array<{
            id: string;
            type: string;
            date: string;
            description: string;
            moyenCommunication: string;
            responsable: string;
            resultat: string;
          }>,
          statut: maxRetard > 0 ? 'EN_COURS' : 'RESOLU',
          assigneA: '',
          commentaires: '',
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        clientId: string;
        clientNom: string;
        clientCode: string;
        clientLangue: string;
        factures: Array<{
          factureId: string;
          numero: string;
          date: string;
          dateEcheance: string;
          montantOriginal: number;
          montantRestant: number;
          joursRetard: number;
          libelle: string;
          credit: number;
        }>;
        montantTotal: number;
        joursRetard: number;
        dsoMoyen: number;
        niveauRelance: string;
        derniereRelance: string | null;
        prochaineRelance: string | null;
        relances: Array<{
          id: string;
          type: string;
          date: string;
          description: string;
          moyenCommunication: string;
          responsable: string;
          resultat: string;
        }>;
        statut: string;
        assigneA: string;
        commentaires: string;
        crmData?: CrmData;
        commercialData?: CommercialData;
      }>;
  }, [allJournalEntries, customerThirdParties]);

  // Build recovery dossiers from customers with outstanding balances
  const mockDossiers: DossierRecouvrement[] = useMemo(() => {
    return mockCreances
      .filter(c => c.montantTotal > 0)
      .map((c, idx) => ({
        id: String(idx + 1),
        numeroRef: `REC-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`,
        client: c.clientNom,
        montantPrincipal: c.montantTotal,
        // Intérêts de retard et frais de procédure non calculables : aucune source réelle
        // (table recovery_cases vide, pas de barème en base) -> 0 plutôt qu'un % inventé.
        interets: 0,
        frais: 0,
        montantTotal: c.montantTotal,
        montantPaye: 0,
        nombreFactures: c.factures.length,
        dsoMoyen: c.dsoMoyen,
        dateOuverture: c.factures[0]?.date || new Date().toISOString().slice(0, 10),
        statut: (c.joursRetard > 90 ? 'juridique' : c.joursRetard > 0 ? 'actif' : 'cloture') as 'actif' | 'suspendu' | 'cloture' | 'juridique',
        typeRecouvrement: (c.joursRetard > 90 ? 'judiciaire' : 'amiable') as 'amiable' | 'judiciaire' | 'huissier',
        responsable: '',
        derniereAction: '',
        dateAction: new Date().toISOString().slice(0, 10),
        typeAction: 'EMAIL' as ActionTypeRecouvrement,
        prochainEtape: '',
      }));
  }, [mockCreances]);

  // Créance réelle correspondant au dossier ouvert dans le détail (par client/id).
  // Fournit les VRAIES factures (lignes 411x) au lieu des données mock hardcodées.
  const detailCreance = useMemo(() => {
    if (!selectedDossierDetail) return null;
    return mockCreances.find(c =>
      c.clientNom === selectedDossierDetail.client ||
      c.clientCode === selectedDossierDetail.client ||
      c.id === selectedDossierDetail.id,
    ) || null;
  }, [selectedDossierDetail, mockCreances]);
  const detailFactures = detailCreance?.factures ?? [];

  // CA réel du client par exercice (5 ans) = total facturé (débit des lignes 411x
  // du tiers) par année, + croissance YoY. Alimente le tableau « Analyse de la
  // croissance du CA sur 5 ans » (auparavant en dur à « - »).
  const detailCAHistory = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [0, 1, 2, 3, 4].map(i => currentYear - i);
    const code = detailCreance?.clientCode;
    const byYear: Record<number, number> = {};
    if (code) {
      for (const entry of allJournalEntries) {
        if (entry.status === 'draft') continue;
        // Exclure les à-nouveaux : le solde d'ouverture reporté n'est PAS du
        // chiffre d'affaires de l'exercice (sinon CA gonflé du report).
        if (entry.journal === 'AN' || entry.journal === 'RAN') continue;
        const y = new Date(entry.date).getFullYear();
        for (const line of entry.lines) {
          if (!isRecouvrementAccount(line.accountCode)) continue;
          const lineCode = line.thirdPartyCode || line.accountCode;
          if (lineCode !== code) continue;
          byYear[y] = (byYear[y] || 0) + (line.debit || 0);
        }
      }
    }
    return years.map(y => {
      const montant = byYear[y] || 0;
      const prev = byYear[y - 1] || 0;
      const pct = prev > 0 ? Math.round(((montant - prev) / prev) * 100) : null;
      return { annee: y, montant, pct };
    });
  }, [detailCreance, allJournalEntries]);

  // Distribution d'ancienneté des créances du dossier → graphique DSO (bar chart).
  const detailAgingChart = useMemo(() => ([
    { tranche: '0-30', nb: detailFactures.filter(f => f.joursRetard <= 30).length },
    { tranche: '31-60', nb: detailFactures.filter(f => f.joursRetard > 30 && f.joursRetard <= 60).length },
    { tranche: '61-90', nb: detailFactures.filter(f => f.joursRetard > 60 && f.joursRetard <= 90).length },
    { tranche: '90+', nb: detailFactures.filter(f => f.joursRetard > 90).length },
  ]), [detailFactures]);

  const tabs = [
    { id: 'creances', label: 'Créances', icon: DollarSign },
    { id: 'dossiers', label: 'Dossiers en Recouvrement', icon: FileText },
    { id: 'relances', label: 'Relances', icon: Bell },
    { id: 'repaymentplan', label: 'Plans de Remboursement', icon: Calendar },
    { id: 'contentieux', label: 'Contentieux', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  const statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'EN_COURS', label: t('status.inProgress') },
    { value: 'RESOLU', label: 'Résolu' },
    { value: 'CONTENTIEUX', label: 'Contentieux' },
    { value: 'IRRECUPERABLE', label: 'Irrécupérable' }
  ];

  const niveauOptions = [
    { value: 'tous', label: 'Tous les niveaux' },
    { value: 'AUCUNE', label: 'Aucune relance' },
    { value: 'RELANCE_1', label: 'Relance 1' },
    { value: 'RELANCE_2', label: 'Relance 2' },
    { value: 'RELANCE_3', label: 'Relance 3' },
    { value: 'MISE_EN_DEMEURE', label: 'Mise en demeure' },
    { value: 'CONTENTIEUX', label: 'Contentieux' }
  ];

  const getStatutColor = (statut: string) => {
    const colors = {
      'EN_COURS': 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
      'RESOLU': 'bg-green-100 text-green-800',
      'CONTENTIEUX': 'bg-red-100 text-red-800',
      'IRRECUPERABLE': 'bg-gray-100 text-gray-800',
      'actif': 'bg-blue-100 text-blue-800',
      'suspendu': 'bg-orange-100 text-orange-800',
      'cloture': 'bg-gray-100 text-gray-800',
      'juridique': 'bg-primary-100 text-primary-800'
    };
    return colors[statut as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatutLabel = (statut: string) => {
    const labels = {
      'actif': 'Actif',
      'suspendu': 'Suspendu',
      'cloture': 'Clôturé',
      'juridique': 'Juridique',
      'EN_COURS': 'En cours',
      'RESOLU': 'Résolu',
      'CONTENTIEUX': 'Contentieux',
      'IRRECUPERABLE': 'Irrécupérable'
    };
    return labels[statut as keyof typeof labels] || statut;
  };

  const getNiveauColor = (niveau: string) => {
    const colors = {
      'AUCUNE': 'bg-gray-100 text-gray-800',
      'RELANCE_1': 'bg-yellow-100 text-yellow-800',
      'RELANCE_2': 'bg-orange-100 text-orange-800',
      'RELANCE_3': 'bg-red-100 text-red-800',
      'MISE_EN_DEMEURE': 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
      'CONTENTIEUX': 'bg-red-200 text-red-900'
    };
    return colors[niveau as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUrgenceColor = (joursRetard: number) => {
    if (joursRetard <= 0) return 'text-green-600';
    if (joursRetard <= 15) return 'text-yellow-600';
    if (joursRetard <= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getActionIcon = (type: string) => {
    const icons = {
      'APPEL': Phone,
      'EMAIL': Mail,
      'COURRIER': FileText,
      'SMS': MessageSquare,
      'VISITE': Users,
      'MISE_EN_DEMEURE': AlertTriangle,
      'PROCEDURE_JUDICIAIRE': Award
    };
    return icons[type as keyof typeof icons] || MessageSquare;
  };



  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const toggleFactureSelection = (factureId: string) => {
    const newSelected = new Set(selectedFactures);
    if (newSelected.has(factureId)) {
      newSelected.delete(factureId);
    } else {
      newSelected.add(factureId);
    }
    setSelectedFactures(newSelected);
  };

  const createDossierRecouvrement = () => {
    if (selectedFactures.size === 0) {
      toast.error(t('recovery.toastSelectInvoice'));
      return;
    }
    setShowCreateDossierModal(true);
  };

  const toggleDropdown = (dossierId: string) => {
    setOpenDropdownId(openDropdownId === dossierId ? null : dossierId);
  };

  const handleDossierAction = async (action: string, dossier: DossierRecouvrement) => {
    setOpenDropdownId(null);

    try {
      switch (action) {
        case 'details':
          toast(`Affichage des détails pour ${dossier.numeroRef}`);
          break;
        case 'relance':
          // Persistance RÉELLE : ajoute une action de relance au dossier (historique).
          await recoverySvc.addAction(dossier.id, { type: 'EMAIL', resultat: `Relance envoyée à ${dossier.client}`, notes: 'Relance manuelle' });
          await reloadRecovery();
          toast.success(t('recovery.toastReminderLogged', { client: String(dossier.client) }));
          break;
        case 'plan':
          toast(`Plan de règlement proposé pour ${dossier.client}`);
          break;
        case 'regle':
          await recoverySvc.updateDossier(dossier.id, { statut: 'cloture', montantPaye: dossier.montantTotal });
          await reloadRecovery();
          toast.success(t('recovery.toastCaseSettled', { ref: String(dossier.numeroRef) }));
          break;
        case 'contentieux':
          await recoverySvc.updateDossier(dossier.id, { statut: 'juridique' });
          await reloadRecovery();
          toast.success(t('recovery.toastCaseToLitigation', { client: String(dossier.client) }));
          break;
        case 'transfert':
          setSelectedTransferDossier(dossier);
          setShowTransferModal(true);
          setTransferDetails({
            destinataire: '',
            motif: '',
            notes: '',
            validationStatus: 'pending'
          });
          break;
        case 'supprimer':
          if (confirm(t('recovery.toastConfirmDeleteCase', { ref: String(dossier.numeroRef) }))) {
            await recoverySvc.deleteDossier(dossier.id);
            await reloadRecovery();
            toast.success(t('recovery.toastCaseDeleted', { ref: String(dossier.numeroRef) }));
          }
          break;
      }
    } catch (err) {
      toast.error(t('recovery.toastActionImpossible') + (err instanceof Error ? err.message : 'erreur'));
    }
  };

  const filteredCreances = mockCreances.filter(creance => {
    const matchSearch = creance.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       creance.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'tous' || creance.statut === filterStatut;
    const matchNiveau = filterNiveau === 'tous' || creance.niveauRelance === filterNiveau;
    return matchSearch && matchStatut && matchNiveau;
  });

  // Analytics computed from real receivables data
  const analyticsData = useMemo(() => {
    const montantTotalCreances = mockCreances.reduce((sum, c) => sum + c.montantTotal, 0);
    const creancesEnRetard = mockCreances.filter(c => c.joursRetard > 0).length;
    const totalJoursRetard = mockCreances.reduce((sum, c) => sum + c.joursRetard, 0);
    const delaiMoyen = mockCreances.length > 0 ? Math.round(totalJoursRetard / mockCreances.length) : 0;

    // Compute credit totals from recouvrement accounts (411xxx + 42x/43x/44x/46x/47x) for recovered amounts
    let montantRecouvre = 0;
    for (const entry of allJournalEntries) {
      for (const line of entry.lines) {
        if (isRecouvrementAccount(line.accountCode) && line.credit > 0) {
          montantRecouvre += line.credit;
        }
      }
    }
    const tauxRecouvrement = (montantTotalCreances + montantRecouvre) > 0
      ? Math.round((montantRecouvre / (montantTotalCreances + montantRecouvre)) * 1000) / 10
      : 0;

    // Repartition by niveau from real data
    const niveauMap: Record<string, { count: number; montant: number }> = {
      'Aucune relance': { count: 0, montant: 0 },
      'Relance 1': { count: 0, montant: 0 },
      'Relance 2': { count: 0, montant: 0 },
      'Relance 3': { count: 0, montant: 0 },
      'Contentieux': { count: 0, montant: 0 },
    };
    const niveauLabels: Record<string, string> = {
      'AUCUNE': 'Aucune relance',
      'RELANCE_1': 'Relance 1',
      'RELANCE_2': 'Relance 2',
      'RELANCE_3': 'Relance 3',
      'CONTENTIEUX': 'Contentieux',
    };
    for (const c of mockCreances) {
      const label = niveauLabels[c.niveauRelance] || 'Aucune relance';
      if (niveauMap[label]) {
        niveauMap[label].count++;
        niveauMap[label].montant += c.montantTotal;
      }
    }

    // Aging buckets from real data
    const agingBuckets = [
      { periode: '0-30 jours', nombre: 0, montant: 0 },
      { periode: '31-60 jours', nombre: 0, montant: 0 },
      { periode: '61-90 jours', nombre: 0, montant: 0 },
      { periode: '+90 jours', nombre: 0, montant: 0 },
    ];
    for (const c of mockCreances) {
      const bucket = c.joursRetard <= 30 ? 0 : c.joursRetard <= 60 ? 1 : c.joursRetard <= 90 ? 2 : 3;
      agingBuckets[bucket].nombre++;
      agingBuckets[bucket].montant += c.montantTotal;
    }

    // Monthly evolution from journal entries (group recouvrement accounts by month)
    const monthlyData: Record<string, { creances: number; recouvre: number }> = {};
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    for (const entry of allJournalEntries) {
      for (const line of entry.lines) {
        if (!isRecouvrementAccount(line.accountCode)) continue;
        const m = parseInt(entry.date.slice(5, 7), 10) - 1;
        const monthKey = monthNames[m] || 'N/A';
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { creances: 0, recouvre: 0 };
        monthlyData[monthKey].creances += line.debit;
        monthlyData[monthKey].recouvre += line.credit;
      }
    }
    const evolutionRecouvrement = Object.entries(monthlyData).map(([mois, d]) => ({
      mois,
      recouvre: d.recouvre,
      creances: d.creances,
    }));

    return {
      statistiques: {
        montantTotalCreances,
        montantRecouvre,
        tauxRecouvrement,
        nombreCreances: mockCreances.length,
        delaiMoyenRecouvrement: delaiMoyen,
        creancesEnRetard,
      },
      evolutionRecouvrement,
      repartitionNiveaux: Object.entries(niveauMap).map(([niveau, d]) => ({
        niveau,
        count: d.count,
        montant: d.montant,
      })),
      anciennete: agingBuckets,
    };
  }, [mockCreances, allJournalEntries]);

  // Données d'intégration Atlas FnA - Flux entrants (derived from Dexie)
  const integrationData = useMemo(() => {
    const today = new Date();
    // Build unpaid invoices from 411xxx debit lines
    const facturesImpayees = mockCreances.flatMap(c =>
      c.factures
        .filter(f => f.montantRestant > 0)
        .map(f => ({
          id: f.factureId,
          client: c.clientNom,
          montant: f.montantRestant,
          dateEcheance: f.dateEcheance,
          jourRetard: f.joursRetard > 0 ? f.joursRetard : 0,
          origine: 'Comptabilité',
        }))
    );

    // Build credit notes from recouvrement account credit lines (411xxx + 42x/43x/44x/46x/47x)
    const avoirsNoteCredit: Array<{ id: string; client: string; montant: number; motif: string; statut: string }> = [];
    for (const entry of allJournalEntries) {
      for (const line of entry.lines) {
        if (isRecouvrementAccount(line.accountCode) && line.credit > 0 && entry.label.toLowerCase().includes('avoir')) {
          avoirsNoteCredit.push({
            id: entry.entryNumber,
            client: line.thirdPartyName || line.accountCode,
            montant: line.credit,
            motif: entry.label,
            statut: 'Validé',
          });
        }
      }
    }

    return {
      comptabilite: {
        facturesImpayees,
        avoirsNoteCredit,
        reglementsPartiels: [] as Array<{ factureId: string; montant: number; date: string; mode: string; reste: number }>,
      },
      crm: { donneesClient: [] as Array<{ clientId: string; nom: string; scoring: string; risqueClient: string; chiffreAffaires: number; anciennete: number; secteur: string; contacts: Array<{ nom: string; fonction: string; tel: string; email: string }>; historiqueRelationnel: Array<{ date: string; type: string; contact: string; sujet: string }> }> },
      commercial: {
        conditionsParticulieres: [] as Array<{ clientId: string; conditionPaiement: string; remiseAccordee: number; plafondCredit: number }>,
        litigesCommerciaux: [] as Array<{ clientId: string; sujet: string; statut: string; impact: string; montant: number }>,
        contratsSpecifiques: [] as Array<{ clientId: string; typeContrat: string; duree: string; clausesPaiement: string }>,
      },
      achats: {
        litigesFournisseurs: [] as Array<{ fournisseur: string; montant: number; sujet: string; statut: string }>,
        compensations: [] as Array<{ client: string; montantClient: number; montantFournisseur: number; solde: number }>,
      },
    };
  }, [mockCreances, allJournalEntries]);

  // Integration status derived from Dexie data counts
  const statutIntegrations = useMemo(() => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    return [
      { module: 'Comptabilité', statut: 'Connecté', dernierSync: now, nbTransactions: allJournalEntries.length },
      { module: 'CRM', statut: 'Connecté', dernierSync: now, nbTransactions: customerThirdParties.length },
      { module: 'Commercial', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
      { module: 'Finance', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
      { module: 'Achats', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
      { module: 'Reporting', statut: 'Connecté', dernierSync: now, nbTransactions: 0 },
    ];
  }, [allJournalEntries.length, customerThirdParties.length]);

  // Workflow validation rules (configuration constants)
  const workflowValidation = {
    matriceApprobation: [
      { montantMin: 0, montantMax: 100000, approbateur: 'Agent Recouvrement', delaiMax: '24h' },
      { montantMin: 100001, montantMax: 500000, approbateur: 'Superviseur Recouvrement', delaiMax: '48h' },
      { montantMin: 500001, montantMax: 2000000, approbateur: 'Manager Crédit', delaiMax: '72h' },
      { montantMin: 2000001, montantMax: 999999999, approbateur: 'Directeur Financier', delaiMax: '5 jours' }
    ],
    enCoursValidation: [] as Array<{ dossier: string; montant: number; demandeur: string; approbateur: string; statut: string; depuis: string }>,
  };

  // Notifications derived from overdue receivables
  const notificationsEnCours = useMemo(() => {
    return mockCreances
      .filter(c => c.joursRetard > 0)
      .slice(0, 5)
      .map((c, idx) => ({
        type: idx % 2 === 0 ? 'Email' : 'Dashboard',
        destinataire: c.assigneA || 'Non assigné',
        sujet: `Relance ${c.clientNom} - ${formatCurrency(c.montantTotal)}`,
        alerte: `Créance en retard de ${c.joursRetard} jours`,
        message: `Relance: ${c.clientNom}`,
        statut: 'En attente',
        heure: new Date().toTimeString().slice(0, 5),
      }));
  }, [mockCreances]);

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#2D7D9A', '#F4A228', '#6B9E6E', '#8BBCCC'];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">Tiers</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('thirdParty.collection')}</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.pageSubtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <PageHeaderActions />
            <button className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-text-tertiary)] text-white rounded-lg hover:bg-[var(--color-text-secondary)] transition-colors" aria-label={t('recovery.download')}>
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
            </button>

            <button
              onClick={() => setShowActionModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('recovery.newReminder')}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mt-6 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[var(--color-text-tertiary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Créances Tab */}
      {activeTab === 'creances' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.totalReceivables')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {formatCurrency(analyticsData.statistiques.montantTotalCreances)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.collectedAmount')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {formatCurrency(analyticsData.statistiques.montantRecouvre)}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.collectionRateShort')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {analyticsData.statistiques.tauxRecouvrement}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-[var(--color-primary)]" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">{t('recovery.averageDelayTitle')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {analyticsData.statistiques.delaiMoyenRecouvrement}j
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
                <input
                  type="text"
                  placeholder={t('recovery.searchByNameOrCodePh')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)] focus:border-transparent"
                />
              </div>

              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
              >
                {statutOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <select
                value={filterNiveau}
                onChange={(e) => setFilterNiveau(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
              >
                {niveauOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50" aria-label={t('recovery.filter')}>
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Créances Table */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
            {selectedFactures.size > 0 && (
              <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedFactures.size} facture{selectedFactures.size > 1 ? 's' : ''} sélectionnée{selectedFactures.size > 1 ? 's' : ''}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={createDossierRecouvrement}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {t('recovery.createCollectionCase')}
                    </button>
                    <button
                      onClick={() => setSelectedFactures(new Set())}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                    >
                      {t('recovery.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-8"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.customer')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.amount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Retard</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Niveau</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.lastReminder')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.assignedTo')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.status')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('recovery.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCreances.map((creance) => (
                    <React.Fragment key={creance.id}>
                      {/* Ligne principale du client */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleClientExpansion(creance.id)}
                            className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100"
                          >
                            {expandedClients.has(creance.id) ?
                              <ChevronDown className="w-4 h-4 text-gray-600" /> :
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            }
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${
                              creance.crmData ?
                                (creance.crmData.scoreRisque > 70 ? 'bg-green-100' :
                                 creance.crmData.scoreRisque > 40 ? 'bg-orange-100' : 'bg-red-100') :
                                'bg-gray-100'
                            }`}>
                              <Building className={`w-5 h-5 ${
                                creance.crmData ?
                                  (creance.crmData.scoreRisque > 70 ? 'text-green-600' :
                                   creance.crmData.scoreRisque > 40 ? 'text-orange-600' : 'text-red-600') :
                                  'text-gray-600'
                              }`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{creance.clientNom}</div>
                            <div className="text-sm text-gray-700">{creance.clientCode}</div>
                            {creance.crmData && (
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  creance.crmData.scoreRisque > 70 ? 'bg-green-100 text-green-800' :
                                  creance.crmData.scoreRisque > 40 ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  <Users className="w-3 h-3 mr-1" />
                                  Score: {creance.crmData.scoreRisque}
                                </span>
                                <span className="text-xs text-gray-700">
                                  CA: {formatCurrency(creance.crmData.chiffreAffairesAnnuel)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(creance.montantTotal)}
                        </div>
                        <div className="text-sm text-gray-700">
                          {creance.factures.length} facture{creance.factures.length > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getUrgenceColor(creance.joursRetard)}`}>
                          {creance.joursRetard > 0 ? `${creance.joursRetard} jours` : 'À jour'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNiveauColor(creance.niveauRelance)}`}>
                          {creance.niveauRelance.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {creance.derniereRelance ? formatDate(creance.derniereRelance) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{creance.assigneA}</p>
                          {creance.commercialData && (
                            <p className="text-xs text-gray-700">
                              Com: {creance.commercialData.gestionnaireCom}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(creance.statut)}`}>
                          {creance.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2 justify-end">
                          <button
                            onClick={() => setSelectedCreance(creance as unknown as CreanceEnrichie)}
                            className="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 relative"
                            title={t('recovery.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                            {creance.crmData && creance.commercialData && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCreance(creance as unknown as CreanceEnrichie);
                              setShowActionModal(true);
                            }}
                            className="p-1 text-orange-600 hover:text-orange-900 relative"
                            title={t('recovery.newAction')}
                          >
                            <Bell className="w-4 h-4" />
                            {creance.crmData?.scoreRisque && creance.crmData.scoreRisque < 40 && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            )}
                          </button>
                          <button
                            className="p-1 text-green-600 hover:text-green-900 relative"
                            title={creance.crmData?.contactPrincipal?.telephone ?
                              `Appeler ${creance.crmData.contactPrincipal.nom}` : 'Appeler'}
                            onClick={() => {
                              if (creance.crmData?.contactPrincipal?.telephone) {
                                window.open(`tel:${creance.crmData.contactPrincipal.telephone}`);
                              }
                            }}
                          >
                            <Phone className="w-4 h-4" />
                            {creance.crmData?.contactPrincipal && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </button>
                          <button
                            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-secondary)]/80 relative"
                            title={creance.crmData?.contactPrincipal?.email ?
                              `Email à ${creance.crmData.contactPrincipal.nom}` : 'Email'}
                            onClick={() => {
                              if (creance.crmData?.contactPrincipal?.email) {
                                // Relance pré-remplie (objet + corps) dans la langue DU CLIENT
                                window.open(buildCreanceMailto(creance, creance.crmData.contactPrincipal.email));
                              }
                            }}
                          >
                            <Mail className="w-4 h-4" />
                            {creance.crmData?.contactPrincipal && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </button>
                          {creance.commercialData?.litigesActifs && creance.commercialData.litigesActifs > 0 && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="w-4 h-4 text-red-500" {...({ title: `${creance.commercialData.litigesActifs} litige(s) actif(s)` } as Record<string, unknown>)} />
                            </div>
                          )}
                        </div>
                        </td>
                      </tr>

                      {/* Lignes de détail des factures (expandable) */}
                      {expandedClients.has(creance.id) && creance.factures.map((facture: InvoiceDebt) => (
                        <tr key={facture.factureId} className="bg-gray-50">
                          <td className="px-6 py-3"></td>
                          <td className="px-6 py-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedFactures.has(facture.factureId)}
                                onChange={() => toggleFactureSelection(facture.factureId)}
                                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="pl-8">
                                <div className="text-sm font-medium text-gray-700">
                                  Facture {facture.numero}
                                </div>
                                <div className="text-xs text-gray-700">
                                  Émise le {formatDate(facture.date)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-sm text-gray-700">
                              {formatCurrency(facture.montantRestant)}
                            </div>
                            <div className="text-xs text-gray-700">
                              sur {formatCurrency(facture.montantOriginal)}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className={`text-sm ${getUrgenceColor(facture.joursRetard)}`}>
                              {facture.joursRetard > 0 ? `${facture.joursRetard} jours` :
                               facture.joursRetard < 0 ? `Dans ${Math.abs(facture.joursRetard)} jours` : 'Échue aujourd\'hui'}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-sm text-gray-600">
                              Échéance: {formatDate(facture.dateEcheance)}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-700">-</td>
                          <td className="px-6 py-3 text-sm text-gray-700">-</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              facture.joursRetard > 30 ? 'bg-red-100 text-red-800' :
                              facture.joursRetard > 0 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {facture.joursRetard > 30 ? 'Critique' :
                               facture.joursRetard > 0 ? 'En retard' : 'À jour'}
                            </span>
                          </td>
                          <td className="px-6 py-3"></td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab avec sous-onglets */}
      {activeTab === 'analytics' && <AnalyticsTab analyticsData={analyticsData} />}

      {/* Créance Detail Modal */}
      {selectedCreance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)]">
                  Détail Créance - {selectedCreance.clientNom}
                </h2>
                <button
                  onClick={() => setSelectedCreance(null)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Section principale avec informations organisées */}
              <div className="space-y-6 mb-6">
                {/* Première ligne: Informations de base */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informations client */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('recovery.customerInfo')}</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nom</label>
                        <p className="text-[var(--color-primary)]">{selectedCreance.clientNom}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Code</label>
                        <p className="text-[var(--color-primary)]">{selectedCreance.clientCode}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('recovery.assignedTo')}</label>
                        <p className="text-[var(--color-primary)]">{selectedCreance.assigneA}</p>
                      </div>
                    </div>
                  </div>

                  {/* Informations créance */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('recovery.receivableInfo')}</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('recovery.totalAmountLower')}</label>
                        <p className="text-[var(--color-primary)] font-semibold">{formatCurrency(selectedCreance.montantTotal)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('recovery.daysOverdue')}</label>
                        <p className={`font-semibold ${getUrgenceColor(selectedCreance.joursRetard)}`}>
                          {selectedCreance.joursRetard > 0 ? `${selectedCreance.joursRetard} jours` : 'À jour'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('recovery.reminderLevel')}</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getNiveauColor(selectedCreance.niveauRelance)}`}>
                          {selectedCreance.niveauRelance.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deuxième ligne: Données CRM et Commerciales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Données CRM enrichies */}
                  {selectedCreance.crmData && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[var(--color-primary)] flex items-center">
                        <Users className="w-5 h-5 mr-2 text-blue-600" />
                        {t('recovery.crmProfile')}
                      </h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-blue-700">{t('recovery.riskScore')}</label>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedCreance.crmData.scoreRisque > 70 ? 'bg-green-100 text-green-800' :
                            selectedCreance.crmData.scoreRisque > 40 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedCreance.crmData.scoreRisque}/100
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">{t('recovery.paymentCategory')}</label>
                          <p className="text-blue-900">{selectedCreance.crmData.categoriePaiement}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">CA annuel</label>
                          <p className="text-blue-900 font-semibold">{formatCurrency(selectedCreance.crmData.chiffreAffairesAnnuel)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">{t('recovery.seniority')}</label>
                          <p className="text-blue-900">{selectedCreance.crmData.ancienneteClient}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700">{t('recovery.mainContact')}</label>
                          <div className="text-blue-900">
                            <p className="font-medium">{selectedCreance.crmData.contactPrincipal.nom}</p>
                            <p className="text-sm">{selectedCreance.crmData.contactPrincipal.fonction}</p>
                            <div className="flex flex-col space-y-1 mt-1">
                              <a href={`tel:${selectedCreance.crmData.contactPrincipal.telephone}`}
                                 className="text-xs text-blue-600 hover:text-blue-800">
                                {selectedCreance.crmData.contactPrincipal.telephone}
                              </a>
                              <a href={buildCreanceMailto(selectedCreance, selectedCreance.crmData.contactPrincipal.email)}
                                 className="text-xs text-blue-600 hover:text-blue-800">
                                {selectedCreance.crmData.contactPrincipal.email}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Données commerciales */}
                  {selectedCreance.commercialData && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-[var(--color-primary)] flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2 text-primary-600" />
                        {t('recovery.commercialData')}
                      </h3>
                      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-primary-700">Gestionnaire</label>
                          <p className="text-primary-900">{selectedCreance.commercialData.gestionnaireCom}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary-700">{t('recovery.businessSector')}</label>
                          <p className="text-primary-900">{selectedCreance.commercialData.secteurActivite}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary-700">{t('recovery.specialTerms')}</label>
                          <div className="text-primary-900 space-y-1">
                            <p className="text-sm">Délai: {selectedCreance.commercialData.conditionsParticulieres.delaiPaiement}</p>
                            <p className="text-sm">Remise: {selectedCreance.commercialData.conditionsParticulieres.remiseAccordee}</p>
                            <p className="text-sm">Plafond: {formatCurrency(selectedCreance.commercialData.conditionsParticulieres.plafondCredit)}</p>
                          </div>
                        </div>
                        {selectedCreance.commercialData.litigesActifs > 0 && (
                          <div className="bg-red-100 border border-red-200 rounded p-2">
                            <span className="text-sm font-medium text-red-800">
                              {selectedCreance.commercialData.litigesActifs} litige{selectedCreance.commercialData.litigesActifs > 1 ? 's' : ''} actif{selectedCreance.commercialData.litigesActifs > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Factures */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Factures</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.number')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.dueDate')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{t('recovery.originalAmount')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Restant</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Retard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedCreance.factures.map((facture: InvoiceDebt) => (
                        <tr key={facture.factureId}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{facture.numero}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(facture.date)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDate(facture.dateEcheance)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(facture.montantOriginal)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(facture.montantRestant)}</td>
                          <td className={`px-4 py-3 text-sm text-center font-medium ${getUrgenceColor(facture.joursRetard)}`}>
                            {facture.joursRetard > 0 ? `${facture.joursRetard}j` : 'OK'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historique des relances */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.reminderHistory')}</h3>
                <div className="space-y-3">
                  {selectedCreance.relances.map((relance: CollectionAction) => {
                    const IconComponent = getActionIcon(relance.type);
                    return (
                      <div key={relance.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-[var(--color-primary)]">{relance.description}</h4>
                            <span className="text-sm text-[var(--color-text-secondary)]">{formatDate(relance.date)}</span>
                          </div>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            <strong>Moyen:</strong> {relance.moyenCommunication} •
                            <strong> Responsable:</strong> {relance.responsable}
                          </p>
                          {relance.resultat && (
                            <p className="text-sm text-green-600 mt-1">
                              <strong>{t('recovery.resultColon')}</strong> {relance.resultat}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Commentaires */}
              {selectedCreance.commentaires && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">{t('recovery.comments')}</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-[var(--color-primary)]">{selectedCreance.commentaires}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedCreance(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('recovery.close')}
                </button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  {t('recovery.newActionTitle')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Relances avec sous-onglets */}
      {activeTab === 'relances' && (
        <div className="space-y-6">
          {/* KPIs des relances — dérivés des actions réelles des dossiers (relancesData).
              Les compteurs sans source (en attente / sans réponse) restent "—". */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">{t('recovery.totalReminders')}</div>
              <div className="text-lg font-bold text-blue-900">
                {relancesData.length > 0 ? relancesData.reduce((s, r) => s + r.nombreRelances, 0) : '—'}
              </div>
              <div className="text-xs text-blue-600 mt-1">{t('recovery.allPeriods')}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-yellow-600 font-medium">{t('recovery.pendingTitle')}</div>
              <div className="text-lg font-bold text-yellow-900">—</div>
              <div className="text-xs text-yellow-600 mt-1">{t('recovery.toSend')}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">{t('recovery.responseRateTitle')}</div>
              <div className="text-lg font-bold text-green-900">
                {relancesData.length > 0
                  ? `${Math.round(relancesData.reduce((s, r) => s + r.tauxReponse, 0) / relancesData.length)}%`
                  : '—'}
              </div>
              <div className="text-xs text-green-600 mt-1">{t('recovery.averageCases')}</div>
            </div>
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="text-sm text-primary-600 font-medium">{t('recovery.customersReminded')}</div>
              <div className="text-lg font-bold text-primary-900">
                {relancesData.length > 0 ? relancesData.length : '—'}
              </div>
              <div className="text-xs text-primary-600 mt-1">{t('recovery.allPeriods')}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-red-600 font-medium">{t('recovery.noResponse')}</div>
              <div className="text-lg font-bold text-red-900">—</div>
              <div className="text-xs text-red-600 mt-1">+3 relances</div>
            </div>
          </div>

          {/* Sous-onglets */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
            <div className="border-b border-[var(--color-border)]">
              <div className="flex">
                <button
                  onClick={() => setActiveRelanceSubTab('historique')}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeRelanceSubTab === 'historique'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  {t('recovery.reminderHistory')}
                </button>
                <button
                  onClick={() => setActiveRelanceSubTab('parametres')}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeRelanceSubTab === 'parametres'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  {t('recovery.reminderSettings')}
                </button>
              </div>
            </div>

            {/* Contenu du sous-onglet Historique */}
            {activeRelanceSubTab === 'historique' && (
              <div>
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-[var(--color-primary)]">{t('recovery.reminderHistoryByCustomer')}</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('recovery.searchCustomerPh')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    {t('recovery.filter')}
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--color-border)]">
              {relancesData.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {t('recovery.noReminderRecorded')}
                </div>
              )}
              {relancesData.map((clientData, index) => (
                <div key={index} className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
                    onClick={() => {
                      const key = `relance-${index}`;
                      if (expandedClients.has(key)) {
                        const newExpanded = new Set(expandedClients);
                        newExpanded.delete(key);
                        setExpandedClients(newExpanded);
                      } else {
                        setExpandedClients(new Set([...expandedClients, key]));
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {expandedClients.has(`relance-${index}`) ? (
                        <ChevronDown className="w-5 h-5 text-gray-700" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      )}
                      <div>
                        <h3 className="font-semibold text-[var(--color-primary)]">{clientData.client}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{clientData.nombreRelances} relances</span>
                          <span>•</span>
                          <span>Dernière: {clientData.derniereRelance}</span>
                          <span>•</span>
                          <span className="font-medium">{formatCurrency(clientData.montantTotal)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{t('recovery.responseRate')}</div>
                        <div className="text-lg font-semibold">{clientData.tauxReponse}%</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        clientData.statut === 'En cours' ? 'bg-blue-100 text-blue-800' :
                        clientData.statut === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {clientData.statut}
                      </span>
                    </div>
                  </div>

                  {/* Détails des relances expandable */}
                  {expandedClients.has(`relance-${index}`) && (
                    <div className="mt-4 ml-9">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">{t('recovery.reminderHistoryLower')}</h4>
                        <div className="space-y-2">
                          {clientData.relances.map((relance, rIndex) => (
                            <div key={rIndex} className="bg-white rounded-lg p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  relance.type === 'Email' ? 'bg-blue-100' :
                                  relance.type === 'Appel' ? 'bg-green-100' :
                                  relance.type === 'SMS' ? 'bg-primary-100' :
                                  relance.type === 'Courrier' || relance.type === 'Courrier AR' ? 'bg-yellow-100' :
                                  'bg-red-100'
                                }`}>
                                  {relance.type === 'Email' && <Mail className="w-5 h-5 text-blue-600" />}
                                  {relance.type === 'Appel' && <Phone className="w-5 h-5 text-green-600" />}
                                  {relance.type === 'SMS' && <MessageSquare className="w-5 h-5 text-primary-600" />}
                                  {(relance.type === 'Courrier' || relance.type === 'Courrier AR') && <Send className="w-5 h-5 text-yellow-600" />}
                                  {relance.type === 'Huissier' && <Scale className="w-5 h-5 text-red-600" />}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{relance.objet}</div>
                                  <div className="text-sm text-gray-600">
                                    {relance.date} • {relance.type}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  relance.statut === 'Envoyé' || relance.statut === 'Lu' ? 'bg-blue-100 text-blue-800' :
                                  relance.statut === 'Complété' || relance.statut === 'Reçu' ? 'bg-green-100 text-green-800' :
                                  relance.statut === 'Sans réponse' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {relance.statut}
                                </span>
                                {relance.reponse ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-gray-700" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            {t('recovery.newReminder')}
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            {t('recovery.viewCase')}
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            {t('recovery.export')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
              </div>
            )}

            {/* Contenu du sous-onglet Paramètres */}
            {activeRelanceSubTab === 'parametres' && (
              <div>
                {/* Sous-onglets des paramètres */}
                <div className="border-b border-gray-200 bg-white">
                  <nav className="-mb-px flex space-x-8 px-6">
                    <button
                      onClick={() => setActiveParametresTab('configuration')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'configuration'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t('recovery.generalConfiguration')}
                    </button>
                    <button
                      onClick={() => setActiveParametresTab('scenarios')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'scenarios'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t('recovery.automaticScenarios')}
                    </button>
                    <button
                      onClick={() => setActiveParametresTab('templates')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'templates'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t('recovery.messageTemplates')}
                    </button>
                    <button
                      onClick={() => setActiveParametresTab('exclusions')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeParametresTab === 'exclusions'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t('recovery.exclusionRules')}
                    </button>
                  </nav>
                </div>

                {/* Contenu des sous-onglets */}
                <div className="p-6 bg-gray-50 min-h-[600px]">
                  {/* Configuration Générale */}
                  {activeParametresTab === 'configuration' && (
                    <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-gray-600" />
                      {t('recovery.generalConfiguration')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.delayBeforeFirstReminder')}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-24"
                            defaultValue="7"
                          />
                          <span className="text-sm text-gray-600">{t('recovery.daysAfterDueDate')}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.intervalBetweenReminders')}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-24"
                            defaultValue="7"
                          />
                          <span className="text-sm text-gray-600">jours</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.maxNumberOfReminders')}
                        </label>
                        <input
                          type="number"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-24"
                          defaultValue="3"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.minAmountForReminder')}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-32"
                            defaultValue="10000"
                          />
                          <span className="text-sm text-gray-600">FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}

                  {/* Scénarios Automatiques */}
                  {activeParametresTab === 'scenarios' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-gray-600" />
                      {t('recovery.automaticReminderScenarios')}
                    </h3>
                    <div className="space-y-4">
                      {[
                        {
                          niveau: 1,
                          delai: 7,
                          type: 'Email',
                          template: 'Rappel amical',
                          actif: true
                        },
                        {
                          niveau: 2,
                          delai: 14,
                          type: 'Email + SMS',
                          template: 'Relance ferme',
                          actif: true
                        },
                        {
                          niveau: 3,
                          delai: 21,
                          type: 'Appel téléphonique',
                          template: 'Contact direct',
                          actif: true
                        },
                        {
                          niveau: 4,
                          delai: 30,
                          type: 'Courrier recommandé',
                          template: 'Mise en demeure',
                          actif: true
                        },
                        {
                          niveau: 5,
                          delai: 45,
                          type: 'Procédure judiciaire',
                          template: 'Transfert contentieux',
                          actif: false
                        }
                      ].map((scenario) => (
                        <div key={scenario.niveau} className="bg-white rounded-lg p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-600">
                              {scenario.niveau}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                Niveau {scenario.niveau} - {scenario.template}
                              </div>
                              <div className="text-sm text-gray-600">
                                À J+{scenario.delai} • Type: {scenario.type}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              {t('recovery.edit')}
                            </button>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                defaultChecked={scenario.actif}
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                      </div>
                    </div>
                  )}

                  {/* Templates de Messages */}
                  {activeParametresTab === 'templates' && (
                    <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      {t('recovery.templatesByReminderType')}
                    </h3>

                    {/* Sélecteur de type de template */}
                    <div className="mb-6 flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.reminderType')}
                        </label>
                        <select
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                          value={selectedTemplateType}
                          onChange={(e) => setSelectedTemplateType(e.target.value)}
                        >
                          <option value="rappel_amical">{t('recovery.level1FriendlyReminder')}</option>
                          <option value="relance_ferme">{t('recovery.level2FirmReminder')}</option>
                          <option value="dernier_avis">{t('recovery.level3FinalNotice')}</option>
                          <option value="mise_demeure">{t('recovery.level4FormalNotice')}</option>
                          <option value="pre_contentieux">{t('recovery.level5PreLitigation')}</option>
                        </select>
                      </div>
                      {/* Langue du modèle : la relance part dans la langue du CLIENT */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.templateLanguage')}
                        </label>
                        <select
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
                          value={templateLang}
                          onChange={(e) => setTemplateLang(e.target.value as RelanceLang)}
                        >
                          <option value="fr">{t('recovery.languageFrench')}</option>
                          <option value="en">{t('recovery.languageEnglish')}</option>
                          <option value="es">{t('recovery.languageSpanish')}</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">{t('recovery.templateLanguageHint')}</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg">
                        <input
                          type="checkbox"
                          id="multiple-invoices"
                          checked={multipleInvoices}
                          onChange={(e) => setMultipleInvoices(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <label htmlFor="multiple-invoices" className="text-sm font-medium text-gray-700">
                          {t('recovery.multipleInvoices')}
                        </label>
                      </div>
                    </div>

                    {/* Info sur les variables disponibles */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium mb-2">{t('recovery.availableVariables')}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-700">
                        <span>• {`{client_name}`} - Nom du client</span>
                        <span>• {`{company_name}`} - Nom de l'entreprise</span>
                        {multipleInvoices ? (
                          <>
                            <span>• {`{invoice_count}`} - Nombre de factures</span>
                            <span>• {`{invoice_list}`} - Liste des numéros</span>
                            <span>• {`{invoice_details}`} - Détails des factures</span>
                            <span>• {`{avg_days_overdue}`} - Retard moyen</span>
                          </>
                        ) : (
                          <>
                            <span>• {`{invoice_number}`} - N° facture</span>
                            <span>• {`{invoice_date}`} - Date facture</span>
                            <span>• {`{due_date}`} - Date échéance</span>
                            <span>• {`{days_overdue}`} - Jours de retard</span>
                          </>
                        )}
                        <span>• {`{total_amount}`} - Montant total</span>
                        <span>• {`{interest_amount}`} - Intérêts</span>
                        <span>• {`{fees_amount}`} - Frais</span>
                        <span>• {`{grand_total}`} - Total général</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Templates éditables */}
                      <div className="space-y-4">
                        {/* Template Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('recovery.emailTemplate')}
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={12}
                            value={emailTemplates[templateLang]?.[selectedTemplateType] ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setEmailTemplates(prev => ({
                                ...prev,
                                [templateLang]: { ...prev[templateLang], [selectedTemplateType]: value }
                              }));
                            }}
                          />
                        </div>

                        {/* Template SMS */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('recovery.smsTemplate')}
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            value={smsTemplates[templateLang]?.[selectedTemplateType] ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setSmsTemplates(prev => ({
                                ...prev,
                                [templateLang]: { ...prev[templateLang], [selectedTemplateType]: value }
                              }));
                            }}
                          />
                        </div>

                        {/* Template Courrier */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('recovery.postalTemplate')}
                          </label>
                          <div className="flex items-center gap-2 mb-2">
                            <input type="checkbox" defaultChecked={selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux'} />
                            <span className="text-sm text-gray-600">{t('recovery.sendRegisteredMail')}</span>
                          </div>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            value={
                              selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux' ?
                                `Format courrier formel avec en-tête entreprise, références légales et signature.` :
                                `Utilise le template email pour génération du courrier.`
                            }
                            onChange={(e) => {}}
                          />
                        </div>
                      </div>

                      {/* Aperçu Email HTML */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {t('recovery.htmlEmailPreview')}
                          </label>
                          <button
                            onClick={() => setShowEmailPreview(!showEmailPreview)}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            {showEmailPreview ? 'Voir HTML' : 'Voir rendu'}
                          </button>
                        </div>

                        {!showEmailPreview ? (
                          <div className="bg-white border border-gray-300 rounded-lg h-[500px] overflow-hidden">
                            <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6', height: '100%', overflowY: 'auto' }}>
                              {/* En-tête email */}
                              <div style={{ backgroundColor: 'var(--color-background)', padding: '20px' }}>
                                <div style={{ backgroundColor: '#235A6E', height: '4px', margin: '-20px -20px 20px -20px' }}></div>
                                <img src="/logo.png" alt="Logo" style={{ height: '40px', marginBottom: '10px' }} />
                                <h2 style={{ color: '#333', margin: '0', fontSize: '20px' }}>
                                  {selectedTemplateType === 'rappel_amical' && 'Rappel de paiement - Facture en attente'}
                                  {selectedTemplateType === 'relance_ferme' && '2ème Relance - Action requise'}
                                  {selectedTemplateType === 'dernier_avis' && 'DERNIER AVIS avant procédure'}
                                  {selectedTemplateType === 'mise_demeure' && 'MISE EN DEMEURE'}
                                  {selectedTemplateType === 'pre_contentieux' && 'TRANSMISSION AU SERVICE CONTENTIEUX'}
                                </h2>
                              </div>

                              {/* Corps email */}
                              <div style={{ padding: '20px', backgroundColor: '#fff' }}>
                                <p style={{ fontSize: '14px', color: '#333' }}>Madame, Monsieur <strong>SARL CONGO BUSINESS</strong>,</p>

                                {selectedTemplateType === 'mise_demeure' && (
                                  <div style={{ backgroundColor: '#fee', padding: '15px', borderLeft: '4px solid #C0322B', margin: '20px 0' }}>
                                    <strong style={{ color: '#C0322B', fontSize: '16px' }}>{t('recovery.formalNoticeCaps')}</strong>
                                    <p style={{ margin: '10px 0 0 0', color: '#721c24', fontSize: '13px' }}>
                                      {t('recovery.letterIsFormalNotice')}
                                    </p>
                                  </div>
                                )}

                                {selectedTemplateType === 'pre_contentieux' && (
                                  <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderLeft: '4px solid #E89A2E', margin: '20px 0' }}>
                                    <strong style={{ color: '#856404', fontSize: '16px' }}>{t('recovery.caseSentToLitigationCaps')}</strong>
                                  </div>
                                )}

                                <div style={{ backgroundColor: 'var(--color-background)', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
                                  <h3 style={{ margin: '0 0 15px 0', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                    {multipleInvoices ? 'Détails des créances:' : 'Détails de la créance:'}
                                  </h3>
                                  {multipleInvoices ? (
                                    <>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                                        <thead>
                                          <tr style={{ borderBottom: '1px solid #e5e5e5' }}>
                                            <th style={{ padding: '8px 0', textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 'bold' }}>N° Facture</th>
                                            <th style={{ padding: '8px 0', textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 'bold' }}>{t('recovery.amount')}</th>
                                            <th style={{ padding: '8px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 'bold' }}>{t('recovery.dueDate')}</th>
                                            <th style={{ padding: '8px 0', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 'bold' }}>Retard</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#333' }}>FAC-2024-089</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#C0322B', textAlign: 'right', fontWeight: 'bold' }}>185,000 FCFA</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#666', textAlign: 'center' }}>15/12/2024</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#C0322B', textAlign: 'center' }}>37 jours</td>
                                          </tr>
                                          <tr>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#333' }}>FAC-2024-095</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#C0322B', textAlign: 'right', fontWeight: 'bold' }}>150,000 FCFA</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#666', textAlign: 'center' }}>20/12/2024</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#C0322B', textAlign: 'center' }}>32 jours</td>
                                          </tr>
                                          <tr>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#333' }}>FAC-2024-103</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#C0322B', textAlign: 'right', fontWeight: 'bold' }}>150,000 FCFA</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#666', textAlign: 'center' }}>28/12/2024</td>
                                            <td style={{ padding: '6px 0', fontSize: '12px', color: '#C0322B', textAlign: 'center' }}>24 jours</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <div style={{ borderTop: '2px solid #525252', paddingTop: '10px' }}>
                                        <table style={{ width: '100%' }}>
                                          <tbody>
                                            <tr>
                                              <td style={{ padding: '4px 0', color: '#666', fontSize: '13px', fontWeight: 'bold' }}>{t('recovery.invoiceCountColon')}</td>
                                              <td style={{ padding: '4px 0', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>3</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '4px 0', color: '#666', fontSize: '13px', fontWeight: 'bold' }}>{t('recovery.averageDelayColon')}</td>
                                              <td style={{ padding: '4px 0', color: '#C0322B', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>31 jours</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '4px 0', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>MONTANT TOTAL:</td>
                                              <td style={{ padding: '4px 0', color: '#C0322B', fontSize: '16px', textAlign: 'right', fontWeight: 'bold' }}>485,000 FCFA</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </>
                                  ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                      <tbody>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px', width: '40%' }}>N° Facture:</td>
                                          <td style={{ padding: '8px 0', fontWeight: 'bold', fontSize: '13px' }}>FAC-2024-089</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>{t('recovery.amountInclTaxColon')}</td>
                                          <td style={{ padding: '8px 0', fontWeight: 'bold', color: '#C0322B', fontSize: '16px' }}>485,000 FCFA</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>{t('recovery.issueDateColon')}</td>
                                          <td style={{ padding: '8px 0', fontSize: '13px' }}>15/11/2024</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>{t('recovery.dueDateColon')}</td>
                                          <td style={{ padding: '8px 0', fontSize: '13px' }}>15/12/2024</td>
                                        </tr>
                                        <tr>
                                          <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>{t('recovery.paymentDelayColon')}</td>
                                          <td style={{ padding: '8px 0', color: '#C0322B', fontSize: '14px' }}><strong>37 jours</strong></td>
                                        </tr>
                                        {(selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux') && (
                                          <>
                                            <tr>
                                              <td style={{ padding: '8px 0', color: '#666', fontSize: '13px', borderTop: '1px solid #e5e5e5' }}>{t('recovery.lateInterestColon')}</td>
                                              <td style={{ padding: '8px 0', fontSize: '13px', borderTop: '1px solid #e5e5e5' }}>12,500 FCFA</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '8px 0', color: '#666', fontSize: '13px' }}>{t('recovery.reminderFeesColon')}</td>
                                              <td style={{ padding: '8px 0', fontSize: '13px' }}>5,000 FCFA</td>
                                            </tr>
                                            <tr>
                                              <td style={{ padding: '8px 0', color: '#666', fontSize: '14px', fontWeight: 'bold' }}>{t('recovery.totalDueCaps')}</td>
                                              <td style={{ padding: '8px 0', color: '#C0322B', fontSize: '18px', fontWeight: 'bold' }}>502,500 FCFA</td>
                                            </tr>
                                          </>
                                        )}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                                <div style={{ margin: '20px 0', fontSize: '14px', color: '#333', lineHeight: '1.8' }}>
                                  {selectedTemplateType === 'rappel_amical' && (
                                    <>
                                      <p>{t('recovery.letterL1Line1')}</p>
                                      <p>{t('recovery.letterL1Line2')}</p>
                                      <p style={{ fontStyle: 'italic', color: '#666', fontSize: '13px' }}>{t('recovery.letterL1Line3')}</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'relance_ferme' && (
                                    <>
                                      <p>{t('recovery.letterL2Line1')}</p>
                                      <p><strong>{t('recovery.letterL2Line2')}</strong></p>
                                      <p>{t('recovery.letterL2Line3')}</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'dernier_avis' && (
                                    <>
                                      <p style={{ color: '#C0322B', fontWeight: 'bold' }}>{t('recovery.letterL3Line1')}</p>
                                      <p>{t('recovery.letterL3Line2')}</p>
                                      <p><strong>{t('recovery.letterL3Line3')}</strong>{t('recovery.letterL3Line4')}</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'mise_demeure' && (
                                    <>
                                      <p>{t('recovery.letterL4Line1')}<strong>sous HUIT (8) jours</strong>{t('recovery.letterL4Line2')}</p>
                                      <p><strong>{t('recovery.letterL4Line3')}</strong></p>
                                      <ul style={{ marginLeft: '20px', color: '#333' }}>
                                        <li>{t('recovery.letterL4Bullet1')}</li>
                                        <li>{t('recovery.letterL4Bullet2')}</li>
                                        <li>{t('recovery.letterL4Bullet3')}</li>
                                        <li>{t('recovery.letterL4Bullet4')}</li>
                                      </ul>
                                      <p style={{ marginTop: '15px' }}>{t('recovery.letterL4Line4')}</p>
                                    </>
                                  )}
                                  {selectedTemplateType === 'pre_contentieux' && (
                                    <>
                                      <p style={{ color: '#C0322B', fontWeight: 'bold' }}>{t('recovery.letterL5Line1')}</p>
                                      <p>{t('recovery.letterL5Line2')}</p>
                                      <ul style={{ marginLeft: '20px', color: '#333' }}>
                                        <li>{t('recovery.paymentOrder')}</li>
                                        <li>{t('recovery.protectiveSeizure')}</li>
                                        <li>{t('recovery.letterL5Bullet1')}</li>
                                        <li>{t('recovery.letterL5Bullet2')}</li>
                                      </ul>
                                      <p style={{ backgroundColor: '#fff3cd', padding: '10px', marginTop: '15px', borderRadius: '5px' }}>
                                        <strong>{t('recovery.letterL5Line3')}</strong><br/>
                                        Tél: +242 06 XXX XX XX<br/>
                                        Email: contentieux@atlasfna.com
                                      </p>
                                    </>
                                  )}
                                </div>

                                {/* Call to action */}
                                <div style={{ textAlign: 'center', margin: '30px 0' }}>
                                  <a href="#" style={{
                                    backgroundColor: selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux' ? '#C0322B' :
                                                     selectedTemplateType === 'dernier_avis' ? '#E89A2E' : '#235A6E',
                                    color: 'white',
                                    padding: '12px 30px',
                                    textDecoration: 'none',
                                    borderRadius: '5px',
                                    display: 'inline-block',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}>
                                    {t('recovery.payOnlineNow')}
                                  </a>
                                  <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                                    {t('recovery.securePayment')}
                                  </p>
                                </div>

                                {/* Historique des relances pour les niveaux avancés */}
                                {(selectedTemplateType === 'dernier_avis' || selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux') && (
                                  <div style={{ backgroundColor: 'var(--color-background)', padding: '15px', borderRadius: '5px', margin: '20px 0' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-text-secondary)', fontSize: '13px' }}>{t('recovery.reminderHistoryColon')}</h4>
                                    <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#666' }}>
                                      <li>1er rappel: 22/12/2024 (Email)</li>
                                      <li>{t('recovery.reminderHist2nd')}</li>
                                      <li>{t('recovery.reminderHistCall')}</li>
                                      <li>{t('recovery.reminderHistFinal')}</li>
                                    </ul>
                                  </div>
                                )}

                                <div style={{ borderTop: '1px solid #e5e5e5', marginTop: '30px', paddingTop: '20px' }}>
                                  <p style={{ fontSize: '14px', color: '#333' }}>
                                    Cordialement,<br/>
                                    <strong>{selectedTemplateType === 'mise_demeure' || selectedTemplateType === 'pre_contentieux' ? 'Service Juridique et Contentieux' : 'Service Comptabilité'}</strong><br/>
                                    Atlas FnA
                                  </p>
                                </div>
                              </div>

                              {/* Pied de page */}
                              <div style={{ backgroundColor: 'var(--color-background)', padding: '20px', borderTop: '1px solid #e5e5e5', fontSize: '11px', color: '#666' }}>
                                <p style={{ margin: '5px 0', fontWeight: 'bold' }}><span className="atlas-brand">Atlas FnA</span>{t('recovery.businessMgmtSolutions')}</p>
                                <p style={{ margin: '5px 0' }}>123 Avenue de la République, Brazzaville, Congo</p>
                                <p style={{ margin: '5px 0' }}>+242 06 XXX XX XX | contact@atlasfna.com | www.atlasfna.com</p>
                                <p style={{ margin: '10px 0 5px 0', fontSize: '10px', color: '#999' }}>
                                  {t('recovery.confidentialityNotice')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs h-[500px]"
                            readOnly
                            value={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
    .header { background: #fafafa; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #fff; }
    .alert { background: #fee; padding: 15px; border-left: 4px solid #C0322B; margin: 20px 0; }
    .info-box { background: #fafafa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .cta { text-align: center; margin: 30px 0; }
    .btn { background: ${selectedTemplateType === 'mise_demeure' ? '#C0322B' : '#235A6E'}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
    .footer { background: #fafafa; padding: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <img src="{logo_url}" alt="Logo" style="height: 40px;">
    <h2>${selectedTemplateType === 'mise_demeure' ? 'MISE EN DEMEURE' : 'Rappel de paiement'}</h2>
  </div>
  <div class="content">
    <p>Madame, Monsieur <strong>{client_name}</strong>,</p>
    ${selectedTemplateType === 'mise_demeure' ? '<div class="alert"><strong>MISE EN DEMEURE</strong></div>' : ''}
    <div class="info-box">
      <table>
        <tr><td>N° Facture:</td><td><strong>{invoice_number}</strong></td></tr>
        <tr><td>Montant:</td><td><strong style="color: #C0322B;">{amount} FCFA</strong></td></tr>
        <tr><td>Échéance:</td><td>{due_date}</td></tr>
        <tr><td>Retard:</td><td><strong>{days_overdue} jours</strong></td></tr>
      </table>
    </div>
    <p>{message_body}</p>
    <div class="cta">
      <a href="{payment_link}" class="btn">Régler maintenant</a>
    </div>
  </div>
  <div class="footer">
    <p>{company_name}<br>
    Service Comptabilité<br>
    Tel: {phone} | Email: {email}</p>
  </div>
</body>
</html>`}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                        {t('recovery.reset')}
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        {t('recovery.saveTemplate')}
                      </button>
                    </div>
                    </div>
                  )}

                  {/* Règles d'Exclusion */}
                  {activeParametresTab === 'exclusions' && (
                    <div className="space-y-6">
                      <div className="bg-white rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-gray-600" />
                          {t('recovery.exclusionRules')}
                        </h3>

                        <div className="space-y-4">
                          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-r-lg">
                            <p className="text-sm text-yellow-800">
                              {t('recovery.exclusionRulesIntro')}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">{t('recovery.excludeLitigationCustomers')}</span>
                                <p className="text-xs text-gray-700 mt-1">{t('recovery.excludeLitigationCustomersDesc')}</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">{t('recovery.excludePlanCustomers')}</span>
                                <p className="text-xs text-gray-700 mt-1">{t('recovery.excludePlanCustomersDesc')}</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">{t('recovery.excludeVipCustomers')}</span>
                                <p className="text-xs text-gray-700 mt-1">{t('recovery.excludeVipCustomersDesc')}</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">{t('recovery.excludeHolidays')}</span>
                                <p className="text-xs text-gray-700 mt-1">{t('recovery.excludeHolidaysDesc')}</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">{t('recovery.excludeSmallAmounts')}</span>
                                <p className="text-xs text-gray-700 mt-1">{t('recovery.excludeSmallAmountsDesc')}</p>
                              </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <input type="checkbox" className="rounded text-blue-600" />
                              <div>
                                <span className="text-sm font-medium text-gray-700">{t('recovery.respectBusinessHours')}</span>
                                <p className="text-xs text-gray-700 mt-1">{t('recovery.respectBusinessHoursDesc')}</p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Boutons d'action */}
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            {t('recovery.reset')}
                          </button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            {t('recovery.saveExclusions')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Dossiers en Recouvrement */}
      {activeTab === 'dossiers' && !showDossierDetail && (
        <div className="space-y-6">
          {/* KPIs des dossiers */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <FileText className="w-8 h-8 text-blue-500" />
                <span className="text-sm font-medium text-blue-600">Total</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {mockDossiers.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">{t('recovery.activeCases')}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="w-8 h-8 text-primary-500" />
                <span className="text-sm font-medium text-primary-600">Judiciaire</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {mockDossiers.filter(d => d.typeRecouvrement === 'judiciaire').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">{t('recovery.inLegalProceedings')}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-green-500" />
                <span className="text-sm font-medium text-green-600">{t('recovery.amount')}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(mockDossiers.reduce((sum, d) => sum + d.montantTotal, 0))}
              </p>
              <p className="text-sm text-gray-600 mt-1">{t('recovery.totalInCollection')}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Urgent</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {mockDossiers.filter(d => d.statut === 'juridique').length}
              </p>
              <p className="text-sm text-gray-600 mt-1">{t('recovery.urgentCases')}</p>
            </div>
          </div>

          {/* Tableau des dossiers */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('recovery.collectionCases')}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.reference')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.customer')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.amounts')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.invoiceCountCol')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.averageDso')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.paidAmount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.owner')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.lastAction')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {t('recovery.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockDossiers.map((dossier) => (
                    <tr key={dossier.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {dossier.numeroRef}
                          </div>
                          <div className="text-sm text-gray-700">
                            {new Date(dossier.dateOuverture).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {dossier.client}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(dossier.montantTotal)}
                          </div>
                          <div className="text-xs text-gray-700">
                            Principal: {formatCurrency(dossier.montantPrincipal)}
                          </div>
                          <div className="text-xs text-gray-700">
                            Intérêts + Frais: {formatCurrency(dossier.interets + dossier.frais)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {dossier.nombreFactures}
                          </div>
                          <div className="text-xs text-gray-700">facture{dossier.nombreFactures > 1 ? 's' : ''}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center">
                          <div className={`text-sm font-medium ${dossier.dsoMoyen > 60 ? 'text-red-600' : dossier.dsoMoyen > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                            {dossier.dsoMoyen}
                          </div>
                          <div className="text-xs text-gray-700">jours</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(dossier.montantPaye)}
                          </div>
                          <div className="text-xs text-gray-700">
                            {((dossier.montantPaye / dossier.montantTotal) * 100).toFixed(1)}% du total
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {dossier.typeRecouvrement === 'judiciaire' ? (
                            <AlertTriangle className="w-4 h-4 text-primary-500 mr-1" />
                          ) : dossier.typeRecouvrement === 'huissier' ? (
                            <Building className="w-4 h-4 text-orange-500 mr-1" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-500 mr-1" />
                          )}
                          <span className="text-sm capitalize">{dossier.typeRecouvrement}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(dossier.statut)}`}>
                          {getStatutLabel(dossier.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-700 mr-2" />
                          <span className="text-sm text-gray-900">{dossier.responsable}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedDossierAction(dossier);
                            setShowDossierActionModal(true);
                          }}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                          title={t('recovery.viewLastAction')}
                        >
                          {(() => {
                            const IconComponent = getActionIcon(dossier.typeAction);
                            return <IconComponent className="w-4 h-4 text-gray-600" />;
                          })()}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => {
                              setSelectedDossierSummary(dossier);
                              setShowDossierSummary(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('recovery.viewCaseSummary')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Bouton Modifier cliqué pour dossier
                              setSelectedDossierDetail(dossier);
                              setShowDossierDetail(true);
                              // État mis à jour - showDossierDetail: true
                            }}
                            className="text-green-600 hover:text-green-900 p-1 rounded transition-colors relative z-10"
                            title={t('common.edit')}
                            type="button"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-orange-600 hover:text-orange-900" title="Historique">
                            <Clock className="w-4 h-4" />
                          </button>

                          {/* Menu dropdown 3 points */}
                          <div className="relative">
                            <button
                              onClick={() => toggleDropdown(dossier.id)}
                              className="text-gray-700 hover:text-gray-600 p-1 rounded"
                              title={t('recovery.moreActions')}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdownId === dossier.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleDossierAction('relance', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Bell className="w-4 h-4 mr-3" />
                                    {t('recovery.sendReminder')}
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('plan', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Banknote className="w-4 h-4 mr-3" />
                                    {t('recovery.proposeSettlementPlan')}
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('regle', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-3" />
                                    {t('recovery.markAsSettled')}
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('contentieux', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Scale className="w-4 h-4 mr-3" />
                                    {t('recovery.sendToPreLitigation')}
                                  </button>
                                  <button
                                    onClick={() => handleDossierAction('transfert', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <Share className="w-4 h-4 mr-3" />
                                    {t('recovery.transferToLitigationAction')}
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => handleDossierAction('supprimer', dossier)}
                                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                  >
                                    <Trash2 className="w-4 h-4 mr-3" />
                                    {t('recovery.delete')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistiques par type et statut */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.byCollectionType')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amiable</span>
                  <span className="text-sm font-medium">
                    {mockDossiers.filter(d => d.typeRecouvrement === 'amiable').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Judiciaire</span>
                  <span className="text-sm font-medium">
                    {mockDossiers.filter(d => d.typeRecouvrement === 'judiciaire').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Huissier</span>
                  <span className="text-sm font-medium">
                    {mockDossiers.filter(d => d.typeRecouvrement === 'huissier').length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.byStatus')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Actifs</span>
                  <span className="text-sm font-medium text-blue-600">
                    {mockDossiers.filter(d => d.statut === 'actif').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Juridiques</span>
                  <span className="text-sm font-medium text-primary-600">
                    {mockDossiers.filter(d => d.statut === 'juridique').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Suspendus</span>
                  <span className="text-sm font-medium text-orange-600">
                    {mockDossiers.filter(d => d.statut === 'suspendu').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page de modification du dossier avec onglets */}
      {(activeTab === 'dossiers' || activeTab === 'contentieux') && showDossierDetail && selectedDossierDetail && (
        <div className="space-y-6">
          {/* En-tête avec bouton retour */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowDossierDetail(false);
                  setActiveDossierTab('dashboard'); // Reset à dashboard
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{t('recovery.backToList')}</span>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Dossier {selectedDossierDetail.numeroRef}
                </h1>
                <p className="text-gray-600">{selectedDossierDetail.client}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Sauvegarder les modifications du dossier
                  // Sauvegarde des modifications du dossier
                  // Ici on pourrait ajouter la logique de sauvegarde API
                  // Par exemple: await updateDossier(selectedDossierDetail.id, updatedData);

                  // Afficher une notification de succès
                  toast.success(t('recovery.toastCaseModified'));

                  // Fermer la modal et retourner à la liste
                  setShowDossierDetail(false);
                  setActiveDossierTab('dashboard');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('recovery.save')}
              </button>
              <button
                onClick={() => {
                  setShowDossierDetail(false);
                  setActiveDossierTab('dashboard');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6 overflow-x-auto">
                {dossierTabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDossierTab(tab.id)}
                      className={`
                        flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                        ${activeDossierTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
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

            {/* Contenu des onglets */}
            <div className="p-6">
              {/* Dashboard */}
              {activeDossierTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* En-tête avec informations principales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600">{t('recovery.customer')}</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedDossierDetail.client}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Internal case ref.</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedDossierDetail.numeroRef}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Currency</div>
                      <div className="text-lg font-semibold text-gray-900">FCFA</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600">Case category</div>
                      <div className="text-lg font-semibold text-gray-900">{t('thirdParty.collection')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Case status</div>
                      <div className="text-lg font-semibold text-gray-900">-</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Received on</div>
                      <div className="text-lg font-semibold text-gray-900">{new Date(selectedDossierDetail.dateOuverture).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* Grid avec 6 sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Financial counters */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <DollarSign className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Financial counters</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total receivables</span>
                          <span className="text-sm font-medium">{formatCurrency(selectedDossierDetail.montantTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total overdue</span>
                          <span className="text-sm font-medium">{formatCurrency(selectedDossierDetail.montantTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total interest</span>
                          <span className="text-sm font-medium">{selectedDossierDetail.interets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total payments</span>
                          <span className="text-sm font-medium">{selectedDossierDetail.montantPaye}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Not due</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Disputes</span>
                          <span className="text-sm font-medium">0</span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="text-sm font-medium text-blue-600">Balance to collect</div>
                        </div>
                      </div>
                    </div>

                    {/* Client */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <UserCircle className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">{t('recovery.customer')}</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">{t('recovery.customerName')}</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Adresse</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.phone')}</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Email</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Contact person</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">Email</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Telephone</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Role</div>
                        </div>
                      </div>
                    </div>

                    {/* Case attributes */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Case attributes</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.caseReference')}</div>
                            <div className="text-sm font-medium">{selectedDossierDetail.numeroRef}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.creationDate')}</div>
                            <div className="text-sm font-medium">{new Date(selectedDossierDetail.dateOuverture).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.status')}</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Age</div>
                            <div className="text-sm font-medium">{selectedDossierDetail.dsoMoyen} j</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">{t('recovery.lastReminderDate')}</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">{t('recovery.additionalComments')}</div>
                          <textarea className="w-full mt-1 text-sm border border-gray-300 rounded px-2 py-1" rows={3}></textarea>
                        </div>
                      </div>
                    </div>

                    {/* Responsible details */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Responsible details</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">Nom</div>
                          <div className="text-sm font-medium">-</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.phone')}</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Email</div>
                            <div className="text-sm font-medium">-</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Last repayment plan */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <Calendar className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Last repayment plan</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.startDate')}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.endDate')}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.finalAmount')}</div>
                            <div className="text-sm font-medium">0</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">{t('recovery.status')}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Next action */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <Clock className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Next action</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600">{t('common.date')}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Action</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Graphiques en bas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Active cases */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <BarChart3 className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Active cases</h3>
                      </div>
                      <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Total receivables', value: selectedDossierDetail.montantTotal },
                            { name: 'Total collection', value: selectedDossierDetail.montantPaye },
                            { name: 'Balance', value: selectedDossierDetail.montantTotal - selectedDossierDetail.montantPaye }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar radius={[6,6,0,0]} dataKey="value" fill="url(#gradPetrol)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Submitted debt and collected */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <div className="bg-gray-100 p-2 rounded">
                          <BarChart3 className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="ml-3 font-semibold text-gray-900">Submitted debt and collected</h3>
                      </div>
                      <div className="h-48 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { name: 'Jan', receivables: 0, collection: 0 },
                            { name: 'Feb', receivables: 0, collection: 0 },
                            { name: 'Mar', receivables: selectedDossierDetail.montantTotal, collection: 0 },
                            { name: 'Apr', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'May', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Jun', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Jul', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Aug', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Sep', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Oct', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Nov', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye },
                            { name: 'Dec', receivables: selectedDossierDetail.montantTotal, collection: selectedDossierDetail.montantPaye }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="receivables" stroke="#235A6E" name="Total receivables" />
                            <Line type="monotone" dataKey="collection" stroke="#15803D" name="Total collection" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Client */}
              {activeDossierTab === 'client' && (
                <div className="space-y-6">
                  {/* Section Account */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">{t('recovery.legalEntity')}</div>
                        <div className="text-sm font-medium">{selectedDossierDetail.client || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">{t('recovery.brand')}</div>
                        <div className="text-sm font-medium">{detailCreance?.clientNom || selectedDossierDetail.client || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">{t('recovery.prospectCode')}</div>
                        <div className="text-sm font-medium">{detailCreance?.clientCode || '—'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">{t('recovery.accountNumber')}</div>
                        <div className="text-sm font-medium">{detailCreance?.clientCode || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Grid principal avec 4 sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Créances */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('recovery.receivables')}</h4>

                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <FileText className="w-8 h-8 text-gray-600" />
                        </div>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-sm text-gray-600">{t('recovery.invoiceCountShort')}</div>
                        <div className="text-lg font-bold text-gray-900">{selectedDossierDetail.nombreFactures}</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t('recovery.totalReceivablesLower')}</div>
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(selectedDossierDetail.montantTotal)}</div>
                      </div>
                    </div>

                    {/* Notation client */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('recovery.customerRating')}</h4>

                      <div className="space-y-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Paiement</div>
                          {/* Comportement de paiement dérivé du DSO moyen réel. */}
                          <div className={`text-sm font-semibold ${selectedDossierDetail.dsoMoyen <= 30 ? 'text-green-700' : selectedDossierDetail.dsoMoyen <= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                            {selectedDossierDetail.dsoMoyen <= 30 ? 'Bon' : selectedDossierDetail.dsoMoyen <= 60 ? 'Moyen' : 'À risque'} ({selectedDossierDetail.dsoMoyen} j)
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-600 mb-1">{t('recovery.revenue')}</div>
                          <div className="text-sm font-medium text-gray-400">{t('recovery.outOfScope')}</div>
                        </div>

                        <div>
                          <div className="text-sm text-gray-600 mb-1">{t('recovery.seniorityAlt')}</div>
                          <div className="text-sm font-medium">{(() => {
                            const dates = detailFactures.map(f => f.date).filter(Boolean).sort();
                            return dates.length > 0 ? `depuis ${new Date(dates[0]).toLocaleDateString('fr-FR')}` : '—';
                          })()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Factures en retard */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('recovery.overdueInvoices')}</h4>

                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <Clock className="w-8 h-8 text-gray-600" />
                        </div>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-sm text-gray-600">Taux</div>
                        <div className="text-lg font-bold text-gray-900">{detailFactures.length > 0 ? Math.round((detailFactures.filter(f => f.joursRetard > 0).length / detailFactures.length) * 100) : 0} %</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t('recovery.totalPaymentDelays')}</div>
                        <div className="text-lg font-bold text-gray-900">{detailFactures.filter(f => f.joursRetard > 0).length}</div>
                      </div>
                    </div>

                    {/* Analyse du CA client */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('recovery.customerRevenueAnalysis')}</h4>

                      <div className="flex items-center justify-center mb-4">
                        <div className="bg-gray-100 p-3 rounded-lg">
                          <TrendingUp className="w-8 h-8 text-gray-600" />
                        </div>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-sm text-gray-600">{t('recovery.pctOfTotalRevenue')}</div>
                        {/* Nécessite le CA société (hors périmètre recouvrement) → non disponible ici. */}
                        <div className="text-lg font-bold text-gray-400">—</div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-gray-600">{t('recovery.pctOfReceivables')}</div>
                        <div className="text-lg font-bold text-gray-900">{(() => {
                          const totalAll = mockCreances.reduce((s, c) => s + (c.montantTotal || 0), 0);
                          return totalAll > 0 ? Math.round((selectedDossierDetail.montantTotal / totalAll) * 100) : 0;
                        })()} %</div>
                      </div>
                    </div>
                  </div>

                  {/* Section Nombre de jours d'impayés */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('recovery.daysUnpaid')}</h4>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">0-30 Days</span>
                          <span className="text-sm font-medium">{detailFactures.filter(f => f.joursRetard <= 30).length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">31-60 Days</span>
                          <span className="text-sm font-medium">{detailFactures.filter(f => f.joursRetard > 30 && f.joursRetard <= 60).length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">61-90 Days</span>
                          <span className="text-sm font-medium">{detailFactures.filter(f => f.joursRetard > 60 && f.joursRetard <= 90).length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">90+ Days</span>
                          <span className="text-sm font-medium">{detailFactures.filter(f => f.joursRetard > 90).length}</span>
                        </div>
                      </div>

                      {/* Graphique DSO : distribution des créances par tranche d'ancienneté */}
                      <div className="mt-6 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={detailAgingChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="tranche" fontSize={11} />
                            <YAxis allowDecimals={false} fontSize={11} />
                            <Tooltip formatter={(v: any) => [`${v} facture(s)`, 'Nombre']} />
                            <Bar radius={[6, 6, 0, 0]} dataKey="nb" fill="#235A6E" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-center text-sm text-gray-700 mt-1">
                        <span className="font-bold text-gray-900">{selectedDossierDetail.dsoMoyen}</span> jours (DSO moyen)
                      </div>
                    </div>

                    {/* Analyse de la croissance du CA sur 5 ans */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="text-base font-semibold text-gray-900 mb-4">{t('recovery.revenueGrowth5Years')}</h4>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left text-xs font-medium text-gray-700 py-2">{t('recovery.year')}</th>
                              <th className="text-left text-xs font-medium text-gray-700 py-2">{t('recovery.amount')}</th>
                              <th className="text-left text-xs font-medium text-gray-700 py-2">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {detailCAHistory.map((row) => (
                              <tr key={row.annee}>
                                <td className="py-2 text-sm text-gray-900">{row.annee}</td>
                                <td className="py-2 text-sm text-gray-900">{row.montant > 0 ? formatCurrency(row.montant) : '—'}</td>
                                <td className={`py-2 text-sm font-medium ${row.pct == null ? 'text-gray-400' : row.pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {row.pct == null ? '—' : `${row.pct > 0 ? '+' : ''}${row.pct} %`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Créances */}
              {activeDossierTab === 'creances' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">{t('recovery.customerReceivables')}</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              FAC #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.documentNumber')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.date')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.billingPeriod')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.description')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.debit')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.credit')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.balance')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.dueDateCol')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              PS
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              SR
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Age
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Vraies factures du dossier (lignes 411x réelles) */}
                          {detailFactures.map((f) => ({
                            facNum: f.numero,
                            numDocument: f.numero,
                            date: f.date,
                            periodeFacturation: new Date(f.date).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' }),
                            description: f.libelle || '—',
                            debit: f.montantOriginal,
                            credit: f.credit || 0,
                            solde: f.montantRestant,
                            dateEcheance: f.dateEcheance,
                            ps: f.credit > 0 ? 'Partiel' : (f.joursRetard > 0 ? 'En retard' : 'En cours'),
                            sr: f.joursRetard > 30 ? 'Oui' : 'Non',
                            age: Math.max(0, f.joursRetard),
                          })).map((facture, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {facture.facNum}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {facture.numDocument}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(facture.date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {facture.periodeFacturation}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {facture.description}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-red-600">
                                  {formatCurrency(facture.debit)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600">
                                  {facture.credit > 0 ? `${formatCurrency(facture.credit)}` : '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${facture.solde > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {formatCurrency(facture.solde)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(facture.dateEcheance).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  facture.ps === 'En cours' ? 'bg-yellow-100 text-yellow-800' :
                                  facture.ps === 'Partiel' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {facture.ps}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  facture.sr === 'Oui' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {facture.sr}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${
                                  facture.age > 30 ? 'text-red-600' :
                                  facture.age > 15 ? 'text-orange-600' :
                                  'text-green-600'
                                }`}>
                                  {facture.age} jours
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Résumé en bas */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.totalDebit')}</div>
                      <div className="text-lg font-bold text-blue-900">
                        {formatCurrency(detailFactures.reduce((s, f) => s + (f.montantOriginal || 0), 0))}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">{t('recovery.totalCredit')}</div>
                      <div className="text-lg font-bold text-green-900">
                        {formatCurrency(detailFactures.reduce((s, f) => s + (f.credit || 0), 0))}
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">{t('recovery.totalBalance')}</div>
                      <div className="text-lg font-bold text-orange-900">
                        {formatCurrency(detailFactures.reduce((s, f) => s + (f.montantRestant || 0), 0))}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-red-600 font-medium">{t('recovery.overdueInvoices')}</div>
                      <div className="text-lg font-bold text-red-900">
                        {detailFactures.filter(f => f.joursRetard > 0).length}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'contract' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">{t('recovery.customerContracts')}</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.contractNumber')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.tenant')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.brand')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.customerNumber')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.unit')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.startDateShort')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.duration')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.endDateShort')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              SLB
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              %SLB
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.monthlyRent')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Monthly service charge
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Données mock pour les contrats */}
                          {[
                            {
                              numContrat: 'CTR-2024-001',
                              statut: 'Actif',
                              locataire: selectedDossierDetail.client,
                              enseigne: 'SARL CONGO BUSINESS',
                              numClient: 'CLI-001',
                              local: 'Local A-15',
                              dateDebut: '2024-01-01',
                              duree: '36 mois',
                              dateFin: '2026-12-31',
                              slb: 'Oui',
                              pourcentageSLB: '2.5%',
                              loyerMensuel: 850000,
                              chargesMensuelles: 125000
                            },
                            {
                              numContrat: 'CTR-2023-045',
                              statut: 'Expiré',
                              locataire: selectedDossierDetail.client,
                              enseigne: 'SARL CONGO BUSINESS',
                              numClient: 'CLI-001',
                              local: 'Local B-22',
                              dateDebut: '2023-01-01',
                              duree: '12 mois',
                              dateFin: '2023-12-31',
                              slb: 'Non',
                              pourcentageSLB: '0%',
                              loyerMensuel: 450000,
                              chargesMensuelles: 85000
                            }
                          ].map((contrat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {contrat.numContrat}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  contrat.statut === 'Actif' ? 'bg-green-100 text-green-800' :
                                  contrat.statut === 'Expiré' ? 'bg-red-100 text-red-800' :
                                  contrat.statut === 'Suspendu' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {contrat.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.locataire}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.enseigne}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {contrat.numClient}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.local}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(contrat.dateDebut).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {contrat.duree}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(contrat.dateFin).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  contrat.slb === 'Oui' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {contrat.slb}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {contrat.pourcentageSLB}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600">
                                  {formatCurrency(contrat.loyerMensuel)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {formatCurrency(contrat.chargesMensuelles)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Résumé des contrats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.activeContracts')}</div>
                      <div className="text-lg font-bold text-blue-900">1</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">{t('recovery.totalMonthlyRent')}</div>
                      <div className="text-lg font-bold text-green-900">
                        850,000 FCFA
                      </div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-4">
                      <div className="text-sm text-primary-600 font-medium">{t('recovery.monthlyCharges')}</div>
                      <div className="text-lg font-bold text-primary-900">
                        125,000 FCFA
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">{t('recovery.monthlyTotal')}</div>
                      <div className="text-lg font-bold text-orange-900">
                        975,000 FCFA
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'reminders' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Follow-Up History</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.date')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.type')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.method')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.frequency')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.amountDiscussed')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.template')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.recipients')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.status')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Données mock pour l'historique des relances */}
                          {[
                            {
                              date: '2024-03-15',
                              type: 'Relance amiable',
                              methode: 'Email',
                              frequence: 'Première relance',
                              montantEvoque: 16000,
                              modele: 'Modèle standard R1',
                              destinataires: 'direction@congocommerce.com',
                              statut: 'Envoyé'
                            },
                            {
                              date: '2024-03-10',
                              type: 'Appel téléphonique',
                              methode: 'Téléphone',
                              frequence: 'Relance initiale',
                              montantEvoque: 16000,
                              modele: 'Script téléphonique standard',
                              destinataires: '+242 06 123 45 67',
                              statut: 'Terminé'
                            },
                            {
                              date: '2024-03-05',
                              type: 'Relance courtoise',
                              methode: 'Email',
                              frequence: 'Rappel amical',
                              montantEvoque: 16000,
                              modele: 'Modèle courtois',
                              destinataires: 'comptabilite@congocommerce.com',
                              statut: 'Livré'
                            },
                            {
                              date: '2024-02-28',
                              type: 'Mise en demeure',
                              methode: 'Courrier recommandé',
                              frequence: 'Relance formelle',
                              montantEvoque: 16000,
                              modele: 'Modèle mise en demeure',
                              destinataires: 'Directeur Général - SARL CONGO BUSINESS',
                              statut: 'Accusé de réception'
                            },
                            {
                              date: '2024-02-20',
                              type: 'SMS de rappel',
                              methode: 'SMS',
                              frequence: 'Rappel urgent',
                              montantEvoque: 11000,
                              modele: 'SMS court - Rappel',
                              destinataires: '+242 06 123 45 67',
                              statut: 'Échec de livraison'
                            }
                          ].map((relance, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(relance.date).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  relance.type.includes('amiable') ? 'bg-blue-100 text-blue-800' :
                                  relance.type.includes('téléphonique') ? 'bg-green-100 text-green-800' :
                                  relance.type.includes('courtoise') ? 'bg-yellow-100 text-yellow-800' :
                                  relance.type.includes('demeure') ? 'bg-red-100 text-red-800' :
                                  'bg-primary-100 text-primary-800'
                                }`}>
                                  {relance.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {relance.methode === 'Email' && <Mail className="w-4 h-4 text-blue-500 mr-2" />}
                                  {relance.methode === 'Téléphone' && <Phone className="w-4 h-4 text-green-500 mr-2" />}
                                  {relance.methode === 'SMS' && <MessageSquare className="w-4 h-4 text-primary-500 mr-2" />}
                                  {relance.methode === 'Courrier recommandé' && <FileText className="w-4 h-4 text-red-500 mr-2" />}
                                  <span className="text-sm text-gray-900">{relance.methode}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {relance.frequence}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-green-600">
                                  {formatCurrency(relance.montantEvoque)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {relance.modele}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {relance.destinataires}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  relance.statut === 'Envoyé' ? 'bg-blue-100 text-blue-800' :
                                  relance.statut === 'Terminé' ? 'bg-green-100 text-green-800' :
                                  relance.statut === 'Livré' ? 'bg-green-100 text-green-800' :
                                  relance.statut === 'Accusé de réception' ? 'bg-primary-100 text-primary-800' :
                                  relance.statut === 'Échec de livraison' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {relance.statut}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Statistiques des relances */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.totalReminders')}</div>
                      <div className="text-lg font-bold text-blue-900">5</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">{t('recovery.successfulReminders')}</div>
                      <div className="text-lg font-bold text-green-900">4</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">{t('recovery.lastReminder')}</div>
                      <div className="text-lg font-bold text-orange-900">15/03/2024</div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-4">
                      <div className="text-sm text-primary-600 font-medium">{t('recovery.successRateTitle2')}</div>
                      <div className="text-lg font-bold text-primary-900">80%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'payments' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">{t('recovery.paymentHistory')}</h3>

                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.paymentDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.transactionNumber')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.relatedInvoices')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.amount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.paymentMethod')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.reference')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.postingDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.comments')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {([] as Array<{datePaiement: string; numTransaction: string; facturesConcernees: string; montant: number; methodePaiement: string; reference: string; statut: string; dateComptabilisation: string | null; commentaires: string}>).length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">{t('recovery.noPaymentRecorded')}</td>
                            </tr>
                          ) : ([] as Array<{datePaiement: string; numTransaction: string; facturesConcernees: string; montant: number; methodePaiement: string; reference: string; statut: string; dateComptabilisation: string | null; commentaires: string}>).map((paiement, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(paiement.datePaiement).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {paiement.numTransaction}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {paiement.facturesConcernees}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-green-600">
                                  {formatCurrency(paiement.montant)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {paiement.methodePaiement === 'Virement bancaire' && <Banknote className="w-4 h-4 text-blue-500 mr-2" />}
                                  {paiement.methodePaiement === 'Chèque' && <FileText className="w-4 h-4 text-green-500 mr-2" />}
                                  {paiement.methodePaiement === 'Espèces' && <DollarSign className="w-4 h-4 text-yellow-500 mr-2" />}
                                  {paiement.methodePaiement === 'Carte bancaire' && <CreditCard className="w-4 h-4 text-primary-500 mr-2" />}
                                  <span className="text-sm text-gray-900">{paiement.methodePaiement}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 font-mono">
                                  {paiement.reference}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  paiement.statut === 'Validé' ? 'bg-green-100 text-green-800' :
                                  paiement.statut === 'En attente' ? 'bg-yellow-100 text-yellow-800' :
                                  paiement.statut === 'Annulé' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {paiement.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {paiement.dateComptabilisation ? new Date(paiement.dateComptabilisation).toLocaleDateString() : '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                  {paiement.commentaires}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Statistiques des paiements */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">{t('recovery.totalCollectedIn')}</div>
                      <div className="text-lg font-bold text-green-900">11,500 FCFA</div>
                      <div className="text-xs text-green-600 mt-1">{t('recovery.validatedPayments')}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-sm text-yellow-600 font-medium">{t('recovery.pendingTitle')}</div>
                      <div className="text-lg font-bold text-yellow-900">3,000 FCFA</div>
                      <div className="text-xs text-yellow-600 mt-1">{t('recovery.toValidate')}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.transactionCount')}</div>
                      <div className="text-lg font-bold text-blue-900">5</div>
                      <div className="text-xs text-blue-600 mt-1">{t('recovery.totalSinceOpening')}</div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-4">
                      <div className="text-sm text-primary-600 font-medium">{t('recovery.lastPayment')}</div>
                      <div className="text-lg font-bold text-primary-900">20/03/2024</div>
                      <div className="text-xs text-primary-600 mt-1">2,000 FCFA</div>
                    </div>
                  </div>

                  {/* Graphique des paiements par mois */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.paymentsTrend')}</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {/* Données réelles d'échéancier de paiement non disponibles (recovery_cases vide) */}
                        <AreaChart data={[]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mois" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${formatCurrency(Number(value))}`, 'Montant']} />
                          <Area type="monotone" dataKey="montant" stroke="#15803D" fill="#15803D" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Répartition par méthode de paiement */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.breakdownByPaymentMethod')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={[
                                { name: 'Virement bancaire', value: 5000, fill: '#235A6E' },
                                { name: 'Chèque', value: 8000, fill: '#15803D' },
                                { name: 'Espèces', value: 1500, fill: '#E89A2E' },
                                { name: 'Carte bancaire', value: 0, fill: '#C77E2C' }
                              ]}
                              cx="50%"
                              cy="50%"
                              outerRadius={60}
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            />
                            <Tooltip formatter={(value) => [`${formatCurrency(Number(value))}`, 'Montant']} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">{t('recovery.check')}</span>
                          </div>
                          <span className="text-sm font-medium">8,000 FCFA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">{t('recovery.bankTransfer')}</span>
                          </div>
                          <span className="text-sm font-medium">5,000 FCFA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">{t('recovery.cash')}</span>
                          </div>
                          <span className="text-sm font-medium">1,500 FCFA</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-primary-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-700">{t('recovery.bankCard')}</span>
                          </div>
                          <span className="text-sm font-medium">0 FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'interest' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{t('recovery.interestAndPenalties')}</h3>
                    <button
                      onClick={() => document.getElementById('penalite-calculateur')?.scrollIntoView({ behavior: 'smooth' })}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      {t('recovery.newPenalty')}
                    </button>
                  </div>

                  {/* Statistiques générales (calculées depuis la liste réelle) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="text-sm text-red-600 font-medium">{t('recovery.totalPenalties')}</div>
                      <div className="text-lg font-bold text-red-900">{formatCurrency(penStats.total)}</div>
                      <div className="text-xs text-red-600 mt-1">{t('recovery.onOverdueReceivables')}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="text-sm text-yellow-600 font-medium">{t('recovery.pendingValidation')}</div>
                      <div className="text-lg font-bold text-yellow-900">{formatCurrency(penStats.attente)}</div>
                      <div className="text-xs text-yellow-600 mt-1">{penStats.attenteCount} dossier(s)</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">{t('recovery.validatedPlural')}</div>
                      <div className="text-lg font-bold text-green-900">{formatCurrency(penStats.validees)}</div>
                      <div className="text-xs text-green-600 mt-1">{t('recovery.sentToBilling')}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.averageRate')}</div>
                      <div className="text-lg font-bold text-blue-900">{penStats.tauxMoyen}%</div>
                      <div className="text-xs text-blue-600 mt-1">{t('recovery.appliedRate')}</div>
                    </div>
                  </div>

                  {/* Tableau des pénalités */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">{t('recovery.penaltyHistory')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.creationDateShort')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.invoices')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.receivableAmount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.daysLate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.appliedRate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.penaltyAmount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.validationDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {penalites.length === 0 && (
                            <tr><td colSpan={9} className="px-6 py-8 text-center text-sm text-gray-500">{t('recovery.noPenaltyRecorded')}</td></tr>
                          )}
                          {penalites.map((penalite) => (
                            <tr key={penalite.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {new Date(penalite.dateCreation).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {penalite.factures}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(penalite.montantCreance)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm font-medium ${
                                  penalite.joursRetard > 45 ? 'text-red-600' :
                                  penalite.joursRetard > 30 ? 'text-orange-600' : 'text-yellow-600'
                                }`}>
                                  {penalite.joursRetard} jours
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {penalite.tauxApplique}%
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-red-600">
                                  {formatCurrency(penalite.montantPenalite)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  penalite.statut === 'En attente validation' ? 'bg-yellow-100 text-yellow-800' :
                                  penalite.statut === 'Validée' ? 'bg-green-100 text-green-800' :
                                  penalite.statut === 'Envoyée facturation' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {penalite.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {penalite.dateValidation ? new Date(penalite.dateValidation).toLocaleDateString() : '-'}
                                </div>
                                {penalite.validateur && (
                                  <div className="text-xs text-gray-700">{penalite.validateur}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  {penalite.statut === 'En attente validation' && (
                                    <>
                                      <button
                                        onClick={() => validatePenalite(penalite.id)}
                                        className="text-green-600 hover:text-green-900 p-1 rounded"
                                        title={t('actions.validate')} aria-label="Valider">
                                        <CheckCircle className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => rejectPenalite(penalite.id)}
                                        className="text-red-600 hover:text-red-900 p-1 rounded"
                                        title="Rejeter" aria-label="Rejeter">
                                        <XCircle className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                  {penalite.statut === 'Validée' && (
                                    <button
                                      onClick={() => sendPenalite(penalite.id)}
                                      className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                      title={t('recovery.sendToBilling')}
                                    >
                                      <Send className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => toast(`Pénalité ${penalite.factures} — créance ${formatCurrency(penalite.montantCreance)}, ${penalite.joursRetard}j, taux ${penalite.tauxApplique}% → ${formatCurrency(penalite.montantPenalite)}`, { duration: 6000 })}
                                    className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                    title={t('recovery.viewDetails')} aria-label={t('recovery.viewDetailsAria')}>
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Calculateur de pénalités */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.penaltyCalculator')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6" id="penalite-calculateur">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.invoiceDocRef')}</label>
                        <input type="text" placeholder="ex. FAC001" value={penForm.factures} onChange={(e) => setPenForm(f => ({ ...f, factures: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.receivableAmount')}</label>
                        <input type="number" min="0" placeholder="0" value={penForm.montantCreance} onChange={(e) => setPenForm(f => ({ ...f, montantCreance: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.daysOverdue')}</label>
                        <input type="number" min="0" placeholder="0" value={penForm.joursRetard} onChange={(e) => setPenForm(f => ({ ...f, joursRetard: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.penaltyRatePct')}</label>
                        <input type="number" step="0.1" min="0" value={penForm.taux} onChange={(e) => setPenForm(f => ({ ...f, taux: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">{t('recovery.calculationPreview')}</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">{t('recovery.receivableAmountColon')}</span>
                          <div className="font-medium">{formatCurrency(Number(penForm.montantCreance) || 0)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('recovery.daysOverdueColon')}</span>
                          <div className="font-medium">{Number(penForm.joursRetard) || 0} jours</div>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('recovery.appliedRateColon')}</span>
                          <div className="font-medium">{Number(penForm.taux) || 0}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('recovery.calculatedPenaltyColon')}</span>
                          <div className="font-bold text-red-600">{formatCurrency(Math.round((Number(penForm.montantCreance) || 0) * (Number(penForm.taux) || 0) / 100))}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button onClick={createPenalite} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        {t('recovery.createPenalty')}
                      </button>
                    </div>
                  </div>

                  {/* Workflow de validation */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.validationWorkflow')}</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Plus className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">{t('recovery.creation')}</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-yellow-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">{t('status.pending')}</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">Validation</span>
                        </div>
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <Send className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="ml-2 text-sm font-medium">Facturation</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p><strong>Note:</strong>{t('recovery.penaltiesNeedApproval')}</p>
                    </div>
                  </div>

                  {/* Configuration des taux */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.rateConfiguration')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">{t('recovery.delay0to30')}</h5>
                        <div className="text-lg font-bold text-yellow-600">3.0%</div>
                        <div className="text-sm text-gray-600">{t('recovery.standardRate')}</div>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">{t('recovery.delay31to60')}</h5>
                        <div className="text-lg font-bold text-orange-600">4.5%</div>
                        <div className="text-sm text-gray-600">{t('recovery.increasedRate')}</div>
                      </div>
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">{t('recovery.delay60plus')}</h5>
                        <div className="text-lg font-bold text-red-600">6.0%</div>
                        <div className="text-sm text-gray-600">{t('recovery.maximumRate')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'repayment' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{t('recovery.repaymentPlans')}</h3>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      {t('recovery.newPlan')}
                    </button>
                  </div>

                  {/* Statistiques des plans — dérivées des plans réels (recoveryCases). Aucune donnée -> "—". */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.activePlans')}</div>
                      <div className="text-lg font-bold text-blue-900">{repaymentPlans.length > 0 ? repaymentKpis.actifs : '—'}</div>
                      <div className="text-xs text-blue-600 mt-1">{t('status.inProgress')}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">{t('recovery.totalAmount')}</div>
                      <div className="text-lg font-bold text-green-900">{repaymentPlans.length > 0 ? formatCurrency(repaymentKpis.montantTotal) : '—'}</div>
                      <div className="text-xs text-green-600 mt-1">{t('recovery.toRepay')}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">{t('recovery.overdue')}</div>
                      <div className="text-lg font-bold text-orange-900">{repaymentPlans.length > 0 ? repaymentKpis.enRetard : '—'}</div>
                      <div className="text-xs text-orange-600 mt-1">{t('recovery.overduePlans')}</div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-4">
                      <div className="text-sm text-primary-600 font-medium">{t('recovery.complianceRateShort')}</div>
                      <div className="text-lg font-bold text-primary-900">{repaymentPlans.length > 0 ? `${repaymentKpis.tauxRespect}%` : '—'}</div>
                      <div className="text-xs text-primary-600 mt-1">{t('recovery.onTimePayments')}</div>
                    </div>
                  </div>

                  {/* Tableau des plans de remboursement */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">{t('recovery.repaymentPlanHistory')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Ref
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.initialAmount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.interestAndPenaltiesShort')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.durationMonths')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.startDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.endDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.monthlyAmount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.totalInterest')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.totalAmountLower')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.comment')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {repaymentPlans.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="px-6 py-10 text-center text-sm text-gray-500">
                                {t('recovery.noDataNotImported')}
                              </td>
                            </tr>
                          ) : repaymentPlans.map((plan, index) => (
                            <tr key={plan.id ?? index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-blue-600">
                                  {plan.reference}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatCurrency(plan.montantTotal)}
                                </div>
                              </td>
                              {/* Intérêts/pénalités, durée, échéancier : pas de source réelle -> "—" */}
                              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">—</div></td>
                              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">—</div></td>
                              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">—</div></td>
                              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">—</div></td>
                              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">—</div></td>
                              <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-400">—</div></td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-primary-600">
                                  {formatCurrency(plan.montantTotal)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-400">—</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  plan.statut === 'Respecté' ? 'bg-green-100 text-green-800' :
                                  plan.statut === 'Partiel' ? 'bg-blue-100 text-blue-800' :
                                  plan.statut === 'En retard' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {plan.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded"
                                    title={t('recovery.viewSchedule')} aria-label="Calendrier">
                                    <Calendar className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="text-green-600 hover:text-green-900 p-1 rounded"
                                    title={t('recovery.editPlan')}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    className="text-gray-600 hover:text-gray-900 p-1 rounded"
                                    title={t('recovery.viewDetails')} aria-label={t('recovery.viewDetailsAria')}>
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Calculateur de plan de remboursement */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.repaymentPlanSimulator')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.debtAmountFcfa')}
                        </label>
                        <input
                          type="number"
                          defaultValue="14000"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.annualInterestRate')}
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          defaultValue="6.0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('recovery.desiredDurationMonths')}
                        </label>
                        <input
                          type="number"
                          defaultValue="6"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-3">{t('recovery.planSimulation')}</h5>
                      {/* Résultats affichés après calcul — pas de valeurs fabriquées */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Capital:</span>
                          <div className="font-medium text-gray-400">—</div>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('recovery.totalInterestColon')}</span>
                          <div className="font-medium text-gray-400">—</div>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('recovery.totalAmountColon')}</span>
                          <div className="font-bold text-gray-400">—</div>
                        </div>
                        <div>
                          <span className="text-gray-600">{t('recovery.monthlyInstalmentColon')}</span>
                          <div className="font-bold text-gray-400">—</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {t('recovery.calculate')}
                      </button>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        {t('recovery.createPlan')}
                      </button>
                    </div>
                  </div>

                  {/* Échéancier du plan actif — aucun échéancier mensuel n'est stocké en base */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.schedule')}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.dueDate')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('common.date')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Capital</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.interest')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.monthlyInstalment')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.remainingPrincipal')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.status')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                              {t('recovery.noDataNotImported')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeDossierTab === 'actions' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{t('recovery.actionHistory')}</h3>
                    <div className="flex gap-3">
                      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="all">{t('recovery.allActions')}</option>
                        <option value="relances">Relances</option>
                        <option value="paiements">Paiements</option>
                        <option value="penalites">{t('recovery.penalties')}</option>
                        <option value="plans">{t('recovery.repaymentPlansLower')}</option>
                      </select>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        {t('recovery.newActionTitle')}
                      </button>
                    </div>
                  </div>

                  {/* Statistiques des actions — aucun historique d'actions stocké en base */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.totalActions')}</div>
                      <div className="text-lg font-bold text-blue-900">—</div>
                      <div className="text-xs text-blue-600 mt-1">{t('recovery.sinceOpening')}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">{t('recovery.successfulActions')}</div>
                      <div className="text-lg font-bold text-green-900">—</div>
                      <div className="text-xs text-green-600 mt-1">{t('recovery.successRateLower')}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">{t('recovery.lastAction')}</div>
                      <div className="text-lg font-bold text-orange-900">—</div>
                      <div className="text-xs text-orange-600 mt-1">—</div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-4">
                      <div className="text-sm text-primary-600 font-medium">{t('recovery.averageTime')}</div>
                      <div className="text-lg font-bold text-primary-900">—</div>
                      <div className="text-xs text-primary-600 mt-1">{t('recovery.betweenActions')}</div>
                    </div>
                  </div>

                  {/* Timeline des actions */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-6">{t('recovery.actionsTimeline')}</h4>
                    <div className="flow-root">
                      <div className="py-10 text-center text-sm text-gray-500">
                        {t('recovery.noDataNotImported')}
                      </div>
                    </div>
                  </div>

                  {/* Tableau récapitulatif par type d'action */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">{t('recovery.summaryByActionType')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.actionType')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.totalCount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.successful')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.inProgress')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.failures')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.successRateLower')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.lastActionLower')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                              {t('recovery.noDataNotImported')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Graphique d'activité — pas d'historique d'actions en base */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.caseActivity')}</h4>
                    <div className="h-64 flex items-center justify-center text-sm text-gray-500">
                      {t('recovery.noDataNotImported')}
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Attachments */}
              {activeDossierTab === 'attachments' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">{t('recovery.documentsAndAttachments')}</h3>
                    <div className="flex gap-3">
                      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="all">{t('recovery.allDocuments')}</option>
                        <option value="factures">Factures</option>
                        <option value="contrats">Contrats</option>
                        <option value="correspondances">Correspondances</option>
                        <option value="juridiques">{t('recovery.legalDocumentsShort')}</option>
                        <option value="paiements">{t('recovery.paymentSupportingDocs')}</option>
                      </select>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        {t('recovery.addDocumentBtn')}
                      </button>
                    </div>
                  </div>

                  {/* Statistiques des documents — aucune pièce jointe stockée en base */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">{t('recovery.totalDocuments')}</div>
                      <div className="text-lg font-bold text-blue-900">—</div>
                      <div className="text-xs text-blue-600 mt-1">{t('recovery.allTypes')}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Factures</div>
                      <div className="text-lg font-bold text-green-900">—</div>
                      <div className="text-xs text-green-600 mt-1">{t('recovery.officialDocuments')}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="text-sm text-orange-600 font-medium">Correspondances</div>
                      <div className="text-lg font-bold text-orange-900">—</div>
                      <div className="text-xs text-orange-600 mt-1">Emails, courriers</div>
                    </div>
                    <div className="bg-primary-50 rounded-lg p-4">
                      <div className="text-sm text-primary-600 font-medium">{t('recovery.totalSize')}</div>
                      <div className="text-lg font-bold text-primary-900">—</div>
                      <div className="text-xs text-primary-600 mt-1">{t('recovery.usedSpace')}</div>
                    </div>
                  </div>

                  {/* Zone de glisser-déposer */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    <div className="flex flex-col items-center">
                      <Upload className="w-12 h-12 text-gray-700 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{t('recovery.dragDropFilesHere')}</h4>
                      <p className="text-gray-700 mb-4">{t('recovery.orClickToSelect')}</p>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        {t('recovery.browseFiles')}
                      </button>
                      <p className="text-xs text-gray-700 mt-2">{t('recovery.acceptedFormats')}</p>
                    </div>
                  </div>

                  {/* Liste des documents */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900">{t('recovery.caseDocuments')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.document')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.type')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.size')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.addedDate')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.addedBy')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.description')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              {t('recovery.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500">
                              {t('recovery.noDataNotImported')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Historique des documents */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.documentHistory')}</h4>
                    <div className="space-y-4">
                      <div className="py-10 text-center text-sm text-gray-500">
                        {t('recovery.noDataNotImported')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onglet Plans de Remboursement - Vue globale tous clients */}
      {activeTab === 'repaymentplan' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          {/* En-tête avec statistiques */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('recovery.globalPlanTracking')}</h2>
            </div>

            {/* KPIs globaux */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">{t('recovery.activePlans')}</div>
                <div className="text-lg font-bold text-blue-900">{repaymentKpis.actifs}</div>
                <div className="text-xs text-blue-600 mt-1">{t('status.inProgress')}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">{t('recovery.complianceRate')}</div>
                <div className="text-lg font-bold text-green-900">{repaymentKpis.tauxRespect}%</div>
                <div className="text-xs text-green-600 mt-1">{t('recovery.settledPlans')}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-orange-600 font-medium">{t('recovery.remainingAmount')}</div>
                <div className="text-lg font-bold text-orange-900">{formatCurrency(repaymentKpis.montantTotal)}</div>
                <div className="text-xs text-orange-600 mt-1">{t('recovery.underPlan')}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-red-600 font-medium">{t('recovery.overdueTitle')}</div>
                <div className="text-lg font-bold text-red-900">{repaymentKpis.enRetard}</div>
                <div className="text-xs text-red-600 mt-1">{t('recovery.noPayment')}</div>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">{t('recovery.allStatuses')}</option>
              <option value="respecte">{t('recovery.compliant')}</option>
              <option value="partiel">{t('recovery.partiallyCompliant')}</option>
              <option value="retard">{t('recovery.overdue')}</option>
              <option value="suspendu">Suspendu</option>
            </select>
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">{t('recovery.allCustomers')}</option>
              <option value="entreprise">Entreprises</option>
              <option value="particulier">Particuliers</option>
            </select>
            <input
              type="text"
              placeholder={t('recovery.searchPlanPh')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            />
          </div>

          {/* Tableau des plans de remboursement */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.planReference')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.customer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.totalAmount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.monthlyInstalment')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.paidInstalments')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.progress')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.nextDueDateCol')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    {t('recovery.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {repaymentPlans.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                      {t('recovery.noRepaymentPlan')}
                    </td>
                  </tr>
                )}
                {repaymentPlans.map((plan, index) => (
                  <tr key={plan.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">
                        {plan.reference}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {plan.client}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(plan.montantTotal)}
                      </div>
                      <div className="text-xs text-gray-700">
                        Reste: {formatCurrency(plan.montantRestant)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-400">—</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-400">—</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{plan.progression}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              plan.statut === 'Respecté' ? 'bg-green-500' :
                              plan.statut === 'En retard' ? 'bg-red-500' :
                              plan.statut === 'Partiel' ? 'bg-orange-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${plan.progression}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-400">—</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        plan.statut === 'Respecté' ? 'bg-green-100 text-green-800' :
                        plan.statut === 'En retard' ? 'bg-red-100 text-red-800' :
                        plan.statut === 'Partiel' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowPlanDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title={t('recovery.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowEnregistrerPaiementModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 p-1 rounded"
                          title={t('recovery.recordPayment')}
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowRelancePlanModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          title="Relancer"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alerte pour les plans en retard (aucun paiement enregistré) */}
          {repaymentPlans.some(p => p.statut === 'En retard') && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-yellow-800">{t('recovery.overduePlans')}</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    {repaymentPlans.filter(p => p.statut === 'En retard').length} plan(s) sans aucun paiement enregistré. Pensez à relancer les clients concernés.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {repaymentPlans.filter(p => p.statut === 'En retard').map(p => (
                      <span key={p.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {p.reference} — {p.client}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suivi du respect des plans — instantané réel (l'évolution mensuelle nécessite un historique non encore tracé) */}
          {repaymentPlans.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">{t('recovery.planCompliance')}</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { statut: 'Respectés', count: repaymentPlans.filter(p => p.statut === 'Respecté').length },
                    { statut: 'Partiels', count: repaymentPlans.filter(p => p.statut === 'Partiel').length },
                    { statut: 'En retard', count: repaymentPlans.filter(p => p.statut === 'En retard').length },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="statut" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Plans" fill="#235A6E" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contentieux' && (
        <ContentieuxTab
          allJournalEntries={allJournalEntries}
          getStatutColor={getStatutColor}
          setShowRapportMensuelModal={setShowRapportMensuelModal}
          setShowAnalyseROIModal={setShowAnalyseROIModal}
          setShowPerformanceEquipeModal={setShowPerformanceEquipeModal}
          setShowPrevisionTresorerieModal={setShowPrevisionTresorerieModal}
          setShowDossiersRisqueModal={setShowDossiersRisqueModal}
          setShowExportPersonnaliseModal={setShowExportPersonnaliseModal}
        />
      )}

      {/* Modal de création de dossier de recouvrement */}
      {showCreateDossierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('recovery.createCollectionCaseTitle')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('recovery.collectionType')}
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="amiable">Amiable</option>
                  <option value="judiciaire">Judiciaire</option>
                  <option value="huissier">Huissier</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('recovery.owner')}
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                  <option value="marie_dupont">—</option>
                  <option value="jean_martin">—</option>
                  <option value="sophie_bernard">—</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('recovery.initialComment')}
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                  placeholder={t('recovery.describeSituationPh')}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  {selectedFactures.size} facture{selectedFactures.size > 1 ? 's' : ''} sélectionnée{selectedFactures.size > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {t('recovery.invoicesWillMove')}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateDossierModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={async () => {
                  try {
                    // Création RÉELLE : regrouper les factures sélectionnées par client et
                    // créer un dossier de recouvrement (recoveryCases) par client.
                    const byClient = new Map<string, { name: string; montant: number }>();
                    for (const cr of mockCreances) {
                      for (const f of (cr.factures || [])) {
                        if (!selectedFactures.has(f.factureId)) continue;
                        const cur = byClient.get(cr.clientCode) || { name: cr.clientNom, montant: 0 };
                        cur.montant += f.montantRestant || 0;
                        byClient.set(cr.clientCode, cur);
                      }
                    }
                    if (byClient.size === 0) { toast.error(t('recovery.toastNoInvoiceSelected')); return; }
                    for (const [code, info] of byClient) {
                      await recoverySvc.createDossier({ client: info.name, clientId: code, montantPrincipal: info.montant, statut: 'actif', typeRecouvrement: 'amiable' } as any);
                    }
                    await reloadRecovery();
                    toast.success(t('recovery.toastCasesCreated', { count: String(byClient.size) }));
                    setShowCreateDossierModal(false);
                    setSelectedFactures(new Set());
                    setActiveTab('dossiers');
                  } catch (err) {
                    toast.error(t('recovery.toastCreateImpossible') + (err instanceof Error ? err.message : 'erreur'));
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('recovery.createCase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de détail de la dernière action */}
      {showDossierActionModal && selectedDossierAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Dernière Action - {selectedDossierAction.numeroRef}
              </h3>
              <button
                onClick={() => setShowDossierActionModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center space-x-2 mb-2">
                  {(() => {
                    const IconComponent = getActionIcon(selectedDossierAction.typeAction);
                    return <IconComponent className="w-5 h-5 text-blue-600" />;
                  })()}
                  <span className="font-medium text-gray-900">
                    {selectedDossierAction.typeAction.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  {selectedDossierAction.derniereAction}
                </p>
                <p className="text-xs text-gray-700">
                  Date: {formatDate(selectedDossierAction.dateAction)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{t('recovery.caseInformation')}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Client:</span>
                    <p className="font-medium">{selectedDossierAction.client}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsable:</span>
                    <p className="font-medium">{selectedDossierAction.responsable}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('recovery.totalAmountColon')}</span>
                    <p className="font-medium">{formatCurrency(selectedDossierAction.montantTotal)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Statut:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(selectedDossierAction.statut)}`}>
                      {getStatutLabel(selectedDossierAction.statut)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{t('recovery.nextStep')}</h4>
                <p className="text-sm text-blue-800">{selectedDossierAction.prochainEtape}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDossierActionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('recovery.close')}
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {t('recovery.newActionTitle')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de résumé du dossier */}
      {showDossierSummary && selectedDossierSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Résumé du Dossier {selectedDossierSummary.numeroRef}
              </h3>
              <button
                onClick={() => setShowDossierSummary(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations client */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 pb-2 border-b">{t('recovery.customerInfo')}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Client:</span>
                    <span className="font-medium">{selectedDossierSummary.client}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Responsable:</span>
                    <span className="font-medium">{selectedDossierSummary.responsable}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{selectedDossierSummary.typeRecouvrement}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut:</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(selectedDossierSummary.statut)}`}>
                      {getStatutLabel(selectedDossierSummary.statut)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informations financières */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 pb-2 border-b">{t('recovery.financialInformation')}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('recovery.totalAmountColon')}</span>
                    <span className="font-bold text-lg">{formatCurrency(selectedDossierSummary.montantTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('recovery.paidAmountColon')}</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedDossierSummary.montantPaye)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('recovery.remainingToCollectColon')}</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(selectedDossierSummary.montantTotal - selectedDossierSummary.montantPaye)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-700 mb-1">
                      <span>{t('recovery.collectionProgress')}</span>
                      <span>{((selectedDossierSummary.montantPaye / selectedDossierSummary.montantTotal) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(selectedDossierSummary.montantPaye / selectedDossierSummary.montantTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Détails supplémentaires */}
            <div className="mt-6 space-y-4">
              <h4 className="font-medium text-gray-900 pb-2 border-b">{t('recovery.caseDetails')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">{t('recovery.openingDateColon')}</span>
                  <p className="font-medium">{formatDate(selectedDossierSummary.dateOuverture)}</p>
                </div>
                <div>
                  <span className="text-gray-600">{t('recovery.invoiceCountColon')}</span>
                  <p className="font-medium">{selectedDossierSummary.nombreFactures}</p>
                </div>
                <div>
                  <span className="text-gray-600">DSO moyen:</span>
                  <p className={`font-medium ${selectedDossierSummary.dsoMoyen > 60 ? 'text-red-600' : selectedDossierSummary.dsoMoyen > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                    {selectedDossierSummary.dsoMoyen} jours
                  </p>
                </div>
              </div>
            </div>

            {/* Dernière action */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 pb-2 border-b">{t('recovery.lastAction')}</h4>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  {(() => {
                    const IconComponent = getActionIcon(selectedDossierSummary.typeAction);
                    return <IconComponent className="w-4 h-4 text-blue-600" />;
                  })()}
                  <span className="font-medium text-sm">{selectedDossierSummary.typeAction.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-700">{formatDate(selectedDossierSummary.dateAction)}</span>
                </div>
                <p className="text-sm text-gray-700">{selectedDossierSummary.derniereAction}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDossierSummary(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('recovery.close')}
              </button>
              <button
                onClick={() => {
                  setShowDossierSummary(false);
                  setSelectedDossierDetail(selectedDossierSummary);
                  setShowDossierDetail(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('recovery.editThisCase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal with Finance Manager Validation */}
      {showTransferModal && selectedTransferDossier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)]">
                  {t('recovery.transferToLitigationTitle')}
                </h2>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedTransferDossier(null);
                    setTransferDetails({
                      destinataire: '',
                      motif: '',
                      notes: '',
                      validationStatus: 'pending'
                    });
                  }}
                  className="text-gray-700 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              {/* Informations du dossier */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-3">{t('recovery.caseToTransfer')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('recovery.reference')}</label>
                    <p className="text-[var(--color-primary)] font-semibold">{selectedTransferDossier.numeroRef}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('recovery.customer')}</label>
                    <p className="text-[var(--color-primary)]">{selectedTransferDossier.client}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('recovery.totalAmount')}</label>
                    <p className="text-[var(--color-primary)] font-semibold">{formatCurrency(selectedTransferDossier.montantTotal)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">{t('recovery.currentOwner')}</label>
                    <p className="text-[var(--color-primary)]">{selectedTransferDossier.responsable}</p>
                  </div>
                </div>
              </div>

              {/* Formulaire de transfert */}
              {transferDetails.validationStatus === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service de destination <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={transferDetails.destinataire}
                      onChange={(e) => setTransferDetails({ ...transferDetails, destinataire: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('recovery.selectDepartment')}</option>
                      <option value="contentieux">{t('recovery.deptLitigationKone')}</option>
                      <option value="huissier">{t('recovery.deptBailiffDiallo')}</option>
                      <option value="juridique">{t('recovery.deptInternalLegal')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motif du transfert au contentieux <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={transferDetails.motif}
                      onChange={(e) => setTransferDetails({ ...transferDetails, motif: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('recovery.selectReason')}</option>
                      <option value="echec_amiable">{t('recovery.reasonAmicableFailure')}</option>
                      <option value="delai_depasse">{t('recovery.reasonDeadlineExceeded')}</option>
                      <option value="mauvaise_foi">{t('recovery.reasonBadFaith')}</option>
                      <option value="montant_important">{t('recovery.reasonLargeAmount')}</option>
                      <option value="client_insolvable">{t('recovery.reasonPotentiallyInsolvent')}</option>
                      <option value="litige_commercial">{t('recovery.reasonArbitration')}</option>
                      <option value="autre">{t('recovery.reasonOtherSingle')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('recovery.additionalNotes')}
                    </label>
                    <textarea
                      value={transferDetails.notes}
                      onChange={(e) => setTransferDetails({ ...transferDetails, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('recovery.transferAdditionalInfoPh')}
                    />
                  </div>

                  {/* Section Validation */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{t('recovery.approvalRequired')}</h4>
                        <p className="text-sm text-gray-600">
                          {t('recovery.transferNeedsFinanceManager')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowTransferModal(false);
                        setSelectedTransferDossier(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {t('recovery.cancel')}
                    </button>
                    <button
                      onClick={() => {
                        if (transferDetails.destinataire && transferDetails.motif) {
                          setTransferDetails({ ...transferDetails, validationStatus: 'approved' });
                        } else {
                          toast.error(t('recovery.toastFillRequiredFields'));
                        }
                      }}
                      disabled={!transferDetails.destinataire || !transferDetails.motif}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('recovery.submitForApproval')}
                    </button>
                  </div>
                </div>
              )}

              {/* État après validation */}
              {transferDetails.validationStatus === 'approved' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">{t('recovery.transferApproved')}</h4>
                        <p className="text-sm text-gray-600">
                          {t('recovery.financeManagerApproved', { ref: String(selectedTransferDossier.numeroRef) })}
                        </p>
                        <div className="mt-3 bg-white rounded p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">{t('recovery.approvedByColon')}</span>
                            <span className="font-medium">Jean-Paul KOUAME (Finance Manager)</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">{t('recovery.approvalDateColon')}</span>
                            <span className="font-medium">{new Date().toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">{t('recovery.destinationDeptColon')}</span>
                            <span className="font-medium">
                              {transferDetails.destinataire === 'contentieux' ? 'Service Contentieux - Maître KONE' :
                               transferDetails.destinataire === 'huissier' ? 'Huissier de Justice - Maître DIALLO' :
                               transferDetails.destinataire === 'juridique' ? 'Service Juridique Interne' : ''}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">{t('recovery.procedureTypeColon')}</span>
                            <span className="font-medium">{t('recovery.judicialCollection')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        toast.success(t('recovery.toastCaseTransferred', { ref: String(selectedTransferDossier.numeroRef) }));
                        setShowTransferModal(false);
                        setSelectedTransferDossier(null);
                        setTransferDetails({
                          destinataire: '',
                          motif: '',
                          notes: '',
                          validationStatus: 'pending'
                        });
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      {t('recovery.confirmTransfer')}
                    </button>
                  </div>
                </div>
              )}

              {/* État si rejeté */}
              {transferDetails.validationStatus === 'rejected' && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-1">{t('recovery.transferRefused')}</h4>
                        <p className="text-sm text-gray-600">
                          {t('recovery.financeManagerRefused')}
                        </p>
                        <div className="mt-3 bg-white rounded p-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{t('recovery.refusalReasonColon')}</span> Le dossier doit rester avec l'agent actuel jusqu'à la fin du mois.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowTransferModal(false);
                        setSelectedTransferDossier(null);
                        setTransferDetails({
                          destinataire: '',
                          motif: '',
                          notes: '',
                          validationStatus: 'pending'
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {t('recovery.close')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modales de Rapports */}
      {/* Modal Rapport Mensuel Consolidé */}
      {showRapportMensuelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-blue-600" />
                  {t('recovery.consolidatedMonthlyReportTitle')}
                </h2>
                <button
                  onClick={() => setShowRapportMensuelModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Période de rapport */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">{t('recovery.reportParameters')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">{t('recovery.period')}</label>
                      <select className="w-full border border-blue-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.january2024')}</option>
                        <option>{t('recovery.december2023')}</option>
                        <option>{t('recovery.november2023')}</option>
                        <option>{t('recovery.customEllipsis')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">{t('recovery.scope')}</label>
                      <select className="w-full border border-blue-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.amicablePlusLitigation')}</option>
                        <option>{t('recovery.amicableOnly')}</option>
                        <option>{t('recovery.litigationOnly')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-2">Format</label>
                      <select className="w-full border border-blue-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.detailedPdf')}</option>
                        <option>{t('recovery.excelWithData')}</option>
                        <option>{t('recovery.executivePowerPoint')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Aperçu des sections */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-[var(--color-primary)]">{t('recovery.reportSections')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{t('recovery.executiveSummary')}</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">{t('recovery.keyKpisTrendsAlerts')}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{t('recovery.amicablePerformance')}</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">{t('recovery.successRatesDelaysActions')}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{t('recovery.ongoingLitigation')}</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">{t('recovery.proceduresCostsResults')}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{t('recovery.financialAnalysis')}</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">ROI, provisions, cash impact</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Recommandations</span>
                        <input type="checkbox" defaultChecked className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">{t('recovery.priorityActionsOptimizations')}</p>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{t('recovery.detailedAppendices')}</span>
                        <input type="checkbox" className="rounded" />
                      </div>
                      <p className="text-sm text-gray-600">Listings, correspondances</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowRapportMensuelModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('recovery.cancel')}
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    {t('recovery.preview')}
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {t('recovery.generateTheReport')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Analyse ROI Détaillée */}
      {showAnalyseROIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-green-600" />
                  {t('recovery.detailedRoiAnalysisTitle')}
                </h2>
                <button
                  onClick={() => setShowAnalyseROIModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Filtres */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">{t('recovery.analysisCriteria')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">{t('recovery.period')}</label>
                      <select className="w-full border border-green-300 rounded-lg px-3 py-2">
                        <option>12 derniers mois</option>
                        <option>6 derniers mois</option>
                        <option>{t('recovery.currentYear')}</option>
                        <option>{t('recovery.custom')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">Phase</label>
                      <select className="w-full border border-green-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.allPhases')}</option>
                        <option>{t('recovery.amicableOnly')}</option>
                        <option>{t('recovery.litigationOnly')}</option>
                        <option>{t('recovery.enforcementOnly')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">{t('recovery.minAmount')}</label>
                      <input type="number" placeholder="0" className="w-full border border-green-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">Groupement</label>
                      <select className="w-full border border-green-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.byProcedure')}</option>
                        <option>{t('recovery.byAgent')}</option>
                        <option>{t('recovery.byCustomer')}</option>
                        <option>{t('recovery.bySector')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Métriques ROI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">ROI Global</h4>
                    <p className="text-lg font-bold text-green-600">3.2x</p>
                    <p className="text-sm text-gray-600">{t('recovery.plus15VsPrevPeriod')}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.costPerUnitCollected')}</h4>
                    <p className="text-lg font-bold text-orange-600">0.31€</p>
                    <p className="text-sm text-gray-600">-8% vs objectif</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.breakEvenDelay')}</h4>
                    <p className="text-lg font-bold text-blue-600">45j</p>
                    <p className="text-sm text-gray-600">{t('recovery.paybackPeriod')}</p>
                  </div>
                </div>

                {/* Répartition des coûts */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-[var(--color-primary)] mb-4">{t('recovery.costBreakdownByPhase')}</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Amiable</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{width: '65%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">65% (125k€)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('recovery.litigation')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-500 h-2 rounded-full" style={{width: '25%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">25% (48k€)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{t('recovery.enforcement')}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{width: '10%'}}></div>
                        </div>
                        <span className="text-sm text-gray-600">10% (19k€)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowAnalyseROIModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('recovery.cancel')}
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    {t('recovery.excelExport')}
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    {t('recovery.generateAnalysis')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Performance Équipes */}
      {showPerformanceEquipeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] flex items-center">
                  <Users className="w-6 h-6 mr-2 text-orange-600" />
                  {t('recovery.teamPerformanceTitle')}
                </h2>
                <button
                  onClick={() => setShowPerformanceEquipeModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Tableau de bord des agents */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-4">{t('recovery.individualPerformance')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-orange-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Agent</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Dossiers</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">{t('recovery.collected')}</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">{t('recovery.successRateShortLower')}</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">{t('recovery.averageDelay')}</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-200">
                        <tr>
                          <td className="px-4 py-3 font-medium">Marie KOUAM</td>
                          <td className="px-4 py-3 text-center">67</td>
                          <td className="px-4 py-3 text-center">1.2M€</td>
                          <td className="px-4 py-3 text-center text-green-600">89%</td>
                          <td className="px-4 py-3 text-center">32j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">A+</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">Paul MBEKI</td>
                          <td className="px-4 py-3 text-center">54</td>
                          <td className="px-4 py-3 text-center">890k€</td>
                          <td className="px-4 py-3 text-center text-orange-600">76%</td>
                          <td className="px-4 py-3 text-center">45j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">B</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">Sophie NDONG</td>
                          <td className="px-4 py-3 text-center">78</td>
                          <td className="px-4 py-3 text-center">1.5M€</td>
                          <td className="px-4 py-3 text-center text-green-600">85%</td>
                          <td className="px-4 py-3 text-center">38j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">A</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Métriques d'équipe */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.averageProductivity')}</h4>
                    <p className="text-lg font-bold text-orange-600">66 dossiers/mois</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.teamSuccessRate')}</h4>
                    <p className="text-lg font-bold text-green-600">83.5%</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.trainingRequired')}</h4>
                    <p className="text-lg font-bold text-red-600">2 agents</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.workload')}</h4>
                    <p className="text-lg font-bold text-blue-600">87%</p>
                  </div>
                </div>

                {/* Recommandations */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">{t('recovery.improvementRecommendations')}</h4>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                      <span className="text-sm">{t('recovery.recoTrainingMbeki')}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                      <span className="text-sm">{t('recovery.recoWorkloadKouam')}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
                      <span className="text-sm">{t('recovery.recoQuarterlyTargets')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowPerformanceEquipeModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('recovery.cancel')}
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    {t('recovery.detailedExport')}
                  </button>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                    {t('recovery.generateAnalysis')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Prévisions Trésorerie */}
      {showPrevisionTresorerieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] flex items-center">
                  <TrendingUp className="w-6 h-6 mr-2 text-primary-600" />
                  {t('recovery.treasuryForecastTitle')}
                </h2>
                <button
                  onClick={() => setShowPrevisionTresorerieModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Paramètres de prévision */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <h3 className="font-semibold text-primary-900 mb-3">{t('recovery.forecastParameters')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">Horizon</label>
                      <select className="w-full border border-primary-300 rounded-lg px-3 py-2">
                        <option>3 mois glissants</option>
                        <option>6 mois glissants</option>
                        <option>12 mois glissants</option>
                        <option>{t('recovery.custom')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">{t('recovery.scenario')}</label>
                      <select className="w-full border border-primary-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.scenarioRealistic')}</option>
                        <option>{t('recovery.scenarioOptimistic')}</option>
                        <option>{t('recovery.scenarioPessimistic')}</option>
                        <option>Conservateur</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary-700 mb-2">{t('recovery.granularity')}</label>
                      <select className="w-full border border-primary-300 rounded-lg px-3 py-2">
                        <option>Mensuelle</option>
                        <option>Hebdomadaire</option>
                        <option>Quotidienne</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Prévisions consolidées */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.monthPlus1')}</h4>
                    <p className="text-lg font-bold text-green-600">2.1M€</p>
                    <p className="text-sm text-gray-600">{t('recovery.expectedCollections')}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Amiable: 1.4M€</span>
                        <span>Contentieux: 0.7M€</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.monthPlus2')}</h4>
                    <p className="text-lg font-bold text-blue-600">1.8M€</p>
                    <p className="text-sm text-gray-600">{t('recovery.expectedCollections')}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Amiable: 1.2M€</span>
                        <span>Contentieux: 0.6M€</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-[var(--color-primary)] mb-2">{t('recovery.monthPlus3')}</h4>
                    <p className="text-lg font-bold text-orange-600">1.5M€</p>
                    <p className="text-sm text-gray-600">{t('recovery.expectedCollections')}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Amiable: 0.9M€</span>
                        <span>Contentieux: 0.6M€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Facteurs d'impact */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-3">{t('recovery.forecastImpactFactors')}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('recovery.seasonalitySummer')}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">-12%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('recovery.newProcedures')}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">+8%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t('recovery.economicContext')}</span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">-5%</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowPrevisionTresorerieModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('recovery.cancel')}
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    {t('recovery.exportToFinance')}
                  </button>
                  <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    {t('recovery.generateForecasts')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dossiers à Risque */}
      {showDossiersRisqueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
                  {t('recovery.casesAtRiskAndAlerts')}
                </h2>
                <button
                  onClick={() => setShowDossiersRisqueModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Alertes critiques */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {t('recovery.criticalAlerts')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                      <div>
                        <p className="font-medium text-red-900">CAMEROUN INDUSTRIES</p>
                        <p className="text-sm text-red-700">{t('recovery.alertNoReply15d')}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                          {t('recovery.escalate')}
                        </button>
                        <button className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700">
                          {t('recovery.litigation')}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                      <div>
                        <p className="font-medium text-red-900">SARL TOGO TRADING</p>
                        <p className="text-sm text-red-700">{t('recovery.alertLiquidation')}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                          {t('recovery.declaration')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dossiers surveillés */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-3">{t('recovery.casesUnderWatch')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-orange-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">{t('recovery.customer')}</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">{t('recovery.amount')}</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Retard</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Risque</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-orange-700 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-200">
                        <tr>
                          <td className="px-4 py-3 font-medium">BURKINA LOGISTICS</td>
                          <td className="px-4 py-3 text-center">67k€</td>
                          <td className="px-4 py-3 text-center">25j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">Moyen</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-orange-600 hover:text-orange-800 text-xs">Relancer</button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3 font-medium">GUINÉE IMPORT</td>
                          <td className="px-4 py-3 text-center">43k€</td>
                          <td className="px-4 py-3 text-center">18j</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">Faible</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-orange-600 hover:text-orange-800 text-xs">Suivre</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recommandations */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-3">{t('recovery.actionRecommendations')}</h4>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                      <span className="bg-red-500 w-2 h-2 rounded-full mt-2"></span>
                      <span className="text-sm">{t('recovery.recoMoveToLitigation48h')}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-orange-500 w-2 h-2 rounded-full mt-2"></span>
                      <span className="text-sm">{t('recovery.recoDailyFollowUp')}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="bg-yellow-500 w-2 h-2 rounded-full mt-2"></span>
                      <span className="text-sm">{t('recovery.recoReviewPaymentTerms')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowDossiersRisqueModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('recovery.cancel')}
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    {t('recovery.exportList')}
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    {t('recovery.generateAlerts')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Export Personnalisé */}
      {showExportPersonnaliseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[var(--color-primary)] flex items-center">
                  <Download className="w-6 h-6 mr-2 text-gray-600" />
                  {t('recovery.customExportTitle')}
                </h2>
                <button
                  onClick={() => setShowExportPersonnaliseModal(false)}
                  className="text-gray-700 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Sélection du format */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.exportFormat')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="format" value="excel" defaultChecked className="text-blue-600" />
                      <div>
                        <p className="font-medium">{t('recovery.excelXlsx')}</p>
                        <p className="text-sm text-gray-600">{t('recovery.rawDataPlusCharts')}</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="format" value="pdf" className="text-blue-600" />
                      <div>
                        <p className="font-medium">PDF</p>
                        <p className="text-sm text-gray-600">{t('recovery.formattedReport')}</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input type="radio" name="format" value="csv" className="text-blue-600" />
                      <div>
                        <p className="font-medium">CSV</p>
                        <p className="text-sm text-gray-600">{t('recovery.dataOnly')}</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Sélection des données */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.dataToExport')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">{t('recovery.mainTables')}</h4>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">{t('recovery.receivablesFullList')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">{t('recovery.litigationCases')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{t('recovery.reminderHistoryLower')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">Correspondances</span>
                      </label>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">{t('recovery.metricsAndKpis')}</h4>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">{t('recovery.performanceByAgent')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm">{t('recovery.roiAnalysis')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{t('recovery.timeTrend')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{t('recovery.forecasts')}</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Filtres */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--color-primary)] mb-3">Filtres</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.period')}</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.currentYear')}</option>
                        <option>12 derniers mois</option>
                        <option>{t('recovery.currentMonth')}</option>
                        <option>{t('recovery.custom')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.status')}</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>Tous</option>
                        <option>{t('recovery.ongoingOnly')}</option>
                        <option>{t('recovery.resolvedOnly')}</option>
                        <option>{t('recovery.litigation')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('recovery.minAmount')}</label>
                      <input type="number" placeholder="0" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option>{t('recovery.allAgents')}</option>
                        <option>Marie KOUAM</option>
                        <option>Paul MBEKI</option>
                        <option>Sophie NDONG</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowExportPersonnaliseModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('recovery.cancel')}
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    {t('recovery.previewBtn')}
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {t('recovery.export')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Détail Plan de Remboursement */}
      {showPlanDetailModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-primary)]">
                  Détail Plan de Remboursement - {selectedPlan.reference}
                </h2>
                <p className="text-gray-600 mt-1">Client: {selectedPlan.client}</p>
              </div>
              <button
                onClick={() => setShowPlanDetailModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.planInformation')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.referenceColon')}</span>
                      <span className="font-medium">{selectedPlan.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.totalAmountColon')}</span>
                      <span className="font-medium text-[var(--color-primary)]">{formatCurrency(selectedPlan.montantTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.monthlyInstalmentColon')}</span>
                      <span className="font-medium">{selectedPlan.mensualite > 0 ? formatCurrency(selectedPlan.mensualite) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.durationColon')}</span>
                      <span className="font-medium">{selectedPlan.mensualite > 0 ? `${Math.round(selectedPlan.montantTotal / selectedPlan.mensualite)} mois` : '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.progress')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.paidInstalmentsColon')}</span>
                      <span className="font-medium text-green-600">{selectedPlan.echeancesPayees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.paidAmountColon')}</span>
                      <span className="font-medium text-green-600">{formatCurrency(selectedPlan.montantPaye)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('recovery.remainingAmountColon')}</span>
                      <span className="font-medium text-orange-600">{formatCurrency(selectedPlan.montantRestant)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Progression:</span>
                      <span className="font-medium">{Math.round((selectedPlan.montantPaye / selectedPlan.montantTotal) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Échéancier */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-semibold text-[var(--color-primary)]">{t('recovery.schedule')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.dueDate')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.deadline')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.amount')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.paymentDateShort')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('recovery.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedPlan.mensualite <= 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                            {t('recovery.noScheduleDefined')}
                          </td>
                        </tr>
                      )}
                      {selectedPlan.mensualite > 0 && Array.from({ length: Math.round(selectedPlan.montantTotal / selectedPlan.mensualite) }, (_, i) => {
                        const echeanceDate = new Date();
                        echeanceDate.setMonth(echeanceDate.getMonth() + i);
                        const isPaid = i < Number(selectedPlan.echeancesPayees);
                        const isCurrentMonth = i === Number(selectedPlan.echeancesPayees);

                        return (
                          <tr key={i} className={isCurrentMonth ? 'bg-yellow-50' : ''}>
                            <td className="px-4 py-3 text-sm">Échéance {i + 1}</td>
                            <td className="px-4 py-3 text-sm">{echeanceDate.toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm font-medium">{formatCurrency(selectedPlan.mensualite)}</td>
                            <td className="px-4 py-3 text-sm">
                              {isPaid ? new Date(Date.now() - (Number(selectedPlan.echeancesPayees) - i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isPaid ? 'bg-green-100 text-green-800' :
                                isCurrentMonth ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {isPaid ? 'Payé' : isCurrentMonth ? 'En cours' : 'À venir'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowPlanDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.close')}
                </button>
                <button
                  onClick={() => {
                    setShowPlanDetailModal(false);
                    setShowEnregistrerPaiementModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('recovery.recordPayment')}
                </button>
                <button
                  onClick={() => {
                    setShowPlanDetailModal(false);
                    setShowRelancePlanModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('recovery.sendReminderShort')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Enregistrer Paiement */}
      {showEnregistrerPaiementModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-primary)]">
                  {t('recovery.recordPaymentTitle')}
                </h2>
                <p className="text-gray-600 mt-1">Plan: {selectedPlan.reference} - {selectedPlan.client}</p>
              </div>
              <button
                onClick={() => setShowEnregistrerPaiementModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations du plan */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.planInformation')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('recovery.totalAmountColon')}</span>
                    <div className="font-medium">{formatCurrency(selectedPlan.montantTotal)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('recovery.remainingAmountColon')}</span>
                    <div className="font-medium text-orange-600">{formatCurrency(selectedPlan.montantRestant)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('recovery.monthlyInstalmentColon')}</span>
                    <div className="font-medium">{selectedPlan.mensualite > 0 ? formatCurrency(selectedPlan.mensualite) : '—'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('recovery.nextInstalmentColon')}</span>
                    <div className="font-medium">{selectedPlan.prochaineEcheance ? new Date(selectedPlan.prochaineEcheance).toLocaleDateString() : '—'}</div>
                  </div>
                </div>
              </div>

              {/* Formulaire de paiement */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('recovery.paymentDateReq')}
                    </label>
                    <input
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('recovery.paidAmountFcfaReq')}
                    </label>
                    <input
                      type="number"
                      placeholder={selectedPlan.mensualite.toString()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      min="0"
                      max={selectedPlan.montantRestant}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('recovery.paymentModeReq')}
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                      <option value="">{t('recovery.selectEllipsis')}</option>
                      <option value="virement">{t('recovery.bankTransfer')}</option>
                      <option value="cheque">{t('recovery.check')}</option>
                      <option value="especes">{t('recovery.cash')}</option>
                      <option value="mobile">Mobile Money</option>
                      <option value="carte">{t('recovery.bankCard')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('recovery.transactionReference')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('recovery.referenceNumberPh')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('recovery.notesObservations')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={t('recovery.paymentCommentsPh')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                {/* Options avancées */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Options</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{t('recovery.sendReceiptToCustomer')}</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{t('recovery.autoApplySurplus')}</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{t('recovery.updateAccountingBalance')}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowEnregistrerPaiementModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.cancel')}
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  {t('recovery.previewBtn')}
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  {t('recovery.savePayment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Relance Plan */}
      {showRelancePlanModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-primary)]">
                  {t('recovery.repaymentPlanReminder')}
                </h2>
                <p className="text-gray-600 mt-1">Plan: {selectedPlan.reference} - {selectedPlan.client}</p>
              </div>
              <button
                onClick={() => setShowRelancePlanModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Situation actuelle */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-[var(--color-primary)] mb-3">{t('recovery.planSituation')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">{t('recovery.currentStatusColon')}</span>
                    <div className={`font-medium ${
                      selectedPlan.statut === 'Respecté' ? 'text-green-600' :
                      selectedPlan.statut === 'En retard' ? 'text-red-600' :
                      'text-orange-600'
                    }`}>
                      {selectedPlan.statut}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('recovery.nextInstalmentColon')}</span>
                    <div className="font-medium">{selectedPlan.prochaineEcheance ? new Date(selectedPlan.prochaineEcheance).toLocaleDateString() : '—'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">{t('recovery.expectedAmountColon')}</span>
                    <div className="font-medium">{selectedPlan.mensualite > 0 ? formatCurrency(selectedPlan.mensualite) : '—'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Retard:</span>
                    <div className="font-medium text-red-600">
                      {selectedPlan.statut === 'En retard'
                        ? `${Math.ceil((new Date().getTime() - new Date(selectedPlan.prochaineEcheance).getTime()) / (1000 * 60 * 60 * 24))} jours`
                        : 'Aucun'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Type de relance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('recovery.reminderTypeReq')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="typeRelance" value="email" className="mr-3" defaultChecked />
                    <div>
                      <div className="font-medium">Email</div>
                      <div className="text-xs text-gray-700">{t('recovery.electronicNotification')}</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="typeRelance" value="sms" className="mr-3" />
                    <div>
                      <div className="font-medium">SMS</div>
                      <div className="text-xs text-gray-700">{t('recovery.textMessage')}</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input type="radio" name="typeRelance" value="courrier" className="mr-3" />
                    <div>
                      <div className="font-medium">Courrier</div>
                      <div className="text-xs text-gray-700">{t('recovery.registeredLetter')}</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Template de message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('recovery.messageTemplate')}
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3">
                  <option value="rappel_gentil">{t('recovery.templateGentleReminder')}</option>
                  <option value="rappel_ferme">{t('recovery.templateFirmReminder')}</option>
                  <option value="mise_en_demeure">{t('recovery.templateFormalNotice')}</option>
                  <option value="personnalise">{t('recovery.templateCustomMessage')}</option>
                </select>

                <textarea
                  rows={6}
                  defaultValue={`Madame, Monsieur ${selectedPlan.client},

Nous vous rappelons que votre plan de remboursement ${selectedPlan.reference} prévoit une échéance de ${formatCurrency(selectedPlan.mensualite)} pour le ${new Date(selectedPlan.prochaineEcheance).toLocaleDateString()}.

${selectedPlan.statut === 'En retard' ?
  `Nous constatons un retard de paiement. Nous vous remercions de bien vouloir régulariser votre situation dans les plus brefs délais.` :
  `Cette échéance arrive prochainement. Nous vous remercions de bien vouloir honorer ce paiement dans les délais convenus.`
}

En cas de difficulté, n'hésitez pas à nous contacter pour étudier ensemble une solution adaptée.

Cordialement,
L'équipe recouvrement`}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* Options */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">{t('recovery.reminderOptions')}</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">{t('recovery.scheduleAutoFollowUp')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{t('recovery.copySalesManager')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{t('recovery.saveInLitigationHistory')}</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setShowRelancePlanModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('recovery.cancel')}
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  {t('recovery.previewBtn')}
                </button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  {t('recovery.sendTheReminder')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Nouvelle Action */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-primary)]">
                  {t('recovery.newCollectionAction')}
                </h2>
                {selectedCreance && (
                  <p className="text-gray-600 mt-1">
                    Client: {(selectedCreance as { client?: string }).client} - {formatCurrency(selectedCreance.montantTotal)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionFormData({
                    typeAction: 'APPEL',
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5),
                    responsable: '',
                    details: '',
                    montantPromis: '',
                    datePromesse: ''
                  });
                }}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Type d'action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('recovery.actionTypeReq')}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { value: 'APPEL', label: 'Appel téléphonique', icon: Phone },
                    { value: 'EMAIL', label: 'Email', icon: Mail },
                    { value: 'COURRIER', label: 'Courrier', icon: FileText },
                    { value: 'SMS', label: 'SMS', icon: MessageSquare },
                    { value: 'VISITE', label: 'Visite', icon: UserCheck },
                    { value: 'MISE_EN_DEMEURE', label: 'Mise en demeure', icon: AlertTriangle }
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setActionFormData({ ...actionFormData, typeAction: type.value as typeof actionFormData.typeAction })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          actionFormData.typeAction === type.value
                            ? 'border-orange-600 bg-orange-50 text-orange-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${
                          actionFormData.typeAction === type.value ? 'text-orange-600' : 'text-gray-700'
                        }`} />
                        <div className="text-xs font-medium">{type.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date et heure */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('recovery.dateReq')}
                  </label>
                  <input
                    type="date"
                    value={actionFormData.date}
                    onChange={(e) => setActionFormData({ ...actionFormData, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('recovery.time')}
                  </label>
                  <input
                    type="time"
                    value={actionFormData.heure}
                    onChange={(e) => setActionFormData({ ...actionFormData, heure: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Responsable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('recovery.ownerReq')}
                </label>
                <select
                  value={actionFormData.responsable}
                  onChange={(e) => setActionFormData({ ...actionFormData, responsable: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">{t('recovery.selectOwnerPh')}</option>
                  <option value="">—</option>
                  <option value="">—</option>
                  <option value="">—</option>
                  <option value="">—</option>
                  <option value="">—</option>
                </select>
              </div>

              {/* Détails / Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('recovery.detailsNotesReq')}
                </label>
                <textarea
                  rows={4}
                  value={actionFormData.details}
                  onChange={(e) => setActionFormData({ ...actionFormData, details: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder={t('recovery.describeActionPh')}
                />
              </div>

              {/* Montant promis (optionnel) */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">{t('recovery.paymentCommitmentOptional')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('recovery.promisedAmountFcfa')}
                    </label>
                    <input
                      type="number"
                      value={actionFormData.montantPromis}
                      onChange={(e) => setActionFormData({ ...actionFormData, montantPromis: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('recovery.promiseDate')}
                    </label>
                    <input
                      type="date"
                      value={actionFormData.datePromesse}
                      onChange={(e) => setActionFormData({ ...actionFormData, datePromesse: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Options supplémentaires */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm">{t('recovery.scheduleAutoFollowUp')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{t('recovery.notifySalesManager')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{t('recovery.sendConfirmationEmail')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionFormData({
                    typeAction: 'APPEL',
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5),
                    responsable: '',
                    details: '',
                    montantPromis: '',
                    datePromesse: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('recovery.cancel')}
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!selectedCreance) return;
                    // Persistance RÉELLE : trouver (ou créer) le dossier de recouvrement du
                    // client, puis y enregistrer l'action (relance/appel/mise en demeure…).
                    let dossier: any = recoveryCases.find((c: any) => c.clientId === selectedCreance.clientCode || c.clientName === selectedCreance.clientNom);
                    if (!dossier) {
                      dossier = await recoverySvc.createDossier({ client: selectedCreance.clientNom, clientId: selectedCreance.clientCode, montantPrincipal: selectedCreance.montantTotal || 0, statut: 'actif', typeRecouvrement: 'amiable' } as any);
                    }
                    await recoverySvc.addAction(dossier.id, {
                      type: (actionFormData.typeAction || 'APPEL') as any,
                      date: actionFormData.date,
                      responsable: actionFormData.responsable,
                      resultat: actionFormData.details,
                      notes: actionFormData.montantPromis ? `Promesse: ${actionFormData.montantPromis} le ${actionFormData.datePromesse}` : '',
                    });
                    await reloadRecovery();
                    toast.success(t('recovery.toastActionSaved'));
                    setShowActionModal(false);
                    setActionFormData({
                      typeAction: 'APPEL',
                      date: new Date().toISOString().split('T')[0],
                      heure: new Date().toTimeString().slice(0, 5),
                      responsable: '',
                      details: '',
                      montantPromis: '',
                      datePromesse: ''
                    });
                  } catch (err) {
                    toast.error(t('recovery.toastSaveImpossible') + (err instanceof Error ? err.message : 'erreur'));
                  }
                }}
                disabled={!actionFormData.date || !actionFormData.details}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('recovery.saveAction')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RecouvrementModule;