import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2,
  CreditCard,
  Link,
  Unlink,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Settings,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Shield,
  Key,
  Wifi,
  WifiOff,
  DollarSign,
  TrendingUp,
  ArrowUpDown
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
  Progress
} from '../../components/ui';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface BankConnection {
  id: string;
  nom_banque: string;
  nom_compte: string;
  numero_compte: string;
  type_compte: 'courant' | 'epargne' | 'depot' | 'credit';
  statut: 'connecté' | 'erreur' | 'en_attente' | 'déconnecté';
  derniere_sync: string;
  solde_actuel: number;
  devise: string;
  api_type: 'API_BANQUE' | 'AGREGATEUR' | 'MANUEL';
  derniere_transaction: string;
  nb_transactions: number;
  auto_sync: boolean;
  certificat_ssl: boolean;
  authentification: '2FA' | 'OAuth' | 'API_KEY';
}

interface Transaction {
  id: string;
  date: string;
  libelle: string;
  montant: number;
  type: 'débit' | 'crédit';
  solde_apres: number;
  compte_id: string;
  statut: 'traité' | 'en_attente' | 'rejeté';
  reference: string;
  categorie?: string;
}

interface SyncLog {
  id: string;
  compte_id: string;
  date_sync: string;
  statut: 'succès' | 'erreur' | 'partiel';
  nb_transactions: number;
  message: string;
  duree: number;
}

const ConnexionsBancairesPage: React.FC = () => {
  const { t } = useLanguage();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState<Set<string>>(new Set());

  // Mock bank connections data
  const mockConnections: BankConnection[] = [
    {
      id: '1',
      nom_banque: 'Ecobank Côte d\'Ivoire',
      nom_compte: 'Compte Principal',
      numero_compte: 'CI001234567890123',
      type_compte: 'courant',
      statut: 'connecté',
      derniere_sync: '2024-01-31T10:30:00Z',
      solde_actuel: 125430000,
      devise: 'XOF',
      api_type: 'API_BANQUE',
      derniere_transaction: '2024-01-31T09:45:00Z',
      nb_transactions: 1247,
      auto_sync: true,
      certificat_ssl: true,
      authentification: 'OAuth'
    },
    {
      id: '2',
      nom_banque: 'BACI (Bank of Africa)',
      nom_compte: 'Compte Épargne',
      numero_compte: 'CI987654321098765',
      type_compte: 'epargne',
      statut: 'connecté',
      derniere_sync: '2024-01-31T08:15:00Z',
      solde_actuel: 45680000,
      devise: 'XOF',
      api_type: 'AGREGATEUR',
      derniere_transaction: '2024-01-30T16:20:00Z',
      nb_transactions: 523,
      auto_sync: true,
      certificat_ssl: true,
      authentification: '2FA'
    },
    {
      id: '3',
      nom_banque: 'SGBCI (Société Générale)',
      nom_compte: 'Compte Dépôt à Terme',
      numero_compte: 'CI456789012345678',
      type_compte: 'depot',
      statut: 'erreur',
      derniere_sync: '2024-01-30T14:22:00Z',
      solde_actuel: 25000000,
      devise: 'XOF',
      api_type: 'API_BANQUE',
      derniere_transaction: '2024-01-29T11:10:00Z',
      nb_transactions: 89,
      auto_sync: false,
      certificat_ssl: true,
      authentification: 'API_KEY'
    },
    {
      id: '4',
      nom_banque: 'BICICI (BNP Paribas)',
      nom_compte: 'Ligne de Crédit',
      numero_compte: 'CI789012345678901',
      type_compte: 'credit',
      statut: 'en_attente',
      derniere_sync: '2024-01-29T18:45:00Z',
      solde_actuel: -15600000,
      devise: 'XOF',
      api_type: 'AGREGATEUR',
      derniere_transaction: '2024-01-29T17:30:00Z',
      nb_transactions: 342,
      auto_sync: true,
      certificat_ssl: true,
      authentification: 'OAuth'
    }
  ];

  // Mock transactions data
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: '2024-01-31T09:45:00Z',
      libelle: 'Virement Fournisseur ABC SARL',
      montant: -2450000,
      type: 'débit',
      solde_apres: 125430000,
      compte_id: '1',
      statut: 'traité',
      reference: 'VIR240131001',
      categorie: t('navigation.suppliers')
    },
    {
      id: '2',
      date: '2024-01-31T08:20:00Z',
      libelle: 'Encaissement Client XYZ',
      montant: 5800000,
      type: 'crédit',
      solde_apres: 127880000,
      compte_id: '1',
      statut: 'traité',
      reference: 'ENC240131002',
      categorie: t('navigation.clients')
    },
    {
      id: '3',
      date: '2024-01-30T16:20:00Z',
      libelle: 'Intérêts Compte Épargne',
      montant: 180000,
      type: 'crédit',
      solde_apres: 45680000,
      compte_id: '2',
      statut: 'traité',
      reference: 'INT240130003',
      categorie: 'Produits Financiers'
    },
    {
      id: '4',
      date: '2024-01-30T14:15:00Z',
      libelle: 'Prélèvement Automatique - Loyer',
      montant: -1200000,
      type: 'débit',
      solde_apres: 124230000,
      compte_id: '1',
      statut: 'traité',
      reference: 'PRE240130004',
      categorie: 'Charges'
    }
  ];

  // Mock sync logs
  const mockSyncLogs: SyncLog[] = [
    {
      id: '1',
      compte_id: '1',
      date_sync: '2024-01-31T10:30:00Z',
      statut: 'succès',
      nb_transactions: 12,
      message: 'Synchronisation réussie - 12 nouvelles transactions',
      duree: 3.2
    },
    {
      id: '2',
      compte_id: '2',
      date_sync: '2024-01-31T08:15:00Z',
      statut: 'succès',
      nb_transactions: 3,
      message: 'Synchronisation réussie - 3 nouvelles transactions',
      duree: 1.8
    },
    {
      id: '3',
      compte_id: '3',
      date_sync: '2024-01-30T14:22:00Z',
      statut: 'erreur',
      nb_transactions: 0,
      message: 'Erreur d\'authentification - Token expiré',
      duree: 0.5
    }
  ];

  const { data: connections = mockConnections, isLoading } = useQuery({
    queryKey: ['bank-connections'],
    queryFn: () => Promise.resolve(mockConnections),
  });

  const { data: transactions = mockTransactions } = useQuery({
    queryKey: ['bank-transactions', selectedAccount],
    queryFn: () => Promise.resolve(mockTransactions.filter(t => !selectedAccount || t.compte_id === selectedAccount)),
  });

  const { data: syncLogs = mockSyncLogs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: () => Promise.resolve(mockSyncLogs),
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'connecté':
        return 'text-green-600 bg-green-100';
      case 'erreur':
        return 'text-red-600 bg-red-100';
      case 'en_attente':
        return 'text-orange-600 bg-orange-100';
      case 'déconnecté':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'connecté':
        return <CheckCircle className="h-4 w-4" />;
      case 'erreur':
        return <AlertTriangle className="h-4 w-4" />;
      case 'en_attente':
        return <Clock className="h-4 w-4" />;
      case 'déconnecté':
        return <WifiOff className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'courant': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'epargne': 'bg-green-100 text-green-800',
      'depot': 'bg-[#B87333]/10 text-[#B87333]',
      'credit': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getAPITypeIcon = (type: string) => {
    switch (type) {
      case 'API_BANQUE':
        return <Building2 className="h-4 w-4" />;
      case 'AGREGATEUR':
        return <Link className="h-4 w-4" />;
      case 'MANUEL':
        return <Upload className="h-4 w-4" />;
      default:
        return <Link className="h-4 w-4" />;
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    setSyncInProgress(prev => new Set(prev).add(accountId));
    toast.success('Synchronisation en cours...');
    
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSyncInProgress(prev => {
      const newSet = new Set(prev);
      newSet.delete(accountId);
      return newSet;
    });
    toast.success('Synchronisation terminée!');
  };

  const handleConnectNewAccount = async () => {
    setIsConnecting(true);
    toast.success('Connexion d\'un nouveau compte en cours...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsConnecting(false);
    toast.success('Nouveau compte connecté avec succès!');
  };

  const connectedCount = connections.filter(c => c.statut === 'connecté').length;
  const errorCount = connections.filter(c => c.statut === 'erreur').length;
  const totalBalance = connections.reduce((sum, conn) => sum + conn.solde_actuel, 0);
  const totalTransactions = connections.reduce((sum, conn) => sum + conn.nb_transactions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Building2 className="mr-3 h-7 w-7 text-[#6A8A82]" />
              Connexions Bancaires
            </h1>
            <p className="mt-2 text-gray-600">
              Gestion et synchronisation des comptes bancaires en temps réel
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleConnectNewAccount}
              disabled={isConnecting}
              className="bg-[#6A8A82] hover:bg-[#6A8A82]/80"
            >
              {isConnecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? 'Connexion...' : 'Connecter Compte'}
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-[#6A8A82]/10 rounded-full">
                  <Building2 className="h-6 w-6 text-[#6A8A82]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Comptes Connectés</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {connectedCount}/{connections.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Solde Total</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(totalBalance)}
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
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <ArrowUpDown className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-purple-700">{totalTransactions}</p>
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
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Erreurs</p>
                  <p className="text-2xl font-bold text-red-700">{errorCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Tabs defaultValue="connections" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connections">Connexions</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="logs">Logs de Sync</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Comptes Bancaires</span>
                  <Badge variant="outline">
                    {connections.length} compte(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des connexions..." />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                    {connections.map((connection) => (
                      <motion.div
                        key={connection.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-[#6A8A82]/10 rounded-full">
                              <Building2 className="h-6 w-6 text-[#6A8A82]" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {connection.nom_banque}
                              </h3>
                              <p className="text-sm text-gray-600">{connection.nom_compte}</p>
                              <p className="text-xs font-mono text-gray-700">
                                {connection.numero_compte}
                              </p>
                            </div>
                          </div>
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(connection.statut)}`}>
                            {getStatusIcon(connection.statut)}
                            <span className="ml-1 capitalize">{connection.statut}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Solde Actuel</p>
                            <p className={`text-xl font-bold ${
                              connection.solde_actuel >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(connection.solde_actuel)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Type</p>
                            <Badge className={getAccountTypeColor(connection.type_compte)}>
                              {connection.type_compte}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              {getAPITypeIcon(connection.api_type)}
                              <span>{connection.api_type}</span>
                            </div>
                            {connection.certificat_ssl && (
                              <Shield className="h-4 w-4 text-green-600" />
                            )}
                            {connection.auto_sync ? (
                              <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-gray-700" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs">Dernière sync: {formatDate(connection.derniere_sync)}</p>
                            <p className="text-xs">{connection.nb_transactions} transactions</p>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleSyncAccount(connection.id)}
                            disabled={syncInProgress.has(connection.id)}
                            className="flex-1"
                          >
                            {syncInProgress.has(connection.id) ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Synchroniser
                          </Button>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Détails
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="mr-2 h-4 w-4" />
                            Config
                          </Button>
                        </div>

                        {connection.statut === 'erreur' && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-center">
                              <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                              <p className="text-sm text-red-800">
                                Erreur de connexion - Vérifiez les paramètres d'authentification
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Transactions Récentes</span>
                  <div className="flex space-x-2">
                    <Select value={selectedAccount || 'tous'} onValueChange={(value) => setSelectedAccount(value === 'tous' ? null : value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous les comptes</SelectItem>
                        {connections.map(conn => (
                          <SelectItem key={conn.id} value={conn.id}>
                            {conn.nom_banque} - {conn.nom_compte}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.date')}</TableHead>
                        <TableHead>{t('accounting.label')}</TableHead>
                        <TableHead>{t('accounting.account')}</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="text-right">{t('accounting.balance')}</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Référence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => {
                        const account = connections.find(c => c.id === transaction.compte_id);
                        return (
                          <TableRow key={transaction.id} className="hover:bg-gray-50">
                            <TableCell>
                              <span className="text-sm text-gray-900">
                                {formatDate(transaction.date)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{transaction.libelle}</p>
                                {transaction.categorie && (
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {transaction.categorie}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium">{account?.nom_banque}</p>
                                <p className="text-xs text-gray-700">{account?.nom_compte}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-semibold ${
                                transaction.type === 'crédit' ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {transaction.type === 'crédit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.montant))}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-gray-900 font-medium">
                                {formatCurrency(transaction.solde_apres)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.statut === 'traité' ? 'default' : 'outline'}>
                                {transaction.statut}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-gray-600">
                                {transaction.reference}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique de Synchronisation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {syncLogs.map((log) => {
                    const account = connections.find(c => c.id === log.compte_id);
                    return (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${
                            log.statut === 'succès' ? 'bg-green-100' :
                            log.statut === 'erreur' ? 'bg-red-100' : 'bg-orange-100'
                          }`}>
                            {log.statut === 'succès' ? (
                              <CheckCircle className={`h-5 w-5 text-green-600`} />
                            ) : log.statut === 'erreur' ? (
                              <AlertTriangle className={`h-5 w-5 text-red-600`} />
                            ) : (
                              <Clock className={`h-5 w-5 text-orange-600`} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{account?.nom_banque}</p>
                            <p className="text-sm text-gray-600">{log.message}</p>
                            <p className="text-xs text-gray-700">
                              {formatDate(log.date_sync)} • Durée: {log.duree}s
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {log.nb_transactions} transactions
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Paramètres de Sécurité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Authentification</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Key className="h-5 w-5 text-[#6A8A82]" />
                            <span>Authentification 2FA</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Activé</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-[#6A8A82]" />
                            <span>Certificat SSL</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">Activé</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Key className="h-5 w-5 text-[#6A8A82]" />
                            <span>Chiffrement des Données</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">AES-256</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">Permissions</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span>Lecture des comptes</span>
                          <Badge className="bg-green-100 text-green-800">Accordé</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span>Historique des transactions</span>
                          <Badge className="bg-green-100 text-green-800">Accordé</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span>Initiation de paiements</span>
                          <Badge className="bg-red-100 text-red-800">Non accordé</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Connection Progress */}
      {isConnecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-white p-6 rounded-lg shadow-lg border z-50"
        >
          <div className="flex items-center space-x-4">
            <div className="animate-spin">
              <RefreshCw className="h-6 w-6 text-[#6A8A82]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Connexion en cours...</p>
              <p className="text-sm text-gray-600">Authentification avec la banque</p>
              <Progress value={60} className="w-48 mt-2" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ConnexionsBancairesPage;