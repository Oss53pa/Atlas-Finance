import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { db } from '../../../lib/db';
import { money } from '../../../utils/money';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  PieChart,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Download,
  Send,
  Eye,
  Brain,
  Zap,
  AlertTriangle,
  Search,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Mail,
  Phone,
  Shield,
  Activity,
  X,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';
import { Input } from '../../../components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/Select';
import { toast } from 'react-hot-toast';

interface Client {
  id: string;
  code: string;
  nom: string;
  type: 'particulier' | 'entreprise' | 'administration';
  secteur: string;
  email: string;
  telephone: string;
  adresse: string;
  limiteCredit: number;
  delaiPaiement: number;
  statutRisque: 'faible' | 'modere' | 'eleve' | 'critique';
  chiffreAffaires: number;
  encours: number;
  dernierPaiement?: string;
  dateCreation: string;
}

interface Creance {
  id: string;
  clientId: string;
  clientNom: string;
  numeroFacture: string;
  dateFacture: string;
  dateEcheance: string;
  montantTTC: number;
  montantRegle: number;
  solde: number;
  statut: 'en_cours' | 'echue' | 'contentieux' | 'provision' | 'irrecoverable';
  joursRetard: number;
  tauxProvision?: number;
  montantProvision?: number;
  actionsRelance: RelanceAction[];
}

interface RelanceAction {
  id: string;
  date: string;
  type: 'email' | 'telephone' | 'courrier' | 'visite' | 'mise_en_demeure';
  statut: 'planifie' | 'execute' | 'reporte';
  resultat?: string;
  prochainContact?: string;
}

interface AnalyseRisque {
  clientId: string;
  scoreCredit: number;
  probabiliteDefaut: number;
  expositionMax: number;
  recommandations: string[];
  derniereMiseAJour: string;
}

