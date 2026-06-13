import React, { useState, useEffect } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { formatCurrency } from '../../utils/formatters';
import { buildPieceNumbers, pieceNumberOf } from '../../utils/pieceNumber';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Filter, Download, Eye, Edit, Trash2,
  ArrowLeft, Phone, Mail, MapPin, Calendar, DollarSign,
  Target, TrendingUp, Activity, AlertTriangle, CheckCircle,
  Star, Heart, Award, Clock, CreditCard, FileText,
  BarChart3, PieChart, MessageSquare, User, Building,
  Handshake, Globe, Share2, Zap, Shield, Package, X
} from 'lucide-react';
import {
  LoadingSpinner
} from '../../components/ui';
import { tiersService, createPartenaireSchema } from '../../services/modules/tiers.service';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';

interface Partenaire {
  id: string;
  code: string;
  nom: string;
  type: 'DISTRIBUTEUR' | 'REVENDEUR' | 'INTEGRATEUR' | 'CONSULTANT' | 'TECHNOLOGIQUE' | 'STRATEGIQUE';
  statut: 'ACTIF' | 'INACTIF' | 'PROSPECT' | 'SUSPENDU';
  niveau: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';
  secteurActivite: string;
  zoneCouverture: string[];
  dateDebut: string;
  dateFinContrat?: string;
  chiffreAffairesAnnuel: number;
  commissionRate: number;
  scorePerformance: number;
  certifications: string[];
  contact: {
    nom: string;
    prenom: string;
    fonction: string;
    telephone: string;
    email: string;
  };
  adresse: {
    rue: string;
    ville: string;
    pays: string;
    region: string;
  };
  indicateursPerformance: {
    ventesGenerees: number;
    clientsApportes: number;
    satisfactionClients: number;
    respectObjectifs: number;
    qualiteLivraisons: number;
  };
  collaboration: {
    projetsCommuns: number;
    formationsRealisees: number;
    evenementsParticipes: number;
    supportTechnique: 'BASIQUE' | 'AVANCE' | 'PREMIUM';
  };
  contrat: {
    typeContrat: 'EXCLUSIF' | 'NON_EXCLUSIF' | 'ZONE_EXCLUSIVE';
    conditionsCommerciales: string;
    objectifsAnnuels: number;
    bonusPerformance: number;
  };
  historique: PartenaireHistorique[];
  notes: string;
  documents: string[];
}

interface PartenaireHistorique {
  id: string;
  date: string;
  type: 'VENTE' | 'FORMATION' | 'CERTIFICATION' | 'EVENEMENT' | 'SUPPORT';
  description: string;
  valeur?: number;
  responsable: string;
}

interface PartenaireAnalytics {
  performanceGlobale: number;
  croissanceChiffre: number;
  satisfactionMoyenne: number;
  tauxRenouvellement: number;
  repartitionParType: Array<{type: string; nombre: number; ca: number}>;
  evolutionPerformance: Array<{mois: string; ventes: number; satisfaction: number}>;
  topPartenaires: Array<{nom: string; ca: number; score: number; niveau: string}>;
  zonesCouverte: Array<{zone: string; partenaires: number; ca: number}>;
}

