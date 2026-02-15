import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Calculator, Search, Plus, X, Check, AlertCircle,
  TrendingUp, TrendingDown, FileText, User, Calendar,
  Building, CreditCard, Package, Receipt, DollarSign,
  Percent, Hash, Clock, ChevronDown, Info, Zap,
  RefreshCw, Copy, Save, Send, AlertTriangle, CheckCircle
} from 'lucide-react';
import SearchableDropdown from '../ui/SearchableDropdown';
import { TVAValidator, TVAValidationResult } from '../../utils/tvaValidation';

// Types
interface JournalType {
  code: 'AC' | 'VE' | 'TR' | 'BQ' | 'CA' | 'OD' | 'AN' | 'NV';
  label: string;
  comptesPreferes: string[];
  suggestionsAuto: boolean;
  champSpecifiques: ChampsSpecifique[];
}

interface ChampsSpecifique {
  nom: string;
  type: 'text' | 'number' | 'date' | 'select' | 'autocomplete';
  label: string;
  obligatoire: boolean;
  calcul?: string;
  dependances?: string[];
}

interface LigneEcriture {
  id: string;
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  tiers?: string;
  reference?: string;
  echeance?: string;
  tva?: {
    taux: number;
    montantHT: number;
    montantTVA: number;
  };
  analytique?: {
    axe: string;
    section: string;
    pourcentage: number;
  }[];
}

interface SuggestionCompte {
  code: string;
  libelle: string;
  type: 'charge' | 'produit' | 'tiers' | 'tresorerie' | 'immobilisation';
  dernierUsage?: Date;
  frequence: number;
  solde?: number;
}

interface IntelligentEntryFormProps {
  journalType: JournalType;
  onSubmit: (ecritures: LigneEcriture[]) => void;
  onCancel: () => void;
  companyId: string;
  exerciceId: string;
}

