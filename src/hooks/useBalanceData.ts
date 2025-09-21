import { useState, useEffect, useMemo } from 'react';

export interface BalanceData {
  compte: string;
  libelle: string;
  debitPrecedent: number;
  creditPrecedent: number;
  debitMouvement: number;
  creditMouvement: number;
  debitSolde: number;
  creditSolde: number;
  type: 'actif' | 'passif' | 'charges' | 'produits';
  centreCout?: string;
  dernierMouvement?: Date;
  devise: string;
  tiers?: string;
}

export interface BalanceFilters {
  dateDebut: string;
  dateFin: string;
  compteMin: string;
  compteMax: string;
  tiers: string;
  centreCout: string;
  devise: string;
  montantMin: string;
  montantMax: string;
  onlyMovement: boolean;
  onlyUnbalanced: boolean;
  typeBalance: 'generale' | 'auxiliaires' | 'analytique';
}

export interface BalanceIndicators {
  totalDebit: number;
  totalCredit: number;
  equilibre: number;
  tauxEquilibre: number;
  actif: number;
  passif: number;
  charges: number;
  produits: number;
  comptesActifs: number;
  comptesNonLettres: number;
  tauxRapprochement: number;
}

export const useBalanceData = (filters: BalanceFilters) => {
  const [data, setData] = useState<BalanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données simulées pour la démo
  const mockData: BalanceData[] = [
    { 
      compte: '101000', 
      libelle: 'Capital social', 
      debitPrecedent: 0, 
      creditPrecedent: 10000000, 
      debitMouvement: 0, 
      creditMouvement: 0, 
      debitSolde: 0, 
      creditSolde: 10000000, 
      type: 'passif', 
      centreCout: 'CC001',
      devise: 'XAF'
    },
    {
      compte: '161000',
      libelle: 'Emprunts long terme',
      debitPrecedent: 0,
      creditPrecedent: 5000000,
      debitMouvement: 0,
      creditMouvement: 500000,
      debitSolde: 0,
      creditSolde: 5500000,
      type: 'passif',
      centreCout: 'CC001',
      devise: 'XAF'
    },
    {
      compte: '211000',
      libelle: 'Terrains',
      debitPrecedent: 8000000,
      creditPrecedent: 0,
      debitMouvement: 0,
      creditMouvement: 0,
      debitSolde: 8000000,
      creditSolde: 0,
      type: 'actif',
      centreCout: 'CC002',
      devise: 'XAF'
    },
    {
      compte: '241000',
      libelle: 'Matériel industriel',
      debitPrecedent: 12000000,
      creditPrecedent: 0,
      debitMouvement: 2000000,
      creditMouvement: 0,
      debitSolde: 14000000,
      creditSolde: 0,
      type: 'actif',
      centreCout: 'CC002',
      devise: 'XAF'
    },
    {
      compte: '411001',
      libelle: 'Client A SARL',
      debitPrecedent: 1500000,
      creditPrecedent: 0,
      debitMouvement: 2500000,
      creditMouvement: 1800000,
      debitSolde: 2200000,
      creditSolde: 0,
      type: 'actif',
      centreCout: 'CC001',
      devise: 'XAF',
      tiers: 'Client A'
    },
    {
      compte: '401001',
      libelle: 'Fournisseur ACME SARL',
      debitPrecedent: 0,
      creditPrecedent: 800000,
      debitMouvement: 600000,
      creditMouvement: 1200000,
      debitSolde: 0,
      creditSolde: 1400000,
      type: 'passif',
      centreCout: 'CC001',
      devise: 'XAF',
      tiers: 'ACME SARL'
    },
    {
      compte: '512100',
      libelle: 'Banque BNP Paribas',
      debitPrecedent: 3500000,
      creditPrecedent: 0,
      debitMouvement: 8500000,
      creditMouvement: 7200000,
      debitSolde: 4800000,
      creditSolde: 0,
      type: 'actif',
      centreCout: 'CC001',
      devise: 'XAF'
    },
    {
      compte: '607000',
      libelle: 'Achats de marchandises',
      debitPrecedent: 15000000,
      creditPrecedent: 0,
      debitMouvement: 8500000,
      creditMouvement: 0,
      debitSolde: 23500000,
      creditSolde: 0,
      type: 'charges',
      centreCout: 'CC001',
      devise: 'XAF'
    },
    {
      compte: '707000',
      libelle: 'Ventes de marchandises',
      debitPrecedent: 0,
      creditPrecedent: 25000000,
      debitMouvement: 0,
      creditMouvement: 12500000,
      debitSolde: 0,
      creditSolde: 37500000,
      type: 'produits',
      centreCout: 'CC001',
      devise: 'XAF'
    },
    {
      compte: '621000',
      libelle: 'Rémunération du personnel',
      debitPrecedent: 8000000,
      creditPrecedent: 0,
      debitMouvement: 4200000,
      creditMouvement: 0,
      debitSolde: 12200000,
      creditSolde: 0,
      type: 'charges',
      centreCout: 'CC003',
      devise: 'XAF'
    }
  ];

  // Simulation de chargement des données
  useEffect(() => {
    setLoading(true);
    // Simulation d'appel API
    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 500);
  }, [filters]);

  // Filtrage des données
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Filtres par compte
    if (filters.compteMin) {
      filtered = filtered.filter(item => item.compte >= filters.compteMin);
    }
    if (filters.compteMax) {
      filtered = filtered.filter(item => item.compte <= filters.compteMax);
    }

    // Filtre par centre de coût
    if (filters.centreCout) {
      filtered = filtered.filter(item => item.centreCout === filters.centreCout);
    }

    // Filtre par devise
    if (filters.devise && filters.devise !== 'ALL') {
      filtered = filtered.filter(item => item.devise === filters.devise);
    }

    // Filtre seulement les comptes avec mouvement
    if (filters.onlyMovement) {
      filtered = filtered.filter(item => item.debitMouvement > 0 || item.creditMouvement > 0);
    }

    // Filtre seulement les comptes déséquilibrés
    if (filters.onlyUnbalanced) {
      filtered = filtered.filter(item => Math.abs(item.debitSolde - item.creditSolde) > 0);
    }

    return filtered;
  }, [data, filters]);

  // Calcul des indicateurs
  const indicators: BalanceIndicators = useMemo(() => {
    const totalDebit = filteredData.reduce((sum, item) => sum + item.debitSolde, 0);
    const totalCredit = filteredData.reduce((sum, item) => sum + item.creditSolde, 0);
    const equilibre = Math.abs(totalDebit - totalCredit);
    const tauxEquilibre = totalCredit > 0 ? ((totalCredit - equilibre) / totalCredit) * 100 : 0;
    
    const actif = filteredData.filter(item => item.type === 'actif').reduce((sum, item) => sum + item.debitSolde - item.creditSolde, 0);
    const passif = filteredData.filter(item => item.type === 'passif').reduce((sum, item) => sum + item.creditSolde - item.debitSolde, 0);
    const charges = filteredData.filter(item => item.type === 'charges').reduce((sum, item) => sum + item.debitSolde, 0);
    const produits = filteredData.filter(item => item.type === 'produits').reduce((sum, item) => sum + item.creditSolde, 0);
    
    const comptesActifs = filteredData.filter(item => item.debitSolde > 0 || item.creditSolde > 0).length;
    const comptesNonLettres = filteredData.filter(item => item.tiers && Math.abs(item.debitSolde - item.creditSolde) > 0).length;
    const tauxRapprochement = 98; // Simulation

    return { 
      totalDebit, 
      totalCredit, 
      equilibre, 
      tauxEquilibre, 
      actif, 
      passif, 
      charges, 
      produits, 
      comptesActifs, 
      comptesNonLettres, 
      tauxRapprochement 
    };
  }, [filteredData]);

  // Groupement par type pour les graphiques
  const dataByType = useMemo(() => {
    const grouped = filteredData.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = { totalDebit: 0, totalCredit: 0, soldeNet: 0 };
      }
      acc[item.type].totalDebit += item.debitSolde;
      acc[item.type].totalCredit += item.creditSolde;
      acc[item.type].soldeNet += (item.debitSolde - item.creditSolde);
      return acc;
    }, {} as Record<string, { totalDebit: number; totalCredit: number; soldeNet: number }>);

    return Object.entries(grouped).map(([type, values]) => ({
      type,
      ...values
    }));
  }, [filteredData]);

  // Export functions
  const exportToExcel = () => {
    // Logic pour export Excel
    console.log('Export vers Excel...', filteredData);
  };

  const exportToPDF = () => {
    // Logic pour export PDF
    console.log('Export vers PDF...', filteredData);
  };

  const exportToCSV = () => {
    // Logic pour export CSV
    const csvContent = filteredData.map(item => 
      `${item.compte},${item.libelle},${item.debitSolde},${item.creditSolde}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return {
    data: filteredData,
    loading,
    error,
    indicators,
    dataByType,
    exportToExcel,
    exportToPDF,
    exportToCSV
  };
};