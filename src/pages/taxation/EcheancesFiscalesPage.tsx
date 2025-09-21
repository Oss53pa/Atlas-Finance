import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Bell,
  Filter,
  Download,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  FileText,
  Building,
  User
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
  TabsTrigger
} from '../../components/ui';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface TaxDeadline {
  id: string;
  nom: string;
  type: 'TVA' | 'IS' | 'IRPP' | 'TCA' | 'TFP' | 'AUTRES';
  description: string;
  date_echeance: string;
  statut: 'à_venir' | 'urgent' | 'dépassé' | 'terminé';
  montant_estimé?: number;
  periodicite: 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel';
  rappel_actif: boolean;
  rappel_jours: number;
  obligatoire: boolean;
  derniere_declaration?: string;
  prochaine_echeance?: string;
}

interface CalendarEvent {
  date: string;
  events: TaxDeadline[];
}

const EcheancesFiscalesPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Mock tax deadlines data
  const mockDeadlines: TaxDeadline[] = [
    {
      id: '1',
      nom: 'Déclaration TVA Mensuelle',
      type: 'TVA',
      description: 'Déclaration et paiement de la TVA collectée du mois précédent',
      date_echeance: '2024-02-15',
      statut: 'urgent',
      montant_estimé: 7200000,
      periodicite: 'mensuel',
      rappel_actif: true,
      rappel_jours: 7,
      obligatoire: true,
      derniere_declaration: '2024-01-15',
      prochaine_echeance: '2024-03-15'
    },
    {
      id: '2',
      nom: 'Acompte IS T1',
      type: 'IS',
      description: 'Premier acompte d\'impôt sur les sociétés',
      date_echeance: '2024-02-28',
      statut: 'à_venir',
      montant_estimé: 4500000,
      periodicite: 'trimestriel',
      rappel_actif: true,
      rappel_jours: 14,
      obligatoire: true,
      prochaine_echeance: '2024-05-31'
    },
    {
      id: '3',
      nom: 'IRPP Salaires Janvier',
      type: 'IRPP',
      description: 'Déclaration et versement IRPP sur salaires',
      date_echeance: '2024-02-10',
      statut: 'dépassé',
      montant_estimé: 4200000,
      periodicite: 'mensuel',
      rappel_actif: true,
      rappel_jours: 5,
      obligatoire: true,
      derniere_declaration: '2024-01-10'
    },
    {
      id: '4',
      nom: 'Taxe Chiffre d\'Affaires',
      type: 'TCA',
      description: 'Déclaration de la taxe sur le chiffre d\'affaires',
      date_echeance: '2024-02-20',
      statut: 'à_venir',
      montant_estimé: 2500000,
      periodicite: 'mensuel',
      rappel_actif: false,
      rappel_jours: 3,
      obligatoire: true,
      prochaine_echeance: '2024-03-20'
    },
    {
      id: '5',
      nom: 'Taxe Foncière sur Propriétés',
      type: 'TFP',
      description: 'Paiement annuel de la taxe foncière',
      date_echeance: '2024-03-31',
      statut: 'à_venir',
      montant_estimé: 1800000,
      periodicite: 'annuel',
      rappel_actif: true,
      rappel_jours: 30,
      obligatoire: true
    },
    {
      id: '6',
      nom: 'Déclaration Statistique',
      type: 'AUTRES',
      description: 'Déclaration statistique trimestrielle',
      date_echeance: '2024-04-15',
      statut: 'à_venir',
      periodicite: 'trimestriel',
      rappel_actif: true,
      rappel_jours: 10,
      obligatoire: false
    },
    {
      id: '7',
      nom: 'TVA Export Trimestrielle',
      type: 'TVA',
      description: 'Déclaration TVA pour les exportations',
      date_echeance: '2024-04-30',
      statut: 'à_venir',
      montant_estimé: 0,
      periodicite: 'trimestriel',
      rappel_actif: true,
      rappel_jours: 15,
      obligatoire: true
    }
  ];

  const { data: deadlines = mockDeadlines, isLoading } = useQuery({
    queryKey: ['tax-deadlines', selectedMonth, selectedType],
    queryFn: () => Promise.resolve(mockDeadlines),
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'à_venir':
        return 'text-blue-600 bg-blue-100';
      case 'urgent':
        return 'text-orange-600 bg-orange-100';
      case 'dépassé':
        return 'text-red-600 bg-red-100';
      case 'terminé':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'à_venir':
        return <Clock className="h-4 w-4" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      case 'dépassé':
        return <AlertTriangle className="h-4 w-4" />;
      case 'terminé':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'TVA': 'bg-blue-100 text-blue-800',
      'IS': 'bg-green-100 text-green-800',
      'IRPP': 'bg-purple-100 text-purple-800',
      'TCA': 'bg-orange-100 text-orange-800',
      'TFP': 'bg-red-100 text-red-800',
      'AUTRES': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getDaysUntilDeadline = (dateEcheance: string) => {
    const today = new Date();
    const deadline = new Date(dateEcheance);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const generateCalendarDays = (month: string) => {
    const year = parseInt(month.split('-')[0]);
    const monthNum = parseInt(month.split('-')[1]) - 1;
    
    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, monthNum, day);
      const dateString = currentDate.toISOString().split('T')[0];
      const dayDeadlines = deadlines.filter(d => d.date_echeance === dateString);
      
      days.push({
        date: dateString,
        day: day,
        events: dayDeadlines
      });
    }
    
    return days;
  };

  const urgentCount = deadlines.filter(d => d.statut === 'urgent').length;
  const overdueCount = deadlines.filter(d => d.statut === 'dépassé').length;
  const upcomingCount = deadlines.filter(d => d.statut === 'à_venir').length;
  const totalAmount = deadlines.reduce((sum, d) => sum + (d.montant_estimé || 0), 0);

  const filteredDeadlines = selectedType === 'tous' 
    ? deadlines 
    : deadlines.filter(d => d.type === selectedType);

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
              <Calendar className="mr-3 h-7 w-7 text-blue-600" />
              Échéances Fiscales
            </h1>
            <p className="mt-2 text-gray-600">
              Calendrier et suivi des obligations fiscales selon la réglementation SYSCOHADA
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}>
              {viewMode === 'calendar' ? <FileText className="mr-2 h-4 w-4" /> : <Calendar className="mr-2 h-4 w-4" />}
              {viewMode === 'calendar' ? 'Vue Liste' : 'Vue Calendrier'}
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Échéance
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
                <div className="p-2 bg-orange-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-orange-700">{urgentCount}</p>
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
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">En Retard</p>
                  <p className="text-2xl font-bold text-red-700">{overdueCount}</p>
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
                <div className="p-2 bg-blue-100 rounded-full">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">À Venir</p>
                  <p className="text-2xl font-bold text-blue-700">{upcomingCount}</p>
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
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Estimé</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(totalAmount)}
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
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mois
                </label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de Taxe
                </label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les types</SelectItem>
                    <SelectItem value="TVA">TVA</SelectItem>
                    <SelectItem value="IS">Impôt sur Sociétés</SelectItem>
                    <SelectItem value="IRPP">IRPP</SelectItem>
                    <SelectItem value="TCA">Taxe sur CA</SelectItem>
                    <SelectItem value="TFP">Taxe Foncière</SelectItem>
                    <SelectItem value="AUTRES">Autres</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
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
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {viewMode === 'calendar' ? (
          <Card>
            <CardHeader>
              <CardTitle>Calendrier Fiscal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-600 bg-gray-50 rounded">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {generateCalendarDays(selectedMonth).map(({ date, day, events }) => (
                  <div
                    key={date}
                    className={`min-h-[100px] p-2 border rounded hover:bg-gray-50 ${
                      events.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-700 mb-1">{day}</div>
                    <div className="space-y-1">
                      {events.map(event => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded cursor-pointer ${getStatusColor(event.statut)}`}
                          title={`${event.nom} - ${event.description}`}
                        >
                          <div className="font-medium truncate">{event.type}</div>
                          {event.montant_estimé && (
                            <div className="text-xs">{formatCurrency(event.montant_estimé)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Liste des Échéances</span>
                <Badge variant="outline">
                  {filteredDeadlines.length} échéance(s)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" text="Chargement des échéances..." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date Limite</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Périodicité</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Rappel</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeadlines.map((deadline) => {
                        const daysUntil = getDaysUntilDeadline(deadline.date_echeance);
                        return (
                          <TableRow key={deadline.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {deadline.obligatoire && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{deadline.nom}</p>
                                  <p className="text-sm text-gray-500">{deadline.description}</p>
                                  {daysUntil >= 0 ? (
                                    <p className="text-xs text-blue-600">Dans {daysUntil} jour(s)</p>
                                  ) : (
                                    <p className="text-xs text-red-600">Dépassé de {Math.abs(daysUntil)} jour(s)</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTypeColor(deadline.type)}>
                                {deadline.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-900">
                                {formatDate(deadline.date_echeance)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deadline.statut)}`}>
                                {getStatusIcon(deadline.statut)}
                                <span className="ml-1 capitalize">{deadline.statut.replace('_', ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {deadline.periodicite}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {deadline.montant_estimé && (
                                <span className="font-semibold text-green-700">
                                  {formatCurrency(deadline.montant_estimé)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                {deadline.rappel_actif ? (
                                  <Bell className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <Bell className="h-4 w-4 text-gray-300" />
                                )}
                                <span className="text-xs text-gray-600">
                                  {deadline.rappel_jours}j avant
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center space-x-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Bell className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Upcoming Deadlines Notification */}
      {urgentCount > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed bottom-4 right-4 bg-orange-50 border-l-4 border-orange-400 p-4 rounded-lg shadow-lg max-w-sm z-50"
        >
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-800">
                Échéances Urgentes!
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Vous avez {urgentCount} échéance(s) fiscale(s) urgente(s) à traiter.
              </p>
              <Button size="sm" className="mt-2 bg-orange-600 hover:bg-orange-700">
                Voir Détails
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EcheancesFiscalesPage;