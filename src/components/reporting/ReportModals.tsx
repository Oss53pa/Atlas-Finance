import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  X, Download, Share2, Eye, Edit, Settings, Play, Pause, Clock,
  Calendar, Users, Mail, FileText, AlertCircle, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button, Input } from '../ui';
import { Progress } from '../ui/progress';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ViewReportModalProps extends BaseModalProps {
  rapport: any;
}

export const ViewReportModal: React.FC<ViewReportModalProps> = ({ isOpen, onClose, rapport }) => {
  const { t } = useLanguage();
  if (!isOpen || !rapport) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Détails du Rapport</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-[var(--color-background-hover)] rounded" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">{rapport.nom}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Type</p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)] capitalize">{rapport.type}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Module</p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{rapport.module}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Statut</p>
                  <Badge className={
                    rapport.statut === 'termine' ? 'bg-green-100 text-green-700' :
                    rapport.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                    rapport.statut === 'erreur' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }>
                    {rapport.statut === 'en_cours' ? 'En cours' :
                     rapport.statut === 'termine' ? 'Terminé' :
                     rapport.statut === 'erreur' ? 'Erreur' : rapport.statut}
                  </Badge>
                </div>
                {rapport.progression && (
                  <div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-1">Progression</p>
                    <Progress value={rapport.progression} className="h-2" />
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{rapport.progression}%</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Responsable</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[var(--color-text-inverse)] text-sm">
                    {rapport.responsable.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{rapport.responsable}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Créé le</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{rapport.dateCreation}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Modifié le</p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{rapport.dateModification}</p>
              </div>
              {rapport.taille && (
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Taille</p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{rapport.taille}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {rapport.tags?.map((tag: string) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
            <Button
              type="button"
              onClick={() => {
                console.log('Téléchargement du rapport:', rapport);
                // Ici on pourrait ajouter la logique de téléchargement réelle
                onClose();
              }}
              className="bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface EditReportModalProps extends BaseModalProps {
  rapport: any;
  onSave: (data: any) => void;
}

export const EditReportModal: React.FC<EditReportModalProps> = ({ isOpen, onClose, rapport, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(rapport || {});

  if (!isOpen || !rapport) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Edit className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Modifier le Rapport</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Nom du rapport
            </label>
            <Input
              value={formData.nom || ''}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Nom du rapport"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Type
            </label>
            <select
              value={formData.type || ''}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
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
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Priorité
            </label>
            <select
              value={formData.priorite || ''}
              onChange={(e) => setFormData({ ...formData, priorite: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
              <option value="critique">Critique</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DownloadReportModalProps extends BaseModalProps {
  rapport: any;
}

export const DownloadReportModal: React.FC<DownloadReportModalProps> = ({ isOpen, onClose, rapport }) => {
  const { t } = useLanguage();
  const [format, setFormat] = useState('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeData, setIncludeData] = useState(true);

  if (!isOpen || !rapport) return null;

  const handleDownload = () => {
    console.log('Téléchargement:', { rapport, format, includeCharts, includeData });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t('actions.download')}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
              {rapport.nom}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Inclure les graphiques</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeData}
                onChange={(e) => setIncludeData(e.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Inclure les données brutes</span>
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              type="button"
              onClick={handleDownload}
              className="bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ShareModalProps extends BaseModalProps {
  item: any;
  type: 'rapport' | 'template';
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item, type }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [sharedWith, setSharedWith] = useState<string[]>([]);

  if (!isOpen || !item) return null;

  const handleShare = () => {
    if (email) {
      setSharedWith([...sharedWith, email]);
      setEmail('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full m-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Share2 className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Partager</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
              {item.nom || item.name}
            </p>
          </div>

          <div className="flex space-x-2">
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
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="view">Lecture</option>
              <option value="edit">Édition</option>
            </select>
          </div>

          <Button
            type="button"
            onClick={handleShare}
            className="w-full bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>

          {sharedWith.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Partagé avec:</p>
              <div className="space-y-2">
                {sharedWith.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-[var(--color-background-secondary)] rounded">
                    <span className="text-sm text-[var(--color-text-primary)]">{user}</span>
                    <button
                      type="button"
                      onClick={() => setSharedWith(sharedWith.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ScheduleSettingsModalProps extends BaseModalProps {
  schedule: any;
  onSave: (data: any) => void;
}

export const ScheduleSettingsModal: React.FC<ScheduleSettingsModalProps> = ({ isOpen, onClose, schedule, onSave }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState(schedule || {});

  if (!isOpen || !schedule) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Paramètres de Planification</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Fréquence
            </label>
            <select
              value={formData.frequence || ''}
              onChange={(e) => setFormData({ ...formData, frequence: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="quotidienne">Quotidienne</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuelle">Mensuelle</option>
              <option value="trimestrielle">Trimestrielle</option>
              <option value="annuelle">Annuelle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Heure d'exécution
            </label>
            <Input
              type="time"
              value={formData.heure || ''}
              onChange={(e) => setFormData({ ...formData, heure: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Format de sortie
            </label>
            <select
              value={formData.format || ''}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="PDF">PDF</option>
              <option value="Excel">Excel</option>
              <option value="CSV">CSV</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.actif || false}
                onChange={(e) => setFormData({ ...formData, actif: e.target.checked })}
                className="rounded border-[var(--color-border)]"
              />
              <span className="text-sm text-[var(--color-text-primary)]">Planification active</span>
            </label>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};