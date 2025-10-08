import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, Search, Filter, Download, ArrowLeft, Home, Plus,
  Edit, Eye, Check, X, BarChart3, Building2, Package, Users,
  DollarSign, TrendingUp, CreditCard, FileText, ChevronRight,
  ChevronDown, Upload, Settings, Trash2, Copy, AlertCircle,
  CheckCircle, Info, Menu, FileSpreadsheet, Printer, RefreshCw,
  ChevronLeft
} from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import { useDataTable } from '../../hooks/useDataTable';
import { accountService } from '../../services/api.service';
import { accountingService, createJournalSchema } from '../../services/modules/accounting.service';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button, Input } from '../../components/ui';

interface Compte {
  id?: string;
  code: string;
  libelle: string;
  solde: number;
  type: string;
  status: string;
  classe: string;
  sousComptes?: Array<{
    code: string;
    libelle: string;
    solde: number;
  }>;
}

const PlanSYSCOHADAPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedClasse, setSelectedClasse] = useState<string>('1');
  const [selectedComptes, setSelectedComptes] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    type: 'general',
    classe: '1',
    description: '',
    actif: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Plan comptable SYSCOHADA par classes
  const planComptable = {
    '1': {
      nom: 'Comptes de ressources durables',
      shortName: 'Ressources durables',
      color: '#2E7D32',
      icon: Building2,
      description: 'Capitaux propres et ressources assimilées',
      comptes: [
        {
          code: '10',
          libelle: 'CAPITAL',
          solde: 5000000,
          type: 'capital',
          status: 'active',
          sousComptes: [
            { code: '101', libelle: 'Capital social', solde: 3000000 },
            { code: '102', libelle: 'Capital par dotation', solde: 2000000 },
            { code: '103', libelle: 'Capital personnel', solde: 0 },
            { code: '104', libelle: 'Compte de l\'exploitant', solde: 0 },
            { code: '105', libelle: 'Primes liées au capital social', solde: 0 }
          ]
        },
        {
          code: '11',
          libelle: 'RÉSERVES',
          solde: 500000,
          type: 'reserve',
          status: 'active',
          sousComptes: [
            { code: '111', libelle: 'Réserve légale', solde: 300000 },
            { code: '112', libelle: 'Réserves statutaires', solde: 100000 },
            { code: '113', libelle: 'Réserves réglementées', solde: 50000 },
            { code: '118', libelle: 'Autres réserves', solde: 50000 }
          ]
        },
        {
          code: '12',
          libelle: 'REPORT À NOUVEAU',
          solde: 325000,
          type: 'reporte',
          status: 'active',
          sousComptes: [
            { code: '121', libelle: 'Report à nouveau créditeur', solde: 325000 },
            { code: '129', libelle: 'Report à nouveau débiteur', solde: 0 }
          ]
        },
        {
          code: '13',
          libelle: 'RÉSULTAT NET DE L\'EXERCICE',
          solde: 0,
          type: 'resultat',
          status: 'active',
          sousComptes: [
            { code: '131', libelle: 'Bénéfice net', solde: 0 },
            { code: '139', libelle: 'Perte nette', solde: 0 }
          ]
        },
        {
          code: '14',
          libelle: 'SUBVENTIONS D\'INVESTISSEMENT',
          solde: 0,
          type: 'subvention',
          status: 'active'
        },
        {
          code: '15',
          libelle: 'PROVISIONS RÉGLEMENTÉES',
          solde: 0,
          type: 'provision',
          status: 'active'
        },
        {
          code: '16',
          libelle: 'EMPRUNTS ET DETTES ASSIMILÉES',
          solde: 0,
          type: 'emprunt',
          status: 'active'
        },
        {
          code: '17',
          libelle: 'DETTES DE CRÉDIT-BAIL',
          solde: 0,
          type: 'dette',
          status: 'active'
        }
      ]
    },
    '2': {
      nom: 'Actif immobilisé',
      shortName: 'Immobilisations',
      color: '#1565C0',
      icon: Building2,
      description: 'Immobilisations corporelles et incorporelles',
      comptes: [
        {
          code: '20',
          libelle: 'CHARGES IMMOBILISÉES',
          solde: 0,
          type: 'charge',
          status: 'active',
          sousComptes: [
            { code: '201', libelle: 'Frais d\'établissement', solde: 0 },
            { code: '202', libelle: 'Charges à répartir', solde: 0 }
          ]
        },
        {
          code: '21',
          libelle: 'IMMOBILISATIONS INCORPORELLES',
          solde: 450000,
          type: 'incorporel',
          status: 'active',
          sousComptes: [
            { code: '211', libelle: 'Frais de recherche et développement', solde: 150000 },
            { code: '212', libelle: 'Brevets, licences, concessions', solde: 100000 },
            { code: '213', libelle: 'Logiciels', solde: 200000 },
            { code: '214', libelle: 'Marques', solde: 0 }
          ]
        },
        {
          code: '22',
          libelle: 'TERRAINS',
          solde: 1200000,
          type: 'terrain',
          status: 'active',
          sousComptes: [
            { code: '221', libelle: 'Terrains agricoles', solde: 400000 },
            { code: '222', libelle: 'Terrains nus', solde: 800000 }
          ]
        },
        {
          code: '23',
          libelle: 'BÂTIMENTS',
          solde: 2100000,
          type: 'batiment',
          status: 'active',
          sousComptes: [
            { code: '231', libelle: 'Bâtiments industriels', solde: 1500000 },
            { code: '232', libelle: 'Bâtiments administratifs et commerciaux', solde: 600000 }
          ]
        },
        {
          code: '24',
          libelle: 'MATÉRIEL',
          solde: 890000,
          type: 'materiel',
          status: 'active',
          sousComptes: [
            { code: '241', libelle: 'Matériel et outillage industriel', solde: 500000 },
            { code: '244', libelle: 'Matériel de transport', solde: 390000 }
          ]
        }
      ]
    },
    '3': {
      nom: 'Comptes de stocks',
      shortName: 'Stocks',
      color: '#E65100',
      icon: Package,
      description: 'Stocks et en-cours',
      comptes: [
        {
          code: '31',
          libelle: 'MARCHANDISES',
          solde: 234000,
          type: 'stock',
          status: 'active',
          sousComptes: [
            { code: '311', libelle: 'Marchandises A', solde: 134000 },
            { code: '312', libelle: 'Marchandises B', solde: 100000 }
          ]
        },
        {
          code: '32',
          libelle: 'MATIÈRES PREMIÈRES ET FOURNITURES LIÉES',
          solde: 156000,
          type: 'matiere',
          status: 'active'
        },
        {
          code: '33',
          libelle: 'AUTRES APPROVISIONNEMENTS',
          solde: 89000,
          type: 'appro',
          status: 'active'
        },
        {
          code: '34',
          libelle: 'PRODUITS EN COURS',
          solde: 0,
          type: 'encours',
          status: 'active'
        },
        {
          code: '35',
          libelle: 'SERVICES EN COURS',
          solde: 0,
          type: 'service',
          status: 'active'
        },
        {
          code: '36',
          libelle: 'PRODUITS FINIS',
          solde: 0,
          type: 'fini',
          status: 'active'
        }
      ]
    },
    '4': {
      nom: 'Comptes de tiers',
      shortName: 'Tiers',
      color: '#6A1B9A',
      icon: Users,
      description: 'Clients, fournisseurs et autres tiers',
      comptes: [
        {
          code: '40',
          libelle: 'FOURNISSEURS ET COMPTES RATTACHÉS',
          solde: -450000,
          type: 'fournisseur',
          status: 'active',
          sousComptes: [
            { code: '401', libelle: 'Fournisseurs, dettes en compte', solde: -400000 },
            { code: '402', libelle: 'Fournisseurs, effets à payer', solde: -50000 }
          ]
        },
        {
          code: '41',
          libelle: 'CLIENTS ET COMPTES RATTACHÉS',
          solde: 680000,
          type: 'client',
          status: 'active',
          sousComptes: [
            { code: '411', libelle: 'Clients', solde: 600000 },
            { code: '412', libelle: 'Clients, effets à recevoir', solde: 80000 }
          ]
        },
        {
          code: '42',
          libelle: 'PERSONNEL',
          solde: -125000,
          type: 'personnel',
          status: 'active'
        },
        {
          code: '43',
          libelle: 'ORGANISMES SOCIAUX',
          solde: -67000,
          type: 'social',
          status: 'active'
        },
        {
          code: '44',
          libelle: 'ÉTAT ET COLLECTIVITÉS PUBLIQUES',
          solde: 0,
          type: 'etat',
          status: 'active'
        }
      ]
    },
    '5': {
      nom: 'Comptes de trésorerie',
      shortName: 'Trésorerie',
      color: '#00796B',
      icon: DollarSign,
      description: 'Comptes financiers et trésorerie',
      comptes: [
        {
          code: '50',
          libelle: 'TITRES DE PLACEMENT',
          solde: 0,
          type: 'titre',
          status: 'active'
        },
        {
          code: '52',
          libelle: 'BANQUES',
          solde: 890000,
          type: 'banque',
          status: 'active',
          sousComptes: [
            { code: '521', libelle: 'Banques locales', solde: 890000 }
          ]
        },
        {
          code: '53',
          libelle: 'ÉTABLISSEMENTS FINANCIERS ET ASSIMILÉS',
          solde: 45000,
          type: 'postal',
          status: 'active'
        },
        {
          code: '57',
          libelle: 'CAISSE',
          solde: 75000,
          type: 'caisse',
          status: 'active',
          sousComptes: [
            { code: '571', libelle: 'Caisse siège social', solde: 75000 }
          ]
        }
      ]
    },
    '6': {
      nom: 'Comptes de charges',
      shortName: 'Charges',
      color: '#D32F2F',
      icon: TrendingUp,
      description: 'Charges des activités ordinaires',
      comptes: [
        {
          code: '60',
          libelle: 'ACHATS ET VARIATIONS DE STOCKS',
          solde: 780000,
          type: 'achat',
          status: 'active',
          sousComptes: [
            { code: '601', libelle: 'Achats de marchandises', solde: 780000 }
          ]
        },
        {
          code: '61',
          libelle: 'TRANSPORTS',
          solde: 125000,
          type: 'transport',
          status: 'active'
        },
        {
          code: '62',
          libelle: 'SERVICES EXTÉRIEURS A',
          solde: 89000,
          type: 'service',
          status: 'active'
        },
        {
          code: '63',
          libelle: 'SERVICES EXTÉRIEURS B',
          solde: 0,
          type: 'service',
          status: 'active'
        },
        {
          code: '64',
          libelle: 'IMPÔTS ET TAXES',
          solde: 0,
          type: 'impot',
          status: 'active'
        },
        {
          code: '65',
          libelle: 'AUTRES CHARGES',
          solde: 0,
          type: 'autre',
          status: 'active'
        },
        {
          code: '66',
          libelle: 'CHARGES DE PERSONNEL',
          solde: 0,
          type: 'personnel',
          status: 'active'
        },
        {
          code: '67',
          libelle: 'FRAIS FINANCIERS ET CHARGES ASSIMILÉES',
          solde: 0,
          type: 'financier',
          status: 'active'
        },
        {
          code: '68',
          libelle: 'DOTATIONS AUX AMORTISSEMENTS',
          solde: 0,
          type: 'amortissement',
          status: 'active'
        },
        {
          code: '69',
          libelle: 'DOTATIONS AUX PROVISIONS',
          solde: 0,
          type: 'provision',
          status: 'active'
        }
      ]
    },
    '7': {
      nom: 'Comptes de produits',
      shortName: 'Produits',
      color: '#388E3C',
      icon: TrendingUp,
      description: 'Produits des activités ordinaires',
      comptes: [
        {
          code: '70',
          libelle: 'VENTES',
          solde: 2450000,
          type: 'vente',
          status: 'active',
          sousComptes: [
            { code: '701', libelle: 'Ventes de marchandises', solde: 1250000 },
            { code: '702', libelle: 'Ventes de produits finis', solde: 1200000 }
          ]
        },
        {
          code: '71',
          libelle: 'SUBVENTIONS D\'EXPLOITATION',
          solde: 0,
          type: 'subvention',
          status: 'active'
        },
        {
          code: '72',
          libelle: 'PRODUCTION IMMOBILISÉE',
          solde: 890000,
          type: 'production',
          status: 'active'
        },
        {
          code: '73',
          libelle: 'VARIATIONS DES STOCKS',
          solde: 0,
          type: 'variation',
          status: 'active'
        },
        {
          code: '75',
          libelle: 'AUTRES PRODUITS',
          solde: 310000,
          type: 'autre',
          status: 'active'
        },
        {
          code: '77',
          libelle: 'REVENUS FINANCIERS ET PRODUITS ASSIMILÉS',
          solde: 0,
          type: 'financier',
          status: 'active'
        },
        {
          code: '78',
          libelle: 'TRANSFERTS DE CHARGES',
          solde: 0,
          type: 'transfert',
          status: 'active'
        },
        {
          code: '79',
          libelle: 'REPRISES DE PROVISIONS',
          solde: 0,
          type: 'reprise',
          status: 'active'
        }
      ]
    },
    '8': {
      nom: 'Comptes des autres charges et produits',
      shortName: 'Autres C/P',
      color: '#5D4037',
      icon: FileText,
      description: 'Charges et produits hors activités ordinaires',
      comptes: [
        {
          code: '81',
          libelle: 'VALEURS COMPTABLES DES CESSIONS D\'IMMOBILISATIONS',
          solde: 0,
          type: 'cession',
          status: 'active'
        },
        {
          code: '82',
          libelle: 'PRODUITS DES CESSIONS D\'IMMOBILISATIONS',
          solde: 0,
          type: 'produit_cession',
          status: 'active'
        },
        {
          code: '83',
          libelle: 'CHARGES HORS ACTIVITÉS ORDINAIRES',
          solde: 0,
          type: 'charge_hao',
          status: 'active'
        },
        {
          code: '84',
          libelle: 'PRODUITS HORS ACTIVITÉS ORDINAIRES',
          solde: 0,
          type: 'produit_hao',
          status: 'active'
        },
        {
          code: '85',
          libelle: 'DOTATIONS HORS ACTIVITÉS ORDINAIRES',
          solde: 0,
          type: 'dotation_hao',
          status: 'active'
        },
        {
          code: '86',
          libelle: 'REPRISES HORS ACTIVITÉS ORDINAIRES',
          solde: 0,
          type: 'reprise_hao',
          status: 'active'
        },
        {
          code: '87',
          libelle: 'PARTICIPATION DES TRAVAILLEURS',
          solde: 0,
          type: 'participation',
          status: 'active'
        },
        {
          code: '89',
          libelle: 'IMPÔTS SUR LE RÉSULTAT',
          solde: 0,
          type: 'impot_resultat',
          status: 'active'
        }
      ]
    },
    '9': {
      nom: 'Comptes de la comptabilité analytique',
      shortName: 'Analytique',
      color: '#455A64',
      icon: Calculator,
      description: 'Comptes analytiques et de gestion',
      comptes: [
        {
          code: '90',
          libelle: 'COMPTES RÉFLÉCHIS',
          solde: 0,
          type: 'analytique',
          status: 'active'
        },
        {
          code: '91',
          libelle: 'COMPTES DE RECLASSEMENT',
          solde: 0,
          type: 'reclassement',
          status: 'active'
        },
        {
          code: '92',
          libelle: 'COMPTES DE COÛTS',
          solde: 0,
          type: 'cout',
          status: 'active'
        },
        {
          code: '93',
          libelle: 'COMPTES DE STOCKS',
          solde: 0,
          type: 'stock_analytique',
          status: 'active'
        },
        {
          code: '94',
          libelle: 'COMPTES D\'ÉCARTS SUR COÛTS PRÉÉTABLIS',
          solde: 0,
          type: 'ecart',
          status: 'active'
        },
        {
          code: '95',
          libelle: 'COMPTES DE COÛTS DE REVIENT',
          solde: 0,
          type: 'revient',
          status: 'active'
        },
        {
          code: '96',
          libelle: 'COMPTES DE PRESTATIONS RÉCIPROQUES',
          solde: 0,
          type: 'prestation',
          status: 'active'
        },
        {
          code: '97',
          libelle: 'COMPTES D\'ÉCARTS SUR RÉSULTATS',
          solde: 0,
          type: 'ecart_resultat',
          status: 'active'
        },
        {
          code: '98',
          libelle: 'COMPTES DE RÉSULTATS',
          solde: 0,
          type: 'resultat_analytique',
          status: 'active'
        }
      ]
    }
  };

  const fetchData = useCallback(async (params: any) => {
    const currentClass = planComptable[selectedClasse as keyof typeof planComptable];
    if (!currentClass) return { data: [], total: 0, page: 1, pageSize: 10 };

    const allComptes = currentClass.comptes.map(c => ({
      ...c,
      id: c.code,
      classe: selectedClasse
    }));

      // Filtrer par recherche
      let filteredData = allComptes;
      if (params.search) {
        filteredData = allComptes.filter(compte =>
          compte.code.includes(params.search!) ||
          compte.libelle.toLowerCase().includes(params.search!.toLowerCase())
        );
      }

      // Tri
      if (params.sortBy) {
        filteredData.sort((a, b) => {
          const aValue = a[params.sortBy as keyof Compte];
          const bValue = b[params.sortBy as keyof Compte];
          const order = params.sortOrder === 'asc' ? 1 : -1;

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue) * order;
          }
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return (aValue - bValue) * order;
          }
          return 0;
        });
      }

      // Pagination
      const start = ((params.page || 1) - 1) * (params.pageSize || 10);
      const end = start + (params.pageSize || 10);
      const paginatedData = filteredData.slice(start, end);

    return {
      data: paginatedData,
      total: filteredData.length,
      page: params.page || 1,
      pageSize: params.pageSize || 10
    };
  }, [selectedClasse]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: accountingService.createJournal, // Temporaire
    onSuccess: () => {
      toast.success('Compte SYSCOHADA créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['comptes-syscohada'] });
      setShowNewAccountModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création du compte');
    },
  });

  const {
    data: comptes,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    search,
    filters,
    setPage,
    setPageSize,
    setSort,
    setSearch,
    setFilters,
    refresh,
    totalPages
  } = useDataTable<Compte>({
    fetchData,
    initialPageSize: 20,
    initialSortBy: 'code',
    initialSortOrder: 'asc'
  });

  const resetForm = () => {
    setFormData({
      code: '',
      libelle: '',
      type: 'general',
      classe: selectedClasse,
      description: '',
      actif: true,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
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

      // Validate with Zod
      const validatedData = createJournalSchema.parse(formData);

      // Submit to backend
      await createMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map Zod errors to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      } else {
        toast.error('Erreur lors de la création du compte');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(Math.abs(num));
  };

  const toggleAccountExpansion = (code: string) => {
    setExpandedAccounts(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-success-light)] text-[var(--color-success)]">
          Actif
        </span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]">
          Inactif
        </span>;
      default:
        return null;
    }
  };

  const currentClass = planComptable[selectedClasse];

  // Colonnes pour le DataTable
  const columns = useMemo(() => [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (compte: Compte) => (
        <div className="flex items-center gap-2">
          {compte.sousComptes && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleAccountExpansion(compte.code);
              }}
              className="p-0.5 hover:bg-[var(--color-surface-hover)] rounded transition-colors"
            >
              <ChevronRight
                className={`w-4 h-4 text-[var(--color-text-tertiary)] transition-transform ${
                  expandedAccounts.includes(compte.code) ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}
          <span
            className="font-mono font-semibold text-sm"
            style={{ color: currentClass.color }}
          >
            {compte.code}
          </span>
        </div>
      )
    },
    {
      key: 'libelle',
      label: t('accounting.label'),
      sortable: true
    },
    {
      key: 'solde',
      label: t('accounting.balance'),
      sortable: true,
      render: (compte: Compte) => (
        <span className={`text-sm font-medium ${
          compte.solde >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
        }`}>
          {formatNumber(compte.solde)}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Statut',
      render: (compte: Compte) => getStatusBadge(compte.status)
    }
  ], [currentClass.color, expandedAccounts]);

  return (
    <div className="flex h-full bg-[var(--color-background)]">
      {/* Sidebar des Classes */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold text-[var(--color-text-primary)] ${!sidebarOpen && 'hidden'}`}>
              Classes SYSCOHADA
            </h2>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              aria-label={sidebarOpen ? 'Réduire' : 'Ouvrir'}
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {sidebarOpen && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
              Plan Comptable OHADA Révisé
            </p>
          )}
        </div>

        {/* Classes Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          {Object.entries(planComptable).map(([classe, data]) => {
            const Icon = data.icon;
            const isSelected = selectedClasse === classe;

            return (
              <button
                key={classe}
                onClick={() => setSelectedClasse(classe)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all relative group ${
                  isSelected
                    ? 'bg-[var(--color-primary-light)] border-l-4 border-[var(--color-primary)]'
                    : 'hover:bg-[var(--color-surface-hover)]'
                }`}
                title={!sidebarOpen ? `Classe ${classe}: ${data.nom}` : undefined}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-white' : 'bg-[var(--color-background)]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? data.color + '20' : undefined,
                    borderColor: data.color,
                    borderWidth: '2px',
                    borderStyle: 'solid'
                  }}
                >
                  <span className="font-bold text-lg" style={{ color: data.color }}>
                    {classe}
                  </span>
                </div>

                {sidebarOpen && (
                  <>
                    <div className="flex-1 text-left">
                      <p className={`font-medium text-sm ${
                        isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-primary)]'
                      }`}>
                        Classe {classe}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {data.shortName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]'
                      }`}>
                        {data.comptes.length}
                      </span>
                      {isSelected && (
                        <ChevronRight className="w-4 h-4 text-[var(--color-primary)]" />
                      )}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-[var(--color-border)]">
            <div className="space-y-2">
              <button className="w-full px-3 py-2 bg-[var(--color-background)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter le plan
              </button>
              <button className="w-full px-3 py-2 bg-[var(--color-background)] rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuration
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                {currentClass.nom}
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                {currentClass.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exporter
              </button>
              <button className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                onClick={() => setShowNewAccountModal(true)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouveau Compte
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)] w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un compte dans cette classe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>

        {/* Accounts DataTable */}
        <div className="flex-1 overflow-auto p-6">
          <DataTable
            data={comptes}
            columns={columns}
            loading={loading}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSort={setSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            selectable
            selectedRows={selectedComptes}
            onSelectRow={(compte: Compte) => {
              if (selectedComptes.includes(compte.code)) {
                setSelectedComptes(selectedComptes.filter(c => c !== compte.code));
              } else {
                setSelectedComptes([...selectedComptes, compte.code]);
              }
            }}
            onSelectAll={(selected: boolean) => {
              if (selected) {
                setSelectedComptes(comptes.map(c => c.code));
              } else {
                setSelectedComptes([]);
              }
            }}
            actions={[
              {
                icon: Eye,
                label: 'Voir détails',
                onClick: (compte: Compte) => console.log('View', compte)
              },
              {
                icon: Edit,
                label: t('common.edit'),
                onClick: (compte: Compte) => console.log('Edit', compte)
              },
              {
                icon: Copy,
                label: 'Dupliquer',
                onClick: (compte: Compte) => console.log('Copy', compte)
              }
            ]}
            emptyMessage="Aucun compte trouvé"
            expandedRows={expandedAccounts}
            onToggleExpand={toggleAccountExpansion}
            renderExpandedRow={(compte: Compte) => {
              if (!compte.sousComptes) return null;
              return (
                <div className="pl-12 py-2 bg-[var(--color-surface)]">
                  {compte.sousComptes.map((sousCompte) => (
                    <div key={sousCompte.code} className="flex items-center justify-between py-1 px-4 hover:bg-[var(--color-surface-hover)]">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-[var(--color-text-secondary)]">
                          {sousCompte.code}
                        </span>
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {sousCompte.libelle}
                        </span>
                      </div>
                      <span className={`text-sm ${
                        sousCompte.solde >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                      }`}>
                        {formatNumber(sousCompte.solde)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </div>

        {/* Old table code removed
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            <table className="w-full">
            </table>
          </div>
        </div>
        -->

        {/* Footer Actions */}
        {selectedComptes.length > 0 && (
          <div className="bg-[var(--color-surface)] border-t border-[var(--color-border)] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[var(--color-info)]" />
                <span className="text-[var(--color-text-primary)]">
                  {selectedComptes.length} compte{selectedComptes.length > 1 ? 's' : ''} sélectionné{selectedComptes.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedComptes([])}
                  className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Annuler
                </button>
                <button className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)] transition-colors flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Account Modal */}
      {showNewAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Nouveau Compte SYSCOHADA</h2>
              </div>
              <button
                onClick={() => {
                  setShowNewAccountModal(false);
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Nouveau Compte</h4>
                      <p className="text-sm text-blue-800">Créez un nouveau compte dans la classe {selectedClasse} - {currentClass.shortName}. Le code doit respecter la nomenclature SYSCOHADA.</p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations du Compte</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Code du compte *</label>
                      <Input
                        placeholder={`${selectedClasse}X...`}
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.code && (
                        <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                      )}
                      <p className="text-xs text-gray-700 mt-1">Doit commencer par {selectedClasse} (classe sélectionnée)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Libellé du compte *</label>
                      <Input
                        placeholder="Libellé du compte..."
                        value={formData.libelle}
                        onChange={(e) => handleInputChange('libelle', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.libelle && (
                        <p className="mt-1 text-sm text-red-600">{errors.libelle}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Type and Category */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Classification</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type de compte *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="general">Général</option>
                        <option value="detail">Compte de détail</option>
                        <option value="collectif">Compte collectif</option>
                        <option value="auxiliaire">Compte auxiliaire</option>
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Classe *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.classe}
                        onChange={(e) => handleInputChange('classe', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="1">1 - Ressources durables</option>
                        <option value="2">2 - Actif immobilisé</option>
                        <option value="3">3 - Stocks</option>
                        <option value="4">4 - Tiers</option>
                        <option value="5">5 - Trésorerie</option>
                        <option value="6">6 - Charges</option>
                        <option value="7">7 - Produits</option>
                        <option value="8">8 - Autres C/P</option>
                      </select>
                      {errors.classe && (
                        <p className="mt-1 text-sm text-red-600">{errors.classe}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SYSCOHADA Specifics */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Spécificités SYSCOHADA</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nature économique</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Sélectionner la nature</option>
                        {selectedClasse === '1' && (
                          <>
                            <option value="capital">Capital</option>
                            <option value="reserve">Réserves</option>
                            <option value="resultat">Résultat</option>
                            <option value="emprunt">Emprunts</option>
                          </>
                        )}
                        {selectedClasse === '2' && (
                          <>
                            <option value="incorporel">Immobilisation incorporelle</option>
                            <option value="terrain">Terrain</option>
                            <option value="batiment">Bâtiment</option>
                            <option value="materiel">Matériel</option>
                          </>
                        )}
                        {selectedClasse === '3' && (
                          <>
                            <option value="stock">Stock de marchandises</option>
                            <option value="matiere">Matières premières</option>
                            <option value="encours">Produits en cours</option>
                            <option value="fini">Produits finis</option>
                          </>
                        )}
                        {selectedClasse === '4' && (
                          <>
                            <option value="client">Client</option>
                            <option value="fournisseur">Fournisseur</option>
                            <option value="personnel">Personnel</option>
                            <option value="etat">État</option>
                          </>
                        )}
                        {selectedClasse === '5' && (
                          <>
                            <option value="banque">Banque</option>
                            <option value="caisse">Caisse</option>
                            <option value="titre">Titres de placement</option>
                          </>
                        )}
                        {selectedClasse === '6' && (
                          <>
                            <option value="achat">Achats</option>
                            <option value="service">Services extérieurs</option>
                            <option value="personnel">Charges de personnel</option>
                            <option value="financier">Charges financières</option>
                          </>
                        )}
                        {selectedClasse === '7' && (
                          <>
                            <option value="vente">Ventes</option>
                            <option value="production">Production</option>
                            <option value="financier">Produits financiers</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sens normal</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="debit">Débiteur</option>
                        <option value="credit">Créditeur</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Additional Parameters */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Paramètres Supplémentaires</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="lettrage"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="lettrage" className="text-sm text-gray-700">
                        Compte lettrable (pour rapprochements)
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="analytique"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="analytique" className="text-sm text-gray-700">
                        Ventilation analytique obligatoire
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="tiers"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="tiers" className="text-sm text-gray-700">
                        Gestion des tiers (codes auxiliaires)
                      </label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="devise"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="devise" className="text-sm text-gray-700">
                        Compte multi-devises
                      </label>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Notes et Commentaires</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Description détaillée du compte et de son utilisation..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="actif"
                        checked={formData.actif}
                        onChange={(e) => handleInputChange('actif', e.target.checked)}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="actif" className="text-sm text-gray-700">
                        Compte actif
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewAccountModal(false);
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
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Créer le compte</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanSYSCOHADAPage;