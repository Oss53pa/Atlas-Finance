import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Building,
  Truck,
  Mail,
  Phone,
  MapPin,
  Globe,
  Package,
  FileText,
  Briefcase,
  Star,
  AlertCircle
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
import { formatCurrency } from '../../../lib/utils';

interface SupplierFormData {
  code_fournisseur: string;
  denomination: string;
  type_fournisseur: 'entreprise' | 'particulier';
  forme_juridique?: string;
  categorie: 'fourniture_bureau' | 'informatique' | 'transport' | 'maintenance' | 'services' | 'matiere_premiere';
  statut: 'actif' | 'inactif' | 'bloque' | 'en_evaluation';
  evaluation?: number;

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

  delai_paiement?: number;
  conditions_paiement?: string;
  plafond_commande?: number;
  notes?: string;
}

const initialFormData: SupplierFormData = {
  code_fournisseur: '',
  denomination: '',
  type_fournisseur: 'entreprise',
  categorie: 'services',
  statut: 'en_evaluation',
  telephone: '',
  email: '',
  adresse: '',
  ville: '',
  pays: 'Cameroun',
  delai_paiement: 30
};

interface CreateSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateSupplierModal: React.FC<CreateSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'legal' | 'commercial'>('general');

  const createSupplier = useCreateThirdParty();

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

    if (!formData.code_fournisseur.trim()) {
      newErrors.code_fournisseur = 'Le code fournisseur est requis';
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

    if (formData.evaluation && (formData.evaluation < 1 || formData.evaluation > 5)) {
      newErrors.evaluation = 'L\'évaluation doit être entre 1 et 5';
    }

    if (formData.plafond_commande && formData.plafond_commande < 0) {
      newErrors.plafond_commande = 'Le plafond doit être positif';
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
      await createSupplier.mutateAsync({
        ...formData,
        type_tiers: 'fournisseur'
      });

      toast.success('Fournisseur créé avec succès');
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error('Erreur création fournisseur:', error);
      toast.error((error instanceof Error ? error.message : null) || 'Erreur lors de la création du fournisseur');
    }
  };

  const handleInputChange = (field: keyof SupplierFormData, value: SupplierFormData[keyof SupplierFormData]) => {
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
            <Truck className="mr-3 h-6 w-6" />
            Nouveau Fournisseur
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
                    Code Fournisseur <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.code_fournisseur}
                    onChange={(e) => handleInputChange('code_fournisseur', e.target.value)}
                    placeholder="Ex: FOU001"
                    error={errors.code_fournisseur}
                  />
                  {errors.code_fournisseur && (
                    <p className="mt-1 text-sm text-red-600">{errors.code_fournisseur}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.type_fournisseur}
                    onValueChange={(value: string) => handleInputChange('type_fournisseur', value as SupplierFormData['type_fournisseur'])}
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
                  placeholder="Ex: SARL Equipements Pro"
                  error={errors.denomination}
                />
                {errors.denomination && (
                  <p className="mt-1 text-sm text-red-600">{errors.denomination}</p>
                )}
              </div>

              {formData.type_fournisseur === 'entreprise' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forme Juridique
                  </label>
                  <Input
                    value={formData.forme_juridique || ''}
                    onChange={(e) => handleInputChange('forme_juridique', e.target.value)}
                    placeholder="Ex: SARL, SA, SAS, EURL..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.categorie}
                    onValueChange={(value: string) => handleInputChange('categorie', value as SupplierFormData['categorie'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fourniture_bureau">Fourniture de bureau</SelectItem>
                      <SelectItem value="informatique">Informatique</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="matiere_premiere">Matière première</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value: string) => handleInputChange('statut', value as SupplierFormData['statut'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_evaluation">En évaluation</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="bloque">Bloqué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Évaluation (1-5 étoiles)
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleInputChange('evaluation', rating)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          formData.evaluation && rating <= formData.evaluation
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  {formData.evaluation && (
                    <button
                      type="button"
                      onClick={() => handleInputChange('evaluation', undefined)}
                      className="ml-4 text-sm text-gray-700 hover:text-gray-700"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
                {errors.evaluation && (
                  <p className="mt-1 text-sm text-red-600">{errors.evaluation}</p>
                )}
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
                    placeholder="Ex: Directeur Commercial"
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
                    placeholder="contact@fournisseur.com"
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
                  placeholder="https://www.fournisseur.com"
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
                    Plafond de Commande (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={formData.plafond_commande || ''}
                    onChange={(e) => handleInputChange('plafond_commande', parseFloat(e.target.value))}
                    placeholder="0"
                    error={errors.plafond_commande}
                  />
                  {errors.plafond_commande && (
                    <p className="mt-1 text-sm text-red-600">{errors.plafond_commande}</p>
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
                  Conditions de Paiement
                </label>
                <Input
                  value={formData.conditions_paiement || ''}
                  onChange={(e) => handleInputChange('conditions_paiement', e.target.value)}
                  placeholder="Ex: 30% à la commande, 70% à livraison"
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
            disabled={createSupplier.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createSupplier.isPending}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
          >
            {createSupplier.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Créer le Fournisseur
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface SupplierRecord extends SupplierFormData {
  id: string;
  achats_annuels?: number;
  solde_compte?: number;
}

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierRecord | null;
  onSuccess?: () => void;
}

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess
}) => {
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'legal' | 'commercial'>('general');

  const updateSupplier = useUpdateThirdParty();

  useEffect(() => {
    if (isOpen && supplier) {
      setFormData({
        code_fournisseur: supplier.code_fournisseur || '',
        denomination: supplier.denomination || '',
        type_fournisseur: supplier.type_fournisseur || 'entreprise',
        forme_juridique: supplier.forme_juridique || '',
        categorie: supplier.categorie || 'services',
        statut: supplier.statut || 'actif',
        evaluation: supplier.evaluation || undefined,
        contact_principal: supplier.contact_principal || '',
        fonction_contact: supplier.fonction_contact || '',
        telephone: supplier.telephone || '',
        email: supplier.email || '',
        site_web: supplier.site_web || '',
        adresse: supplier.adresse || '',
        code_postal: supplier.code_postal || '',
        ville: supplier.ville || '',
        pays: supplier.pays || 'Cameroun',
        region: supplier.region || '',
        numero_siret: supplier.numero_siret || '',
        numero_tva: supplier.numero_tva || '',
        numero_rccm: supplier.numero_rccm || '',
        plafond_commande: supplier.plafond_commande || undefined,
        delai_paiement: supplier.delai_paiement || 30,
        conditions_paiement: supplier.conditions_paiement || '',
        notes: supplier.notes || '',
      });
      setErrors({});
      setActiveTab('general');
    }
  }, [isOpen, supplier]);

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
      if (!supplier) return;
      await updateSupplier.mutateAsync({
        id: supplier.id,
        data: formData
      });

      toast.success('Fournisseur modifié avec succès');
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error('Erreur modification fournisseur:', error);
      toast.error((error instanceof Error ? error.message : null) || 'Erreur lors de la modification du fournisseur');
    }
  };

  const handleInputChange = (field: keyof SupplierFormData, value: SupplierFormData[keyof SupplierFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <Truck className="mr-3 h-6 w-6" />
            Modifier le Fournisseur - {supplier.code_fournisseur}
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
                    Code Fournisseur
                  </label>
                  <Input
                    value={formData.code_fournisseur}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <Select
                    value={formData.type_fournisseur}
                    onValueChange={(value: string) => handleInputChange('type_fournisseur', value as SupplierFormData['type_fournisseur'])}
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

              {formData.type_fournisseur === 'entreprise' && (
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
                    Catégorie
                  </label>
                  <Select
                    value={formData.categorie}
                    onValueChange={(value: string) => handleInputChange('categorie', value as SupplierFormData['categorie'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fourniture_bureau">Fourniture de bureau</SelectItem>
                      <SelectItem value="informatique">Informatique</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="matiere_premiere">Matière première</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut
                  </label>
                  <Select
                    value={formData.statut}
                    onValueChange={(value: string) => handleInputChange('statut', value as SupplierFormData['statut'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_evaluation">En évaluation</SelectItem>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                      <SelectItem value="bloque">Bloqué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Évaluation (1-5 étoiles)
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleInputChange('evaluation', rating)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          formData.evaluation && rating <= formData.evaluation
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  {formData.evaluation && (
                    <button
                      type="button"
                      onClick={() => handleInputChange('evaluation', undefined)}
                      className="ml-4 text-sm text-gray-700 hover:text-gray-700"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateSupplier.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={updateSupplier.isPending}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
          >
            {updateSupplier.isPending ? (
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

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierRecord | null;
  onEdit?: () => void;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onEdit
}) => {
  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <Truck className="mr-3 h-6 w-6" />
            Détails du Fournisseur
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
                  supplier.statut === 'actif' ? 'bg-green-100 text-green-800' :
                  supplier.statut === 'en_evaluation' ? 'bg-yellow-100 text-yellow-800' :
                  supplier.statut === 'bloque' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {supplier.statut}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Code Fournisseur</p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">{supplier.code_fournisseur}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Type</p>
                  <p className="text-lg">{supplier.type_fournisseur === 'entreprise' ? 'Entreprise' : 'Particulier'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Dénomination</p>
                <p className="text-lg font-semibold">{supplier.denomination}</p>
              </div>

              {supplier.forme_juridique && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Forme Juridique</p>
                  <p className="text-lg">{supplier.forme_juridique}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Catégorie</p>
                  <Badge className="mt-1">
                    {supplier.categorie === 'fourniture_bureau' && 'Fournitures'}
                    {supplier.categorie === 'informatique' && 'Informatique'}
                    {supplier.categorie === 'transport' && 'Transport'}
                    {supplier.categorie === 'maintenance' && 'Maintenance'}
                    {supplier.categorie === 'services' && 'Services'}
                    {supplier.categorie === 'matiere_premiere' && 'Mat. Première'}
                  </Badge>
                </div>
                {supplier.evaluation && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Évaluation</p>
                    <div className="mt-1">{renderRating(supplier.evaluation)}</div>
                  </div>
                )}
              </div>

              {supplier.achats_annuels !== undefined && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Achats Annuels</p>
                  <p className="text-lg font-semibold text-blue-700">
                    {formatCurrency(supplier.achats_annuels)}
                  </p>
                </div>
              )}
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
              {supplier.contact_principal && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Contact Principal</p>
                  <p className="text-lg">{supplier.contact_principal}</p>
                  {supplier.fonction_contact && (
                    <p className="text-sm text-gray-600">{supplier.fonction_contact}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Téléphone</p>
                    <p className="text-lg">{supplier.telephone}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-lg">{supplier.email}</p>
                  </div>
                </div>
              </div>

              {supplier.site_web && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Site Web</p>
                    <a href={supplier.site_web} target="_blank" rel="noopener noreferrer"
                       className="text-lg text-blue-600 hover:underline">
                      {supplier.site_web}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-gray-700 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Adresse</p>
                  <p className="text-lg">{supplier.adresse}</p>
                  <p className="text-sm text-gray-600">
                    {supplier.code_postal && `${supplier.code_postal}, `}
                    {supplier.ville}, {supplier.pays}
                  </p>
                  {supplier.region && (
                    <p className="text-sm text-gray-600">{supplier.region}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {(supplier.numero_siret || supplier.numero_tva || supplier.numero_rccm) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Informations Légales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.numero_siret && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">SIRET / RC</p>
                    <p className="text-lg font-mono">{supplier.numero_siret}</p>
                  </div>
                )}
                {supplier.numero_tva && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Numéro TVA</p>
                    <p className="text-lg font-mono">{supplier.numero_tva}</p>
                  </div>
                )}
                {supplier.numero_rccm && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">RCCM</p>
                    <p className="text-lg font-mono">{supplier.numero_rccm}</p>
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
                {supplier.plafond_commande && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Plafond Commande</p>
                    <p className="text-lg font-semibold">{formatCurrency(supplier.plafond_commande)}</p>
                  </div>
                )}
                {supplier.delai_paiement && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Délai Paiement</p>
                    <p className="text-lg font-semibold">{supplier.delai_paiement} jours</p>
                  </div>
                )}
                {supplier.solde_compte !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Solde Actuel</p>
                    <p className={`text-lg font-semibold ${
                      supplier.solde_compte <= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(Math.abs(supplier.solde_compte))}
                      {supplier.solde_compte <= 0 ? ' C' : ' D'}
                    </p>
                  </div>
                )}
              </div>

              {supplier.conditions_paiement && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Conditions de Paiement</p>
                  <p className="text-lg">{supplier.conditions_paiement}</p>
                </div>
              )}

              {supplier.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Notes Internes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{supplier.notes}</p>
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
              <Truck className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};