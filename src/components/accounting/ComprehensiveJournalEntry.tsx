import React, { useState } from 'react';
import { 
  FileText, Plus, CheckCircle, Search, Trash2, Calculator, Calendar
} from 'lucide-react';

const ComprehensiveJournalEntry: React.FC = () => {
  const [transactionType, setTransactionType] = useState('achats');

  // Configuration dynamique selon le type de transaction
  const getTransactionConfig = (type: string) => {
    const configs = {
      achats: {
        journal: 'AC',
        journalLabel: 'AC - Achats',
        number: 'AC-2025-00001',
        thirdPartyLabel: 'Fournisseur',
        thirdPartyAccount: '401000 - Fournisseurs',
        defaultLines: [
          { account: '607000', label: 'Achats marchandises', debit: '100000', credit: '', accountDesc: 'Achats marchandises' },
          { account: '445200', label: 'TVA déductible 19.25%', debit: '19250', credit: '', accountDesc: 'TVA déductible', isVAT: true },
          { account: '401000', label: 'Fournisseur ABC - Fact FA-2025-001', debit: '', credit: '119250', accountDesc: 'Fournisseurs' }
        ]
      },
      ventes: {
        journal: 'VE',
        journalLabel: 'VE - Ventes',
        number: 'VE-2025-00001',
        thirdPartyLabel: 'Client',
        thirdPartyAccount: '411000 - Clients',
        defaultLines: [
          { account: '411000', label: 'Client XYZ - Fact VE-2025-001', debit: '119250', credit: '', accountDesc: 'Clients' },
          { account: '707000', label: 'Ventes de marchandises', debit: '', credit: '100000', accountDesc: 'Ventes marchandises' },
          { account: '443100', label: 'TVA collectée 19.25%', debit: '', credit: '19250', accountDesc: 'TVA collectée', isVAT: true }
        ]
      },
      reglements: {
        journal: 'BQ',
        journalLabel: 'BQ - Banque',
        number: 'BQ-2025-00001',
        thirdPartyLabel: 'Client',
        thirdPartyAccount: '411000 - Clients',
        defaultLines: [
          { account: '521000', label: 'Banque SGBC - Virement reçu', debit: '119250', credit: '', accountDesc: 'Banque' },
          { account: '411000', label: 'Client XYZ - Règlement facture', debit: '', credit: '119250', accountDesc: 'Clients' }
        ]
      },
      operations: {
        journal: 'OD',
        journalLabel: 'OD - Opérations Diverses',
        number: 'OD-2025-00001',
        thirdPartyLabel: 'Tiers (optionnel)',
        thirdPartyAccount: '',
        defaultLines: [
          { account: '68100', label: 'Dotation amortissement', debit: '50000', credit: '', accountDesc: 'Dotations' },
          { account: '28400', label: 'Amortissement matériel', debit: '', credit: '50000', accountDesc: 'Amortissements' }
        ]
      }
    };
    return configs[type] || configs.achats;
  };

  const currentConfig = getTransactionConfig(transactionType);

  // Calcul des totaux dynamiques
  const calculateTotals = () => {
    const totalDebit = currentConfig.defaultLines.reduce((sum, line) => 
      sum + (parseFloat(line.debit) || 0), 0
    );
    const totalCredit = currentConfig.defaultLines.reduce((sum, line) => 
      sum + (parseFloat(line.credit) || 0), 0
    );
    return { totalDebit, totalCredit, isBalanced: totalDebit === totalCredit };
  };

  const totals = calculateTotals();

  return (
    <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
      
      {/* Header simple */}
      <div className="p-6 border-b border-[#E8E8E8] bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#191919]">📋 Journal Entry</h2>
          <div className="flex items-center space-x-2 bg-[#6A8A82]/20 text-[#6A8A82] px-3 py-1 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>SYSCOHADA Conforme</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[#444444] mb-2">Type de Transaction *</label>
          <select 
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="w-full px-4 py-3 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] text-lg font-medium bg-white"
          >
            <option value="achats">🛒 Facture d'Achat (Fournisseur)</option>
            <option value="ventes">💰 Facture de Vente (Client)</option>
            <option value="reglements">🏦 Règlement (Banque/Caisse)</option>
            <option value="operations">⚙️ Opérations Diverses (OD)</option>
          </select>
        </div>
      </div>

      {/* Contenu du formulaire selon l'onglet actif */}
      <div className="p-6">

        {/* Sous-formulaire Achats */}
        {transactionType === 'achats' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              <span className="text-2xl mr-2">🛒</span>
              Facture d'Achat
            </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#444444] mb-1">Fournisseur *</label>
              <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                <option value="">-- Sélectionner fournisseur --</option>
                <option value="acme">ACME SARL (401001)</option>
                <option value="techcorp">TechCorp (401002)</option>
                <option value="services">Services Pro (401003)</option>
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

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#444444] mb-1">Notes spécifiques achat *</label>
            <textarea 
              placeholder="Notes obligatoires sur la facture d'achat..."
              rows={2}
              className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
              required
            />
          </div>

          {/* Tableau lignes détaillées achats */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte Charges (6xxx)</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Montant HT</th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">TVA %</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TVA</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TTC</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Centre coût</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Note ligne *</th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-green-50">
                  <td className="px-3 py-2">
                    <input type="text" defaultValue="607000" className="w-full px-2 py-1 border rounded text-sm font-mono" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="Achats marchandises..." className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" defaultValue="100000" className="w-full px-2 py-1 border rounded text-sm text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <select className="w-full px-2 py-1 border rounded text-sm" defaultValue="19.25">
                      <option value="0">0%</option>
                      <option value="5.5">5.5%</option>
                      <option value="10">10%</option>
                      <option value="19.25">19.25%</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value="19,250" readOnly className="w-full px-2 py-1 border rounded text-sm text-right bg-yellow-100" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value="119,250" readOnly className="w-full px-2 py-1 border rounded text-sm text-right bg-green-100 font-medium" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="PROD" className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="Note ligne..." className="w-full px-2 py-1 border rounded text-sm" required />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="p-2 bg-green-50 border-t">
              <button className="text-green-700 text-sm hover:underline flex items-center">
                <Plus className="w-4 h-4 mr-1" />
                Ajouter ligne d'achat
              </button>
            </div>
          </div>

          {/* Totaux HT/TVA/TTC */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-green-100 rounded-lg mt-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Total HT</div>
              <div className="text-lg font-bold text-green-700">100,000 XAF</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total TVA</div>
              <div className="text-lg font-bold text-yellow-700">19,250 XAF</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total TTC</div>
              <div className="text-xl font-bold text-green-800">119,250 XAF</div>
            </div>
          </div>
        </div>
      )}

        {/* Sous-formulaire Ventes */}
        {transactionType === 'ventes' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
              <span className="text-2xl mr-2">💰</span>
              Facture de Vente
            </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#444444] mb-1">Client *</label>
              <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                <option value="">-- Sélectionner client --</option>
                <option value="clienta">Client A (411001)</option>
                <option value="clientb">Client B (411002)</option>
                <option value="clientc">SARL XYZ (411003)</option>
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
                className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md bg-blue-100 font-mono"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#444444] mb-1">Notes spécifiques vente *</label>
            <textarea 
              placeholder="Notes obligatoires sur la facture de vente..."
              rows={2}
              className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
              required
            />
          </div>

          {/* Tableau lignes ventes */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte Produit (7xxx)</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Montant HT</th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">TVA %</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TVA</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">TTC</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Note ligne *</th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-blue-50">
                  <td className="px-3 py-2">
                    <input type="text" defaultValue="707000" className="w-full px-2 py-1 border rounded text-sm font-mono" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="Ventes marchandises..." className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" defaultValue="100000" className="w-full px-2 py-1 border rounded text-sm text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <select className="w-full px-2 py-1 border rounded text-sm" defaultValue="19.25">
                      <option value="19.25">19.25%</option>
                      <option value="0">0%</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value="19,250" readOnly className="w-full px-2 py-1 border rounded text-sm text-right bg-yellow-100" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value="119,250" readOnly className="w-full px-2 py-1 border rounded text-sm text-right bg-blue-100 font-medium" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="Note ligne..." className="w-full px-2 py-1 border rounded text-sm" required />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sous-formulaire Règlements */}
      {transactionType === 'reglements' && (
        <div className="p-6 border-b border-gray-200 bg-purple-50">
          <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
            <span className="text-2xl mr-2">🏦</span>
            Sous-formulaire Règlement
          </h3>
          
          {/* Section 1: Détails du règlement */}
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-[#191919] mb-3">💳 Détails du règlement</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>

          {/* Section 2: Association facture */}
          <div className="mb-6 p-4 bg-white rounded-lg border">
            <h4 className="font-medium text-[#191919] mb-3">🔗 Association facture</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">Type de tiers *</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input type="radio" name="tierType" value="client" defaultChecked className="mr-2" />
                    Client
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="tierType" value="fournisseur" className="mr-2" />
                    Fournisseur
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-1">Tiers *</label>
                <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md" required>
                  <option value="">-- Sélectionner --</option>
                  <option value="client1">Client A (411001)</option>
                  <option value="client2">Client B (411002)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-1">Facture impayée *</label>
                <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md" required>
                  <option value="">-- Sélectionner facture --</option>
                  <option value="ve234">VE-2025-00234 (119,250 XAF)</option>
                  <option value="ve235">VE-2025-00235 (85,000 XAF)</option>
                </select>
              </div>
            </div>
            
            {/* Affichage détails facture */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-sm">
                <strong>Facture VE-2025-00234</strong> | Date: 10/01/2025 | Montant dû: <span className="font-mono text-red-600">119,250 XAF</span>
                <br />
                Montant déjà payé: <span className="font-mono">0 XAF</span> | Solde restant: <span className="font-mono font-bold text-green-600">119,250 XAF</span>
              </div>
            </div>
          </div>

          {/* Section 3: Notes règlement */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#444444] mb-1">Notes spécifiques règlement *</label>
            <textarea 
              placeholder="Notes obligatoires sur le règlement..."
              rows={2}
              className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
              required
            />
          </div>
        </div>
      )}

      {/* Sous-formulaire Opérations Diverses */}
      {transactionType === 'operations' && (
        <div className="p-6 border-b border-gray-200 bg-orange-50">
          <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
            <span className="text-2xl mr-2">⚙️</span>
            Sous-formulaire Opérations Diverses
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#444444] mb-1">Type d'OD *</label>
              <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]" required>
                <option value="">-- Sélectionner --</option>
                <option value="amortissement">Amortissement</option>
                <option value="provision">Provision</option>
                <option value="reclassement">Reclassement</option>
                <option value="cloture">Clôture</option>
                <option value="regularisation">Régularisation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#444444] mb-1">Notes spécifiques OD *</label>
              <textarea 
                placeholder="Notes obligatoires sur l'opération diverse..."
                rows={2}
                className="w-full px-3 py-2 border border-[#D9D9D9] rounded-md focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] resize-none"
                required
              />
            </div>
          </div>

          {/* Saisie manuelle libre */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-orange-100">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Compte GL</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Description</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Débit</th>
                  <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Crédit</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Centre coût</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Projet</th>
                  <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Note ligne *</th>
                  <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-orange-50">
                  <td className="px-3 py-2">
                    <input type="text" defaultValue="68100" className="w-full px-2 py-1 border rounded text-sm font-mono" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" defaultValue="Dotation amortissement" className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" defaultValue="50000" className="w-full px-2 py-1 border rounded text-sm text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" placeholder="0" className="w-full px-2 py-1 border rounded text-sm text-right bg-gray-100" readOnly />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="ADMIN" className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="PROJ01" className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="Note..." className="w-full px-2 py-1 border rounded text-sm" required />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-orange-50">
                  <td className="px-3 py-2">
                    <input type="text" defaultValue="28400" className="w-full px-2 py-1 border rounded text-sm font-mono" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" defaultValue="Amortissement matériel" className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" placeholder="0" className="w-full px-2 py-1 border rounded text-sm text-right bg-gray-100" readOnly />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" defaultValue="50000" className="w-full px-2 py-1 border rounded text-sm text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="ADMIN" className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="PROJ01" className="w-full px-2 py-1 border rounded text-sm" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" placeholder="Note..." className="w-full px-2 py-1 border rounded text-sm" required />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section Pièces Jointes (commune à tous) */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-[#6A8A82]" />
          Pièces Jointes
        </h3>
        
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Type</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Référence</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Date</th>
                <th className="px-3 py-2 text-right text-sm font-medium text-[#191919]">Montant</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Lien/Chemin</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Ligne associée</th>
                <th className="px-3 py-2 text-left text-sm font-medium text-[#191919]">Commentaire</th>
                <th className="px-3 py-2 text-center text-sm font-medium text-[#191919]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <select className="w-full px-2 py-1 border rounded text-sm">
                    <option value="facture">Facture</option>
                    <option value="recu">Reçu</option>
                    <option value="contrat">Contrat</option>
                    <option value="releve">Relevé bancaire</option>
                    <option value="cheque">Chèque scanné</option>
                    <option value="virement">Avis de virement</option>
                    <option value="autre">Autre</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="text" placeholder="FA-2025-001" className="w-full px-2 py-1 border rounded text-sm" />
                </td>
                <td className="px-3 py-2">
                  <input type="date" className="w-full px-2 py-1 border rounded text-sm" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" placeholder="119250" className="w-full px-2 py-1 border rounded text-sm text-right" />
                </td>
                <td className="px-3 py-2">
                  <input type="text" placeholder="\\documents\\factures\\FA001.pdf" className="w-full px-2 py-1 border rounded text-sm" />
                </td>
                <td className="px-3 py-2">
                  <select className="w-full px-2 py-1 border rounded text-sm">
                    <option value="">-- Ligne --</option>
                    <option value="1">Ligne 1 - Charge</option>
                    <option value="2">Ligne 2 - TVA</option>
                    <option value="3">Ligne 3 - Fournisseur</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="text" placeholder="Facture originale" className="w-full px-2 py-1 border rounded text-sm" />
                </td>
                <td className="px-3 py-2 text-center">
                  <button className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="p-3 bg-gray-50 border-t">
            <button className="text-[#6A8A82] text-sm hover:underline flex items-center">
              <Plus className="w-4 h-4 mr-1" />
              Ajouter pièce jointe
            </button>
          </div>
        </div>
      </div>

      {/* Validation et Contrôles Finaux */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#191919] mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
          Validation Temps Réel
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Débit</div>
            <div className="text-2xl font-bold text-blue-600">{totals.totalDebit.toLocaleString()} XAF</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Total Crédit</div>
            <div className="text-2xl font-bold text-green-600">{totals.totalCredit.toLocaleString()} XAF</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Équilibre</div>
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-4 h-4 rounded-full ${totals.isBalanced ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xl font-bold ${totals.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                {totals.isBalanced ? 'Équilibré ✓' : 'Déséquilibré ✗'}
              </span>
            </div>
          </div>
        </div>

        {/* Aperçu des écritures générées */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">📊 Aperçu des écritures générées</h4>
          <div className="text-sm text-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>✅ <strong>Ventilation comptable :</strong> Charges (6xxx) + TVA (445x) + Tiers (401/411)</div>
              <div>✅ <strong>Équilibre :</strong> Débit = Crédit = {totals.totalDebit.toLocaleString()} XAF</div>
              <div>✅ <strong>Conformité :</strong> SYSCOHADA + CEMAC</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Finales */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-md hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-md hover:bg-gray-50 transition-colors">
              Enregistrer en brouillon
            </button>
            <button className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors">
              Aperçu écritures
            </button>
          </div>
          <button 
            className={`px-8 py-3 rounded-md font-medium text-white flex items-center space-x-2 transition-colors ${
              totals.isBalanced ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={!totals.isBalanced}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Valider et Comptabiliser</span>
          </button>
        </div>
      </div>
      
      </div>
    </div>
  );
};

export default ComprehensiveJournalEntry;