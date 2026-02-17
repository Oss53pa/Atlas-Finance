import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  Building,
  Briefcase,
  Calendar,
  Linkedin,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { thirdPartyService } from '../../../services/thirdparty.service';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../../lib/utils';

interface ContactFormData {
  civilite: 'M.' | 'Mme' | 'Mlle' | 'Dr' | 'Pr' | 'Me';
  prenom: string;
  nom: string;
  fonction: string;
  entreprise_id?: string;
  type_tiers: 'client' | 'fournisseur' | 'prospect' | 'partenaire';

  telephone_fixe: string;
  telephone_mobile?: string;
  email: string;
  email_secondaire?: string;

  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;

  date_naissance?: string;
  linkedin?: string;
  notes?: string;
}

const initialFormData: ContactFormData = {
  civilite: 'M.',
  prenom: '',
  nom: '',
  fonction: '',
  type_tiers: 'client',
  telephone_fixe: '',
  email: '',
  pays: 'Cameroun'
};

const fonctionsList = [
  'Directeur Général',
  'Directeur Financier',
  'Directeur Commercial',
  'Directeur des Achats',
  'Directeur Technique',
  'Responsable Comptabilité',
  'Chef Comptable',
  'Comptable',
  'Responsable Achats',
  'Acheteur',
  'Commercial',
  'Assistant(e)',
  'Secrétaire',
  'Autre'
];

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateContactModal: React.FC<CreateContactModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'coordonnees' | 'professionnel'>('general');

  const queryClient = useQueryClient();

  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'list'],
    queryFn: () => thirdPartyService.getCompanies({ page: 1, limit: 1000 }),
    enabled: isOpen
  });

  const createContact = useMutation({
    mutationFn: thirdPartyService.createContact,
    onSuccess: () => {
      toast.success('Contact créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Erreur création contact:', error);
      toast.error(error?.message || 'Erreur lors de la création du contact');
    }
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setActiveTab('general');
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }

    if (!formData.telephone_fixe.trim()) {
      newErrors.telephone_fixe = 'Le téléphone est requis';
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.telephone_fixe)) {
      newErrors.telephone_fixe = 'Numéro de téléphone invalide';
    }

    if (formData.telephone_mobile && !/^[\d\s\+\-\(\)]+$/.test(formData.telephone_mobile)) {
      newErrors.telephone_mobile = 'Numéro de mobile invalide';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.email_secondaire && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_secondaire)) {
      newErrors.email_secondaire = 'Email secondaire invalide';
    }

    if (formData.linkedin && !formData.linkedin.includes('linkedin.com')) {
      newErrors.linkedin = 'URL LinkedIn invalide';
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

    createContact.mutate(formData);
  };

  const handleInputChange = (field: keyof ContactFormData, value: any) => {
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
            <User className="mr-3 h-6 w-6" />
            Nouveau Contact
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
            <User className="inline-block mr-2 h-4 w-4" />
            Général
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coordonnees')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'coordonnees'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Phone className="inline-block mr-2 h-4 w-4" />
            Coordonnées
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('professionnel')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'professionnel'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Briefcase className="inline-block mr-2 h-4 w-4" />
            Professionnel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Civilité <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.civilite}
                    onValueChange={(value: any) => handleInputChange('civilite', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M.">M.</SelectItem>
                      <SelectItem value="Mme">Mme</SelectItem>
                      <SelectItem value="Mlle">Mlle</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                      <SelectItem value="Pr">Pr</SelectItem>
                      <SelectItem value="Me">Me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.prenom}
                    onChange={(e) => handleInputChange('prenom', e.target.value)}
                    placeholder="Jean"
                    error={errors.prenom}
                  />
                  {errors.prenom && (
                    <p className="mt-1 text-sm text-red-600">{errors.prenom}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    placeholder="Dupont"
                    error={errors.nom}
                  />
                  {errors.nom && (
                    <p className="mt-1 text-sm text-red-600">{errors.nom}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fonction
                </label>
                <Select
                  value={formData.fonction}
                  onValueChange={(value) => handleInputChange('fonction', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une fonction" />
                  </SelectTrigger>
                  <SelectContent>
                    {fonctionsList.map((fonction) => (
                      <SelectItem key={fonction} value={fonction}>
                        {fonction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entreprise Associée
                  </label>
                  <Select
                    value={formData.entreprise_id || ''}
                    onValueChange={(value) => handleInputChange('entreprise_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune entreprise</SelectItem>
                      {companiesData?.results?.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.denomination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de Tiers <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.type_tiers}
                    onValueChange={(value: any) => handleInputChange('type_tiers', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="fournisseur">Fournisseur</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="partenaire">Partenaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de Naissance
                </label>
                <Input
                  type="date"
                  value={formData.date_naissance || ''}
                  onChange={(e) => handleInputChange('date_naissance', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'coordonnees' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone Fixe <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.telephone_fixe}
                    onChange={(e) => handleInputChange('telephone_fixe', e.target.value)}
                    placeholder="+237 2 XX XX XX XX"
                    error={errors.telephone_fixe}
                  />
                  {errors.telephone_fixe && (
                    <p className="mt-1 text-sm text-red-600">{errors.telephone_fixe}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone Mobile
                  </label>
                  <Input
                    value={formData.telephone_mobile || ''}
                    onChange={(e) => handleInputChange('telephone_mobile', e.target.value)}
                    placeholder="+237 6 XX XX XX XX"
                    error={errors.telephone_mobile}
                  />
                  {errors.telephone_mobile && (
                    <p className="mt-1 text-sm text-red-600">{errors.telephone_mobile}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Principal <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contact@email.com"
                    error={errors.email}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Secondaire
                  </label>
                  <Input
                    type="email"
                    value={formData.email_secondaire || ''}
                    onChange={(e) => handleInputChange('email_secondaire', e.target.value)}
                    placeholder="autre@email.com"
                    error={errors.email_secondaire}
                  />
                  {errors.email_secondaire && (
                    <p className="mt-1 text-sm text-red-600">{errors.email_secondaire}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <Input
                  value={formData.adresse || ''}
                  onChange={(e) => handleInputChange('adresse', e.target.value)}
                  placeholder="Adresse complète"
                />
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
                    Ville
                  </label>
                  <Input
                    value={formData.ville || ''}
                    onChange={(e) => handleInputChange('ville', e.target.value)}
                    placeholder="Ex: Douala"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pays
                  </label>
                  <Input
                    value={formData.pays || ''}
                    onChange={(e) => handleInputChange('pays', e.target.value)}
                    placeholder="Ex: Cameroun"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'professionnel' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Profil LinkedIn
                </label>
                <Input
                  value={formData.linkedin || ''}
                  onChange={(e) => handleInputChange('linkedin', e.target.value)}
                  placeholder="https://www.linkedin.com/in/nom-prenom"
                  error={errors.linkedin}
                />
                {errors.linkedin && (
                  <p className="mt-1 text-sm text-red-600">{errors.linkedin}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes Internes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Notes et observations sur le contact..."
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <AlertCircle className="inline-block mr-2 h-4 w-4" />
                  Les notes internes ne sont visibles que par votre équipe et ne seront jamais partagées avec le contact.
                </p>
              </div>
            </div>
          )}
        </form>

        <div className="flex justify-end space-x-3 p-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createContact.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={createContact.isPending}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
          >
            {createContact.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Créer le Contact
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: any;
  onSuccess?: () => void;
}

export const EditContactModal: React.FC<EditContactModalProps> = ({
  isOpen,
  onClose,
  contact,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'coordonnees' | 'professionnel'>('general');

  const queryClient = useQueryClient();

  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'list'],
    queryFn: () => thirdPartyService.getCompanies({ page: 1, limit: 1000 }),
    enabled: isOpen
  });

  const updateContact = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      thirdPartyService.updateContact(id, data),
    onSuccess: () => {
      toast.success('Contact modifié avec succès');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error('Erreur modification contact:', error);
      toast.error(error?.message || 'Erreur lors de la modification du contact');
    }
  });

  useEffect(() => {
    if (isOpen && contact) {
      setFormData({
        civilite: contact.civilite || 'M.',
        prenom: contact.prenom || '',
        nom: contact.nom || '',
        fonction: contact.fonction || '',
        entreprise_id: contact.entreprise_id || '',
        type_tiers: contact.type_tiers || 'client',
        telephone_fixe: contact.telephone_fixe || '',
        telephone_mobile: contact.telephone_mobile || '',
        email: contact.email || '',
        email_secondaire: contact.email_secondaire || '',
        adresse: contact.adresse || '',
        code_postal: contact.code_postal || '',
        ville: contact.ville || '',
        pays: contact.pays || 'Cameroun',
        date_naissance: contact.date_naissance || '',
        linkedin: contact.linkedin || '',
        notes: contact.notes || '',
      });
      setErrors({});
      setActiveTab('general');
    }
  }, [isOpen, contact]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }

    if (!formData.telephone_fixe.trim()) {
      newErrors.telephone_fixe = 'Le téléphone est requis';
    } else if (!/^[\d\s\+\-\(\)]+$/.test(formData.telephone_fixe)) {
      newErrors.telephone_fixe = 'Numéro de téléphone invalide';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
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

    updateContact.mutate({ id: contact.id, data: formData });
  };

  const handleInputChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <User className="mr-3 h-6 w-6" />
            Modifier le Contact - {contact.prenom} {contact.nom}
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
            <User className="inline-block mr-2 h-4 w-4" />
            Général
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coordonnees')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'coordonnees'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Phone className="inline-block mr-2 h-4 w-4" />
            Coordonnées
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('professionnel')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'professionnel'
                ? 'text-[var(--color-text-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-gray-700 hover:text-gray-700'
            }`}
          >
            <Briefcase className="inline-block mr-2 h-4 w-4" />
            Professionnel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Reuse same form structure as Create modal */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Civilité
                  </label>
                  <Select
                    value={formData.civilite}
                    onValueChange={(value: any) => handleInputChange('civilite', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M.">M.</SelectItem>
                      <SelectItem value="Mme">Mme</SelectItem>
                      <SelectItem value="Mlle">Mlle</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                      <SelectItem value="Pr">Pr</SelectItem>
                      <SelectItem value="Me">Me</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.prenom}
                    onChange={(e) => handleInputChange('prenom', e.target.value)}
                    error={errors.prenom}
                  />
                  {errors.prenom && (
                    <p className="mt-1 text-sm text-red-600">{errors.prenom}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    error={errors.nom}
                  />
                  {errors.nom && (
                    <p className="mt-1 text-sm text-red-600">{errors.nom}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fonction
                </label>
                <Select
                  value={formData.fonction}
                  onValueChange={(value) => handleInputChange('fonction', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une fonction" />
                  </SelectTrigger>
                  <SelectContent>
                    {fonctionsList.map((fonction) => (
                      <SelectItem key={fonction} value={fonction}>
                        {fonction}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entreprise Associée
                  </label>
                  <Select
                    value={formData.entreprise_id || ''}
                    onValueChange={(value) => handleInputChange('entreprise_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une entreprise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune entreprise</SelectItem>
                      {companiesData?.results?.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.denomination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de Tiers
                  </label>
                  <Select
                    value={formData.type_tiers}
                    onValueChange={(value: any) => handleInputChange('type_tiers', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="fournisseur">Fournisseur</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="partenaire">Partenaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de Naissance
                </label>
                <Input
                  type="date"
                  value={formData.date_naissance || ''}
                  onChange={(e) => handleInputChange('date_naissance', e.target.value)}
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
            disabled={updateContact.isPending}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={updateContact.isPending}
            className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
          >
            {updateContact.isPending ? (
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

interface ContactDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: any;
  onEdit?: () => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  isOpen,
  onClose,
  contact,
  onEdit
}) => {
  if (!isOpen || !contact) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-green-100 text-green-800';
      case 'fournisseur': return 'bg-blue-100 text-blue-800';
      case 'prospect': return 'bg-yellow-100 text-yellow-800';
      case 'partenaire': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return 'Client';
      case 'fournisseur': return 'Fournisseur';
      case 'prospect': return 'Prospect';
      case 'partenaire': return 'Partenaire';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
            <User className="mr-3 h-6 w-6" />
            Détails du Contact
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
                  <User className="mr-2 h-5 w-5" />
                  Informations Générales
                </span>
                <Badge className={getTypeColor(contact.type_tiers)}>
                  {getTypeLabel(contact.type_tiers)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Nom Complet</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">
                  {contact.civilite} {contact.prenom} {contact.nom}
                </p>
              </div>

              {contact.fonction && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Fonction</p>
                  <p className="text-lg">{contact.fonction}</p>
                </div>
              )}

              {contact.entreprise_nom && (
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Entreprise</p>
                    <p className="text-lg font-semibold">{contact.entreprise_nom}</p>
                  </div>
                </div>
              )}

              {contact.date_naissance && (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date de Naissance</p>
                    <p className="text-lg">{formatDate(contact.date_naissance)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Coordonnées
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Téléphone Fixe</p>
                    <p className="text-lg">{contact.telephone_fixe}</p>
                  </div>
                </div>

                {contact.telephone_mobile && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-700" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Mobile</p>
                      <p className="text-lg">{contact.telephone_mobile}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-700" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email Principal</p>
                    <a href={`mailto:${contact.email}`} className="text-lg text-blue-600 hover:underline">
                      {contact.email}
                    </a>
                  </div>
                </div>

                {contact.email_secondaire && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-700" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email Secondaire</p>
                      <a href={`mailto:${contact.email_secondaire}`} className="text-lg text-blue-600 hover:underline">
                        {contact.email_secondaire}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {(contact.adresse || contact.ville) && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-700 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Adresse</p>
                    {contact.adresse && <p className="text-lg">{contact.adresse}</p>}
                    {contact.ville && (
                      <p className="text-sm text-gray-600">
                        {contact.code_postal && `${contact.code_postal}, `}
                        {contact.ville}{contact.pays && `, ${contact.pays}`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(contact.linkedin || contact.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="mr-2 h-5 w-5" />
                  Informations Professionnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.linkedin && (
                  <div className="flex items-center space-x-2">
                    <Linkedin className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">LinkedIn</p>
                      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer"
                         className="text-lg text-blue-600 hover:underline">
                        Voir le profil
                      </a>
                    </div>
                  </div>
                )}

                {contact.notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Notes Internes</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mt-1">{contact.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
              <User className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};