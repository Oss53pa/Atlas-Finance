import React, { useState } from 'react';
import {
  Landmark, Upload, Download, CheckCircle, AlertCircle,
  Search, Filter, RefreshCw, FileText, TrendingUp,
  Calendar, DollarSign, AlertTriangle, Check, X,
  Eye, Edit, Trash2, Plus, ArrowRight, Clock,
  Bot, Zap, CreditCard, Receipt, Link, Smartphone,
  Wifi, ShoppingBag, Monitor, Banknote, QrCode, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/progress';

interface RapprochementItem {
  id: string;
  date: string;
  libelle: string;
  reference: string;
  montantBanque: number;
  montantCompta?: number;
  statut: 'rapproche' | 'en_attente' | 'ecart' | 'suggere';
  typeOperation: 'debit' | 'credit';
  moyenPaiement?: 'virement' | 'cb' | 'cheque' | 'mobile' | 'especes' | 'prelevement' | 'tpe';
  confidence?: number;
  commission?: number;
}

interface MoyenPaiement {
  id: string;
  type: 'cb' | 'mobile' | 'tpe' | 'virement' | 'cheque' | 'prelevement';
  nom: string;
  reference: string;
  montantJour: number;
  montantMois: number;
  nombreTransactions: number;
  tauxCommission?: number;
  statut: 'actif' | 'suspendu' | 'en_attente';
}

const RapprochementBancaire: React.FC = () => {
  const [selectedBank, setSelectedBank] = useState('001');
  const [selectedPeriod, setSelectedPeriod] = useState('2025-01');
  const [filterStatus, setFilterStatus] = useState('tous');
  const [autoRapprochement, setAutoRapprochement] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('banques');

  // Moyens de paiement électroniques
  const moyensPaiement: MoyenPaiement[] = [
    {
      id: 'cb-001',
      type: 'cb',
      nom: 'Carte VISA Business',
      reference: '****4567',
      montantJour: 125000,
      montantMois: 2850000,
      nombreTransactions: 342,
      tauxCommission: 1.5,
      statut: 'actif'
    },
    {
      id: 'cb-002',
      type: 'cb',
      nom: 'Carte MasterCard',
      reference: '****8901',
      montantJour: 95000,
      montantMois: 1980000,
      nombreTransactions: 267,
      tauxCommission: 1.8,
      statut: 'actif'
    },
    {
      id: 'mobile-001',
      type: 'mobile',
      nom: 'Orange Money Pro',
      reference: '+225 07 XX XX XX 89',
      montantJour: 450000,
      montantMois: 8950000,
      nombreTransactions: 1205,
      tauxCommission: 0.5,
      statut: 'actif'
    },
    {
      id: 'mobile-002',
      type: 'mobile',
      nom: 'MTN Mobile Money',
      reference: '+225 05 XX XX XX 12',
      montantJour: 320000,
      montantMois: 6780000,
      nombreTransactions: 987,
      tauxCommission: 0.5,
      statut: 'actif'
    },
    {
      id: 'mobile-003',
      type: 'mobile',
      nom: 'Wave Money',
      reference: '+225 01 XX XX XX 45',
      montantJour: 280000,
      montantMois: 5230000,
      nombreTransactions: 756,
      tauxCommission: 0,
      statut: 'actif'
    },
    {
      id: 'mobile-004',
      type: 'mobile',
      nom: 'Moov Money',
      reference: '+225 04 XX XX XX 78',
      montantJour: 180000,
      montantMois: 3450000,
      nombreTransactions: 543,
      tauxCommission: 0.7,
      statut: 'actif'
    },
    {
      id: 'tpe-001',
      type: 'tpe',
      nom: 'TPE Magasin Principal',
      reference: 'TPE-001-ABIDJAN',
      montantJour: 890000,
      montantMois: 18900000,
      nombreTransactions: 456,
      tauxCommission: 2.0,
      statut: 'actif'
    },
    {
      id: 'tpe-002',
      type: 'tpe',
      nom: 'TPE Succursale Plateau',
      reference: 'TPE-002-PLATEAU',
      montantJour: 560000,
      montantMois: 11200000,
      nombreTransactions: 289,
      tauxCommission: 2.0,
      statut: 'actif'
    },
    {
      id: 'tpe-003',
      type: 'tpe',
      nom: 'TPE Point de Vente Cocody',
      reference: 'TPE-003-COCODY',
      montantJour: 340000,
      montantMois: 6800000,
      nombreTransactions: 198,
      tauxCommission: 2.0,
      statut: 'actif'
    }
  ];

  // Données exemple avec moyens de paiement
  const operations: RapprochementItem[] = [
    // Opérations bancaires classiques
    {
      id: '1',
      date: '2025-01-15',
      libelle: 'Virement Client ABC',
      reference: 'VIR-2025-001',
      montantBanque: 250000,
      montantCompta: 250000,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'virement'
    },
    {
      id: '2',
      date: '2025-01-14',
      libelle: 'Paiement Fournisseur XYZ',
      reference: 'CHQ-2025-045',
      montantBanque: -85000,
      montantCompta: -85000,
      statut: 'rapproche',
      typeOperation: 'debit',
      moyenPaiement: 'cheque'
    },
    {
      id: '3',
      date: '2025-01-13',
      libelle: 'Commission bancaire',
      reference: 'COM-2025-01',
      montantBanque: -2500,
      statut: 'en_attente',
      typeOperation: 'debit',
      moyenPaiement: 'virement'
    },
    {
      id: '4',
      date: '2025-01-12',
      libelle: 'Remise chèques',
      reference: 'REM-2025-008',
      montantBanque: 456000,
      montantCompta: 458000,
      statut: 'ecart',
      typeOperation: 'credit',
      confidence: 85,
      moyenPaiement: 'cheque'
    },
    {
      id: '5',
      date: '2025-01-11',
      libelle: 'Virement salaires',
      reference: 'SAL-2025-01',
      montantBanque: -1250000,
      statut: 'suggere',
      typeOperation: 'debit',
      confidence: 92,
      moyenPaiement: 'virement'
    },
    // Opérations Mobile Money
    {
      id: '6',
      date: '2025-01-15',
      libelle: 'Paiement Orange Money Client #2341',
      reference: 'OM-2025-1234',
      montantBanque: 75000,
      montantCompta: 74625,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'mobile',
      commission: 375
    },
    {
      id: '7',
      date: '2025-01-15',
      libelle: 'Réception MTN Money #5678',
      reference: 'MTN-2025-5678',
      montantBanque: 125000,
      montantCompta: 124375,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'mobile',
      commission: 625
    },
    {
      id: '8',
      date: '2025-01-14',
      libelle: 'Transfert Wave Money #3456',
      reference: 'WAVE-2025-3456',
      montantBanque: 230000,
      montantCompta: 230000,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'mobile',
      commission: 0
    },
    {
      id: '9',
      date: '2025-01-14',
      libelle: 'Paiement Moov Money #7890',
      reference: 'MOOV-2025-7890',
      montantBanque: 45000,
      statut: 'en_attente',
      typeOperation: 'credit',
      moyenPaiement: 'mobile'
    },
    // Opérations Cartes Bancaires
    {
      id: '10',
      date: '2025-01-15',
      libelle: 'Transaction CB VISA #4567',
      reference: 'CB-2025-0089',
      montantBanque: 45000,
      montantCompta: 44325,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'cb',
      commission: 675
    },
    {
      id: '11',
      date: '2025-01-14',
      libelle: 'Paiement MasterCard #8901',
      reference: 'CB-2025-0090',
      montantBanque: 89000,
      montantCompta: 87398,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'cb',
      commission: 1602
    },
    {
      id: '12',
      date: '2025-01-13',
      libelle: 'Transaction CB VISA #4567',
      reference: 'CB-2025-0091',
      montantBanque: 156000,
      statut: 'suggere',
      typeOperation: 'credit',
      moyenPaiement: 'cb',
      confidence: 89
    },
    // Opérations TPE
    {
      id: '13',
      date: '2025-01-15',
      libelle: 'Encaissement TPE Magasin #001',
      reference: 'TPE-2025-0567',
      montantBanque: 125000,
      montantCompta: 122500,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'tpe',
      commission: 2500
    },
    {
      id: '14',
      date: '2025-01-14',
      libelle: 'Terminal Plateau Batch #234',
      reference: 'TPE-2025-0568',
      montantBanque: 340000,
      montantCompta: 333200,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'tpe',
      commission: 6800
    },
    {
      id: '15',
      date: '2025-01-13',
      libelle: 'TPE Cocody Transaction #456',
      reference: 'TPE-2025-0569',
      montantBanque: 78000,
      statut: 'ecart',
      typeOperation: 'credit',
      moyenPaiement: 'tpe',
      confidence: 95
    },
    // Opérations espèces
    {
      id: '16',
      date: '2025-01-15',
      libelle: 'Versement espèces caisse',
      reference: 'ESP-2025-001',
      montantBanque: 500000,
      montantCompta: 500000,
      statut: 'rapproche',
      typeOperation: 'credit',
      moyenPaiement: 'especes'
    },
    {
      id: '17',
      date: '2025-01-14',
      libelle: 'Retrait espèces',
      reference: 'ESP-2025-002',
      montantBanque: -200000,
      montantCompta: -200000,
      statut: 'rapproche',
      typeOperation: 'debit',
      moyenPaiement: 'especes'
    }
  ];

  // Filtrer les opérations selon l'onglet sélectionné
  const getFilteredOperations = () => {
    if (selectedTab === 'banques') {
      return operations.filter(op => ['virement', 'cheque', 'prelevement'].includes(op.moyenPaiement || ''));
    } else if (selectedTab === 'cb') {
      return operations.filter(op => op.moyenPaiement === 'cb');
    } else if (selectedTab === 'mobile') {
      return operations.filter(op => op.moyenPaiement === 'mobile');
    } else if (selectedTab === 'tpe') {
      return operations.filter(op => op.moyenPaiement === 'tpe');
    } else if (selectedTab === 'especes') {
      return operations.filter(op => op.moyenPaiement === 'especes');
    }
    return operations;
  };

  const filteredOperations = getFilteredOperations();

  const stats = {
    total: filteredOperations.length,
    rapproches: filteredOperations.filter(o => o.statut === 'rapproche').length,
    enAttente: filteredOperations.filter(o => o.statut === 'en_attente').length,
    ecarts: filteredOperations.filter(o => o.statut === 'ecart').length,
    tauxRapprochement: filteredOperations.length > 0
      ? Math.round((filteredOperations.filter(o => o.statut === 'rapproche').length / filteredOperations.length) * 100)
      : 0
  };

  const banques = [
    { id: '001', nom: 'SGBCI - Compte Principal', solde: 12450000 },
    { id: '002', nom: 'Ecobank - Compte Secondaire', solde: 5230000 },
    { id: '003', nom: 'BNI - Compte USD', solde: 8900000 }
  ];

  // Comptes SYSCOHADA pour les moyens de paiement
  const comptesSYSCOHADA = {
    cb: { numero: '5711', libelle: 'Cartes de crédit à encaisser' },
    mobile: { numero: '5712', libelle: 'Virements électroniques à recevoir' },
    tpe: { numero: '5713', libelle: 'TPE à encaisser' },
    virement: { numero: '521', libelle: 'Banques locales' },
    cheque: { numero: '512', libelle: 'Chèques à encaisser' },
    especes: { numero: '571', libelle: 'Caisse' }
  };

  // Statistiques consolidées
  const getConsolidationStats = () => {
    const totalBanques = operations.filter(op => ['virement', 'cheque', 'prelevement'].includes(op.moyenPaiement || ''))
      .reduce((sum, op) => sum + (op.montantBanque || 0), 0);
    const totalMobile = operations.filter(op => op.moyenPaiement === 'mobile')
      .reduce((sum, op) => sum + (op.montantBanque || 0), 0);
    const totalCB = operations.filter(op => op.moyenPaiement === 'cb')
      .reduce((sum, op) => sum + (op.montantBanque || 0), 0);
    const totalTPE = operations.filter(op => op.moyenPaiement === 'tpe')
      .reduce((sum, op) => sum + (op.montantBanque || 0), 0);
    const totalEspeces = operations.filter(op => op.moyenPaiement === 'especes')
      .reduce((sum, op) => sum + (op.montantBanque || 0), 0);

    return { totalBanques, totalMobile, totalCB, totalTPE, totalEspeces };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Onglets pour les différents moyens de paiement */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] p-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="banques" className="flex items-center space-x-2">
              <Landmark className="w-4 h-4" />
              <span>Comptes Bancaires</span>
            </TabsTrigger>
            <TabsTrigger value="cb" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Cartes Bancaires</span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4" />
              <span>Mobile Money</span>
            </TabsTrigger>
            <TabsTrigger value="tpe" className="flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>TPE</span>
            </TabsTrigger>
            <TabsTrigger value="especes" className="flex items-center space-x-2">
              <Banknote className="w-4 h-4" />
              <span>Espèces</span>
            </TabsTrigger>
            <TabsTrigger value="consolidation" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Consolidation</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vue Consolidation */}
      {selectedTab === 'consolidation' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[#6A8A82]" />
                <span>Vue Consolidée des Moyens de Paiement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Banques', value: getConsolidationStats().totalBanques, icon: Landmark, color: 'blue' },
                  { label: 'Mobile Money', value: getConsolidationStats().totalMobile, icon: Smartphone, color: 'green' },
                  { label: 'Cartes Bancaires', value: getConsolidationStats().totalCB, icon: CreditCard, color: 'purple' },
                  { label: 'TPE', value: getConsolidationStats().totalTPE, icon: Monitor, color: 'orange' },
                  { label: 'Espèces', value: getConsolidationStats().totalEspeces, icon: Banknote, color: 'yellow' }
                ].map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg border bg-${item.color}-50 border-${item.color}-200`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <item.icon className={`w-4 h-4 text-${item.color}-600`} />
                    </div>
                    <p className="text-lg font-bold">
                      {item.value.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Répartition par Statut Global</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rapprochés</span>
                    <span className="font-medium text-green-600">
                      {operations.filter(o => o.statut === 'rapproche').length} / {operations.length}
                    </span>
                  </div>
                  <Progress value={(operations.filter(o => o.statut === 'rapproche').length / operations.length) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header avec sélection selon l'onglet */}
      {selectedTab !== 'consolidation' && (
        <>
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#191919]">
                  {selectedTab === 'banques' && 'Rapprochement Bancaire'}
                  {selectedTab === 'cb' && 'Rapprochement Cartes Bancaires'}
                  {selectedTab === 'mobile' && 'Rapprochement Mobile Money'}
                  {selectedTab === 'tpe' && 'Rapprochement TPE'}
                  {selectedTab === 'especes' && 'Rapprochement Caisse'}
                </h2>
                <p className="text-sm text-[#767676] mt-1">Période: {selectedPeriod}</p>
                {selectedTab !== 'banques' && (
                  <p className="text-xs text-[#6A8A82] mt-1">
                    Compte SYSCOHADA: {comptesSYSCOHADA[selectedTab as keyof typeof comptesSYSCOHADA]?.numero} -
                    {comptesSYSCOHADA[selectedTab as keyof typeof comptesSYSCOHADA]?.libelle}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {selectedTab === 'banques' && (
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="px-4 py-2 border border-[#E8E8E8] rounded-lg"
                  >
                    {banques.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.nom} - Solde: {bank.solde.toLocaleString('fr-FR')} FCFA
                      </option>
                    ))}
                  </select>
                )}
                {(selectedTab === 'mobile' || selectedTab === 'cb' || selectedTab === 'tpe') && (
                  <select className="px-4 py-2 border border-[#E8E8E8] rounded-lg">
                    {moyensPaiement
                      .filter(mp => {
                        if (selectedTab === 'mobile') return mp.type === 'mobile';
                        if (selectedTab === 'cb') return mp.type === 'cb';
                        if (selectedTab === 'tpe') return mp.type === 'tpe';
                        return false;
                      })
                      .map(mp => (
                        <option key={mp.id} value={mp.id}>
                          {mp.nom} - {mp.reference}
                        </option>
                      ))}
                  </select>
                )}
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {selectedTab === 'mobile' && 'Importer transactions'}
                    {selectedTab === 'cb' && 'Importer relevé CB'}
                    {selectedTab === 'tpe' && 'Importer journal TPE'}
                    {selectedTab === 'especes' && 'Importer journal caisse'}
                    {selectedTab === 'banques' && 'Importer relevé'}
                  </span>
                </button>
              </div>
            </div>

            {/* Statistiques pour moyens de paiement électroniques */}
            {(selectedTab === 'mobile' || selectedTab === 'cb' || selectedTab === 'tpe') && (
              <div className="mb-4 p-4 bg-[#6A8A82]/10 rounded-lg border border-[#6A8A82]/20">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[#767676]">Volume Jour</p>
                    <p className="text-lg font-bold text-[#191919]">
                      {moyensPaiement
                        .filter(mp => mp.type === selectedTab)
                        .reduce((sum, mp) => sum + mp.montantJour, 0)
                        .toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#767676]">Volume Mois</p>
                    <p className="text-lg font-bold text-[#191919]">
                      {moyensPaiement
                        .filter(mp => mp.type === selectedTab)
                        .reduce((sum, mp) => sum + mp.montantMois, 0)
                        .toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#767676]">Transactions</p>
                    <p className="text-lg font-bold text-[#191919]">
                      {moyensPaiement
                        .filter(mp => mp.type === selectedTab)
                        .reduce((sum, mp) => sum + mp.nombreTransactions, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#767676]">Commission Moyenne</p>
                    <p className="text-lg font-bold text-[#FF6B35]">
                      {(moyensPaiement
                        .filter(mp => mp.type === selectedTab)
                        .reduce((sum, mp, _, arr) => sum + (mp.tauxCommission || 0), 0) /
                        moyensPaiement.filter(mp => mp.type === selectedTab).length || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Statistiques générales */}
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-green-700">Rapprochés</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-800">{stats.rapproches}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-yellow-700">En attente</span>
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-800">{stats.enAttente}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-red-700">Écarts</span>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-800">{stats.ecarts}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-700">Taux rapprochement</span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-800">{stats.tauxRapprochement}%</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-700">IA Active</span>
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-sm font-bold text-purple-800">Auto-matching</p>
              </div>
            </div>
          </div>

          {/* Barre d'outils */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Rapprochement IA</span>
                </button>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-[#E8E8E8] rounded-lg"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="rapproche">Rapprochés</option>
                  <option value="en_attente">En attente</option>
                  <option value="ecart">Écarts</option>
                  <option value="suggere">Suggestions IA</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#767676]" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="pl-10 pr-4 py-2 border border-[#E8E8E8] rounded-lg w-64"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-[#767676]" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Download className="w-5 h-5 text-[#767676]" />
                </button>
              </div>
            </div>
          </div>

          {/* Liste des opérations */}
          <div className="bg-white rounded-lg border border-[#E8E8E8]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-[#E8E8E8]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#444444]">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#444444]">Libellé</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#444444]">Référence</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#444444]">Montant Banque</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#444444]">Montant Compta</th>
                    {(selectedTab === 'cb' || selectedTab === 'mobile' || selectedTab === 'tpe') && (
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[#444444]">Commission</th>
                    )}
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#444444]">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#444444]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.map((op) => (
                    <tr key={op.id} className="border-b border-[#E8E8E8] hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="text-sm text-[#444444]">{op.date}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-[#191919]">{op.libelle}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-[#767676] font-mono">{op.reference}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-semibold ${
                          op.typeOperation === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {op.montantBanque.toLocaleString('fr-FR')} FCFA
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {op.montantCompta ? (
                          <span className={`font-mono font-semibold ${
                            op.typeOperation === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {op.montantCompta.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {(selectedTab === 'cb' || selectedTab === 'mobile' || selectedTab === 'tpe') && (
                        <td className="py-3 px-4 text-right">
                          {op.commission ? (
                            <span className="font-mono text-sm text-orange-600">
                              {op.commission.toLocaleString('fr-FR')} FCFA
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {op.statut === 'rapproche' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            <span>Rapproché</span>
                          </span>
                        )}
                        {op.statut === 'en_attente' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3" />
                            <span>En attente</span>
                          </span>
                        )}
                        {op.statut === 'ecart' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Écart</span>
                          </span>
                        )}
                        {op.statut === 'suggere' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <Bot className="w-3 h-3" />
                            <span>IA {op.confidence}%</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          {op.statut === 'suggere' && (
                            <>
                              <button className="p-1 text-green-600 hover:bg-green-50 rounded">
                                <Check className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {op.statut === 'en_attente' && (
                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <Link className="w-4 h-4" />
                            </button>
                          )}
                          <button className="p-1 text-[#767676] hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer avec pagination */}
            <div className="p-4 border-t border-[#E8E8E8] flex items-center justify-between">
              <span className="text-sm text-[#767676]">
                Affichage de 1-{Math.min(10, filteredOperations.length)} sur {filteredOperations.length} opérations
              </span>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 border border-[#E8E8E8] rounded hover:bg-gray-50">
                  Précédent
                </button>
                <button className="px-3 py-1 bg-[#6A8A82] text-white rounded">1</button>
                <button className="px-3 py-1 border border-[#E8E8E8] rounded hover:bg-gray-50">2</button>
                <button className="px-3 py-1 border border-[#E8E8E8] rounded hover:bg-gray-50">
                  Suivant
                </button>
              </div>
            </div>
          </div>

          {/* Section IA */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-6 border-2 border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#191919]">Assistant IA de Rapprochement</h3>
                  <p className="text-sm text-[#767676]">Pattern matching & Machine Learning activés</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[#767676]">Auto-rapprochement</span>
                <button
                  onClick={() => setAutoRapprochement(!autoRapprochement)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    autoRapprochement ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    autoRapprochement ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-[#767676] mb-1">Taux de matching</p>
                <p className="font-semibold">94%</p>
                <p className="text-xs text-green-600">+2% vs mois dernier</p>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-[#767676] mb-1">Suggestions validées</p>
                <p className="font-semibold">127/135</p>
                <p className="text-xs text-blue-600">Précision: 94%</p>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-[#767676] mb-1">Temps économisé</p>
                <p className="font-semibold">3h 45min</p>
                <p className="text-xs text-purple-600">Ce mois</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RapprochementBancaire;