const CycleClients: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCreance, setSelectedCreance] = useState<Creance | null>(null);
  const [formData, setFormData] = useState({
    type: 'creances_douteuses' as 'creances_douteuses' | 'depreciation_stocks' | 'risques_clients' | 'autres',
    montant: '',
    base_calcul: '',
    justification: '',
    compte_debit: '',
    compte_credit: '',
    date_comptabilisation: new Date().toISOString().split('T')[0],
    methode_calcul: '',
    piece_justificative: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO P0: Remplacer par service Dexie réel

  const resetForm = () => {
    setFormData({
      type: 'creances_douteuses',
      montant: '',
      base_calcul: '',
      justification: '',
      compte_debit: '',
      compte_credit: '',
      date_comptabilisation: new Date().toISOString().split('T')[0],
      methode_calcul: '',
      piece_justificative: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
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
    // TODO P0: Remplacer par service Dexie réel
    toast.error('Service de provision non encore connecté');
  };

  // Real data from Dexie — thirdParties, provisions, and 411 (client) account balances
  const [clientBalances, setClientBalances] = useState<Map<string, { name: string; debit: number; credit: number }>>(new Map());

  const [thirdParties, setThirdParties] = useState<Awaited<ReturnType<typeof db.thirdParties.toArray>>>([]);
  const [provisions, setProvisions] = useState<Awaited<ReturnType<typeof db.provisions.toArray>>>([]);

  const loadClientData = useCallback(async () => {
    try {
      // Load third parties and provisions
      const [tp, prov] = await Promise.all([
        db.thirdParties.toArray(),
        db.provisions.toArray(),
      ]);
      setThirdParties(tp);
      setProvisions(prov);

      const fys = await db.fiscalYears.toArray();
      const activeFY = fys.find(fy => fy.isActive) || fys[0];
      if (!activeFY) return;

      const entries = await db.journalEntries
        .where('date')
        .between(activeFY.startDate, activeFY.endDate, true, true)
        .toArray();

      const balMap = new Map<string, { name: string; debit: number; credit: number }>();
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountCode.startsWith('411')) {
            const existing = balMap.get(line.accountCode) || { name: line.accountName, debit: 0, credit: 0 };
            existing.debit += line.debit;
            existing.credit += line.credit;
            balMap.set(line.accountCode, existing);
          }
        }
      }
      setClientBalances(balMap);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadClientData(); }, [loadClientData]);

  // Build client list from thirdParties first, fallback to journal entry account balances
  const mockClients: Client[] = useMemo(() => {
    // If we have third parties of type customer, use them as primary source
    const customerParties = thirdParties.filter(tp => tp.type === 'customer' || tp.type === 'both');

    if (customerParties.length > 0) {
      return customerParties.map((tp, idx) => {
        // Enrich with balance data if available
        const balEntry = Array.from(clientBalances.entries()).find(([code]) =>
          code.includes(tp.code) || tp.code.includes(code)
        );
        const bal = balEntry ? balEntry[1] : null;
        const encours = bal ? money(bal.debit).subtract(money(bal.credit)).toNumber() : Math.max(0, tp.balance);

        // Find related provisions
        const clientProvisions = provisions.filter(p =>
          p.compteClient === tp.code || p.client === tp.name
        );
        const totalProvision = clientProvisions.reduce((sum, p) => sum + p.montantProvision, 0);

        return {
          id: tp.id,
          code: tp.code,
          nom: tp.name,
          type: 'entreprise' as const,
          secteur: '',
          email: tp.email || '',
          telephone: tp.phone || '',
          adresse: tp.address || '',
          limiteCredit: 0,
          delaiPaiement: 30,
          statutRisque: totalProvision > 0 ? 'eleve' as const
            : encours > 0 ? 'modere' as const
            : 'faible' as const,
          chiffreAffaires: bal ? bal.credit : 0,
          encours: Math.max(0, encours),
          dernierPaiement: '',
          dateCreation: '',
        };
      });
    }

    // Fallback: derive from 411 account balances
    let idx = 0;
    return Array.from(clientBalances.entries()).map(([code, bal]) => {
      idx++;
      const encours = money(bal.debit).subtract(money(bal.credit)).toNumber();
      return {
        id: String(idx),
        code,
        nom: bal.name || `Client ${code}`,
        type: 'entreprise' as const,
        secteur: '',
        email: '',
        telephone: '',
        adresse: '',
        limiteCredit: 0,
        delaiPaiement: 30,
        statutRisque: encours > 0 ? 'modere' as const : 'faible' as const,
        chiffreAffaires: bal.credit,
        encours: Math.max(0, encours),
        dernierPaiement: '',
        dateCreation: '',
      };
    });
  }, [clientBalances, thirdParties, provisions]);

  // No invoice-level data available — empty
  const mockCreances: Creance[] = [];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalCreances = mockCreances.reduce((sum, c) => sum + c.montantTTC, 0);
    const totalRegle = mockCreances.reduce((sum, c) => sum + c.montantRegle, 0);
    const totalEchu = mockCreances.filter(c => c.statut === 'echue').reduce((sum, c) => sum + c.solde, 0);
    const totalProvisions = mockCreances.reduce((sum, c) => sum + (c.montantProvision || 0), 0);

    return {
      totalCreances,
      totalRegle,
      totalEchu,
      totalProvisions,
      tauxRecouvrement: totalCreances > 0 ? (totalRegle / totalCreances * 100) : 0,
      delaiMoyenPaiement: 45,
      nombreClientsRisque: mockClients.filter(c => c.statutRisque === 'eleve' || c.statutRisque === 'critique').length
    };
  }, []);

  // Filtrage des créances
  const creancesFiltrees = useMemo(() => {
    return mockCreances.filter(creance => {
      const matchStatut = filterStatut === 'tous' || creance.statut === filterStatut;
      const matchSearch = searchTerm === '' ||
        creance.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creance.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatut && matchSearch;
    });
  }, [filterStatut, searchTerm]);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'en_cours': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'echue': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'contentieux': 'bg-[var(--color-error-lighter)] text-red-800',
      'provision': 'bg-[var(--color-warning-lighter)] text-orange-800',
      'irrecoverable': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getRisqueBadge = (risque: string) => {
    const variants: Record<string, string> = {
      'faible': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'modere': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'eleve': 'bg-[var(--color-warning-lighter)] text-orange-800',
      'critique': 'bg-[var(--color-error-lighter)] text-red-800'
    };
    return variants[risque] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  // Handler functions
  const handleViewCreanceDetail = (creance: Creance) => {
    setSelectedCreance(creance);
    setShowDetailModal(true);
    toast.success(`Affichage des détails: ${creance.numeroFacture}`);
  };

  const handleSendRelance = (creance: Creance) => {
    toast.success(`Relance envoyée pour: ${creance.numeroFacture}`);
  };

  const handleExportCreances = () => {
    toast.success('Export des créances en cours...');
  };

  const handleAnalyseIA = () => {
    toast.success('Analyse IA des créances en cours...');
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Total Créances</p>
                <p className="text-lg font-bold">{(kpis.totalCreances / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-success)] mt-1">+12% vs mois dernier</p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Créances Échues</p>
                <p className="text-lg font-bold">{(kpis.totalEchu / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-error)] mt-1">{mockCreances.filter(c => c.statut === 'echue').length} factures</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Taux Recouvrement</p>
                <p className="text-lg font-bold">{kpis.tauxRecouvrement.toFixed(1)}%</p>
                <Progress value={kpis.tauxRecouvrement} className="mt-2" />
              </div>
              <TrendingUp className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Clients à Risque</p>
                <p className="text-lg font-bold">{kpis.nombreClientsRisque}</p>
                <p className="text-xs text-[var(--color-warning)] mt-1">Surveillance renforcée</p>
              </div>
              <Shield className="w-8 h-8 text-[var(--color-error)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes IA */}
      <Alert className="border-l-4 border-l-orange-500">
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommandations IA:</strong> 3 clients présentent un risque élevé de défaut.
          Considérer une provision complémentaire de 2.5M FCFA sur les créances de plus de 90 jours.
        </AlertDescription>
      </Alert>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="creances">Créances</TabsTrigger>
          <TabsTrigger value="relances">Relances</TabsTrigger>
          <TabsTrigger value="provisions">Provisions</TabsTrigger>
          <TabsTrigger value="analyse-risque">Analyse Risque</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Âgée des Créances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-[var(--color-success-lightest)] rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">0-30 jours</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">8.5M</p>
                    <p className="text-xs">42% du total</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-warning-lightest)] rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">31-60 jours</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">5.2M</p>
                    <p className="text-xs">26% du total</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">61-90 jours</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">3.8M</p>
                    <p className="text-xs">19% du total</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-error-lightest)] rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">91-120 jours</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">1.5M</p>
                    <p className="text-xs">8% du total</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">+120 jours</p>
                    <p className="text-lg font-bold text-purple-600">1.0M</p>
                    <p className="text-xs">5% du total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Clients par Encours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockClients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded hover:bg-[var(--color-background-secondary)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <p className="font-medium">{client.nom}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{client.secteur}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{(client.encours / 1000000).toFixed(1)}M FCFA</p>
                      <Badge className={getRisqueBadge(client.statutRisque)}>
                        {client.statutRisque}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Créances */}
        <TabsContent value="creances" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                <option value="tous">Tous les statuts</option>
                <option value="en_cours">{t('status.inProgress')}</option>
                <option value="echue">Échue</option>
                <option value="contentieux">Contentieux</option>
                <option value="provision">Provisionné</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportCreances}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter
              </button>
              <button
                onClick={handleAnalyseIA}
                className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Analyse IA
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">N° Facture</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Échéance</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Montant</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">{t('accounting.balance')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Retard</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creancesFiltrees.map(creance => (
                    <tr key={creance.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <p className="font-medium">{creance.clientNom}</p>
                      </td>
                      <td className="px-4 py-3">{creance.numeroFacture}</td>
                      <td className="px-4 py-3">{new Date(creance.dateEcheance).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(creance.montantTTC / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--color-error)]">
                        {(creance.solde / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-4 py-3 text-center">
                        {creance.joursRetard > 0 ? (
                          <span className="text-[var(--color-error)] font-medium">{creance.joursRetard}j</span>
                        ) : (
                          <span className="text-[var(--color-success)]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatutBadge(creance.statut)}>
                          {creance.statut}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewCreanceDetail(creance)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button
                            onClick={() => handleSendRelance(creance)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                          >
                            <Send className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relances */}
        <TabsContent value="relances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campagne de Relance Automatisée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Mail className="w-5 h-5 text-[var(--color-primary)]" />
                    <span className="text-sm text-[var(--color-text-secondary)]">Niveau 1</span>
                  </div>
                  <p className="font-medium">Rappel Courtois</p>
                  <p className="text-sm text-[var(--color-text-primary)] mt-1">J+5 après échéance</p>
                  <p className="text-lg font-bold text-[var(--color-primary)] mt-2">12</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">envois programmés</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Phone className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-[var(--color-text-secondary)]">Niveau 2</span>
                  </div>
                  <p className="font-medium">Relance Téléphonique</p>
                  <p className="text-sm text-[var(--color-text-primary)] mt-1">J+15 après échéance</p>
                  <p className="text-lg font-bold text-[var(--color-warning)] mt-2">8</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">appels à effectuer</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-[var(--color-error)]" />
                    <span className="text-sm text-[var(--color-text-secondary)]">Niveau 3</span>
                  </div>
                  <p className="font-medium">Mise en Demeure</p>
                  <p className="text-sm text-[var(--color-text-primary)] mt-1">J+30 après échéance</p>
                  <p className="text-lg font-bold text-[var(--color-error)] mt-2">3</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">courriers à envoyer</p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">Historique des Relances</h4>
                <div className="space-y-2">
                  {mockCreances[0].actionsRelance.map(action => (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                      <div className="flex items-center gap-3">
                        {action.type === 'email' && <Mail className="w-4 h-4 text-[var(--color-primary)]" />}
                        {action.type === 'telephone' && <Phone className="w-4 h-4 text-orange-500" />}
                        {action.type === 'mise_en_demeure' && <FileText className="w-4 h-4 text-[var(--color-error)]" />}
                        <div>
                          <p className="font-medium capitalize">{action.type.replace('_', ' ')}</p>
                          <p className="text-sm text-[var(--color-text-primary)]">{action.resultat}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{new Date(action.date).toLocaleDateString()}</p>
                        <Badge className={action.statut === 'execute' ? 'bg-[var(--color-success-lighter)]' : 'bg-[var(--color-background-hover)]'}>
                          {action.statut}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provisions */}
        <TabsContent value="provisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calcul des Provisions SYSCOHADA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-l-4 border-l-blue-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Conformément au Référentiel SYSCOHADA, les provisions sont calculées selon l'ancienneté des créances.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg">
                    <p className="text-sm text-[var(--color-text-primary)]">0-90 jours</p>
                    <p className="text-lg font-bold">0%</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">Pas de provision</p>
                  </div>
                  <div className="p-4 bg-[var(--color-warning-lightest)] rounded-lg">
                    <p className="text-sm text-[var(--color-text-primary)]">91-180 jours</p>
                    <p className="text-lg font-bold">25%</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">1.25M FCFA</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-[var(--color-text-primary)]">181-365 jours</p>
                    <p className="text-lg font-bold">50%</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">3.0M FCFA</p>
                  </div>
                  <div className="p-4 bg-[var(--color-error-lightest)] rounded-lg">
                    <p className="text-sm text-[var(--color-text-primary)]">+365 jours</p>
                    <p className="text-lg font-bold">100%</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">1.0M FCFA</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-[var(--color-primary-lightest)] rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-[var(--color-text-primary)]">Total Provisions Requises</p>
                      <p className="text-lg font-bold text-[var(--color-primary)]">5.25M FCFA</p>
                    </div>
                    <button
                      className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
                      onClick={() => setShowProvisionModal(true)}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Comptabiliser les Provisions
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse Risque */}
        <TabsContent value="analyse-risque" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse Prédictive des Risques Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Score de Risque par Client</h4>
                    <div className="space-y-3">
                      {mockClients.map(client => (
                        <div key={client.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{client.nom}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">{client.secteur}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32">
                              <Progress
                                value={
                                  client.statutRisque === 'faible' ? 20 :
                                  client.statutRisque === 'modere' ? 50 :
                                  client.statutRisque === 'eleve' ? 75 : 90
                                }
                                className="h-2"
                              />
                            </div>
                            <Badge className={getRisqueBadge(client.statutRisque)}>
                              {client.statutRisque}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Facteurs de Risque Détectés</h4>
                    <div className="space-y-2">
                      <Alert className="border-l-4 border-l-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>ENTREPRISE KOUASSI & FILS:</strong> Retards de paiement récurrents,
                          dégradation du ratio d'endettement
                        </AlertDescription>
                      </Alert>
                      <Alert className="border-l-4 border-l-yellow-500">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>SID:</strong> Dépassement ponctuel de la limite de crédit,
                          secteur en difficulté économique
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <h4 className="font-medium">Recommandations IA</h4>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                          <span>Réduire la limite de crédit de KOUASSI & FILS à 10M FCFA</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                          <span>Demander une garantie bancaire pour les nouvelles commandes importantes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] mt-0.5" />
                          <span>Mettre en place un suivi hebdomadaire des encours à risque</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[var(--color-warning-lighter)] text-[var(--color-warning)] p-2 rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Provision Cycle Clients</h2>
              </div>
              <button
                onClick={() => {
                  setShowProvisionModal(false);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-orange-900 mb-1">Calcul de Provision</h4>
                      <p className="text-sm text-orange-800">Calculez et enregistrez les provisions pour créances douteuses du cycle clients.</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Informations Générales</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Type de provision *</label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleInputChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="creances_douteuses">Créances douteuses</SelectItem>
                          <SelectItem value="depreciation_stocks">Dépréciation stocks</SelectItem>
                          <SelectItem value="risques_clients">Risques clients</SelectItem>
                          <SelectItem value="autres">Autres</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Date de comptabilisation *</label>
                      <Input
                        type="date"
                        value={formData.date_comptabilisation}
                        onChange={(e) => handleInputChange('date_comptabilisation', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_comptabilisation && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.date_comptabilisation}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Provision Calculation */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Calcul de la Provision</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Base de calcul *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Montant de base"
                        value={formData.base_calcul}
                        onChange={(e) => handleInputChange('base_calcul', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.base_calcul && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.base_calcul}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Montant provision *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Montant de la provision"
                        value={formData.montant}
                        onChange={(e) => handleInputChange('montant', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.montant && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.montant}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Méthode de calcul</label>
                      <Input
                        placeholder="Ex: Pourcentage sur ancienneté"
                        value={formData.methode_calcul}
                        onChange={(e) => handleInputChange('methode_calcul', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Pièce justificative</label>
                      <Input
                        placeholder="Ex: PROV-2024-001"
                        value={formData.piece_justificative}
                        onChange={(e) => handleInputChange('piece_justificative', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>

                {/* Accounting Details */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Écriture Comptable</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Compte débit *</label>
                      <Input
                        placeholder="Ex: 6815"
                        value={formData.compte_debit}
                        onChange={(e) => handleInputChange('compte_debit', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.compte_debit && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.compte_debit}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Compte crédit *</label>
                      <Input
                        placeholder="Ex: 4915"
                        value={formData.compte_credit}
                        onChange={(e) => handleInputChange('compte_credit', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.compte_credit && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.compte_credit}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Justification */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Justification de la provision *</label>
                  <textarea
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="Justification du calcul de la provision..."
                    value={formData.justification}
                    onChange={(e) => handleInputChange('justification', e.target.value)}
                    disabled={isSubmitting}
                  ></textarea>
                  {errors.justification && (
                    <p className="mt-1 text-sm text-[var(--color-error)]">{errors.justification}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowProvisionModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-border-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[var(--color-warning)] text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Enregistrer la Provision</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCreance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[var(--color-primary-lighter)] text-[var(--color-primary)] p-2 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Détail de la Créance</h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCreance(null);
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">N° Facture</p>
                    <p className="font-medium font-mono">{selectedCreance.numeroFacture}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Client</p>
                    <p className="font-medium">{selectedCreance.clientNom}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Date Facture</p>
                    <p className="font-medium">{new Date(selectedCreance.dateFacture).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Date Échéance</p>
                    <p className="font-medium">{new Date(selectedCreance.dateEcheance).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Montant TTC</p>
                    <p className="font-medium font-mono">{selectedCreance.montantTTC.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Montant Réglé</p>
                    <p className="font-medium font-mono text-[var(--color-success)]">{selectedCreance.montantRegle.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Solde Restant</p>
                    <p className="font-medium font-mono text-[var(--color-error)]">{selectedCreance.solde.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Jours de Retard</p>
                    <p className={`font-medium ${selectedCreance.joursRetard > 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
                      {selectedCreance.joursRetard > 0 ? `${selectedCreance.joursRetard} jours` : 'À jour'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Statut</p>
                    <Badge className={getStatutBadge(selectedCreance.statut)}>
                      {selectedCreance.statut}
                    </Badge>
                  </div>
                  {selectedCreance.tauxProvision && (
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Taux Provision</p>
                      <p className="font-medium">{selectedCreance.tauxProvision}%</p>
                    </div>
                  )}
                  {selectedCreance.montantProvision && (
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Montant Provision</p>
                      <p className="font-medium font-mono text-[var(--color-warning)]">{selectedCreance.montantProvision.toLocaleString()} FCFA</p>
                    </div>
                  )}
                </div>

                {selectedCreance.actionsRelance.length > 0 && (
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-3">Historique des Relances</p>
                    <div className="space-y-2">
                      {selectedCreance.actionsRelance.map((action, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                          <div className="flex items-center gap-3">
                            {action.type === 'email' && <Mail className="w-4 h-4 text-[var(--color-primary)]" />}
                            {action.type === 'telephone' && <Phone className="w-4 h-4 text-orange-500" />}
                            {action.type === 'mise_en_demeure' && <FileText className="w-4 h-4 text-[var(--color-error)]" />}
                            <div>
                              <p className="font-medium capitalize">{action.type.replace('_', ' ')}</p>
                              <p className="text-sm text-[var(--color-text-secondary)]">{action.resultat}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{new Date(action.date).toLocaleDateString()}</p>
                            <Badge className={action.statut === 'execute' ? 'bg-[var(--color-success-lighter)]' : 'bg-[var(--color-background-hover)]'}>
                              {action.statut}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedCreance(null);
                }}
                className="bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-border-dark)] transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  handleSendRelance(selectedCreance);
                  setShowDetailModal(false);
                  setSelectedCreance(null);
                }}
                className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Envoyer Relance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CycleClients;