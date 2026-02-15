import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Database, Calculator, FileText, Calendar, Download,
  CheckCircle, X, Edit, Eye, AlertTriangle, Clock, User, Settings
} from 'lucide-react';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';

const ClotureComptableFinal: React.FC = () => {
  const { t } = useLanguage();
  const [ongletActif, setOngletActif] = useState('regularisations');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [balancePreCloture, setBalancePreCloture] = useState([
    { compte: '101000', libelle: 'Capital social', debit: 0, credit: 10000000, solde_d: 0, solde_c: 10000000 },
    { compte: '411001', libelle: 'Client ABC Corp', debit: 1500000, credit: 1200000, solde_d: 300000, solde_c: 0 },
    { compte: '411002', libelle: 'Client XYZ Ltd', debit: 800000, credit: 600000, solde_d: 200000, solde_c: 0 },
    { compte: '512100', libelle: 'Banque BCEAO', debit: 5200000, credit: 4800000, solde_d: 400000, solde_c: 0 },
    { compte: '245000', libelle: 'Matériel informatique', debit: 1200000, credit: 0, solde_d: 1200000, solde_c: 0 }
  ]);

  const [provisions, setProvisions] = useState([
    { id: '411001', client: 'Client ABC Corp', solde: 300000, anciennete: 210, taux: 50, provision: 150000, statut: 'PROPOSEE' },
    { id: '411002', client: 'Client XYZ Ltd', solde: 200000, anciennete: 400, taux: 100, provision: 200000, statut: 'PROPOSEE' }
  ]);

  const [ecritures, setEcritures] = useState([]);

  const formaterMontant = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(montant);
  };

  const validerProvision = (id, action) => {
    setProvisions(prev =>
      prev.map(p =>
        p.id === id ? { ...p, statut: action === 'VALIDER' ? 'VALIDEE' : 'REJETEE' } : p
      )
    );

    if (action === 'VALIDER') {
      const provision = provisions.find(p => p.id === id);
      setEcritures(prev => [...prev, {
        id: `PROV-${id}`,
        numero: `CL-${String(prev.length + 1).padStart(6, '0')}`,
        libelle: `Provision créances douteuses - ${provision.client}`,
        debit: provision.provision,
        credit: provision.provision,
        statut: 'VALIDEE'
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <Calculator className="h-6 w-6 mr-3 text-[var(--color-primary)]" />
            Module de Clôture Comptable Périodique
          </h1>
          <p className="mt-1 text-[var(--color-text-primary)]">
            Gestion complète des clôtures conformes SYSCOHADA
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Types de Clôture Supportés */}
        <div className="bg-white rounded-lg border mb-6 p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Types de Clôture Supportés</h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                type: 'MENSUELLE',
                nom: 'Clôture Mensuelle',
                description: 'Suivi régulier des opérations courantes',
                echeance: 'J+5',
                couleur: 'bg-[var(--color-primary-lightest)] border-[var(--color-primary-light)] text-[var(--color-primary-darker)]'
              },
              {
                type: 'TRIMESTRIELLE',
                nom: 'Clôture Trimestrielle',
                description: 'Consolidation et reporting intermédiaire',
                echeance: 'J+15',
                couleur: 'bg-[var(--color-success-lightest)] border-[var(--color-success-light)] text-[var(--color-success-darker)]'
              },
              {
                type: 'SEMESTRIELLE',
                nom: 'Clôture Semestrielle',
                description: 'Bilan intermédiaire',
                echeance: 'J+20',
                couleur: 'bg-[var(--color-warning-lightest)] border-yellow-200 text-yellow-800'
              },
              {
                type: 'ANNUELLE',
                nom: 'Clôture Annuelle',
                description: 'Opérations de fin d\'exercice (inventaires, provisions, amortissements)',
                echeance: 'J+45',
                couleur: 'bg-purple-50 border-purple-200 text-purple-800'
              },
              {
                type: 'SPECIALE',
                nom: 'Clôtures Spéciales',
                description: 'Paramétrables (projets, filiales, activités spécifiques)',
                echeance: 'Variable',
                couleur: 'bg-orange-50 border-orange-200 text-orange-800'
              }
            ].map((cloture) => (
              <div key={cloture.type} className={`border rounded-lg p-4 ${cloture.couleur}`}>
                <div className="font-medium mb-2">{cloture.nom}</div>
                <div className="text-sm mb-3">{cloture.description}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Échéance: {cloture.echeance}</span>
                  <button className="text-xs px-2 py-1 bg-white rounded hover:bg-[var(--color-background-secondary)]">
                    Démarrer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Configuration de la clôture sélectionnée */}
          <div className="mt-6 bg-[var(--color-background-secondary)] rounded-lg p-4">
            <h3 className="font-medium text-[var(--color-text-primary)] mb-3">Configuration de la Clôture</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-[var(--color-text-primary)] mb-1">Type Sélectionné</label>
                <select className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md">
                  <option value="MENSUELLE">Mensuelle</option>
                  <option value="TRIMESTRIELLE">Trimestrielle</option>
                  <option value="SEMESTRIELLE">Semestrielle</option>
                  <option value="ANNUELLE">Annuelle</option>
                  <option value="SPECIALE">Spéciale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-primary)] mb-1">Exercice</label>
                <select className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md">
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-primary)] mb-1">Période</label>
                <select className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md">
                  <option value="01">Janvier 2024</option>
                  <option value="Q1">T1 2024 (Jan-Mar)</option>
                  <option value="S1">S1 2024 (Jan-Jun)</option>
                  <option value="ANNEE">Exercice 2024</option>
                  <option value="PROJET_ALPHA">Projet Alpha</option>
                  <option value="FILIALE_CM">Filiale Cameroun</option>
                </select>
              </div>
              <div className="flex items-end">
                <button className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">
                  Démarrer Clôture
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'regularisations', label: 'Opérations Régularisation', icon: Settings },
                { id: 'specialisees', label: 'Opérations Spécialisées', icon: CheckCircle },
                { id: 'etats-financiers', label: 'États Financiers', icon: FileText },
                { id: 'tableau-bord', label: 'Tableau de Bord', icon: Calculator },
                { id: 'historique', label: 'Historique & Archivage', icon: Database },
                { id: 'parametrage', label: 'Paramétrage', icon: Settings },
                { id: 'balances', label: 'Balances', icon: Database },
                { id: 'provisions', label: 'Provisions', icon: AlertTriangle },
                { id: 'workflow', label: 'Workflow', icon: User },
                { id: 'exports', label: 'Exports', icon: Download }
              ].map((onglet) => (
                <button
                  key={onglet.id}
                  onClick={() => setOngletActif(onglet.id)}
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
            {/* ONGLET OPÉRATIONS DE RÉGULARISATION */}
            {ongletActif === 'regularisations' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">B. Opérations de Régularisation</h2>

                {/* Journal des Opérations à Régulariser */}
                <div className="bg-white border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[var(--color-text-primary)]">Journal des Opérations à Régulariser</h3>
                    <div className="flex space-x-2">
                      <select className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm">
                        <option>Tous comptes</option>
                        <option>Comptes 4xx (Tiers)</option>
                        <option>Comptes 6xx (Charges)</option>
                        <option>Comptes 7xx (Produits)</option>
                      </select>
                      <select className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm">
                        <option>Toutes périodes</option>
                        <option>Janvier 2024</option>
                        <option>Décembre 2023</option>
                      </select>
                      <select className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm">
                        <option>Tous responsables</option>
                        <option>Marie Dupont</option>
                        <option>Jean Martin</option>
                      </select>
                      <select className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm">
                        <option>Tous statuts</option>
                        <option>Identifiée</option>
                        <option>{t('status.inProgress')}</option>
                        <option>Validée</option>
                      </select>
                    </div>
                  </div>

                  {/* Liste dynamique avec mise à jour temps réel */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[var(--color-background-secondary)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">N° Opération</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Montant</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Impact</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Responsable</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Statut</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[
                          {
                            numero: 'REG-001',
                            type: 'Provision Clients',
                            compte: '411001',
                            montant: 150000,
                            impact: 'FORT',
                            responsable: 'Marie Dupont',
                            statut: 'EN_COURS',
                            commentaire: 'Client en retard de paiement depuis 7 mois'
                          },
                          {
                            numero: 'REG-002',
                            type: 'Charges à Payer',
                            compte: '607800',
                            montant: 75000,
                            impact: 'MOYEN',
                            responsable: 'Jean Martin',
                            statut: 'IDENTIFIEE',
                            commentaire: 'Facture électricité non reçue'
                          },
                          {
                            numero: 'REG-003',
                            type: 'Produits à Recevoir',
                            compte: '418100',
                            montant: 120000,
                            impact: 'FORT',
                            responsable: 'Paul Bernard',
                            statut: 'VALIDEE',
                            commentaire: 'Prestations livrées non facturées'
                          },
                          {
                            numero: 'REG-004',
                            type: 'Amortissement',
                            compte: '245000',
                            montant: 33333,
                            impact: 'MOYEN',
                            responsable: 'Marie Dupont',
                            statut: 'PROPOSEE',
                            commentaire: 'Amortissement mensuel matériel informatique'
                          },
                          {
                            numero: 'REG-005',
                            type: 'Régularisation Stocks',
                            compte: '371000',
                            montant: 25000,
                            impact: 'FAIBLE',
                            responsable: 'Jean Martin',
                            statut: 'EN_COURS',
                            commentaire: 'Mali inventaire marchandises'
                          }
                        ].map((operation) => (
                          <tr key={operation.numero} className="hover:bg-[var(--color-background-secondary)]">
                            <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--color-primary)]">
                              {operation.numero}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-xs">
                                {operation.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-mono">{operation.compte}</td>
                            <td className="px-4 py-3 text-right text-sm font-mono text-purple-600">
                              {formaterMontant(operation.montant)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                operation.impact === 'FORT' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                                operation.impact === 'MOYEN' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                                'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                              }`}>
                                {operation.impact}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{operation.responsable}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs ${
                                operation.statut === 'VALIDEE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                operation.statut === 'EN_COURS' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                                operation.statut === 'PROPOSEE' ? 'bg-purple-100 text-purple-800' :
                                'bg-[var(--color-warning-lighter)] text-yellow-800'
                              }`}>
                                {operation.statut}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex space-x-1 justify-center">
                                <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]" title="Voir détail" aria-label="Voir les détails">
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button className="text-[var(--color-success)] hover:text-[var(--color-success-darker)]" title="Saisie/Validation">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button className="text-purple-600 hover:text-purple-800" title="Commentaires">
                                  <FileText className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Génération Automatique d'Écritures */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Génération Automatique d'Écritures</h3>

                  {/* Moteur de règles paramétrable */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Moteur de Règles Paramétrable</h4>
                      <div className="space-y-3">
                        {[
                          {
                            type: 'Provisions Clients Douteux',
                            regle: 'Si ancienneté > 180 jours : 50%',
                            comptes: '681500 / 491100',
                            active: true
                          },
                          {
                            type: 'Provisions Congés Payés',
                            regle: 'Salaire brut × 12.5% × nb jours',
                            comptes: '641100 / 432800',
                            active: true
                          },
                          {
                            type: 'Amortissements Linéaires',
                            regle: 'Valeur acquisition / durée SYSCOHADA',
                            comptes: '681200 / 28xxxx',
                            active: true
                          },
                          {
                            type: 'Amortissements Dégressifs',
                            regle: 'Taux dégressif × valeur résiduelle',
                            comptes: '681200 / 28xxxx',
                            active: false
                          },
                          {
                            type: 'Charges à Payer',
                            regle: 'Estimation basée sur historique',
                            comptes: '6xxxx / 408100',
                            active: true
                          },
                          {
                            type: 'Produits à Recevoir',
                            regle: 'Prestations livrées non facturées',
                            comptes: '418100 / 7xxxx',
                            active: true
                          },
                          {
                            type: 'Régularisations Stocks',
                            regle: 'Écart inventaire physique/comptable',
                            comptes: '3xxxx / 658000',
                            active: true
                          }
                        ].map((regle, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{regle.type}</div>
                              <div className="text-xs text-[var(--color-text-primary)] mt-1">{regle.regle}</div>
                              <div className="text-xs text-[var(--color-primary)] mt-1">Comptes: {regle.comptes}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`w-3 h-3 rounded-full ${regle.active ? 'bg-[var(--color-success)]' : 'bg-gray-400'}`}></span>
                              <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)] text-xs">
                                Configurer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Prévisualisation avant Validation</h4>
                      <div className="bg-[var(--color-background-secondary)] border rounded-lg p-4">
                        <div className="text-sm text-[var(--color-text-primary)] mb-3">Écritures qui seront générées :</div>
                        <div className="space-y-2">
                          {[
                            {
                              numero: 'CL-000001',
                              libelle: 'Provision créances douteuses - Client ABC',
                              debit: '681500 - 150,000',
                              credit: '491100 - 150,000'
                            },
                            {
                              numero: 'CL-000002',
                              libelle: 'Charges électricité à payer',
                              debit: '607800 - 75,000',
                              credit: '408100 - 75,000'
                            },
                            {
                              numero: 'CL-000003',
                              libelle: 'Produits prestations à recevoir',
                              debit: '418100 - 120,000',
                              credit: '706000 - 120,000'
                            }
                          ].map((ecriture, index) => (
                            <div key={index} className="p-3 bg-white border rounded">
                              <div className="font-mono font-medium text-sm text-[var(--color-primary)]">{ecriture.numero}</div>
                              <div className="text-sm text-[var(--color-text-primary)]">{ecriture.libelle}</div>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                <div className="text-[var(--color-primary)]">D. {ecriture.debit}</div>
                                <div className="text-[var(--color-success)]">C. {ecriture.credit}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex space-x-3">
                          <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded hover:bg-[var(--color-success-dark)]">
                            Valider et Générer
                          </button>
                          <button className="px-4 py-2 bg-[var(--color-border-dark)] text-[var(--color-text-primary)] rounded hover:bg-gray-400">
                            Modifier Règles
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Export multi-formats */}
                  <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--color-primary-darker)] mb-3">Export Multi-Formats</h4>
                    <div className="grid grid-cols-4 gap-3">
                      <button className="px-3 py-2 bg-[var(--color-error)] text-white rounded text-sm hover:bg-[var(--color-error-dark)]">
                        Export PDF
                      </button>
                      <button className="px-3 py-2 bg-[var(--color-success)] text-white rounded text-sm hover:bg-[var(--color-success-dark)]">
                        Export Excel
                      </button>
                      <button className="px-3 py-2 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-dark)]">
                        Export CSV
                      </button>
                      <button className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
                        Export XML
                      </button>
                    </div>
                  </div>

                  {/* Intégration Plan Comptable SYSCOHADA */}
                  <div className="bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-3">Intégration Plan Comptable SYSCOHADA</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-[var(--color-success-darker)] mb-2">Comptes Provisions</div>
                        <ul className="space-y-1 text-[var(--color-success-dark)]">
                          <li>• 491100 - Provisions créances douteuses</li>
                          <li>• 491200 - Provisions dépréciation stocks</li>
                          <li>• 1512xx - Provisions risques/charges</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-[var(--color-success-darker)] mb-2">Comptes Amortissements</div>
                        <ul className="space-y-1 text-[var(--color-success-dark)]">
                          <li>• 681200 - Dotations amortissements</li>
                          <li>• 28xxxx - Amortissements cumulés</li>
                          <li>• Selon classes 21-24 SYSCOHADA</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-[var(--color-success-darker)] mb-2">Comptes Régularisations</div>
                        <ul className="space-y-1 text-[var(--color-success-dark)]">
                          <li>• 408100 - Fournisseurs FNP</li>
                          <li>• 418100 - Clients produits non facturés</li>
                          <li>• 486000 - Charges constatées d'avance</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Commentaires et pièces justificatives */}
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-4">Commentaires et Pièces Justificatives</h4>

                    <div className="space-y-4">
                      {[
                        { operation: 'REG-001', commentaire: 'Client en contentieux depuis octobre', pieces: ['Mise_en_demeure.pdf', 'Correspondance_client.pdf'] },
                        { operation: 'REG-002', commentaire: 'Facture attendue début février', pieces: ['Estimation_consommation.xlsx'] },
                        { operation: 'REG-003', commentaire: 'Prestations validées par client', pieces: ['Bon_livraison.pdf', 'PV_reception.pdf'] }
                      ].map((item, index) => (
                        <div key={index} className="p-4 border rounded">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-[var(--color-primary)]">{item.operation}</div>
                              <div className="text-sm text-[var(--color-text-primary)] mt-1">{item.commentaire}</div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {item.pieces.map((piece, pieceIndex) => (
                                  <span key={pieceIndex} className="px-2 py-1 bg-[var(--color-background-hover)] text-[var(--color-text-primary)] rounded text-xs">
                                    📎 {piece}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)] ml-3">
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET OPÉRATIONS SPÉCIALISÉES */}
            {ongletActif === 'specialisees' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">D. Opérations de Clôture Spécialisées</h2>

                {/* Rapprochements et Contrôles */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Rapprochements et Contrôles</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Rapprochement Bancaire Automatisé</h4>
                      <div className="space-y-3">
                        {[
                          {
                            banque: 'BCEAO - Compte Principal',
                            solde_comptable: 2485000,
                            solde_releve: 2520000,
                            ecart: 35000,
                            statut: 'EN_COURS'
                          },
                          {
                            banque: 'UBA - Compte EUR',
                            solde_comptable: 450000,
                            solde_releve: 450000,
                            ecart: 0,
                            statut: 'RAPPROCHE'
                          },
                          {
                            banque: 'SGBC - Compte USD',
                            solde_comptable: 1250000,
                            solde_releve: 1235000,
                            ecart: 15000,
                            statut: 'ECART_IDENTIFIE'
                          }
                        ].map((banque, index) => (
                          <div key={index} className={`p-4 border rounded ${
                            banque.statut === 'RAPPROCHE' ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' :
                            banque.statut === 'ECART_IDENTIFIE' ? 'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]' :
                            'border-yellow-200 bg-[var(--color-warning-lightest)]'
                          }`}>
                            <div className="font-medium text-sm">{banque.banque}</div>
                            <div className="text-xs text-[var(--color-text-primary)] mt-1">
                              Comptable: {formaterMontant(banque.solde_comptable)}
                            </div>
                            <div className="text-xs text-[var(--color-text-primary)]">
                              Relevé: {formaterMontant(banque.solde_releve)}
                            </div>
                            <div className="text-xs font-medium mt-1">
                              Écart: {formaterMontant(Math.abs(banque.ecart))}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                banque.statut === 'RAPPROCHE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                banque.statut === 'ECART_IDENTIFIE' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                                'bg-[var(--color-warning-lighter)] text-yellow-800'
                              }`}>
                                {banque.statut}
                              </span>
                              <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)] text-xs">
                                Import Relevé
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Lettrage Intelligent Comptes Tiers</h4>
                      <div className="space-y-3">
                        {[
                          {
                            compte: '411001 - Client ABC Corp',
                            facture: 'FA-2024-001',
                            reglement: 'REG-2024-045',
                            montant: 300000,
                            statut: 'LETTRE'
                          },
                          {
                            compte: '401200 - Fournisseur XYZ',
                            facture: 'FF-2024-125',
                            reglement: 'VIRT-2024-089',
                            montant: 125000,
                            statut: 'LETTRE'
                          },
                          {
                            compte: '411002 - Client DEF Ltd',
                            facture: 'FA-2024-002',
                            reglement: 'En attente',
                            montant: 200000,
                            statut: 'NON_LETTRE'
                          }
                        ].map((lettrage, index) => (
                          <div key={index} className={`p-4 border rounded ${
                            lettrage.statut === 'LETTRE' ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' :
                            'border-yellow-200 bg-[var(--color-warning-lightest)]'
                          }`}>
                            <div className="font-medium text-sm">{lettrage.compte}</div>
                            <div className="text-xs text-[var(--color-text-primary)] mt-1">
                              Facture: {lettrage.facture}
                            </div>
                            <div className="text-xs text-[var(--color-text-primary)]">
                              Règlement: {lettrage.reglement}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-medium">{formaterMontant(lettrage.montant)}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                lettrage.statut === 'LETTRE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                'bg-[var(--color-warning-lighter)] text-yellow-800'
                              }`}>
                                {lettrage.statut}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Validation des inventaires physiques */}
                  <div className="mt-6 bg-white border rounded-lg p-6">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-4">Validation des Inventaires Physiques</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          stock: 'Marchandises (371000)',
                          comptable: 180000,
                          physique: 175000,
                          ecart: -5000,
                          type: 'MALI'
                        },
                        {
                          stock: 'Matières premières (311000)',
                          comptable: 245000,
                          physique: 248000,
                          ecart: 3000,
                          type: 'BONI'
                        },
                        {
                          stock: 'Produits finis (355000)',
                          comptable: 320000,
                          physique: 320000,
                          ecart: 0,
                          type: 'CONFORME'
                        }
                      ].map((inventaire, index) => (
                        <div key={index} className={`p-4 border rounded ${
                          inventaire.type === 'CONFORME' ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' :
                          inventaire.type === 'BONI' ? 'border-[var(--color-primary-light)] bg-[var(--color-primary-lightest)]' :
                          'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]'
                        }`}>
                          <div className="font-medium text-sm">{inventaire.stock}</div>
                          <div className="text-xs text-[var(--color-text-primary)] mt-2">
                            Comptable: {formaterMontant(inventaire.comptable)}
                          </div>
                          <div className="text-xs text-[var(--color-text-primary)]">
                            Physique: {formaterMontant(inventaire.physique)}
                          </div>
                          <div className="text-xs font-medium mt-1">
                            Écart: {formaterMontant(Math.abs(inventaire.ecart))}
                          </div>
                          <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                            inventaire.type === 'CONFORME' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                            inventaire.type === 'BONI' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                            'bg-[var(--color-error-lighter)] text-red-800'
                          }`}>
                            {inventaire.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET ÉTATS FINANCIERS */}
            {ongletActif === 'etats-financiers' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">États Financiers</h2>

                {/* Génération automatique */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Génération Automatique</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      {
                        nom: 'Balance Générale',
                        description: 'Balance avec tous comptes actifs',
                        statut: 'GENERE',
                        date: '05/01/2024'
                      },
                      {
                        nom: 'Grand Livre',
                        description: 'Détail mouvements par compte',
                        statut: 'EN_COURS',
                        date: 'En cours...'
                      },
                      {
                        nom: 'Journaux',
                        description: 'Journal général et auxiliaires',
                        statut: 'PLANIFIE',
                        date: 'Planifié'
                      }
                    ].map((etat, index) => (
                      <div key={index} className="p-4 border rounded">
                        <div className="font-medium text-sm">{etat.nom}</div>
                        <div className="text-xs text-[var(--color-text-primary)] mt-1">{etat.description}</div>
                        <div className="flex items-center justify-between mt-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            etat.statut === 'GENERE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                            etat.statut === 'EN_COURS' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                            'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                          }`}>
                            {etat.statut}
                          </span>
                          <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)] text-xs">
                            Générer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* États SYSCOHADA */}
                  <div className="mt-6">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">États Conformes SYSCOHADA</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="space-y-3">
                          {[
                            { etat: 'Compte de Résultat par Nature', syscohada: 'Art. 25-28', statut: 'CONFORME' },
                            { etat: 'Compte de Résultat par Fonction', syscohada: 'Art. 29-31', statut: 'EN_COURS' },
                            { etat: 'Bilan Actif/Passif', syscohada: 'Art. 32-34', statut: 'PLANIFIE' }
                          ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded">
                              <div>
                                <div className="font-medium text-sm">{item.etat}</div>
                                <div className="text-xs text-[var(--color-primary)]">{item.syscohada}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs ${
                                item.statut === 'CONFORME' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                item.statut === 'EN_COURS' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                                'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                              }`}>
                                {item.statut}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="space-y-3">
                          {[
                            { etat: 'États Annexes', syscohada: 'Art. 35', statut: 'PLANIFIE' },
                            { etat: 'Notes Explicatives', syscohada: 'Art. 36-40', statut: 'PLANIFIE' },
                            { etat: 'Comparatifs N/N-1', syscohada: 'Art. 41', statut: 'EN_COURS' }
                          ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded">
                              <div>
                                <div className="font-medium text-sm">{item.etat}</div>
                                <div className="text-xs text-[var(--color-primary)]">{item.syscohada}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs ${
                                item.statut === 'CONFORME' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                item.statut === 'EN_COURS' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                                'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                              }`}>
                                {item.statut}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET TABLEAU DE BORD */}
            {ongletActif === 'tableau-bord' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">F. Tableau de Bord et Reporting</h2>

                {/* Indicateurs de Performance */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Indicateurs de Performance</h3>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-[var(--color-primary-lightest)] p-4 rounded-lg text-center">
                      <div className="text-lg font-bold text-[var(--color-primary-darker)]">78%</div>
                      <div className="text-sm text-[var(--color-primary)]">Progression Globale</div>
                      <div className="text-xs text-[var(--color-primary)] mt-1">Temps réel</div>
                    </div>
                    <div className="bg-[var(--color-success-lightest)] p-4 rounded-lg text-center">
                      <div className="text-lg font-bold text-green-900">4.2j</div>
                      <div className="text-sm text-[var(--color-success)]">Délai Moyen</div>
                      <div className="text-xs text-[var(--color-success)] mt-1">Par étape</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <div className="text-lg font-bold text-orange-900">0.8%</div>
                      <div className="text-sm text-[var(--color-warning)]">Taux d'Erreur</div>
                      <div className="text-xs text-orange-500 mt-1">Et de rejet</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <div className="text-lg font-bold text-purple-900">95%</div>
                      <div className="text-sm text-purple-600">Respect Échéances</div>
                      <div className="text-xs text-purple-500 mt-1">J+5 mensuel</div>
                    </div>
                    <div className="bg-[var(--color-error-lightest)] p-4 rounded-lg text-center">
                      <div className="text-lg font-bold text-red-900">85%</div>
                      <div className="text-sm text-[var(--color-error)]">Charge Équipe</div>
                      <div className="text-xs text-[var(--color-error)] mt-1">Par équipe</div>
                    </div>
                  </div>

                  {/* Délais par utilisateur */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Délais Moyens par Utilisateur</h4>
                      <div className="space-y-3">
                        {[
                          { utilisateur: 'Marie Dupont', etape: 'Saisie provisions', delai: '2.1h', objectif: '2.5h', performance: 'EXCELLENT' },
                          { utilisateur: 'Jean Martin', etape: 'Contrôle calculs', delai: '3.8h', objectif: '3.0h', performance: 'A_AMELIORER' },
                          { utilisateur: 'Paul Bernard', etape: 'Validation', delai: '1.5h', objectif: '2.0h', performance: 'EXCELLENT' },
                          { utilisateur: 'Dir. Financier', etape: 'Approbation', delai: '4.2h', objectif: '4.0h', performance: 'CORRECT' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                            <div>
                              <div className="font-medium text-sm">{item.utilisateur}</div>
                              <div className="text-xs text-[var(--color-text-primary)]">{item.etape}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-sm">{item.delai}</div>
                              <div className="text-xs text-[var(--color-text-secondary)]">Obj: {item.objectif}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.performance === 'EXCELLENT' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                              item.performance === 'A_AMELIORER' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                              'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'
                            }`}>
                              {item.performance}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Visualisations Avancées</h4>
                      <div className="space-y-3">
                        <div className="p-4 border rounded bg-[var(--color-primary-lightest)]">
                          <div className="font-medium text-sm text-[var(--color-primary-darker)] mb-2">Graphiques Interactifs</div>
                          <div className="space-y-2 text-xs text-[var(--color-primary-darker)]">
                            <div>• Progression par étape (barres)</div>
                            <div>• Répartition charge travail (camembert)</div>
                            <div>• Tendances délais (courbes)</div>
                          </div>
                        </div>
                        <div className="p-4 border rounded bg-[var(--color-error-lightest)]">
                          <div className="font-medium text-sm text-red-900 mb-2">Cartes de Chaleur des Retards</div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({length: 21}, (_, i) => (
                              <div key={i} className={`w-4 h-4 rounded ${
                                i < 3 ? 'bg-red-400' : i < 8 ? 'bg-yellow-400' : 'bg-green-400'
                              }`}></div>
                            ))}
                          </div>
                          <div className="text-xs text-[var(--color-error-dark)] mt-2">Rouge: retards, Vert: dans les temps</div>
                        </div>
                        <div className="p-4 border rounded bg-purple-50">
                          <div className="font-medium text-sm text-purple-900 mb-2">Alertes Visuelles et Sonores</div>
                          <div className="space-y-1 text-xs text-purple-800">
                            <div>🔔 3 alertes échéances J+1</div>
                            <div>⚠️ 1 validation en retard</div>
                            <div>✅ 15 tâches terminées aujourd'hui</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exports et Rapports */}
                  <div className="mt-6 bg-white border rounded-lg p-6">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-4">Exports et Rapports</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-medium text-[var(--color-text-primary)] mb-3">Rapport de Clôture Standardisé</h5>
                        <div className="p-4 bg-[var(--color-background-secondary)] border rounded">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] mb-2">📄 Rapport Janvier 2024</div>
                          <div className="text-xs text-[var(--color-text-primary)] space-y-1">
                            <div>• Logo et en-tête société</div>
                            <div>• Résumé exécutif</div>
                            <div>• Détail opérations</div>
                            <div>• Signatures électroniques</div>
                            <div>• Conformité SYSCOHADA</div>
                          </div>
                          <button className="mt-3 w-full px-3 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-dark)] text-sm">
                            Générer Rapport
                          </button>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-[var(--color-text-primary)] mb-3">Export vers Outils BI</h5>
                        <div className="space-y-3">
                          {[
                            { outil: 'Power BI', format: 'Dataset', statut: 'CONNECTE', couleur: 'bg-[var(--color-warning-lighter)] text-yellow-800' },
                            { outil: 'Tableau', format: 'API REST', statut: 'CONNECTE', couleur: 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' },
                            { outil: 'QlikView', format: 'Export CSV', statut: 'PLANIFIE', couleur: 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]' }
                          ].map((bi, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <div className="font-medium text-sm">{bi.outil}</div>
                                <div className="text-xs text-[var(--color-text-primary)]">{bi.format}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs ${bi.couleur}`}>
                                {bi.statut}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 p-3 bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded">
                          <div className="text-sm font-medium text-green-900 mb-2">Formats Multiples</div>
                          <div className="grid grid-cols-4 gap-2">
                            <button className="px-2 py-1 bg-[var(--color-error)] text-white rounded text-xs">PDF</button>
                            <button className="px-2 py-1 bg-[var(--color-success)] text-white rounded text-xs">Excel</button>
                            <button className="px-2 py-1 bg-[var(--color-primary)] text-white rounded text-xs">Word</button>
                            <button className="px-2 py-1 bg-purple-600 text-white rounded text-xs">XML</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET HISTORIQUE ET ARCHIVAGE */}
            {ongletActif === 'historique' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">G. Historique et Archivage</h2>

                {/* Conservation des Données */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Conservation des Données</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Archivage Automatique</h4>
                      <div className="space-y-3">
                        {[
                          {
                            periode: 'Janvier 2024',
                            taille: '245 MB',
                            compression: '67%',
                            chiffrement: 'AES-256',
                            statut: 'ARCHIVE',
                            retention: '2034-01-31'
                          },
                          {
                            periode: 'Décembre 2023',
                            taille: '532 MB',
                            compression: '71%',
                            chiffrement: 'AES-256',
                            statut: 'ARCHIVE',
                            retention: '2033-12-31'
                          },
                          {
                            periode: 'Exercice 2023',
                            taille: '2.1 GB',
                            compression: '65%',
                            chiffrement: 'AES-256',
                            statut: 'VERROUILLE',
                            retention: '2033-12-31'
                          }
                        ].map((archive, index) => (
                          <div key={index} className={`p-4 border rounded ${
                            archive.statut === 'VERROUILLE' ? 'border-purple-200 bg-purple-50' :
                            'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]'
                          }`}>
                            <div className="font-medium text-sm">{archive.periode}</div>
                            <div className="text-xs text-[var(--color-text-primary)] mt-1">
                              Taille: {archive.taille} • Compression: {archive.compression}
                            </div>
                            <div className="text-xs text-[var(--color-text-primary)]">
                              Chiffrement: {archive.chiffrement}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                archive.statut === 'VERROUILLE' ? 'bg-purple-100 text-purple-800' :
                                'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                              }`}>
                                {archive.statut}
                              </span>
                              <span className="text-xs text-[var(--color-text-secondary)]">
                                Jusqu'au: {archive.retention}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Sauvegarde et Rétention</h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded">
                          <div className="font-medium text-sm text-[var(--color-primary-darker)] mb-2">Configuration Sauvegardes</div>
                          <div className="space-y-1 text-xs text-[var(--color-primary-darker)]">
                            <div>• Incrémentale : Quotidienne 02:00</div>
                            <div>• Différentielle : Hebdomadaire dimanche</div>
                            <div>• Complète : Mensuelle 1er du mois</div>
                            <div>• Cloud : Synchronisation AWS S3</div>
                          </div>
                        </div>

                        <div className="p-4 bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded">
                          <div className="font-medium text-sm text-green-900 mb-2">Rétention Légale</div>
                          <div className="space-y-1 text-xs text-[var(--color-success-darker)]">
                            <div>• Documents comptables : 10 ans</div>
                            <div>• Pièces justificatives : 10 ans</div>
                            <div>• États financiers : 30 ans</div>
                            <div>• Correspondances : 5 ans</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit et Traçabilité */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Audit et Traçabilité</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Journal d'Audit Complet</h4>
                      <div className="space-y-2">
                        {[
                          {
                            action: 'Création provision Client ABC',
                            qui: 'Marie Dupont',
                            quoi: 'REG-001 - 150,000 XOF',
                            quand: '03/01/2024 14:30:25',
                            ou: 'Douala (192.168.1.45)'
                          },
                          {
                            action: 'Validation amortissement',
                            qui: 'Jean Martin',
                            quoi: 'REG-004 - 33,333 XOF',
                            quand: '04/01/2024 09:15:12',
                            ou: 'Yaoundé (192.168.1.38)'
                          },
                          {
                            action: 'Modification écriture CL-000001',
                            qui: 'Paul Bernard',
                            quoi: 'Libellé modifié',
                            quand: '05/01/2024 11:22:08',
                            ou: 'Douala (192.168.1.52)'
                          }
                        ].map((audit, index) => (
                          <div key={index} className="p-3 border rounded text-xs">
                            <div className="font-medium text-[var(--color-primary)]">{audit.action}</div>
                            <div className="mt-1 space-y-0.5 text-[var(--color-text-primary)]">
                              <div><strong>Qui:</strong> {audit.qui}</div>
                              <div><strong>Quoi:</strong> {audit.quoi}</div>
                              <div><strong>Quand:</strong> {audit.quand}</div>
                              <div><strong>Où:</strong> {audit.ou}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Fonction de Recherche Avancée</h4>
                      <div className="space-y-4">
                        <div className="p-4 bg-[var(--color-background-secondary)] border rounded">
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <input type="text" placeholder="Rechercher..." className="px-3 py-2 border border-[var(--color-border-dark)] rounded text-sm" />
                            <select className="px-3 py-2 border border-[var(--color-border-dark)] rounded text-sm">
                              <option>Toutes actions</option>
                              <option>Créations</option>
                              <option>Modifications</option>
                              <option>Validations</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => setShowPeriodModal(true)}
                              className="px-3 py-2 border border-[var(--color-border-dark)] rounded text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Calendar className="w-4 h-4" />
                              {dateRange.startDate && dateRange.endDate
                                ? `${dateRange.startDate} - ${dateRange.endDate}`
                                : 'Sélectionner'
                              }
                            </button>
                            <select className="px-3 py-2 border border-[var(--color-border-dark)] rounded text-sm">
                              <option>Tous utilisateurs</option>
                              <option>Marie Dupont</option>
                              <option>Jean Martin</option>
                              <option>Paul Bernard</option>
                            </select>
                          </div>
                          <button className="mt-3 w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
                            Rechercher dans l'Historique
                          </button>
                        </div>

                        <div className="p-4 bg-[var(--color-error-lightest)] border border-[var(--color-error-light)] rounded">
                          <div className="font-medium text-sm text-red-900 mb-2">Accès Lecture Seule</div>
                          <div className="space-y-1 text-xs text-red-800">
                            <div>• Exercice 2023 : Verrouillé ✓</div>
                            <div>• Exercice 2022 : Archivé ✓</div>
                            <div>• Exercice 2021 : Coffre-fort numérique ✓</div>
                          </div>
                          <button className="mt-2 w-full px-3 py-2 bg-[var(--color-error)] text-white rounded hover:bg-[var(--color-error-dark)] text-sm">
                            Consulter Exercices Clos
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Piste d'audit des modifications */}
                  <div className="mt-6 bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-3">Piste d'Audit des Modifications</h4>
                    <div className="text-sm text-yellow-800">
                      <strong>Intangibilité garantie :</strong> Toute modification est tracée avec hash blockchain.
                      Conformité SYSCOHADA Art. 18 - Aucune modification sans trace.
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <strong>Hash Blockchain :</strong><br />
                        <code className="text-[var(--color-warning-dark)]">a7f5c9d2e8b1...</code>
                      </div>
                      <div>
                        <strong>Horodatage Certifié :</strong><br />
                        <span className="text-[var(--color-warning-dark)]">RFC 3161 - TSA Qualifiée</span>
                      </div>
                      <div>
                        <strong>Signature Numérique :</strong><br />
                        <span className="text-[var(--color-warning-dark)]">PKI - Certificat ANSSI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET PARAMÉTRAGE */}
            {ongletActif === 'parametrage' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">E. Paramétrage et Automatisation</h2>

                {/* Règles de Gestion Configurables */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Règles de Gestion Configurables</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Taux d'Amortissement par Catégorie</h4>
                      <div className="space-y-2">
                        {[
                          { categorie: 'Matériel informatique (245)', duree: '3 ans', taux: '33.33%', syscohada: 'Conforme' },
                          { categorie: 'Matériel bureau (244)', duree: '5 ans', taux: '20%', syscohada: 'Conforme' },
                          { categorie: 'Matériel transport (218)', duree: '4 ans', taux: '25%', syscohada: 'Conforme' },
                          { categorie: 'Constructions (213)', duree: '5-20 ans', taux: '5-20%', syscohada: 'Conforme' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                            <div>
                              <div className="font-medium text-sm">{item.categorie}</div>
                              <div className="text-xs text-[var(--color-text-primary)]">{item.duree} • {item.taux}</div>
                            </div>
                            <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] rounded text-xs">
                              {item.syscohada}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Barèmes de Provisions</h4>
                      <div className="space-y-2">
                        {[
                          { type: 'Clients (ancienneté)', bareme: '6-12 mois: 50%, >12 mois: 100%', statut: 'ACTIF' },
                          { type: 'Stocks (rotation)', bareme: '>365j: 50%, >180j: 25%', statut: 'ACTIF' },
                          { type: 'Risques (litiges)', bareme: 'Selon probabilité 10-100%', statut: 'ACTIF' },
                          { type: 'Congés payés', bareme: 'Salaire × 12.5% × jours', statut: 'ACTIF' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                            <div>
                              <div className="font-medium text-sm">{item.type}</div>
                              <div className="text-xs text-[var(--color-text-primary)]">{item.bareme}</div>
                            </div>
                            <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-xs">
                              {item.statut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Écritures récurrentes programmables */}
                  <div className="mt-6">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Écritures Récurrentes Programmables</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        {
                          nom: 'Loyer mensuel bureau',
                          comptes: '613000 / 401500',
                          montant: 250000,
                          frequence: 'Mensuelle',
                          prochaine: '01/02'
                        },
                        {
                          nom: 'Amortissement matériel',
                          comptes: '681200 / 28245',
                          montant: 33333,
                          frequence: 'Mensuelle',
                          prochaine: '31/01'
                        },
                        {
                          nom: 'Provision congés payés',
                          comptes: '641100 / 432800',
                          montant: 45000,
                          frequence: 'Trimestrielle',
                          prochaine: '31/03'
                        }
                      ].map((ecriture, index) => (
                        <div key={index} className="p-4 border rounded bg-purple-50">
                          <div className="font-medium text-sm">{ecriture.nom}</div>
                          <div className="text-xs text-[var(--color-text-primary)] mt-1">
                            Comptes: {ecriture.comptes}
                          </div>
                          <div className="text-xs text-[var(--color-text-primary)]">
                            Montant: {formaterMontant(ecriture.montant)}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs">{ecriture.frequence}</span>
                            <span className="text-xs font-medium text-purple-600">
                              Prochaine: {ecriture.prochaine}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Déclencheurs Automatiques */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Déclencheurs Automatiques</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Programmation des Traitements</h4>
                      <div className="space-y-3">
                        {[
                          { traitement: 'Clôture mensuelle', declencheur: 'Fin de mois + 2 jours', statut: 'ACTIF' },
                          { traitement: 'Clôture trimestrielle', declencheur: 'Fin trimestre + 10 jours', statut: 'ACTIF' },
                          { traitement: 'Calcul provisions', declencheur: 'J+3 après fin de mois', statut: 'ACTIF' },
                          { traitement: 'Génération états', declencheur: 'Après validation complète', statut: 'ACTIF' }
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                            <div>
                              <div className="font-medium text-sm">{item.traitement}</div>
                              <div className="text-xs text-[var(--color-text-primary)]">{item.declencheur}</div>
                            </div>
                            <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] rounded text-xs">
                              {item.statut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Notifications Email/SMS</h4>
                      <div className="space-y-3">
                        {[
                          { destinataire: 'marie.dupont@company.com', type: 'Email', evenement: 'Tâche assignée', statut: 'ACTIF' },
                          { destinataire: '+237 6XX XX XX XX', type: 'SMS', evenement: 'Échéance J+1', statut: 'ACTIF' },
                          { destinataire: 'paul.bernard@company.com', type: 'Email', evenement: 'Validation requise', statut: 'ACTIF' },
                          { destinataire: 'Teams Channel #Compta', type: 'Teams', evenement: 'Clôture terminée', statut: 'ACTIF' }
                        ].map((notif, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-primary-lightest)] rounded">
                            <div>
                              <div className="font-medium text-sm">{notif.destinataire}</div>
                              <div className="text-xs text-[var(--color-text-primary)]">{notif.evenement}</div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-xs">
                                {notif.type}
                              </span>
                              <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] rounded text-xs">
                                {notif.statut}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Intégration systèmes tiers */}
                  <div className="mt-6 bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-3">Intégration avec Systèmes Tiers</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm font-medium text-[var(--color-success-darker)] mb-2">Banques</div>
                        <div className="space-y-1 text-xs text-[var(--color-success-dark)]">
                          <div>• BCEAO : API connectée ✓</div>
                          <div>• UBA : Import SWIFT MT940 ✓</div>
                          <div>• SGBC : Manuel</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--color-success-darker)] mb-2">{t('navigation.suppliers')}</div>
                        <div className="space-y-1 text-xs text-[var(--color-success-dark)]">
                          <div>• ENEO : Factures électroniques ✓</div>
                          <div>• CAMTEL : API REST ✓</div>
                          <div>• Autres : Email/EDI</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[var(--color-success-darker)] mb-2">API Externes</div>
                        <div className="space-y-1 text-xs text-[var(--color-success-dark)]">
                          <div>• Taux de change BCE ✓</div>
                          <div>• Calendrier jours fériés ✓</div>
                          <div>• Validation TVA MINFI</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET CYCLE DE CLÔTURE */}
            {ongletActif === 'cycle' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Gestion du Cycle de Clôture</h2>

                {/* Création et Configuration d'Exercice/Période */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Création et Configuration d'Exercice/Période</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Période de rapport</label>
                          <button
                            onClick={() => setShowPeriodModal(true)}
                            className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            {dateRange.startDate && dateRange.endDate
                              ? `${dateRange.startDate} - ${dateRange.endDate}`
                              : 'Sélectionner une période'
                            }
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Responsable Principal</label>
                        <select className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md">
                          <option>Marie Dupont - Chef Comptable</option>
                          <option>Jean Martin - Contrôleur</option>
                          <option>Paul Bernard - Directeur Comptable</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Seuil de Matérialité</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="number" placeholder="Montant" className="px-3 py-2 border border-[var(--color-border-dark)] rounded-md" defaultValue="10000" />
                          <input type="number" placeholder="%" className="px-3 py-2 border border-[var(--color-border-dark)] rounded-md" defaultValue="5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Intervenants</label>
                        <div className="space-y-2">
                          {[
                            { nom: 'Marie Dupont', role: 'Saisie', email: 'marie.dupont@company.com' },
                            { nom: 'Jean Martin', role: 'Contrôle', email: 'jean.martin@company.com' },
                            { nom: 'Paul Bernard', role: 'Validation', email: 'paul.bernard@company.com' },
                            { nom: 'Dir. Financier', role: 'Approbation', email: 'dfinancier@company.com' }
                          ].map((intervenant, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                              <div>
                                <div className="font-medium text-sm">{intervenant.nom}</div>
                                <div className="text-xs text-[var(--color-text-primary)]">{intervenant.email}</div>
                              </div>
                              <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-xs">
                                {intervenant.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Configuration Devises</label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">XOF (Principal)</span>
                            <span className="text-sm text-[var(--color-text-primary)]">Taux: 1.0000</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">EUR</span>
                            <input type="number" className="w-24 px-2 py-1 border border-[var(--color-border-dark)] rounded text-sm" defaultValue="655.957" />
                            <span className="text-xs text-[var(--color-text-primary)]">Taux de clôture</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">USD</span>
                            <input type="number" className="w-24 px-2 py-1 border border-[var(--color-border-dark)] rounded text-sm" defaultValue="615.70" />
                            <span className="text-xs text-[var(--color-text-primary)]">Taux de clôture</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matrice de Responsabilités */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Matrice de Responsabilités</h3>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[var(--color-background-secondary)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Opération</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Saisie</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Contrôle</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Validation</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Approbation</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Seuil (XOF)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {[
                          { operation: 'Provisions Clients', saisie: 'Comptable', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Dir. Financier', seuil: '50,000' },
                          { operation: 'Amortissements', saisie: 'Comptable', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Auto', seuil: '100,000' },
                          { operation: 'Régularisations', saisie: 'Comptable', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Dir. Financier', seuil: '25,000' },
                          { operation: 'États Financiers', saisie: 'Auto', controle: 'Chef Comptable', validation: 'Dir. Comptable', approbation: 'Dir. Général', seuil: 'Tous montants' }
                        ].map((ligne, index) => (
                          <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                            <td className="px-4 py-3 text-sm font-medium">{ligne.operation}</td>
                            <td className="px-4 py-3 text-center text-sm">{ligne.saisie}</td>
                            <td className="px-4 py-3 text-center text-sm">{ligne.controle}</td>
                            <td className="px-4 py-3 text-center text-sm">{ligne.validation}</td>
                            <td className="px-4 py-3 text-center text-sm">{ligne.approbation}</td>
                            <td className="px-4 py-3 text-center text-sm font-mono">{ligne.seuil}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Paramétrage des Seuils */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Paramétrage des Seuils de Matérialité</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Provisions Clients</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm w-24">Montant :</span>
                          <input type="number" className="flex-1 px-3 py-2 border border-[var(--color-border-dark)] rounded-md" defaultValue="50000" />
                          <span className="text-sm">XOF</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm w-24">Pourcentage :</span>
                          <input type="number" className="flex-1 px-3 py-2 border border-[var(--color-border-dark)] rounded-md" defaultValue="2" />
                          <span className="text-sm">%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Amortissements</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm w-24">Montant :</span>
                          <input type="number" className="flex-1 px-3 py-2 border border-[var(--color-border-dark)] rounded-md" defaultValue="100000" />
                          <span className="text-sm">XOF</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm w-24">Validation :</span>
                          <select className="flex-1 px-3 py-2 border border-[var(--color-border-dark)] rounded-md">
                            <option>Automatique</option>
                            <option>Manuelle</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Régularisations</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm w-24">Montant :</span>
                          <input type="number" className="flex-1 px-3 py-2 border border-[var(--color-border-dark)] rounded-md" defaultValue="25000" />
                          <span className="text-sm">XOF</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm w-24">Cut-off :</span>
                          <input type="number" className="flex-1 px-3 py-2 border border-[var(--color-border-dark)] rounded-md" defaultValue="3" />
                          <span className="text-sm">jours</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calendrier Intelligent Multi-Niveaux */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Calendrier de Clôture Intelligent</h3>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-sm">Jour</button>
                      <button className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm hover:bg-[var(--color-background-secondary)]">Semaine</button>
                      <button className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm hover:bg-[var(--color-background-secondary)]">Mois</button>
                      <button className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm hover:bg-[var(--color-background-secondary)]">Trimestre</button>
                      <button className="px-3 py-1 border border-[var(--color-border-dark)] rounded text-sm hover:bg-[var(--color-background-secondary)]">Année</button>
                    </div>

                    <div className="flex space-x-2">
                      <button className="px-3 py-1 bg-[var(--color-success)] text-white rounded text-sm hover:bg-[var(--color-success-dark)]">
                        Sync Outlook
                      </button>
                      <button className="px-3 py-1 bg-[var(--color-error)] text-white rounded text-sm hover:bg-[var(--color-error-dark)]">
                        Sync Google
                      </button>
                    </div>
                  </div>

                  {/* Tâches avec échéances personnalisables */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-[var(--color-text-primary)]">Échéances Personnalisables</h4>
                    {[
                      { tache: 'Calcul provisions clients', echeance: 'J+05', dependance: '', type: 'CRITIQUE' },
                      { tache: 'Validation amortissements', echeance: 'J+07', dependance: 'Provisions validées', type: 'HAUTE' },
                      { tache: 'Régularisations cut-off', echeance: 'J+10', dependance: 'Balance pré-clôture', type: 'HAUTE' },
                      { tache: 'Approbation finale', echeance: 'J+15', dependance: 'Toutes validations', type: 'BLOQUANTE' },
                      { tache: 'Génération états financiers', echeance: 'J+18', dependance: 'Approbation', type: 'NORMALE' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <span className={`w-3 h-3 rounded-full ${
                            item.type === 'CRITIQUE' ? 'bg-[var(--color-error)]' :
                            item.type === 'BLOQUANTE' ? 'bg-purple-500' :
                            item.type === 'HAUTE' ? 'bg-[var(--color-warning)]' :
                            'bg-[var(--color-primary)]'
                          }`}></span>
                          <div>
                            <div className="font-medium text-sm">{item.tache}</div>
                            {item.dependance && (
                              <div className="text-xs text-[var(--color-text-primary)]">Dépend de: {item.dependance}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm font-mono">{item.echeance}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.type === 'CRITIQUE' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                            item.type === 'BLOQUANTE' ? 'bg-purple-100 text-purple-800' :
                            item.type === 'HAUTE' ? 'bg-[var(--color-warning-lighter)] text-orange-800' :
                            'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Gestion jours fériés */}
                  <div className="mt-6 bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-3">Gestion des Jours Fériés et Congés</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-yellow-800 mb-2">Jours Fériés Identifiés</div>
                        <ul className="space-y-1 text-[var(--color-warning-dark)]">
                          <li>• 01/01 - Nouvel An</li>
                          <li>• 11/02 - Fête Jeunesse</li>
                          <li>• 20/05 - Fête Nationale</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-800 mb-2">Périodes de Congés</div>
                        <ul className="space-y-1 text-[var(--color-warning-dark)]">
                          <li>• 15-25/08 - Congés d'été</li>
                          <li>• 20/12-05/01 - Congés fin d'année</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-yellow-800 mb-2">Impact Planning</div>
                        <ul className="space-y-1 text-[var(--color-warning-dark)]">
                          <li>• +2 jours délai si férié</li>
                          <li>• Réaffectation automatique</li>
                          <li>• Notifications anticipées</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET WORKFLOW */}
            {ongletActif === 'workflow' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Workflow de Validation Avancé</h2>

                {/* Processus Multi-Niveaux */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-medium text-[var(--color-text-primary)] mb-4">Processus Multi-Niveaux</h3>

                  <div className="space-y-4">
                    {/* Circuit configurable */}
                    <div className="flex items-center space-x-4">
                      {[
                        { niveau: 'Saisie', utilisateur: 'M. Dupont', statut: 'TERMINE', signature: false },
                        { niveau: 'Contrôle', utilisateur: 'Mme Martin', statut: 'TERMINE', signature: false },
                        { niveau: 'Validation', utilisateur: 'M. Bernard', statut: 'EN_COURS', signature: false },
                        { niveau: 'Approbation', utilisateur: 'Dir. Financier', statut: 'EN_ATTENTE', signature: true },
                        { niveau: 'Signature', utilisateur: 'Dir. Général', statut: 'EN_ATTENTE', signature: true }
                      ].map((etape, index) => (
                        <div key={index} className="flex-1">
                          <div className={`p-4 rounded-lg border text-center ${
                            etape.statut === 'TERMINE' ? 'bg-[var(--color-success-lighter)] border-green-300' :
                            etape.statut === 'EN_COURS' ? 'bg-[var(--color-primary-lighter)] border-blue-300' :
                            'bg-[var(--color-background-hover)] border-[var(--color-border-dark)]'
                          }`}>
                            <div className="font-medium text-sm">{etape.niveau}</div>
                            <div className="text-xs text-[var(--color-text-primary)] mt-1">{etape.utilisateur}</div>
                            {etape.signature && (
                              <div className="text-xs text-purple-600 mt-1">🔐 Signature électronique</div>
                            )}
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

                    {/* Délégation temporaire */}
                    <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-4">
                      <h4 className="font-medium text-[var(--color-primary-darker)] mb-3">Délégation Temporaire de Pouvoirs</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[var(--color-primary-darker)] mb-2">Délégant</label>
                          <select className="w-full px-3 py-2 border border-blue-300 rounded-md">
                            <option>M. Bernard - Dir. Comptable</option>
                            <option>Dir. Financier</option>
                            <option>Dir. Général</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--color-primary-darker)] mb-2">Délégataire</label>
                          <select className="w-full px-3 py-2 border border-blue-300 rounded-md">
                            <option>Mme Martin - Chef Comptable</option>
                            <option>M. Dupont - Comptable Senior</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--color-primary-darker)] mb-2">Période</label>
                          <button
                            onClick={() => setShowPeriodModal(true)}
                            className="w-full px-3 py-2 border border-blue-300 rounded-md hover:bg-blue-50 flex items-center gap-2"
                          >
                            <Calendar className="w-4 h-4" />
                            {dateRange.startDate && dateRange.endDate
                              ? `${dateRange.startDate} - ${dateRange.endDate}`
                              : 'Sélectionner une période'
                            }
                          </button>
                        </div>
                        <div className="flex items-end">
                          <button className="w-full px-3 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-dark)]">
                            Créer Délégation
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Validation par seuils */}
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-4">Validation par Seuils de Montants</h4>
                      <div className="space-y-3">
                        {[
                          { montant: '< 25,000 XOF', niveau: 'Validation automatique', responsable: 'Système' },
                          { montant: '25,000 - 100,000 XOF', niveau: 'Chef Comptable', responsable: 'Mme Martin' },
                          { montant: '100,000 - 500,000 XOF', niveau: 'Directeur Comptable', responsable: 'M. Bernard' },
                          { montant: '500,000 - 2,000,000 XOF', niveau: 'Directeur Financier', responsable: 'Dir. Financier' },
                          { montant: '> 2,000,000 XOF', niveau: 'Directeur Général + Signature', responsable: 'Dir. Général' }
                        ].map((seuil, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded">
                            <span className="font-mono text-sm">{seuil.montant}</span>
                            <span className="text-sm">{seuil.niveau}</span>
                            <span className="text-sm text-[var(--color-primary)]">{seuil.responsable}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Historique complet avec horodatage et géolocalisation */}
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-4">Historique Complet avec Horodatage</h4>
                      <div className="space-y-3">
                        {[
                          {
                            action: 'Saisie provisions clients',
                            utilisateur: 'M. Dupont',
                            horodatage: '03/01/2024 14:30:25',
                            ip: '192.168.1.45',
                            localisation: 'Douala, Cameroun',
                            statut: 'TERMINE'
                          },
                          {
                            action: 'Contrôle calculs amortissements',
                            utilisateur: 'Mme Martin',
                            horodatage: '04/01/2024 09:15:12',
                            ip: '192.168.1.38',
                            localisation: 'Yaoundé, Cameroun',
                            statut: 'TERMINE'
                          },
                          {
                            action: 'Validation en cours',
                            utilisateur: 'M. Bernard',
                            horodatage: '05/01/2024 11:22:08',
                            ip: '192.168.1.52',
                            localisation: 'Douala, Cameroun',
                            statut: 'EN_COURS'
                          }
                        ].map((historique, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded">
                            <div>
                              <div className="font-medium text-sm">{historique.action}</div>
                              <div className="text-xs text-[var(--color-text-primary)] mt-1">
                                {historique.utilisateur} • {historique.horodatage}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                                IP: {historique.ip} • {historique.localisation}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              historique.statut === 'TERMINE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                              'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'
                            }`}>
                              {historique.statut}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contrôles Automatiques */}
                    <div className="bg-white border rounded-lg p-6">
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-4">Contrôles Automatiques</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="font-medium text-[var(--color-text-primary)] mb-3">Vérifications de Cohérence Comptable</h5>
                          <div className="space-y-3">
                            {[
                              {
                                controle: 'Équilibre débit/crédit',
                                resultat: 'CONFORME',
                                details: 'Balance équilibrée : 0 XOF d\'écart',
                                reference: 'SYSCOHADA Art. 65'
                              },
                              {
                                controle: 'Cohérence plan comptable',
                                resultat: 'CONFORME',
                                details: 'Tous comptes respectent SYSCOHADA',
                                reference: 'SYSCOHADA Art. 15'
                              },
                              {
                                controle: 'Validation imputations analytiques',
                                resultat: 'ATTENTION',
                                details: '3 écritures sans ventilation analytique',
                                reference: 'Contrôle interne'
                              },
                              {
                                controle: 'Contrôle séquentialité écritures',
                                resultat: 'CONFORME',
                                details: 'Numérotation continue CL-000001 à CL-000025',
                                reference: 'SYSCOHADA Art. 18'
                              }
                            ].map((controle, index) => (
                              <div key={index} className={`p-3 border rounded ${
                                controle.resultat === 'CONFORME' ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' :
                                controle.resultat === 'ATTENTION' ? 'border-yellow-200 bg-[var(--color-warning-lightest)]' :
                                'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{controle.controle}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    controle.resultat === 'CONFORME' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                    controle.resultat === 'ATTENTION' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                                    'bg-[var(--color-error-lighter)] text-red-800'
                                  }`}>
                                    {controle.resultat}
                                  </span>
                                </div>
                                <div className="text-xs text-[var(--color-text-primary)]">{controle.details}</div>
                                <div className="text-xs text-[var(--color-primary)] mt-1">{controle.reference}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-[var(--color-text-primary)] mb-3">Alertes sur Écarts Significatifs</h5>
                          <div className="space-y-3">
                            {[
                              {
                                alerte: 'Écart provision Client ABC Corp',
                                type: 'MATERIEL',
                                montant: 'Écart de 15,000 XOF vs provision N-1',
                                action: 'Justification requise',
                                urgence: 'MOYENNE'
                              },
                              {
                                alerte: 'Amortissement matériel informatique',
                                type: 'CALCUL',
                                montant: 'Taux appliqué 33.33% conforme SYSCOHADA',
                                action: 'Aucune action requise',
                                urgence: 'FAIBLE'
                              },
                              {
                                alerte: 'Régularisation stock marchandises',
                                type: 'INVENTAIRE',
                                montant: 'Mali de 25,000 XOF détecté',
                                action: 'Vérification inventaire physique',
                                urgence: 'HAUTE'
                              }
                            ].map((alerte, index) => (
                              <div key={index} className={`p-3 border rounded ${
                                alerte.urgence === 'HAUTE' ? 'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]' :
                                alerte.urgence === 'MOYENNE' ? 'border-yellow-200 bg-[var(--color-warning-lightest)]' :
                                'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">{alerte.alerte}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    alerte.urgence === 'HAUTE' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                                    alerte.urgence === 'MOYENNE' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                                    'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                                  }`}>
                                    {alerte.urgence}
                                  </span>
                                </div>
                                <div className="text-xs text-[var(--color-text-primary)] mb-1">Type: {alerte.type}</div>
                                <div className="text-xs text-[var(--color-text-primary)] mb-1">{alerte.montant}</div>
                                <div className="text-xs font-medium text-[var(--color-primary)]">{alerte.action}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Signature électronique avec certificats */}
                      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h5 className="font-medium text-purple-900 mb-3">Signature Électronique avec Certificats Numériques</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm font-medium text-purple-800 mb-2">Certificats Actifs</div>
                            <div className="space-y-1 text-xs text-purple-700">
                              <div>• Dir. Financier : Cert. ANSSI #FR2024-001</div>
                              <div>• Dir. Général : Cert. ANSSI #FR2024-002</div>
                              <div>• Expert-Comptable : Cert. OEC #CM2024-156</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-purple-800 mb-2">Signatures Requises</div>
                            <div className="space-y-1 text-xs text-purple-700">
                              <div>• Montants &gt; 500,000 XOF</div>
                              <div>• États financiers officiels</div>
                              <div>• Modifications post-clôture</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-purple-800 mb-2">Statut Signatures</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-3 w-3 text-[var(--color-success)]" />
                                <span className="text-purple-700">Provisions validées</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3 text-yellow-500" />
                                <span className="text-purple-700">États financiers en attente</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET BALANCES */}
            {ongletActif === 'balances' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Balance Pré-Clôture</h2>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead className="bg-[var(--color-background-secondary)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Débit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Total Crédit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Débiteur</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créditeur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {balancePreCloture.map((ligne, index) => (
                        <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                          <td className="px-6 py-4 text-sm font-mono font-medium">{ligne.compte}</td>
                          <td className="px-6 py-4 text-sm">{ligne.libelle}</td>
                          <td className="px-6 py-4 text-right text-sm font-mono text-[var(--color-primary)]">
                            {ligne.debit > 0 ? formaterMontant(ligne.debit) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-mono text-[var(--color-success)]">
                            {ligne.credit > 0 ? formaterMontant(ligne.credit) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-mono font-bold text-[var(--color-primary)]">
                            {ligne.solde_d > 0 ? formaterMontant(ligne.solde_d) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-mono font-bold text-[var(--color-success)]">
                            {ligne.solde_c > 0 ? formaterMontant(ligne.solde_c) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ONGLET PROVISIONS */}
            {ongletActif === 'provisions' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Provisions Créances - Validation Requise</h2>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead className="bg-[var(--color-background-secondary)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Client</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.balance')}</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Ancienneté</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Taux SYSCOHADA</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Provision</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Statut</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-text-secondary)] uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {provisions.map((provision) => (
                        <tr key={provision.id} className="hover:bg-[var(--color-background-secondary)]">
                          <td className="px-6 py-4 text-sm font-medium">{provision.client}</td>
                          <td className="px-6 py-4 text-right text-sm font-mono text-[var(--color-primary)]">
                            {formaterMontant(provision.solde)}
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              provision.anciennete >= 365 ? 'bg-[var(--color-error-lighter)] text-red-800' :
                              provision.anciennete >= 180 ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                              'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]'
                            }`}>
                              {provision.anciennete} jours
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-medium">{provision.taux}%</td>
                          <td className="px-6 py-4 text-right text-sm font-mono font-bold text-[var(--color-warning)]">
                            {formaterMontant(provision.provision)}
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
                              <div className="flex space-x-2 justify-center">
                                <button
                                  onClick={() => validerProvision(provision.id, 'VALIDER')}
                                  className="text-[var(--color-success)] hover:text-[var(--color-success-darker)]"
                                  title={t('actions.validate')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => validerProvision(provision.id, 'REJETER')}
                                  className="text-[var(--color-error)] hover:text-red-800"
                                  title="Rejeter"
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
            )}

            {/* ONGLET ÉCRITURES */}
            {ongletActif === 'ecritures' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Journal de Clôture</h2>

                {ecritures.length > 0 ? (
                  <div className="space-y-4">
                    {ecritures.map((ecriture) => (
                      <div key={ecriture.id} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <span className="font-mono font-bold text-lg">{ecriture.numero}</span>
                            <span className="text-[var(--color-text-primary)]">{ecriture.libelle}</span>
                            <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] rounded text-xs">
                              {ecriture.statut}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-purple-600">{formaterMontant(ecriture.debit)}</span>
                            <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]" title={t('common.edit')}>
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-[var(--color-error)] hover:text-red-800" title={t('common.delete')} aria-label="Fermer">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="bg-[var(--color-primary-lightest)] p-3 rounded">
                            <div className="font-medium">Débit: 681500 - Dotations provisions</div>
                            <div className="font-mono">{formaterMontant(ecriture.debit)}</div>
                          </div>
                          <div className="bg-[var(--color-success-lightest)] p-3 rounded">
                            <div className="font-medium">Crédit: 491100 - Provisions créances</div>
                            <div className="font-mono">{formaterMontant(ecriture.credit)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[var(--color-text-secondary)]">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p>Aucune écriture générée</p>
                    <p className="text-sm">Validez des provisions pour générer les écritures</p>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET CALENDRIER */}
            {ongletActif === 'calendrier' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Calendrier des Clôtures</h2>

                <div className="grid grid-cols-7 gap-2">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((jour) => (
                    <div key={jour} className="text-center text-sm font-medium text-[var(--color-text-secondary)] py-2">
                      {jour}
                    </div>
                  ))}

                  {Array.from({length: 31}, (_, i) => {
                    const jour = i + 1;
                    let classe = 'text-center p-3 text-sm border rounded border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]';

                    if (jour === 5) {
                      classe = 'text-center p-3 text-sm border rounded bg-[var(--color-error-lighter)] border-red-300 text-red-800';
                    } else if (jour === 15) {
                      classe = 'text-center p-3 text-sm border rounded bg-[var(--color-warning-lighter)] border-yellow-300 text-yellow-800';
                    } else if (jour === 25) {
                      classe = 'text-center p-3 text-sm border rounded bg-[var(--color-success-lighter)] border-green-300 text-[var(--color-success-darker)]';
                    }

                    return (
                      <div key={jour} className={classe}>
                        <div>{jour}</div>
                        {jour === 5 && <div className="text-xs">J+5</div>}
                        {jour === 15 && <div className="text-xs">Valid.</div>}
                        {jour === 25 && <div className="text-xs">✓</div>}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  {[
                    { tache: 'Calcul provisions clients', responsable: 'Marie Dupont', echeance: '05/01', statut: 'EN_COURS' },
                    { tache: 'Validation directeur comptable', responsable: 'M. Bernard', echeance: '15/01', statut: 'EN_ATTENTE' },
                    { tache: 'Approbation directeur financier', responsable: 'Dir. Financier', echeance: '20/01', statut: 'PLANIFIEE' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-[var(--color-background-secondary)] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          item.statut === 'EN_COURS' ? 'bg-[var(--color-primary)]' :
                          item.statut === 'EN_ATTENTE' ? 'bg-[var(--color-warning)]' :
                          'bg-gray-400'
                        }`}></div>
                        <div>
                          <div className="font-medium">{item.tache}</div>
                          <div className="text-sm text-[var(--color-text-primary)] flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{item.responsable}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-[var(--color-text-primary)]">{item.echeance}</span>
                        <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-xs">
                          {item.statut}
                        </span>
                      </div>
                    </div>
                  ))}
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
                    <h3 className="font-medium mb-2">Journal de Clôture</h3>
                    <p className="text-sm text-[var(--color-text-primary)] mb-4">Export PDF complet</p>
                    <button
                      onClick={() => alert('Export PDF journal en cours...')}
                      className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
                    >
                      Exporter PDF
                    </button>
                  </div>

                  <div className="bg-white border rounded-lg p-6 text-center">
                    <Database className="h-12 w-12 text-[var(--color-success)] mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Balance Générale</h3>
                    <p className="text-sm text-[var(--color-text-primary)] mb-4">Export Excel avec formules</p>
                    <button
                      onClick={() => alert('Export Excel balance en cours...')}
                      className="w-full px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]"
                    >
                      Exporter Excel
                    </button>
                  </div>

                  <div className="bg-white border rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">Fichier FEC</h3>
                    <p className="text-sm text-[var(--color-text-primary)] mb-4">Pour administration</p>
                    <button
                      onClick={() => alert('Génération FEC en cours...')}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Générer FEC
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Références SYSCOHADA */}
        <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-6">
          <h3 className="font-medium text-[var(--color-primary-darker)] mb-3">Conformité SYSCOHADA</h3>
          <div className="grid grid-cols-4 gap-4 text-sm text-[var(--color-primary-darker)]">
            <div><strong>Art. 45 :</strong> Provisions selon ancienneté</div>
            <div><strong>Art. 42 :</strong> Amortissements barèmes</div>
            <div><strong>Art. 58 :</strong> Régularisations cut-off</div>
            <div><strong>Art. 65 :</strong> Balance équilibrée</div>
          </div>
        </div>
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onPeriodSelect={(period) => {
          setDateRange(period);
          setShowPeriodModal(false);
        }}
      />
    </div>
  );
};

export default ClotureComptableFinal;