import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  X,
  Calendar,
  User,
  Users,
  DollarSign,
  Clock,
  Tag,
  Paperclip,
  AlertCircle,
  CheckCircle,
  Plus,
  Search,
  ChevronDown,
  Upload,
  Trash2,
  UserPlus
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
}

interface Team {
  id: string;
  name: string;
  members: User[];
}

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'cancelled';
  assignedTo: User | null;
  contributors: User[];
  team: Team | null;
  startDate: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  budget: number;
  actualCost: number;
  progress: number;
  tags: string[];
  attachments: File[];
  isRecurrent: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  parentTaskId?: string;
  dependencies: string[];
}

interface AdvancedTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  initialData?: Partial<TaskFormData>;
  mode?: 'create' | 'edit';
}

const AdvancedTaskForm: React.FC<AdvancedTaskFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode = 'create'
}) => {
  const { t } = useLanguage();

  // États du formulaire
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assignedTo: null,
    contributors: [],
    team: null,
    startDate: '',
    dueDate: '',
    estimatedHours: 0,
    actualHours: 0,
    budget: 0,
    actualCost: 0,
    progress: 0,
    tags: [],
    attachments: [],
    isRecurrent: false,
    dependencies: [],
    ...initialData
  });

  // États UI
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showContributorSearch, setShowContributorSearch] = useState(false);
  const [showTeamSearch, setShowTeamSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'assignment' | 'planning' | 'budget' | 'attachments'>('general');

  // Données mockées (à remplacer par des appels API)
  const availableUsers: User[] = [
    { id: '1', name: 'Marie Dupont', email: 'marie.dupont@company.com', department: 'Comptabilité' },
    { id: '2', name: 'Jean Martin', email: 'jean.martin@company.com', department: 'Finance' },
    { id: '3', name: 'Sophie Bernard', email: 'sophie.bernard@company.com', department: 'RH' },
    { id: '4', name: 'Pierre Moreau', email: 'pierre.moreau@company.com', department: 'IT' },
    { id: '5', name: 'Emma Laurent', email: 'emma.laurent@company.com', department: 'Marketing' }
  ];

  const availableTeams: Team[] = [
    { id: '1', name: 'Équipe Comptabilité', members: availableUsers.filter(u => u.department === 'Comptabilité') },
    { id: '2', name: 'Équipe Finance', members: availableUsers.filter(u => u.department === 'Finance') },
    { id: '3', name: 'Task Force Clôture', members: [availableUsers[0], availableUsers[1]] }
  ];

  const suggestedTags = ['Comptabilité', 'Mensuel', 'Récurrent', 'Urgent', 'Clôture', 'Reporting', 'Audit', 'Budget'];

  // Filtrer les utilisateurs pour la recherche
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Gérer l'ajout d'un contributeur
  const addContributor = (user: User) => {
    if (!formData.contributors.find(c => c.id === user.id)) {
      setFormData(prev => ({
        ...prev,
        contributors: [...prev.contributors, user]
      }));
    }
    setShowContributorSearch(false);
    setUserSearchQuery('');
  };

  // Gérer la suppression d'un contributeur
  const removeContributor = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      contributors: prev.contributors.filter(c => c.id !== userId)
    }));
  };

  // Gérer l'ajout d'un tag
  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
    }
  };

  // Gérer la suppression d'un tag
  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  // Gérer l'upload de fichiers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(files)]
      }));
    }
  };

  // Gérer la suppression d'une pièce jointe
  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Validation du formulaire
  const validateForm = () => {
    if (!formData.title.trim()) {
      alert('Le titre est obligatoire');
      return false;
    }
    if (!formData.assignedTo && formData.contributors.length === 0) {
      alert('Veuillez assigner la tâche à au moins une personne');
      return false;
    }
    if (formData.dueDate && formData.startDate && new Date(formData.dueDate) < new Date(formData.startDate)) {
      alert('La date d\'échéance doit être après la date de début');
      return false;
    }
    return true;
  };

  // Soumettre le formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-wisebook-primary to-wisebook-secondary text-wisebook-light">
          <h2 className="text-xl font-bold">
            {mode === 'create' ? 'Créer une nouvelle tâche' : 'Modifier la tâche'}
          </h2>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-lg transition-colors" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-muted/50">
          {[
            { id: 'general', label: 'Général', icon: AlertCircle },
            { id: 'assignment', label: 'Attribution', icon: Users },
            { id: 'planning', label: 'Planification', icon: Calendar },
            { id: 'budget', label: 'Budget & Temps', icon: DollarSign },
            { id: 'attachments', label: 'Pièces jointes', icon: Paperclip }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-wisebook-primary text-wisebook-primary bg-card'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab: Général */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Titre */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary focus:border-transparent"
                    placeholder="Entrez le titre de la tâche"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary focus:border-transparent"
                    rows={4}
                    placeholder="Description détaillée de la tâche"
                  />
                </div>

                {/* Priorité et Statut */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Priorité
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                    >
                      <option value="low">Basse</option>
                      <option value="medium">Moyenne</option>
                      <option value="high">Haute</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Statut
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                    >
                      <option value="todo">À faire</option>
                      <option value="in-progress">En cours</option>
                      <option value="review">En révision</option>
                      <option value="completed">Terminée</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tags
                  </label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-wisebook-primary/20 text-wisebook-primary rounded-full text-sm flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:bg-wisebook-primary/30 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newTag))}
                        className="flex-1 px-3 py-1 border rounded-lg text-sm"
                        placeholder="Ajouter un tag..."
                      />
                      <button
                        type="button"
                        onClick={() => addTag(newTag)}
                        className="px-3 py-1 bg-wisebook-primary text-wisebook-light rounded-lg text-sm hover:bg-wisebook-primary-hover"
                      >
                        Ajouter
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.filter(tag => !formData.tags.includes(tag)).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs hover:bg-muted/80"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Attribution */}
            {activeTab === 'assignment' && (
              <div className="space-y-4">
                {/* Assigné à */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Assigné à *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowUserSearch(!showUserSearch)}
                      className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between hover:bg-muted/50"
                    >
                      {formData.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-wisebook-primary rounded-full flex items-center justify-center text-wisebook-light text-sm">
                            {formData.assignedTo.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium">{formData.assignedTo.name}</div>
                            <div className="text-xs text-muted-foreground">{formData.assignedTo.department}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sélectionner une personne</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {showUserSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-10">
                        <div className="p-2 border-b">
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="w-full px-3 py-1 border rounded"
                            placeholder="Rechercher..."
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, assignedTo: user }));
                                setShowUserSearch(false);
                                setUserSearchQuery('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-2"
                            >
                              <div className="w-8 h-8 bg-wisebook-primary rounded-full flex items-center justify-center text-wisebook-light text-sm">
                                {user.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.department}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contributeurs */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Contributeurs
                  </label>
                  <div className="space-y-2">
                    {formData.contributors.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.contributors.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg"
                          >
                            <div className="w-6 h-6 bg-wisebook-primary rounded-full flex items-center justify-center text-wisebook-light text-xs">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm">{user.name}</span>
                            <button
                              type="button"
                              onClick={() => removeContributor(user.id)}
                              className="hover:bg-muted/80 rounded p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowContributorSearch(!showContributorSearch)}
                      className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted/50"
                    >
                      <UserPlus className="w-4 h-4" />
                      Ajouter un contributeur
                    </button>

                    {showContributorSearch && (
                      <div className="bg-card border rounded-lg shadow-lg p-2">
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full px-3 py-1 border rounded mb-2"
                          placeholder="Rechercher..."
                        />
                        <div className="max-h-32 overflow-y-auto">
                          {filteredUsers
                            .filter(u => u.id !== formData.assignedTo?.id && !formData.contributors.find(c => c.id === u.id))
                            .map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => addContributor(user)}
                                className="w-full px-2 py-1 text-left hover:bg-muted/50 flex items-center gap-2 text-sm"
                              >
                                <div className="w-6 h-6 bg-wisebook-primary rounded-full flex items-center justify-center text-wisebook-light text-xs">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span>{user.name}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Équipe */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Équipe
                  </label>
                  <select
                    value={formData.team?.id || ''}
                    onChange={(e) => {
                      const team = availableTeams.find(t => t.id === e.target.value) || null;
                      setFormData(prev => ({ ...prev, team }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                  >
                    <option value="">Aucune équipe</option>
                    {availableTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.members.length} membres)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Tab: Planification */}
            {activeTab === 'planning' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                    />
                  </div>
                </div>

                {/* Tâche récurrente */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isRecurrent}
                      onChange={(e) => setFormData(prev => ({ ...prev, isRecurrent: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Tâche récurrente</span>
                  </label>

                  {formData.isRecurrent && (
                    <select
                      value={formData.recurrencePattern || 'monthly'}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurrencePattern: e.target.value as any }))}
                      className="mt-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                    >
                      <option value="daily">Quotidien</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuel</option>
                      <option value="yearly">Annuel</option>
                    </select>
                  )}
                </div>

                {/* Progression */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Progression: {formData.progress}%
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={(e) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">{formData.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-wisebook-primary transition-all"
                      style={{ width: `${formData.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Budget & Temps */}
            {activeTab === 'budget' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Heures estimées
                    </label>
                    <input
                      type="number"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Heures réelles
                    </label>
                    <input
                      type="number"
                      value={formData.actualHours}
                      onChange={(e) => setFormData(prev => ({ ...prev, actualHours: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Budget (€)
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Coût réel (€)
                    </label>
                    <input
                      type="number"
                      value={formData.actualCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, actualCost: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-wisebook-primary"
                      min="0"
                      step="100"
                    />
                  </div>
                </div>

                {/* Indicateurs */}
                {(formData.estimatedHours > 0 || formData.budget > 0) && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    {formData.estimatedHours > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground">Efficacité temps</div>
                        <div className="text-lg font-bold">
                          {formData.actualHours > 0
                            ? `${Math.round((formData.actualHours / formData.estimatedHours) * 100)}%`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    )}
                    {formData.budget > 0 && (
                      <div>
                        <div className="text-sm text-muted-foreground">Utilisation budget</div>
                        <div className="text-lg font-bold">
                          {formData.actualCost > 0
                            ? `${Math.round((formData.actualCost / formData.budget) * 100)}%`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Pièces jointes */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Pièces jointes
                  </label>

                  {formData.attachments.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div className="flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cliquez pour ajouter des fichiers</span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/50 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            * Champs obligatoires
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground bg-card border rounded-lg hover:bg-muted/50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-wisebook-primary text-wisebook-light rounded-lg hover:bg-wisebook-primary-hover flex items-center gap-2" aria-label="Valider">
              <CheckCircle className="w-4 h-4" />
              {mode === 'create' ? 'Créer la tâche' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTaskForm;