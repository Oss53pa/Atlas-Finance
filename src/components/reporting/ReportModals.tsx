import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import {
  X, Download, Share2, Eye, Edit, Settings, Play, Pause, Clock,
  Calendar, Users, Mail, FileText, AlertCircle, CheckCircle,
  Building2, Tag, User, BarChart3, PieChart, TrendingUp,
  FileSpreadsheet, File, Printer, Link, Copy, Send, Trash2,
  RefreshCw, History, Star, Flag, Lock, Unlock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button, Input } from '../ui';
import { Progress } from '../ui/Progress';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Rapport {
  id: string;
  nom: string;
  type: string;
  module: string;
  statut: string;
  progression?: number;
  dateCreation: string;
  dateModification: string;
  responsable: string;
  taille?: string;
  format?: string;
  priorite?: string;
  tags?: string[];
  partage?: string[];
  prochaineLancement?: string;
}

interface ViewReportModalProps extends BaseModalProps {
  rapport: Rapport | null;
}

export const ViewReportModal: React.FC<ViewReportModalProps> = ({ isOpen, onClose, rapport }) => {
  const { t } = useLanguage();
  if (!isOpen || !rapport) return null;

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'termine': return 'bg-green-100 text-green-800 border-green-200';
      case 'en_cours': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'erreur': return 'bg-red-100 text-red-800 border-red-200';
      case 'planifie': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financier': return <TrendingUp className="w-5 h-5" />;
      case 'comptable': return <FileSpreadsheet className="w-5 h-5" />;
      case 'commercial': return <BarChart3 className="w-5 h-5" />;
      case 'rh': return <Users className="w-5 h-5" />;
      case 'consolidation': return <Building2 className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#171717]/10 text-[#171717] p-2 rounded-lg">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Détails du Rapport</h2>
                <p className="text-sm text-[#737373]">Informations complètes</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Section Identification */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-[#171717] pb-2">
                <span className="w-1 h-4 bg-[#171717] rounded"></span>
                Identification du Rapport
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${
                      rapport.type === 'financier' ? 'bg-blue-100 text-blue-600' :
                      rapport.type === 'commercial' ? 'bg-green-100 text-green-600' :
                      rapport.type === 'rh' ? 'bg-purple-100 text-purple-600' :
                      rapport.type === 'consolidation' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getTypeIcon(rapport.type)}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#171717]">{rapport.nom}</h4>
                      <p className="text-sm text-[#737373]">ID: RPT-{rapport.id}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-[#737373] mb-1">Type de Rapport</p>
                  <p className="font-semibold text-[#171717] capitalize">{rapport.type}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-[#737373] mb-1">Module</p>
                  <p className="font-semibold text-[#171717]">{rapport.module}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-[#737373] mb-1">Statut</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatutColor(rapport.statut)}`}>
                    {rapport.statut === 'termine' && <CheckCircle className="w-4 h-4" />}
                    {rapport.statut === 'en_cours' && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {rapport.statut === 'erreur' && <AlertCircle className="w-4 h-4" />}
                    {rapport.statut === 'planifie' && <Clock className="w-4 h-4" />}
                    {rapport.statut === 'en_cours' ? 'En cours' :
                     rapport.statut === 'termine' ? 'Terminé' :
                     rapport.statut === 'erreur' ? 'Erreur' :
                     rapport.statut === 'planifie' ? 'Planifié' : rapport.statut}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-[#737373] mb-1">Priorité</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    rapport.priorite === 'critique' ? 'bg-red-100 text-red-800' :
                    rapport.priorite === 'haute' ? 'bg-orange-100 text-orange-800' :
                    rapport.priorite === 'normale' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {rapport.priorite === 'critique' && <Flag className="w-3 h-3" />}
                    {rapport.priorite?.charAt(0).toUpperCase() + rapport.priorite?.slice(1) || 'Normale'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section Progression */}
            {rapport.progression !== undefined && rapport.statut === 'en_cours' && (
              <div>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-blue-400 pb-2">
                  <span className="w-1 h-4 bg-blue-500 rounded"></span>
                  Progression
                </h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-700">Génération en cours...</span>
                    <span className="text-lg font-bold text-blue-900">{rapport.progression}%</span>
                  </div>
                  <Progress value={rapport.progression} className="h-3" />
                  <p className="text-xs text-blue-600 mt-2">Temps estimé restant: ~3 minutes</p>
                </div>
              </div>
            )}

            {/* Section Responsable et Dates */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-purple-400 pb-2">
                <span className="w-1 h-4 bg-purple-500 rounded"></span>
                Responsable et Dates
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-700 mb-2">Responsable</p>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {rapport.responsable?.split(' ').map((n: string) => n[0]).join('') || 'NA'}
                    </div>
                    <div>
                      <p className="font-semibold text-purple-900">{rapport.responsable}</p>
                      <p className="text-xs text-purple-600">Créateur</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-[#737373] mb-1">Date de Création</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <p className="font-semibold text-[#171717]">{rapport.dateCreation}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-[#737373] mb-1">Dernière Modification</p>
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-gray-500" />
                    <p className="font-semibold text-[#171717]">{rapport.dateModification}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Fichier */}
            {(rapport.taille || rapport.format) && (
              <div>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-green-400 pb-2">
                  <span className="w-1 h-4 bg-green-500 rounded"></span>
                  Informations du Fichier
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700 mb-1">Format</p>
                    <div className="flex items-center gap-2">
                      <File className="w-5 h-5 text-green-600" />
                      <p className="font-bold text-green-900">{rapport.format || 'PDF'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-[#737373] mb-1">Taille</p>
                    <p className="font-bold text-[#171717]">{rapport.taille || 'Non généré'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-[#737373] mb-1">Téléchargements</p>
                    <p className="font-bold text-[#171717]">12 fois</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section Tags */}
            {rapport.tags && rapport.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-orange-400 pb-2">
                  <span className="w-1 h-4 bg-orange-500 rounded"></span>
                  Tags et Catégories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {rapport.tags.map((tag: string, index: number) => (
                    <span key={index} className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm border border-orange-200">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Section Planification */}
            {rapport.prochaineLancement && (
              <div>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-cyan-400 pb-2">
                  <span className="w-1 h-4 bg-cyan-500 rounded"></span>
                  Planification
                </h3>
                <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-cyan-600" />
                      <div>
                        <p className="font-semibold text-cyan-900">Prochain lancement</p>
                        <p className="text-sm text-cyan-700">{rapport.prochaineLancement}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
                      Automatique
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => toast.success('Impression en cours...')}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://atlasfinance.app/rapports/${rapport.id}`);
                  toast.success('Lien copié !');
                }}
                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Link className="w-4 h-4" />
                Copier le lien
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Fermer
              </button>
              {rapport.statut === 'termine' && (
                <button
                  onClick={() => {
                    toast.success('Téléchargement du rapport...');
                    onClose();
                  }}
                  className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EditReportModalProps extends BaseModalProps {
  rapport: Rapport | null;
  onSave: (data: Rapport) => void;
}

export const EditReportModal: React.FC<EditReportModalProps> = ({ isOpen, onClose, rapport, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<Rapport>(rapport || {} as Rapport);
  const [newTag, setNewTag] = useState('');

  // Sync formData when rapport changes - MUST be before any conditional return
  React.useEffect(() => {
    if (rapport) {
      setFormData(rapport);
    }
  }, [rapport]);

  if (!isOpen || !rapport) return null;

  const handleSave = () => {
    onSave(formData);
    toast.success('Rapport modifié avec succès');
    onClose();
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((tag: string) => tag !== tagToRemove) || []
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                <Edit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Modifier le Rapport</h2>
                <p className="text-sm text-[#737373]">ID: RPT-{rapport.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Nom du rapport */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#171717] rounded"></span>
                Informations Générales
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#171717] mb-1">Nom du rapport *</label>
                  <Input
                    value={formData.nom || ''}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Nom du rapport"
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#171717] mb-1">Type</label>
                    <select
                      value={formData.type || ''}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                    >
                      <option value="financier">Financier</option>
                      <option value="comptable">Comptable</option>
                      <option value="commercial">Commercial</option>
                      <option value="rh">RH</option>
                      <option value="consolidation">Consolidation</option>
                      <option value="personnalise">Personnalisé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#171717] mb-1">Module</label>
                    <select
                      value={formData.module || ''}
                      onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                    >
                      <option value="Finance">Finance</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Human Capital">Human Capital</option>
                      <option value="CRM">CRM</option>
                      <option value="Direction">Direction</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Priorité et Statut */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded"></span>
                Priorité et Statut
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#171717] mb-1">Priorité</label>
                  <select
                    value={formData.priorite || ''}
                    onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#171717] mb-1">Statut</label>
                  <select
                    value={formData.statut || ''}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="termine">Terminé</option>
                    <option value="planifie">Planifié</option>
                    <option value="erreur">Erreur</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Responsable */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded"></span>
                Responsable
              </h3>
              <div>
                <label className="block text-sm font-medium text-[#171717] mb-1">Responsable du rapport</label>
                <Input
                  value={formData.responsable || ''}
                  onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                  placeholder="Nom du responsable"
                  className="w-full"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-cyan-500 rounded"></span>
                Tags
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags?.map((tag: string, index: number) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm border border-cyan-200">
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ajouter un tag..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                if (confirm('Supprimer ce rapport ?')) {
                  toast.success('Rapport supprimé');
                  onClose();
                }
              }}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DownloadReportModalProps extends BaseModalProps {
  rapport: Rapport | null;
}

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({ isOpen, onClose, rapport }) => {
  const { t } = useLanguage();
  const [format, setFormat] = useState('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeData, setIncludeData] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  if (!isOpen || !rapport) return null;

  const handleDownload = () => {
    toast.success(`Téléchargement du rapport en ${format.toUpperCase()}...`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Télécharger le Rapport</h2>
                <p className="text-sm text-[#737373]">Choisissez vos options d'export</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Rapport sélectionné */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-gray-500" />
              <div>
                <p className="font-semibold text-[#171717]">{rapport.nom}</p>
                <p className="text-sm text-[#737373]">{rapport.taille || 'Génération à la demande'}</p>
              </div>
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-bold text-[#171717] mb-3">Format d'export</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'pdf', label: 'PDF', icon: <File className="w-5 h-5" /> },
                { id: 'excel', label: 'Excel', icon: <FileSpreadsheet className="w-5 h-5" /> },
                { id: 'csv', label: 'CSV', icon: <FileText className="w-5 h-5" /> },
                { id: 'json', label: 'JSON', icon: <FileText className="w-5 h-5" /> }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                    format === f.id
                      ? 'border-[#171717] bg-[#171717]/10 text-[#171717]'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {f.icon}
                  <span className="text-xs font-medium">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-bold text-[#171717] mb-3">Options d'inclusion</label>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <PieChart className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-[#171717]">Inclure les graphiques</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-[#171717]">Inclure les données brutes</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeData}
                  onChange={(e) => setIncludeData(e.target.checked)}
                  className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                />
              </label>
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-[#171717]">Inclure le résumé exécutif</span>
                </div>
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                />
              </label>
            </div>
          </div>

          {/* Période */}
          <div>
            <label className="block text-sm font-bold text-[#171717] mb-2">Période des données</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
            >
              <option value="all">Toutes les données</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
              <option value="custom">Personnalisé</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Annuler
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger ({format.toUpperCase()})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ShareableItem {
  id: string;
  nom?: string;
  name?: string;
}

interface ShareModalProps extends BaseModalProps {
  item: ShareableItem | null;
  type: 'rapport' | 'template';
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item, type }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [sharedWith, setSharedWith] = useState<{ email: string; permission: string }[]>([]);
  const [message, setMessage] = useState('');

  if (!isOpen || !item) return null;

  const handleShare = () => {
    if (email && email.includes('@')) {
      setSharedWith([...sharedWith, { email, permission }]);
      setEmail('');
      toast.success(`Invitation envoyée à ${email}`);
    } else {
      toast.error('Veuillez entrer une adresse email valide');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://atlasfinance.app/${type}s/${item.id}`);
    toast.success('Lien copié dans le presse-papier');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Partager</h2>
                <p className="text-sm text-[#737373]">{item.nom || item.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Lien de partage */}
          <div>
            <label className="block text-sm font-bold text-[#171717] mb-2">Lien de partage</label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 truncate">
                https://atlasfinance.app/{type}s/{item.id}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copier
              </button>
            </div>
          </div>

          {/* Invitation par email */}
          <div>
            <label className="block text-sm font-bold text-[#171717] mb-2">Inviter par email</label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email de l'utilisateur"
                className="flex-1"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
              >
                <option value="view">Lecture</option>
                <option value="edit">Édition</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              onClick={handleShare}
              className="mt-3 w-full px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Envoyer l'invitation
            </button>
          </div>

          {/* Message personnalisé */}
          <div>
            <label className="block text-sm font-bold text-[#171717] mb-2">Message (optionnel)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ajouter un message personnalisé..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
            />
          </div>

          {/* Personnes avec accès */}
          {sharedWith.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-[#171717] mb-2">Personnes avec accès</label>
              <div className="space-y-2">
                {sharedWith.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-[#171717]">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#737373] bg-gray-200 px-2 py-1 rounded">
                        {user.permission === 'view' ? 'Lecture' : user.permission === 'edit' ? 'Édition' : 'Admin'}
                      </span>
                      <button
                        onClick={() => setSharedWith(sharedWith.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ScheduleData {
  id?: string;
  rapport: string;
  frequence?: string;
  heure?: string;
  fuseau?: string;
  format?: string;
  destinataires?: string;
  actif?: boolean;
  notifEchec?: boolean;
  piecesJointes?: boolean;
}

interface ScheduleSettingsModalProps extends BaseModalProps {
  schedule: ScheduleData | null;
  onSave: (data: ScheduleData) => void;
}

export const ScheduleSettingsModal: React.FC<ScheduleSettingsModalProps> = ({ isOpen, onClose, schedule, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<ScheduleData>(schedule || {} as ScheduleData);

  // Sync formData when schedule changes - MUST be before any conditional return
  React.useEffect(() => {
    if (schedule) {
      setFormData(schedule);
    }
  }, [schedule]);

  if (!isOpen || !schedule) return null;

  const handleSave = () => {
    onSave(formData);
    toast.success('Planification modifiée avec succès');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#171717]">Paramètres de Planification</h2>
                <p className="text-sm text-[#737373]">{schedule.rapport}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Fréquence */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[#171717] rounded"></span>
                Fréquence d'exécution
              </h3>
              <select
                value={formData.frequence || ''}
                onChange={(e) => setFormData({ ...formData, frequence: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
              >
                <option value="quotidienne">Quotidienne</option>
                <option value="hebdomadaire">Hebdomadaire</option>
                <option value="mensuelle">Mensuelle</option>
                <option value="trimestrielle">Trimestrielle</option>
                <option value="annuelle">Annuelle</option>
              </select>
            </div>

            {/* Heure et jour */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#171717] mb-1">Heure d'exécution</label>
                <Input
                  type="time"
                  value={formData.heure || '09:00'}
                  onChange={(e) => setFormData({ ...formData, heure: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#171717] mb-1">Fuseau horaire</label>
                <select
                  value={formData.fuseau || 'Africa/Douala'}
                  onChange={(e) => setFormData({ ...formData, fuseau: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
                >
                  <option value="Africa/Douala">Africa/Douala (GMT+1)</option>
                  <option value="Africa/Abidjan">Africa/Abidjan (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (GMT+1/+2)</option>
                </select>
              </div>
            </div>

            {/* Format de sortie */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded"></span>
                Format de sortie
              </h3>
              <select
                value={formData.format || 'PDF'}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717]"
              >
                <option value="PDF">PDF</option>
                <option value="Excel">Excel</option>
                <option value="CSV">CSV</option>
              </select>
            </div>

            {/* Destinataires */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-purple-500 rounded"></span>
                Destinataires
              </h3>
              <Input
                type="text"
                value={formData.destinataires || ''}
                onChange={(e) => setFormData({ ...formData, destinataires: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-[#737373] mt-1">Séparez les adresses email par des virgules</p>
            </div>

            {/* Options */}
            <div>
              <h3 className="text-sm font-bold text-[#171717] mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded"></span>
                Options
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm text-[#171717]">Planification active</span>
                  <input
                    type="checkbox"
                    checked={formData.actif !== false}
                    onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                    className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm text-[#171717]">Notification en cas d'échec</span>
                  <input
                    type="checkbox"
                    checked={formData.notifEchec !== false}
                    onChange={(e) => setFormData({ ...formData, notifEchec: e.target.checked })}
                    className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm text-[#171717]">Inclure les pièces jointes</span>
                  <input
                    type="checkbox"
                    checked={formData.piecesJointes !== false}
                    onChange={(e) => setFormData({ ...formData, piecesJointes: e.target.checked })}
                    className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