const IntelligentEntryForm: React.FC<IntelligentEntryFormProps> = ({
  journalType,
  onSubmit,
  onCancel,
  companyId,
  exerciceId
}) => {
  const { t } = useLanguage();
  // États principaux
  const [lignes, setLignes] = useState<LigneEcriture[]>([]);
  const [modeSaisie, setModeSaisie] = useState<'standard' | 'rapide' | 'expert'>('rapide');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchCompte, setSearchCompte] = useState('');
  const [selectedLigne, setSelectedLigne] = useState<string | null>(null);
  
  // États pour la saisie rapide
  const [saisieRapide, setSaisieRapide] = useState({
    date: new Date().toISOString().split('T')[0],
    piece: '',
    tiers: '',
    montantHT: 0,
    tauxTVA: 19.25,
    montantTVA: 0,
    montantTTC: 0,
    libelle: '',
    modeReglement: '',
    echeance: '',
    reference: '',
    lettrage: ''
  });

  // États pour les suggestions
  const [suggestions, setSuggestions] = useState<SuggestionCompte[]>([]);
  const [historiqueComptes, setHistoriqueComptes] = useState<SuggestionCompte[]>([]);
  const [modelesPreferes, setModelesPreferes] = useState<any[]>([]);
  const [tvaValidation, setTvaValidation] = useState<TVAValidationResult | null>(null);

  // Configurations par type de journal
  const configurationsJournal = {
    'AC': {
      label: 'Achats',
      comptesDefaut: {
        fournisseur: '401000',
        tva: '445660',
        charge: '60'
      },
      champsSaisieRapide: ['fournisseur', 'montantHT', 'tauxTVA', 'compte_charge'],
      validations: ['piece_obligatoire', 'tva_coherente', 'echeance_future']
    },
    'VE': {
      label: 'Ventes',
      comptesDefaut: {
        client: '411000',
        tva: '445710',
        produit: '70'
      },
      champsSaisieRapide: ['client', 'montantHT', 'tauxTVA', 'compte_produit'],
      validations: ['numero_facture', 'tva_coherente', 'client_existant']
    },
    'BQ': {
      label: 'Banque',
      comptesDefaut: {
        banque: '512000',
        charge: '6',
        produit: '7'
      },
      champsSaisieRapide: ['compte_banque', 'montant', 'type_operation', 'reference'],
      validations: ['rapprochement_possible', 'solde_suffisant']
    },
    'CA': {
      label: 'Caisse',
      comptesDefaut: {
        caisse: '531000',
        charge: '6',
        produit: '7'
      },
      champsSaisieRapide: ['montant', 'type_operation', 'justificatif'],
      validations: ['plafond_caisse', 'piece_justificative']
    },
    'OD': {
      label: 'Opérations Diverses',
      comptesDefaut: {},
      champsSaisieRapide: [],
      validations: ['equilibre_ecriture']
    },
    'AN': {
      label: 'A Nouveaux',
      comptesDefaut: {},
      champsSaisieRapide: [],
      validations: ['periode_ouverture', 'comptes_bilan']
    }
  };

  // Calculs automatiques
  const calculerTVA = useCallback((montantHT: number, taux: number) => {
    const montantTVA = montantHT * (taux / 100);
    const montantTTC = montantHT + montantTVA;
    return { montantTVA, montantTTC };
  }, []);

  const calculerHT = useCallback((montantTTC: number, taux: number) => {
    const montantHT = montantTTC / (1 + taux / 100);
    const montantTVA = montantTTC - montantHT;
    return { montantHT, montantTVA };
  }, []);

  // Calculs mémorisés pour éviter les boucles
  const calculatedAmounts = useMemo(() => {
    if (modeSaisie === 'rapide' && saisieRapide.montantHT > 0) {
      const { montantTVA, montantTTC } = calculerTVA(saisieRapide.montantHT, saisieRapide.tauxTVA);
      return {
        montantTVA: Math.round(montantTVA * 100) / 100,
        montantTTC: Math.round(montantTTC * 100) / 100
      };
    }
    return { montantTVA: 0, montantTTC: 0 };
  }, [saisieRapide.montantHT, saisieRapide.tauxTVA, modeSaisie, calculerTVA]);

  // Mise à jour uniquement si les valeurs ont changé
  useEffect(() => {
    if (calculatedAmounts.montantTVA !== saisieRapide.montantTVA || 
        calculatedAmounts.montantTTC !== saisieRapide.montantTTC) {
      setSaisieRapide(prev => ({
        ...prev,
        montantTVA: calculatedAmounts.montantTVA,
        montantTTC: calculatedAmounts.montantTTC
      }));
    }
  }, [calculatedAmounts.montantTVA, calculatedAmounts.montantTTC, saisieRapide.montantTVA, saisieRapide.montantTTC]);

  // Génération automatique des écritures
  const genererEcrituresAutomatiques = useCallback(() => {
    const config = journalType?.code ? configurationsJournal[journalType.code] : {};
    const nouvelleLignes: LigneEcriture[] = [];
    
    switch (journalType?.code) {
      case 'AC': // Achats
        // Ligne fournisseur
        nouvelleLignes.push({
          id: `ligne-${Date.now()}-1`,
          compte: saisieRapide.tiers || config.comptesDefaut.fournisseur,
          libelle: saisieRapide.libelle || `Achat - ${saisieRapide.reference}`,
          debit: 0,
          credit: saisieRapide.montantTTC,
          tiers: saisieRapide.tiers,
          reference: saisieRapide.reference,
          echeance: saisieRapide.echeance
        });
        
        // Ligne charge
        nouvelleLignes.push({
          id: `ligne-${Date.now()}-2`,
          compte: '607000', // Achats de marchandises
          libelle: saisieRapide.libelle || 'Achats de marchandises',
          debit: saisieRapide.montantHT,
          credit: 0,
          reference: saisieRapide.reference
        });
        
        // Ligne TVA déductible
        if (saisieRapide.montantTVA > 0) {
          nouvelleLignes.push({
            id: `ligne-${Date.now()}-3`,
            compte: config.comptesDefaut.tva,
            libelle: `TVA déductible ${saisieRapide.tauxTVA}%`,
            debit: saisieRapide.montantTVA,
            credit: 0,
            tva: {
              taux: saisieRapide.tauxTVA,
              montantHT: saisieRapide.montantHT,
              montantTVA: saisieRapide.montantTVA
            }
          });
        }
        break;
        
      case 'VE': // Ventes
        // Ligne client
        nouvelleLignes.push({
          id: `ligne-${Date.now()}-1`,
          compte: saisieRapide.tiers || config.comptesDefaut.client,
          libelle: saisieRapide.libelle || `Vente - ${saisieRapide.reference}`,
          debit: saisieRapide.montantTTC,
          credit: 0,
          tiers: saisieRapide.tiers,
          reference: saisieRapide.reference,
          echeance: saisieRapide.echeance
        });
        
        // Ligne produit
        nouvelleLignes.push({
          id: `ligne-${Date.now()}-2`,
          compte: '707000', // Ventes de marchandises
          libelle: saisieRapide.libelle || 'Ventes de marchandises',
          debit: 0,
          credit: saisieRapide.montantHT,
          reference: saisieRapide.reference
        });
        
        // Ligne TVA collectée
        if (saisieRapide.montantTVA > 0) {
          nouvelleLignes.push({
            id: `ligne-${Date.now()}-3`,
            compte: config.comptesDefaut.tva,
            libelle: `TVA collectée ${saisieRapide.tauxTVA}%`,
            debit: 0,
            credit: saisieRapide.montantTVA,
            tva: {
              taux: saisieRapide.tauxTVA,
              montantHT: saisieRapide.montantHT,
              montantTVA: saisieRapide.montantTVA
            }
          });
        }
        break;
        
      case 'BQ': // Banque
        // Ligne banque
        nouvelleLignes.push({
          id: `ligne-${Date.now()}-1`,
          compte: config.comptesDefaut.banque,
          libelle: saisieRapide.libelle || 'Mouvement bancaire',
          debit: saisieRapide.montantTTC > 0 ? 0 : Math.abs(saisieRapide.montantTTC),
          credit: saisieRapide.montantTTC > 0 ? saisieRapide.montantTTC : 0,
          reference: saisieRapide.reference
        });
        
        // Contrepartie
        nouvelleLignes.push({
          id: `ligne-${Date.now()}-2`,
          compte: '', // À saisir
          libelle: saisieRapide.libelle,
          debit: saisieRapide.montantTTC > 0 ? saisieRapide.montantTTC : 0,
          credit: saisieRapide.montantTTC > 0 ? 0 : Math.abs(saisieRapide.montantTTC),
          reference: saisieRapide.reference
        });
        break;
    }
    
    setLignes(nouvelleLignes);
  }, [journalType?.code, saisieRapide, configurationsJournal]);

  // Suggestions intelligentes de comptes
  const obtenirSuggestions = useCallback(async (recherche: string) => {
    // Simulation de suggestions basées sur l'historique et le contexte
    const suggestionsMock: SuggestionCompte[] = [
      {
        code: '607000',
        libelle: 'Achats de marchandises',
        type: 'charge',
        frequence: 156,
        dernierUsage: new Date('2024-01-15')
      },
      {
        code: '401000',
        libelle: 'Fournisseurs',
        type: 'tiers',
        frequence: 89,
        solde: -15420.50
      },
      {
        code: '445660',
        libelle: 'TVA déductible',
        type: 'charge',
        frequence: 156
      },
      {
        code: '411000',
        libelle: 'Clients',
        type: 'tiers',
        frequence: 234,
        solde: 28750.00
      },
      {
        code: '707000',
        libelle: 'Ventes de marchandises',
        type: 'produit',
        frequence: 234
      }
    ];
    
    // Filtrer selon le type de journal
    const config = journalType?.code ? configurationsJournal[journalType.code] : {};
    let suggestionsFiltered = suggestionsMock;
    
    if (journalType?.code === 'AC') {
      suggestionsFiltered = suggestionsMock.filter(s => 
        s.type === 'charge' || s.type === 'tiers' || s.code.startsWith('445')
      );
    } else if (journalType?.code === 'VE') {
      suggestionsFiltered = suggestionsMock.filter(s => 
        s.type === 'produit' || s.type === 'tiers' || s.code.startsWith('445')
      );
    }
    
    // Filtrer selon la recherche
    if (recherche) {
      suggestionsFiltered = suggestionsFiltered.filter(s =>
        s.code.includes(recherche) || 
        s.libelle.toLowerCase().includes(recherche.toLowerCase())
      );
    }
    
    // Trier par fréquence d'utilisation
    suggestionsFiltered.sort((a, b) => b.frequence - a.frequence);
    
    setSuggestions(suggestionsFiltered);
  }, [journalType?.code, configurationsJournal]);

  // Validation intelligente avec TVAValidator
  const validerEcriture = useCallback(() => {
    const totalDebit = lignes.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lignes.reduce((sum, l) => sum + l.credit, 0);
    const equilibre = Math.abs(totalDebit - totalCredit) < 0.01;

    const erreurs: string[] = [];

    if (!equilibre) {
      erreurs.push(`Écriture non équilibrée: Débit ${totalDebit.toFixed(2)} ≠ Crédit ${totalCredit.toFixed(2)}`);
    }

    // Validations spécifiques par journal
    const config = journalType?.code ? configurationsJournal[journalType.code] : {};

    if (config.validations?.includes('piece_obligatoire') && !saisieRapide.piece) {
      erreurs.push('Numéro de pièce obligatoire');
    }

    // Validation TVA avec l'utilitaire TVAValidator
    if (lignes.length > 0) {
      const lignesTVA = lignes.map(l => ({
        compte: l.compte,
        libelle: l.libelle,
        debit: l.debit,
        credit: l.credit,
        montantHT: l.tva?.montantHT,
        montantTVA: l.tva?.montantTVA,
        tauxTVA: l.tva?.taux
      }));

      const validation = TVAValidator.validateEcritureTVA(lignesTVA);
      setTvaValidation(validation);

      if (!validation.isValid) {
        erreurs.push(...validation.errors);
      }
    }

    return { valide: erreurs.length === 0, erreurs };
  }, [lignes, journalType?.code, configurationsJournal, saisieRapide.piece]);

  // Rendu du formulaire de saisie rapide
  const renderSaisieRapide = () => {
    const config = journalType?.code ? configurationsJournal[journalType.code] : {};
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">
              Saisie Rapide - {config.label}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModeSaisie('standard')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Mode standard
            </button>
            <button
              onClick={() => setModeSaisie('expert')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Mode expert
            </button>
          </div>
        </div>
        
        {/* Formulaire adapté selon le type de journal */}
        {(journalType?.code === 'AC' || journalType?.code === 'VE') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date et Pièce */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={saisieRapide.date}
                onChange={(e) => setSaisieRapide(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Pièce
              </label>
              <input
                type="text"
                value={saisieRapide.piece}
                onChange={(e) => setSaisieRapide(prev => ({ ...prev, piece: e.target.value }))}
                placeholder={journalType?.code === 'AC' ? "N° Facture fournisseur" : "N° Facture client"}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Tiers avec auto-complétion */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {journalType?.code === 'AC' ? 'Fournisseur' : 'Client'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={saisieRapide.tiers}
                  onChange={(e) => {
                    setSaisieRapide(prev => ({ ...prev, tiers: e.target.value }));
                    obtenirSuggestions(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => obtenirSuggestions(saisieRapide.tiers)}
                  placeholder="Rechercher ou saisir..."
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
              </div>
              
              {/* Liste de suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.filter(s => s.type === 'tiers').map((suggestion) => (
                    <button
                      key={suggestion.code}
                      onClick={() => {
                        setSaisieRapide(prev => ({ ...prev, tiers: suggestion.code }));
                        setShowSuggestions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm">{suggestion.code}</div>
                        <div className="text-xs text-gray-700">{suggestion.libelle}</div>
                      </div>
                      {suggestion.solde && (
                        <div className={`text-sm font-medium ${suggestion.solde > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {suggestion.solde.toFixed(2)} €
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Montants avec calculs automatiques */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant HT
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={saisieRapide.montantHT}
                  onChange={(e) => setSaisieRapide(prev => ({ ...prev, montantHT: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700">€</span>
              </div>
            </div>
            
            <div>
              <SearchableDropdown
                label="Taux TVA"
                options={[
                  { value: '0', label: '0% - Exonéré' },
                  { value: '5.5', label: '5.5% - Taux réduit' },
                  { value: '10', label: '10% - Taux intermédiaire' },
                  { value: '19.25', label: '19.25% - Taux normal' }
                ]}
                value={saisieRapide.tauxTVA.toString()}
                onChange={(value) => setSaisieRapide(prev => ({ ...prev, tauxTVA: parseFloat(value) }))}
                placeholder="Sélectionner un taux TVA"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant TTC
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={saisieRapide.montantTTC}
                  onChange={(e) => {
                    const ttc = parseFloat(e.target.value) || 0;
                    const { montantHT, montantTVA } = calculerHT(ttc, saisieRapide.tauxTVA);
                    setSaisieRapide(prev => ({
                      ...prev,
                      montantTTC: ttc,
                      montantHT: Math.round(montantHT * 100) / 100,
                      montantTVA: Math.round(montantTVA * 100) / 100
                    }));
                  }}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-700">€</span>
              </div>
            </div>
            
            {/* Libellé */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Libellé
              </label>
              <input
                type="text"
                value={saisieRapide.libelle}
                onChange={(e) => setSaisieRapide(prev => ({ ...prev, libelle: e.target.value }))}
                placeholder="Description de l'opération..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Échéance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Échéance
              </label>
              <input
                type="date"
                value={saisieRapide.echeance}
                onChange={(e) => setSaisieRapide(prev => ({ ...prev, echeance: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
        
        {/* Affichage du calcul automatique */}
        {(journalType?.code === 'AC' || journalType?.code === 'VE') && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <p className="text-gray-700">HT</p>
                <p className="text-lg font-bold">{saisieRapide.montantHT.toFixed(2)} €</p>
              </div>
              <div className="text-center">
                <p className="text-gray-700">TVA ({saisieRapide.tauxTVA}%)</p>
                <p className="text-lg font-bold text-blue-600">{saisieRapide.montantTVA.toFixed(2)} €</p>
              </div>
              <div className="text-center">
                <p className="text-gray-700">TTC</p>
                <p className="text-lg font-bold text-green-600">{saisieRapide.montantTTC.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Bouton de génération */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={genererEcrituresAutomatiques}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Générer les écritures
          </button>
        </div>
      </div>
    );
  };

  // Rendu des lignes d'écritures
  const renderLignesEcritures = () => {
    const totalDebit = lignes.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lignes.reduce((sum, l) => sum + l.credit, 0);
    const equilibre = Math.abs(totalDebit - totalCredit) < 0.01;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Lignes d'écritures</h3>
            <button
              onClick={() => {
                const nouvelleLigne: LigneEcriture = {
                  id: `ligne-${Date.now()}`,
                  compte: '',
                  libelle: '',
                  debit: 0,
                  credit: 0
                };
                setLignes([...lignes, nouvelleLigne]);
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter une ligne
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('accounting.account')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('accounting.label')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tiers</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('accounting.debit')}</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">{t('accounting.credit')}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lignes.map((ligne, index) => (
                <tr key={ligne.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={ligne.compte}
                      onChange={(e) => {
                        const newLignes = [...lignes];
                        newLignes[index].compte = e.target.value;
                        setLignes(newLignes);
                        obtenirSuggestions(e.target.value);
                      }}
                      placeholder="Compte..."
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={ligne.libelle}
                      onChange={(e) => {
                        const newLignes = [...lignes];
                        newLignes[index].libelle = e.target.value;
                        setLignes(newLignes);
                      }}
                      placeholder="Libellé..."
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={ligne.tiers || ''}
                      onChange={(e) => {
                        const newLignes = [...lignes];
                        newLignes[index].tiers = e.target.value;
                        setLignes(newLignes);
                      }}
                      placeholder="Tiers..."
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={ligne.debit || ''}
                      onChange={(e) => {
                        const newLignes = [...lignes];
                        newLignes[index].debit = parseFloat(e.target.value) || 0;
                        if (parseFloat(e.target.value) > 0) {
                          newLignes[index].credit = 0;
                        }
                        setLignes(newLignes);
                      }}
                      placeholder="0.00"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={ligne.credit || ''}
                      onChange={(e) => {
                        const newLignes = [...lignes];
                        newLignes[index].credit = parseFloat(e.target.value) || 0;
                        if (parseFloat(e.target.value) > 0) {
                          newLignes[index].debit = 0;
                        }
                        setLignes(newLignes);
                      }}
                      placeholder="0.00"
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-right"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setLignes(lignes.filter(l => l.id !== ligne.id));
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                  Totaux:
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {totalDebit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {totalCredit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {equilibre ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500 mx-auto" />
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        {!equilibre && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                Écriture non équilibrée: Écart de {Math.abs(totalDebit - totalCredit).toFixed(2)} €
              </span>
            </div>
          </div>
        )}

        {/* Validation TVA */}
        {tvaValidation && (
          <div className="p-4 border-t border-gray-200">
            {tvaValidation.errors.length > 0 && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="font-semibold text-red-700">Erreurs TVA:</p>
                </div>
                <ul className="list-disc list-inside space-y-1 ml-7">
                  {tvaValidation.errors.map((error, i) => (
                    <li key={i} className="text-sm text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {tvaValidation.warnings.length > 0 && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-700">Avertissements TVA:</p>
                </div>
                <ul className="list-disc list-inside space-y-1 ml-7">
                  {tvaValidation.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-yellow-600">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {tvaValidation.isValid && tvaValidation.errors.length === 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">✅ Validation TVA conforme SYSCOHADA</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-gray-900">
            Nouvelle écriture - Journal {journalType.label}
          </h2>
          <div className="flex items-center gap-2">
            {['rapide', 'standard', 'expert'].map((mode) => (
              <button
                key={mode}
                onClick={() => setModeSaisie(mode as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  modeSaisie === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mode === 'rapide' && <Zap className="w-4 h-4 inline mr-1" />}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Dupliquer
          </button>
          <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Modèles
          </button>
        </div>
      </div>
      
      {/* Formulaire de saisie rapide */}
      {modeSaisie === 'rapide' && renderSaisieRapide()}
      
      {/* Lignes d'écritures */}
      {renderLignesEcritures()}
      
      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Annuler
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const validation = validerEcriture();
              if (!validation.valide) {
                alert(validation.erreurs.join('\n'));
              }
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            Vérifier
          </button>
          
          <button
            onClick={() => {
              const validation = validerEcriture();
              if (validation.valide) {
                onSubmit(lignes);
              } else {
                alert(validation.erreurs.join('\n'));
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Valider l'écriture
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntelligentEntryForm;