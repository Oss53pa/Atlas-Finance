import React, { useState, useEffect } from 'react';
import {
  X, Building2, MapPin, Calendar, Euro, FileText, User, Clock,
  CheckCircle, AlertCircle, Calculator, Tag, Briefcase, Hash
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../ui/ModernCard';
import ModernButton from '../ui/ModernButton';
import SearchableDropdown from '../ui/SearchableDropdown';

interface CapitalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: {
    id: string;
    amount: number;
    supplier: string;
    description: string;
    account: string;
    date: string;
  };
  onSubmit: (data: CapitalizationRequest) => void;
}

interface CapitalizationRequest {
  referenceNumber: string;
  requestDate: string;
  department: string;
  requesterName: string;

  assetNature: string;
  assetDescription: string;
  physicalLocation: string;
  estimatedUsefulLife: number;
  assetCategory: string;
  acquisitionDate: string;
  serviceDate: string;

  acquisitionCost: number;
  installationCosts: number;
  otherCapitalizableCosts: number;
  totalCapitalizableCost: number;
  depreciationMethod: string;
  depreciationRate: number;

  justification: string;
  criteriaRespected: string[];
  financialImpact: string;

  approvals: {
    departmentHead: boolean;
    financialController: boolean;
    management: boolean;
  };
}

const CapitalizationModal: React.FC<CapitalizationModalProps> = ({
  isOpen,
  onClose,
  invoiceData,
  onSubmit
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CapitalizationRequest>({
    referenceNumber: `CAP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    requestDate: new Date().toISOString().split('T')[0],
    department: '',
    requesterName: '',

    assetNature: '',
    assetDescription: invoiceData.description || '',
    physicalLocation: '',
    estimatedUsefulLife: 5,
    assetCategory: '',
    acquisitionDate: invoiceData.date || new Date().toISOString().split('T')[0],
    serviceDate: new Date().toISOString().split('T')[0],

    acquisitionCost: invoiceData.amount || 0,
    installationCosts: 0,
    otherCapitalizableCosts: 0,
    totalCapitalizableCost: invoiceData.amount || 0,
    depreciationMethod: 'lineaire',
    depreciationRate: 20,

    justification: '',
    criteriaRespected: [],
    financialImpact: '',

    approvals: {
      departmentHead: false,
      financialController: false,
      management: false
    }
  });

  const assetNatures = [
    'Équipement informatique',
    'Mobilier et agencement',
    'Matériel technique',
    'Véhicules',
    'Installations techniques',
    'Logiciels et licences',
    'Améliorations locatives',
    'Matériel de sécurité',
    'Équipements de manutention'
  ];

  const assetCategories = [
    { code: '213-LA', label: 'Logiciels et applications' },
    { code: '212-DL', label: 'Droits et licences' },
    { code: '232-IT', label: 'Installations techniques' },
    { code: '234-AGT', label: 'Agencements' },
    { code: '234-SS', label: 'Sécurité et sûreté' },
    { code: '241-MT', label: 'Matériel technique' },
    { code: '245-VHL', label: 'Véhicules' },
    { code: '244-MOB', label: 'Mobilier' },
    { code: '244-EM', label: 'Équipements de manutention' }
  ];

  const depreciationMethods = [
    { value: 'lineaire', label: 'Linéaire' },
    { value: 'degressive', label: 'Dégressive' },
    { value: 'unite', label: 'Par unité d\'œuvre' }
  ];

  const capitalizationCriteria = [
    'Seuil monétaire respecté (> 500€)',
    'Durée de vie > 1 an',
    'Contrôle de l\'actif par l\'entité',
    'Avantages économiques futurs',
    'Coût mesurable de façon fiable'
  ];

  useEffect(() => {
    const total = formData.acquisitionCost + formData.installationCosts + formData.otherCapitalizableCosts;
    setFormData(prev => ({ ...prev, totalCapitalizableCost: total }));
  }, [formData.acquisitionCost, formData.installationCosts, formData.otherCapitalizableCosts]);

  useEffect(() => {
    if (formData.estimatedUsefulLife > 0) {
      const rate = Math.round((100 / formData.estimatedUsefulLife) * 100) / 100;
      setFormData(prev => ({ ...prev, depreciationRate: rate }));
    }
  }, [formData.estimatedUsefulLife]);

  const handleInputChange = (field: keyof CapitalizationRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section as keyof CapitalizationRequest], [field]: value }
    }));
  };

  const handleCriteriaChange = (criterion: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      criteriaRespected: checked
        ? [...prev.criteriaRespected, criterion]
        : prev.criteriaRespected.filter(c => c !== criterion)
    }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Demande de Capitalisation
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Facture: {invoiceData.supplier} - €{invoiceData.amount.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-hover)] rounded-lg transition-colors" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Informations générales' },
              { num: 2, label: 'Description de l\'actif' },
              { num: 3, label: 'Informations financières' },
              { num: 4, label: 'Justification & Validation' }
            ].map(({ num, label }) => (
              <div key={num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= num
                    ? 'bg-blue-500 text-white'
                    : 'bg-[var(--color-hover)] text-[var(--color-text-secondary)]'
                }`}>
                  {step > num ? <CheckCircle className="w-4 h-4" /> : num}
                </div>
                <span className="ml-2 text-sm font-medium text-[var(--color-text-primary)]">
                  {label}
                </span>
                {num < 4 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    step > num ? 'bg-blue-500' : 'bg-[var(--color-border)]'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Informations générales */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Numéro de référence
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date de la demande
                  </label>
                  <input
                    type="date"
                    value={formData.requestDate}
                    onChange={(e) => handleInputChange('requestDate', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Département/Service
                  </label>
                  <SearchableDropdown
                    options={[
                      { value: 'IT', label: 'Informatique' },
                      { value: 'FINANCE', label: 'Finance' },
                      { value: 'HR', label: 'Ressources Humaines' },
                      { value: 'OPERATIONS', label: 'Opérations' },
                      { value: 'ADMIN', label: 'Administration' }
                    ]}
                    value={formData.department}
                    onChange={(value) => handleInputChange('department', value)}
                    placeholder="Sélectionner un département"
                    searchPlaceholder="Rechercher un département..."
                    clearable
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Nom du demandeur
                  </label>
                  <input
                    type="text"
                    value={formData.requesterName}
                    onChange={(e) => handleInputChange('requesterName', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Prénom Nom"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Description de l'actif */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Nature de l'actif
                  </label>
                  <SearchableDropdown
                    options={assetNatures.map(nature => ({
                      value: nature,
                      label: nature
                    }))}
                    value={formData.assetNature}
                    onChange={(value) => handleInputChange('assetNature', value)}
                    placeholder="Sélectionner la nature"
                    showSearch={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Catégorie d'actif
                  </label>
                  <SearchableDropdown
                    options={assetCategories.map(cat => ({
                      value: cat.code,
                      label: `${cat.code} - ${cat.label}`
                    }))}
                    value={formData.assetCategory}
                    onChange={(value) => handleInputChange('assetCategory', value)}
                    placeholder="Sélectionner la catégorie"
                    searchPlaceholder="Rechercher une catégorie..."
                    clearable
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Description détaillée
                  </label>
                  <textarea
                    value={formData.assetDescription}
                    onChange={(e) => handleInputChange('assetDescription', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    rows={3}
                    placeholder="Description détaillée de l'actif"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Localisation physique
                  </label>
                  <input
                    type="text"
                    value={formData.physicalLocation}
                    onChange={(e) => handleInputChange('physicalLocation', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Bâtiment, étage, bureau..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Durée de vie utile (années)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedUsefulLife}
                    onChange={(e) => handleInputChange('estimatedUsefulLife', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    min="1"
                    max="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date d'acquisition
                  </label>
                  <input
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={(e) => handleInputChange('acquisitionDate', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date de mise en service
                  </label>
                  <input
                    type="date"
                    value={formData.serviceDate}
                    onChange={(e) => handleInputChange('serviceDate', e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Informations financières */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Euro className="w-4 h-4 inline mr-1" />
                    Coût d'acquisition
                  </label>
                  <input
                    type="number"
                    value={formData.acquisitionCost}
                    onChange={(e) => handleInputChange('acquisitionCost', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Euro className="w-4 h-4 inline mr-1" />
                    Frais d'installation
                  </label>
                  <input
                    type="number"
                    value={formData.installationCosts}
                    onChange={(e) => handleInputChange('installationCosts', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Euro className="w-4 h-4 inline mr-1" />
                    Autres coûts capitalisables
                  </label>
                  <input
                    type="number"
                    value={formData.otherCapitalizableCosts}
                    onChange={(e) => handleInputChange('otherCapitalizableCosts', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Calculator className="w-4 h-4 inline mr-1" />
                    Coût total à capitaliser
                  </label>
                  <input
                    type="number"
                    value={formData.totalCapitalizableCost}
                    className="w-full px-3 py-2 bg-[var(--color-hover)] border border-[var(--color-border)] rounded-lg text-sm font-semibold"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Calculator className="w-4 h-4 inline mr-1" />
                    Méthode d'amortissement
                  </label>
                  <SearchableDropdown
                    options={depreciationMethods}
                    value={formData.depreciationMethod}
                    onChange={(value) => handleInputChange('depreciationMethod', value)}
                    placeholder="Sélectionner une méthode"
                    showSearch={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    <Calculator className="w-4 h-4 inline mr-1" />
                    Taux d'amortissement (%)
                  </label>
                  <input
                    type="number"
                    value={formData.depreciationRate}
                    onChange={(e) => handleInputChange('depreciationRate', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Justification & Validation */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Justification de la capitalisation
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => handleInputChange('justification', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={4}
                  placeholder="Expliquez pourquoi cet achat doit être capitalisé..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Critères de capitalisation respectés
                </label>
                <div className="space-y-2">
                  {capitalizationCriteria.map(criterion => (
                    <label key={criterion} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.criteriaRespected.includes(criterion)}
                        onChange={(e) => handleCriteriaChange(criterion, e.target.checked)}
                        className="mr-2 w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-[var(--color-text-primary)]">{criterion}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Impact sur les états financiers
                </label>
                <textarea
                  value={formData.financialImpact}
                  onChange={(e) => handleInputChange('financialImpact', e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={3}
                  placeholder="Décrivez l'impact attendu sur le bilan et le compte de résultat..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--color-border)]">
          <div className="flex gap-3">
            {step > 1 && (
              <ModernButton variant="outline" onClick={prevStep}>
                Précédent
              </ModernButton>
            )}
          </div>

          <div className="flex gap-3">
            <ModernButton variant="outline" onClick={onClose}>
              Annuler
            </ModernButton>
            {step < 4 ? (
              <ModernButton variant="primary" onClick={nextStep}>
                Suivant
              </ModernButton>
            ) : (
              <ModernButton variant="primary" onClick={handleSubmit}>
                Soumettre la demande
              </ModernButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapitalizationModal;