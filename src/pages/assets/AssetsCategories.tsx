import React, { useState } from 'react'; // Palette WiseBook appliquée
import {
  Tag, Search, Filter, Plus, Edit2, Trash2, ChevronRight,
  Building, Computer, Car, Package, FileText, Settings,
  BarChart3, TrendingUp, DollarSign, Activity
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';

const AssetsCategories: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const categories = [
    {
      id: 1,
      name: 'Immobilisations corporelles',
      code: 'CORP',
      parent: null,
      count: 450,
      value: 2500000,
      depreciationRate: '10%',
      icon: Building,
      color: 'blue',
      children: [
        { id: 11, name: 'Terrains', code: 'TERR', count: 5, value: 800000, depreciationRate: '0%' },
        { id: 12, name: 'Bâtiments', code: 'BATI', count: 12, value: 1200000, depreciationRate: '2-5%' },
        { id: 13, name: 'Aménagements', code: 'AMEN', count: 25, value: 150000, depreciationRate: '10%' },
        { id: 14, name: 'Installations techniques', code: 'INST', count: 80, value: 350000, depreciationRate: '10-15%' }
      ]
    },
    {
      id: 2,
      name: 'Matériel informatique',
      code: 'INFO',
      parent: null,
      count: 280,
      value: 450000,
      depreciationRate: '33%',
      icon: Computer,
      color: 'purple',
      children: [
        { id: 21, name: 'Serveurs', code: 'SERV', count: 15, value: 180000, depreciationRate: '33%' },
        { id: 22, name: 'Ordinateurs', code: 'ORDI', count: 150, value: 150000, depreciationRate: '33%' },
        { id: 23, name: 'Périphériques', code: 'PERI', count: 115, value: 120000, depreciationRate: '33%' }
      ]
    },
    {
      id: 3,
      name: 'Matériel de transport',
      code: 'TRAN',
      parent: null,
      count: 35,
      value: 680000,
      depreciationRate: '20%',
      icon: Car,
      color: 'green',
      children: [
        { id: 31, name: 'Véhicules légers', code: 'VLEG', count: 25, value: 450000, depreciationRate: '20%' },
        { id: 32, name: 'Véhicules utilitaires', code: 'VUTI', count: 8, value: 180000, depreciationRate: '20%' },
        { id: 33, name: 'Deux roues', code: 'DEUX', count: 2, value: 50000, depreciationRate: '25%' }
      ]
    },
    {
      id: 4,
      name: 'Mobilier et équipement',
      code: 'MOBI',
      parent: null,
      count: 180,
      value: 250000,
      depreciationRate: '10-15%',
      icon: Package,
      color: 'orange',
      children: [
        { id: 41, name: 'Mobilier de bureau', code: 'MBUR', count: 120, value: 150000, depreciationRate: '10%' },
        { id: 42, name: 'Équipement industriel', code: 'EQIN', count: 60, value: 100000, depreciationRate: '15%' }
      ]
    },
    {
      id: 5,
      name: 'Immobilisations incorporelles',
      code: 'INCO',
      parent: null,
      count: 45,
      value: 380000,
      depreciationRate: '20%',
      icon: FileText,
      color: 'red',
      children: [
        { id: 51, name: 'Logiciels', code: 'LOGI', count: 30, value: 250000, depreciationRate: '20-33%' },
        { id: 52, name: 'Brevets et licences', code: 'BREV', count: 10, value: 100000, depreciationRate: '20%' },
        { id: 53, name: 'Fonds de commerce', code: 'FOND', count: 5, value: 30000, depreciationRate: 'Variable' }
      ]
    }
  ];

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-[#6A8A82]/10', text: 'text-[#6A8A82]', border: 'border-[#6A8A82]/20' },
      purple: { bg: 'bg-[#B87333]/10', text: 'text-[#B87333]', border: 'border-[#B87333]/20' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
      red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Catégories d'Immobilisations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Classification et organisation des actifs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => alert('Ouvrir les paramètres des catégories')}
          >
            <Settings className="w-4 h-4 mr-1" />
            Paramètres
          </ModernButton>
          <ModernButton
            variant="primary"
            size="sm"
            onClick={() => alert('Créer une nouvelle catégorie')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle catégorie
          </ModernButton>
        </div>
      </div>

      {/* Search */}
      <ModernCard>
        <CardBody>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Rechercher une catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </CardBody>
      </ModernCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total catégories</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">18</p>
              </div>
              <Tag className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total actifs</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">990</p>
              </div>
              <Package className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Valeur totale</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">€4.26M</p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Taux moyen</p>
                <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">18.5%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => {
          const colors = getColorClasses(category.color);
          const Icon = category.icon;
          const isExpanded = expandedCategories.has(category.id);

          return (
            <ModernCard key={category.id} className="overflow-hidden">
              <CardBody>
                <div className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--color-text-primary)]">
                          {category.name}
                        </h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                          Code: {category.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="p-1 hover:bg-[var(--color-background-subtle)] rounded transition-colors"
                      >
                        <ChevronRight
                          className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => alert(`Modifier catégorie: ${category.name}`)}
                        className="p-1 hover:bg-[var(--color-background-subtle)] rounded transition-colors"
                        title="Modifier la catégorie"
                      >
                        <Edit2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                      </button>
                    </div>
                  </div>

                  {/* Category Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)]">Actifs</p>
                      <p className="font-semibold text-[var(--color-text-primary)]">{category.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)]">Valeur</p>
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        €{(category.value / 1000000).toFixed(2)}M
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)]">Taux amort.</p>
                      <p className="font-semibold text-[var(--color-text-primary)]">{category.depreciationRate}</p>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {isExpanded && category.children && (
                    <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                      {category.children.map((child) => (
                        <div
                          key={child.id}
                          onClick={() => alert(`Voir détails: ${child.name}`)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-background-subtle)] transition-colors cursor-pointer"
                          title="Cliquer pour voir les détails"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-4 rounded-full ${colors.bg}`} />
                            <div>
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                {child.name}
                              </p>
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                {child.code} • {child.count} actifs
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              €{(child.value / 1000).toFixed(0)}K
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">
                              {child.depreciationRate}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardBody>
            </ModernCard>
          );
        })}
      </div>

      {/* Configuration Section */}
      <ModernCard>
        <CardHeader>
          <h3 className="text-lg font-semibold">Configuration des catégories</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Méthode de classification par défaut
              </label>
              <select className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm">
                <option>Par nature d'actif</option>
                <option>Par département</option>
                <option>Par localisation</option>
                <option>Personnalisée</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Hiérarchie maximale
              </label>
              <select className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm">
                <option>2 niveaux</option>
                <option>3 niveaux</option>
                <option>4 niveaux</option>
                <option>Illimitée</option>
              </select>
            </div>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );
};

export default AssetsCategories;