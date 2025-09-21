import React, { useState } from 'react';
import {
  FileText, Plus, CheckCircle, Search, Trash2, Calculator, Calendar,
  Eye, Edit, X, AlertCircle
} from 'lucide-react';

const CompleteJournalEntryForm: React.FC = () => {
  const [transactionType, setTransactionType] = useState('achats');
  const [activeFormTab, setActiveFormTab] = useState('details');

  // Configuration par type de transaction
  const getConfig = (type: string) => {
    const configs: any = {
      achats: { journal: 'AC', number: 'AC-2025-00001', journalLabel: 'AC - Achats' },
      ventes: { journal: 'VE', number: 'VE-2025-00001', journalLabel: 'VE - Ventes' },
      reglements: { journal: 'BQ', number: 'BQ-2025-00001', journalLabel: 'BQ - Banque' },
      operations: { journal: 'OD', number: 'OD-2025-00001', journalLabel: 'OD - Opérations Diverses' }
    };
    return configs[type] || configs.achats;
  };

  const config = getConfig(transactionType);

  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">

      {/* Header */}
      <div className="p-6 border-b border-[#E8E8E8] bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#191919]">📋 Journal Entry</h2>
          <div className="flex items-center space-x-2 bg-[#6A8A82]/20 text-[#6A8A82] px-3 py-1 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>SYSCOHADA Conforme</span>
          </div>
        </div>

        {/* Sélecteur type de transaction */}
        <div>
          <label className="block text-sm font-medium text-[#444444] mb-1">Type de Transaction *</label>
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

      {/* Onglets internes du formulaire */}
      <div className="border-b border-[#E8E8E8]">
        <nav className="flex space-x-0 px-6">
          {[
            { id: 'details', label: 'Détails', icon: '📋', desc: 'Informations & Lignes' },
            { id: 'pieces', label: 'Pièces Jointes', icon: '📎', desc: 'Documents' },
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
            {/* Informations générales */}
            <div className="bg-[#ECECEC]/30 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-[#191919] mb-4">Informations Générales</h3>

              {/* Date + Numéro + Journal + Référence */}
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

              {/* Description + Notes globales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1">Description *</label>
                  <input
                    type="text"
                    placeholder="Description de l'opération..."
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#444444] mb-1 flex items-center">
                    📝 Notes globales *
                  </label>
                  <textarea
                    placeholder="Notes obligatoires sur l'opération..."
                    rows={2}
                    className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Sous-formulaires selon le type */}
            {transactionType === 'achats' && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  🛒 Facture d'Achat (Fournisseur)
                </h3>

                {/* Informations fournisseur */}
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

                {/* Tableau lignes ventilées achats - version simplifiée */}
                <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Montant HT</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TVA</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2">607000</td>
                        <td className="px-3 py-2">Achats marchandises</td>
                        <td className="px-3 py-2 text-right">100,000</td>
                        <td className="px-3 py-2 text-right">19,250</td>
                        <td className="px-3 py-2 text-right font-bold">119,250</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SOUS-FORMULAIRE FACTURE DE VENTE */}
            {transactionType === 'ventes' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  💰 Facture de Vente (Client)
                </h3>

                {/* Informations client */}
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

                {/* Tableau lignes ventes - version simplifiée */}
                <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Montant HT</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TVA</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2">707000</td>
                        <td className="px-3 py-2">Ventes marchandises</td>
                        <td className="px-3 py-2 text-right">100,000</td>
                        <td className="px-3 py-2 text-right">19,250</td>
                        <td className="px-3 py-2 text-right font-bold">119,250</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SOUS-FORMULAIRE RÈGLEMENT */}
            {transactionType === 'reglements' && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  🏦 Règlement (Banque/Caisse)
                </h3>

                {/* Détails du règlement */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Mode *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                      <option value="virement">Virement</option>
                      <option value="cheque">Chèque</option>
                      <option value="especes">Espèces</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Compte *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                      <option value="512100">512100 - BNP Paribas</option>
                      <option value="530000">530000 - Caisse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Montant *</label>
                    <input
                      type="number"
                      placeholder="119250"
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md text-right focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Référence</label>
                    <input
                      type="text"
                      placeholder="VIR-20250115-001"
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
                    />
                  </div>
                </div>

                {/* Association facture */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="text-sm text-[#444444]">
                    <strong>Facture VE-2025-00234</strong> | Date: 10/01/2025 | Montant: 119,250 XAF
                    <br />
                    <strong className="text-green-600">✅ Facture sera soldée après ce règlement</strong>
                  </div>
                </div>
              </div>
            )}

            {/* SOUS-FORMULAIRE OPÉRATIONS DIVERSES */}
            {transactionType === 'operations' && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
                  ⚙️ Opérations Diverses (OD)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Type d'OD *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                      <option value="">-- Sélectionner --</option>
                      <option value="amortissement">Amortissement</option>
                      <option value="provision">Provision</option>
                      <option value="regularisation">Régularisation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-1">Notes spécifiques *</label>
                    <textarea
                      placeholder="Notes obligatoires..."
                      rows={2}
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Tableau OD - version simplifiée */}
                <div className="border border-[#D9D9D9] rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Débit</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Crédit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-3 py-2">68100</td>
                        <td className="px-3 py-2">Dotation amortissement</td>
                        <td className="px-3 py-2 text-right">50,000</td>
                        <td className="px-3 py-2 text-right">-</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">28400</td>
                        <td className="px-3 py-2">Amortissement matériel</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right">50,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ONGLET PIÈCES JOINTES */}
        {activeFormTab === 'pieces' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              📎 Pièces Jointes
            </h3>

            <div className="border border-[#D9D9D9] rounded-lg p-4">
              <div className="text-center py-8 text-[#767676]">
                <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Cliquez pour ajouter des pièces jointes</p>
                <p className="text-sm mt-1">Factures, reçus, contrats...</p>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET VALIDATION */}
        {activeFormTab === 'validation' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Validation et Contrôles
            </h3>

            {/* Validation équilibre */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-[#E8E8E8] rounded-lg mb-6">
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

            {/* Actions finales */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-3">
                <button className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-md hover:bg-[#ECECEC] transition-colors">
                  Annuler
                </button>
                <button className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-md hover:bg-[#ECECEC] transition-colors">
                  Enregistrer en brouillon
                </button>
              </div>
              <button
                className="px-8 py-3 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] transition-colors font-medium flex items-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Valider et Comptabiliser</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompleteJournalEntryForm;