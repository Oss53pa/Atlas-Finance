import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import type { DBAsset } from '../../lib/db';
import {
  listSessions, createSession, getCounts, upsertCount, resolveDiscrepancy,
  type InventorySessionRow, type InventoryCountRow,
} from '../../services/immobilisations/inventoryService';
import { createDisposal } from '../../services/immobilisations/disposalService';
import { motion } from 'framer-motion';
import {
  Package,
  Search,
  Scan,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Edit,
  MapPin,
  Calendar,
  Users,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Filter,
  Settings,
  FileText,
  Camera,
  QrCode,
  ClipboardList,
  Target
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea
} from '../../components/ui';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  id: string;
  numero_inventaire: string;
  nom: string;
  categorie: string;
  localisation_theorique: string;
  localisation_reelle?: string;
  code?: string;
  designation?: string;
  localisation?: string;
  ecart?: {
    type: string;
    valeur: number;
    description: string;
  };
  responsable: string;
  statut_comptage: 'non_compte' | 'en_cours' | 'compte' | 'ecart' | 'valide';
  date_comptage?: string;
  compteur: string;
  observations?: string;
  valeur_nette_comptable: number;
  etat_physique: 'excellent' | 'bon' | 'moyen' | 'mauvais' | 'hors_service';
  code_barre?: string;
  qr_code?: string;
  photo_url?: string;
  derniere_maintenance?: string;
  prochaine_maintenance?: string;
}

interface InventorySession {
  id: string;
  nom: string;
  date_debut: string;
  date_fin_prevue: string;
  date_fin_reelle?: string;
  statut: 'planifie' | 'en_cours' | 'termine' | 'suspendu';
  responsable: string;
  equipes: string[];
  perimetre: string;
  nb_items_total: number;
  nb_items_comptes: number;
  nb_ecarts: number;
  taux_realisation: number;
}

interface InventoryDiscrepancy {
  id: string;
  session_id: string;
  item_id: string;
  type_ecart: 'manquant' | 'excedent' | 'localisation' | 'etat' | 'valeur';
  description: string;
  impact_financier: number;
  statut_resolution: 'ouvert' | 'en_cours' | 'resolu' | 'accepte';
  responsable_resolution?: string;
  date_resolution?: string;
  action_corrective?: string;
}

interface TeamMember {
  id: string;
  nom: string;
  role: 'responsable' | 'compteur' | 'verificateur';
  zone_affectee: string;
  nb_items_assignes: number;
  nb_items_comptes: number;
  taux_completion: number;
}

const InventairePhysiquePage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [selectedSession, setSelectedSession] = useState<string>('current');
  const [selectedZone, setSelectedZone] = useState<string>('toutes');
  const [selectedStatus, setSelectedStatus] = useState<string>('tous');
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('inventory');

  // États pour les modales
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Load assets via DataContext adapter
  const [dbAssets, setDbAssets] = useState<DBAsset[]>([]);
  // Sessions & comptages réels (persistés)
  const [realSessions, setRealSessions] = useState<InventorySessionRow[]>([]);
  const [counts, setCounts] = useState<InventoryCountRow[]>([]);
  const [sessionForm, setSessionForm] = useState({ nom: '', debut: '', fin: '', desc: '' });
  const [editForm, setEditForm] = useState({ etat: '', localisation: '', statut: '', notes: '' });

  useEffect(() => {
    const load = async () => {
      const assets = await adapter.getAll('assets');
      setDbAssets(assets as DBAsset[]);
    };
    load();
  }, [adapter]);

  const reloadInventory = useCallback(async () => {
    try {
      const sess = await listSessions(adapter);
      setRealSessions(sess);
      const sid = sess[0]?.id;
      setCounts(sid ? await getCounts(adapter, sid) : []);
    } catch { setRealSessions([]); setCounts([]); }
  }, [adapter]);
  useEffect(() => { reloadInventory(); }, [reloadInventory]);

  const activeRealSessionId = realSessions[0]?.id || null;
  // Comptages réels indexés par actif (overlay sur les items dérivés).
  const countByAsset = useMemo(() => {
    const m = new Map<string, InventoryCountRow>();
    for (const c of counts) if (c.asset_id) m.set(c.asset_id, c);
    return m;
  }, [counts]);

  // Map DBAsset to InventoryItem interface
  const allInventoryItems: InventoryItem[] = useMemo(() => {
    return dbAssets.map((a: DBAsset) => {
      const now = new Date();
      const acqDate = new Date(a.acquisitionDate);
      const ageYears = (now.getTime() - acqDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      // VNC = valeur brute − amortissements cumulés RÉELS (pas un recalcul par l'âge).
      const cumul = Number((a as any).cumulDepreciation) || 0;
      const vnc = Math.max(0, a.acquisitionValue - cumul);

      // État physique : estimation indicative depuis le ratio d'amortissement.
      const depRatio = a.usefulLifeYears > 0 ? ageYears / a.usefulLifeYears : 0;
      let etatPhysique: InventoryItem['etat_physique'] = 'bon';
      if (depRatio < 0.2) etatPhysique = 'excellent';
      else if (depRatio < 0.5) etatPhysique = 'bon';
      else if (depRatio < 0.8) etatPhysique = 'moyen';
      else if (depRatio < 1.0) etatPhysique = 'mauvais';
      else etatPhysique = 'hors_service';

      // Statut par défaut : NON COMPTÉ. Seul un comptage réel persisté (overlay
      // ci-dessous) fait passer l'item en 'compte'/'ecart'. On ne fabrique JAMAIS
      // un écart depuis le ratio d'amortissement (un bien amorti est présent).
      const statutComptage: InventoryItem['statut_comptage'] = 'non_compte';

      const base = {
        id: a.id,
        numero_inventaire: a.code,
        nom: a.name,
        categorie: a.category,
        localisation_theorique: a.category,
        localisation_reelle: undefined,
        responsable: a.category,
        statut_comptage: statutComptage,
        date_comptage: undefined,
        compteur: '',
        valeur_nette_comptable: vnc,
        etat_physique: etatPhysique,
        code_barre: a.code
      };
      // Overlay du comptage réel persisté (s'il existe pour la session active).
      const c = countByAsset.get(a.id);
      if (c) {
        return {
          ...base,
          statut_comptage: (c.statut_comptage as InventoryItem['statut_comptage']) || base.statut_comptage,
          localisation_reelle: c.localisation_reelle ?? base.localisation_reelle,
          compteur: c.compteur ?? base.compteur,
          etat_physique: (c.etat_physique as InventoryItem['etat_physique']) || base.etat_physique,
          date_comptage: c.date_comptage ?? base.date_comptage,
        };
      }
      return base;
    });
  }, [dbAssets, countByAsset]);

  // Build sessions from asset data
  const sessions: InventorySession[] = useMemo(() => {
    const totalItems = allInventoryItems.length;
    const counted = allInventoryItems.filter(i => i.statut_comptage === 'compte').length;
    const ecarts = allInventoryItems.filter(i => i.statut_comptage === 'ecart').length;
    const tauxRealisation = totalItems > 0 ? counted / totalItems : 0;

    return [{
      id: 'current',
      nom: `${t('assetsInventory.annualInventory')} ${new Date().getFullYear()}`,
      date_debut: `${new Date().getFullYear()}-01-01`,
      date_fin_prevue: `${new Date().getFullYear()}-12-31`,
      statut: 'en_cours' as const,
      responsable: t('assetsInventory.generalManagement'),
      equipes: [t('assetsInventory.teamA'), t('assetsInventory.teamB')],
      perimetre: t('assetsInventory.allSites'),
      nb_items_total: totalItems,
      nb_items_comptes: counted,
      nb_ecarts: ecarts,
      taux_realisation: tauxRealisation
    }];
  }, [allInventoryItems, t]);

  // Filter inventory items
  const inventoryItems: InventoryItem[] = useMemo(() => {
    return allInventoryItems.filter(item => {
      const matchesStatus = selectedStatus === 'tous' || selectedStatus === 'all' || item.statut_comptage === selectedStatus;
      const matchesZone = selectedZone === 'toutes' || selectedZone === 'all' || item.categorie === selectedZone;
      const matchesSearch = searchTerm === '' ||
        item.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.numero_inventaire.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesZone && matchesSearch;
    });
  }, [allInventoryItems, selectedStatus, selectedZone, searchTerm]);

  const itemsLoading = false; // data loaded via useEffect

  // Build discrepancies from items with ecart status
  const discrepancies: InventoryDiscrepancy[] = useMemo(() => {
    return allInventoryItems
      .filter(item => item.statut_comptage === 'ecart')
      .map((item) => ({
        id: `disc-${item.id}`,
        session_id: 'current',
        item_id: item.id,
        type_ecart: (item.etat_physique === 'hors_service' ? 'etat' :
                     item.etat_physique === 'mauvais' ? 'etat' : 'valeur') as InventoryDiscrepancy['type_ecart'],
        description: t('assetsInventory.discrepancyDetectedFor', { name: item.nom }),
        impact_financier: item.valeur_nette_comptable,
        // Pas de suivi de résolution réel : tout écart est ouvert par défaut
        // (au lieu d'un statut fabriqué par parité d'index).
        statut_resolution: 'en_cours' as InventoryDiscrepancy['statut_resolution'],
        responsable_resolution: item.responsable,
        date_resolution: undefined,
        action_corrective: undefined
      }));
  }, [allInventoryItems, t]);

  // Build team members from category groupings
  const teamMembers: TeamMember[] = useMemo(() => {
    const categoryMap = new Map<string, { total: number; counted: number }>();
    for (const item of allInventoryItems) {
      const existing = categoryMap.get(item.categorie) || { total: 0, counted: 0 };
      existing.total += 1;
      if (item.statut_comptage === 'compte') existing.counted += 1;
      categoryMap.set(item.categorie, existing);
    }

    const members: TeamMember[] = [];
    let idx = 0;
    for (const [category, counts] of categoryMap.entries()) {
      members.push({
        id: `team-${idx}`,
        nom: `${t('assetsInventory.teamPrefix')} ${category}`,
        role: (idx === 0 ? 'responsable' : 'compteur') as TeamMember['role'],
        zone_affectee: category,
        nb_items_assignes: counts.total,
        nb_items_comptes: counts.counted,
        taux_completion: counts.total > 0 ? counts.counted / counts.total : 0
      });
      idx++;
    }
    return members;
  }, [allInventoryItems, t]);

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'compte':
        return 'text-[var(--color-primary)] bg-[var(--color-primary)]/10';
      case 'en_cours':
        return 'text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10';
      case 'ecart':
        return 'text-red-600 bg-red-100';
      case 'valide':
        return 'text-[var(--color-text-tertiary)] bg-[var(--color-text-tertiary)]/10';
      case 'non_compte':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'compte':
        return <CheckCircle className="h-4 w-4" />;
      case 'en_cours':
        return <RefreshCw className="h-4 w-4" />;
      case 'ecart':
        return <AlertTriangle className="h-4 w-4" />;
      case 'valide':
        return <CheckCircle className="h-4 w-4" />;
      case 'non_compte':
        return <XCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getPhysicalStateColor = (etat: string) => {
    switch (etat) {
      case 'excellent':
        return 'text-[var(--color-primary)] bg-[var(--color-primary)]/10';
      case 'bon':
        return 'text-[var(--color-text-tertiary)] bg-[var(--color-text-tertiary)]/10';
      case 'moyen':
        return 'text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10';
      case 'mauvais':
        return 'text-red-600 bg-red-100';
      case 'hors_service':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDiscrepancyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'manquant': 'bg-red-50 text-red-700',
      'excedent': 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)]',
      'localisation': 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
      'etat': 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
      'valeur': 'bg-[var(--color-border)]/20 text-[var(--color-text-secondary)]'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'responsable': 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
      'compteur': 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)]',
      'verificateur': 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  // Libellés traduits des énumérations métier (les valeurs restent inchangées).
  const countStatusLabel = (statut: string): string => {
    switch (statut) {
      case 'non_compte': return t('assetsInventory.notCounted');
      case 'compte': return t('assetsInventory.countedStatus');
      case 'ecart': return t('assetsInventory.variance');
      case 'en_cours': return t('assetsInventory.inProgress');
      default: return statut;
    }
  };

  const physicalStateLabel = (etat: string, short = false): string => {
    switch (etat) {
      case 'excellent': return t('assetsInventory.condExcellent');
      case 'bon': return t('assetsInventory.condGood');
      case 'moyen': return t('assetsInventory.condFair');
      case 'mauvais': return t('assetsInventory.condPoor');
      case 'hors_service': return short ? t('assetsInventory.condOutOfServiceShort') : t('assetsInventory.condOutOfService');
      default: return etat;
    }
  };

  const discrepancyTypeLabel = (type: string): string => {
    switch (type) {
      case 'manquant': return t('assetsInventory.typeMissing');
      case 'excedent': return t('assetsInventory.typeSurplus');
      case 'localisation': return t('assetsInventory.typeLocation');
      case 'etat': return t('assetsInventory.typeCondition');
      default: return t('assetsInventory.typeValue');
    }
  };

  const roleLabel = (role: string): string => {
    switch (role) {
      case 'responsable': return t('assetsInventory.roleLead');
      case 'compteur': return t('assetsInventory.roleCounter');
      case 'verificateur': return t('assetsInventory.roleVerifier');
      default: return role;
    }
  };

  const handleStartScanning = () => {
    // Pas de simulation de comptage : le comptage se fait via la fiche d'item
    // (saisie réelle persistée). Un vrai scan code-barres nécessite un lecteur.
    toast(t('assetsInventory.scanHint'), { icon: 'ℹ️' });
  };

  // Handlers pour les boutons d'action
  const handleNewSession = () => {
    setShowNewSessionModal(true);
  };

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowItemDetailModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      etat: item.etat_physique || 'bon',
      localisation: item.localisation_reelle || '',
      statut: item.statut_comptage || 'compte',
      notes: '',
    });
    setShowEditItemModal(true);
  };

  // Crée une session d'inventaire persistée (par défaut si nécessaire).
  const ensureSessionId = async (): Promise<string> => {
    if (activeRealSessionId) return activeRealSessionId;
    const id = await createSession(adapter, { nom: `${t('assetsInventory.inventoryPrefix')} ${new Date().getFullYear()}` });
    await reloadInventory();
    return id;
  };

  const handleCreateSession = async () => {
    if (!sessionForm.nom.trim()) { toast.error(t('assetsInventory.sessionNameRequired')); return; }
    try {
      await createSession(adapter, { nom: sessionForm.nom, date_debut: sessionForm.debut || null, date_fin_prevue: sessionForm.fin || null, perimetre: sessionForm.desc || null });
      toast.success(t('assetsInventory.sessionCreated'));
      setShowNewSessionModal(false);
      setSessionForm({ nom: '', debut: '', fin: '', desc: '' });
      await reloadInventory();
    } catch (e: any) { toast.error(e?.message || t('assetsInventory.error')); }
  };

  const handleSaveItemCount = async () => {
    if (!selectedItem) return;
    try {
      const sid = await ensureSessionId();
      await upsertCount(adapter, sid, selectedItem.id, {
        statut_comptage: editForm.statut, // valeurs UI valides (non_compte/en_cours/compte/ecart/valide)
        localisation_reelle: editForm.localisation || null,
        etat_physique: editForm.etat || null,
        notes: editForm.notes || null,
      });
      toast.success(t('assetsInventory.countSaved'));
      setShowEditItemModal(false);
      await reloadInventory();
    } catch (e: any) { toast.error(e?.message || t('assetsInventory.error')); }
  };

  const handleResolveDiscrepancy = async (item: InventoryItem) => {
    try {
      const sid = await ensureSessionId();
      // Un bien constaté MANQUANT doit être SORTI du bilan (mise au rebut) : sans
      // écriture de sortie, le registre et la comptabilité divergent de la réalité.
      const manquant = window.confirm(t('assetsInventory.confirmMissing', { name: item.nom }));
      if (manquant) {
        await createDisposal(adapter, {
          assetId: item.id,
          disposalType: 'scrap',
          disposalDate: new Date().toISOString().split('T')[0],
          disposalValue: 0,
          reason: t('assetsInventory.disposalReason'),
        });
      }
      await resolveDiscrepancy(adapter, sid, item.id, {
        resolution_statut: 'resolu',
        action_corrective: manquant ? t('assetsInventory.actionMissingPosted') : t('assetsInventory.actionVarianceFixed'),
      });
      toast.success(manquant ? t('assetsInventory.toastMissingDisposed') : t('assetsInventory.toastVarianceResolved'));
      await reloadInventory();
    } catch (e: any) { toast.error(e?.message || t('assetsInventory.error')); }
  };

  const handleQrCode = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowQrCodeModal(true);
  };

  const currentSession = sessions.find(s => s.id === selectedSession) || sessions[0];
  const countedItems = allInventoryItems.filter(item => item.statut_comptage === 'compte').length;
  const discrepanciesCount = allInventoryItems.filter(item => item.statut_comptage === 'ecart').length;
  const totalValue = allInventoryItems.reduce((sum, item) => sum + item.valeur_nette_comptable, 0);
  const completionRate = currentSession ? (currentSession.nb_items_comptes / currentSession.nb_items_total) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <ClipboardList className="mr-2 h-6 w-6 text-[var(--color-primary)]" />
              {t('assetsInventory.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('assetsInventory.subtitle')}
            </p>
          </div>
          <div className="flex space-x-3">
            <PageHeaderActions />
            <Button
              onClick={handleStartScanning}
              disabled={isScanning}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
            >
              {isScanning ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Scan className="mr-2 h-4 w-4" />
              )}
              {isScanning ? t('assetsInventory.scanning') : t('assetsInventory.scan')}
            </Button>
            <Button
              onClick={handleNewSession}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('assetsInventory.newSession')}
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('assetsInventory.export')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Session Info */}
      {currentSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#404040]">{currentSession.nom}</h2>
                  <p className="text-xs text-[var(--color-primary)]">
                    {t('assetsInventory.periodFromTo', { start: formatDate(currentSession.date_debut), end: formatDate(currentSession.date_fin_prevue) })}
                  </p>
                  <p className="text-xs text-[var(--color-primary)]">
                    {t('assetsInventory.responsibleLabel')}: {currentSession.responsable} | {t('assetsInventory.perimeterLabel')}: {currentSession.perimetre}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <p className="text-base font-bold text-blue-900">{formatPercentage(completionRate)}</p>
                      <p className="text-xs text-blue-700">{t('assetsInventory.progress')}</p>
                    </div>
                    <div className="w-24">
                      <Progress value={completionRate * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-[var(--color-text-tertiary)]/10 rounded">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">{t('assetsInventory.totalItems')}</p>
                  <p className="text-lg font-bold text-blue-700">
                    {currentSession?.nb_items_total || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-[var(--color-primary)]/10 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">{t('assetsInventory.counted')}</p>
                  <p className="text-lg font-bold text-green-700">{countedItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-red-50 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">{t('assetsInventory.discrepancies')}</p>
                  <p className="text-lg font-bold text-red-700">{discrepanciesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-[var(--color-text-secondary)]/10 rounded">
                  <Target className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">{t('assetsInventory.controlledValue')}</p>
                  <p className="text-sm font-bold text-primary-700">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="flex items-center text-base">
              <Filter className="mr-2 h-4 w-4" />
              {t('assetsInventory.filtersAndSearch')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('assetsInventory.session')}
                </label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('assetsInventory.zoneCategory')}
                </label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toutes">{t('assetsInventory.allZones')}</SelectItem>
                    <SelectItem value="Matériel Informatique">{t('assetsInventory.catIT')}</SelectItem>
                    <SelectItem value="Matériel de Transport">{t('assetsInventory.catTransport')}</SelectItem>
                    <SelectItem value="Mobilier">{t('assetsInventory.catFurniture')}</SelectItem>
                    <SelectItem value="Équipement Bureau">{t('assetsInventory.catOffice')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('assetsInventory.status')}
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">{t('assetsInventory.allStatuses')}</SelectItem>
                    <SelectItem value="non_compte">{t('assetsInventory.notCounted')}</SelectItem>
                    <SelectItem value="en_cours">{t('status.inProgress')}</SelectItem>
                    <SelectItem value="compte">{t('assetsInventory.countedStatus')}</SelectItem>
                    <SelectItem value="ecart">{t('assetsInventory.variance')}</SelectItem>
                    <SelectItem value="valide">{t('accounting.validated')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('assetsInventory.search')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                  <Input
                    placeholder={t('assetsInventory.searchPlaceholder')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleStartScanning}
                  disabled={isScanning}
                  className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  {t('assetsInventory.scanQrBarcode')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Tabs defaultValue="inventory" value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="h-8">
            <TabsTrigger value="inventory" className="text-sm">{t('assetsInventory.tabItems')}</TabsTrigger>
            <TabsTrigger value="discrepancies" className="text-sm">{t('assetsInventory.tabDiscrepancies')}</TabsTrigger>
            <TabsTrigger value="teams" className="text-sm">{t('assetsInventory.tabTeams')}</TabsTrigger>
            <TabsTrigger value="reports" className="text-sm">{t('assetsInventory.tabReports')}</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{t('assetsInventory.tabItems')}</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)]">
                      {t('assetsInventory.itemsCount', { count: String(inventoryItems.length) })}
                    </Badge>
                    <Badge variant={inventoryItems.filter(i => i.statut_comptage === 'compte').length > 0 ? 'default' : 'secondary'}>
                      {t('assetsInventory.countedCount', { count: String(inventoryItems.filter(i => i.statut_comptage === 'compte').length) })}
                    </Badge>
                    <Badge variant="destructive" className="bg-red-50 text-red-700">
                      {t('assetsInventory.variancesCount', { count: String(inventoryItems.filter(i => i.statut_comptage === 'ecart').length) })}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Filtres compacts */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 h-4 w-4" />
                      <Input
                        placeholder={t('assetsInventory.searchItemsPlaceholder')}
                        className="pl-10 h-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder={t('assetsInventory.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">{t('assetsInventory.all')}</SelectItem>
                      <SelectItem value="non_compte">{t('assetsInventory.notCounted')}</SelectItem>
                      <SelectItem value="compte">{t('assetsInventory.countedStatus')}</SelectItem>
                      <SelectItem value="ecart">{t('assetsInventory.variance')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder={t('assetsInventory.zone')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toutes">{t('assetsInventory.allZonesShort')}</SelectItem>
                      <SelectItem value="Matériel Informatique">{t('assetsInventory.catIT')}</SelectItem>
                      <SelectItem value="Matériel de Transport">{t('assetsInventory.catTransport')}</SelectItem>
                      <SelectItem value="Mobilier">{t('assetsInventory.catFurniture')}</SelectItem>
                      <SelectItem value="Équipement Bureau">{t('assetsInventory.catOffice')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setIsScanning(!isScanning)} size="sm" className="h-8">
                    <QrCode className="h-4 w-4 mr-1" />
                    {t('assetsInventory.scan')}
                  </Button>
                </div>

                {itemsLoading ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="lg" text={t('assetsInventory.loadingInventory')} />
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="text-xs font-medium py-1">{t('assetsInventory.thItem')}</TableHead>
                          <TableHead className="text-xs font-medium py-1">{t('assetsInventory.thLocation')}</TableHead>
                          <TableHead className="text-xs font-medium py-1">{t('assetsInventory.thStatus')}</TableHead>
                          <TableHead className="text-xs font-medium py-1">{t('assetsInventory.thCondition')}</TableHead>
                          <TableHead className="text-xs font-medium text-right py-1">{t('assetsInventory.thNbv')}</TableHead>
                          <TableHead className="text-xs font-medium py-1">{t('assetsInventory.thCounter')}</TableHead>
                          <TableHead className="text-xs font-medium py-1">{t('common.date')}</TableHead>
                          <TableHead className="text-xs font-medium text-center py-1">{t('assetsInventory.thActions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryItems.slice(0, 15).map((item) => (
                          <TableRow key={item.id} className="h-10 hover:bg-gray-50">
                            <TableCell className="py-1">
                              <div className="flex items-center space-x-2">
                                <div className="p-0.5 bg-[var(--color-text-tertiary)]/10 rounded">
                                  <Package className="h-3 w-3 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-xs">{item.nom}</p>
                                  <p className="text-xs text-gray-700 font-mono">{item.numero_inventaire}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-1">
                              <div>
                                <p className="text-xs font-medium text-gray-900">
                                  <MapPin className="inline h-3 w-3 mr-1" />
                                  {item.localisation_theorique}
                                </p>
                                {item.localisation_reelle && item.localisation_reelle !== item.localisation_theorique && (
                                  <p className="text-xs text-red-600">
                                    {t('assetsInventory.actualLocation')}: {item.localisation_reelle}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1">
                              <Badge
                                className="text-xs px-2 py-0.5"
                                variant={item.statut_comptage === 'ecart' ? 'destructive' :
                                       item.statut_comptage === 'compte' ? 'default' : 'secondary'}
                              >
                                {countStatusLabel(item.statut_comptage)}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1">
                              <Badge
                                className="text-xs px-2 py-0.5"
                                variant={item.etat_physique === 'excellent' ? 'default' :
                                       item.etat_physique === 'bon' ? 'secondary' : 'outline'}
                              >
                                {physicalStateLabel(item.etat_physique, true)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <span className="font-semibold text-[var(--color-primary)] text-xs">
                                {formatCurrency(item.valeur_nette_comptable)}
                              </span>
                            </TableCell>
                            <TableCell className="py-1">
                              {item.compteur && (
                                <div>
                                  <p className="text-xs font-medium">{item.compteur}</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-1">
                              {item.date_comptage && (
                                <span className="text-xs text-gray-600">
                                  {formatDate(item.date_comptage)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <div className="flex justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-gray-100"
                                  onClick={() => handleViewItem(item)}
                                  title={t('assetsInventory.viewDetails')}
                                >
                                  <Eye className="h-3 w-3 text-gray-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-gray-100"
                                  onClick={() => handleEditItem(item)}
                                  title={t('assetsInventory.edit')}
                                >
                                  <Edit className="h-3 w-3 text-gray-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-gray-100"
                                  onClick={() => handleQrCode(item)}
                                  title={t('assetsInventory.qrCode')}
                                >
                                  <QrCode className="h-3 w-3 text-gray-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination info compacte */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-700">
                    {t('assetsInventory.showingRange', { shown: String(Math.min(15, inventoryItems.length)), total: String(inventoryItems.length) })}
                  </span>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm" className="h-5 px-2 text-xs">{t('assetsInventory.previous')}</Button>
                    <Button variant="outline" size="sm" className="h-5 px-2 text-xs">{t('assetsInventory.next')}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discrepancies" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                    {t('assetsInventory.tabDiscrepancies')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive" className="bg-red-50 text-red-700">
                      {t('assetsInventory.variancesCount', { count: String(discrepancies.length) })}
                    </Badge>
                    <Badge variant="secondary">
                      {t('assetsInventory.inProgressCount', { count: String(discrepancies.filter(d => d.statut_resolution === 'en_cours').length) })}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Filtres pour les écarts */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder={t('assetsInventory.discrepancyType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('assetsInventory.allTypes')}</SelectItem>
                      <SelectItem value="manquant">{t('assetsInventory.typeMissing')}</SelectItem>
                      <SelectItem value="excedent">{t('assetsInventory.typeSurplus')}</SelectItem>
                      <SelectItem value="localisation">{t('assetsInventory.typeLocation')}</SelectItem>
                      <SelectItem value="etat">{t('assetsInventory.typeCondition')}</SelectItem>
                      <SelectItem value="valeur">{t('assetsInventory.typeValue')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder={t('assetsInventory.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('assetsInventory.all')}</SelectItem>
                      <SelectItem value="en_cours">{t('status.inProgress')}</SelectItem>
                      <SelectItem value="resolu">{t('assetsInventory.resolved')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8">
                    <Plus className="h-4 w-4 mr-1" />
                    {t('assetsInventory.newBtn')}
                  </Button>
                </div>

                <div className="space-y-1">
                  {discrepancies.map((discrepancy) => {
                    const item = inventoryItems.find(i => i.id === discrepancy.item_id);
                    return (
                      <div key={discrepancy.id} className="border rounded-lg p-2 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 bg-red-50 rounded">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {item?.nom || t('assetsInventory.unknownItem')}
                              </h4>
                              <p className="text-xs text-gray-600">{discrepancy.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Badge variant={discrepancy.type_ecart === 'manquant' ? 'destructive' : 'secondary'} className="text-xs px-2 py-0.5">
                              {discrepancyTypeLabel(discrepancy.type_ecart)}
                            </Badge>
                            <Badge variant={discrepancy.statut_resolution === 'resolu' ? 'default' : 'destructive'} className="text-xs px-2 py-0.5">
                              {discrepancy.statut_resolution === 'resolu' ? t('assetsInventory.resolved') : t('assetsInventory.inProgress')}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-1">
                          <div>
                            <p className="text-gray-700">{t('assetsInventory.inventoryNumber')}</p>
                            <p className="font-mono text-xs">{item?.numero_inventaire}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">{t('assetsInventory.financialImpact')}</p>
                            <p className={`font-semibold text-xs ${discrepancy.impact_financier > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                              {discrepancy.impact_financier > 0 ? formatCurrency(discrepancy.impact_financier) : t('assetsInventory.none')}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-700">{t('assetsInventory.responsible')}</p>
                            <p className="font-medium text-xs">{discrepancy.responsable_resolution || t('assetsInventory.unassigned')}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">{t('assetsInventory.resolutionDate')}</p>
                            <p className="font-medium text-xs">
                              {discrepancy.date_resolution ? formatDate(discrepancy.date_resolution) : t('assetsInventory.pending')}
                            </p>
                          </div>
                        </div>

                        {discrepancy.action_corrective && (
                          <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded p-2 mb-2">
                            <p className="text-xs text-green-800">
                              <strong>{t('assetsInventory.actionLabel')}</strong> {discrepancy.action_corrective}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            {t('assetsInventory.details')}
                          </Button>
                          {discrepancy.statut_resolution !== 'resolu' && (
                            <Button size="sm" className="bg-[var(--color-text-tertiary)] hover:bg-[var(--color-text-secondary)]" onClick={() => item && handleResolveDiscrepancy(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {t('assetsInventory.resolve')}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-primary-600" />
                    {t('assetsInventory.inventoryTeams')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]">
                      {t('assetsInventory.membersCount', { count: String(teamMembers.length) })}
                    </Badge>
                    <Badge variant="default">
                      {t('assetsInventory.activeCount', { count: String(teamMembers.length) })}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Button size="sm" className="h-8">
                    <Plus className="h-4 w-4 mr-1" />
                    {t('assetsInventory.addMember')}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8">
                    <Users className="h-4 w-4 mr-1" />
                    {t('assetsInventory.createTeam')}
                  </Button>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder={t('assetsInventory.zone')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('assetsInventory.allZonesShort')}</SelectItem>
                      <SelectItem value="bureau">{t('assetsInventory.zoneOffice')}</SelectItem>
                      <SelectItem value="entrepot">{t('assetsInventory.zoneWarehouse')}</SelectItem>
                      <SelectItem value="production">{t('assetsInventory.zoneProduction')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 md:grid-cols-1 lg:grid-cols-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="border rounded-lg p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="p-0.5 bg-[var(--color-text-secondary)]/10 rounded">
                            <Users className="h-3 w-3 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-900">{member.nom}</h4>
                            <Badge variant={member.role === 'responsable' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                              {roleLabel(member.role)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary-700">
                            {formatPercentage(member.taux_completion)}
                          </p>
                          <p className="text-xs text-gray-600">{t('assetsInventory.progress')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                        <div className="text-center">
                          <p className="text-gray-700">{t('assetsInventory.zone')}</p>
                          <p className="font-medium">{member.zone_affectee}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-700">{t('assetsInventory.assigned')}</p>
                          <p className="font-medium">{member.nb_items_assignes}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-700">{t('assetsInventory.counted')}</p>
                          <p className="font-medium text-green-700">{member.nb_items_comptes}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Progress value={member.taux_completion * 100} className="flex-1 h-1" />
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-green-600" />
                    {t('assetsInventory.inventoryReports')}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                      {t('assetsInventory.reportsAvailable')}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Filtres rapides */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder={t('assetsInventory.reportType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('assetsInventory.allTypes')}</SelectItem>
                      <SelectItem value="progression">{t('assetsInventory.reportProgress')}</SelectItem>
                      <SelectItem value="ecarts">{t('assetsInventory.reportVariances')}</SelectItem>
                      <SelectItem value="equipes">{t('assetsInventory.reportTeams')}</SelectItem>
                      <SelectItem value="financier">{t('assetsInventory.reportFinancial')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="pdf">
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue placeholder={t('assetsInventory.format')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8">
                    <Download className="h-4 w-4 mr-1" />
                    {t('assetsInventory.downloadAll')}
                  </Button>
                </div>

                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[var(--color-text-tertiary)]/10 rounded">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{t('assetsInventory.globalProgress')}</h4>
                        <p className="text-xs text-gray-600">{t('assetsInventory.statusByZone')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{t('assetsInventory.completedAt')}</span>
                      <span className="text-sm font-bold text-blue-700">67.5%</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-red-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{t('assetsInventory.tabDiscrepancies')}</h4>
                        <p className="text-xs text-gray-600">{t('assetsInventory.varianceAnalysis')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{t('assetsInventory.totalVariances')}</span>
                      <span className="text-sm font-bold text-red-700">{discrepancies.length}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      Excel
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[var(--color-text-secondary)]/10 rounded">
                        <Users className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{t('assetsInventory.teamPerformance')}</h4>
                        <p className="text-xs text-gray-600">{t('assetsInventory.analysisByTeam')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{t('assetsInventory.activeMembers')}</span>
                      <span className="text-sm font-bold text-primary-700">{teamMembers.length}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[var(--color-primary)]/10 rounded">
                        <Target className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{t('assetsInventory.financialReport')}</h4>
                        <p className="text-xs text-gray-600">{t('assetsInventory.assetValueImpact')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{t('assetsInventory.controlledValueShort')}</span>
                      <span className="text-sm font-bold text-green-700">25,3M XAF</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      CSV
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[var(--color-border)]/20 rounded">
                        <Calendar className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{t('assetsInventory.summaryReport')}</h4>
                        <p className="text-xs text-gray-600">{t('assetsInventory.fullOverview')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">{t('assetsInventory.lastUpdate')}</span>
                      <span className="text-sm font-bold text-yellow-700">{t('common.today')}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
                  </div>

                  <div className="border rounded-lg p-6 hover:bg-gray-50">
                    <div className="flex items-center space-x-3 mb-4">
                      <Users className="h-5 w-5 text-primary-600" />
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{t('assetsInventory.teamsReport')}</h3>
                        <p className="text-xs text-gray-600">{t('assetsInventory.performanceByCounter')}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      {t('assetsInventory.generateHrReport')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Scanning Progress */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-white p-6 rounded-lg shadow-lg border z-50"
        >
          <div className="flex items-center space-x-4">
            <div className="animate-pulse">
              <QrCode className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t('assetsInventory.scannerActive')}</p>
              <p className="text-sm text-gray-600">{t('assetsInventory.scanPrompt')}</p>
              <Progress value={80} className="w-48 mt-2" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal Nouvelle Session */}
      <Dialog open={showNewSessionModal} onOpenChange={setShowNewSessionModal}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#404040]">
              <ClipboardList className="mr-2 h-5 w-5 text-[var(--color-primary)]" />
              {t('assetsInventory.newInventorySession')}
            </DialogTitle>
            <DialogDescription>
              {t('assetsInventory.newSessionDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-name">{t('assetsInventory.sessionName')}</Label>
                <Input id="session-name" placeholder={t('assetsInventory.sessionNamePlaceholder')} value={sessionForm.nom} onChange={e => setSessionForm(s => ({ ...s, nom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-type">{t('assetsInventory.inventoryType')}</Label>
                <Select defaultValue="complet">
                  <SelectTrigger id="session-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complet">{t('assetsInventory.typeFull')}</SelectItem>
                    <SelectItem value="partiel">{t('assetsInventory.typePartial')}</SelectItem>
                    <SelectItem value="cyclique">{t('assetsInventory.typeCyclic')}</SelectItem>
                    <SelectItem value="surprise">{t('assetsInventory.typeSurprise')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">{t('assetsInventory.startDate')}</Label>
                <Input id="start-date" type="date" value={sessionForm.debut} onChange={e => setSessionForm(s => ({ ...s, debut: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{t('assetsInventory.plannedEndDate')}</Label>
                <Input id="end-date" type="date" value={sessionForm.fin} onChange={e => setSessionForm(s => ({ ...s, fin: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locations">{t('assetsInventory.sitesConcerned')}</Label>
              <Select>
                <SelectTrigger id="locations">
                  <SelectValue placeholder={t('assetsInventory.selectSites')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('assetsInventory.allSites')}</SelectItem>
                  <SelectItem value="siege">{t('assetsInventory.siteHq')}</SelectItem>
                  <SelectItem value="entrepot">{t('assetsInventory.siteWarehouse')}</SelectItem>
                  <SelectItem value="usine">{t('assetsInventory.sitePlant')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('assetsInventory.description')}</Label>
              <Textarea
                id="description"
                placeholder={t('assetsInventory.descriptionPlaceholder')}
                rows={3}
                value={sessionForm.desc}
                onChange={e => setSessionForm(s => ({ ...s, desc: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSessionModal(false)}>
              {t('assetsInventory.cancel')}
            </Button>
            <Button
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
              onClick={handleCreateSession}
            >
              {t('assetsInventory.createSession')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Détails Article */}
      <Dialog open={showItemDetailModal} onOpenChange={setShowItemDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#404040]">
              <Eye className="mr-2 h-5 w-5 text-[var(--color-primary)]" />
              {t('assetsInventory.assetDetails')}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700">{t('assetsInventory.itemCode')}</p>
                    <p className="font-semibold text-[#404040]">{selectedItem.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{t('assetsInventory.designation')}</p>
                    <p className="font-semibold text-[#404040]">{selectedItem.designation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{t('assetsInventory.category')}</p>
                    <p className="font-semibold text-[var(--color-primary)]">{selectedItem.categorie}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{t('assetsInventory.location')}</p>
                    <p className="font-semibold">{selectedItem.localisation}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700">{t('assetsInventory.netBookValue')}</p>
                    <p className="font-semibold text-[var(--color-primary)] text-lg">
                      {formatCurrency(selectedItem.valeur_nette_comptable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{t('assetsInventory.physicalCondition')}</p>
                    <Badge
                      className={selectedItem.etat_physique === 'excellent' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' :
                               selectedItem.etat_physique === 'bon' ? 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)]' :
                               'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]'}
                    >
                      {physicalStateLabel(selectedItem.etat_physique)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{t('assetsInventory.countStatus')}</p>
                    <Badge
                      variant={selectedItem.statut_comptage === 'compte' ? 'default' : 'secondary'}
                    >
                      {selectedItem.statut_comptage === 'compte' ? t('assetsInventory.countedStatus') : t('assetsInventory.notCounted')}
                    </Badge>
                  </div>
                  {selectedItem.date_comptage && (
                    <div>
                      <p className="text-sm text-gray-700">{t('assetsInventory.countDate')}</p>
                      <p className="font-semibold">{formatDate(selectedItem.date_comptage)}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedItem.ecart && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-red-600">{t('assetsInventory.varianceDetected')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-700">{t('assetsInventory.discrepancyType')}</p>
                      <Badge variant="destructive">{selectedItem.ecart.type}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{t('assetsInventory.varianceValue')}</p>
                      <p className="font-semibold text-red-600">
                        {formatCurrency(selectedItem.ecart.valeur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">{t('assetsInventory.description')}</p>
                      <p className="text-sm">{selectedItem.ecart.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.compteur && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 text-[#404040]">{t('assetsInventory.responsibleCounter')}</h3>
                  <p className="text-[var(--color-primary)]">{selectedItem.compteur}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDetailModal(false)}>
              {t('assetsInventory.close')}
            </Button>
            <Button
              className="bg-[var(--color-text-tertiary)] hover:bg-[var(--color-text-secondary)]"
              onClick={() => {
                setShowItemDetailModal(false);
                setShowEditItemModal(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              {t('assetsInventory.edit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Modification Article */}
      <Dialog open={showEditItemModal} onOpenChange={setShowEditItemModal}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#404040]">
              <Edit className="mr-2 h-5 w-5 text-[var(--color-primary)]" />
              {t('assetsInventory.editAsset')}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-etat">{t('assetsInventory.physicalCondition')}</Label>
                  <Select value={editForm.etat} onValueChange={v => setEditForm(s => ({ ...s, etat: v }))}>
                    <SelectTrigger id="edit-etat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">{t('assetsInventory.condExcellent')}</SelectItem>
                      <SelectItem value="bon">{t('assetsInventory.condGood')}</SelectItem>
                      <SelectItem value="moyen">{t('assetsInventory.condFair')}</SelectItem>
                      <SelectItem value="mauvais">{t('assetsInventory.condPoor')}</SelectItem>
                      <SelectItem value="hors_service">{t('assetsInventory.condOutOfService')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-localisation">{t('assetsInventory.location')}</Label>
                  <Input
                    id="edit-localisation"
                    value={editForm.localisation}
                    onChange={e => setEditForm(s => ({ ...s, localisation: e.target.value }))}
                    placeholder={t('assetsInventory.locationPlaceholder')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-statut">{t('assetsInventory.countStatus')}</Label>
                <Select value={editForm.statut} onValueChange={v => setEditForm(s => ({ ...s, statut: v }))}>
                  <SelectTrigger id="edit-statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_compte">{t('assetsInventory.notCounted')}</SelectItem>
                    <SelectItem value="compte">{t('assetsInventory.countedStatus')}</SelectItem>
                    <SelectItem value="ecart">{t('assetsInventory.variance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">{t('assetsInventory.notesObservations')}</Label>
                <Textarea
                  id="edit-notes"
                  placeholder={t('assetsInventory.notesPlaceholder')}
                  rows={3}
                  value={editForm.notes}
                  onChange={e => setEditForm(s => ({ ...s, notes: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemModal(false)}>
              {t('assetsInventory.cancel')}
            </Button>
            <Button
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
              onClick={handleSaveItemCount}
            >
              {t('assetsInventory.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <Dialog open={showQrCodeModal} onOpenChange={setShowQrCodeModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#404040]">
              <QrCode className="mr-2 h-5 w-5 text-[var(--color-primary)]" />
              {t('assetsInventory.assetQrCode')}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-2">{t('assetsInventory.itemCode')}</p>
                <p className="font-bold text-lg text-[#404040]">{selectedItem.code}</p>
              </div>
              <div className="bg-white p-8 rounded-lg border-2 border-[var(--color-primary)]/20">
                <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                  <QrCode className="h-32 w-32 text-[var(--color-primary)]" />
                </div>
              </div>
              <div className="text-center text-sm text-gray-600">
                <p>{selectedItem.designation}</p>
                <p className="text-xs mt-1">{selectedItem.localisation}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrCodeModal(false)}>
              {t('assetsInventory.close')}
            </Button>
            <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
              <Download className="mr-2 h-4 w-4" />
              {t('assetsInventory.download')}
            </Button>
            <Button className="bg-[var(--color-text-tertiary)] hover:bg-[var(--color-text-secondary)]">
              <Camera className="mr-2 h-4 w-4" />
              {t('assetsInventory.print')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventairePhysiquePage;