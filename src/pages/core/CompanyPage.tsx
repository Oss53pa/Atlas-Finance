import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building,
  Plus,
  Edit,
  Settings,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Calendar
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Badge,
  LoadingSpinner,
  Input,
  Textarea
} from '../../components/ui';
import { companyService } from '../../services/company.service';
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

const CompanyPage: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const queryClient = useQueryClient();

  // Fetch company information
  const { data: company, isLoading } = useQuery({
    queryKey: ['company', 'current'],
    queryFn: companyService.getCurrentCompany,
  });

  // Fetch company statistics
  const { data: companyStats } = useQuery({
    queryKey: ['company', 'statistics'],
    queryFn: companyService.getCompanyStatistics,
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: companyService.updateCompany,
    onSuccess: () => {
      toast.success('Informations société mises à jour');
      setIsEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const handleEdit = () => {
    setFormData(company);
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setFormData({});
    setIsEditMode(false);
  };

  const handleSave = () => {
    updateCompanyMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: Record<string, unknown>) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Chargement des informations société..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Building className="mr-3 h-7 w-7" />
              Informations Société
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Configuration et paramètres de votre société
            </p>
          </div>
          <div className="flex space-x-3">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Annuler
                </Button>
                <Button 
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                  onClick={handleSave}
                  loading={updateCompanyMutation.isPending}
                >
                  Enregistrer
                </Button>
              </>
            ) : (
              <Button 
                variant="outline"
                onClick={handleEdit}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Informations Générales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  Raison sociale
                </label>
                {isEditMode ? (
                  <Input
                    value={formData.nom || ''}
                    onChange={(e) => handleChange('nom', e.target.value)}
                    placeholder="Nom de la société"
                  />
                ) : (
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">{company?.nom}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  Forme juridique
                </label>
                {isEditMode ? (
                  <Input
                    value={formData.forme_juridique || ''}
                    onChange={(e) => handleChange('forme_juridique', e.target.value)}
                    placeholder="SARL, SA, SAS..."
                  />
                ) : (
                  <p className="text-gray-900">{company?.forme_juridique}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  RCCM / Numéro d'enregistrement
                </label>
                {isEditMode ? (
                  <Input
                    value={formData.numero_rccm || ''}
                    onChange={(e) => handleChange('numero_rccm', e.target.value)}
                    placeholder="Numéro RCCM"
                  />
                ) : (
                  <p className="text-gray-900 font-mono">{company?.numero_rccm}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  Numéro fiscal
                </label>
                {isEditMode ? (
                  <Input
                    value={formData.numero_fiscal || ''}
                    onChange={(e) => handleChange('numero_fiscal', e.target.value)}
                    placeholder="Numéro d'identification fiscale"
                  />
                ) : (
                  <p className="text-gray-900 font-mono">{company?.numero_fiscal}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2 flex items-center">
                  <MapPin className="mr-1 h-4 w-4" />
                  Adresse
                </label>
                {isEditMode ? (
                  <Textarea
                    value={formData.adresse || ''}
                    onChange={(e) => handleChange('adresse', e.target.value)}
                    placeholder="Adresse complète de la société"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-line">{company?.adresse}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2 flex items-center">
                  <Phone className="mr-1 h-4 w-4" />
                  Téléphone
                </label>
                {isEditMode ? (
                  <Input
                    value={formData.telephone || ''}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    placeholder="Numéro de téléphone"
                  />
                ) : (
                  <p className="text-gray-900">{company?.telephone}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2 flex items-center">
                  <Mail className="mr-1 h-4 w-4" />
                  Email
                </label>
                {isEditMode ? (
                  <Input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Adresse email"
                  />
                ) : (
                  <p className="text-gray-900">{company?.email}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2 flex items-center">
                  <Globe className="mr-1 h-4 w-4" />
                  Site web
                </label>
                {isEditMode ? (
                  <Input
                    value={formData.site_web || ''}
                    onChange={(e) => handleChange('site_web', e.target.value)}
                    placeholder="https://www.exemple.com"
                  />
                ) : (
                  <p className="text-gray-900">
                    {company?.site_web ? (
                      <a href={company.site_web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {company.site_web}
                      </a>
                    ) : (
                      'Non renseigné'
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Status & Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Statut & Informations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  Statut
                </label>
                <Badge 
                  variant={company?.active ? 'default' : 'outline'}
                  className={company?.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                >
                  {company?.active ? 'Société active' : 'Société inactive'}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2 flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  Date de création
                </label>
                <p className="text-gray-900">{formatDate(company?.date_creation)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  Capital social
                </label>
                <p className="text-gray-900 font-semibold">
                  {company?.capital_social ? 
                    `${company.capital_social.toLocaleString()} ${company.devise}` : 
                    'Non renseigné'
                  }
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  Devise de référence
                </label>
                <p className="text-gray-900 font-mono text-lg">
                  {company?.devise || 'EUR'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                  Régime fiscal
                </label>
                <p className="text-gray-900">
                  {company?.regime_fiscal || 'Régime réel'}
                </p>
              </div>

              {/* Statistics */}
              {companyStats && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">Statistiques</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Utilisateurs:</span>
                      <span className="font-medium">{companyStats.total_utilisateurs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Exercices:</span>
                      <span className="font-medium">{companyStats.total_exercices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Comptes:</span>
                      <span className="font-medium">{companyStats.total_comptes}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Paramètres Comptables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                Plan comptable
              </label>
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                SYSCOHADA
              </Badge>
              <p className="text-xs text-gray-600 mt-1">
                Système comptable OHADA
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                Longueur compte
              </label>
              <p className="text-gray-900 font-mono">
                {company?.longueur_compte || 6} chiffres
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-2">
                Gestion analytique
              </label>
              <Badge 
                variant={company?.gestion_analytique ? 'default' : 'outline'}
                className={company?.gestion_analytique ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
              >
                {company?.gestion_analytique ? 'Activée' : 'Désactivée'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyPage;