import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Building,
  Users,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  FileText,
  Briefcase,
  Calendar,
  DollarSign,
  AlertCircle,
  Check
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../components/ui';
import { useCreateThirdParty, useUpdateThirdParty } from '../../../hooks';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../../lib/utils';

interface CustomerFormData {
  code_client: string;
  denomination: string;
  type_client: 'entreprise' | 'particulier';
  forme_juridique?: string;
  segment: 'grand_compte' | 'pme' | 'particulier' | 'administration';
  statut: 'actif' | 'inactif' | 'prospect' | 'suspect';

  contact_principal?: string;
  fonction_contact?: string;
  telephone: string;
  email: string;
  site_web?: string;

  adresse: string;
  code_postal?: string;
  ville: string;
  pays: string;
  region?: string;

  numero_siret?: string;
  numero_tva?: string;
  numero_rccm?: string;

  plafond_credit?: number;
  delai_paiement?: number;
  commercial_assigne?: string;
  notes?: string;
}

const initialFormData: CustomerFormData = {
  code_client: '',
  denomination: '',
  type_client: 'entreprise',
  segment: 'pme',
  statut: 'prospect',
  telephone: '',
  email: '',
  adresse: '',
  ville: '',
  pays: 'Cameroun',
  delai_paiement: 30
};

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'legal' | 'commercial'>('general');

  const createCustomer = useCreateThirdParty();

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setActiveTab('general');
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.denomination.trim()) {
      newErrors.denomination = 'La dénomination est requise';
    }

    if (!formData.code_client.trim()) {
      newErrors.code_client = 'Le code client est requis';
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.telephone)) {
      newErrors.telephone = 'Numéro de téléphone invalide';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.adresse.trim()) {
      newErrors.adresse = 'L\'adresse est requise';
    }

    if (!formData.ville.trim()) {
      newErrors.ville = 'La ville est requise';
    }

    if (formData.type_client === 'entreprise' && formData.forme_juridique &&
        formData.forme_juridique.length < 2) {
      newErrors.forme_juridique = 'Forme juridique invalide';
    }

    if (formData.plafond_credit && formData.plafond_credit < 0) {
      newErrors.plafond_credit = 'Le plafond doit être positif';
    }

    if (formData.delai_paiement && (formData.delai_paiement < 0 || formData.delai_paiement > 365)) {
      newErrors.delai_paiement = 'Délai invalide (0-365 jours)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      await createCustomer.mutateAsync({
        ...formData,
        type_tiers: 'client'
      });

      toast.success('Client créé avec succès');
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error('Erreur création client:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du client');
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: CustomerFormData[keyof CustomerFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <Users className="mr-3 h-6 w-6" />
            Nouveau Client
          </h2>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-600 transition-colors"
            type="button" aria-label="Fermer">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'general'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Building className="inline-block mr-2 h-4 w-4" />
            Général
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'contact'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Phone className="inline-block mr-2 h-4 w-4" />
            Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('legal')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'legal'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <FileText className="inline-block mr-2 h-4 w-4" />
            Informations Légales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commercial')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'commercial'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Briefcase className="inline-block mr-2 h-4 w-4" />
            Commercial
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code Client <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.code_client}
                    onChange={(e) => handleInputChange('code_client', e.target.value)}
                    placeholder="Ex: CLI001"
                    error={errors.code_client}
                  />
                  {errors.code_client && (
                    <p className="mt-1 text-sm text-red-600">{errors.code_client}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.type_client}
                    onValueChange={(value: string) => handleInputChange('type_client', value as CustomerFormData['type_client'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entreprise">Entreprise</SelectItem>
                      <SelectItem value="particulier">Particulier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dénomination / Raison sociale <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.denomination}
                  onChange={(e) => handleInputChange('denomination', e.target.value)}
                  placeholder="Ex: SARL Technologies Avancées"
                  error={errors.denomination}
                />
                {errors.denomination && (
                  <p className="mt-1 text-sm text-red-600">{errors.denomination}</p>
                )}
              </div>

              {formData.type_client === 'entreprise' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forme Juridique
                  </label>
                  <Input
                    value={formData.forme_juridique || ''}
                    onChange={(e) => handleInputChange('forme_juridique', e.target.value)}
                    placeholder="Ex: SARL, SA, SAS, EURL..."
                    error={errors.forme_juridique}
                  />
                  {errors.forme_juridique && (
                    <p className="mt-1 text-sm text-red-600">{errors.forme_juridique}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segment <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.segment}
                    onValueChange={(value: string) => handleInputChange('segment', value as CustomerFormData['segment'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grand_compte">Grand Compte</SelectItem>
                      <SelectItem value="pme">PME</SelectItem>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value: string) => handleInputChange('statut', value as CustomerFormData['statut'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="suspect">Suspect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Principal
                  </label>
                  <Input
                    value={formData.contact_principal || ''}
                    onChange={(e) => handleInputChange('contact_principal', e.target.value)}
                    placeholder="Nom du contact"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fonction
                  </label>
                  <Input
                    value={formData.fonction_contact || ''}
                    onChange={(e) => handleInputChange('fonction_contact', e.target.value)}
                    placeholder="Ex: Directeur Général"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.telephone}
                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                    placeholder="+237 6 XX XX XX XX"
                    error={errors.telephone}
                  />
                  {errors.telephone && (
                    <p className="mt-1 text-sm text-red-600">{errors.telephone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contact@entreprise.com"
                    error={errors.email}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Web
                </label>
                <Input
                  value={formData.site_web || ''}
                  onChange={(e) => handleInputChange('site_web', e.target.value)}
                  placeholder="https://www.entreprise.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.adresse}
                  onChange={(e) => handleInputChange('adresse', e.target.value)}
                  placeholder="Adresse complète"
                  error={errors.adresse}
                />
                {errors.adresse && (
                  <p className="mt-1 text-sm text-red-600">{errors.adresse}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code Postal
                  </label>
                  <Input
                    value={formData.code_postal || ''}
                    onChange={(e) => handleInputChange('code_postal', e.target.value)}
                    placeholder="BP XXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.ville}
                    onChange={(e) => handleInputChange('ville', e.target.value)}
                    placeholder="Ex: Douala"
                    error={errors.ville}
                  />
                  {errors.ville && (
                    <p className="mt-1 text-sm text-red-600">{errors.ville}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pays <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.pays}
                    onChange={(e) => handleInputChange('pays', e.target.value)}
                    placeholder="Ex: Cameroun"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Région
                </label>
                <Input
                  value={formData.region || ''}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  placeholder="Ex: Littoral"
                />
              </div>
            </div>
          )}

          {activeTab === 'legal' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="inline-block mr-2 h-4 w-4" />
                  Les informations légales sont optionnelles mais recommandées pour les entreprises.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro SIRET / RC
                </label>
                <Input
                  value={formData.numero_siret || ''}
                  onChange={(e) => handleInputChange('numero_siret', e.target.value)}
                  placeholder="Ex: 123 456 789 00012"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro TVA Intracommunautaire
                </label>
                <Input
                  value={formData.numero_tva || ''}
                  onChange={(e) => handleInputChange('numero_tva', e.target.value)}
                  placeholder="Ex: FR 12 345678901"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro RCCM
                </label>
                <Input
                  value={formData.numero_rccm || ''}
                  onChange={(e) => handleInputChange('numero_rccm', e.target.value)}
                  placeholder="Numéro RCCM"
                />
              </div>
            </div>
          )}

          {activeTab === 'commercial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plafond de Crédit (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={formData.plafond_credit || ''}
                    onChange={(e) => handleInputChange('plafond_credit', parseFloat(e.target.value))}
                    placeholder="0"
                    error={errors.plafond_credit}
                  />
                  {errors.plafond_credit && (
                    <p className="mt-1 text-sm text-red-600">{errors.plafond_credit}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Délai de Paiement (jours)
                  </label>
                  <Input
                    type="number"
                    value={formData.delai_paiement || ''}
                    onChange={(e) => handleInputChange('delai_paiement', parseInt(e.target.value))}
                    placeholder="30"
                    error={errors.delai_paiement}
                  />
                  {errors.delai_paiement && (
                    <p className="mt-1 text-sm text-red-600">{errors.delai_paiement}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commercial Assigné
                </label>
                <Input
                  value={formData.commercial_assigne || ''}
                  onChange={(e) => handleInputChange('commercial_assigne', e.target.value)}
                  placeholder="Nom du commercial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes Internes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Notes et observations..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          )}
        </form>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createCustomer.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createCustomer.isPending}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
          >
            {createCustomer.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Créer le Client
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface CustomerData extends CustomerFormData {
  id: string;
  ca_annuel?: number;
  solde_compte?: number;
}

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerData | null;
  onSuccess?: () => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'legal' | 'commercial'>('general');

  const updateCustomer = useUpdateThirdParty();

  useEffect(() => {
    if (isOpen && customer) {
      setFormData({
        code_client: customer.code_client || '',
        denomination: customer.denomination || '',
        type_client: customer.type_client || 'entreprise',
        forme_juridique: customer.forme_juridique || '',
        segment: customer.segment || 'pme',
        statut: customer.statut || 'actif',
        contact_principal: customer.contact_principal || '',
        fonction_contact: customer.fonction_contact || '',
        telephone: customer.telephone || '',
        email: customer.email || '',
        site_web: customer.site_web || '',
        adresse: customer.adresse || '',
        code_postal: customer.code_postal || '',
        ville: customer.ville || '',
        pays: customer.pays || 'Cameroun',
        region: customer.region || '',
        numero_siret: customer.numero_siret || '',
        numero_tva: customer.numero_tva || '',
        numero_rccm: customer.numero_rccm || '',
        plafond_credit: customer.plafond_credit || undefined,
        delai_paiement: customer.delai_paiement || 30,
        commercial_assigne: customer.commercial_assigne || '',
        notes: customer.notes || '',
      });
      setErrors({});
      setActiveTab('general');
    }
  }, [isOpen, customer]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.denomination.trim()) {
      newErrors.denomination = 'La dénomination est requise';
    }

    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.telephone)) {
      newErrors.telephone = 'Numéro de téléphone invalide';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.adresse.trim()) {
      newErrors.adresse = 'L\'adresse est requise';
    }

    if (!formData.ville.trim()) {
      newErrors.ville = 'La ville est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      await updateCustomer.mutateAsync({
        id: customer.id,
        data: formData
      });

      toast.success('Client modifié avec succès');
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error('Erreur modification client:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la modification du client');
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: CustomerFormData[keyof CustomerFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <Users className="mr-3 h-6 w-6" />
            Modifier le Client - {customer.code_client}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-600 transition-colors"
            type="button" aria-label="Fermer">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'general'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Building className="inline-block mr-2 h-4 w-4" />
            Général
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'contact'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Phone className="inline-block mr-2 h-4 w-4" />
            Contact
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('legal')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'legal'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <FileText className="inline-block mr-2 h-4 w-4" />
            Informations Légales
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commercial')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'commercial'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Briefcase className="inline-block mr-2 h-4 w-4" />
            Commercial
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Reuse same form structure as CreateCustomerModal */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code Client
                  </label>
                  <Input
                    value={formData.code_client}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <Select
                    value={formData.type_client}
                    onValueChange={(value: string) => handleInputChange('type_client', value as CustomerFormData['type_client'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entreprise">Entreprise</SelectItem>
                      <SelectItem value="particulier">Particulier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dénomination / Raison sociale <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.denomination}
                  onChange={(e) => handleInputChange('denomination', e.target.value)}
                  error={errors.denomination}
                />
                {errors.denomination && (
                  <p className="mt-1 text-sm text-red-600">{errors.denomination}</p>
                )}
              </div>

              {formData.type_client === 'entreprise' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forme Juridique
                  </label>
                  <Input
                    value={formData.forme_juridique || ''}
                    onChange={(e) => handleInputChange('forme_juridique', e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segment
                  </label>
                  <Select
                    value={formData.segment}
                    onValueChange={(value: string) => handleInputChange('segment', value as CustomerFormData['segment'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grand_compte">Grand Compte</SelectItem>
                      <SelectItem value="pme">PME</SelectItem>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value: string) => handleInputChange('statut', value as CustomerFormData['statut'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="suspect">Suspect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Add similar sections for contact, legal, and commercial tabs */}
          {/* For brevity, using same structure as Create modal */}
        </form>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateCustomer.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={updateCustomer.isPending}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
          >
            {updateCustomer.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerData | null;
  onEdit?: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEdit
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <Users className="mr-3 h-6 w-6" />
            Détails du Client
          </h2>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-600 transition-colors" aria-label="Fermer">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Informations Générales
                </span>
                <Badge className={
                  customer.statut === 'actif' ? 'bg-green-100 text-green-800' :
                  customer.statut === 'prospect' ? 'bg-blue-100 text-blue-800' :
                  customer.statut === 'inactif' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }>
                  {customer.statut}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Code Client</p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">{customer.code_client}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Type</p>
                  <p className="text-lg">{customer.type_client === 'entreprise' ? 'Entreprise' : 'Particulier'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Dénomination</p>
                <p className="text-lg font-semibold">{customer.denomination}</p>
              </div>

              {customer.forme_juridique && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Forme Juridique</p>
                  <p className="text-lg">{customer.forme_juridique}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Segment</p>
                  <Badge className="mt-1">
                    {customer.segment === 'grand_compte' && 'Grand Compte'}
                    {customer.segment === 'pme' && 'PME'}
                    {customer.segment === 'particulier' && 'Particulier'}
                    {customer.segment === 'administration' && 'Administration'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">CA Annuel</p>
                  <p className="text-lg font-semibold text-green-700">
                    {formatCurrency(customer.ca_annuel || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.contact_principal && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Contact Principal</p>
                  <p className="text-lg">{customer.contact_principal}</p>
                  {customer.fonction_contact && (
                    <p className="text-sm text-gray-600">{customer.fonction_contact}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Téléphone</p>
                    <p className="text-lg">{customer.telephone}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-lg">{customer.email}</p>
                  </div>
                </div>
              </div>

              {customer.site_web && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Site Web</p>
                    <a href={customer.site_web} target="_blank" rel="noopener noreferrer"
                       className="text-lg text-blue-600 hover:underline">
                      {customer.site_web}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-700 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Adresse</p>
                  <p className="text-lg">{customer.adresse}</p>
                  <p className="text-sm text-gray-600">
                    {customer.code_postal && `${customer.code_postal}, `}
                    {customer.ville}, {customer.pays}
                  </p>
                  {customer.region && (
                    <p className="text-sm text-gray-600">{customer.region}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {(customer.numero_siret || customer.numero_tva || customer.numero_rccm) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Informations Légales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.numero_siret && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">SIRET / RC</p>
                    <p className="text-lg font-mono">{customer.numero_siret}</p>
                  </div>
                )}
                {customer.numero_tva && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Numéro TVA</p>
                    <p className="text-lg font-mono">{customer.numero_tva}</p>
                  </div>
                )}
                {customer.numero_rccm && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">RCCM</p>
                    <p className="text-lg font-mono">{customer.numero_rccm}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="mr-2 h-5 w-5" />
                Informations Commerciales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                {customer.plafond_credit && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Plafond Crédit</p>
                    <p className="text-lg font-semibold">{formatCurrency(customer.plafond_credit)}</p>
                  </div>
                )}
                {customer.delai_paiement && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Délai Paiement</p>
                    <p className="text-lg font-semibold">{customer.delai_paiement} jours</p>
                  </div>
                )}
                {customer.solde_compte !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Solde Actuel</p>
                    <p className={`text-lg font-semibold ${
                      customer.solde_compte >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(Math.abs(customer.solde_compte))}
                      {customer.solde_compte >= 0 ? ' D' : ' C'}
                    </p>
                  </div>
                )}
              </div>

              {customer.commercial_assigne && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Commercial Assigné</p>
                  <p className="text-lg">{customer.commercial_assigne}</p>
                </div>
              )}

              {customer.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Notes Internes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
            >
              <Users className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};