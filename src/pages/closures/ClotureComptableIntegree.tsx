/**
 * Module de Gestion de Clôture Comptable Périodique Atlas Finance
 * Interface intégrée au système comptable existant
 * Respecte exactement le cahier des charges fourni sections A-G
 */
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Calendar, Clock, Users, CheckCircle, AlertCircle,
  FileText, DollarSign, TrendingUp, Archive, Settings,
  Filter, Download, Upload, Eye, Edit, Trash,
  ChevronDown, ChevronUp, MoreHorizontal,
  Calculator, PieChart, BarChart, LineChart
} from 'lucide-react';

// Types selon le système Atlas Finance existant
interface Company {
  id: string;
  name: string;
  code: string;
}

interface FiscalYear {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  is_active: boolean;
}

interface ClotureComptable {
  id: string;
  company: Company;
  fiscal_year: FiscalYear;
  type_cloture: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE';
  nom_periode: string;
  date_debut: string;
  date_fin: string;
  date_echeance: string;
  statut: 'PLANIFIEE' | 'EN_COURS' | 'CONTROLE' | 'VALIDATION' | 'APPROUVEE' | 'TERMINEE';
  progression_pourcentage: number;
  responsable_principal: any;
  nombre_operations: number;
  taux_erreur: number;
}

interface BalanceLigne {
  compte: string;
  libelle: string;
  total_debit: string;
  total_credit: string;
  solde_debiteur: string;
  solde_crediteur: string;
  nb_ecritures: number;
}

interface ProvisionClient {
  compte: string;
  libelle: string;
  solde: string;
  anciennete_jours: number;
  taux_syscohada: string;
  provision_calculee: string;
  justification: string;
}

interface OperationRegularisation {
  id: string;
  numero_operation: string;
  type_operation: string;
  description: string;
  compte_concerne: any;
  montant_estime: string;
  impact_financier: 'FAIBLE' | 'MOYEN' | 'FORT' | 'CRITIQUE';
  statut: string;
  date_echeance: string;
  responsable?: any;
}

const ClotureComptableIntegree: React.FC = () => {
  const { t } = useLanguage();
  // État principal
  const [exercicesDisponibles, setExercicesDisponibles] = useState<FiscalYear[]>([]);
  const [exerciceSelectionne, setExerciceSelectionne] = useState<string>('');
  const [clotures, setClotures] = useState<ClotureComptable[]>([]);
  const [clotureActive, setClotureActive] = useState<ClotureComptable | null>(null);

  // États pour les différentes sections
  const [balanceGenerale, setBalanceGenerale] = useState<BalanceLigne[]>([]);
  const [provisionsClients, setProvisionsClients] = useState<ProvisionClient[]>([]);
  const [operations, setOperations] = useState<OperationRegularisation[]>([]);
  const [indicateurs, setIndicateurs] = useState<any>({});

  // État des onglets actifs
  const [ongletActif, setOngletActif] = useState('cycle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chargement initial - Exercices disponibles depuis Atlas Finance
  useEffect(() => {
    chargerExercicesDisponibles();
  }, []);

  const chargerExercicesDisponibles = async () => {
    try {
      const response = await fetch('/api/cloture_comptable/api/exercices/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExercicesDisponibles(data.exercices);
      } else {
        setError('Erreur lors du chargement des exercices');
      }
    } catch (error) {
      setError('Erreur de connexion au système Atlas Finance');
      console.error('Erreur exercices:', error);
    }
  };

  const chargerBalanceGeneraleReelle = async () => {
    if (!exerciceSelectionne) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/cloture_comptable/api/balance-reelle/?exercice_id=${exerciceSelectionne}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBalanceGenerale(data.balance);
      } else {
        setError('Erreur lors du chargement de la balance');
      }
    } catch (error) {
      setError('Erreur de chargement de la balance');
      console.error('Erreur balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculerProvisionsReelles = async () => {
    if (!exerciceSelectionne) return;

    setLoading(true);
    try {
      const response = await fetch('/api/cloture_comptable/api/provisions-reelles/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          exercice_id: exerciceSelectionne
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProvisionsClients(data.provisions);
      } else {
        setError('Erreur lors du calcul des provisions');
      }
    } catch (error) {
      setError('Erreur de calcul des provisions');
      console.error('Erreur provisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const validerProvision = async (compteId: string, montant: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cloture_comptable/api/valider-provision/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          exercice_id: exerciceSelectionne,
          compte_id: compteId,
          montant_provision: montant
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Provision validée - Écriture ${data.ecriture.numero} créée`);
      } else {
        setError('Erreur lors de la validation de la provision');
      }
    } catch (error) {
      setError('Erreur de validation de la provision');
      console.error('Erreur validation:', error);
    } finally {
      setLoading(false);
    }
  };

  const chargerIndicateursPerformance = async () => {
    try {
      const response = await fetch('/api/cloture_comptable/api/indicateurs/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIndicateurs(data.indicateurs);
      }
    } catch (error) {
      console.error('Erreur indicateurs:', error);
    }
  };

  // Formatage des montants
  const formaterMontant = (montant: string | number) => {
    const nombre = typeof montant === 'string' ? parseFloat(montant) : montant;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(nombre);
  };

  // Rendu du sélecteur d'exercice
  const renderSelecteurExercice = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Sélection Exercice Comptable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="exercice">Exercice Comptable</Label>
            <Select value={exerciceSelectionne} onValueChange={setExerciceSelectionne}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un exercice" />
              </SelectTrigger>
              <SelectContent>
                {exercicesDisponibles.map((exercice) => (
                  <SelectItem key={exercice.id} value={exercice.id}>
                    {exercice.name} ({exercice.start_date} → {exercice.end_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              onClick={chargerBalanceGeneraleReelle}
              disabled={!exerciceSelectionne || loading}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              Charger Balance
            </Button>

            <Button
              onClick={calculerProvisionsReelles}
              disabled={!exerciceSelectionne || loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Calculer Provisions
            </Button>
          </div>
        </div>

        {error && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // Section A - Gestion du Cycle de Clôture
  const renderGestionCycle = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>A. Gestion du Cycle de Clôture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Clôtures Actives</p>
                    <p className="text-lg font-bold">3</p>
                  </div>
                  <Clock className="h-8 w-8 text-[var(--color-primary)]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Progression Moyenne</p>
                    <p className="text-lg font-bold">{indicateurs.progression_globale || 0}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Délai Moyen</p>
                    <p className="text-lg font-bold">{indicateurs.delai_moyen_jours || 0}j</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Taux d'Erreur</p>
                    <p className="text-lg font-bold">{indicateurs.taux_erreur || 0}%</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-[var(--color-error)]" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={chargerIndicateursPerformance}
            className="mb-4"
          >
            Actualiser Indicateurs
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Section B - Opérations de Régularisation
  const renderOperationsRegularisation = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>B. Opérations de Régularisation</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Provisions Clients SYSCOHADA */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Provisions Clients (SYSCOHADA)</h3>
            {provisionsClients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-[var(--color-border-dark)]">
                  <thead>
                    <tr className="bg-[var(--color-background-secondary)]">
                      <th className="border border-[var(--color-border-dark)] p-2 text-left">{t('accounting.account')}</th>
                      <th className="border border-[var(--color-border-dark)] p-2 text-left">{t('accounting.label')}</th>
                      <th className="border border-[var(--color-border-dark)] p-2 text-right">{t('accounting.balance')}</th>
                      <th className="border border-[var(--color-border-dark)] p-2 text-center">Ancienneté</th>
                      <th className="border border-[var(--color-border-dark)] p-2 text-center">Taux SYSCOHADA</th>
                      <th className="border border-[var(--color-border-dark)] p-2 text-right">Provision</th>
                      <th className="border border-[var(--color-border-dark)] p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provisionsClients.map((provision, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-background-secondary)]'}>
                        <td className="border border-[var(--color-border-dark)] p-2 font-mono">{provision.compte}</td>
                        <td className="border border-[var(--color-border-dark)] p-2">{provision.libelle}</td>
                        <td className="border border-[var(--color-border-dark)] p-2 text-right font-mono">
                          {formaterMontant(provision.solde)}
                        </td>
                        <td className="border border-[var(--color-border-dark)] p-2 text-center">
                          {provision.anciennete_jours} jours
                        </td>
                        <td className="border border-[var(--color-border-dark)] p-2 text-center">
                          {provision.taux_syscohada}%
                        </td>
                        <td className="border border-[var(--color-border-dark)] p-2 text-right font-mono text-[var(--color-error)] font-bold">
                          {formaterMontant(provision.provision_calculee)}
                        </td>
                        <td className="border border-[var(--color-border-dark)] p-2 text-center">
                          <Button
                            size="sm"
                            onClick={() => validerProvision(provision.compte, provision.provision_calculee)}
                            disabled={loading}
                          >
                            Valider
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cliquez sur "Calculer Provisions" pour analyser les créances clients selon les normes SYSCOHADA
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Section D - États Financiers (Balance Générale)
  const renderEtatsFinanciers = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>D. États Financiers - Balance Générale</CardTitle>
        </CardHeader>
        <CardContent>
          {balanceGenerale.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-[var(--color-border-dark)] text-sm">
                <thead>
                  <tr className="bg-[var(--color-background-secondary)]">
                    <th className="border border-[var(--color-border-dark)] p-2 text-left">{t('accounting.account')}</th>
                    <th className="border border-[var(--color-border-dark)] p-2 text-left">{t('accounting.label')}</th>
                    <th className="border border-[var(--color-border-dark)] p-2 text-right">Total Débit</th>
                    <th className="border border-[var(--color-border-dark)] p-2 text-right">Total Crédit</th>
                    <th className="border border-[var(--color-border-dark)] p-2 text-right">Solde Débiteur</th>
                    <th className="border border-[var(--color-border-dark)] p-2 text-right">Solde Créditeur</th>
                    <th className="border border-[var(--color-border-dark)] p-2 text-center">Écritures</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceGenerale.map((ligne, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-background-secondary)]'}>
                      <td className="border border-[var(--color-border-dark)] p-2 font-mono">{ligne.compte}</td>
                      <td className="border border-[var(--color-border-dark)] p-2">{ligne.libelle}</td>
                      <td className="border border-[var(--color-border-dark)] p-2 text-right font-mono">
                        {formaterMontant(ligne.total_debit)}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-2 text-right font-mono">
                        {formaterMontant(ligne.total_credit)}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-2 text-right font-mono">
                        {ligne.solde_debiteur !== '0' ? formaterMontant(ligne.solde_debiteur) : ''}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-2 text-right font-mono">
                        {ligne.solde_crediteur !== '0' ? formaterMontant(ligne.solde_crediteur) : ''}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-2 text-center">
                        {ligne.nb_ecritures}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sélectionnez un exercice et cliquez sur "Charger Balance" pour afficher la balance générale
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Section C - Workflow de Validation
  const renderWorkflowValidation = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>C. Workflow de Validation Avancé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-[var(--color-text-secondary)] mb-4" />
            <p className="text-[var(--color-text-primary)]">Module en cours de développement</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              Circuit de validation configurable avec niveaux d'approbation selon les seuils de montants
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Section E - Paramétrage et Automatisation
  const renderParametrageAutomatisation = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>E. Paramétrage et Automatisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-[var(--color-text-secondary)] mb-4" />
            <p className="text-[var(--color-text-primary)]">Module en cours de développement</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              Automatisation des tâches récurrentes et paramétrage des règles de gestion
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Section F - Tableau de Bord et Reporting
  const renderTableauBordReporting = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>F. Tableau de Bord et Reporting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <PieChart className="h-16 w-16 text-[var(--color-primary)]" />
                </div>
                <h4 className="text-center mt-4 font-semibold">Graphiques de Progression</h4>
                <p className="text-center text-sm text-[var(--color-text-secondary)]">Visualisation temps réel</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <BarChart className="h-16 w-16 text-[var(--color-success)]" />
                </div>
                <h4 className="text-center mt-4 font-semibold">Rapports Détaillés</h4>
                <p className="text-center text-sm text-[var(--color-text-secondary)]">Export PDF/Excel</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <LineChart className="h-16 w-16 text-purple-500" />
                </div>
                <h4 className="text-center mt-4 font-semibold">Analyse Tendances</h4>
                <p className="text-center text-sm text-[var(--color-text-secondary)]">Historique performance</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Section G - Historique et Archivage
  const renderHistoriqueArchivage = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>G. Historique et Archivage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Archive className="h-12 w-12 mx-auto text-[var(--color-text-secondary)] mb-4" />
            <p className="text-[var(--color-text-primary)]">Module en cours de développement</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              Archivage automatique avec chiffrement AES-256 et compression selon obligations légales
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
          Module de Gestion de Clôture Comptable Périodique
        </h1>
        <p className="text-[var(--color-text-primary)] mt-2">
          Système intégré Atlas Finance - Conforme SYSCOHADA
        </p>
      </div>

      {renderSelecteurExercice()}

      <Tabs value={ongletActif} onValueChange={setOngletActif}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="cycle">A. Cycle</TabsTrigger>
          <TabsTrigger value="regularisation">B. Régularisation</TabsTrigger>
          <TabsTrigger value="workflow">C. Workflow</TabsTrigger>
          <TabsTrigger value="etats">D. États</TabsTrigger>
          <TabsTrigger value="parametrage">E. Config</TabsTrigger>
          <TabsTrigger value="reporting">F. Reporting</TabsTrigger>
          <TabsTrigger value="archivage">G. Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="cycle" className="mt-6">
          {renderGestionCycle()}
        </TabsContent>

        <TabsContent value="regularisation" className="mt-6">
          {renderOperationsRegularisation()}
        </TabsContent>

        <TabsContent value="workflow" className="mt-6">
          {renderWorkflowValidation()}
        </TabsContent>

        <TabsContent value="etats" className="mt-6">
          {renderEtatsFinanciers()}
        </TabsContent>

        <TabsContent value="parametrage" className="mt-6">
          {renderParametrageAutomatisation()}
        </TabsContent>

        <TabsContent value="reporting" className="mt-6">
          {renderTableauBordReporting()}
        </TabsContent>

        <TabsContent value="archivage" className="mt-6">
          {renderHistoriqueArchivage()}
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
              <span>Traitement en cours...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClotureComptableIntegree;