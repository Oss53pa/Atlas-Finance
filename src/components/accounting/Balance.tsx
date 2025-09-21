import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, FileText, Calendar, Filter,
  Printer, Download, Search, Calculator, Scale,
  TrendingUp, TrendingDown, Eye, EyeOff, Folder, FolderOpen,
  TreePine, List, Grid3x3, RefreshCw, Settings, Columns,
  Mail, FileSpreadsheet, Users, Building
} from 'lucide-react';

interface BalanceAccount {
  code: string;
  libelle: string;
  niveau: number; // 1=Classe, 2=Compte principal, 3=Sous-compte
  parent?: string;
  soldeDebiteurAN: number; // A nouveau
  soldeCrediteurAN: number;
  mouvementsDebit: number;
  mouvementsCredit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
  isExpanded: boolean;
  children?: BalanceAccount[];
}

const Balance: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState({ from: '2024-01-01', to: '2024-12-31' });
  const [searchAccount, setSearchAccount] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [balanceType, setBalanceType] = useState<'generale' | 'auxiliaire' | 'agee' | 'cloture'>('generale');
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'grid'>('tree');
  const [displayLevel, setDisplayLevel] = useState<1 | 2 | 3>(3);
  const [showFilters, setShowFilters] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [columnCount, setColumnCount] = useState<4 | 5 | 6>(6);
  const [visibleColumns, setVisibleColumns] = useState({
    compte: true,
    libelle: true,
    soldeDebiteurAN: true,
    soldeCrediteurAN: true,
    mouvementsDebit: true,
    mouvementsCredit: true,
    soldeDebiteur: true,
    soldeCrediteur: true
  });

  // Données mockées structurées selon SYSCOHADA
  const [accounts, setAccounts] = useState<BalanceAccount[]>([
    {
      code: '1',
      libelle: 'COMPTES DE RESSOURCES DURABLES',
      niveau: 1,
      soldeDebiteurAN: 0,
      soldeCrediteurAN: 500000,
      mouvementsDebit: 50000,
      mouvementsCredit: 150000,
      soldeDebiteur: 0,
      soldeCrediteur: 600000,
      isExpanded: true,
      children: [
        {
          code: '10',
          libelle: 'Capital',
          niveau: 2,
          parent: '1',
          soldeDebiteurAN: 0,
          soldeCrediteurAN: 500000,
          mouvementsDebit: 0,
          mouvementsCredit: 100000,
          soldeDebiteur: 0,
          soldeCrediteur: 600000,
          isExpanded: false,
          children: [
            {
              code: '101',
              libelle: 'Capital social',
              niveau: 3,
              parent: '10',
              soldeDebiteurAN: 0,
              soldeCrediteurAN: 500000,
              mouvementsDebit: 0,
              mouvementsCredit: 100000,
              soldeDebiteur: 0,
              soldeCrediteur: 600000,
              isExpanded: false
            }
          ]
        }
      ]
    },
    {
      code: '2',
      libelle: 'COMPTES D\'ACTIF IMMOBILISÉ',
      niveau: 1,
      soldeDebiteurAN: 250000,
      soldeCrediteurAN: 0,
      mouvementsDebit: 80000,
      mouvementsCredit: 20000,
      soldeDebiteur: 310000,
      soldeCrediteur: 0,
      isExpanded: false,
      children: [
        {
          code: '24',
          libelle: 'Matériel',
          niveau: 2,
          parent: '2',
          soldeDebiteurAN: 250000,
          soldeCrediteurAN: 0,
          mouvementsDebit: 80000,
          mouvementsCredit: 20000,
          soldeDebiteur: 310000,
          soldeCrediteur: 0,
          isExpanded: false
        }
      ]
    },
    {
      code: '4',
      libelle: 'COMPTES DE TIERS',
      niveau: 1,
      soldeDebiteurAN: 45000,
      soldeCrediteurAN: 35000,
      mouvementsDebit: 288000,
      mouvementsCredit: 255500,
      soldeDebiteur: 205000,
      soldeCrediteur: 188500,
      isExpanded: true,
      children: [
        {
          code: '40',
          libelle: 'Fournisseurs et comptes rattachés',
          niveau: 2,
          parent: '4',
          soldeDebiteurAN: 0,
          soldeCrediteurAN: 10000,
          mouvementsDebit: 20000,
          mouvementsCredit: 35500,
          soldeDebiteur: 0,
          soldeCrediteur: 25500,
          isExpanded: true,
          children: [
            {
              code: '401',
              libelle: 'Fournisseurs',
              niveau: 3,
              parent: '40',
              soldeDebiteurAN: 0,
              soldeCrediteurAN: 10000,
              mouvementsDebit: 20000,
              mouvementsCredit: 35500,
              soldeDebiteur: 0,
              soldeCrediteur: 15500,
              isExpanded: false
            }
          ]
        },
        {
          code: '41',
          libelle: 'Clients et comptes rattachés',
          niveau: 2,
          parent: '4',
          soldeDebiteurAN: 45000,
          soldeCrediteurAN: 0,
          mouvementsDebit: 75000,
          mouvementsCredit: 43000,
          soldeDebiteur: 32000,
          soldeCrediteur: 0,
          isExpanded: true,
          children: [
            {
              code: '411',
              libelle: 'Clients',
              niveau: 3,
              parent: '41',
              soldeDebiteurAN: 45000,
              soldeCrediteurAN: 0,
              mouvementsDebit: 75000,
              mouvementsCredit: 43000,
              soldeDebiteur: 32000,
              soldeCrediteur: 0,
              isExpanded: false
            }
          ]
        }
      ]
    },
    {
      code: '5',
      libelle: 'COMPTES DE TRÉSORERIE',
      niveau: 1,
      soldeDebiteurAN: 150000,
      soldeCrediteurAN: 0,
      mouvementsDebit: 193000,
      mouvementsCredit: 20000,
      soldeDebiteur: 323000,
      soldeCrediteur: 0,
      isExpanded: false,
      children: [
        {
          code: '51',
          libelle: 'Valeurs à encaisser',
          niveau: 2,
          parent: '5',
          soldeDebiteurAN: 150000,
          soldeCrediteurAN: 0,
          mouvementsDebit: 193000,
          mouvementsCredit: 20000,
          soldeDebiteur: 173000,
          soldeCrediteur: 0,
          isExpanded: false,
          children: [
            {
              code: '512',
              libelle: 'Banques',
              niveau: 3,
              parent: '51',
              soldeDebiteurAN: 150000,
              soldeCrediteurAN: 0,
              mouvementsDebit: 193000,
              mouvementsCredit: 20000,
              soldeDebiteur: 173000,
              soldeCrediteur: 0,
              isExpanded: false
            }
          ]
        }
      ]
    },
    {
      code: '6',
      libelle: 'COMPTES DE CHARGES',
      niveau: 1,
      soldeDebiteurAN: 0,
      soldeCrediteurAN: 0,
      mouvementsDebit: 29583,
      mouvementsCredit: 0,
      soldeDebiteur: 29583,
      soldeCrediteur: 0,
      isExpanded: false,
      children: [
        {
          code: '60',
          libelle: 'Achats et variations de stocks',
          niveau: 2,
          parent: '6',
          soldeDebiteurAN: 0,
          soldeCrediteurAN: 0,
          mouvementsDebit: 29583,
          mouvementsCredit: 0,
          soldeDebiteur: 29583,
          soldeCrediteur: 0,
          isExpanded: false,
          children: [
            {
              code: '601',
              libelle: 'Achats de marchandises',
              niveau: 3,
              parent: '60',
              soldeDebiteurAN: 0,
              soldeCrediteurAN: 0,
              mouvementsDebit: 29583,
              mouvementsCredit: 0,
              soldeDebiteur: 29583,
              soldeCrediteur: 0,
              isExpanded: false
            }
          ]
        }
      ]
    },
    {
      code: '7',
      libelle: 'COMPTES DE PRODUITS',
      niveau: 1,
      soldeDebiteurAN: 0,
      soldeCrediteurAN: 0,
      mouvementsDebit: 0,
      mouvementsCredit: 62500,
      soldeDebiteur: 0,
      soldeCrediteur: 62500,
      isExpanded: false,
      children: [
        {
          code: '70',
          libelle: 'Ventes',
          niveau: 2,
          parent: '7',
          soldeDebiteurAN: 0,
          soldeCrediteurAN: 0,
          mouvementsDebit: 0,
          mouvementsCredit: 62500,
          soldeDebiteur: 0,
          soldeCrediteur: 62500,
          isExpanded: false,
          children: [
            {
              code: '701',
              libelle: 'Ventes de marchandises',
              niveau: 3,
              parent: '70',
              soldeDebiteurAN: 0,
              soldeCrediteurAN: 0,
              mouvementsDebit: 0,
              mouvementsCredit: 62500,
              soldeDebiteur: 0,
              soldeCrediteur: 62500,
              isExpanded: false
            }
          ]
        }
      ]
    }
  ]);

  const toggleAccount = (code: string, accounts: BalanceAccount[]): BalanceAccount[] => {
    return accounts.map(account => {
      if (account.code === code) {
        return { ...account, isExpanded: !account.isExpanded };
      }
      if (account.children) {
        return { ...account, children: toggleAccount(code, account.children) };
      }
      return account;
    });
  };

  const handleToggle = (code: string) => {
    setAccounts(prev => toggleAccount(code, prev));
  };

  const toggleAllAccounts = (accounts: BalanceAccount[], expand: boolean): BalanceAccount[] => {
    return accounts.map(account => ({
      ...account,
      isExpanded: expand,
      children: account.children ? toggleAllAccounts(account.children, expand) : undefined
    }));
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Fonctions pour les actions rapides
  const handleExportExcel = () => {
    // Créer un fichier Excel avec les données de la balance
    const data = [
      ['Balance de Clôture - Exercice 2024'],
      [''],
      ['Classe', 'Libellé', 'Solde Débit', 'Solde Crédit'],
      ['1-5', 'COMPTES DE BILAN', '18 000 000', '11 500 000'],
      ['6', 'COMPTES DE CHARGES', '23 500 000', '—'],
      ['7', 'COMPTES DE PRODUITS', '—', '37 500 000'],
      ['89', 'RÉSULTAT NET', '14 000 000 (BÉNÉFICE)', ''],
      [''],
      ['TOTAUX GÉNÉRAUX', '', '41 500 000', '63 000 000'],
      ['ÉTAT DE L\'EXERCICE', 'BÉNÉFICIAIRE', '+59.6%', '']
    ];

    // Simuler le téléchargement
    const csvContent = data.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'balance_cloture_2024.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Export Excel généré avec succès !');
  };

  const handleGeneratePDF = () => {
    // Simuler la génération d'un rapport PDF
    alert('Génération du rapport PDF en cours...\n\nLe rapport sera disponible dans quelques instants.');
  };

  const handleSendEmail = () => {
    // Simuler l'envoi par email
    const email = prompt('Entrez l\'adresse email de destination:');
    if (email) {
      alert(`Balance de clôture envoyée avec succès à: ${email}\n\nObjet: Balance de Clôture - Exercice 2024\nContenu: Rapport de balance avec synthèse et actions de clôture.`);
    }
  };

  // Fonctions pour les actions des lignes de tableau
  const handleViewAccount = (account: BalanceAccount) => {
    alert(`Consultation du compte:\n\nCode: ${account.code}\nLibellé: ${account.libelle}\nSolde Débiteur: ${formatAmount(account.soldeDebiteur)}\nSolde Créditeur: ${formatAmount(account.soldeCrediteur)}`);
  };

  const handleEditAccount = (account: BalanceAccount) => {
    const newLibelle = prompt(`Modifier le libellé du compte ${account.code}:`, account.libelle);
    if (newLibelle && newLibelle !== account.libelle) {
      // Mettre à jour le compte
      const updatedAccounts = accounts.map(acc =>
        acc.code === account.code
          ? { ...acc, libelle: newLibelle }
          : acc
      );
      setAccounts(updatedAccounts);
      alert(`Compte ${account.code} modifié avec succès !`);
    }
  };

  const handleDeleteAccount = (account: BalanceAccount) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le compte ?\n\nCode: ${account.code}\nLibellé: ${account.libelle}\n\nCette action est irréversible.`)) {
      // Supprimer le compte
      const updatedAccounts = accounts.filter(acc => acc.code !== account.code);
      setAccounts(updatedAccounts);
      alert(`Compte ${account.code} supprimé avec succès !`);
    }
  };

  const handlePrintAccount = (account: BalanceAccount) => {
    alert(`Impression du détail du compte ${account.code} - ${account.libelle}\n\nLe document sera envoyé vers votre imprimante.`);
  };

  const handleExportAccountExcel = (account: BalanceAccount) => {
    const data = [
      [`Détail du compte ${account.code}`],
      [''],
      ['Code', 'Libellé', 'Solde Débiteur', 'Solde Créditeur'],
      [account.code, account.libelle, formatAmount(account.soldeDebiteur), formatAmount(account.soldeCrediteur)]
    ];

    const csvContent = data.map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `compte_${account.code}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`Export Excel du compte ${account.code} généré avec succès !`);
  };

  const getNiveauStyle = (niveau: number) => {
    switch (niveau) {
      case 1:
        return 'font-bold text-base bg-[#6A8A82]/20';
      case 2:
        return 'font-semibold text-sm bg-[#7A99AC]/10';
      case 3:
        return 'text-sm';
      default:
        return 'text-sm';
    }
  };

  const renderAccounts = (accounts: BalanceAccount[], parentLevel = 0) => {
    return accounts.map((account) => (
      <React.Fragment key={account.code}>
        <tr className={`hover:bg-gray-50 ${getNiveauStyle(account.niveau)}`}>
          {visibleColumns.compte && (
            <td className={`px-4 py-2 ${account.niveau > 1 ? `pl-${4 + (account.niveau - 1) * 8}` : ''}`}>
              <div className="flex items-center space-x-2">
                {account.children && account.children.length > 0 && (
                  <button
                    onClick={() => handleToggle(account.code)}
                    className="text-[#6A8A82] hover:text-[#5A7A72]"
                  >
                    {account.isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
                {account.niveau === 1 && (
                  <Folder className={`w-4 h-4 text-[#B87333] ${account.isExpanded ? 'hidden' : ''}`} />
                )}
                {account.niveau === 1 && account.isExpanded && (
                  <FolderOpen className="w-4 h-4 text-[#B87333]" />
                )}
                <span className={`font-mono ${account.niveau === 1 ? 'text-[#B87333]' : 'text-[#6A8A82]'}`}>
                  {account.code}
                </span>
              </div>
            </td>
          )}
          {visibleColumns.libelle && <td className="px-4 py-2">{account.libelle}</td>}
          {visibleColumns.soldeDebiteurAN && (
            <td className="px-4 py-2 text-right">
              {account.soldeDebiteurAN > 0 ? formatAmount(account.soldeDebiteurAN) : '-'}
            </td>
          )}
          {visibleColumns.soldeCrediteurAN && (
            <td className="px-4 py-2 text-right">
              {account.soldeCrediteurAN > 0 ? formatAmount(account.soldeCrediteurAN) : '-'}
            </td>
          )}
          {visibleColumns.mouvementsDebit && (
            <td className="px-4 py-2 text-right text-red-600">
              {account.mouvementsDebit > 0 ? formatAmount(account.mouvementsDebit) : '-'}
            </td>
          )}
          {visibleColumns.mouvementsCredit && (
            <td className="px-4 py-2 text-right text-green-600">
              {account.mouvementsCredit > 0 ? formatAmount(account.mouvementsCredit) : '-'}
            </td>
          )}
          {visibleColumns.soldeDebiteur && (
            <td className="px-4 py-2 text-right font-semibold text-red-600">
              {account.soldeDebiteur > 0 ? formatAmount(account.soldeDebiteur) : '-'}
            </td>
          )}
          {visibleColumns.soldeCrediteur && (
            <td className="px-4 py-2 text-right font-semibold text-green-600">
              {account.soldeCrediteur > 0 ? formatAmount(account.soldeCrediteur) : '-'}
            </td>
          )}
        </tr>
        {account.isExpanded && account.children && renderAccounts(account.children, account.niveau)}
      </React.Fragment>
    ));
  };

  // Calcul des totaux
  const calculateTotals = (accounts: BalanceAccount[]): any => {
    let totals = {
      soldeDebiteurAN: 0,
      soldeCrediteurAN: 0,
      mouvementsDebit: 0,
      mouvementsCredit: 0,
      soldeDebiteur: 0,
      soldeCrediteur: 0
    };

    const addAccountTotals = (account: BalanceAccount) => {
      if (!account.children || account.children.length === 0) {
        totals.soldeDebiteurAN += account.soldeDebiteurAN;
        totals.soldeCrediteurAN += account.soldeCrediteurAN;
        totals.mouvementsDebit += account.mouvementsDebit;
        totals.mouvementsCredit += account.mouvementsCredit;
        totals.soldeDebiteur += account.soldeDebiteur;
        totals.soldeCrediteur += account.soldeCrediteur;
      } else {
        account.children.forEach(addAccountTotals);
      }
    };

    accounts.forEach(addAccountTotals);
    return totals;
  };

  const totals = calculateTotals(accounts);

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Scale className="w-6 h-6 text-[#6A8A82]" />
            <div>
              <h2 className="text-xl font-bold text-[#191919]">Balance Générale</h2>
              <p className="text-sm text-[#767676]">Vue synthétique des comptes</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* BOUTONS DE MODE D'AFFICHAGE */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('tree')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-[#6A8A82] text-white'
                    : 'text-[#444444] hover:bg-gray-200'
                }`}
              >
                Arborescence
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#6A8A82] text-white'
                    : 'text-[#444444] hover:bg-gray-200'
                }`}
              >
                Liste
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#6A8A82] text-white'
                    : 'text-[#444444] hover:bg-gray-200'
                }`}
              >
                Grille
              </button>
            </div>

            <select
              value={balanceType}
              onChange={(e) => setBalanceType(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
            >
              <option value="generale">Balance Générale</option>
              <option value="auxiliaire">Balance Auxiliaire</option>
              <option value="agee">Balance Âgée</option>
              <option value="cloture">Balance de Clôture</option>
            </select>

            <div className="relative">
              <button
                onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1"
              >
                <Columns className="w-4 h-4" />
                <span>Colonnes ({columnCount})</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showColumnsDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Format d'affichage des colonnes</h3>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="columnFormat"
                          checked={columnCount === 4}
                          onChange={() => setColumnCount(4)}
                          className="mt-1 text-[#6A8A82] focus:ring-[#6A8A82]"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">4 colonnes (Version simplifiée)</div>
                          <div className="text-xs text-gray-500 mt-1">
                            N° compte • Intitulé • Total Débit • Total Crédit
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="columnFormat"
                          checked={columnCount === 5}
                          onChange={() => setColumnCount(5)}
                          className="mt-1 text-[#6A8A82] focus:ring-[#6A8A82]"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">5 colonnes (Version intermédiaire)</div>
                          <div className="text-xs text-gray-500 mt-1">
                            N° compte • Intitulé • Total Débit • Total Crédit • Solde (avec mention D/C)
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="columnFormat"
                          checked={columnCount === 6}
                          onChange={() => setColumnCount(6)}
                          className="mt-1 text-[#6A8A82] focus:ring-[#6A8A82]"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">6 colonnes (Version complète SYSCOHADA)</div>
                          <div className="text-xs text-gray-500 mt-1">
                            N° compte • Intitulé • Total Débit • Total Crédit • Solde Débiteur • Solde Créditeur
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button className="px-3 py-1.5 text-sm bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-1">
              <RefreshCw className="w-4 h-4" />
              <span>Actualiser</span>
            </button>

          </div>
        </div>
      </div>



      {/* Table de la balance - Mode Arborescence */}
      {viewMode === 'tree' && balanceType === 'generale' && (
        <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {visibleColumns.compte && <th className="px-4 py-3 text-left font-semibold text-[#191919]">Compte</th>}
                  {visibleColumns.libelle && <th className="px-4 py-3 text-left font-semibold text-[#191919]">Libellé</th>}
                  {(visibleColumns.soldeDebiteurAN || visibleColumns.soldeCrediteurAN) && (
                    <th className="px-4 py-3 text-right font-semibold text-[#191919]"
                        colSpan={(visibleColumns.soldeDebiteurAN && visibleColumns.soldeCrediteurAN) ? 2 : 1}>
                      <div className="text-center">Soldes à nouveau</div>
                    </th>
                  )}
                  {(visibleColumns.mouvementsDebit || visibleColumns.mouvementsCredit) && (
                    <th className="px-4 py-3 text-right font-semibold text-[#191919]"
                        colSpan={(visibleColumns.mouvementsDebit && visibleColumns.mouvementsCredit) ? 2 : 1}>
                      <div className="text-center">Mouvements période</div>
                    </th>
                  )}
                  {(visibleColumns.soldeDebiteur || visibleColumns.soldeCrediteur) && (
                    <th className="px-4 py-3 text-right font-semibold text-[#191919]"
                        colSpan={(visibleColumns.soldeDebiteur && visibleColumns.soldeCrediteur) ? 2 : 1}>
                      <div className="text-center">Soldes fin période</div>
                    </th>
                  )}
                </tr>
                <tr className="text-xs text-[#767676]">
                  {visibleColumns.compte && <th className="px-4 py-2 text-left font-medium"></th>}
                  {visibleColumns.libelle && <th className="px-4 py-2 text-left font-medium"></th>}
                  {visibleColumns.soldeDebiteurAN && <th className="px-4 py-2 text-right font-medium">Débiteur</th>}
                  {visibleColumns.soldeCrediteurAN && <th className="px-4 py-2 text-right font-medium">Créditeur</th>}
                  {visibleColumns.mouvementsDebit && <th className="px-4 py-2 text-right font-medium">Débit</th>}
                  {visibleColumns.mouvementsCredit && <th className="px-4 py-2 text-right font-medium">Crédit</th>}
                  {visibleColumns.soldeDebiteur && <th className="px-4 py-2 text-right font-medium">Débiteur</th>}
                  {visibleColumns.soldeCrediteur && <th className="px-4 py-2 text-right font-medium">Créditeur</th>}
                </tr>
              </thead>
              <tbody>
                {renderAccounts(accounts)}

                {/* Ligne de totaux */}
                <tr className="bg-[#B87333]/20 font-bold border-t-2 border-[#B87333]">
                  <td colSpan={(visibleColumns.compte ? 1 : 0) + (visibleColumns.libelle ? 1 : 0)} className="px-4 py-3 text-[#191919]">TOTAUX</td>
                  {visibleColumns.soldeDebiteurAN && <td className="px-4 py-3 text-right">{formatAmount(totals.soldeDebiteurAN)}</td>}
                  {visibleColumns.soldeCrediteurAN && <td className="px-4 py-3 text-right">{formatAmount(totals.soldeCrediteurAN)}</td>}
                  {visibleColumns.mouvementsDebit && <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.mouvementsDebit)}</td>}
                  {visibleColumns.mouvementsCredit && <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.mouvementsCredit)}</td>}
                  {visibleColumns.soldeDebiteur && <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.soldeDebiteur)}</td>}
                  {visibleColumns.soldeCrediteur && <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.soldeCrediteur)}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode Liste */}
      {viewMode === 'list' && balanceType === 'generale' && (
        <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">N° Compte</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">Intitulé</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]">Total Débit</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]">Total Crédit</th>
                  {columnCount >= 5 && (
                    <th className="px-4 py-3 text-right font-semibold text-[#191919]">Solde</th>
                  )}
                  {columnCount === 6 && (
                    <>
                      <th className="px-4 py-3 text-right font-semibold text-[#191919]">Solde Débiteur</th>
                      <th className="px-4 py-3 text-right font-semibold text-[#191919]">Solde Créditeur</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center font-semibold text-[#191919]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Aplatir tous les comptes pour la vue liste */}
                {accounts.flatMap(classe => [
                  classe,
                  ...(classe.children || []).flatMap(compte => [
                    compte,
                    ...(compte.children || [])
                  ])
                ]).map((account, index) => (
                  <tr key={`${account.code}-${index}`} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedAccounts.includes(account.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccounts([...selectedAccounts, account.code]);
                          } else {
                            setSelectedAccounts(selectedAccounts.filter(acc => acc !== account.code));
                          }
                        }}
                      />
                    </td>
                    <td className={`px-4 py-2 font-mono ${account.niveau === 1 ? 'font-bold text-[#B87333]' : 'text-[#6A8A82]'}`}>
                      {account.code}
                    </td>
                    <td className={`px-4 py-2 ${account.niveau === 1 ? 'font-bold' : ''}`}>
                      {account.libelle}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {account.mouvementsDebit > 0 ? formatAmount(account.mouvementsDebit) : '-'}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600">
                      {account.mouvementsCredit > 0 ? formatAmount(account.mouvementsCredit) : '-'}
                    </td>
                    {columnCount >= 5 && (
                      <td className="px-4 py-2 text-right font-semibold">
                        {account.soldeDebiteur > 0
                          ? `${formatAmount(account.soldeDebiteur)} D`
                          : account.soldeCrediteur > 0
                          ? `${formatAmount(account.soldeCrediteur)} C`
                          : '-'}
                      </td>
                    )}
                    {columnCount === 6 && (
                      <>
                        <td className="px-4 py-2 text-right font-semibold text-red-600">
                          {account.soldeDebiteur > 0 ? formatAmount(account.soldeDebiteur) : '-'}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-green-600">
                          {account.soldeCrediteur > 0 ? formatAmount(account.soldeCrediteur) : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 transition-colors mr-2"
                          title="Voir détail"
                          onClick={() => handleViewAccount(account)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-800 transition-colors mr-2"
                          title="Modifier le compte"
                          onClick={() => handleEditAccount(account)}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-800 transition-colors mr-2"
                          title="Exporter le compte"
                          onClick={() => handleExportAccountExcel(account)}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Supprimer le compte"
                          onClick={() => handleDeleteAccount(account)}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Ligne de totaux */}
              <tfoot className="bg-[#B87333]/20 font-bold">
                <tr className="border-t-2 border-[#B87333]">
                  <td className="px-4 py-3"></td>
                  <td colSpan={2} className="px-4 py-3 text-[#191919]">TOTAUX</td>
                  <td className="px-4 py-3 text-right">{formatAmount(totals.soldeDebiteurAN)}</td>
                  <td className="px-4 py-3 text-right">{formatAmount(totals.soldeCrediteurAN)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.mouvementsDebit)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.mouvementsCredit)}</td>
                  <td className="px-4 py-3 text-right text-red-600">{formatAmount(totals.soldeDebiteur)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatAmount(totals.soldeCrediteur)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Mode Grille */}
      {viewMode === 'grid' && balanceType === 'generale' && (
        <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold text-[#191919]">Balance Générale - Vue Grille</h3>
          </div>
          <div className="overflow-auto flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {accounts.map((account) => (
                <div key={account.code} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {account.niveau === 1 ? (
                        <Folder className="w-5 h-5 text-[#B87333]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#6A8A82]" />
                      )}
                      <span className={`font-mono text-sm ${account.niveau === 1 ? 'text-[#B87333] font-bold' : 'text-[#6A8A82]'}`}>
                        {account.code}
                      </span>
                    </div>
                    {account.children && account.children.length > 0 && (
                      <button
                        onClick={() => handleToggle(account.code)}
                        className="text-[#6A8A82] hover:text-[#5A7A72]"
                      >
                        {account.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  <h4 className={`text-sm mb-3 ${account.niveau === 1 ? 'font-semibold' : ''}`}>
                    {account.libelle}
                  </h4>

                  <div className="space-y-2 text-xs">
                    {(account.soldeDebiteurAN > 0 || account.soldeCrediteurAN > 0) && (
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className={account.soldeDebiteurAN > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                          {account.soldeDebiteurAN > 0 ? `D: ${formatAmount(account.soldeDebiteurAN)}` : `C: ${formatAmount(account.soldeCrediteurAN)}`}
                        </span>
                      </div>
                    )}

                    {(account.mouvementsDebit > 0 || account.mouvementsCredit > 0) && (
                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          {account.mouvementsDebit > 0 && (
                            <div className="text-red-600">D: {formatAmount(account.mouvementsDebit)}</div>
                          )}
                          {account.mouvementsCredit > 0 && (
                            <div className="text-green-600">C: {formatAmount(account.mouvementsCredit)}</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-gray-600 font-semibold">Solde Final:</span>
                      <span className={account.soldeDebiteur > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                        {account.soldeDebiteur > 0 ? `D: ${formatAmount(account.soldeDebiteur)}` : `C: ${formatAmount(account.soldeCrediteur)}`}
                      </span>
                    </div>
                  </div>

                  {account.isExpanded && account.children && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {account.children.map((child) => (
                        <div key={child.code} className="pl-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">{child.code} - {child.libelle}</span>
                            <span className={child.soldeDebiteur > 0 ? "text-red-600" : "text-green-600"}>
                              {child.soldeDebiteur > 0 ? formatAmount(child.soldeDebiteur) : formatAmount(child.soldeCrediteur)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Balance Auxiliaire */}
      {balanceType === 'auxiliaire' && (
        <>
          {viewMode === 'tree' && (
            <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#191919]">Balance Auxiliaire - Vue Arborescence</h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">Clients (411)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Fournisseurs (401)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Personnel (421)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Associés (455)</button>
                  </div>
                </div>
              </div>
              <div className="overflow-auto flex-1 p-4">
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <ChevronDown className="w-4 h-4 text-[#6A8A82]" />
                        <span className="font-bold text-[#6A8A82]">411 - CLIENTS</span>
                      </div>
                      <span className="font-semibold">Solde Total: 3 300 000,00 FCFA</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm">411001 - Client A SARL</span>
                        <span className="text-sm font-semibold">2 200 000,00</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm">411002 - Client B SAS</span>
                        <span className="text-sm font-semibold">1 100 000,00</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-4 bg-orange-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <ChevronRight className="w-4 h-4 text-[#6A8A82]" />
                        <span className="font-bold text-[#6A8A82]">401 - FOURNISSEURS</span>
                      </div>
                      <span className="font-semibold">Solde Total: 1 400 000,00 FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#191919]">Balance Auxiliaire - Vue Liste</h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">Clients (411)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Fournisseurs (401)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Personnel (421)</button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">Associés (455)</button>
                  </div>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">Compte</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">Tiers</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]">Solde Antérieur</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]">Débit Période</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]">Crédit Période</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]">Solde Final</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#191919]">Lettrage</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#191919]">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2 font-mono text-[#6A8A82]">411001</td>
                  <td className="px-4 py-2">Client A SARL</td>
                  <td className="px-4 py-2 text-right">1 500 000,00</td>
                  <td className="px-4 py-2 text-right text-red-600">2 500 000,00</td>
                  <td className="px-4 py-2 text-right text-green-600">1 800 000,00</td>
                  <td className="px-4 py-2 text-right font-semibold">2 200 000,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">87%</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      onClick={() => alert('Consultation des détails du compte')}
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-800 mr-2"
                      onClick={() => alert('Export Excel généré avec succès!')}
                      title="Exporter Excel"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      className="text-orange-600 hover:text-orange-800"
                      onClick={() => alert('Impression en cours...')}
                      title="Imprimer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2 font-mono text-[#6A8A82]">411002</td>
                  <td className="px-4 py-2">Client B SAS</td>
                  <td className="px-4 py-2 text-right">800 000,00</td>
                  <td className="px-4 py-2 text-right text-red-600">1 200 000,00</td>
                  <td className="px-4 py-2 text-right text-green-600">900 000,00</td>
                  <td className="px-4 py-2 text-right font-semibold">1 100 000,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">94%</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      onClick={() => alert('Consultation des détails du compte')}
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-800 mr-2"
                      onClick={() => alert('Export Excel généré avec succès!')}
                      title="Exporter Excel"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      className="text-orange-600 hover:text-orange-800"
                      onClick={() => alert('Impression en cours...')}
                      title="Imprimer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
          )}

          {viewMode === 'grid' && (
            <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[#191919]">Balance Auxiliaire - Vue Grille</h3>
              </div>
              <div className="overflow-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Client A SARL */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#B87333]" />
                        <span className="font-mono text-sm text-[#B87333] font-bold">411001</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">Client A SARL</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-red-600 font-semibold">D: 1 500 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: 2 500 000</div>
                          <div className="text-green-600">C: 1 800 000</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-red-600 font-bold">D: 2 200 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Client B SAS */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#B87333]" />
                        <span className="font-mono text-sm text-[#B87333] font-bold">411002</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">Client B SAS</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-red-600 font-semibold">D: 800 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: 1 200 000</div>
                          <div className="text-green-600">C: 900 000</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-red-600 font-bold">D: 1 100 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Fournisseur ACME */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Building className="w-5 h-5 text-[#6A8A82]" />
                        <span className="font-mono text-sm text-[#6A8A82] font-bold">401001</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">Fournisseur ACME</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-green-600 font-semibold">C: 800 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: 600 000</div>
                          <div className="text-green-600">C: 1 200 000</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-green-600 font-bold">C: 1 400 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Personnel */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#6A8A82]" />
                        <span className="font-mono text-sm text-[#6A8A82] font-bold">421001</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">Salaires à payer</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-gray-400 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: 200 000</div>
                          <div className="text-green-600">C: 650 000</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-green-600 font-bold">C: 450 000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Balance Âgée */}
      {balanceType === 'agee' && (
        <>
          {viewMode === 'tree' && (
        <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#191919]">Balance Âgée des Créances</h3>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm">Non échu</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md text-sm">0-30 jours</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm">31-60 jours</span>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm">&gt;60 jours</span>
              </div>
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">Client</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]">Solde Total</th>
                  <th className="px-4 py-3 text-right font-semibold text-green-700">Non échu</th>
                  <th className="px-4 py-3 text-right font-semibold text-yellow-700">0-30 jours</th>
                  <th className="px-4 py-3 text-right font-semibold text-orange-700">31-60 jours</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-700">&gt;60 jours</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#191919]">Risque</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#191919]">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2">
                    <div>
                      <span className="font-mono text-[#6A8A82]">411001</span> - Client A SARL
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">2 200 000,00</td>
                  <td className="px-4 py-2 text-right text-green-600">800 000,00</td>
                  <td className="px-4 py-2 text-right text-yellow-600">700 000,00</td>
                  <td className="px-4 py-2 text-right text-orange-600">400 000,00</td>
                  <td className="px-4 py-2 text-right text-red-600">300 000,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">Moyen</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      onClick={() => alert('Consultation des créances client')}
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-orange-600 hover:text-orange-800"
                      onClick={() => alert('Relance envoyée par email')}
                      title="Envoyer relance"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b">
                  <td className="px-4 py-2">
                    <div>
                      <span className="font-mono text-[#6A8A82]">411002</span> - Client B SAS
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">1 100 000,00</td>
                  <td className="px-4 py-2 text-right text-green-600">900 000,00</td>
                  <td className="px-4 py-2 text-right text-yellow-600">200 000,00</td>
                  <td className="px-4 py-2 text-right text-orange-600">0,00</td>
                  <td className="px-4 py-2 text-right text-red-600">0,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Faible</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      onClick={() => alert('Consultation des créances client')}
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-orange-600 hover:text-orange-800"
                      onClick={() => alert('Relance envoyée par email')}
                      title="Envoyer relance"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[#191919]">Balance Âgée - Vue Liste</h3>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Compte</th>
                      <th className="px-4 py-3 text-left">Client</th>
                      <th className="px-4 py-3 text-right">Solde Total</th>
                      <th className="px-4 py-3 text-right">Non échu</th>
                      <th className="px-4 py-3 text-right">0-30 jours</th>
                      <th className="px-4 py-3 text-right">31-60 jours</th>
                      <th className="px-4 py-3 text-right">&gt;60 jours</th>
                      <th className="px-4 py-3 text-center">Risque</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-2 font-mono text-[#6A8A82]">411001</td>
                      <td className="px-4 py-2">Client A SARL</td>
                      <td className="px-4 py-2 text-right font-semibold">2 200 000,00</td>
                      <td className="px-4 py-2 text-right text-green-600">800 000,00</td>
                      <td className="px-4 py-2 text-right text-yellow-600">700 000,00</td>
                      <td className="px-4 py-2 text-right text-orange-600">400 000,00</td>
                      <td className="px-4 py-2 text-right text-red-600">300 000,00</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">Moyen</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[#191919]">Balance Âgée - Vue Grille</h3>
              </div>
              <div className="overflow-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Client A SARL */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#B87333]" />
                        <span className="font-mono text-sm text-[#B87333] font-bold">411001</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">Client A SARL</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600">Non échu:</span>
                        <span className="text-green-600 font-semibold">800 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-gray-600">0-30j:</span>
                        <span className="text-yellow-600 font-semibold">700 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">31-60j:</span>
                        <span className="text-orange-600 font-semibold">400 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-gray-600">&gt;60j:</span>
                        <span className="text-red-600 font-semibold">300 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600 font-semibold">Total:</span>
                        <span className="text-blue-600 font-bold">2 200 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Client B SAS */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#B87333]" />
                        <span className="font-mono text-sm text-[#B87333] font-bold">411002</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">Client B SAS</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600">Non échu:</span>
                        <span className="text-green-600 font-semibold">900 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-gray-600">0-30j:</span>
                        <span className="text-yellow-600 font-semibold">200 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">31-60j:</span>
                        <span className="text-gray-400 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-gray-600">&gt;60j:</span>
                        <span className="text-gray-400 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600 font-semibold">Total:</span>
                        <span className="text-blue-600 font-bold">1 100 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Client C SA */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#B87333]" />
                        <span className="font-mono text-sm text-[#B87333] font-bold">411003</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">Client C SA</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600">Non échu:</span>
                        <span className="text-green-600 font-semibold">500 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                        <span className="text-gray-600">0-30j:</span>
                        <span className="text-yellow-600 font-semibold">800 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">31-60j:</span>
                        <span className="text-orange-600 font-semibold">900 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-gray-600">&gt;60j:</span>
                        <span className="text-red-600 font-semibold">1 300 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600 font-semibold">Total:</span>
                        <span className="text-blue-600 font-bold">3 500 000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Balance de Clôture */}
      {balanceType === 'cloture' && (
        <>
          {viewMode === 'tree' && (
        <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#191919]">Balance de Clôture</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Exercice: 2024</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm">État: En cours</span>
              </div>
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">Compte</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#191919]">Libellé</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]" colSpan={2}>
                    <div className="text-center">Soldes d'ouverture</div>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]" colSpan={2}>
                    <div className="text-center">Mouvements de l'exercice</div>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[#191919]" colSpan={2}>
                    <div className="text-center">Soldes de clôture</div>
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-[#191919]">Affectation</th>
                </tr>
                <tr className="text-xs text-[#767676]">
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2"></th>
                  <th className="px-4 py-2 text-right">Débit</th>
                  <th className="px-4 py-2 text-right">Crédit</th>
                  <th className="px-4 py-2 text-right">Débit</th>
                  <th className="px-4 py-2 text-right">Crédit</th>
                  <th className="px-4 py-2 text-right">Débit</th>
                  <th className="px-4 py-2 text-right">Crédit</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-gray-50 border-b bg-blue-50">
                  <td className="px-4 py-2 font-mono text-[#6A8A82] font-bold">1-5</td>
                  <td className="px-4 py-2 font-semibold">BILAN</td>
                  <td className="px-4 py-2 text-right">15 000 000,00</td>
                  <td className="px-4 py-2 text-right">10 000 000,00</td>
                  <td className="px-4 py-2 text-right text-red-600">5 000 000,00</td>
                  <td className="px-4 py-2 text-right text-green-600">3 500 000,00</td>
                  <td className="px-4 py-2 text-right font-semibold">18 000 000,00</td>
                  <td className="px-4 py-2 text-right font-semibold">11 500 000,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Bilan</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b bg-green-50">
                  <td className="px-4 py-2 font-mono text-[#6A8A82] font-bold">6</td>
                  <td className="px-4 py-2 font-semibold">CHARGES</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right text-red-600">23 500 000,00</td>
                  <td className="px-4 py-2 text-right text-green-600">0,00</td>
                  <td className="px-4 py-2 text-right font-semibold text-red-600">23 500 000,00</td>
                  <td className="px-4 py-2 text-right font-semibold">0,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Résultat</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b bg-green-50">
                  <td className="px-4 py-2 font-mono text-[#6A8A82] font-bold">7</td>
                  <td className="px-4 py-2 font-semibold">PRODUITS</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right text-red-600">0,00</td>
                  <td className="px-4 py-2 text-right text-green-600">37 500 000,00</td>
                  <td className="px-4 py-2 text-right font-semibold">0,00</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-600">37 500 000,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Résultat</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 border-b bg-yellow-50">
                  <td className="px-4 py-2 font-mono text-[#6A8A82] font-bold">89</td>
                  <td className="px-4 py-2 font-semibold">RÉSULTAT NET</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right">0,00</td>
                  <td className="px-4 py-2 text-right font-semibold">0,00</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-600">14 000 000,00</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Calculé</span>
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-[#B87333]/20 font-bold">
                <tr className="border-t-2 border-[#B87333]">
                  <td colSpan={2} className="px-4 py-3 text-[#191919]">TOTAUX</td>
                  <td className="px-4 py-3 text-right">15 000 000,00</td>
                  <td className="px-4 py-3 text-right">10 000 000,00</td>
                  <td className="px-4 py-3 text-right text-red-600">28 500 000,00</td>
                  <td className="px-4 py-3 text-right text-green-600">41 000 000,00</td>
                  <td className="px-4 py-3 text-right text-red-600">41 500 000,00</td>
                  <td className="px-4 py-3 text-right text-green-600">63 000 000,00</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-semibold text-green-600">
                  Résultat de l'exercice: 14 000 000 FCFA (Bénéfice)
                </span>
              </div>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] text-sm">
                  Valider la clôture
                </button>
                <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[#191919]">Balance de Clôture - Vue Liste</h3>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Compte</th>
                      <th className="px-4 py-3 text-left">Libellé</th>
                      <th className="px-4 py-3 text-right">Solde Ouverture</th>
                      <th className="px-4 py-3 text-right">Mouvements</th>
                      <th className="px-4 py-3 text-right">Solde Clôture</th>
                      <th className="px-4 py-3 text-center">Affectation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-2 font-mono text-[#6A8A82]">1-5</td>
                      <td className="px-4 py-2">BILAN</td>
                      <td className="px-4 py-2 text-right">5 000 000,00</td>
                      <td className="px-4 py-2 text-right">1 500 000,00</td>
                      <td className="px-4 py-2 text-right font-semibold">6 500 000,00</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Bilan</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="bg-white rounded-lg border-2 border-[#6A8A82] overflow-hidden shadow-lg h-[600px] flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-semibold text-[#191919]">Balance de Clôture - Vue Grille</h3>
              </div>
              <div className="overflow-auto flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                  {/* Carte BILAN */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Scale className="w-5 h-5 text-[#6A8A82]" />
                        <span className="font-mono text-sm text-[#6A8A82] font-bold">1-5</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">COMPTES DE BILAN</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-red-600 font-semibold">D: 15 000 000 | C: 10 000 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: +5 000 000</div>
                          <div className="text-green-600">C: +3 500 000</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-blue-600 font-bold">D: 18 000 000 | C: 11 500 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte CHARGES */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="w-5 h-5 text-[#B87333]" />
                        <span className="font-mono text-sm text-[#B87333] font-bold">6</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">COMPTES DE CHARGES</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-gray-400 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-red-600">D: +23 500 000</div>
                          <div className="text-gray-400">C: —</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-red-600 font-bold">D: 23 500 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte PRODUITS */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="font-mono text-sm text-green-600 font-bold">7</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">COMPTES DE PRODUITS</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Solde AN:</span>
                        <span className="text-gray-400 font-semibold">—</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Mouvements:</span>
                        <div className="text-right">
                          <div className="text-gray-400">D: —</div>
                          <div className="text-green-600">C: +37 500 000</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">Solde Final:</span>
                        <span className="text-green-600 font-bold">C: 37 500 000</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte RÉSULTAT NET */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-5 h-5 text-[#B87333]" />
                        <span className="font-mono text-sm text-[#B87333] font-bold">89</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">RÉSULTAT NET</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Exercice:</span>
                        <span className="text-green-600 font-semibold">14 000 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600">Type:</span>
                        <span className="text-green-600 font-bold">BÉNÉFICE</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Taux:</span>
                        <span className="text-orange-600 font-bold">+59.6%</span>
                      </div>
                    </div>
                  </div>

                  {/* Carte Synthèse Globale */}
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-5 h-5 text-[#6A8A82]" />
                        <span className="font-mono text-sm text-[#6A8A82] font-bold">ΣΣ</span>
                      </div>
                    </div>

                    <h4 className="text-sm mb-3 font-semibold">SYNTHÈSE DE CLÔTURE</h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-gray-600">Total Débit:</span>
                        <span className="text-red-600 font-semibold">41 500 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
                        <span className="text-gray-600">Total Crédit:</span>
                        <span className="text-green-600 font-semibold">63 000 000</span>
                      </div>

                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-gray-600 font-semibold">État:</span>
                        <span className="text-green-600 font-bold">BÉNÉFICIAIRE +59.6%</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <button className="w-full px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] text-sm font-semibold">
                        Valider la clôture
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Actions rapides */}
          {viewMode === 'grid' && (
            <div className="mt-4 bg-white rounded-lg border-2 border-[#6A8A82] p-4 shadow-lg">
              <h4 className="font-bold text-[#191919] mb-3">Actions rapides</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium flex items-center justify-center transition-all"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium flex items-center justify-center transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exporter Excel
                </button>
                <button
                  onClick={handleGeneratePDF}
                  className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium flex items-center justify-center transition-all"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Rapport PDF
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium flex items-center justify-center transition-all"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Résumé */}
      {balanceType === 'generale' && (
        <div className="bg-white rounded-lg p-4 border-2 border-[#B87333]">
        <h3 className="text-lg font-semibold text-[#191919] mb-3 flex items-center">
          <Calculator className="w-5 h-5 mr-2 text-[#B87333]" />
          Contrôle d'équilibre
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-[#767676]">Balance A Nouveau</p>
            <div className="mt-2">
              <p className="text-sm">Débit: <span className="font-bold">{formatAmount(totals.soldeDebiteurAN)}</span></p>
              <p className="text-sm">Crédit: <span className="font-bold">{formatAmount(totals.soldeCrediteurAN)}</span></p>
            </div>
            {totals.soldeDebiteurAN === totals.soldeCrediteurAN && (
              <p className="text-green-600 text-sm mt-1">✓ Équilibrée</p>
            )}
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-[#767676]">Mouvements Période</p>
            <div className="mt-2">
              <p className="text-sm">Débit: <span className="font-bold text-red-600">{formatAmount(totals.mouvementsDebit)}</span></p>
              <p className="text-sm">Crédit: <span className="font-bold text-green-600">{formatAmount(totals.mouvementsCredit)}</span></p>
            </div>
            {totals.mouvementsDebit === totals.mouvementsCredit && (
              <p className="text-green-600 text-sm mt-1">✓ Équilibrée</p>
            )}
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-[#767676]">Soldes Fin Période</p>
            <div className="mt-2">
              <p className="text-sm">Débiteur: <span className="font-bold text-red-600">{formatAmount(totals.soldeDebiteur)}</span></p>
              <p className="text-sm">Créditeur: <span className="font-bold text-green-600">{formatAmount(totals.soldeCrediteur)}</span></p>
            </div>
            {totals.soldeDebiteur === totals.soldeCrediteur && (
              <p className="text-green-600 text-sm mt-1">✓ Équilibrée</p>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Balance;