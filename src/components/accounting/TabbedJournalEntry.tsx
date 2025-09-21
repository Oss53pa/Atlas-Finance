import React, { useState } from 'react';
import {
  FileText, Plus, CheckCircle, Search, Trash2, Calculator, Eye, Edit, X
} from 'lucide-react';

interface TabbedJournalEntryProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  editData?: any;
}

const TabbedJournalEntry: React.FC<TabbedJournalEntryProps> = ({ isOpen, onClose, mode = 'create', editData }) => {
  if (!isOpen) return null;
  const [transactionType, setTransactionType] = useState(editData?.type || 'achats');
  const [activeFormTab, setActiveFormTab] = useState('details');
  const [reglementType, setReglementType] = useState('reception');
  const [selectedTiers, setSelectedTiers] = useState('');

  // États pour le mode édition simple
  const [formData, setFormData] = useState({
    numeroMouvement: '1',
    journal: editData?.journal || 'VT',
    date: editData?.date || '2025-03-01',
    numeroPiece: editData?.numero || 'FCT2',
    echeance: '',
    compte: '701',
    libelleCompte: 'Ventes de produits finis',
    libelleOperation: editData?.libelle || 'Produit 01 de ma société',
    debit: '',
    credit: '100.00'
  });
  const [lignesAchats, setLignesAchats] = useState([
    { compte: '607000', description: 'Achats marchandises', debit: 100000, credit: 0, codeAnalytique: 'CC001', noteLigne: '' },
    { compte: '4456200', description: 'TVA déductible 19.25%', debit: 19250, credit: 0, codeAnalytique: '', noteLigne: '' },
    { compte: '401001', description: 'Fournisseur ACME SARL', debit: 0, credit: 119250, codeAnalytique: '', noteLigne: '' }
  ]);
  const [lignesVentes, setLignesVentes] = useState([
    { compte: '411001', description: 'Client A', debit: 119250, credit: 0, codeAnalytique: '', noteLigne: '' },
    { compte: '707000', description: 'Ventes marchandises', debit: 0, credit: 100000, codeAnalytique: 'CC001', noteLigne: '' },
    { compte: '4457200', description: 'TVA collectée 19.25%', debit: 0, credit: 19250, codeAnalytique: '', noteLigne: '' }
  ]);
  const [lignesOD, setLignesOD] = useState([
    { compte: '68100', description: 'Dotation amortissement', debit: 50000, credit: 0, codeAnalytique: 'CC002', noteLigne: '' },
    { compte: '28400', description: 'Amortissement matériel', debit: 0, credit: 50000, codeAnalytique: '', noteLigne: '' }
  ]);

  // Configuration par type de transaction
  const getConfig = (type: string) => {
    const configs = {
      achats: { journal: 'AC', number: 'AC-2025-00001', journalLabel: 'AC - Achats' },
      ventes: { journal: 'VE', number: 'VE-2025-00001', journalLabel: 'VE - Ventes' },
      reglements: { journal: 'BQ', number: 'BQ-2025-00001', journalLabel: 'BQ - Banque' },
      operations: { journal: 'OD', number: 'OD-2025-00001', journalLabel: 'OD - Opérations Diverses' }
    };
    return configs[type] || configs.achats;
  };

  const config = getConfig(transactionType);

  // Fonctions pour ajouter des lignes
  const ajouterLigneAchat = () => {
    setLignesAchats([...lignesAchats, { compte: '', description: '', debit: 0, credit: 0, codeAnalytique: '', noteLigne: '' }]);
  };

  const ajouterLigneVente = () => {
    setLignesVentes([...lignesVentes, { compte: '', description: '', debit: 0, credit: 0, codeAnalytique: '', noteLigne: '' }]);
  };

  const ajouterLigneOD = () => {
    setLignesOD([...lignesOD, { compte: '', description: '', debit: 0, credit: 0, codeAnalytique: '', noteLigne: '' }]);
  };

  // Utiliser le même formulaire pour création et édition
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden relative">

            {/* Header avec sélecteur de type */}
            <div className="p-6 border-b border-[#E8E8E8] bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#191919]">
                  {mode === 'edit' ? `✏️ Modifier l'écriture ${editData?.numero || ''}` : '📋 Nouvelle écriture'}
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 bg-[#6A8A82]/20 text-[#6A8A82] px-3 py-1 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>SYSCOHADA Conforme</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
        
        <div>
          <label className="block text-sm font-medium text-[#444444] mb-2">Type de Transaction *</label>
          <select 
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
          >
            <option value="achats">🛒 Facture d'Achat (Fournisseur)</option>
            <option value="ventes">💰 Facture de Vente (Client)</option>
            <option value="reglements">🏦 Règlement (Banque/Caisse)</option>
            <option value="operations">⚙️ Opérations Diverses (OD)</option>
          </select>
        </div>
      </div>

      {/* Contenu défilable */}
      <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
        {/* Onglets internes */}
        <div className="border-b border-[#E8E8E8]">
        <nav className="flex space-x-0 px-6">
          {[
            { id: 'details', label: 'Détails', icon: '📋', desc: 'Infos générales' },
            { id: 'ventilation', label: 'Ventilation', icon: '💳', desc: 'Comptes & Lignes' },
            { id: 'pieces', label: 'Attachements', icon: '📎', desc: 'Fichiers joints' },
            { id: 'notes', label: 'Notes', icon: '📝', desc: 'Commentaires' },
            { id: 'validation', label: 'Validation', icon: '✅', desc: 'Contrôles' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFormTab(tab.id)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeFormTab === tab.id
                  ? 'border-[#6A8A82] text-[#6A8A82] bg-[#6A8A82]/5'
                  : 'border-transparent text-[#767676] hover:text-[#6A8A82] hover:border-[#6A8A82]/30'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs opacity-70">{tab.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu selon l'onglet actif */}
      <div className="p-6">
        
        {/* ONGLET DÉTAILS */}
        {activeFormTab === 'details' && (
          <div className="space-y-6">
            
            {/* Informations générales communes */}
            <div className="bg-[#ECECEC]/30 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Informations Générales</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Date d'écriture *</label>
                  <input 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Numéro d'écriture</label>
                  <input 
                    type="text" 
                    value={config.number}
                    readOnly
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md bg-[#6A8A82]/10 font-mono text-sm font-bold text-[#6A8A82]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Journal</label>
                  <input 
                    type="text" 
                    value={config.journalLabel}
                    readOnly
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md bg-[#B87333]/10 font-medium text-[#B87333]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Référence externe</label>
                  <input 
                    type="text" 
                    placeholder="N° facture, chèque..."
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                  />
                </div>
              </div>

              <div className="mb-4">
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Description *</label>
                  <input 
                    type="text" 
                    placeholder="Description de l'opération..."
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Préparé par</label>
                  <input 
                    type="text" 
                    value="Jean Dupont (Comptable)"
                    readOnly
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md bg-[#ECECEC]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Approuvé par</label>
                  <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]">
                    <option value="">-- Sélectionner --</option>
                    <option value="chef_comptable">Marie Martin (Chef Comptable)</option>
                    <option value="daf">Pierre Durant (DAF)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET VENTILATION */}
        {activeFormTab === 'ventilation' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              💳 Ventilation des Comptes
            </h3>

            {/* Sous-formulaire selon le type de transaction */}
            {transactionType === 'achats' && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  🛒 Facture d'Achat
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Fournisseur *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                      <option value="">-- Sélectionner fournisseur --</option>
                      <option value="acme">ACME SARL (401001)</option>
                      <option value="techcorp">TechCorp (401002)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Date facture *</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">N° facture fournisseur *</label>
                    <input 
                      type="text" 
                      placeholder="FA-2025-001"
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                      required
                    />
                  </div>
                </div>


                {/* Tableau lignes ventilées */}
                <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Libellé</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Débit</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Crédit</th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">📊 Code Analytique</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">🗒️ Note ligne *</th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {lignesAchats.map((ligne, index) => (
                        <tr key={index} className="hover:bg-green-50">
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.compte}
                              onChange={(e) => {
                                const newLignes = [...lignesAchats];
                                newLignes[index].compte = e.target.value;
                                setLignesAchats(newLignes);
                              }}
                              placeholder="xxxxxx"
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm font-mono" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.description}
                              onChange={(e) => {
                                const newLignes = [...lignesAchats];
                                newLignes[index].description = e.target.value;
                                setLignesAchats(newLignes);
                              }}
                              placeholder="Libellé..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              value={ligne.debit}
                              onChange={(e) => {
                                const newLignes = [...lignesAchats];
                                newLignes[index].debit = parseFloat(e.target.value) || 0;
                                setLignesAchats(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              value={ligne.credit}
                              onChange={(e) => {
                                const newLignes = [...lignesAchats];
                                newLignes[index].credit = parseFloat(e.target.value) || 0;
                                setLignesAchats(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={ligne.codeAnalytique}
                              onChange={(e) => {
                                const newLignes = [...lignesAchats];
                                newLignes[index].codeAnalytique = e.target.value;
                                setLignesAchats(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm"
                            >
                              <option value="">-- Aucun --</option>
                              <option value="CC001">CC001 - Commercial</option>
                              <option value="CC002">CC002 - Production</option>
                              <option value="CC003">CC003 - Administration</option>
                              <option value="PR001">PR001 - Projet Alpha</option>
                              <option value="PR002">PR002 - Projet Beta</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.noteLigne}
                              onChange={(e) => {
                                const newLignes = [...lignesAchats];
                                newLignes[index].noteLigne = e.target.value;
                                setLignesAchats(newLignes);
                              }}
                              placeholder="Note ligne obligatoire..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                              required 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button 
                              onClick={() => {
                                const newLignes = lignesAchats.filter((_, i) => i !== index);
                                setLignesAchats(newLignes);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-2 bg-green-50 border-t border-[#E8E8E8]">
                    <button 
                      onClick={ajouterLigneAchat}
                      className="text-green-700 text-sm hover:underline flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter ligne d'achat
                    </button>
                  </div>
                </div>

                {/* Totaux avec Débit/Crédit */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-green-100 rounded-lg mt-4">
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Total Débit</div>
                    <div className="text-xl font-bold text-blue-600">
                      {lignesAchats.reduce((sum, ligne) => sum + ligne.debit, 0).toLocaleString()} XAF
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Total Crédit</div>
                    <div className="text-xl font-bold text-green-600">
                      {lignesAchats.reduce((sum, ligne) => sum + ligne.credit, 0).toLocaleString()} XAF
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Équilibre</div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${
                        lignesAchats.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesAchats.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className={`text-lg font-bold ${
                        lignesAchats.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesAchats.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {lignesAchats.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesAchats.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'Équilibré ✓' : 'Déséquilibré ✗'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {transactionType === 'ventes' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  💰 Facture de Vente
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Client *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                      <option value="">-- Sélectionner client --</option>
                      <option value="clienta">Client A (411001)</option>
                      <option value="clientb">Client B (411002)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Date facture *</label>
                    <input 
                      type="date" 
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">N° facture émise *</label>
                    <input 
                      type="text" 
                      value="VE-2025-00234"
                      readOnly
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md bg-[#B87333]/10 font-mono text-[#B87333]"
                    />
                  </div>
                </div>


                {/* Tableau lignes ventes */}
                <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Libellé</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Débit</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Crédit</th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">📊 Code Analytique</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">🗒️ Note ligne *</th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {lignesVentes.map((ligne, index) => (
                        <tr key={index} className="hover:bg-blue-50">
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.compte}
                              onChange={(e) => {
                                const newLignes = [...lignesVentes];
                                newLignes[index].compte = e.target.value;
                                setLignesVentes(newLignes);
                              }}
                              placeholder="xxxxxx"
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm font-mono" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.description}
                              onChange={(e) => {
                                const newLignes = [...lignesVentes];
                                newLignes[index].description = e.target.value;
                                setLignesVentes(newLignes);
                              }}
                              placeholder="Libellé..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              value={ligne.debit}
                              onChange={(e) => {
                                const newLignes = [...lignesVentes];
                                newLignes[index].debit = parseFloat(e.target.value) || 0;
                                setLignesVentes(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              value={ligne.credit}
                              onChange={(e) => {
                                const newLignes = [...lignesVentes];
                                newLignes[index].credit = parseFloat(e.target.value) || 0;
                                setLignesVentes(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={ligne.codeAnalytique}
                              onChange={(e) => {
                                const newLignes = [...lignesVentes];
                                newLignes[index].codeAnalytique = e.target.value;
                                setLignesVentes(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm"
                            >
                              <option value="">-- Aucun --</option>
                              <option value="CC001">CC001 - Commercial</option>
                              <option value="CC002">CC002 - Production</option>
                              <option value="CC003">CC003 - Administration</option>
                              <option value="PR001">PR001 - Projet Alpha</option>
                              <option value="PR002">PR002 - Projet Beta</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.noteLigne}
                              onChange={(e) => {
                                const newLignes = [...lignesVentes];
                                newLignes[index].noteLigne = e.target.value;
                                setLignesVentes(newLignes);
                              }}
                              placeholder="Note ligne obligatoire..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                              required 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button 
                              onClick={() => {
                                const newLignes = lignesVentes.filter((_, i) => i !== index);
                                setLignesVentes(newLignes);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-2 bg-blue-50 border-t border-[#E8E8E8]">
                    <button 
                      onClick={ajouterLigneVente}
                      className="text-blue-700 text-sm hover:underline flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter ligne de vente
                    </button>
                  </div>
                </div>

                {/* Totaux Ventes avec Débit/Crédit */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-100 rounded-lg mt-4">
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Total Débit</div>
                    <div className="text-xl font-bold text-blue-600">
                      {lignesVentes.reduce((sum, ligne) => sum + ligne.debit, 0).toLocaleString()} XAF
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Total Crédit</div>
                    <div className="text-xl font-bold text-green-600">
                      {lignesVentes.reduce((sum, ligne) => sum + ligne.credit, 0).toLocaleString()} XAF
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Équilibre</div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${
                        lignesVentes.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesVentes.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className={`text-lg font-bold ${
                        lignesVentes.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesVentes.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {lignesVentes.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesVentes.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'Équilibré ✓' : 'Déséquilibré ✗'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {transactionType === 'reglements' && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  🏦 Règlement (Banque/Caisse)
                </h3>
                
                {/* Type de règlement */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-[#D9D9D9]">
                  <h4 className="font-medium text-[#191919] mb-3">Type de règlement *</h4>
                  <div className="flex space-x-6">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="reglementType" 
                        value="reception" 
                        checked={reglementType === 'reception'}
                        onChange={(e) => setReglementType(e.target.value)}
                        className="mr-2 text-[#6A8A82]" 
                      />
                      📥 Réception (Encaissement)
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="reglementType" 
                        value="paiement" 
                        checked={reglementType === 'paiement'}
                        onChange={(e) => setReglementType(e.target.value)}
                        className="mr-2 text-[#6A8A82]" 
                      />
                      📤 Paiement (Décaissement)
                    </label>
                  </div>
                </div>

                {/* Détails du règlement */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Mode *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md" required>
                      <option value="virement">Virement</option>
                      <option value="cheque">Chèque</option>
                      <option value="especes">Espèces</option>
                      <option value="carte">Carte</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Banque/Compte *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md" required>
                      <option value="512100">512100 - BNP Paribas</option>
                      <option value="512200">512200 - Crédit Agricole</option>
                      <option value="530000">530000 - Caisse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Montant *</label>
                    <input type="number" placeholder="119250" className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md text-right" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Référence</label>
                    <input type="text" placeholder="VIR-20250115-001" className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md" />
                  </div>
                </div>

                {/* Sélection du tiers */}
                <div className="mb-4 p-4 bg-white rounded-lg border border-[#D9D9D9]">
                  <h4 className="font-medium text-[#191919] mb-3">
                    {reglementType === 'reception' ? '👤 Tiers créditeur' : '👥 Tiers à régler'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-1">
                        {reglementType === 'reception' ? 'Tiers créditeur *' : 'Tiers à régler *'}
                      </label>
                      <select 
                        className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md"
                        value={selectedTiers}
                        onChange={(e) => setSelectedTiers(e.target.value)}
                        required
                      >
                        <option value="">-- Sélectionner --</option>
                        {reglementType === 'reception' ? (
                          <>
                            <option value="client1">Client A (411001)</option>
                            <option value="client2">Client B (411002)</option>
                            <option value="client3">SARL XYZ (411003)</option>
                            <option value="divers1">État - TVA (4198001)</option>
                            <option value="divers2">Personnel - Avances (4210001)</option>
                          </>
                        ) : (
                          <>
                            <option value="fournisseur1">ACME SARL (401001)</option>
                            <option value="fournisseur2">TechCorp (401002)</option>
                            <option value="fournisseur3">Services Pro (401003)</option>
                            <option value="salarie1">Martin Paul - Salaire (4211001)</option>
                            <option value="etat1">CNPS - Cotisations (4312001)</option>
                            <option value="associe1">Associé Dupont (4551001)</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-1">
                        {reglementType === 'reception' ? 'Document à encaisser *' : 'Document à régler *'}
                      </label>
                      <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md" required>
                        <option value="">-- Sélectionner document --</option>
                        {reglementType === 'reception' ? (
                          <>
                            <option value="ve234">VE-2025-00234 - Facture (119,250 XAF)</option>
                            <option value="av001">AV-2025-001 - Note de crédit (85,000 XAF)</option>
                            <option value="div001">DIV-001 - Remboursement TVA (200,000 XAF)</option>
                          </>
                        ) : (
                          <>
                            <option value="ac142">AC-2025-00142 - Facture (119,250 XAF)</option>
                            <option value="sal001">SAL-001 - Fiche de paie (75,000 XAF)</option>
                            <option value="cot001">COT-001 - Cotisations (180,000 XAF)</option>
                            <option value="div002">DIV-002 - Distribution associé (500,000 XAF)</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Détails de la facture sélectionnée */}
                  {selectedTiers && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-sm text-[#444444]">
                        <strong>
                          {reglementType === 'reception' ? 'Document VE-2025-00234' : 'Document AC-2025-00142'}
                        </strong> | Date: 10/01/2025 | Montant dû: <span className="font-mono text-red-600">119,250 XAF</span>
                        <br />
                        Montant déjà réglé: <span className="font-mono">0 XAF</span> | Solde restant: <span className="font-mono font-bold text-green-600">119,250 XAF</span>
                        <br />
                        <strong className="text-green-600">
                          ✅ {reglementType === 'reception' ? 'Document sera soldé après encaissement' : 'Document sera soldé après règlement'}
                        </strong>
                        <br />
                        <strong className="text-blue-600">
                          🔗 Lettrage automatique activé
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ventilation par comptes de tiers */}
                <div className="mb-6 p-4 bg-white rounded-lg border border-[#D9D9D9]">
                  <h4 className="font-medium text-[#191919] mb-3">💳 Ventilation par comptes</h4>
                  
                  <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-purple-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">
                            {reglementType === 'reception' ? 'Compte Tiers (411/419/...)' : 'Compte Tiers (401/421/...)'}
                          </th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                          <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Montant affecté</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Référence facture</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">🗒️ Note ligne *</th>
                          <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E8E8]">
                        <tr className="hover:bg-purple-50">
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={reglementType === 'reception' ? '411001' : '401001'}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm font-mono" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={reglementType === 'reception' ? 'Client A - Règlement facture' : 'Fournisseur ACME - Paiement facture'}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              defaultValue="119250"
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={reglementType === 'reception' ? 'VE-2025-00234' : 'AC-2025-00142'}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm font-mono" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              placeholder="Note ligne obligatoire..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                              required 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        <tr className="hover:bg-purple-50">
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value="512100"
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm font-mono" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={reglementType === 'reception' ? 'BNP Paribas - Virement reçu' : 'BNP Paribas - Virement émis'}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              defaultValue="119250"
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              placeholder="VIR-20250115-001"
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              placeholder="Note ligne obligatoire..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                              required 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="p-2 bg-purple-50 border-t border-[#E8E8E8]">
                      <button className="text-purple-700 text-sm hover:underline flex items-center">
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter ligne de règlement
                      </button>
                    </div>
                  </div>

                  {/* Totaux Règlement */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-purple-100 rounded-lg mt-4">
                    <div className="text-center">
                      <div className="text-sm text-[#444444]">Total Débit</div>
                      <div className="text-xl font-bold text-blue-600">119,250 XAF</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-[#444444]">Total Crédit</div>
                      <div className="text-xl font-bold text-green-600">119,250 XAF</div>
                    </div>
                  </div>
                </div>


                {/* Écritures générées pour règlement */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mr-3"></div>
                    <h5 className="font-semibold text-purple-900 text-base">Aperçu des écritures comptables</h5>
                  </div>
                  
                  <div className="bg-white rounded-md p-3 border border-purple-100">
                    <div className="space-y-2">
                      {reglementType === 'reception' ? (
                        <>
                          <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <span className="inline-block w-12 text-center text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">DT</span>
                              <span className="ml-3 font-mono text-sm text-gray-700">512100</span>
                              <span className="ml-2 text-sm text-gray-600">Banque BNP Paribas</span>
                            </div>
                            <span className="font-mono text-sm font-semibold text-blue-600">119 250</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <span className="inline-block w-12 text-center text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded">CT</span>
                              <span className="ml-3 font-mono text-sm text-gray-700">411001</span>
                              <span className="ml-2 text-sm text-gray-600">Client A</span>
                            </div>
                            <span className="font-mono text-sm font-semibold text-green-600">119 250</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <span className="inline-block w-12 text-center text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">DT</span>
                              <span className="ml-3 font-mono text-sm text-gray-700">401001</span>
                              <span className="ml-2 text-sm text-gray-600">Fournisseur ACME SARL</span>
                            </div>
                            <span className="font-mono text-sm font-semibold text-blue-600">119 250</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <span className="inline-block w-12 text-center text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded">CT</span>
                              <span className="ml-3 font-mono text-sm text-gray-700">512100</span>
                              <span className="ml-2 text-sm text-gray-600">Banque BNP Paribas</span>
                            </div>
                            <span className="font-mono text-sm font-semibold text-green-600">119 250</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                      <span>Équilibre vérifié</span>
                      <span className="ml-2 font-mono text-emerald-600 font-medium">119 250 XAF</span>
                    </div>
                    <div className="flex items-center text-sm text-blue-600">
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      <span>Lettrage automatique</span>
                      <span className="ml-1 font-medium">{reglementType === 'reception' ? 'VE-2025-00234' : 'AC-2025-00142'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {transactionType === 'operations' && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  ⚙️ Opérations Diverses
                </h3>
                
                <div className="mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Type d'OD *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md" required>
                      <option value="">-- Sélectionner --</option>
                      <option value="amortissement">Amortissement</option>
                      <option value="provision">Provision</option>
                    </select>
                  </div>
                </div>

                {/* Saisie libre ventilée */}
                <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte GL</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Débit</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Crédit</th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">📊 Code Analytique</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">🗒️ Note ligne *</th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E8E8]">
                      {lignesOD.map((ligne, index) => (
                        <tr key={index} className="hover:bg-orange-50">
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.compte}
                              onChange={(e) => {
                                const newLignes = [...lignesOD];
                                newLignes[index].compte = e.target.value;
                                setLignesOD(newLignes);
                              }}
                              placeholder="xxxxxx"
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm font-mono" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.description}
                              onChange={(e) => {
                                const newLignes = [...lignesOD];
                                newLignes[index].description = e.target.value;
                                setLignesOD(newLignes);
                              }}
                              placeholder="Description..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              value={ligne.debit}
                              onChange={(e) => {
                                const newLignes = [...lignesOD];
                                newLignes[index].debit = parseFloat(e.target.value) || 0;
                                setLignesOD(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="number" 
                              value={ligne.credit}
                              onChange={(e) => {
                                const newLignes = [...lignesOD];
                                newLignes[index].credit = parseFloat(e.target.value) || 0;
                                setLignesOD(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm text-right" 
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={ligne.codeAnalytique}
                              onChange={(e) => {
                                const newLignes = [...lignesOD];
                                newLignes[index].codeAnalytique = e.target.value;
                                setLignesOD(newLignes);
                              }}
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm"
                            >
                              <option value="">-- Aucun --</option>
                              <option value="CC001">CC001 - Commercial</option>
                              <option value="CC002">CC002 - Production</option>
                              <option value="CC003">CC003 - Administration</option>
                              <option value="PR001">PR001 - Projet Alpha</option>
                              <option value="PR002">PR002 - Projet Beta</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input 
                              type="text" 
                              value={ligne.noteLigne}
                              onChange={(e) => {
                                const newLignes = [...lignesOD];
                                newLignes[index].noteLigne = e.target.value;
                                setLignesOD(newLignes);
                              }}
                              placeholder="Note ligne obligatoire..." 
                              className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" 
                              required 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button 
                              onClick={() => {
                                const newLignes = lignesOD.filter((_, i) => i !== index);
                                setLignesOD(newLignes);
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-2 bg-orange-50 border-t border-[#E8E8E8]">
                    <button 
                      onClick={ajouterLigneOD}
                      className="text-orange-700 text-sm hover:underline flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter ligne d'OD
                    </button>
                  </div>
                </div>

                {/* Totaux OD avec équilibre */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-orange-100 rounded-lg mt-4">
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Total Débit</div>
                    <div className="text-xl font-bold text-blue-600">
                      {lignesOD.reduce((sum, ligne) => sum + ligne.debit, 0).toLocaleString()} XAF
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Total Crédit</div>
                    <div className="text-xl font-bold text-green-600">
                      {lignesOD.reduce((sum, ligne) => sum + ligne.credit, 0).toLocaleString()} XAF
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-[#444444]">Équilibre</div>
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${
                        lignesOD.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesOD.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className={`text-lg font-bold ${
                        lignesOD.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesOD.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {lignesOD.reduce((sum, ligne) => sum + ligne.debit, 0) === lignesOD.reduce((sum, ligne) => sum + ligne.credit, 0) 
                          ? 'Équilibré ✓' : 'Déséquilibré ✗'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET ATTACHEMENTS */}
        {activeFormTab === 'pieces' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              📎 Attachements de Fichiers
            </h3>
            
            {/* Zone de drop pour fichiers */}
            <div className="border-2 border-dashed border-[#6A8A82] rounded-lg p-8 text-center bg-[#6A8A82]/5 hover:bg-[#6A8A82]/10 transition-colors">
              <FileText className="w-12 h-12 mx-auto text-[#6A8A82] mb-4" />
              <p className="text-lg font-medium text-[#191919] mb-2">Glissez-déposez vos fichiers ici</p>
              <p className="text-sm text-[#767676] mb-4">ou cliquez pour sélectionner</p>
              <input 
                type="file" 
                multiple 
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
                className="hidden" 
                id="fileInput"
              />
              <label 
                htmlFor="fileInput"
                className="px-6 py-3 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors cursor-pointer inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Sélectionner fichiers</span>
              </label>
              <p className="text-xs text-[#767676] mt-2">PDF, Images, Excel, Word - Max 10 MB par fichier</p>
            </div>

            {/* Liste des fichiers attachés */}
            <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#ECECEC]">
                  <tr>
                    <th className="px-3 py-2 text-left text-sm font-medium text-[#444444]">Fichier</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-[#444444]">Type</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-[#444444]">Taille</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-[#444444]">Référence doc</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-[#444444]">Ligne associée</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-[#444444]">Commentaire</th>
                    <th className="px-3 py-2 text-center text-sm font-medium text-[#444444]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E8E8]">
                  <tr className="hover:bg-[#ECECEC]/50">
                    <td className="px-3 py-2 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className="text-sm">facture_FA2025001.pdf</span>
                    </td>
                    <td className="px-3 py-2">
                      <select className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm">
                        <option value="facture">📄 Facture</option>
                        <option value="recu">🧾 Reçu</option>
                        <option value="contrat">📜 Contrat</option>
                        <option value="releve">🏦 Relevé bancaire</option>
                        <option value="cheque">💳 Chèque scanné</option>
                        <option value="virement">📧 Avis de virement</option>
                        <option value="autre">📋 Autre</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-sm text-[#767676]">2.3 MB</td>
                    <td className="px-3 py-2">
                      <input type="text" placeholder="FA-2025-001" className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <select className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm">
                        <option value="">-- Ligne --</option>
                        <option value="1">Ligne 1 - Charge</option>
                        <option value="2">Ligne 2 - TVA</option>
                        <option value="3">Ligne 3 - Fournisseur</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" placeholder="Facture originale scannée" className="w-full px-2 py-1 border border-[#D9D9D9] rounded text-sm" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button className="text-blue-500 hover:text-blue-700" title="Télécharger">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-red-500 hover:text-red-700" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Statistiques attachements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#6A8A82]/5 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-[#444444]">Fichiers attachés</div>
                <div className="text-lg font-bold text-[#6A8A82]">1</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-[#444444]">Taille totale</div>
                <div className="text-lg font-bold text-[#B87333]">2.3 MB</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-[#444444]">Statut</div>
                <div className="text-lg font-bold text-green-600">✅ Conforme</div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET NOTES */}
        {activeFormTab === 'notes' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              📝 Notes et Commentaires
            </h3>
            
            {/* Notes spécifiques par type de transaction */}
            <div className="bg-[#ECECEC]/30 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-[#191919] mb-4">
                Notes spécifiques - {transactionType === 'achats' ? 'Facture d\'Achat' : 
                                     transactionType === 'ventes' ? 'Facture de Vente' :
                                     transactionType === 'reglements' ? 'Règlement' : 'Opérations Diverses'}
              </h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#444444] mb-1">
                  📋 Notes obligatoires sur l'opération *
                </label>
                <textarea 
                  placeholder={`Notes obligatoires sur ${transactionType === 'achats' ? 'la facture d\'achat' : 
                                                        transactionType === 'ventes' ? 'la facture de vente' :
                                                        transactionType === 'reglements' ? 'le règlement' : 'l\'opération diverse'}...`}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
                  required
                />
              </div>
            </div>

            {/* Commentaires généraux */}
            <div className="bg-blue-50/30 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-[#191919] mb-4">Commentaires généraux</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#444444] mb-1">
                  💬 Commentaires libres
                </label>
                <textarea 
                  placeholder="Commentaires, observations, contexte particulier..."
                  rows={4}
                  className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
                />
              </div>
            </div>

            {/* Historique des commentaires */}
            <div className="bg-yellow-50/30 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-[#191919] mb-4">Historique des modifications</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-start p-3 bg-white border border-yellow-200 rounded-md">
                  <div>
                    <div className="text-sm font-medium text-[#191919]">Jean Dupont (Comptable)</div>
                    <div className="text-xs text-[#767676]">15/01/2025 à 14:30</div>
                    <div className="text-sm text-[#444444] mt-1">Création de l'écriture</div>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Création</span>
                </div>
              </div>
            </div>

            {/* Rappels et alertes */}
            <div className="bg-orange-50/30 p-4 rounded-lg">
              <h4 className="text-md font-semibold text-[#191919] mb-4">Rappels et Alertes</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#444444] mb-1">
                  ⏰ Rappel de suivi
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="date"
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                  />
                  <input 
                    type="text"
                    placeholder="Objet du rappel..."
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#444444] mb-1">
                  🚨 Niveau d'alerte
                </label>
                <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]">
                  <option value="">Aucune alerte</option>
                  <option value="info">🟦 Information</option>
                  <option value="warning">🟨 Attention</option>
                  <option value="urgent">🟥 Urgent</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET VALIDATION */}
        {activeFormTab === 'validation' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              ✅ Validation et Contrôles
            </h3>
            
            {/* Validation équilibre */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-[#E8E8E8] rounded-lg">
              <div className="text-center">
                <div className="text-sm text-[#444444]">Total Débit</div>
                <div className="text-2xl font-bold text-blue-600">119,250 XAF</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-[#444444]">Total Crédit</div>
                <div className="text-2xl font-bold text-green-600">119,250 XAF</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-[#444444]">Équilibre</div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-xl font-bold text-green-600">Équilibré ✓</span>
                </div>
              </div>
            </div>

            {/* Aperçu écritures générées */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                <h4 className="font-semibold text-blue-900 text-base">Journal des écritures comptables</h4>
              </div>
              
              <div className="bg-white rounded-md p-3 border border-blue-100">
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <div className="flex items-center">
                      <span className="inline-block w-12 text-center text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">DT</span>
                      <span className="ml-3 font-mono text-sm text-gray-700">607000</span>
                      <span className="ml-2 text-sm text-gray-600">Achats marchandises</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-blue-600">100 000</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <div className="flex items-center">
                      <span className="inline-block w-12 text-center text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">DT</span>
                      <span className="ml-3 font-mono text-sm text-gray-700">445200</span>
                      <span className="ml-2 text-sm text-gray-600">TVA déductible 19.25%</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-blue-600">19 250</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center">
                      <span className="inline-block w-12 text-center text-xs font-mono bg-green-100 text-green-800 px-2 py-1 rounded">CT</span>
                      <span className="ml-3 font-mono text-sm text-gray-700">401001</span>
                      <span className="ml-2 text-sm text-gray-600">Fournisseur ACME SARL</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-green-600">119 250</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                  <span>Équilibre comptable respecté</span>
                  <span className="ml-2 font-mono text-emerald-600 font-medium">119 250 XAF</span>
                </div>
              </div>
            </div>

            {/* Actions finales */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E8E8E8]">
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-md hover:bg-[#ECECEC] transition-colors"
                >
                  Annuler
                </button>
                {mode === 'edit' && (
                  <button className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                    Supprimer l'écriture
                  </button>
                )}
                {mode === 'create' && (
                  <button className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-md hover:bg-[#ECECEC] transition-colors">
                    Brouillon
                  </button>
                )}
              </div>
              <button className="px-8 py-3 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] transition-colors font-medium flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>{mode === 'edit' ? 'Enregistrer les modifications' : 'Valider et Comptabiliser'}</span>
              </button>
            </div>
          </div>
        )}
        </div>
        {/* Fin du contenu défilable */}
      </div>
    </div>
  </div>
</div>
</>
);
};

export default TabbedJournalEntry;