const PartenairesModule: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reseau');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('tous');
  const [filterNiveau, setFilterNiveau] = useState('tous');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPartenaire, setSelectedPartenaire] = useState<Partenaire | null>(null);
  const [showPartenaireModal, setShowPartenaireModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'client' as 'client' | 'fournisseur' | 'client_fournisseur',
    raison_sociale: '',
    forme_juridique: '',
    siren: '',
    siret: '',
    tva_intracommunautaire: '',
    adresse: '',
    ville: '',
    code_postal: '',
    pays: 'France',
    telephone: '',
    email: '',
    contact_principal: '',
    conditions_paiement: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Create partenaire mutation
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof createPartenaireSchema>) =>
      tiersService.create(data as any),
    onSuccess: () => {
      toast.success('Partenaire créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['partenaires'] });
      setShowPartenaireModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  const resetForm = () => {
    setFormData({
      type: 'client',
      raison_sociale: '',
      forme_juridique: '',
      siren: '',
      siret: '',
      tva_intracommunautaire: '',
      adresse: '',
      ville: '',
      code_postal: '',
      pays: 'France',
      telephone: '',
      email: '',
      contact_principal: '',
      conditions_paiement: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string) => {
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

      const validatedData = createPartenaireSchema.parse(formData);
      await createMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      } else {
        toast.error('Erreur lors de la création');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Data from DataContext
  const { adapter } = useData();
  const [thirdParties, setThirdParties] = useState<any[]>([]);
  // Écritures par tiers (third_party_code) — pour la fiche partenaire (œil).
  const [partnerLinesMap, setPartnerLinesMap] = useState<Record<string, { date: string; piece: string; libelle: string; debit: number; credit: number }[]>>({});

  useEffect(() => {
    const load = async () => {
      const [tps, entries] = await Promise.all([
        adapter.getAll('thirdParties'),
        adapter.getAll<any>('journalEntries'),
      ]);
      setThirdParties(tps as Record<string, unknown>[]);
      const pieceNumbers = buildPieceNumbers(entries as any);
      const byCode: Record<string, { date: string; piece: string; libelle: string; debit: number; credit: number }[]> = {};
      for (const e of entries) {
        if (e.status === 'draft') continue;
        for (const l of (e.lines || [])) {
          const tpc = l.thirdPartyCode || l.third_party_code;
          if (!tpc) continue;
          (byCode[tpc] ||= []).push({
            date: e.date,
            piece: pieceNumberOf(e, pieceNumbers),
            libelle: l.label || e.label || '',
            debit: l.debit || 0,
            credit: l.credit || 0,
          });
        }
      }
      for (const k in byCode) byCode[k].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      setPartnerLinesMap(byCode);
    };
    load();
  }, [adapter]);

  // Map third parties to partenaire format
  const mockPartenaires: Partenaire[] = thirdParties.map((tp) => {
    const typeMap: Record<string, Partenaire['type']> = {
      customer: 'DISTRIBUTEUR',
      supplier: 'INTEGRATEUR',
      both: 'STRATEGIQUE',
    };
    return {
      id: tp.id,
      code: tp.code,
      nom: tp.name,
      type: typeMap[tp.type] || 'CONSULTANT',
      statut: tp.isActive ? 'ACTIF' as const : 'INACTIF' as const,
      niveau: Math.abs(tp.balance) > 1000000 ? 'PLATINUM' as const
        : Math.abs(tp.balance) > 500000 ? 'GOLD' as const
        : Math.abs(tp.balance) > 100000 ? 'SILVER' as const
        : 'BRONZE' as const,
      secteurActivite: 'Général',
      zoneCouverture: ['National'],
      dateDebut: new Date().toISOString().split('T')[0],
      chiffreAffairesAnnuel: Math.abs(tp.balance),
      commissionRate: 10,
      scorePerformance: tp.isActive ? 80 : 40,
      certifications: [],
      contact: {
        nom: tp.name.split(' ').slice(1).join(' ') || tp.name,
        prenom: tp.name.split(' ')[0] || '',
        fonction: 'Contact principal',
        telephone: tp.phone || '',
        email: tp.email || '',
      },
      adresse: {
        rue: tp.address || '',
        ville: '',
        pays: '',
        region: '',
      },
      indicateursPerformance: {
        ventesGenerees: Math.abs(tp.balance),
        clientsApportes: 0,
        satisfactionClients: 4.0,
        respectObjectifs: 80,
        qualiteLivraisons: 90,
      },
      collaboration: {
        projetsCommuns: 0,
        formationsRealisees: 0,
        evenementsParticipes: 0,
        supportTechnique: 'BASIQUE' as const,
      },
      contrat: {
        typeContrat: 'NON_EXCLUSIF' as const,
        conditionsCommerciales: 'Standard',
        objectifsAnnuels: Math.abs(tp.balance),
        bonusPerformance: 0,
      },
      historique: [],
      notes: `Code: ${tp.code}${tp.taxId ? ` | NIF: ${tp.taxId}` : ''}`,
      documents: [],
    };
  });

  // Analytics calculées sur les partenaires RÉELS (issus de thirdParties).
  const analytics: PartenaireAnalytics = (() => {
    const list = mockPartenaires;
    const n = list.length;
    const avg = (f: (p: Partenaire) => number) => (n ? list.reduce((s, p) => s + f(p), 0) / n : 0);
    const byType = new Map<string, { type: Partenaire['type']; nombre: number; ca: number }>();
    for (const p of list) {
      const t = byType.get(p.type) || { type: p.type, nombre: 0, ca: 0 };
      t.nombre += 1;
      t.ca += p.chiffreAffairesAnnuel || 0;
      byType.set(p.type, t);
    }
    const byZone = new Map<string, { zone: string; partenaires: number; ca: number }>();
    for (const p of list) {
      const zone = p.adresse?.region || p.adresse?.pays || '—';
      const z = byZone.get(zone) || { zone, partenaires: 0, ca: 0 };
      z.partenaires += 1;
      z.ca += p.chiffreAffairesAnnuel || 0;
      byZone.set(zone, z);
    }
    const top = [...list]
      .sort((a, b) => (b.chiffreAffairesAnnuel || 0) - (a.chiffreAffairesAnnuel || 0))
      .slice(0, 5)
      .map(p => ({ nom: p.nom, ca: p.chiffreAffairesAnnuel || 0, score: p.scorePerformance || 0, niveau: p.niveau }));
    return {
      performanceGlobale: Math.round(avg(p => p.scorePerformance || 0)),
      croissanceChiffre: 0,
      satisfactionMoyenne: Number(avg(p => p.indicateursPerformance?.satisfactionClients || 0).toFixed(1)),
      tauxRenouvellement: n ? Math.round((list.filter(p => p.statut === 'ACTIF').length / n) * 100) : 0,
      repartitionParType: Array.from(byType.values()),
      evolutionPerformance: [],
      topPartenaires: top,
      zonesCouverte: Array.from(byZone.values()),
    };
  })();

  const tabs = [
    { id: 'reseau', label: 'Réseau Partenaires', icon: Handshake },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'collaboration', label: 'Collaboration', icon: Share2 },
    { id: 'certification', label: 'Certifications', icon: Award },
    { id: 'analytics', label: 'Analytics', icon: PieChart }
  ];

  const types = [
    { value: 'tous', label: 'Tous types' },
    { value: 'DISTRIBUTEUR', label: 'Distributeur' },
    { value: 'REVENDEUR', label: 'Revendeur' },
    { value: 'INTEGRATEUR', label: 'Intégrateur' },
    { value: 'CONSULTANT', label: 'Consultant' },
    { value: 'TECHNOLOGIQUE', label: 'Technologique' },
    { value: 'STRATEGIQUE', label: 'Stratégique' }
  ];

  const niveaux = [
    { value: 'tous', label: 'Tous niveaux' },
    { value: 'PLATINUM', label: 'Platinum' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'SILVER', label: 'Silver' },
    { value: 'BRONZE', label: 'Bronze' }
  ];

  const filteredPartenaires = mockPartenaires.filter(partenaire => {
    const matchesSearch = partenaire.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partenaire.contact.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'tous' || partenaire.type === filterType;
    const matchesNiveau = filterNiveau === 'tous' || partenaire.niveau === filterNiveau;
    return matchesSearch && matchesType && matchesNiveau;
  });


  const getNiveauBadge = (niveau: string) => {
    const niveauConfig = {
      'PLATINUM': 'bg-primary-100 text-primary-800',
      'GOLD': 'bg-yellow-100 text-yellow-800',
      'SILVER': 'bg-gray-100 text-gray-800',
      'BRONZE': 'bg-orange-100 text-orange-800'
    };
    return niveauConfig[niveau as keyof typeof niveauConfig] || 'bg-gray-100 text-gray-800';
  };

  const getStatutBadge = (statut: string) => {
    const statutConfig = {
      'ACTIF': 'bg-green-100 text-green-800',
      'INACTIF': 'bg-gray-100 text-gray-800',
      'PROSPECT': 'bg-blue-100 text-blue-800',
      'SUSPENDU': 'bg-red-100 text-red-800'
    };
    return statutConfig[statut as keyof typeof statutConfig] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'DISTRIBUTEUR': Package,
      'REVENDEUR': Share2,
      'INTEGRATEUR': Zap,
      'CONSULTANT': User,
      'TECHNOLOGIQUE': Globe,
      'STRATEGIQUE': Shield
    };
    return icons[type as keyof typeof icons] || Building;
  };

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-screen ">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#404040]" />
              <span className="text-sm font-semibold text-[#404040]">Retour</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text-secondary)] flex items-center justify-center">
                <Handshake className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">Gestion des Partenaires</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Écosystème et réseau de partenaires stratégiques</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-700" />
              <input
                type="text"
                placeholder="Rechercher un partenaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-48"
              />
            </div>

            {showFilters && (
            <>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {types.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            <select
              value={filterNiveau}
              onChange={(e) => setFilterNiveau(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {niveaux.map(niveau => (
                <option key={niveau.value} value={niveau.value}>{niveau.label}</option>
              ))}
            </select>
            </>
            )}

            <PageHeaderActions
              onToggleFilters={() => setShowFilters((v) => !v)}
              filtersOpen={showFilters}
              activeFilters={[searchTerm !== '', filterType !== 'tous', filterNiveau !== 'tous'].filter(Boolean).length}
            />

            <button className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors" aria-label="Télécharger">
              <Download className="w-4 h-4" />
              <span className="text-sm font-semibold">{t('common.export')}</span>
            </button>

            <button
              onClick={() => setShowPartenaireModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Nouveau Partenaire</span>
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
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[#404040]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Partenaires Actifs</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{mockPartenaires.length}</p>
              <p className="text-xs text-[var(--color-primary)]">Écosystème global</p>
            </div>
            <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
              <Handshake className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Performance Globale</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{analytics.performanceGlobale}%</p>
              <p className="text-xs text-green-600">+5.2% vs trimestre</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">CA Partenaires</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(14700000)}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">+{analytics.croissanceChiffre}% YoY</p>
            </div>
            <div className="w-10 h-10 bg-[var(--color-text-secondary)]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[var(--color-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">Satisfaction</p>
              <p className="text-lg font-bold text-[var(--color-primary)]">{analytics.satisfactionMoyenne}/5</p>
              <p className="text-xs text-orange-600">{analytics.tauxRenouvellement}% renouvellement</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Réseau Partenaires Tab */}
      {activeTab === 'reseau' && (
        <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">Partenaire</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">Niveau</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">Zone</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">CA Annuel</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">Performance</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-[var(--color-text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartenaires.map((partenaire) => {
                  const TypeIcon = getTypeIcon(partenaire.type);
                  return (
                    <tr key={partenaire.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-[var(--color-primary)]">{partenaire.nom}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{partenaire.contact.prenom} {partenaire.contact.nom}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{partenaire.contact.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <TypeIcon className="w-4 h-4 text-[var(--color-primary)]" />
                          <span className="text-sm text-[var(--color-text-secondary)]">{partenaire.type}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNiveauBadge(partenaire.niveau)}`}>
                          {partenaire.niveau}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-[var(--color-text-secondary)]">{partenaire.zoneCouverture.join(', ')}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-[var(--color-primary)]">{formatCurrency(partenaire.chiffreAffairesAnnuel)}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{partenaire.commissionRate}% commission</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-[var(--color-primary)] h-2 rounded-full"
                              style={{ width: `${partenaire.scorePerformance}%` }}
                            />
                          </div>
                          <span className="text-sm text-[var(--color-text-secondary)]">{partenaire.scorePerformance}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatutBadge(partenaire.statut)}`}>
                          {partenaire.statut}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setSelectedPartenaire(partenaire)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-text-secondary)]/10 rounded">
                            <MessageSquare className="w-4 h-4" />
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
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Top Performers */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Top Performers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {analytics.topPartenaires.map((partenaire, index) => (
                <div key={partenaire.nom} className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNiveauBadge(partenaire.niveau)}`}>
                      #{index + 1}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNiveauBadge(partenaire.niveau)}`}>
                      {partenaire.niveau}
                    </span>
                  </div>
                  <h4 className="font-medium text-[var(--color-primary)] mb-1">{partenaire.nom}</h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-2">{formatCurrency(partenaire.ca)}</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[var(--color-primary)] h-2 rounded-full"
                        style={{ width: `${partenaire.score}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">{partenaire.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Evolution */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Évolution Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.evolutionPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="ventes" stroke="#235A6E" fill="#235A6E" fillOpacity={0.3} name="Ventes (FCFA)" />
                <Line yAxisId="right" type="monotone" dataKey="satisfaction" stroke="#4E7E8D" name="Satisfaction" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition par Type */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Répartition par Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  dataKey="ca"
                  data={analytics.repartitionParType}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#235A6E"
                  label={({ type, nombre }: any) => `${type}: ${nombre}`}
                >
                  {analytics.repartitionParType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Couverture Géographique */}
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Couverture Géographique</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.zonesCouverte}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="zone" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar radius={[6,6,0,0]} dataKey="partenaires" fill="url(#gradPetrol)" name="Nombre de partenaires" />
                <Bar radius={[6,6,0,0]} dataKey="ca" fill="url(#gradPetrolLight)" name="CA (en milliers)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Autres onglets */}
      {activeTab === 'collaboration' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <Share2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Espace Collaboration</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Projets communs, formations et événements partenaires</p>
            <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors">
              Gérer la collaboration
            </button>
          </div>
        </div>
      )}

      {activeTab === 'certification' && (
        <div className="bg-white rounded-lg p-6 border border-[var(--color-border)] shadow-sm">
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Programme Certification</h3>
            <p className="text-[var(--color-text-secondary)] mb-4">Certifications et formations pour les partenaires</p>
            <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 transition-colors">
              Voir les certifications
            </button>
          </div>
        </div>
      )}

      {/* Partenaire Modal */}
      {showPartenaireModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                  <Handshake className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Nouveau Partenaire</h2>
              </div>
              <button
                onClick={() => {
                  setShowPartenaireModal(false);
                  resetForm();
                }}
                className="text-gray-700 hover:text-gray-700"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-900 mb-1">Ajout d&apos;un Partenaire</h4>
                      <p className="text-sm text-green-800">Enregistrez un nouveau partenaire dans votre écosystème de distribution et collaboration.</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations de Base</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale *</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Ex: CEMAC TECH SOLUTIONS"
                        value={formData.raison_sociale}
                        onChange={(e) => handleInputChange('raison_sociale', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.raison_sociale && (
                        <p className="mt-1 text-sm text-red-600">{errors.raison_sociale}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="client">Client</option>
                        <option value="fournisseur">Fournisseur</option>
                        <option value="client_fournisseur">Client & Fournisseur</option>
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Forme juridique</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Ex: SARL, SA, SAS..."
                        value={formData.forme_juridique}
                        onChange={(e) => handleInputChange('forme_juridique', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.forme_juridique && (
                        <p className="mt-1 text-sm text-red-600">{errors.forme_juridique}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SIREN (9 chiffres)</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="123456789"
                        value={formData.siren}
                        onChange={(e) => handleInputChange('siren', e.target.value)}
                        disabled={isSubmitting}
                        maxLength={9}
                      />
                      {errors.siren && (
                        <p className="mt-1 text-sm text-red-600">{errors.siren}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SIRET (14 chiffres)</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="12345678901234"
                        value={formData.siret}
                        onChange={(e) => handleInputChange('siret', e.target.value)}
                        disabled={isSubmitting}
                        maxLength={14}
                      />
                      {errors.siret && (
                        <p className="mt-1 text-sm text-red-600">{errors.siret}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TVA intracommunautaire</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="FR12345678901"
                        value={formData.tva_intracommunautaire}
                        onChange={(e) => handleInputChange('tva_intracommunautaire', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.tva_intracommunautaire && (
                        <p className="mt-1 text-sm text-red-600">{errors.tva_intracommunautaire}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Adresse</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Adresse complète"
                        value={formData.adresse}
                        onChange={(e) => handleInputChange('adresse', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.adresse && (
                        <p className="mt-1 text-sm text-red-600">{errors.adresse}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Ville"
                        value={formData.ville}
                        onChange={(e) => handleInputChange('ville', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.ville && (
                        <p className="mt-1 text-sm text-red-600">{errors.ville}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code postal *</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Code postal"
                        value={formData.code_postal}
                        onChange={(e) => handleInputChange('code_postal', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.code_postal && (
                        <p className="mt-1 text-sm text-red-600">{errors.code_postal}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pays *</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Pays"
                        value={formData.pays}
                        onChange={(e) => handleInputChange('pays', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.pays && (
                        <p className="mt-1 text-sm text-red-600">{errors.pays}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="+237 6 XX XX XX XX"
                        value={formData.telephone}
                        onChange={(e) => handleInputChange('telephone', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.telephone && (
                        <p className="mt-1 text-sm text-red-600">{errors.telephone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="contact@partenaire.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact et Conditions */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Contact et Conditions</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact principal</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Nom du contact principal"
                        value={formData.contact_principal}
                        onChange={(e) => handleInputChange('contact_principal', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.contact_principal && (
                        <p className="mt-1 text-sm text-red-600">{errors.contact_principal}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Conditions de paiement</label>
                      <textarea
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                        rows={3}
                        placeholder="Conditions de paiement..."
                        value={formData.conditions_paiement}
                        onChange={(e) => handleInputChange('conditions_paiement', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.conditions_paiement && (
                        <p className="mt-1 text-sm text-red-600">{errors.conditions_paiement}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPartenaireModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('actions.create')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fiche Partenaire (lecture seule + écritures) — bouton œil */}
      {selectedPartenaire && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-primary)]">{selectedPartenaire.nom}</h3>
                <p className="text-sm text-gray-500 font-mono">{selectedPartenaire.code} · {selectedPartenaire.type}</p>
              </div>
              <button onClick={() => setSelectedPartenaire(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">Statut</span><p className="font-medium">{selectedPartenaire.statut}</p></div>
                <div><span className="text-gray-500">Téléphone</span><p className="font-medium">{selectedPartenaire.contact?.telephone || '—'}</p></div>
                <div><span className="text-gray-500">Email</span><p className="font-medium">{selectedPartenaire.contact?.email || '—'}</p></div>
                <div><span className="text-gray-500">CA annuel</span><p className="font-semibold text-[var(--color-primary)]">{formatCurrency(selectedPartenaire.chiffreAffairesAnnuel)}</p></div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Écritures ({(partnerLinesMap[selectedPartenaire.code] || []).length})</h4>
                <div className="border rounded-lg overflow-auto max-h-[40vh]">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Pièce</th><th className="text-left px-3 py-2">Libellé</th><th className="text-right px-3 py-2">Débit</th><th className="text-right px-3 py-2">Crédit</th></tr>
                    </thead>
                    <tbody>
                      {(partnerLinesMap[selectedPartenaire.code] || []).length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">Aucune écriture attribuée à ce partenaire.</td></tr>
                      )}
                      {(partnerLinesMap[selectedPartenaire.code] || []).slice(0, 300).map((l, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-1.5 whitespace-nowrap">{l.date}</td>
                          <td className="px-3 py-1.5 whitespace-nowrap">{l.piece}</td>
                          <td className="px-3 py-1.5">{l.libelle}</td>
                          <td className="px-3 py-1.5 text-right text-red-600 whitespace-nowrap">{l.debit ? formatCurrency(l.debit) : ''}</td>
                          <td className="px-3 py-1.5 text-right text-green-600 whitespace-nowrap">{l.credit ? formatCurrency(l.credit) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setSelectedPartenaire(null)} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartenairesModule;