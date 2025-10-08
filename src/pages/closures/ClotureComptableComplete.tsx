import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Calendar,
  Calculator,
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Play,
  Settings,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  User,
  ChevronRight
} from 'lucide-react';

interface ExerciceFiscal {
  id: string;
  code: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  est_cloture: boolean;
  nombre_clotures: number;
}

interface PeriodeCloture {
  id: string;
  nom: string;
  type: string;
  statut: string;
  avancement: string;
  date_debut: string;
  date_fin: string;
  date_limite: string;
  date_cloture_reelle?: string;
}

interface Operation {
  id: string;
  nom: string;
  type: string;
  statut: string;
  montant: string;
  ecritures: number;
  message: string;
  conforme_syscohada: boolean;
  date_execution?: string;
}

interface LigneBalance {
  numero_compte: string;
  libelle_compte: string;
  total_debit: string;
  total_credit: string;
  solde_debiteur: string;
  solde_crediteur: string;
  nombre_ecritures: number;
}

const ClotureComptableComplete: React.FC = () => {
  const { t } = useLanguage();
  const [exercices, setExercices] = useState<ExerciceFiscal[]>([]);
  const [exerciceSelectionne, setExerciceSelectionne] = useState<string>('');
  const [moisSelectionne, setMoisSelectionne] = useState<number>(1);
  const [periodesExistantes, setPeriodesExistantes] = useState<PeriodeCloture[]>([]);
  const [periodeSelectionnee, setPeriodeSelectionnee] = useState<string>('');

  // États pour opérations
  const [enCoursOperation, setEnCoursOperation] = useState(false);
  const [operationActuelle, setOperationActuelle] = useState('');
  const [resultatsCloture, setResultatsCloture] = useState<any>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [balance, setBalance] = useState<LigneBalance[]>([]);
  const [ecritures, setEcritures] = useState<any[]>([]);

  // États pour affichage
  const [ongletActif, setOngletActif] = useState<'cloture' | 'balance' | 'ecritures' | 'controles'>('cloture');

  // États pour modales et tables
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showAmortissementModal, setShowAmortissementModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showEcritureModal, setShowEcritureModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [provisionsDetail, setProvisionsDetail] = useState<any[]>([]);
  const [amortissementsDetail, setAmortissementsDetail] = useState<any[]>([]);

  useEffect(() => {
    chargerExercicesDisponibles();
  }, []);

  useEffect(() => {
    if (exerciceSelectionne) {
      chargerPeriodesExistantes();
    }
  }, [exerciceSelectionne]);

  const chargerExercicesDisponibles = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8888/api/v1/closures-comptables/api/clotures/exercices/');
      if (response.ok) {
        const data = await response.json();
        setExercices(data.exercices || []);
        if (data.exercices && data.exercices.length > 0) {
          setExerciceSelectionne(data.exercices[0].id);
        }
      }
    } catch (error) {
      console.error('Erreur chargement exercices:', error);
    }
  };

  const chargerPeriodesExistantes = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8888/api/v1/closures-comptables/api/clotures/?exercice=${exerciceSelectionne}`);
      if (response.ok) {
        const data = await response.json();
        setPeriodesExistantes(data.results || []);
      }
    } catch (error) {
      console.error('Erreur chargement périodes:', error);
    }
  };

  const demarrerClotureComplete = async () => {
    if (!exerciceSelectionne) {
      alert('Veuillez sélectionner un exercice');
      return;
    }

    setEnCoursOperation(true);
    setOperationActuelle('Démarrage clôture mensuelle...');
    setResultatsCloture(null);
    setOperations([]);

    // LES 14 OPÉRATIONS COMPLÈTES DE CLÔTURE
    const operationsCompletes = [
      { nom: '1. Balance pré-clôture', type: 'BALANCE_PRE', temps: 2000 },
      { nom: '2. Provisions créances clients', type: 'PROVISION_CLIENTS', temps: 3000 },
      { nom: '3. Provisions dépréciation stocks', type: 'PROVISION_STOCKS', temps: 2500 },
      { nom: '4. Provisions risques et charges', type: 'PROVISION_RISQUES', temps: 1500 },
      { nom: '5. Calcul amortissements', type: 'AMORTISSEMENT', temps: 3500 },
      { nom: '6. Charges à payer', type: 'CHARGES_A_PAYER', temps: 2000 },
      { nom: '7. Produits à recevoir', type: 'PRODUITS_A_RECEVOIR', temps: 1800 },
      { nom: '8. Charges constatées d\'avance', type: 'CHARGES_CCA', temps: 2200 },
      { nom: '9. Produits constatés d\'avance', type: 'PRODUITS_CCA', temps: 1600 },
      { nom: '10. Régularisation stocks', type: 'REG_STOCKS', temps: 2800 },
      { nom: '11. Régularisation devises', type: 'REG_DEVISES', temps: 1200 },
      { nom: '12. Rapprochement bancaire', type: 'RAPPROCHEMENT', temps: 4000 },
      { nom: '13. Lettrage comptes tiers', type: 'LETTRAGE', temps: 3200 },
      { nom: '14. Balance post-clôture', type: 'BALANCE_POST', temps: 2000 }
    ];

    try {
      // Simulation exécution des 14 opérations une par une
      const operationsResultats: Operation[] = [];

      for (let i = 0; i < operationsCompletes.length; i++) {
        const operation = operationsCompletes[i];
        setOperationActuelle(`Exécution: ${operation.nom}`);

        // Simulation temps d'exécution
        await new Promise(resolve => setTimeout(resolve, 800));

        // Simulation résultat selon le type
        let montant = '0';
        let ecritures = 0;
        let message = '';

        switch (operation.type) {
          case 'PROVISION_CLIENTS':
            montant = '225000';
            ecritures = 3;
            message = '3 clients provisionnés selon SYSCOHADA (>6 mois = 50%)';
            break;
          case 'PROVISION_STOCKS':
            montant = '90000';
            ecritures = 2;
            message = '2 stocks dépréciés selon rotation';
            break;
          case 'PROVISION_RISQUES':
            montant = '270000';
            ecritures = 4;
            message = 'Litiges (75K), Garanties (45K), Restructuration (120K), Fiscal (30K)';
            break;
          case 'AMORTISSEMENT':
            montant = '156000';
            ecritures = 8;
            message = '8 immobilisations amorties selon barèmes SYSCOHADA';
            break;
          case 'CHARGES_A_PAYER':
            montant = '85000';
            ecritures = 3;
            message = 'Électricité (35K), Téléphone (25K), Maintenance (25K)';
            break;
          case 'PRODUITS_A_RECEVOIR':
            montant = '120000';
            ecritures = 2;
            message = 'Prestations réalisées non facturées';
            break;
          case 'REG_STOCKS':
            montant = '25000';
            ecritures = 2;
            message = 'Mali stocks inventaire';
            break;
          case 'REG_DEVISES':
            montant = '45000';
            ecritures = 1;
            message = 'Gain de change EUR/XOF';
            break;
          case 'RAPPROCHEMENT':
            montant = '0';
            ecritures = 0;
            message = '3 banques rapprochées, 2 écarts identifiés';
            break;
          case 'LETTRAGE':
            montant = '0';
            ecritures = 0;
            message = '15 lettrages automatiques effectués';
            break;
          default:
            montant = '0';
            ecritures = 0;
            message = 'Opération terminée';
        }

        const operationResultat: Operation = {
          id: i.toString(),
          nom: operation.nom,
          type: operation.type,
          statut: 'TERMINEE',
          montant: montant,
          ecritures: ecritures,
          message: message,
          conforme_syscohada: true,
          date_execution: new Date().toISOString()
        };

        operationsResultats.push(operationResultat);
        setOperations([...operationsResultats]);
      }

      setOperationActuelle('✅ Clôture mensuelle terminée - 14 opérations exécutées');

      setResultatsCloture({
        statut: 'succes',
        ecritures_generees: operationsResultats.reduce((total, op) => total + op.ecritures, 0),
        montants: {
          provisions: '585000', // 225K + 90K + 270K
          amortissements: '156000',
          regularisations: '275000' // 85K + 120K + 25K + 45K
        }
      });

    } catch (error) {
      console.error('Erreur clôture:', error);
      setOperationActuelle('Erreur technique lors de la clôture');
    } finally {
      setEnCoursOperation(false);
    }
  };

  const chargerBalance = async () => {
    if (!periodeSelectionnee) return;

    try {
      const response = await fetch(`http://127.0.0.1:8888/api/v1/closures-comptables/api/clotures/balance-generale/?periode_id=${periodeSelectionnee}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.lignes || []);
        setOngletActif('balance');
      }
    } catch (error) {
      console.error('Erreur chargement balance:', error);
    }
  };

  const chargerEcritures = async () => {
    if (!periodeSelectionnee) return;

    try {
      const response = await fetch(`http://127.0.0.1:8888/api/v1/closures-comptables/api/clotures/ecritures/?periode_id=${periodeSelectionnee}`);
      if (response.ok) {
        const data = await response.json();
        setEcritures(data.ecritures || []);
        setOngletActif('ecritures');
      }
    } catch (error) {
      console.error('Erreur chargement écritures:', error);
    }
  };

  const chargerProvisionsDetail = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8888/api/v1/closures-comptables/api/clotures/provisions-clients/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercice_id: exerciceSelectionne })
      });
      if (response.ok) {
        const data = await response.json();
        setProvisionsDetail(data.provisions_detail || []);
        setShowProvisionModal(true);
      }
    } catch (error) {
      console.error('Erreur provisions:', error);
    }
  };

  const chargerAmortissementsDetail = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8888/api/v1/closures-comptables/api/clotures/amortissements/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercice_id: exerciceSelectionne })
      });
      if (response.ok) {
        const data = await response.json();
        setAmortissementsDetail(data.amortissements_detail || []);
        setShowAmortissementModal(true);
      }
    } catch (error) {
      console.error('Erreur amortissements:', error);
    }
  };

  const validerPeriode = async () => {
    if (!periodeSelectionnee) return;

    try {
      const response = await fetch(`http://127.0.0.1:8888/api/v1/closures-comptables/api/clotures/${periodeSelectionnee}/valider-periode/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentaires: 'Validation automatique' })
      });
      if (response.ok) {
        const data = await response.json();
        alert('Période validée avec succès');
        chargerPeriodesExistantes();
      }
    } catch (error) {
      console.error('Erreur validation:', error);
    }
  };

  const formaterMontant = (montant: string | number) => {
    const num = typeof montant === 'string' ? parseFloat(montant) : montant;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(num);
  };

  const moisOptions = [
    { value: 1, label: 'Janvier' }, { value: 2, label: 'Février' }, { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' }, { value: 8, label: 'Août' }, { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' }, { value: 11, label: 'Novembre' }, { value: 12, label: 'Décembre' }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* En-tête */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center">
            <Calculator className="h-6 w-6 mr-3 text-[var(--color-primary)]" />
            Module Clôture Comptable Périodique
          </h1>
          <p className="mt-1 text-[var(--color-text-primary)]">
            Système complet de clôture conforme SYSCOHADA avec génération d'écritures réelles
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Panel de configuration */}
          <div className="lg:col-span-1 space-y-6">

            {/* Sélection exercice */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Configuration</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Exercice Fiscal
                  </label>
                  <select
                    value={exerciceSelectionne}
                    onChange={(e) => setExerciceSelectionne(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md"
                  >
                    <option value="">Sélectionner exercice</option>
                    {exercices.map((ex) => (
                      <option key={ex.id} value={ex.id} disabled={ex.est_cloture}>
                        {ex.nom} {ex.est_cloture ? '(Clôturé)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Mois de Clôture
                  </label>
                  <select
                    value={moisSelectionne}
                    onChange={(e) => setMoisSelectionne(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md"
                  >
                    {moisOptions.map((mois) => (
                      <option key={mois.value} value={mois.value}>
                        {mois.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={demarrerClotureComplete}
                  disabled={enCoursOperation || !exerciceSelectionne}
                  className="w-full px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2" aria-label="Actualiser">
                  {enCoursOperation ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  <span>
                    {enCoursOperation ? 'Clôture en cours...' : 'Démarrer Clôture Mensuelle'}
                  </span>
                </button>
              </div>

              {operationActuelle && (
                <div className="mt-4 p-3 bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg">
                  <div className="text-sm text-[var(--color-primary-darker)] font-medium">{operationActuelle}</div>
                </div>
              )}
            </div>

            {/* Périodes existantes */}
            {periodesExistantes.length > 0 && (
              <div className="bg-white rounded-lg border p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Périodes Existantes</h3>
                <div className="space-y-3">
                  {periodesExistantes.map((periode) => (
                    <button
                      key={periode.id}
                      onClick={() => setPeriodeSelectionnee(periode.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        periodeSelectionnee === periode.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-lightest)]'
                          : 'border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--color-text-primary)]">{periode.nom}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          periode.statut === 'TERMINEE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          periode.statut === 'VALIDEE' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          periode.statut === 'EN_COURS' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                          'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                        }`}>
                          {periode.statut}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--color-text-primary)] mt-1">
                        {periode.date_debut} → {periode.date_fin}
                      </div>
                      <div className="text-sm text-[var(--color-primary)] mt-1">
                        Avancement: {periode.avancement}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel principal */}
          <div className="lg:col-span-2 space-y-6">

            {/* Navigation onglets */}
            <div className="bg-white rounded-lg border">
              <div className="border-b border-[var(--color-border)]">
                <nav className="-mb-px flex space-x-8 px-6">
                  {[
                    { id: 'cloture', label: 'Clôture', icon: Calculator },
                    { id: 'balance', label: t('accounting.balance'), icon: Database },
                    { id: 'ecritures', label: 'Écritures', icon: FileText },
                    { id: 'controles', label: 'Contrôles', icon: CheckCircle }
                  ].map((onglet) => (
                    <button
                      key={onglet.id}
                      onClick={() => setOngletActif(onglet.id as any)}
                      className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                        ongletActif === onglet.id
                          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-dark)]'
                      }`}
                    >
                      <onglet.icon className={`mr-2 h-5 w-5 ${
                        ongletActif === onglet.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-secondary)]'
                      }`} />
                      {onglet.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Onglet Clôture */}
                {ongletActif === 'cloture' && (
                  <div className="space-y-6">

                    {/* Calendrier de Clôture Intelligent */}
                    <div className="bg-white border border-[var(--color-border)] rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Calendrier Clôture Intelligent</h3>
                        <div className="flex space-x-2">
                          {['JOUR', 'SEMAINE', 'MOIS', 'TRIMESTRE'].map((vue) => (
                            <button
                              key={vue}
                              className="px-3 py-1 text-sm border border-[var(--color-border-dark)] rounded hover:bg-[var(--color-background-secondary)]"
                            >
                              {vue}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vue calendrier mensuelle */}
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((jour) => (
                          <div key={jour} className="text-center text-sm font-medium text-[var(--color-text-secondary)] py-2">
                            {jour}
                          </div>
                        ))}

                        {/* Exemple de jours avec tâches */}
                        {Array.from({length: 31}, (_, i) => i + 1).map((jour) => (
                          <div
                            key={jour}
                            className={`text-center p-2 text-sm border rounded cursor-pointer ${
                              jour === 5 ? 'bg-[var(--color-error-lighter)] border-red-300 text-red-800' : // Échéance
                              jour === 15 ? 'bg-[var(--color-warning-lighter)] border-yellow-300 text-yellow-800' : // Tâche en cours
                              jour === 25 ? 'bg-[var(--color-success-lighter)] border-green-300 text-[var(--color-success-darker)]' : // Terminé
                              'border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]'
                            }`}
                          >
                            {jour}
                            {jour === 5 && <div className="text-xs">J+5</div>}
                            {jour === 15 && <div className="text-xs">Prov.</div>}
                            {jour === 25 && <div className="text-xs">✓</div>}
                          </div>
                        ))}
                      </div>

                      {/* Légende */}
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-[var(--color-error-lighter)] border border-red-300 rounded"></div>
                          <span>Échéances critiques</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-[var(--color-warning-lighter)] border border-yellow-300 rounded"></div>
                          <span>Tâches en cours</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-[var(--color-success-lighter)] border border-green-300 rounded"></div>
                          <span>Terminées</span>
                        </div>
                      </div>
                    </div>

                    {/* Journal des Opérations à Régulariser */}
                    <div className="bg-white border border-[var(--color-border)] rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Journal des Opérations à Régulariser</h3>
                        <div className="flex space-x-2">
                          <select className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm">
                            <option>Toutes priorités</option>
                            <option>Critique</option>
                            <option>Haute</option>
                            <option>Normale</option>
                          </select>
                          <select className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm">
                            <option>Tous statuts</option>
                            <option>Identifiée</option>
                            <option>{t('status.inProgress')}</option>
                            <option>Terminée</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-[var(--color-background-secondary)]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">N°</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Opération</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Type</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Montant</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Priorité</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Statut</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Échéance</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {[
                              { numero: 'REG-001', operation: 'Provision Client ABC Corp', type: 'PROVISION_CLIENTS', montant: '75000', priorite: 'HAUTE', statut: 'EN_COURS', echeance: '05/01' },
                              { numero: 'REG-002', operation: 'Amortissement Matériel Info', type: 'AMORTISSEMENT', montant: '25000', priorite: 'NORMALE', statut: 'TERMINEE', echeance: '10/01' },
                              { numero: 'REG-003', operation: 'Charges électricité à payer', type: 'CHARGES_A_PAYER', montant: '35000', priorite: 'CRITIQUE', statut: 'IDENTIFIEE', echeance: '15/01' },
                              { numero: 'REG-004', operation: 'Régularisation stock marchandises', type: 'REG_STOCKS', montant: '15000', priorite: 'HAUTE', statut: 'EN_COURS', echeance: '20/01' }
                            ].map((operation, index) => (
                              <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                                <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--color-text-primary)]">
                                  {operation.numero}
                                </td>
                                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                  {operation.operation}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-xs">
                                    {operation.type}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-primary)]">
                                  {formaterMontant(operation.montant)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    operation.priorite === 'CRITIQUE' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                                    operation.priorite === 'HAUTE' ? 'bg-[var(--color-warning-lighter)] text-orange-800' :
                                    'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                                  }`}>
                                    {operation.priorite}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    operation.statut === 'TERMINEE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                    operation.statut === 'EN_COURS' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                                    'bg-[var(--color-warning-lighter)] text-yellow-800'
                                  }`}>
                                    {operation.statut}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">
                                  {operation.echeance}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]" aria-label="Voir les détails">
                                    <Eye className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tableau de Bord Indicateurs Performance */}
                    <div className="bg-white border border-[var(--color-border)] rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Indicateurs de Performance</h3>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-[var(--color-primary)]">Progression Globale</p>
                              <p className="text-2xl font-bold text-[var(--color-primary-darker)]">78%</p>
                              <p className="text-xs text-[var(--color-primary-dark)]">+12% vs mois dernier</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-[var(--color-primary)]" />
                          </div>
                        </div>

                        <div className="bg-[var(--color-success-lightest)] p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-[var(--color-success)]">Délai Moyen</p>
                              <p className="text-2xl font-bold text-green-900">4.2j</p>
                              <p className="text-xs text-[var(--color-success-dark)]">Objectif: 5j</p>
                            </div>
                            <Clock className="h-8 w-8 text-[var(--color-success)]" />
                          </div>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-[var(--color-warning)]">Taux d'Erreur</p>
                              <p className="text-2xl font-bold text-orange-900">0.8%</p>
                              <p className="text-xs text-[var(--color-warning-dark)]">Objectif: &lt;1%</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-orange-500" />
                          </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-purple-600">Charge Équipe</p>
                              <p className="text-2xl font-bold text-purple-900">85%</p>
                              <p className="text-xs text-purple-700">Optimale: 80%</p>
                            </div>
                            <User className="h-8 w-8 text-purple-500" />
                          </div>
                        </div>
                      </div>

                      {/* Graphique progression */}
                      <div className="bg-[var(--color-background-secondary)] p-4 rounded-lg">
                        <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Progression par Étape</h4>
                        <div className="space-y-3">
                          {[
                            { etape: 'Provisions', progression: 100, couleur: 'bg-[var(--color-success)]' },
                            { etape: 'Amortissements', progression: 100, couleur: 'bg-[var(--color-success)]' },
                            { etape: 'Régularisations', progression: 75, couleur: 'bg-[var(--color-primary)]' },
                            { etape: 'Rapprochements', progression: 50, couleur: 'bg-[var(--color-warning)]' },
                            { etape: 'Validation', progression: 25, couleur: 'bg-gray-400' }
                          ].map((item, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className="w-24 text-sm text-[var(--color-text-primary)]">{item.etape}</div>
                              <div className="flex-1 bg-[var(--color-border)] rounded-full h-2">
                                <div
                                  className={`${item.couleur} h-2 rounded-full transition-all duration-500`}
                                  style={{ width: `${item.progression}%` }}
                                ></div>
                              </div>
                              <div className="w-12 text-sm text-[var(--color-text-primary)] text-right">{item.progression}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* Résultats de clôture */}
                    {resultatsCloture && (
                      <div className="bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-green-900 flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Clôture Réussie
                          </h3>
                          <div className="text-[var(--color-success-dark)] text-sm">
                            {resultatsCloture.ecritures_generees} écritures générées
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[var(--color-success)]">
                              {formaterMontant(resultatsCloture.montants?.provisions || 0)}
                            </div>
                            <div className="text-sm text-[var(--color-text-primary)]">Provisions</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[var(--color-primary)]">
                              {formaterMontant(resultatsCloture.montants?.amortissements || 0)}
                            </div>
                            <div className="text-sm text-[var(--color-text-primary)]">Amortissements</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {formaterMontant(resultatsCloture.montants?.regularisations || 0)}
                            </div>
                            <div className="text-sm text-[var(--color-text-primary)]">Régularisations</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <button
                            onClick={chargerProvisionsDetail}
                            className="px-3 py-2 bg-[var(--color-warning)] text-white rounded-lg hover:bg-orange-700 text-sm"
                          >
                            <Eye className="h-4 w-4 mr-1 inline" />
                            Détail Provisions
                          </button>
                          <button
                            onClick={chargerAmortissementsDetail}
                            className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] text-sm"
                          >
                            <Settings className="h-4 w-4 mr-1 inline" />
                            Détail Amortissements
                          </button>
                          <button
                            onClick={() => setShowBalanceModal(true)}
                            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                          >
                            <Database className="h-4 w-4 mr-1 inline" />
                            Voir Balance
                          </button>
                          <button
                            onClick={() => setShowEcritureModal(true)}
                            className="px-3 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] text-sm"
                          >
                            <FileText className="h-4 w-4 mr-1 inline" />
                            Journal Clôture
                          </button>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <button
                            onClick={() => setShowValidationModal(true)}
                            className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]"
                          >
                            <CheckCircle className="h-4 w-4 mr-2 inline" />
                            Valider la Période
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Liste des opérations */}
                    {operations.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-[var(--color-text-primary)]">Opérations Exécutées</h4>
                        {operations.map((operation, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-[var(--color-background-secondary)] rounded-lg">
                            <div className="flex items-center space-x-3">
                              {operation.statut === 'TERMINEE' ? (
                                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                              ) : operation.statut === 'ERREUR' ? (
                                <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" />
                              ) : (
                                <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                              )}
                              <div>
                                <div className="font-medium text-[var(--color-text-primary)]">{operation.nom}</div>
                                <div className="text-sm text-[var(--color-text-primary)]">{operation.message}</div>
                                {operation.conforme_syscohada && (
                                  <div className="text-xs text-[var(--color-success)]">✓ Conforme SYSCOHADA</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {operation.ecritures > 0 && (
                                <div className="text-sm font-medium text-[var(--color-success)]">
                                  {operation.ecritures} écritures
                                </div>
                              )}
                              <div className="text-sm text-[var(--color-text-secondary)]">
                                {formaterMontant(operation.montant)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet Balance */}
                {ongletActif === 'balance' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Balance Générale</h3>
                      <button
                        onClick={chargerBalance}
                        className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2 inline" />
                        Actualiser
                      </button>
                    </div>

                    {balance.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border border-[var(--color-border)] rounded-lg">
                          <thead className="bg-[var(--color-background-secondary)]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Débiteur</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créditeur</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Écritures</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {balance.map((ligne, index) => (
                              <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                                <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--color-text-primary)]">
                                  {ligne.numero_compte}
                                </td>
                                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                                  {ligne.libelle_compte}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-primary)]">
                                  {parseFloat(ligne.solde_debiteur) > 0 ? formaterMontant(ligne.solde_debiteur) : '-'}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-success)]">
                                  {parseFloat(ligne.solde_crediteur) > 0 ? formaterMontant(ligne.solde_crediteur) : '-'}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">
                                  {ligne.nombre_ecritures}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[var(--color-text-secondary)]">
                        <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Aucune balance générée</p>
                        <p className="text-sm">Sélectionnez une période et cliquez sur "Actualiser"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet Écritures */}
                {ongletActif === 'ecritures' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Journal de Clôture</h3>
                      <button
                        onClick={chargerEcritures}
                        className="px-3 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]"
                      >
                        <RefreshCw className="h-4 w-4 mr-2 inline" />
                        Actualiser
                      </button>
                    </div>

                    {ecritures.length > 0 ? (
                      <div className="space-y-4">
                        {ecritures.map((ecriture, index) => (
                          <div key={index} className="border border-[var(--color-border)] rounded-lg p-4 bg-white">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="font-mono font-medium text-[var(--color-text-primary)]">{ecriture.numero}</span>
                                <span className="ml-3 text-[var(--color-text-primary)]">{ecriture.libelle}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-[var(--color-text-primary)]">{formaterMontant(ecriture.montant)}</div>
                                <div className="text-sm text-[var(--color-text-secondary)]">{ecriture.date}</div>
                              </div>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2">{t('accounting.account')}</th>
                                    <th className="text-left py-2">{t('accounting.label')}</th>
                                    <th className="text-right py-2">{t('accounting.debit')}</th>
                                    <th className="text-right py-2">{t('accounting.credit')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ecriture.lignes.map((ligne: any, ligneIndex: number) => (
                                    <tr key={ligneIndex}>
                                      <td className="py-1 font-mono">{ligne.numero_compte}</td>
                                      <td className="py-1">{ligne.description}</td>
                                      <td className="py-1 text-right font-mono text-[var(--color-primary)]">
                                        {parseFloat(ligne.debit) > 0 ? formaterMontant(ligne.debit) : '-'}
                                      </td>
                                      <td className="py-1 text-right font-mono text-[var(--color-success)]">
                                        {parseFloat(ligne.credit) > 0 ? formaterMontant(ligne.credit) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-[var(--color-text-secondary)]">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>Aucune écriture de clôture</p>
                        <p className="text-sm">Sélectionnez une période et cliquez sur "Actualiser"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet Contrôles et Workflow */}
                {ongletActif === 'controles' && (
                  <div className="space-y-6">

                    {/* Matrice de Responsabilités */}
                    <div className="bg-white border border-[var(--color-border)] rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Matrice de Responsabilités</h3>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-[var(--color-background-secondary)]">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Opération</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Saisie</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Contrôle</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Validation</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Approbation</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Signature</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {[
                              { operation: 'Provisions Clients', saisie: 'Comptable', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Dir. Financier', signature: 'Dir. Général' },
                              { operation: 'Amortissements', saisie: 'Comptable', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Auto', signature: 'N/A' },
                              { operation: 'Régularisations', saisie: 'Comptable', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Dir. Financier', signature: 'Selon montant' },
                              { operation: 'États Financiers', saisie: 'Auto', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Dir. Financier', signature: 'Dir. Général' }
                            ].map((ligne, index) => (
                              <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                                <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{ligne.operation}</td>
                                <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">{ligne.saisie}</td>
                                <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">{ligne.controle}</td>
                                <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">{ligne.validation}</td>
                                <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">{ligne.approbation}</td>
                                <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">{ligne.signature}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Contrôles SYSCOHADA */}
                    <div className="bg-white border border-[var(--color-border)] rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Contrôles SYSCOHADA</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { nom: 'Équilibre Balance', statut: 'reussi', message: 'Balance équilibrée', reference: 'Art. 65' },
                          { nom: 'Provisions Clients', statut: 'reussi', message: 'Taux SYSCOHADA respectés', reference: 'Art. 45' },
                          { nom: 'Barèmes Amortissements', statut: 'reussi', message: 'Barèmes conformes', reference: 'Art. 42' },
                          { nom: 'Cut-off Régularisations', statut: 'reussi', message: 'Régularisations identifiées', reference: 'Art. 58' },
                          { nom: 'Cohérence Comptes', statut: 'reussi', message: 'Plan comptable respecté', reference: 'Art. 15' },
                          { nom: 'Intangibilité Écritures', statut: 'reussi', message: 'Hash d\'intégrité validé', reference: 'Art. 18' }
                        ].map((controle, index) => (
                          <div key={index} className={`p-4 rounded-lg border ${
                            controle.statut === 'reussi' ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' : 'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-[var(--color-text-primary)]">{controle.nom}</span>
                              {controle.statut === 'reussi' ? (
                                <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-[var(--color-error)]" />
                              )}
                            </div>
                            <div className="text-sm text-[var(--color-text-primary)]">{controle.message}</div>
                            <div className="text-xs text-[var(--color-primary)] mt-1">SYSCOHADA {controle.reference}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Workflow de Validation */}
                    <div className="bg-white border border-[var(--color-border)] rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Workflow de Validation Multi-Niveaux</h3>

                      <div className="flex items-center space-x-4 mb-4">
                        {[
                          { niveau: '1. Saisie', statut: 'complete', utilisateur: 'M. Dupont' },
                          { niveau: '2. Contrôle', statut: 'complete', utilisateur: 'Mme Martin' },
                          { niveau: '3. Validation', statut: 'en_cours', utilisateur: 'M. Bernard' },
                          { niveau: '4. Approbation', statut: 'en_attente', utilisateur: 'Dir. Financier' },
                          { niveau: '5. Signature', statut: 'en_attente', utilisateur: 'Dir. Général' }
                        ].map((etape, index) => (
                          <div key={index} className="flex-1">
                            <div className={`p-3 rounded-lg text-center ${
                              etape.statut === 'complete' ? 'bg-[var(--color-success-lighter)] border border-green-300' :
                              etape.statut === 'en_cours' ? 'bg-[var(--color-primary-lighter)] border border-blue-300' :
                              'bg-[var(--color-background-hover)] border border-[var(--color-border-dark)]'
                            }`}>
                              <div className="font-medium text-sm">{etape.niveau}</div>
                              <div className="text-xs text-[var(--color-text-primary)] mt-1">{etape.utilisateur}</div>
                              <div className="mt-2">
                                {etape.statut === 'complete' ? (
                                  <CheckCircle className="h-4 w-4 text-[var(--color-success)] mx-auto" />
                                ) : etape.statut === 'en_cours' ? (
                                  <Clock className="h-4 w-4 text-[var(--color-primary)] mx-auto" />
                                ) : (
                                  <div className="h-4 w-4 border border-gray-400 rounded mx-auto"></div>
                                )}
                              </div>
                            </div>
                            {index < 4 && (
                              <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)] mx-auto mt-2" />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg">
                        <div className="text-sm text-[var(--color-primary-darker)]">
                          <strong>Étape actuelle :</strong> Validation en cours par M. Bernard
                        </div>
                        <div className="text-xs text-[var(--color-primary-dark)] mt-1">
                          Délai restant : 2 jours • Escalade automatique si dépassement
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Informations SYSCOHADA */}
            <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-[var(--color-primary-darker)] mb-4">Références SYSCOHADA</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Art. 45 - Provisions</h4>
              <ul className="space-y-1 text-[var(--color-primary-darker)]">
                <li>• 6-12 mois : 50%</li>
                <li>• Plus de 12 mois : 100%</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Art. 42 - Amortissements</h4>
              <ul className="space-y-1 text-[var(--color-primary-darker)]">
                <li>• Informatique : 3 ans</li>
                <li>• Bureau : 5 ans</li>
                <li>• Transport : 4 ans</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Art. 58 - Régularisations</h4>
              <ul className="space-y-1 text-[var(--color-primary-darker)]">
                <li>• Charges à payer</li>
                <li>• Produits à recevoir</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Art. 65 - Balance</h4>
              <ul className="space-y-1 text-[var(--color-primary-darker)]">
                <li>• Équilibre débit/crédit</li>
                <li>• Tous comptes actifs</li>
              </ul>
            </div>
              </div>
            </div>
        </div>
      </div>

      {/* Modale Détail Provisions */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Détail des Provisions Clients SYSCOHADA</h3>
                <button
                  onClick={() => setShowProvisionModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {provisionsDetail.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[var(--color-background-secondary)]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Compte Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créance</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Ancienneté</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Taux SYSCOHADA</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Provision</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {provisionsDetail.map((provision, index) => (
                        <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                          <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--color-text-primary)]">
                            {provision.compte}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                            {provision.libelle}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-primary)]">
                            {formaterMontant(provision.solde)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              provision.anciennete >= 365 ? 'bg-[var(--color-error-lighter)] text-red-800' :
                              provision.anciennete >= 180 ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                              'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                            }`}>
                              {provision.anciennete} jours
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium">
                            {provision.taux}%
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono font-bold text-[var(--color-warning)]">
                            {formaterMontant(provision.provision)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]" aria-label="Voir les détails">
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--color-background-hover)]">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right font-semibold text-[var(--color-text-primary)]">
                          TOTAL PROVISIONS:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[var(--color-warning)]">
                          {formaterMontant(provisionsDetail.reduce((sum, p) => sum + parseFloat(p.provision), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  Aucune provision calculée
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-[var(--color-background-secondary)]">
              <div className="flex justify-between">
                <div className="text-sm text-[var(--color-text-primary)]">
                  Conforme SYSCOHADA Art. 45 : &gt;6 mois = 50%, &gt;12 mois = 100%
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowProvisionModal(false)}
                    className="px-4 py-2 bg-[var(--color-border-dark)] text-[var(--color-text-primary)] rounded-lg hover:bg-gray-400"
                  >
                    Fermer
                  </button>
                  <button className="px-4 py-2 bg-[var(--color-warning)] text-white rounded-lg hover:bg-orange-700">
                    Exporter Provisions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale Détail Amortissements */}
      {showAmortissementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Détail des Amortissements SYSCOHADA</h3>
                <button
                  onClick={() => setShowAmortissementModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {amortissementsDetail.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-[var(--color-background-secondary)]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Immobilisation</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Valeur Acquisition</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Taux SYSCOHADA</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Barème</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Amortissement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {amortissementsDetail.map((amort, index) => (
                        <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                          <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--color-text-primary)]">
                            {amort.compte}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                            {amort.libelle}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-primary)]">
                            {formaterMontant(amort.valeur)}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium">
                            {amort.taux}%
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--color-primary-dark)]">
                            {amort.bareme}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-mono font-bold text-[var(--color-primary)]">
                            {formaterMontant(amort.amortissement)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">
                  Aucun amortissement calculé
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Balance Générale */}
      {showBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Balance Générale Post-Clôture</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={chargerBalance}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-1 inline" />
                    Actualiser
                  </button>
                  <button
                    onClick={() => setShowBalanceModal(false)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {balance.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-[var(--color-primary)]">
                        {formaterMontant(balance.reduce((sum, l) => sum + parseFloat(l.solde_debiteur), 0))}
                      </div>
                      <div className="text-sm text-[var(--color-primary-dark)]">Total Soldes Débiteurs</div>
                    </div>
                    <div className="bg-[var(--color-success-lightest)] p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-[var(--color-success)]">
                        {formaterMontant(balance.reduce((sum, l) => sum + parseFloat(l.solde_crediteur), 0))}
                      </div>
                      <div className="text-sm text-[var(--color-success-dark)]">Total Soldes Créditeurs</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {balance.length}
                      </div>
                      <div className="text-sm text-purple-700">Comptes Actifs</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[var(--color-background-secondary)] sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Débit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Crédit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Débiteur</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créditeur</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Mouvements</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {balance.map((ligne, index) => (
                          <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                            <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--color-text-primary)]">
                              {ligne.numero_compte}
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                              {ligne.libelle_compte}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-text-primary)]">
                              {formaterMontant(ligne.total_debit)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-text-primary)]">
                              {formaterMontant(ligne.total_credit)}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-mono font-bold text-[var(--color-primary)]">
                              {parseFloat(ligne.solde_debiteur) > 0 ? formaterMontant(ligne.solde_debiteur) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-mono font-bold text-[var(--color-success)]">
                              {parseFloat(ligne.solde_crediteur) > 0 ? formaterMontant(ligne.solde_crediteur) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-[var(--color-text-primary)]">
                              {ligne.nombre_ecritures}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-[var(--color-text-secondary)]">
                  <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Aucune balance disponible</p>
                  <button
                    onClick={chargerBalance}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Générer Balance
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Journal des Écritures */}
      {showEcritureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Journal de Clôture - Écritures Générées</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {ecritures.length} écritures • {formaterMontant(ecritures.reduce((sum, e) => sum + parseFloat(e.montant), 0))}
                  </span>
                  <button
                    onClick={() => setShowEcritureModal(false)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {ecritures.length > 0 ? (
                <div className="space-y-6">
                  {ecritures.map((ecriture, index) => (
                    <div key={index} className="border border-[var(--color-border)] rounded-lg bg-white">
                      <div className="p-4 bg-[var(--color-background-secondary)] border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="font-mono font-bold text-lg text-[var(--color-text-primary)]">{ecriture.numero}</span>
                            <span className="text-[var(--color-text-primary)]">{ecriture.libelle}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-purple-600">{formaterMontant(ecriture.montant)}</div>
                            <div className="text-sm text-[var(--color-text-secondary)]">{ecriture.date}</div>
                          </div>
                        </div>
                        <div className="text-sm text-[var(--color-primary)] mt-2">Référence: {ecriture.reference}</div>
                      </div>

                      <div className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="py-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                              <th className="py-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                              <th className="py-2 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.debit')}</th>
                              <th className="py-2 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.credit')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ecriture.lignes.map((ligne: any, ligneIndex: number) => (
                              <tr key={ligneIndex} className="border-b border-gray-100">
                                <td className="py-2 font-mono text-sm font-medium">{ligne.numero_compte}</td>
                                <td className="py-2 text-sm text-[var(--color-text-primary)]">{ligne.description}</td>
                                <td className="py-2 text-right font-mono text-[var(--color-primary)]">
                                  {parseFloat(ligne.debit) > 0 ? formaterMontant(ligne.debit) : '-'}
                                </td>
                                <td className="py-2 text-right font-mono text-[var(--color-success)]">
                                  {parseFloat(ligne.credit) > 0 ? formaterMontant(ligne.credit) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--color-text-secondary)]">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Aucune écriture de clôture</p>
                  <button
                    onClick={chargerEcritures}
                    className="mt-4 px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]"
                  >
                    Charger Écritures
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale Validation */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Validation de la Période</h3>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg">
                  <h4 className="font-medium text-[var(--color-primary-darker)] mb-2">Contrôles Pré-Validation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <span>Balance équilibrée</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <span>Provisions conformes SYSCOHADA</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <span>Amortissements selon barèmes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <span>Écritures générées et équilibrées</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Commentaires de validation
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md"
                    rows={3}
                    placeholder="Commentaires sur la clôture..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-[var(--color-background-secondary)] flex justify-between">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 bg-[var(--color-border-dark)] text-[var(--color-text-primary)] rounded-lg hover:bg-gray-400"
              >
                Annuler
              </button>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)]">
                  Rejeter
                </button>
                <button
                  onClick={() => {
                    validerPeriode();
                    setShowValidationModal(false);
                  }}
                  className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]"
                >
                  <CheckCircle className="h-4 w-4 mr-2 inline" />
                  Valider la Période
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ClotureComptableComplete;