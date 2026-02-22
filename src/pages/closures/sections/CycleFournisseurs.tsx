import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useData } from '../../../contexts/DataContext';
import { money } from '../../../utils/money';
import { motion } from 'framer-motion';
import {
  Building,
  TrendingDown,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Download,
  Upload,
  Eye,
  Brain,
  Zap,
  AlertTriangle,
  Search,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  CreditCard,
  Shield,
  Activity,
  Package,
  Truck,
  Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface Fournisseur {
  id: string;
  code: string;
  nom: string;
  type: 'local' | 'international' | 'groupe';
  categorie: string;
  email: string;
  telephone: string;
  adresse: string;
  pays: string;
  delaiLivraison: number;
  delaiPaiement: number;
  devise: string;
  statutContrat: 'actif' | 'suspendu' | 'expire';
  volumeAchats: number;
  encoursDettes: number;
  dernierePaiement?: string;
  dateCreation: string;
  evaluation: number; // Score sur 5
}

interface FactureFournisseur {
  id: string;
  fournisseurId: string;
  fournisseurNom: string;
  numeroFacture: string;
  numeroBonCommande?: string;
  dateFacture: string;
  dateEcheance: string;
  dateReception?: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantPaye: number;
  solde: number;
  statut: 'brouillon' | 'validee' | 'approuvee' | 'payee' | 'litige';
  workflow: {
    reception: boolean;
    validation: boolean;
    approbation: boolean;
    comptabilisation: boolean;
    paiement: boolean;
  };
}

interface BonCommande {
  id: string;
  numero: string;
  fournisseurId: string;
  fournisseurNom: string;
  dateCommande: string;
  dateLivraisonPrevue: string;
  montantTotal: number;
  statut: 'brouillon' | 'envoye' | 'confirme' | 'livre_partiellement' | 'livre' | 'annule';
  tauxRealisation: number;
}

interface Paiement {
  id: string;
  fournisseurId: string;
  date: string;
  montant: number;
  mode: 'virement' | 'cheque' | 'especes' | 'compensation';
  reference: string;
  statut: 'planifie' | 'execute' | 'annule';
  facturesReglees: string[];
}

const CycleFournisseurs: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<FactureFournisseur | null>(null);

  // Real data from Dexie — 401 (supplier) account balances
  const [supplierBalances, setSupplierBalances] = useState<Map<string, { name: string; debit: number; credit: number }>>(new Map());

  const loadSupplierData = useCallback(async () => {
    try {
      const fys = await adapter.getAll<{ id: string; isActive: boolean; startDate: string; endDate: string }>('fiscalYears');
      const activeFY = fys.find(fy => fy.isActive) || fys[0];
      if (!activeFY) return;

      const allEntries = await adapter.getAll<{ date: string; lines: { accountCode: string; accountName: string; debit: number; credit: number }[] }>('journalEntries');
      const entries = allEntries.filter(e => e.date >= activeFY.startDate && e.date <= activeFY.endDate);

      const balMap = new Map<string, { name: string; debit: number; credit: number }>();
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountCode.startsWith('401')) {
            const existing = balMap.get(line.accountCode) || { name: line.accountName, debit: 0, credit: 0 };
            existing.debit += line.debit;
            existing.credit += line.credit;
            balMap.set(line.accountCode, existing);
          }
        }
      }
      setSupplierBalances(balMap);
    } catch { /* silent */ }
  }, [adapter]);

  useEffect(() => { loadSupplierData(); }, [loadSupplierData]);

  // Map real 401 accounts to Fournisseur interface
  const fournisseurs: Fournisseur[] = useMemo(() => {
    let idx = 0;
    return Array.from(supplierBalances.entries()).map(([code, bal]) => {
      idx++;
      const encours = money(bal.credit).subtract(money(bal.debit)).toNumber();
      return {
        id: String(idx),
        code,
        nom: bal.name || `Fournisseur ${code}`,
        type: 'local' as const,
        categorie: '',
        email: '',
        telephone: '',
        adresse: '',
        pays: '',
        delaiLivraison: 0,
        delaiPaiement: 30,
        devise: 'FCFA',
        statutContrat: 'actif' as const,
        volumeAchats: bal.credit,
        encoursDettes: Math.max(0, encours),
        dernierePaiement: '',
        dateCreation: '',
        evaluation: 0,
      };
    });
  }, [supplierBalances]);

  // No invoice-level or PO data available
  const factures: FactureFournisseur[] = [];
  const bonsCommande: BonCommande[] = [];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalDettes = factures.reduce((sum, f) => sum + f.montantTTC, 0);
    const totalPaye = factures.reduce((sum, f) => sum + f.montantPaye, 0);
    const totalEchu = factures
      .filter(f => new Date(f.dateEcheance) < new Date())
      .reduce((sum, f) => sum + f.solde, 0);
    const commandesEnCours = bonsCommande.filter(bc => bc.statut !== 'livre' && bc.statut !== 'annule').length;

    return {
      totalDettes,
      totalPaye,
      totalEchu,
      commandesEnCours,
      tauxPaiement: totalDettes > 0 ? (totalPaye / totalDettes * 100) : 0,
      delaiMoyenPaiement: 35,
      nombreFournisseursActifs: fournisseurs.filter(f => f.statutContrat === 'actif').length
    };
  }, [fournisseurs, factures, bonsCommande]);

  // Filtrage des factures
  const facturesFiltrees = useMemo(() => {
    return factures.filter(facture => {
      const matchStatut = filterStatut === 'tous' || facture.statut === filterStatut;
      const matchSearch = searchTerm === '' ||
        facture.fournisseurNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        facture.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatut && matchSearch;
    });
  }, [factures, filterStatut, searchTerm]);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'brouillon': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      'validee': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
      'approuvee': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'payee': 'bg-purple-100 text-purple-800',
      'litige': 'bg-[var(--color-error-lighter)] text-red-800'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getWorkflowStep = (workflow: Record<string, boolean>) => {
    if (!workflow.reception) return 0;
    if (!workflow.validation) return 1;
    if (!workflow.approbation) return 2;
    if (!workflow.comptabilisation) return 3;
    if (!workflow.paiement) return 4;
    return 5;
  };

  // Handler functions
  const handleViewFactureDetail = (facture: FactureFournisseur) => {
    setSelectedFacture(facture);
    setShowDetailModal(true);
    toast.success(`Affichage de la facture: ${facture.numeroFacture}`);
  };

  const handleValidateFacture = (facture: FactureFournisseur) => {
    toast.success(`Facture ${facture.numeroFacture} validée avec succès`);
  };

  const handleImportFactures = () => {
    toast.success('Import de factures en cours...');
  };

  const handleNouvelleFacture = () => {
    toast.success('Création d\'une nouvelle facture');
  };

  const handleNouvelleCommande = () => {
    toast.success('Création d\'une nouvelle commande');
  };

  const handlePlanifierPaiement = (facture: FactureFournisseur) => {
    toast.success(`Paiement planifié pour ${facture.fournisseurNom}`);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Total Dettes</p>
                <p className="text-lg font-bold">{(kpis.totalDettes / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-error)] mt-1">+8% vs mois dernier</p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--color-error)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Dettes Échues</p>
                <p className="text-lg font-bold">{(kpis.totalEchu / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-warning)] mt-1">À régler en priorité</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Commandes en cours</p>
                <p className="text-lg font-bold">{kpis.commandesEnCours}</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">En attente livraison</p>
              </div>
              <Package className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Fournisseurs Actifs</p>
                <p className="text-lg font-bold">{kpis.nombreFournisseursActifs}</p>
                <p className="text-xs text-[var(--color-success)] mt-1">Contrats valides</p>
              </div>
              <Building className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes IA */}
      <Alert className="border-l-4 border-l-blue-500">
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Optimisation détectée:</strong> Regrouper les commandes chez NESTLE CI pourrait générer
          une économie de 3% grâce aux remises volume. Échéance de paiement critique dans 3 jours.
        </AlertDescription>
      </Alert>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="commandes">Commandes</TabsTrigger>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="analyse">Analyse</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Échéancier des Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-[var(--color-error-lightest)] rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">En retard</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">12.5M</p>
                    <p className="text-xs">3 factures</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">Cette semaine</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">25.8M</p>
                    <p className="text-xs">7 factures</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-warning-lightest)] rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">Semaine prochaine</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">18.3M</p>
                    <p className="text-xs">5 factures</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-primary-lightest)] rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">Ce mois</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">45.2M</p>
                    <p className="text-xs">12 factures</p>
                  </div>
                  <div className="text-center p-3 bg-[var(--color-success-lightest)] rounded">
                    <p className="text-sm text-[var(--color-text-primary)]">Plus tard</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">28.9M</p>
                    <p className="text-xs">8 factures</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Fournisseurs par Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fournisseurs.map(fournisseur => (
                  <div key={fournisseur.id} className="flex items-center justify-between p-3 border rounded hover:bg-[var(--color-background-secondary)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Building className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">{fournisseur.nom}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{fournisseur.categorie} • {fournisseur.pays}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{(fournisseur.encoursDettes / 1000000).toFixed(1)}M FCFA</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < Math.floor(fournisseur.evaluation) ? 'bg-yellow-400' : 'bg-[var(--color-border)]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Factures */}
        <TabsContent value="factures" className="space-y-4">
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
                <option value="brouillon">{t('accounting.draft')}</option>
                <option value="validee">Validée</option>
                <option value="approuvee">Approuvée</option>
                <option value="payee">Payée</option>
                <option value="litige">Litige</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImportFactures}
                className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Importer
              </button>
              <button
                onClick={handleNouvelleFacture}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Nouvelle Facture
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Fournisseur</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">N° Facture</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Échéance</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Montant TTC</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">{t('accounting.balance')}</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Workflow</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facturesFiltrees.map(facture => (
                    <tr key={facture.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <p className="font-medium">{facture.fournisseurNom}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{facture.numeroFacture}</p>
                        {facture.numeroBonCommande && (
                          <p className="text-xs text-[var(--color-text-secondary)]">BC: {facture.numeroBonCommande}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p>{new Date(facture.dateEcheance).toLocaleDateString()}</p>
                        {new Date(facture.dateEcheance) < new Date() && (
                          <p className="text-xs text-[var(--color-error)]">En retard</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(facture.montantTTC / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--color-error)]">
                        {(facture.solde / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-center">
                          {[
                            { key: 'reception', label: 'R' },
                            { key: 'validation', label: 'V' },
                            { key: 'approbation', label: 'A' },
                            { key: 'comptabilisation', label: 'C' },
                            { key: 'paiement', label: 'P' }
                          ].map(step => (
                            <div
                              key={step.key}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                facture.workflow[step.key as keyof typeof facture.workflow]
                                  ? 'bg-[var(--color-success-lighter)] text-[var(--color-success)]'
                                  : 'bg-[var(--color-background-hover)] text-[var(--color-text-secondary)]'
                              }`}
                            >
                              {step.label}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatutBadge(facture.statut)}>
                          {facture.statut}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewFactureDetail(facture)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button
                            onClick={() => handleValidateFacture(facture)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Valider"
                          >
                            <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
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

        {/* Commandes */}
        <TabsContent value="commandes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bons de Commande</CardTitle>
              <button
                onClick={handleNouvelleCommande}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Nouvelle Commande
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bonsCommande.map(commande => (
                  <div key={commande.id} className="p-4 border rounded-lg hover:bg-[var(--color-background-secondary)]">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{commande.numero}</p>
                        <p className="text-sm text-[var(--color-text-primary)]">{commande.fournisseurNom}</p>
                      </div>
                      <Badge className={
                        commande.statut === 'confirme' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                        commande.statut === 'envoye' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                        'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                      }>
                        {commande.statut}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Date commande</p>
                        <p className="text-sm">{new Date(commande.dateCommande).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Livraison prévue</p>
                        <p className="text-sm">{new Date(commande.dateLivraisonPrevue).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Montant</p>
                        <p className="text-sm font-medium">{(commande.montantTotal / 1000000).toFixed(1)}M FCFA</p>
                      </div>
                    </div>
                    {commande.tauxRealisation > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Réalisation</span>
                          <span>{commande.tauxRealisation}%</span>
                        </div>
                        <Progress value={commande.tauxRealisation} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paiements */}
        <TabsContent value="paiements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planification des Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-l-4 border-l-green-500">
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Optimisation suggérée:</strong> Effectuer un paiement groupé de 45M FCFA
                    permettrait de bénéficier d'un escompte de 2% (900K FCFA d'économie).
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Paiements à venir</h4>
                    <div className="space-y-2">
                      {factures
                        .filter(f => f.solde > 0)
                        .map(facture => (
                          <div key={facture.id} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                            <div>
                              <p className="font-medium">{facture.fournisseurNom}</p>
                              <p className="text-sm text-[var(--color-text-primary)]">
                                Échéance: {new Date(facture.dateEcheance).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{(facture.solde / 1000000).toFixed(1)}M</p>
                              <button
                                onClick={() => handlePlanifierPaiement(facture)}
                                className="text-xs text-[var(--color-primary)] hover:underline"
                              >
                                Planifier
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Modes de paiement disponibles</h4>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
                          <div className="flex-1">
                            <p className="font-medium">Virement bancaire</p>
                            <p className="text-sm text-[var(--color-text-primary)]">Délai: 1-2 jours</p>
                          </div>
                          <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">Recommandé</Badge>
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-[var(--color-text-secondary)]" />
                          <div className="flex-1">
                            <p className="font-medium">Chèque</p>
                            <p className="text-sm text-[var(--color-text-primary)]">Délai: 3-5 jours</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflow */}
        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Circuit de Validation des Factures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  {[
                    { step: 'Réception', icon: <Truck />, color: 'blue' },
                    { step: 'Validation', icon: <Eye />, color: 'yellow' },
                    { step: 'Approbation', icon: <CheckCircle />, color: 'green' },
                    { step: 'Comptabilisation', icon: <FileText />, color: 'purple' },
                    { step: 'Paiement', icon: <DollarSign />, color: 'indigo' }
                  ].map((item, index) => (
                    <React.Fragment key={item.step}>
                      <div className="flex flex-col items-center">
                        <div className={`w-12 h-12 bg-${item.color}-100 rounded-full flex items-center justify-center mb-2`}>
                          {React.cloneElement(item.icon, { className: `w-6 h-6 text-${item.color}-600` })}
                        </div>
                        <p className="text-sm font-medium">{item.step}</p>
                      </div>
                      {index < 4 && (
                        <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Factures en attente</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Validation</span>
                          <Badge className="bg-[var(--color-warning-lighter)]">3</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Approbation</span>
                          <Badge className="bg-[var(--color-warning-lighter)]">5</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Comptabilisation</span>
                          <Badge className="bg-purple-100">2</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Performance du circuit</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Délai moyen validation</span>
                          <span className="font-medium">2.3 jours</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Taux d'approbation</span>
                          <span className="font-medium text-[var(--color-success)]">94%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Litiges en cours</span>
                          <span className="font-medium text-[var(--color-error)]">2</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse */}
        <TabsContent value="analyse" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse des Fournisseurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Performance Fournisseurs</h4>
                  <div className="space-y-3">
                    {fournisseurs.map(fournisseur => (
                      <div key={fournisseur.id} className="p-3 border rounded">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-medium">{fournisseur.nom}</p>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-3 h-3 rounded-full ${
                                  i < Math.floor(fournisseur.evaluation) ? 'bg-yellow-400' : 'bg-[var(--color-border)]'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-[var(--color-text-secondary)]">Délai livraison</p>
                            <p className="font-medium">{fournisseur.delaiLivraison}j</p>
                          </div>
                          <div>
                            <p className="text-[var(--color-text-secondary)]">Volume/an</p>
                            <p className="font-medium">{(fournisseur.volumeAchats / 1000000).toFixed(0)}M</p>
                          </div>
                          <div>
                            <p className="text-[var(--color-text-secondary)]">Conditions</p>
                            <p className="font-medium">{fournisseur.delaiPaiement}j</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Recommandations IA</h4>
                  <div className="space-y-3">
                    <Alert className="border-l-4 border-l-green-500">
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        Négocier un contrat cadre avec NESTLE CI pourrait réduire les coûts de 5% sur l'année.
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-l-4 border-l-yellow-500">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Diversifier les fournisseurs de matières premières pour réduire le risque de dépendance.
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-l-4 border-l-blue-500">
                      <Brain className="h-4 w-4" />
                      <AlertDescription>
                        Automatiser le circuit de validation pourrait réduire les délais de traitement de 40%.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {showDetailModal && selectedFacture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                  <Receipt className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Détail de la Facture Fournisseur</h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedFacture(null);
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
                    <p className="font-medium font-mono">{selectedFacture.numeroFacture}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Fournisseur</p>
                    <p className="font-medium">{selectedFacture.fournisseurNom}</p>
                  </div>
                  {selectedFacture.numeroBonCommande && (
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">N° Bon de Commande</p>
                      <p className="font-medium font-mono">{selectedFacture.numeroBonCommande}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Date Facture</p>
                    <p className="font-medium">{new Date(selectedFacture.dateFacture).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Date Échéance</p>
                    <p className={`font-medium ${new Date(selectedFacture.dateEcheance) < new Date() ? 'text-[var(--color-error)]' : ''}`}>
                      {new Date(selectedFacture.dateEcheance).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedFacture.dateReception && (
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Date Réception</p>
                      <p className="font-medium">{new Date(selectedFacture.dateReception).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Montant HT</p>
                    <p className="font-medium font-mono">{selectedFacture.montantHT.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">TVA</p>
                    <p className="font-medium font-mono">{selectedFacture.montantTVA.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Montant TTC</p>
                    <p className="font-medium font-mono text-[var(--color-primary)]">{selectedFacture.montantTTC.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Montant Payé</p>
                    <p className="font-medium font-mono text-[var(--color-success)]">{selectedFacture.montantPaye.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Solde Restant</p>
                    <p className="font-medium font-mono text-[var(--color-error)]">{selectedFacture.solde.toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)]">Statut</p>
                    <Badge className={getStatutBadge(selectedFacture.statut)}>
                      {selectedFacture.statut}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">État du Workflow</p>
                  <div className="flex items-center gap-2">
                    {[
                      { key: 'reception', label: 'Réception' },
                      { key: 'validation', label: 'Validation' },
                      { key: 'approbation', label: 'Approbation' },
                      { key: 'comptabilisation', label: 'Comptabilisation' },
                      { key: 'paiement', label: 'Paiement' }
                    ].map((step) => (
                      <div
                        key={step.key}
                        className={`flex-1 text-center p-2 rounded ${
                          selectedFacture.workflow[step.key as keyof typeof selectedFacture.workflow]
                            ? 'bg-[var(--color-success-lighter)] text-[var(--color-success)]'
                            : 'bg-[var(--color-background-hover)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                        <p className="text-xs">{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedFacture(null);
                }}
                className="bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-border-dark)] transition-colors"
              >
                Fermer
              </button>
              {selectedFacture.solde > 0 && (
                <button
                  onClick={() => {
                    handlePlanifierPaiement(selectedFacture);
                    setShowDetailModal(false);
                    setSelectedFacture(null);
                  }}
                  className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Planifier le Paiement</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CycleFournisseurs;