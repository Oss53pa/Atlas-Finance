import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
  Edit,
  Save,
  X,
  RefreshCw,
  User,
  Mail
} from 'lucide-react';

interface Balance {
  compte: string;
  libelle: string;
  debit_total: number;
  credit_total: number;
  solde_debiteur: number;
  solde_crediteur: number;
  nb_ecritures: number;
}

interface EcritureClôture {
  id: string;
  numero: string;
  date: string;
  libelle: string;
  debit: number;
  credit: number;
  compte_debit: string;
  compte_credit: string;
  statut: 'BROUILLON' | 'VALIDEE' | 'APPROUVEE';
  creee_par: string;
  validee_par?: string;
}

interface ProvisionProposee {
  id: string;
  client: string;
  solde: number;
  anciennete_jours: number;
  taux_syscohada: number;
  provision_proposee: number;
  statut: 'PROPOSEE' | 'VALIDEE' | 'REJETEE';
  justification: string;
}

const ModuleClotureComplet: React.FC = () => {
  const { t } = useLanguage();
  // États principaux
  const [exerciceSelectionne, setExerciceSelectionne] = useState('2024');
  const [moisSelectionne, setMoisSelectionne] = useState(1);
  const [ongletActif, setOngletActif] = useState<'balances' | 'provisions' | 'ecritures' | 'calendrier' | 'exports'>('balances');

  // Données comptables réelles
  const [balancePreCloture, setBalancePreCloture] = useState<Balance[]>([]);
  const [balancePostCloture, setBalancePostCloture] = useState<Balance[]>([]);
  const [provisionsProposees, setProvisionsProposees] = useState<ProvisionProposee[]>([]);
  const [ecritures, setEcritures] = useState<EcritureClôture[]>([]);

  // États d'interface
  const [chargement, setChargement] = useState(false);
  const [ecritureSelectionnee, setEcritureSelectionnee] = useState<EcritureClôture | null>(null);
  const [modalOuverte, setModalOuverte] = useState<'ecriture' | 'provision' | 'export' | null>(null);

  useEffect(() => {
    chargerBalancePreCloture();
  }, [exerciceSelectionne, moisSelectionne]);

  const chargerBalancePreCloture = async () => {
    setChargement(true);

    // Simulation de données réelles de balance
    const balanceSimulee: Balance[] = [
      { compte: '101000', libelle: 'Capital social', debit_total: 0, credit_total: 10000000, solde_debiteur: 0, solde_crediteur: 10000000, nb_ecritures: 1 },
      { compte: '411001', libelle: 'Client ABC Corp', debit_total: 1500000, credit_total: 1200000, solde_debiteur: 300000, solde_crediteur: 0, nb_ecritures: 15 },
      { compte: '411002', libelle: 'Client XYZ Ltd', debit_total: 800000, credit_total: 600000, solde_debiteur: 200000, solde_crediteur: 0, nb_ecritures: 8 },
      { compte: '512100', libelle: 'Banque BCEAO', debit_total: 5200000, credit_total: 4800000, solde_debiteur: 400000, solde_crediteur: 0, nb_ecritures: 45 },
      { compte: '245000', libelle: 'Matériel informatique', debit_total: 1200000, credit_total: 0, solde_debiteur: 1200000, solde_crediteur: 0, nb_ecritures: 3 },
      { compte: '371000', libelle: 'Stocks marchandises', debit_total: 850000, credit_total: 670000, solde_debiteur: 180000, solde_crediteur: 0, nb_ecritures: 25 },
      { compte: '607000', libelle: 'Achats marchandises', debit_total: 8500000, credit_total: 0, solde_debiteur: 8500000, solde_crediteur: 0, nb_ecritures: 120 },
      { compte: '701000', libelle: 'Ventes marchandises', debit_total: 0, credit_total: 12500000, solde_debiteur: 0, solde_crediteur: 12500000, nb_ecritures: 150 }
    ];

    setBalancePreCloture(balanceSimulee);
    setChargement(false);
  };

  const proposerProvisions = async () => {
    setChargement(true);

    // Calcul des provisions selon SYSCOHADA basé sur la balance réelle
    const provisions: ProvisionProposee[] = [];

    balancePreCloture.forEach(ligne => {
      if (ligne.compte.startsWith('411') && ligne.solde_debiteur > 0) {
        // Simulation de l'ancienneté
        let anciennete = 0;
        let taux = 0;

        if (ligne.compte === '411001') {
          anciennete = 210; // 7 mois
          taux = 50; // SYSCOHADA : 6-12 mois = 50%
        } else if (ligne.compte === '411002') {
          anciennete = 400; // 13 mois
          taux = 100; // SYSCOHADA : >12 mois = 100%
        }

        if (taux > 0) {
          provisions.push({
            id: ligne.compte,
            client: ligne.libelle,
            solde: ligne.solde_debiteur,
            anciennete_jours: anciennete,
            taux_syscohada: taux,
            provision_proposee: (ligne.solde_debiteur * taux / 100),
            statut: 'PROPOSEE',
            justification: `Ancienneté ${anciennete} jours - Taux SYSCOHADA ${taux}%`
          });
        }
      }
    });

    setProvisionsProposees(provisions);
    setChargement(false);
  };

  const validerProvision = (provisionId: string, action: 'VALIDER' | 'REJETER') => {
    setProvisionsProposees(prev =>
      prev.map(p =>
        p.id === provisionId
          ? { ...p, statut: action === 'VALIDER' ? 'VALIDEE' : 'REJETEE' }
          : p
      )
    );

    if (action === 'VALIDER') {
      // Générer l'écriture correspondante
      const provision = provisionsProposees.find(p => p.id === provisionId);
      if (provision) {
        genererEcritureProvision(provision);
      }
    }
  };

  const genererEcritureProvision = (provision: ProvisionProposee) => {
    const nouvelleEcriture: EcritureClôture = {
      id: `PROV-${provision.id}`,
      numero: `CL-${String(ecritures.length + 1).padStart(6, '0')}`,
      date: new Date().toISOString().split('T')[0],
      libelle: `Provision créances douteuses - ${provision.client}`,
      debit: provision.provision_proposee,
      credit: provision.provision_proposee,
      compte_debit: '681500', // Dotations provisions
      compte_credit: '491100', // Provisions créances
      statut: 'BROUILLON',
      creee_par: 'Système'
    };

    setEcritures(prev => [...prev, nouvelleEcriture]);
  };

  const modifierEcriture = (ecriture: EcritureClôture) => {
    setEcritureSelectionnee(ecriture);
    setModalOuverte('ecriture');
  };

  const sauvegarderEcriture = (ecritureModifiee: EcritureClôture) => {
    setEcritures(prev =>
      prev.map(e => e.id === ecritureModifiee.id ? ecritureModifiee : e)
    );
    setModalOuverte(null);
    setEcritureSelectionnee(null);
  };

  const supprimerEcriture = (ecritureId: string) => {
    setEcritures(prev => prev.filter(e => e.id !== ecritureId));
  };

  const genererBalancePostCloture = () => {
    // Calcul de la nouvelle balance avec les écritures de clôture
    const nouvelleBalance = [...balancePreCloture];

    // Application des écritures validées
    ecritures.forEach(ecriture => {
      if (ecriture.statut === 'VALIDEE' || ecriture.statut === 'APPROUVEE') {
        // Mise à jour du compte débité
        const compteDebit = nouvelleBalance.find(b => b.compte === ecriture.compte_debit);
        if (compteDebit) {
          compteDebit.debit_total += ecriture.debit;
          compteDebit.solde_debiteur += ecriture.debit;
          compteDebit.nb_ecritures += 1;
        }

        // Mise à jour du compte crédité
        const compteCredit = nouvelleBalance.find(b => b.compte === ecriture.compte_credit);
        if (compteCredit) {
          compteCredit.credit_total += ecriture.credit;
          compteCredit.solde_crediteur += ecriture.credit;
          compteCredit.nb_ecritures += 1;
        }
      }
    });

    setBalancePostCloture(nouvelleBalance);
  };

  const formaterMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(montant);
  };

  const exporterBalance = (format: 'PDF' | 'EXCEL') => {
    // Simulation export
    toast.success(`Export ${format} de la balance en cours...`);
  };

  const exporterJournal = () => {
    // Simulation export journal
    toast.success('Export du journal de clôture en cours...');
  };

  const exporterFEC = () => {
    // Simulation export FEC
    toast('Génération fichier FEC en cours...');
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* En-tête */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
                <Calculator className="h-6 w-6 mr-3 text-[var(--color-primary)]" />
                Clôture Comptable Périodique - Module Complet
              </h1>
              <p className="mt-1 text-[var(--color-text-primary)]">
                Gestion complète des clôtures conformes SYSCOHADA
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm text-[var(--color-text-primary)]">Exercice</label>
                <select
                  value={exerciceSelectionne}
                  onChange={(e) => setExerciceSelectionne(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border-dark)] rounded-md"
                >
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-primary)]">Mois</label>
                <select
                  value={moisSelectionne}
                  onChange={(e) => setMoisSelectionne(parseInt(e.target.value))}
                  className="px-3 py-2 border border-[var(--color-border-dark)] rounded-md"
                >
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>
                      {new Date(2024, i).toLocaleDateString('fr-FR', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation onglets */}
        <div className="bg-white rounded-lg border mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'balances', label: 'Balances', icon: Database },
                { id: 'provisions', label: 'Provisions', icon: AlertTriangle },
                { id: 'ecritures', label: 'Écritures', icon: FileText },
                { id: 'calendrier', label: 'Calendrier', icon: Calendar },
                { id: 'exports', label: 'Exports', icon: Download }
              ].map((onglet) => (
                <button
                  key={onglet.id}
                  onClick={() => setOngletActif(onglet.id as typeof ongletActif)}
                  className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    ongletActif === onglet.id
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  <onglet.icon className="h-4 w-4" />
                  <span>{onglet.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* ONGLET BALANCES */}
            {ongletActif === 'balances' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Balances Pré et Post-Clôture
                  </h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={chargerBalancePreCloture}
                      disabled={chargement}
                      className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-50 flex items-center space-x-2"
                    >
                      {chargement ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                      <span>Actualiser Balance</span>
                    </button>
                    <button
                      onClick={genererBalancePostCloture}
                      className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center space-x-2"
                    >
                      <Calculator className="h-4 w-4" />
                      <span>Générer Post-Clôture</span>
                    </button>
                  </div>
                </div>

                {/* Statistiques balance */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg">
                    <div className="text-sm text-[var(--color-primary)]">Comptes Actifs</div>
                    <div className="text-lg font-bold text-[var(--color-primary-darker)]">{balancePreCloture.length}</div>
                  </div>
                  <div className="bg-[var(--color-success-lightest)] p-4 rounded-lg">
                    <div className="text-sm text-[var(--color-success)]">Total Débit</div>
                    <div className="text-lg font-bold text-green-900">
                      {formaterMontant(balancePreCloture.reduce((sum, b) => sum + b.debit_total, 0))}
                    </div>
                  </div>
                  <div className="bg-[var(--color-error-lightest)] p-4 rounded-lg">
                    <div className="text-sm text-[var(--color-error)]">Total Crédit</div>
                    <div className="text-lg font-bold text-red-900">
                      {formaterMontant(balancePreCloture.reduce((sum, b) => sum + b.credit_total, 0))}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-purple-600">Différence</div>
                    <div className="text-lg font-bold text-purple-900">
                      {formaterMontant(Math.abs(
                        balancePreCloture.reduce((sum, b) => sum + b.debit_total, 0) -
                        balancePreCloture.reduce((sum, b) => sum + b.credit_total, 0)
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table balance détaillée */}
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b bg-[var(--color-background-secondary)]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[var(--color-text-primary)]">
                        Balance Pré-Clôture - {new Date(2024, moisSelectionne-1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => exporterBalance('PDF')}
                          className="px-3 py-1 bg-[var(--color-error)] text-white rounded text-sm hover:bg-[var(--color-error-dark)]"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => exporterBalance('EXCEL')}
                          className="px-3 py-1 bg-[var(--color-success)] text-white rounded text-sm hover:bg-[var(--color-success-dark)]"
                        >
                          Excel
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[var(--color-background-secondary)]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Débit</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Crédit</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Débiteur</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créditeur</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Écritures</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {balancePreCloture.map((ligne, index) => (
                          <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                            <td className="px-6 py-4 text-sm font-mono font-medium text-[var(--color-text-primary)]">
                              {ligne.compte}
                            </td>
                            <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                              {ligne.libelle}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-mono text-[var(--color-primary)]">
                              {ligne.debit_total > 0 ? formaterMontant(ligne.debit_total) : '-'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-mono text-[var(--color-success)]">
                              {ligne.credit_total > 0 ? formaterMontant(ligne.credit_total) : '-'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-mono font-bold text-[var(--color-primary)]">
                              {ligne.solde_debiteur > 0 ? formaterMontant(ligne.solde_debiteur) : '-'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-mono font-bold text-[var(--color-success)]">
                              {ligne.solde_crediteur > 0 ? formaterMontant(ligne.solde_crediteur) : '-'}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-[var(--color-text-primary)]">
                              {ligne.nb_ecritures}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]"
                                title="Voir détail compte" aria-label="Voir les détails">
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[var(--color-background-hover)]">
                        <tr>
                          <td colSpan={2} className="px-6 py-4 text-right font-semibold text-[var(--color-text-primary)]">
                            TOTAUX:
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-[var(--color-primary)]">
                            {formaterMontant(balancePreCloture.reduce((sum, b) => sum + b.debit_total, 0))}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-[var(--color-success)]">
                            {formaterMontant(balancePreCloture.reduce((sum, b) => sum + b.credit_total, 0))}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-[var(--color-primary)]">
                            {formaterMontant(balancePreCloture.reduce((sum, b) => sum + b.solde_debiteur, 0))}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-[var(--color-success)]">
                            {formaterMontant(balancePreCloture.reduce((sum, b) => sum + b.solde_crediteur, 0))}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-[var(--color-text-primary)]">
                            {balancePreCloture.reduce((sum, b) => sum + b.nb_ecritures, 0)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Balance post-clôture si générée */}
                {balancePostCloture.length > 0 && (
                  <div className="bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-6">
                    <h3 className="font-medium text-green-900 mb-4">Balance Post-Clôture Générée</h3>
                    <div className="text-sm text-[var(--color-success-darker)]">
                      Balance mise à jour avec {ecritures.filter(e => e.statut !== 'BROUILLON').length} écritures de clôture validées
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET PROVISIONS */}
            {ongletActif === 'provisions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Provisions Créances Clients SYSCOHADA
                  </h2>
                  <button
                    onClick={proposerProvisions}
                    disabled={chargement}
                    className="px-4 py-2 bg-[var(--color-warning)] text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {chargement ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                    <span>Calculer Provisions</span>
                  </button>
                </div>

                {provisionsProposees.length > 0 ? (
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b bg-[var(--color-background-secondary)]">
                      <h3 className="font-medium text-[var(--color-text-primary)]">Provisions Proposées - Validation Requise</h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-[var(--color-background-secondary)]">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Client</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créance</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Ancienneté</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Taux SYSCOHADA</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Provision Proposée</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Justification</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Statut</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {provisionsProposees.map((provision) => (
                            <tr key={provision.id} className="hover:bg-[var(--color-background-secondary)]">
                              <td className="px-6 py-4 text-sm font-medium text-[var(--color-text-primary)]">
                                {provision.client}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-mono text-[var(--color-primary)]">
                                {formaterMontant(provision.solde)}
                              </td>
                              <td className="px-6 py-4 text-center text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  provision.anciennete_jours >= 365 ? 'bg-[var(--color-error-lighter)] text-red-800' :
                                  provision.anciennete_jours >= 180 ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                                  'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                                }`}>
                                  {provision.anciennete_jours} jours
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center text-sm font-medium">
                                {provision.taux_syscohada}%
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-mono font-bold text-[var(--color-warning)]">
                                {formaterMontant(provision.provision_proposee)}
                              </td>
                              <td className="px-6 py-4 text-sm text-[var(--color-text-primary)]">
                                {provision.justification}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  provision.statut === 'VALIDEE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                  provision.statut === 'REJETEE' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                                  'bg-[var(--color-warning-lighter)] text-yellow-800'
                                }`}>
                                  {provision.statut}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {provision.statut === 'PROPOSEE' && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => validerProvision(provision.id, 'VALIDER')}
                                      className="text-[var(--color-success)] hover:text-[var(--color-success-darker)]"
                                      title="Valider provision"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => validerProvision(provision.id, 'REJETER')}
                                      className="text-[var(--color-error)] hover:text-red-800"
                                      title="Rejeter provision"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-[var(--color-text-secondary)]">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>Aucune provision calculée</p>
                    <p className="text-sm">Cliquez sur "Calculer Provisions" pour analyser les créances</p>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET ÉCRITURES */}
            {ongletActif === 'ecritures' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Journal de Clôture - Écritures Générées
                  </h2>
                  <button
                    onClick={exporterJournal}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exporter Journal</span>
                  </button>
                </div>

                {ecritures.length > 0 ? (
                  <div className="space-y-4">
                    {ecritures.map((ecriture) => (
                      <div key={ecriture.id} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <span className="font-mono font-bold text-lg text-[var(--color-text-primary)]">{ecriture.numero}</span>
                            <span className="text-[var(--color-text-primary)]">{ecriture.libelle}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              ecriture.statut === 'APPROUVEE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                              ecriture.statut === 'VALIDEE' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                              'bg-[var(--color-warning-lighter)] text-yellow-800'
                            }`}>
                              {ecriture.statut}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-purple-600">{formaterMontant(ecriture.debit)}</span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => modifierEcriture(ecriture)}
                                className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]"
                                title="Modifier écriture"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => supprimerEcriture(ecriture.id)}
                                className="text-[var(--color-error)] hover:text-red-800"
                                title="Supprimer écriture"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-[var(--color-primary-lightest)] p-3 rounded">
                            <div className="font-medium text-[var(--color-primary-darker)]">{t('accounting.debit')}</div>
                            <div className="font-mono">{ecriture.compte_debit} - {formaterMontant(ecriture.debit)}</div>
                          </div>
                          <div className="bg-[var(--color-success-lightest)] p-3 rounded">
                            <div className="font-medium text-green-900">{t('accounting.credit')}</div>
                            <div className="font-mono">{ecriture.compte_credit} - {formaterMontant(ecriture.credit)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[var(--color-text-secondary)]">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>Aucune écriture de clôture générée</p>
                    <p className="text-sm">Les écritures apparaîtront après validation des provisions</p>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET CALENDRIER */}
            {ongletActif === 'calendrier' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Calendrier des Clôtures</h2>

                {/* Vue calendrier mensuel */}
                <div className="bg-white border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[var(--color-text-primary)]">
                      {new Date(2024, moisSelectionne-1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm hover:bg-[var(--color-background-secondary)]">
                        Semaine
                      </button>
                      <button className="px-3 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-sm">
                        Mois
                      </button>
                      <button className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm hover:bg-[var(--color-background-secondary)]">
                        Trimestre
                      </button>
                    </div>
                  </div>

                  {/* Grille calendrier */}
                  <div className="grid grid-cols-7 gap-2">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((jour) => (
                      <div key={jour} className="text-center text-sm font-medium text-[var(--color-text-secondary)] py-2">
                        {jour}
                      </div>
                    ))}

                    {Array.from({length: 31}, (_, i) => {
                      const jour = i + 1;
                      let classe = 'text-center p-3 text-sm border rounded cursor-pointer border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]';
                      let contenu = jour.toString();
                      let tache = '';

                      // Échéances de clôture
                      if (jour === 5) {
                        classe = 'text-center p-3 text-sm border rounded cursor-pointer bg-[var(--color-error-lighter)] border-red-300 text-red-800';
                        tache = 'J+5 Échéance';
                      } else if (jour === 10) {
                        classe = 'text-center p-3 text-sm border rounded cursor-pointer bg-[var(--color-warning-lighter)] border-yellow-300 text-yellow-800';
                        tache = 'Provisions';
                      } else if (jour === 15) {
                        classe = 'text-center p-3 text-sm border rounded cursor-pointer bg-[var(--color-primary-lighter)] border-blue-300 text-[var(--color-primary-darker)]';
                        tache = 'Validation';
                      } else if (jour === 20) {
                        classe = 'text-center p-3 text-sm border rounded cursor-pointer bg-[var(--color-success-lighter)] border-green-300 text-[var(--color-success-darker)]';
                        tache = 'Terminé';
                      }

                      return (
                        <div key={jour} className={classe}>
                          <div>{contenu}</div>
                          {tache && <div className="text-xs mt-1">{tache}</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Légende */}
                  <div className="mt-4 flex items-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-[var(--color-error-lighter)] border border-red-300 rounded"></div>
                      <span>Échéances critiques (J+5)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-[var(--color-warning-lighter)] border border-yellow-300 rounded"></div>
                      <span>Tâches en cours</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-[var(--color-primary-lighter)] border border-blue-300 rounded"></div>
                      <span>En validation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-[var(--color-success-lighter)] border border-green-300 rounded"></div>
                      <span>Terminées</span>
                    </div>
                  </div>
                </div>

                {/* Planning des tâches */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Planning des Tâches de Clôture</h3>

                  <div className="space-y-3">
                    {[
                      { tache: 'Calcul provisions clients', responsable: 'Marie Dupont', echeance: '05/01', statut: 'EN_COURS', priorite: 'HAUTE' },
                      { tache: 'Validation amortissements', responsable: 'Jean Martin', echeance: '10/01', statut: 'EN_ATTENTE', priorite: 'NORMALE' },
                      { tache: 'Régularisations cut-off', responsable: 'Paul Bernard', echeance: '15/01', statut: 'PLANIFIEE', priorite: 'CRITIQUE' },
                      { tache: 'Approbation directeur financier', responsable: 'Dir. Financier', echeance: '18/01', statut: 'PLANIFIEE', priorite: 'HAUTE' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-[var(--color-background-secondary)] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            item.statut === 'EN_COURS' ? 'bg-[var(--color-primary)]' :
                            item.statut === 'EN_ATTENTE' ? 'bg-[var(--color-warning)]' :
                            'bg-gray-400'
                          }`}></div>
                          <div>
                            <div className="font-medium text-[var(--color-text-primary)]">{item.tache}</div>
                            <div className="text-sm text-[var(--color-text-primary)] flex items-center space-x-2">
                              <User className="h-3 w-3" />
                              <span>{item.responsable}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.priorite === 'CRITIQUE' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                            item.priorite === 'HAUTE' ? 'bg-[var(--color-warning-lighter)] text-orange-800' :
                            'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                          }`}>
                            {item.priorite}
                          </span>
                          <span className="text-sm text-[var(--color-text-primary)]">{item.echeance}</span>
                          <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]">
                            <Mail className="h-4 w-4" title="Envoyer rappel" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET EXPORTS */}
            {ongletActif === 'exports' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Exports et Rapports</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 text-[var(--color-primary)] mx-auto mb-4" />
                    <h3 className="font-medium text-[var(--color-text-primary)] mb-2">Journal de Clôture</h3>
                    <p className="text-sm text-[var(--color-text-primary)] mb-4">Export PDF du journal avec toutes les écritures</p>
                    <button
                      onClick={exporterJournal}
                      className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
                    >
                      Exporter PDF
                    </button>
                  </div>

                  <div className="bg-white border rounded-lg p-6 text-center">
                    <Database className="h-12 w-12 text-[var(--color-success)] mx-auto mb-4" />
                    <h3 className="font-medium text-[var(--color-text-primary)] mb-2">Balance Générale</h3>
                    <p className="text-sm text-[var(--color-text-primary)] mb-4">Export Excel de la balance avec formules</p>
                    <button
                      onClick={() => exporterBalance('EXCEL')}
                      className="w-full px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]"
                    >
                      Exporter Excel
                    </button>
                  </div>

                  <div className="bg-white border rounded-lg p-6 text-center">
                    <Settings className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-medium text-[var(--color-text-primary)] mb-2">Fichier FEC</h3>
                    <p className="text-sm text-[var(--color-text-primary)] mb-4">Fichier des écritures comptables pour administration</p>
                    <button
                      onClick={exporterFEC}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Générer FEC
                    </button>
                  </div>
                </div>

                {/* Workflow d'approbation */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Workflow d'Approbation</h3>

                  <div className="space-y-4">
                    {/* Circuit de validation */}
                    <div className="flex items-center space-x-4">
                      {[
                        { etape: 'Saisie', utilisateur: 'M. Dupont', statut: 'TERMINE', date: '03/01 14:30' },
                        { etape: 'Contrôle', utilisateur: 'Mme Martin', statut: 'TERMINE', date: '04/01 09:15' },
                        { etape: 'Validation', utilisateur: 'M. Bernard', statut: 'EN_COURS', date: 'En cours...' },
                        { etape: 'Approbation', utilisateur: 'Dir. Financier', statut: 'EN_ATTENTE', date: 'En attente' },
                        { etape: 'Signature', utilisateur: 'Dir. Général', statut: 'EN_ATTENTE', date: 'En attente' }
                      ].map((etape, index) => (
                        <div key={index} className="flex-1">
                          <div className={`p-4 rounded-lg border text-center ${
                            etape.statut === 'TERMINE' ? 'bg-[var(--color-success-lighter)] border-green-300' :
                            etape.statut === 'EN_COURS' ? 'bg-[var(--color-primary-lighter)] border-blue-300' :
                            'bg-[var(--color-background-hover)] border-[var(--color-border-dark)]'
                          }`}>
                            <div className="font-medium text-sm">{etape.etape}</div>
                            <div className="text-xs text-[var(--color-text-primary)] mt-1">{etape.utilisateur}</div>
                            <div className="text-xs text-[var(--color-text-secondary)] mt-1">{etape.date}</div>
                            <div className="mt-2">
                              {etape.statut === 'TERMINE' ? (
                                <CheckCircle className="h-4 w-4 text-[var(--color-success)] mx-auto" />
                              ) : etape.statut === 'EN_COURS' ? (
                                <Clock className="h-4 w-4 text-[var(--color-primary)] mx-auto animate-pulse" />
                              ) : (
                                <div className="h-4 w-4 border border-gray-400 rounded mx-auto"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions d'approbation */}
                    <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[var(--color-primary-darker)]">En attente de votre validation</div>
                          <div className="text-sm text-[var(--color-primary-dark)]">{provisionsProposees.filter(p => p.statut === 'PROPOSEE').length} provisions à valider</div>
                        </div>
                        <div className="flex space-x-3">
                          <button className="px-4 py-2 bg-[var(--color-error)] text-white rounded-lg hover:bg-[var(--color-error-dark)]">
                            Rejeter Tout
                          </button>
                          <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]">
                            Valider Tout
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Cut-off et régularisations */}
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-4">Cut-off et Régularisations</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Opérations à Cheval</h5>
                          <div className="space-y-2">
                            {[
                              { operation: 'Facture fournisseur reçue 02/02', montant: 45000, action: 'À régulariser en janvier' },
                              { operation: 'Prestation livrée 30/01', montant: 85000, action: 'Produit à recevoir' },
                              { operation: 'Assurance payée pour Q1', montant: 120000, action: 'Charge constatée d\'avance' }
                            ].map((item, index) => (
                              <div key={index} className="p-3 bg-[var(--color-warning-lightest)] border border-yellow-200 rounded">
                                <div className="font-medium text-sm text-[var(--color-text-primary)]">{item.operation}</div>
                                <div className="text-xs text-[var(--color-text-primary)] mt-1">
                                  {formaterMontant(item.montant)} - {item.action}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Régularisations Automatiques</h5>
                          <div className="space-y-2">
                            {[
                              { type: 'Charges à payer', montant: 75000, statut: 'PROPOSEE' },
                              { type: 'Produits à recevoir', montant: 85000, statut: 'VALIDEE' },
                              { type: 'Charges constatées d\'avance', montant: 120000, statut: 'VALIDEE' }
                            ].map((item, index) => (
                              <div key={index} className="p-3 bg-[var(--color-background-secondary)] border rounded">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-sm text-[var(--color-text-primary)]">{item.type}</div>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    item.statut === 'VALIDEE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                    'bg-[var(--color-warning-lighter)] text-yellow-800'
                                  }`}>
                                    {item.statut}
                                  </span>
                                </div>
                                <div className="text-xs text-[var(--color-text-primary)] mt-1">
                                  {formaterMontant(item.montant)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Référence SYSCOHADA */}
        <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-6">
          <h3 className="font-medium text-[var(--color-primary-darker)] mb-3">Conformité SYSCOHADA</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-[var(--color-primary-darker)]">
            <div>
              <strong>Art. 45 - Provisions :</strong> &gt;6 mois = 50%, &gt;12 mois = 100%
            </div>
            <div>
              <strong>Art. 42 - Amortissements :</strong> Selon barèmes officiels
            </div>
            <div>
              <strong>Art. 58 - Régularisations :</strong> Cut-off obligatoire
            </div>
            <div>
              <strong>Art. 65 - Balance :</strong> Équilibre débit/crédit
            </div>
          </div>
        </div>
      </div>

      {/* Modale modification écriture */}
      {modalOuverte === 'ecriture' && ecritureSelectionnee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Modifier Écriture {ecritureSelectionnee.numero}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">{t('accounting.label')}</label>
                <input
                  type="text"
                  value={ecritureSelectionnee.libelle}
                  onChange={(e) => setEcritureSelectionnee({
                    ...ecritureSelectionnee,
                    libelle: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Compte Débit</label>
                  <input
                    type="text"
                    value={ecritureSelectionnee.compte_debit}
                    onChange={(e) => setEcritureSelectionnee({
                      ...ecritureSelectionnee,
                      compte_debit: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Compte Crédit</label>
                  <input
                    type="text"
                    value={ecritureSelectionnee.compte_credit}
                    onChange={(e) => setEcritureSelectionnee({
                      ...ecritureSelectionnee,
                      compte_credit: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Montant</label>
                <input
                  type="number"
                  value={ecritureSelectionnee.debit}
                  onChange={(e) => {
                    const montant = parseFloat(e.target.value);
                    setEcritureSelectionnee({
                      ...ecritureSelectionnee,
                      debit: montant,
                      credit: montant
                    });
                  }}
                  className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md"
                />
              </div>
            </div>

            <div className="p-6 border-t bg-[var(--color-background-secondary)] flex justify-between">
              <button
                onClick={() => setModalOuverte(null)}
                className="px-4 py-2 bg-[var(--color-border-dark)] text-[var(--color-text-primary)] rounded-lg hover:bg-gray-400"
              >
                Annuler
              </button>
              <button
                onClick={() => sauvegarderEcriture(ecritureSelectionnee)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Sauvegarder</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};

export default ModuleClotureComplet;