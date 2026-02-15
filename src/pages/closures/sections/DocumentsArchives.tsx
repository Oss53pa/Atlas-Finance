import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { closuresService, uploadDocumentSchema } from '../../../services/modules/closures.service';
import {
  FileText, Upload, Download, FolderOpen, Archive,
  Search, Filter, Clock, CheckCircle, AlertCircle,
  Eye, Trash2, Share2, Lock, Unlock, Calendar,
  User, Tag, Paperclip, File, FileSpreadsheet,
  Shield, Database, Cloud, HardDrive, FolderArchive,
  FileCheck, FileX, FilePlus, History, Key,
  Hash, ChevronRight, MoreVertical, Grid, List, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';

interface Document {
  id: string;
  nom: string;
  type: 'pdf' | 'excel' | 'word' | 'image' | 'zip' | 'xml';
  categorie: 'balance' | 'grand_livre' | 'etats_fiscaux' | 'rapprochement' | 'inventaire' | 'provisions' | 'immobilisations' | 'audit' | 'pv' | 'autre';
  periode: string;
  typeCloture: 'mensuelle' | 'trimestrielle' | 'annuelle';
  taille: string;
  dateAjout: string;
  dateModification: string;
  auteur: string;
  statut: 'valide' | 'en_revision' | 'archive' | 'obsolete';
  tags: string[];
  hash: string;
  signature?: string;
  verrouille: boolean;
  partage: string[];
  commentaires: number;
  version: string;
  conforme: boolean;
}

interface DossierCloture {
  id: string;
  periode: string;
  type: 'mensuelle' | 'trimestrielle' | 'annuelle';
  dateCreation: string;
  dateCloture?: string;
  statut: 'en_cours' | 'complete' | 'validee' | 'archivee';
  responsable: string;
  documentsObligatoires: number;
  documentsPresents: number;
  tauxCompletude: number;
  tailleTotale: string;
  conforme: boolean;
}

const DocumentsArchives: React.FC = () => {
  const { t } = useLanguage();
  const [selectedDossier, setSelectedDossier] = useState<string>('2025-01');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filterCategorie, setFilterCategorie] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'balance' as 'balance' | 'grand_livre' | 'etats_financiers' | 'pv' | 'liasse_fiscale',
    fichier: null as File | null,
    periode: new Date().toISOString().substring(0, 7), // YYYY-MM
    exercice: new Date().getFullYear().toString(),
    tags: [] as string[],
    niveau_securite: 'restreint' as 'public' | 'restreint' | 'confidentiel' | 'strictement_confidentiel',
    duree_conservation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: closuresService.uploadDocument,
    onSuccess: () => {
      toast.success('Document archivé avec succès');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUploadModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de l\'upload');
    },
  });

  // Données exemple - Dossiers de clôture
  const dossiersCloture: DossierCloture[] = [
    {
      id: '1',
      periode: '2025-01',
      type: 'mensuelle',
      dateCreation: '2025-01-05',
      dateCloture: '2025-02-10',
      statut: 'validee',
      responsable: 'Marie Kouadio',
      documentsObligatoires: 25,
      documentsPresents: 25,
      tauxCompletude: 100,
      tailleTotale: '45.8 MB',
      conforme: true
    },
    {
      id: '2',
      periode: '2024-12',
      type: 'annuelle',
      dateCreation: '2024-12-15',
      dateCloture: '2025-01-31',
      statut: 'complete',
      responsable: 'Jean Konan',
      documentsObligatoires: 48,
      documentsPresents: 46,
      tauxCompletude: 96,
      tailleTotale: '125.3 MB',
      conforme: false
    },
    {
      id: '3',
      periode: '2024-11',
      type: 'mensuelle',
      dateCreation: '2024-11-05',
      dateCloture: '2024-12-10',
      statut: 'archivee',
      responsable: 'Marie Kouadio',
      documentsObligatoires: 25,
      documentsPresents: 25,
      tauxCompletude: 100,
      tailleTotale: '42.1 MB',
      conforme: true
    },
    {
      id: '4',
      periode: 'Q4-2024',
      type: 'trimestrielle',
      dateCreation: '2024-10-01',
      dateCloture: '2025-01-15',
      statut: 'validee',
      responsable: 'Paul Yao',
      documentsObligatoires: 35,
      documentsPresents: 35,
      tauxCompletude: 100,
      tailleTotale: '78.9 MB',
      conforme: true
    }
  ];

  // Documents exemple
  const documents: Document[] = [
    // Documents de janvier 2025
    {
      id: '1',
      nom: 'Balance_Generale_012025.pdf',
      type: 'pdf',
      categorie: 'balance',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '2.4 MB',
      dateAjout: '2025-02-01',
      dateModification: '2025-02-05',
      auteur: 'Marie Kouadio',
      statut: 'valide',
      tags: ['Balance', 'Janvier 2025', 'SYSCOHADA'],
      hash: 'SHA256:a8f5f167f44f4964e6c998dee827110c',
      signature: 'MK-2025-02-05-14:23:45',
      verrouille: true,
      partage: ['Directeur Financier', 'Commissaire aux comptes'],
      commentaires: 3,
      version: '1.2',
      conforme: true
    },
    {
      id: '2',
      nom: 'Grand_Livre_012025.xlsx',
      type: 'excel',
      categorie: 'grand_livre',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '8.7 MB',
      dateAjout: '2025-02-01',
      dateModification: '2025-02-03',
      auteur: 'Jean Konan',
      statut: 'valide',
      tags: ['Grand Livre', 'Janvier 2025', 'Détaillé'],
      hash: 'SHA256:b9f6g278g55g5075f7d109def938221d',
      verrouille: true,
      partage: ['Équipe Comptable'],
      commentaires: 0,
      version: '1.0',
      conforme: true
    },
    {
      id: '3',
      nom: 'Rapprochement_Bancaire_SGBCI_012025.pdf',
      type: 'pdf',
      categorie: 'rapprochement',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '1.2 MB',
      dateAjout: '2025-02-02',
      dateModification: '2025-02-02',
      auteur: 'Awa Diallo',
      statut: 'valide',
      tags: ['Rapprochement', 'SGBCI', 'Janvier 2025'],
      hash: 'SHA256:c1g7h389h66h6186g8e220efg049332e',
      verrouille: false,
      partage: ['Trésorier'],
      commentaires: 2,
      version: '1.1',
      conforme: true
    },
    {
      id: '4',
      nom: 'Inventaire_Stock_012025.xlsx',
      type: 'excel',
      categorie: 'inventaire',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '4.5 MB',
      dateAjout: '2025-01-31',
      dateModification: '2025-02-04',
      auteur: 'Kouame Yao',
      statut: 'en_revision',
      tags: ['Inventaire', 'Stock', 'Valorisation'],
      hash: 'SHA256:d2h8i490i77i7297h9f331fg150443f',
      verrouille: false,
      partage: ['Gestionnaire Stock', 'Contrôleur de Gestion'],
      commentaires: 5,
      version: '2.1',
      conforme: false
    },
    {
      id: '5',
      nom: 'Declaration_TVA_012025.pdf',
      type: 'pdf',
      categorie: 'etats_fiscaux',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '856 KB',
      dateAjout: '2025-02-08',
      dateModification: '2025-02-08',
      auteur: 'Fatou Sow',
      statut: 'valide',
      tags: ['TVA', 'Déclaration', 'DGI'],
      hash: 'SHA256:e3i9j501j88j8308i0g442gh261554g',
      signature: 'FS-2025-02-08-10:15:30',
      verrouille: true,
      partage: ['Direction', 'Expert-Comptable'],
      commentaires: 1,
      version: '1.0',
      conforme: true
    },
    {
      id: '6',
      nom: 'Provisions_Creances_012025.pdf',
      type: 'pdf',
      categorie: 'provisions',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '1.8 MB',
      dateAjout: '2025-02-03',
      dateModification: '2025-02-06',
      auteur: 'Ibrahim Toure',
      statut: 'valide',
      tags: ['Provisions', 'Créances douteuses'],
      hash: 'SHA256:f4j0k612k99k9419j1h553hi372665h',
      verrouille: false,
      partage: ['Risk Manager'],
      commentaires: 4,
      version: '1.3',
      conforme: true
    },
    {
      id: '7',
      nom: 'Tableau_Amortissements_012025.xlsx',
      type: 'excel',
      categorie: 'immobilisations',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '3.2 MB',
      dateAjout: '2025-02-01',
      dateModification: '2025-02-01',
      auteur: 'Seydou Ba',
      statut: 'valide',
      tags: ['Amortissements', 'Immobilisations'],
      hash: 'SHA256:g5k1l723l00l0520k2i664ij483776i',
      verrouille: true,
      partage: ['Comptable Principal'],
      commentaires: 0,
      version: '1.0',
      conforme: true
    },
    {
      id: '8',
      nom: 'PV_Cloture_Mensuelle_012025.pdf',
      type: 'pdf',
      categorie: 'pv',
      periode: '2025-01',
      typeCloture: 'mensuelle',
      taille: '245 KB',
      dateAjout: '2025-02-10',
      dateModification: '2025-02-10',
      auteur: 'Marie Kouadio',
      statut: 'valide',
      tags: ['PV', 'Clôture', 'Validation'],
      hash: 'SHA256:h6l2m834m11m1631l3j775jk594887j',
      signature: 'MK-2025-02-10-16:45:00',
      verrouille: true,
      partage: ['Direction', 'Audit'],
      commentaires: 2,
      version: '1.0',
      conforme: true
    },
    // Documents année 2024
    {
      id: '9',
      nom: 'Bilan_SYSCOHADA_2024.pdf',
      type: 'pdf',
      categorie: 'balance',
      periode: '2024-12',
      typeCloture: 'annuelle',
      taille: '4.8 MB',
      dateAjout: '2025-01-15',
      dateModification: '2025-01-28',
      auteur: 'Jean Konan',
      statut: 'valide',
      tags: ['Bilan', 'SYSCOHADA', '2024', 'Annuel'],
      hash: 'SHA256:i7m3n945n22n2742m4k886kl605998k',
      signature: 'JK-2025-01-28-09:30:15',
      verrouille: true,
      partage: ['Conseil d\'Administration', 'CAC'],
      commentaires: 8,
      version: '2.5',
      conforme: true
    },
    {
      id: '10',
      nom: 'Compte_Resultat_2024.pdf',
      type: 'pdf',
      categorie: 'balance',
      periode: '2024-12',
      typeCloture: 'annuelle',
      taille: '2.1 MB',
      dateAjout: '2025-01-15',
      dateModification: '2025-01-25',
      auteur: 'Jean Konan',
      statut: 'valide',
      tags: ['Compte de Résultat', '2024'],
      hash: 'SHA256:j8n4o056o33o3853n5l997lm716009l',
      signature: 'JK-2025-01-25-11:20:00',
      verrouille: true,
      partage: ['Direction Générale'],
      commentaires: 5,
      version: '2.0',
      conforme: true
    },
    {
      id: '11',
      nom: 'Rapport_CAC_2024.pdf',
      type: 'pdf',
      categorie: 'audit',
      periode: '2024-12',
      typeCloture: 'annuelle',
      taille: '1.5 MB',
      dateAjout: '2025-01-30',
      dateModification: '2025-01-30',
      auteur: 'Cabinet KPMG',
      statut: 'valide',
      tags: ['Audit', 'CAC', 'Rapport', '2024'],
      hash: 'SHA256:k9o5p167p44p4964o6m008mn827110m',
      signature: 'KPMG-2025-01-30-14:00:00',
      verrouille: true,
      partage: ['Direction', 'Conseil d\'Administration'],
      commentaires: 12,
      version: '1.0',
      conforme: true
    }
  ];

  // Filtrer les documents
  const getFilteredDocuments = () => {
    let filtered = documents;

    // Filtrer par dossier/période
    if (selectedDossier) {
      const dossier = dossiersCloture.find(d => d.periode === selectedDossier);
      if (dossier) {
        filtered = filtered.filter(doc => doc.periode === dossier.periode);
      }
    }

    // Filtrer par catégorie
    if (filterCategorie !== 'tous') {
      filtered = filtered.filter(doc => doc.categorie === filterCategorie);
    }

    // Filtrer par recherche
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  };

  const filteredDocuments = getFilteredDocuments();

  // Statistiques
  const stats = {
    totalDossiers: dossiersCloture.length,
    dossiersValides: dossiersCloture.filter(d => d.statut === 'validee').length,
    dossiersEnCours: dossiersCloture.filter(d => d.statut === 'en_cours').length,
    totalDocuments: documents.length,
    documentsConformes: documents.filter(d => d.conforme).length,
    espaceTotalUtilise: '297.1 MB',
    tauxConformite: Math.round((documents.filter(d => d.conforme).length / documents.length) * 100)
  };

  // Catégories de documents
  const categories = [
    { value: 'tous', label: 'Tous les documents', icon: FolderOpen },
    { value: 'balance', label: 'Balances & États', icon: FileSpreadsheet },
    { value: 'grand_livre', label: 'Grands Livres', icon: FileText },
    { value: 'etats_fiscaux', label: 'États Fiscaux', icon: Shield },
    { value: 'rapprochement', label: 'Rapprochements', icon: FileCheck },
    { value: 'inventaire', label: 'Inventaires', icon: Archive },
    { value: 'provisions', label: 'Provisions', icon: Database },
    { value: 'immobilisations', label: t('navigation.assets'), icon: HardDrive },
    { value: 'audit', label: 'Rapports d\'Audit', icon: Shield },
    { value: 'pv', label: 'PV & Validations', icon: FileCheck },
    { value: 'autre', label: 'Autres', icon: File }
  ];

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-[var(--color-error)]" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5 text-[var(--color-success)]" />;
      case 'word': return <FileText className="w-5 h-5 text-[var(--color-primary)]" />;
      case 'zip': return <Archive className="w-5 h-5 text-yellow-500" />;
      default: return <File className="w-5 h-5 text-[var(--color-text-secondary)]" />;
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'balance',
      fichier: null,
      periode: new Date().toISOString().substring(0, 7),
      exercice: new Date().getFullYear().toString(),
      tags: [],
      niveau_securite: 'restreint',
      duree_conservation: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'fichier') {
      const file = (value as FileList)?.[0] || null;
      setFormData(prev => ({ ...prev, fichier: file }));
    } else if (field === 'tags') {
      const tagsArray = typeof value === 'string' ? value.split(',').map(tag => tag.trim()).filter(tag => tag) : value;
      setFormData(prev => ({ ...prev, [field]: tagsArray }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrors({});

      // Validation spéciale pour fichiers
      if (!formData.fichier) {
        setErrors({ fichier: 'Un fichier est requis' });
        toast.error('Veuillez sélectionner un fichier');
        return;
      }

      // Validate with Zod
      const validatedData = uploadDocumentSchema.parse(formData);

      // Submit to backend
      await uploadMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map Zod errors to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      } else {
        toast.error('Erreur lors de l\'archivage du document');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'valide': return 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]';
      case 'en_revision': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]';
      case 'archive': return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
      case 'obsolete': return 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]';
      default: return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#191919] flex items-center space-x-2">
              <FolderArchive className="w-6 h-6 text-[#6A8A82]" />
              <span>Archives Documentaires des Clôtures</span>
            </h2>
            <p className="text-sm text-[#767676] mt-1">Gestion centralisée des documents de clôture</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72] flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Ajouter documents</span>
            </button>
            <button className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:bg-[var(--color-background-secondary)] flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Exporter archive</span>
            </button>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-6 gap-4">
          <div className="p-4 bg-[var(--color-primary-lightest)] rounded-lg border border-[var(--color-primary-light)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-primary-dark)]">Dossiers</span>
              <FolderOpen className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-primary-darker)]">{stats.totalDossiers}</p>
            <p className="text-xs text-[var(--color-primary)] mt-1">{stats.dossiersValides} validés</p>
          </div>
          <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg border border-[var(--color-success-light)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-success-dark)]">Documents</span>
              <FileText className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-success-darker)]">{stats.totalDocuments}</p>
            <p className="text-xs text-[var(--color-success)] mt-1">{stats.documentsConformes} conformes</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-700">Conformité</span>
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-800">{stats.tauxConformite}%</p>
            <p className="text-xs text-purple-600 mt-1">SYSCOHADA</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-warning-dark)]">Espace utilisé</span>
              <HardDrive className="w-4 h-4 text-[var(--color-warning)]" />
            </div>
            <p className="text-lg font-bold text-orange-800">{stats.espaceTotalUtilise}</p>
            <p className="text-xs text-[var(--color-warning)] mt-1">Sur 5 GB</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-indigo-700">Sécurité</span>
              <Lock className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-lg font-bold text-indigo-800">256-bit</p>
            <p className="text-xs text-indigo-600 mt-1">Chiffrement AES</p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-teal-700">Sauvegarde</span>
              <Cloud className="w-4 h-4 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-800">Automatique</p>
            <p className="text-xs text-teal-600 mt-1">Toutes les 4h</p>
          </div>
        </div>
      </div>

      {/* Layout principal avec sidebar et contenu */}
      <div className="flex gap-6">
        {/* Sidebar - Liste des dossiers */}
        <div className="w-80">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Dossiers de Clôture</span>
                <Badge variant="outline">{stats.totalDossiers}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {dossiersCloture.map(dossier => (
                  <button
                    key={dossier.id}
                    onClick={() => setSelectedDossier(dossier.periode)}
                    className={`w-full text-left p-3 hover:bg-[var(--color-background-secondary)] border-l-4 transition-colors ${
                      selectedDossier === dossier.periode
                        ? 'bg-[#6A8A82]/10 border-[#6A8A82]'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <FolderOpen className="w-4 h-4 text-[#6A8A82]" />
                          <span className="font-medium text-sm">{dossier.periode}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              dossier.type === 'annuelle'
                                ? 'border-purple-300 text-purple-700'
                                : dossier.type === 'trimestrielle'
                                ? 'border-blue-300 text-[var(--color-primary-dark)]'
                                : 'border-[var(--color-border-dark)]'
                            }`}
                          >
                            {dossier.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-[#767676]">
                          {dossier.responsable}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-[#767676]">
                            {dossier.documentsPresents}/{dossier.documentsObligatoires} docs
                          </span>
                          <span className="text-xs text-[#767676]">
                            {dossier.tailleTotale}
                          </span>
                        </div>
                        <Progress
                          value={dossier.tauxCompletude}
                          className="h-1 mt-2"
                        />
                      </div>
                      <div className="ml-2">
                        {dossier.conforme ? (
                          <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatutColor(dossier.statut)}`}
                      >
                        {dossier.statut}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Actions Rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-[var(--color-background-secondary)] rounded flex items-center space-x-2">
                <FilePlus className="w-4 h-4 text-[#6A8A82]" />
                <span className="text-sm">Créer nouveau dossier</span>
              </button>
              <button className="w-full text-left p-2 hover:bg-[var(--color-background-secondary)] rounded flex items-center space-x-2">
                <History className="w-4 h-4 text-[#767676]" />
                <span className="text-sm">Historique des modifications</span>
              </button>
              <button className="w-full text-left p-2 hover:bg-[var(--color-background-secondary)] rounded flex items-center space-x-2">
                <Key className="w-4 h-4 text-[#767676]" />
                <span className="text-sm">Gérer les accès</span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Contenu principal - Liste des documents */}
        <div className="flex-1">
          {/* Barre d'outils */}
          <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <select
                  value={filterCategorie}
                  onChange={(e) => setFilterCategorie(e.target.value)}
                  className="px-3 py-2 border border-[#E8E8E8] rounded-lg text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#767676]" />
                  <input
                    type="text"
                    placeholder="Rechercher documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-[#E8E8E8] rounded-lg text-sm w-64"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-[var(--color-background-hover)]' : 'hover:bg-[var(--color-background-secondary)]'}`}
                >
                  <List className="w-5 h-5 text-[#767676]" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[var(--color-background-hover)]' : 'hover:bg-[var(--color-background-secondary)]'}`}
                >
                  <Grid className="w-5 h-5 text-[#767676]" />
                </button>
              </div>
            </div>
          </div>

          {/* Liste des documents */}
          {viewMode === 'list' ? (
            <div className="bg-white rounded-lg border border-[#E8E8E8]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-background-secondary)] border-b border-[#E8E8E8]">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#444444]">Document</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#444444]">Catégorie</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#444444]">Auteur</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[#444444]">{t('common.date')}</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-[#444444]">Statut</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-[#444444]">Sécurité</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-[#444444]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map(doc => (
                      <tr key={doc.id} className="border-b border-[#E8E8E8] hover:bg-[var(--color-background-secondary)]">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            {getFileIcon(doc.type)}
                            <div>
                              <p className="font-medium text-sm text-[#191919]">{doc.nom}</p>
                              <p className="text-xs text-[#767676]">{doc.taille} • v{doc.version}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[#444444] capitalize">
                            {doc.categorie.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[#444444]">{doc.auteur}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[#767676]">{doc.dateModification}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className={`text-xs ${getStatutColor(doc.statut)}`}>
                            {doc.statut}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {doc.verrouille ? (
                              <Lock className="w-4 h-4 text-[var(--color-error)]" />
                            ) : (
                              <Unlock className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            )}
                            {doc.signature && (
                              <Shield className="w-4 h-4 text-[var(--color-success)]" />
                            )}
                            {doc.conforme && (
                              <CheckCircle className="w-4 h-4 text-[var(--color-primary)]" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Voir les détails">
                              <Eye className="w-4 h-4 text-[#767676]" />
                            </button>
                            <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Télécharger">
                              <Download className="w-4 h-4 text-[#767676]" />
                            </button>
                            <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Partager">
                              <Share2 className="w-4 h-4 text-[#767676]" />
                            </button>
                            <button className="p-1 hover:bg-[var(--color-background-hover)] rounded">
                              <MoreVertical className="w-4 h-4 text-[#767676]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="p-4 border-t border-[#E8E8E8] flex items-center justify-between">
                <span className="text-sm text-[#767676]">
                  Affichage de 1-{Math.min(10, filteredDocuments.length)} sur {filteredDocuments.length} documents
                </span>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 border border-[#E8E8E8] rounded hover:bg-[var(--color-background-secondary)] text-sm">
                    Précédent
                  </button>
                  <button className="px-3 py-1 bg-[#6A8A82] text-white rounded text-sm">1</button>
                  <button className="px-3 py-1 border border-[#E8E8E8] rounded hover:bg-[var(--color-background-secondary)] text-sm">2</button>
                  <button className="px-3 py-1 border border-[#E8E8E8] rounded hover:bg-[var(--color-background-secondary)] text-sm">
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Vue en grille
            <div className="grid grid-cols-3 gap-4">
              {filteredDocuments.map(doc => (
                <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      {getFileIcon(doc.type)}
                      <div className="flex items-center space-x-1">
                        {doc.verrouille && <Lock className="w-3 h-3 text-[var(--color-error)]" />}
                        {doc.signature && <Shield className="w-3 h-3 text-[var(--color-success)]" />}
                        {doc.conforme && <CheckCircle className="w-3 h-3 text-[var(--color-primary)]" />}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm text-[#191919] mb-1 truncate">{doc.nom}</h3>
                    <p className="text-xs text-[#767676] mb-3">{doc.taille} • v{doc.version}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[#767676]">{doc.auteur}</span>
                      <span className="text-xs text-[#767676]">{doc.dateModification}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {doc.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-xs ${getStatutColor(doc.statut)}`}>
                        {doc.statut}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Voir les détails">
                          <Eye className="w-3 h-3 text-[#767676]" />
                        </button>
                        <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Télécharger">
                          <Download className="w-3 h-3 text-[#767676]" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section de traçabilité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-[#6A8A82]" />
            <span>Traçabilité & Intégrité</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Tous les documents sont protégés par empreinte numérique SHA-256 et horodatage certifié.
              Les modifications sont tracées et l'intégrité des fichiers est vérifiée automatiquement.
            </AlertDescription>
          </Alert>
          <div className="mt-4 p-4 bg-[var(--color-background-secondary)] rounded-lg">
            <h4 className="text-sm font-medium mb-3">Dernières activités</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#767676]">Document Balance_Generale_012025.pdf signé électroniquement</span>
                <span className="text-xs text-[#767676]">Il y a 2h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#767676]">Dossier 2025-01 validé et verrouillé</span>
                <span className="text-xs text-[#767676]">Il y a 5h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#767676]">Archive automatique créée pour Q4-2024</span>
                <span className="text-xs text-[#767676]">Il y a 1 jour</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Téléverser Document</h2>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <FileText className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-purple-900 mb-1">Ajout de Document</h4>
                      <p className="text-sm text-purple-800">Téléversez et cataloguez vos documents de clôture dans l&apos;archive digitale sécurisée.</p>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Sélection de Fichier</h3>
                  <div className="border-2 border-dashed border-[var(--color-border-dark)] rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-[var(--color-text-secondary)]" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-[var(--color-text-primary)]">
                          Glissez vos fichiers ici ou cliquez pour parcourir
                        </span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.zip"
                          onChange={(e) => handleInputChange('fichier', e.target.files)}
                          disabled={isSubmitting}
                        />
                      </label>
                      {formData.fichier && (
                        <p className="mt-1 text-sm text-[var(--color-success)]">
                          Fichier sélectionné: {formData.fichier.name}
                        </p>
                      )}
                      {errors.fichier && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.fichier}</p>
                      )}
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">PDF, Excel, Word, Images jusqu&apos;à 10MB</p>
                    </div>
                  </div>
                </div>

                {/* Document Metadata */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Informations du Document</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Nom du Document</label>
                      <input
                        type="text"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: Balance Générale Sept 2024"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.type && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Catégorie</label>
                      <select
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">-- Sélectionner catégorie --</option>
                        <option value="balance">Balance Générale</option>
                        <option value="grand_livre">Grand Livre</option>
                        <option value="etats_financiers">États Financiers</option>
                        <option value="pv">Procès-Verbaux</option>
                        <option value="liasse_fiscale">Liasse Fiscale</option>
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Période</label>
                      <input
                        type="month"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: 2024-09"
                        value={formData.periode}
                        onChange={(e) => handleInputChange('periode', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.periode && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.periode}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Type de Clôture</label>
                      <input
                        type="text"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: 2024"
                        value={formData.exercice}
                        onChange={(e) => handleInputChange('exercice', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.exercice && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.exercice}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security and Access */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Sécurité et Accès</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Niveau de Confidentialité</label>
                      <select
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        value={formData.niveau_securite}
                        onChange={(e) => handleInputChange('niveau_securite', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="public">Public</option>
                        <option value="restreint">Restreint</option>
                        <option value="confidentiel">Confidentiel</option>
                        <option value="strictement_confidentiel">Strictement Confidentiel</option>
                      </select>
                      {errors.niveau_securite && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.niveau_securite}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Droits d&apos;Accès</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Ex: 10 (ans)"
                        value={formData.duree_conservation}
                        onChange={(e) => handleInputChange('duree_conservation', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.duree_conservation && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.duree_conservation}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags and Description */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Classification</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Tags (séparés par des virgules)</label>
                      <input
                        type="text"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="comptabilité, clôture, septembre, validation"
                        value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                        onChange={(e) => handleInputChange('tags', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.tags && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.tags}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Description</label>
                      <textarea className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" rows={3} placeholder="Description détaillée du document..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-border-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Téléversement...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Téléverser le Document</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsArchives;