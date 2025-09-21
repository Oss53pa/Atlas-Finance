import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit, Download, Printer, AlertTriangle, CheckCircle, Clock,
  User, Building, MapPin, Phone, Mail, Calendar, Euro, FileText,
  BarChart3, PieChart, TrendingUp, TrendingDown, Target, Award, Shield,
  CreditCard, Users, Activity, RefreshCw, Eye, Plus, Filter,
  Search, ChevronRight, ChevronDown, AlertCircle, Info, Settings,
  Upload, Folder, File, Image, Paperclip, Link, Trash2,
  Package, Truck, ShieldCheck, FileCheck, XCircle, CheckSquare
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, AreaChart, Area,
  PieChart as RechartsPieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts';

interface FournisseurDetail {
  id: string;
  code: string;
  raisonSociale: string;
  nomCommercial?: string;
  formeJuridique: string;
  siret?: string;
  codeAPE?: string;
  numeroTVA?: string;
  capitalSocial?: number;
  dateCreation: string;
  dateDebutRelation: string;
  secteurActivite: string;
  effectif?: number;
  chiffreAffairesConnu?: number;
  groupe?: string;

  // Coordonnées
  adresseFacturation: {
    rue: string;
    ville: string;
    codePostal: string;
    pays: string;
  };
  adresseCorrespondance?: {
    rue: string;
    ville: string;
    codePostal: string;
    pays: string;
  };

  // Contacts
  contacts: {
    comptabilite: {
      nom: string;
      email: string;
      telephone: string;
    };
    commercial: {
      nom: string;
      fonction: string;
      email: string;
      telephone: string;
    };
  };

  // Paramètres comptables
  comptabilite: {
    compteCollectif: string;
    comptesAuxiliaires: string[];
    compteTVA: string;
    regimeTVA: 'NORMAL' | 'SIMPLIFIE' | 'FRANCHISE';
    tauxTVADefaut: number;
    tvaEncaissement: boolean;
    compteCharges: string;
    journalAchat: string;
    modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'TRAITE';
    conditionsPaiement: string;
    delaiPaiement: number;
    escompte?: number;
    penalitesRetard?: number;
    deviseFacturation: string;
  };

  // Données bancaires
  banque: {
    iban: string;
    bic: string;
    domiciliation: string;
    instructionsPaiement?: string;
  };

  // Classification
  classification: {
    categorie: 'STRATEGIQUE' | 'RECURRENT' | 'PONCTUEL' | 'CRITIQUE';
    typeDépense: 'PRODUCTION' | 'SERVICES' | 'INVESTISSEMENT' | 'FRAIS_GENERAUX';
    zoneGeographique: string;
    acheteurResponsable: string;
    notationInterne: 'A' | 'B' | 'C' | 'D';
    fournisseurReference: boolean;
    criticite: 'HAUTE' | 'MOYENNE' | 'FAIBLE';
  };

  // Données financières
  financier: {
    volumeAchatsAnnuel: number;
    encoursActuel: number;
    soldeFournisseur: number;
    dpo: number;
    limiteCredit: number;
    scoreRisque: number;
    montantFacturesAttente: number;
    montantLitiges: number;
  };

  // Analyses
  analyses: {
    performance: {
      respectDelais: number;
      qualiteProduits: number;
      conformiteCommandes: number;
      tauxServiceLevel: number;
      tauxDefaut: number;
    };
    achats: {
      evolutionVolume: number;
      partDansAchatsTotal: number;
      economiesRealisees: number;
      surCoutsIdentifies: number;
      tauxNegociation: number;
    };
  };

  // Conformité
  conformite: {
    certifications: Array<{
      type: string;
      numero: string;
      dateValidite: string;
      statut: 'VALIDE' | 'EXPIRE' | 'EN_COURS';
    }>;
    attestationsFiscales: boolean;
    attestationsSociales: boolean;
    assuranceRC: boolean;
    rgpdConforme: boolean;
    dernierAudit?: string;
    scoreConformite: number;
  };
}

interface MouvementComptable {
  id: string;
  dateComptable: string;
  datePiece: string;
  numeroPiece: string;
  numeroFacture?: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  lettrage?: string;
  type: 'FACTURE' | 'AVOIR' | 'REGLEMENT' | 'ACOMPTE' | 'RETENUE';
}

interface Echeance {
  id: string;
  numeroFacture: string;
  dateEcheance: string;
  montant: number;
  montantRestant: number;
  statut: 'EN_COURS' | 'ECHUE' | 'PAYEE' | 'LITIGE';
  retard?: number;
  escomptePossible?: boolean;
}

interface Commande {
  id: string;
  numero: string;
  date: string;
  montantHT: number;
  montantTTC: number;
  statut: 'BROUILLON' | 'CONFIRMEE' | 'RECUE' | 'FACTUREE';
  dateReceptionPrevue?: string;
  tauxRealisation: number;
}

const FournisseurDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { fournisseurId } = useParams();
  const [activeTab, setActiveTab] = useState('synthese');
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('12MOIS');
  const [expandedSections, setExpandedSections] = useState<string[]>(['infos-base']);

  // Mock Fournisseur Data
  const fournisseurDetail: FournisseurDetail = {
    id: '1',
    code: 'FRN001',
    raisonSociale: 'CAMTEL SA',
    nomCommercial: 'Camtel Telecom',
    formeJuridique: 'SA',
    siret: '98765432101234',
    codeAPE: '6110Z',
    numeroTVA: 'CM98765432101',
    capitalSocial: 5000000,
    dateCreation: '2010-03-15',
    dateDebutRelation: '2018-06-01',
    secteurActivite: 'Télécommunications',
    effectif: 1250,
    chiffreAffairesConnu: 85000000,
    groupe: 'Groupe CAMTEL International',

    adresseFacturation: {
      rue: '456 Boulevard de la Liberté',
      ville: 'Yaoundé',
      codePostal: '00237',
      pays: 'Cameroun'
    },

    contacts: {
      comptabilite: {
        nom: 'Marie NGONO',
        email: 'm.ngono@camtel.cm',
        telephone: '+237 693 456 789'
      },
      commercial: {
        nom: 'Paul ATANGANA',
        fonction: 'Directeur Commercial B2B',
        email: 'p.atangana@camtel.cm',
        telephone: '+237 677 890 123'
      }
    },

    comptabilite: {
      compteCollectif: '401000',
      comptesAuxiliaires: ['401001', '401002'],
      compteTVA: '445660',
      regimeTVA: 'NORMAL',
      tauxTVADefaut: 19.25,
      tvaEncaissement: false,
      compteCharges: '606100',
      journalAchat: 'ACH',
      modeReglement: 'VIREMENT',
      conditionsPaiement: '60 jours net',
      delaiPaiement: 60,
      escompte: 2,
      penalitesRetard: 3,
      deviseFacturation: 'XAF'
    },

    banque: {
      iban: 'CM21 1003 1000 0000 0012 3456 7890',
      bic: 'AFRICDCM',
      domiciliation: 'Afriland First Bank Cameroun',
      instructionsPaiement: 'Référencer le numéro de facture'
    },

    classification: {
      categorie: 'STRATEGIQUE',
      typeDépense: 'SERVICES',
      zoneGeographique: 'Afrique Centrale',
      acheteurResponsable: 'Jean MBARGA',
      notationInterne: 'A',
      fournisseurReference: true,
      criticite: 'HAUTE'
    },

    financier: {
      volumeAchatsAnnuel: 850000,
      encoursActuel: 125000,
      soldeFournisseur: -125000,
      dpo: 45,
      limiteCredit: 500000,
      scoreRisque: 92,
      montantFacturesAttente: 85000,
      montantLitiges: 0
    },

    analyses: {
      performance: {
        respectDelais: 95.5,
        qualiteProduits: 92.0,
        conformiteCommandes: 98.2,
        tauxServiceLevel: 94.0,
        tauxDefaut: 0.8
      },
      achats: {
        evolutionVolume: 12.5,
        partDansAchatsTotal: 8.5,
        economiesRealisees: 45000,
        surCoutsIdentifies: 5000,
        tauxNegociation: 5.2
      }
    },

    conformite: {
      certifications: [
        {
          type: 'ISO 9001:2015',
          numero: 'QMS-2024-1234',
          dateValidite: '2025-06-30',
          statut: 'VALIDE'
        },
        {
          type: 'ISO 27001',
          numero: 'ISMS-2024-5678',
          dateValidite: '2025-03-15',
          statut: 'VALIDE'
        }
      ],
      attestationsFiscales: true,
      attestationsSociales: true,
      assuranceRC: true,
      rgpdConforme: true,
      dernierAudit: '2024-06-15',
      scoreConformite: 95
    }
  };

  // Mock Mouvements Comptables
  const mouvements: MouvementComptable[] = [
    {
      id: '1',
      dateComptable: '2024-09-15',
      datePiece: '2024-09-15',
      numeroPiece: 'ACH-2024-0456',
      numeroFacture: 'FCT-CM-2024-0789',
      libelle: 'Services télécom - Septembre 2024',
      debit: 0,
      credit: 85000,
      solde: -125000,
      type: 'FACTURE'
    },
    {
      id: '2',
      dateComptable: '2024-09-10',
      datePiece: '2024-09-10',
      numeroPiece: 'REG-2024-0234',
      libelle: 'Règlement facture FCT-CM-2024-0750',
      debit: 120000,
      credit: 0,
      solde: -40000,
      lettrage: 'B001',
      type: 'REGLEMENT'
    }
  ];

  // Mock Échéances
  const echeances: Echeance[] = [
    {
      id: '1',
      numeroFacture: 'FCT-CM-2024-0789',
      dateEcheance: '2024-11-15',
      montant: 85000,
      montantRestant: 85000,
      statut: 'EN_COURS',
      escomptePossible: true
    },
    {
      id: '2',
      numeroFacture: 'FCT-CM-2024-0765',
      dateEcheance: '2024-10-30',
      montant: 40000,
      montantRestant: 40000,
      statut: 'EN_COURS'
    }
  ];

  // Mock Commandes
  const commandes: Commande[] = [
    {
      id: '1',
      numero: 'CMD-2024-0234',
      date: '2024-09-01',
      montantHT: 85000,
      montantTTC: 101362.50,
      statut: 'FACTUREE',
      dateReceptionPrevue: '2024-09-10',
      tauxRealisation: 100
    },
    {
      id: '2',
      numero: 'CMD-2024-0225',
      date: '2024-08-15',
      montantHT: 120000,
      montantTTC: 143100,
      statut: 'RECUE',
      dateReceptionPrevue: '2024-08-25',
      tauxRealisation: 100
    }
  ];

  // Mock Analytics Data
  const evolutionAchats = [
    { mois: 'Jan', achats: 65000, budget: 70000 },
    { mois: 'Fév', achats: 72000, budget: 70000 },
    { mois: 'Mar', achats: 68000, budget: 70000 },
    { mois: 'Avr', achats: 75000, budget: 75000 },
    { mois: 'Mai', achats: 82000, budget: 75000 },
    { mois: 'Juin', achats: 78000, budget: 75000 },
    { mois: 'Juil', achats: 70000, budget: 70000 },
    { mois: 'Août', achats: 88000, budget: 80000 },
    { mois: 'Sept', achats: 85000, budget: 80000 }
  ];

  const repartitionDepenses = [
    { categorie: 'Services Télécom', montant: 450000, pourcentage: 52.9 },
    { categorie: 'Connectivité Internet', montant: 280000, pourcentage: 32.9 },
    { categorie: 'Infrastructure Cloud', montant: 120000, pourcentage: 14.2 }
  ];

  const tabs = [
    { id: 'synthese', label: 'Synthèse', icon: BarChart3 },
    { id: 'comptable', label: 'Comptable', icon: FileText },
    { id: 'financier', label: 'Financier', icon: Euro },
    { id: 'achats', label: 'Achats', icon: Package },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'conformite', label: 'Conformité', icon: ShieldCheck }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'EN_COURS': return 'bg-blue-100 text-blue-800';
      case 'ECHUE': return 'bg-red-100 text-red-800';
      case 'PAYEE': return 'bg-green-100 text-green-800';
      case 'LITIGE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const COLORS = ['#6A8A82', '#B87333', '#5A6B65', '#9B6B2A'];

  // Render Synthese Tab
  const renderSyntheseTab = () => (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Volume Achats</p>
              <p className="text-2xl font-bold text-[#191919]">{formatCurrency(fournisseurDetail.financier.volumeAchatsAnnuel)}</p>
              <p className="text-xs text-green-600">+{fournisseurDetail.analyses.achats.evolutionVolume}% vs N-1</p>
            </div>
            <div className="w-10 h-10 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#6A8A82]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Encours Fournisseur</p>
              <p className="text-2xl font-bold text-[#191919]">{formatCurrency(fournisseurDetail.financier.encoursActuel)}</p>
              <p className="text-xs text-orange-600">DPO: {fournisseurDetail.financier.dpo} jours</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Score Performance</p>
              <p className="text-2xl font-bold text-[#191919]">{fournisseurDetail.analyses.performance.tauxServiceLevel}%</p>
              <p className="text-xs text-[#B87333]">Qualité: {fournisseurDetail.analyses.performance.qualiteProduits}%</p>
            </div>
            <div className="w-10 h-10 bg-[#B87333]/10 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-[#B87333]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Conformité</p>
              <p className="text-2xl font-bold text-[#191919]">{fournisseurDetail.conformite.scoreConformite}%</p>
              <p className="text-xs text-green-600">Toutes attestations OK</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution Achats */}
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution Achats vs Budget</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={evolutionAchats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Area type="monotone" dataKey="achats" stackId="1" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.6} name="Achats Réels" />
              <Line type="monotone" dataKey="budget" stroke="#B87333" strokeWidth={2} strokeDasharray="5 5" name="Budget" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des Dépenses */}
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition des Dépenses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                dataKey="montant"
                data={repartitionDepenses}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label={({ categorie, pourcentage }) => `${categorie}: ${pourcentage}%`}
              >
                {repartitionDepenses.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Informations Fournisseur */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="space-y-4">
          {/* Informations de Base */}
          <div className="border-b border-[#E8E8E8]">
            <button
              onClick={() => toggleSection('infos-base')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <h3 className="text-lg font-semibold text-[#191919]">Informations de Base</h3>
              {expandedSections.includes('infos-base') ?
                <ChevronDown className="w-5 h-5" /> :
                <ChevronRight className="w-5 h-5" />
              }
            </button>

            {expandedSections.includes('infos-base') && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-[#191919] mb-3">Identification</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#666666]">Raison sociale:</span> <span className="font-medium">{fournisseurDetail.raisonSociale}</span></div>
                      <div><span className="text-[#666666]">Nom commercial:</span> <span className="font-medium">{fournisseurDetail.nomCommercial}</span></div>
                      <div><span className="text-[#666666]">Forme juridique:</span> <span className="font-medium">{fournisseurDetail.formeJuridique}</span></div>
                      <div><span className="text-[#666666]">SIRET:</span> <span className="font-medium">{fournisseurDetail.siret}</span></div>
                      <div><span className="text-[#666666]">Code APE:</span> <span className="font-medium">{fournisseurDetail.codeAPE}</span></div>
                      <div><span className="text-[#666666]">N° TVA:</span> <span className="font-medium">{fournisseurDetail.numeroTVA}</span></div>
                      <div><span className="text-[#666666]">Groupe:</span> <span className="font-medium">{fournisseurDetail.groupe}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#191919] mb-3">Adresse</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#666666]">Rue:</span> <span className="font-medium">{fournisseurDetail.adresseFacturation.rue}</span></div>
                      <div><span className="text-[#666666]">Ville:</span> <span className="font-medium">{fournisseurDetail.adresseFacturation.ville}</span></div>
                      <div><span className="text-[#666666]">Code postal:</span> <span className="font-medium">{fournisseurDetail.adresseFacturation.codePostal}</span></div>
                      <div><span className="text-[#666666]">Pays:</span> <span className="font-medium">{fournisseurDetail.adresseFacturation.pays}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#191919] mb-3">Contacts</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#666666]">Contact comptable:</span> <span className="font-medium">{fournisseurDetail.contacts.comptabilite.nom}</span></div>
                      <div><span className="text-[#666666]">Email:</span> <span className="font-medium">{fournisseurDetail.contacts.comptabilite.email}</span></div>
                      <div><span className="text-[#666666]">Téléphone:</span> <span className="font-medium">{fournisseurDetail.contacts.comptabilite.telephone}</span></div>
                      <div className="mt-2">
                        <div><span className="text-[#666666]">Contact commercial:</span> <span className="font-medium">{fournisseurDetail.contacts.commercial.nom}</span></div>
                        <div><span className="text-[#666666]">Fonction:</span> <span className="font-medium">{fournisseurDetail.contacts.commercial.fonction}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Paramètres Comptables */}
          <div className="border-b border-[#E8E8E8]">
            <button
              onClick={() => toggleSection('params-comptables')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <h3 className="text-lg font-semibold text-[#191919]">Paramètres Comptables</h3>
              {expandedSections.includes('params-comptables') ?
                <ChevronDown className="w-5 h-5" /> :
                <ChevronRight className="w-5 h-5" />
              }
            </button>

            {expandedSections.includes('params-comptables') && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-[#191919] mb-3">Comptes</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#666666]">Compte collectif:</span> <span className="font-medium">{fournisseurDetail.comptabilite.compteCollectif}</span></div>
                      <div><span className="text-[#666666]">Comptes auxiliaires:</span> <span className="font-medium">{fournisseurDetail.comptabilite.comptesAuxiliaires.join(', ')}</span></div>
                      <div><span className="text-[#666666]">Compte charges:</span> <span className="font-medium">{fournisseurDetail.comptabilite.compteCharges}</span></div>
                      <div><span className="text-[#666666]">Journal d'achat:</span> <span className="font-medium">{fournisseurDetail.comptabilite.journalAchat}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#191919] mb-3">TVA</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#666666]">Régime TVA:</span> <span className="font-medium">{fournisseurDetail.comptabilite.regimeTVA}</span></div>
                      <div><span className="text-[#666666]">Taux défaut:</span> <span className="font-medium">{fournisseurDetail.comptabilite.tauxTVADefaut}%</span></div>
                      <div><span className="text-[#666666]">TVA encaissement:</span> <span className="font-medium">{fournisseurDetail.comptabilite.tvaEncaissement ? 'Oui' : 'Non'}</span></div>
                      <div><span className="text-[#666666]">Compte TVA:</span> <span className="font-medium">{fournisseurDetail.comptabilite.compteTVA}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#191919] mb-3">Paiement</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#666666]">Mode règlement:</span> <span className="font-medium">{fournisseurDetail.comptabilite.modeReglement}</span></div>
                      <div><span className="text-[#666666]">Conditions:</span> <span className="font-medium">{fournisseurDetail.comptabilite.conditionsPaiement}</span></div>
                      <div><span className="text-[#666666]">Délai:</span> <span className="font-medium">{fournisseurDetail.comptabilite.delaiPaiement} jours</span></div>
                      <div><span className="text-[#666666]">Escompte:</span> <span className="font-medium">{fournisseurDetail.comptabilite.escompte}%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Comptable Tab
  const renderComptableTab = () => (
    <div className="space-y-6">
      {/* Mouvements Comptables */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="p-4 border-b border-[#E8E8E8]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#191919]">Mouvements Comptables Fournisseur</h3>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-sm bg-[#6A8A82] text-white rounded hover:bg-[#6A8A82]/90">
                Exporter
              </button>
              <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                Lettrage
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Date</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Pièce</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">N° Facture</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Libellé</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Débit</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Crédit</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Solde</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Lettrage</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((mouvement) => (
                <tr key={mouvement.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                  <td className="p-3 text-sm">{new Date(mouvement.dateComptable).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-sm font-medium">{mouvement.numeroPiece}</td>
                  <td className="p-3 text-sm">{mouvement.numeroFacture || '-'}</td>
                  <td className="p-3 text-sm">{mouvement.libelle}</td>
                  <td className="p-3 text-sm text-right font-medium">{mouvement.debit > 0 ? formatCurrency(mouvement.debit) : '-'}</td>
                  <td className="p-3 text-sm text-right font-medium">{mouvement.credit > 0 ? formatCurrency(mouvement.credit) : '-'}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatCurrency(mouvement.solde)}</td>
                  <td className="p-3 text-center">
                    {mouvement.lettrage ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">{mouvement.lettrage}</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Non lettré</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Échéancier Fournisseur */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="p-4 border-b border-[#E8E8E8]">
          <h3 className="text-lg font-semibold text-[#191919]">Échéancier Fournisseur</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Facture</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Échéance</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Montant</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Restant</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Statut</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Escompte</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {echeances.map((echeance) => (
                <tr key={echeance.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                  <td className="p-3 text-sm font-medium">{echeance.numeroFacture}</td>
                  <td className="p-3 text-sm">{new Date(echeance.dateEcheance).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatCurrency(echeance.montant)}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatCurrency(echeance.montantRestant)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded ${getStatutColor(echeance.statut)}`}>
                      {echeance.statut}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {echeance.escomptePossible ? (
                      <span className="text-green-600 text-sm font-medium">2% disponible</span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                      Payer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Financier Tab
  const renderFinancierTab = () => (
    <div className="space-y-6">
      {/* Analyse des Dettes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Analyse des Dettes Fournisseur</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-[#666666]">Dette Totale</span>
              <span className="font-semibold text-[#191919]">{formatCurrency(fournisseurDetail.financier.encoursActuel)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-[#666666]">Factures en Attente</span>
              <span className="font-semibold text-[#191919]">{formatCurrency(fournisseurDetail.financier.montantFacturesAttente)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-[#666666]">Limite de Crédit</span>
              <span className="font-semibold text-[#191919]">{formatCurrency(fournisseurDetail.financier.limiteCredit)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-[#666666]">Utilisation Crédit</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#6A8A82] h-2 rounded-full"
                    style={{width: `${(fournisseurDetail.financier.encoursActuel / fournisseurDetail.financier.limiteCredit) * 100}%`}}
                  />
                </div>
                <span className="text-sm text-[#666666]">
                  {Math.round((fournisseurDetail.financier.encoursActuel / fournisseurDetail.financier.limiteCredit) * 100)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-[#666666]">DPO (Days Payable Outstanding)</span>
              <span className="font-semibold text-green-600">{fournisseurDetail.financier.dpo} jours</span>
            </div>
          </div>
        </div>

        {/* Analyse des Achats */}
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Performance Achats</h3>
          <div className="space-y-4">
            <div className="text-center">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{value: fournisseurDetail.financier.scoreRisque}]}>
                  <RadialBar dataKey="value" cornerRadius={10} fill="#6A8A82" />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-xl font-bold fill-[#191919]">
                    {fournisseurDetail.financier.scoreRisque}/100
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
              <p className="text-sm text-[#666666] mt-2">Score Fournisseur Global</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Évolution Volume</span>
                <span className="font-medium text-green-600">+{fournisseurDetail.analyses.achats.evolutionVolume}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Part dans Achats Totaux</span>
                <span className="font-medium text-[#191919]">{fournisseurDetail.analyses.achats.partDansAchatsTotal}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Économies Réalisées</span>
                <span className="font-medium text-green-600">{formatCurrency(fournisseurDetail.analyses.achats.economiesRealisees)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#666666]">Taux de Négociation</span>
                <span className="font-medium text-[#B87333]">{fournisseurDetail.analyses.achats.tauxNegociation}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Évolution DPO */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Évolution DPO et Délais de Paiement</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={[
            {mois: 'Jan', dpo: 42, objectif: 45},
            {mois: 'Fév', dpo: 45, objectif: 45},
            {mois: 'Mar', dpo: 48, objectif: 45},
            {mois: 'Avr', dpo: 43, objectif: 45},
            {mois: 'Mai', dpo: 46, objectif: 45},
            {mois: 'Juin', dpo: 44, objectif: 45},
            {mois: 'Juil', dpo: 47, objectif: 45},
            {mois: 'Août', dpo: 45, objectif: 45},
            {mois: 'Sept', dpo: 45, objectif: 45}
          ]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mois" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="dpo" stroke="#6A8A82" strokeWidth={2} name="DPO Réel" />
            <Line type="monotone" dataKey="objectif" stroke="#B87333" strokeDasharray="5 5" name="Objectif" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Render Achats Tab
  const renderAchatsTab = () => (
    <div className="space-y-6">
      {/* Historique des Commandes */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#191919]">Historique des Commandes</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-[#6A8A82] text-white rounded hover:bg-[#6A8A82]/90">
              Nouvelle Commande
            </button>
            <button className="px-3 py-1 text-sm border border-[#6A8A82] text-[#6A8A82] rounded hover:bg-[#6A8A82]/10">
              Voir Tout
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Date</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">N° Commande</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Montant HT</th>
                <th className="text-right p-3 text-sm font-medium text-[#666666]">Montant TTC</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Réception</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Réalisation</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Statut</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((commande) => (
                <tr key={commande.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                  <td className="p-3 text-sm">{new Date(commande.date).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-sm font-medium">{commande.numero}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatCurrency(commande.montantHT)}</td>
                  <td className="p-3 text-sm text-right font-medium">{formatCurrency(commande.montantTTC)}</td>
                  <td className="p-3 text-sm text-center">{commande.dateReceptionPrevue ? new Date(commande.dateReceptionPrevue).toLocaleDateString('fr-FR') : '-'}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${commande.tauxRealisation === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{width: `${commande.tauxRealisation}%`}}
                        />
                      </div>
                      <span className="text-xs">{commande.tauxRealisation}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded ${
                      commande.statut === 'FACTUREE' ? 'bg-green-100 text-green-800' :
                      commande.statut === 'RECUE' ? 'bg-blue-100 text-blue-800' :
                      commande.statut === 'CONFIRMEE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {commande.statut}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analyse des Services/Produits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Top Services/Produits Achetés</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              {service: 'Télécom', montant: 450000, commandes: 12},
              {service: 'Internet', montant: 280000, commandes: 12},
              {service: 'Cloud', montant: 120000, commandes: 6}
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" />
              <YAxis />
              <Tooltip formatter={(value, name) => name === 'montant' ? formatCurrency(value as number) : value} />
              <Legend />
              <Bar dataKey="montant" fill="#6A8A82" name="Montant (FCFA)" />
              <Bar dataKey="commandes" fill="#B87333" name="Nb Commandes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Performance Fournisseur</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#666666]">Respect Délais Livraison</span>
                <span className="font-medium">{fournisseurDetail.analyses.performance.respectDelais}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full"
                  style={{width: `${fournisseurDetail.analyses.performance.respectDelais}%`}}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#666666]">Qualité Produits/Services</span>
                <span className="font-medium">{fournisseurDetail.analyses.performance.qualiteProduits}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full"
                  style={{width: `${fournisseurDetail.analyses.performance.qualiteProduits}%`}}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#666666]">Conformité Commandes</span>
                <span className="font-medium">{fournisseurDetail.analyses.performance.conformiteCommandes}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-500 h-3 rounded-full"
                  style={{width: `${fournisseurDetail.analyses.performance.conformiteCommandes}%`}}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#666666]">Taux de Service Level</span>
                <span className="font-medium">{fournisseurDetail.analyses.performance.tauxServiceLevel}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-[#6A8A82] h-3 rounded-full"
                  style={{width: `${fournisseurDetail.analyses.performance.tauxServiceLevel}%`}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Documents Tab
  const renderDocumentsTab = () => (
    <div className="space-y-6">
      {/* Upload et Actions */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#191919]">Documents Fournisseur</h3>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-semibold">Ajouter Document</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 border border-[#6A8A82] text-[#6A8A82] rounded-lg hover:bg-[#6A8A82]/10">
              <Folder className="w-4 h-4" />
              <span className="text-sm font-semibold">Créer Dossier</span>
            </button>
          </div>
        </div>

        {/* Statistiques Documents */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">18</div>
            <div className="text-sm text-blue-600">Documents Total</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-700">5</div>
            <div className="text-sm text-green-600">Contrats</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">8</div>
            <div className="text-sm text-orange-600">Factures</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">5</div>
            <div className="text-sm text-purple-600">Attestations</div>
          </div>
        </div>
      </div>

      {/* Documents Récents */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Documents Récents</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-4 p-3 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-[#191919]">Contrat Cadre Services Télécom 2024.pdf</h4>
              <p className="text-sm text-[#666666]">Ajouté le 01/01/2024 par Jean Mbarga</p>
              <p className="text-xs text-[#666666]">Taille: 3.2 MB</p>
            </div>
            <div className="flex space-x-2">
              <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded">
                <Eye className="w-4 h-4" />
              </button>
              <button className="p-2 text-blue-600 hover:bg-blue-100 rounded">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-3 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-[#191919]">Attestation Fiscale 2024.pdf</h4>
              <p className="text-sm text-[#666666]">Ajouté le 15/09/2024 par Marie Ngono</p>
              <p className="text-xs text-[#666666]">Taille: 456 KB</p>
            </div>
            <div className="flex space-x-2">
              <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded">
                <Eye className="w-4 h-4" />
              </button>
              <button className="p-2 text-blue-600 hover:bg-blue-100 rounded">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-3 border border-[#E8E8E8] rounded-lg hover:bg-gray-50">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-[#191919]">Certificat ISO 9001_2024.pdf</h4>
              <p className="text-sm text-[#666666]">Ajouté le 10/06/2024 par Paul Atangana</p>
              <p className="text-xs text-[#666666]">Taille: 1.8 MB</p>
            </div>
            <div className="flex space-x-2">
              <button className="p-2 text-[#6A8A82] hover:bg-[#6A8A82]/10 rounded">
                <Eye className="w-4 h-4" />
              </button>
              <button className="p-2 text-blue-600 hover:bg-blue-100 rounded">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Conformité Tab
  const renderConformiteTab = () => (
    <div className="space-y-6">
      {/* Score de Conformité Global */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Score de Conformité Global</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{value: fournisseurDetail.conformite.scoreConformite}]}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#6A8A82" />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-[#191919]">
                  {fournisseurDetail.conformite.scoreConformite}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-sm text-[#666666] mt-2">Score Global</p>
          </div>

          <div className="col-span-2">
            <div className="grid grid-cols-2 gap-4 h-full content-center">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  fournisseurDetail.conformite.attestationsFiscales ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {fournisseurDetail.conformite.attestationsFiscales ?
                    <CheckCircle className="w-5 h-5 text-green-600" /> :
                    <XCircle className="w-5 h-5 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-[#191919]">Attestations Fiscales</p>
                  <p className={`text-xs ${fournisseurDetail.conformite.attestationsFiscales ? 'text-green-600' : 'text-red-600'}`}>
                    {fournisseurDetail.conformite.attestationsFiscales ? 'À jour' : 'Manquantes'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  fournisseurDetail.conformite.attestationsSociales ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {fournisseurDetail.conformite.attestationsSociales ?
                    <CheckCircle className="w-5 h-5 text-green-600" /> :
                    <XCircle className="w-5 h-5 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-[#191919]">Attestations Sociales</p>
                  <p className={`text-xs ${fournisseurDetail.conformite.attestationsSociales ? 'text-green-600' : 'text-red-600'}`}>
                    {fournisseurDetail.conformite.attestationsSociales ? 'À jour' : 'Manquantes'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  fournisseurDetail.conformite.assuranceRC ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {fournisseurDetail.conformite.assuranceRC ?
                    <Shield className="w-5 h-5 text-green-600" /> :
                    <XCircle className="w-5 h-5 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-[#191919]">Assurance RC</p>
                  <p className={`text-xs ${fournisseurDetail.conformite.assuranceRC ? 'text-green-600' : 'text-red-600'}`}>
                    {fournisseurDetail.conformite.assuranceRC ? 'Valide' : 'Expirée'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  fournisseurDetail.conformite.rgpdConforme ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {fournisseurDetail.conformite.rgpdConforme ?
                    <ShieldCheck className="w-5 h-5 text-green-600" /> :
                    <XCircle className="w-5 h-5 text-red-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-[#191919]">Conformité RGPD</p>
                  <p className={`text-xs ${fournisseurDetail.conformite.rgpdConforme ? 'text-green-600' : 'text-red-600'}`}>
                    {fournisseurDetail.conformite.rgpdConforme ? 'Conforme' : 'Non conforme'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Certifications</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Type</th>
                <th className="text-left p-3 text-sm font-medium text-[#666666]">Numéro</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Date Validité</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Statut</th>
                <th className="text-center p-3 text-sm font-medium text-[#666666]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fournisseurDetail.conformite.certifications.map((cert, index) => (
                <tr key={index} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-[#6A8A82]" />
                      <span className="text-sm font-medium">{cert.type}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{cert.numero}</td>
                  <td className="p-3 text-sm text-center">{new Date(cert.dateValidite).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded ${
                      cert.statut === 'VALIDE' ? 'bg-green-100 text-green-800' :
                      cert.statut === 'EXPIRE' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {cert.statut}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-green-600 hover:bg-green-100 rounded">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit et Évaluation */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Audit et Évaluation</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-[#666666]">Dernier Audit</span>
            <span className="font-medium text-[#191919]">
              {fournisseurDetail.conformite.dernierAudit ? new Date(fournisseurDetail.conformite.dernierAudit).toLocaleDateString('fr-FR') : 'Aucun'}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-[#666666]">Prochain Audit Prévu</span>
            <span className="font-medium text-orange-600">15/12/2024</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-[#666666]">Évaluation Performance</span>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <CheckSquare
                  key={star}
                  className={`w-4 h-4 ${star <= 4 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                />
              ))}
              <span className="text-sm font-medium">4/5</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-[#E8E8E8]">
          <h4 className="font-medium text-[#191919] mb-3">Points de Vigilance</h4>
          <div className="space-y-2">
            <div className="flex items-start space-x-2 p-2 bg-yellow-50 rounded">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Certificat ISO 27001 expire dans 45 jours</p>
                <p className="text-xs text-yellow-600">Renouvellement à prévoir avant le 15/03/2025</p>
              </div>
            </div>
            <div className="flex items-start space-x-2 p-2 bg-blue-50 rounded">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Mise à jour RGPD requise</p>
                <p className="text-xs text-blue-600">Nouvelle réglementation applicable au 01/01/2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/tiers/fournisseurs')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Liste Fournisseurs</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-[#6A8A82] flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">{fournisseurDetail.raisonSociale}</h1>
                <p className="text-sm text-[#666666]">Code: {fournisseurDetail.code} • {fournisseurDetail.secteurActivite}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${getScoreColor(fournisseurDetail.financier.scoreRisque)}`}>
              Score: {fournisseurDetail.financier.scoreRisque}/100
            </div>

            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            >
              <option value="1MOIS">1 mois</option>
              <option value="3MOIS">3 mois</option>
              <option value="6MOIS">6 mois</option>
              <option value="12MOIS">12 mois</option>
            </select>

            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Printer className="w-4 h-4" />
              <span className="text-sm font-semibold">Imprimer</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90 transition-colors">
              <Edit className="w-4 h-4" />
              <span className="text-sm font-semibold">Modifier</span>
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
                  ? 'bg-white text-[#6A8A82] shadow-sm'
                  : 'text-[#666666] hover:text-[#444444]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'synthese' && renderSyntheseTab()}
      {activeTab === 'comptable' && renderComptableTab()}
      {activeTab === 'financier' && renderFinancierTab()}
      {activeTab === 'achats' && renderAchatsTab()}
      {activeTab === 'documents' && renderDocumentsTab()}
      {activeTab === 'conformite' && renderConformiteTab()}
    </div>
  );
};

export default FournisseurDetailView;