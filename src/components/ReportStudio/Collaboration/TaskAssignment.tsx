/**
 * TaskAssignment - Système d'assignation de tâches
 * Permet d'assigner des tâches sur des sections spécifiques
 */

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import {
  ListTodo,
  Plus,
  Check,
  Clock,
  User,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Circle,
  Flag,
  Target,
  Send,
  X,
  Filter,
  Search
} from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee: {
    id: string;
    name: string;
    initials: string;
    avatar?: string;
  };
  createdBy: {
    id: string;
    name: string;
  };
  targetSection?: string;
  targetSectionTitle?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  comments: TaskComment[];
  tags: string[];
}

export interface TaskComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface TaskAssignmentProps {
  tasks: Task[];
  users: { id: string; name: string; initials: string; avatar?: string }[];
  sections: { id: string; title: string }[];
  currentUserId: string;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'comments'>) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddComment: (taskId: string, comment: string) => void;
  className?: string;
}

const statusConfig = {
  pending: { label: 'À faire', color: 'text-gray-600', bg: 'bg-gray-100', icon: Circle },
  in_progress: { label: 'En cours', color: 'text-blue-600', bg: 'bg-blue-100', icon: Clock },
  completed: { label: 'Terminé', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  blocked: { label: 'Bloqué', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle },
};

const priorityConfig = {
  low: { label: 'Basse', color: 'text-gray-500', bg: 'bg-gray-100' },
  medium: { label: 'Normale', color: 'text-blue-500', bg: 'bg-blue-100' },
  high: { label: 'Haute', color: 'text-orange-500', bg: 'bg-orange-100' },
  urgent: { label: 'Urgente', color: 'text-red-500', bg: 'bg-red-100' },
};

export const TaskAssignment: React.FC<TaskAssignmentProps> = ({
  tasks,
  users,
  sections,
  currentUserId,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onAddComment,
  className,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');

  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: '',
    sectionId: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
  });

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    switch (filter) {
      case 'mine':
        return task.assignee.id === currentUserId;
      case 'pending':
        return task.status === 'pending' || task.status === 'in_progress';
      case 'completed':
        return task.status === 'completed';
      default:
        return true;
    }
  });

  const handleCreateTask = () => {
    const assignee = users.find(u => u.id === newTask.assigneeId);
    if (!assignee || !newTask.title) return;

    onCreateTask({
      title: newTask.title,
      description: newTask.description,
      status: 'pending',
      priority: newTask.priority,
      assignee: {
        id: assignee.id,
        name: assignee.name,
        initials: assignee.initials,
      },
      createdBy: { id: currentUserId, name: 'Vous' },
      targetSection: newTask.sectionId || undefined,
      targetSectionTitle: sections.find(s => s.id === newTask.sectionId)?.title,
      dueDate: newTask.dueDate || undefined,
      tags: [],
    });

    setNewTask({
      title: '',
      description: '',
      assigneeId: '',
      sectionId: '',
      priority: 'medium',
      dueDate: '',
    });
    setShowCreateModal(false);
  };

  const handleSubmitComment = () => {
    if (!selectedTask || !newComment.trim()) return;
    onAddComment(selectedTask.id, newComment);
    setNewComment('');
  };

  const renderTaskCard = (task: Task) => {
    const statusCfg = statusConfig[task.status];
    const priorityCfg = priorityConfig[task.priority];
    const StatusIcon = statusCfg.icon;

    return (
      <div
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className={cn(
          'p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md',
          task.status === 'completed' && 'opacity-60',
          selectedTask?.id === task.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateTask(task.id, {
                  status: task.status === 'completed' ? 'pending' : 'completed',
                  completedAt: task.status === 'completed' ? undefined : new Date().toISOString(),
                });
              }}
              className={cn(
                'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 hover:border-primary'
              )}
            >
              {task.status === 'completed' && <Check className="w-3 h-3" />}
            </button>
            <div>
              <p className={cn(
                'font-medium text-gray-900',
                task.status === 'completed' && 'line-through'
              )}>
                {task.title}
              </p>
              {task.targetSectionTitle && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {task.targetSectionTitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2 py-0.5 text-xs rounded-full', priorityCfg.bg, priorityCfg.color)}>
              {priorityCfg.label}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                {task.assignee.initials}
              </span>
              <span className="text-xs text-gray-600">{task.assignee.name}</span>
            </div>
            {task.dueDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.comments.length > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {task.comments.length}
              </span>
            )}
            <span className={cn('flex items-center gap-1 text-xs', statusCfg.color)}>
              <StatusIcon className="w-3 h-3" />
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Task List */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              Tâches
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {filteredTasks.length}
              </span>
            </h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Nouvelle tâche
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une tâche..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'mine', label: 'Mes tâches' },
              { id: 'pending', label: 'À faire' },
              { id: 'completed', label: 'Terminées' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full transition-colors',
                  filter === f.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(renderTaskCard)
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune tâche trouvée</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <div className="w-96 flex flex-col bg-gray-50">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Détails de la tâche</h4>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Title & Description */}
            <div>
              <h5 className="font-medium text-gray-900 text-lg">{selectedTask.title}</h5>
              {selectedTask.description && (
                <p className="text-sm text-gray-600 mt-2">{selectedTask.description}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Statut</label>
              <div className="flex gap-2">
                {Object.entries(statusConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => onUpdateTask(selectedTask.id, { status: key as Task['status'] })}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors',
                        selectedTask.status === key
                          ? `${cfg.bg} ${cfg.color}`
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Priorité</label>
              <div className="flex gap-2">
                {Object.entries(priorityConfig).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => onUpdateTask(selectedTask.id, { priority: key as Task['priority'] })}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors',
                      selectedTask.priority === key
                        ? `${cfg.bg} ${cfg.color}`
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    <Flag className="w-3 h-3" />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Assigné à</label>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
                <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm">
                  {selectedTask.assignee.initials}
                </span>
                <div>
                  <p className="font-medium text-sm">{selectedTask.assignee.name}</p>
                </div>
              </div>
            </div>

            {/* Target Section */}
            {selectedTask.targetSectionTitle && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Section concernée</label>
                <div className="p-2 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{selectedTask.targetSectionTitle}</span>
                </div>
              </div>
            )}

            {/* Due Date */}
            {selectedTask.dueDate && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Échéance</label>
                <div className="p-2 bg-white rounded-lg border border-gray-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{selectedTask.dueDate}</span>
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">Commentaires</label>
              <div className="space-y-2 mb-3">
                {selectedTask.comments.map((comment) => (
                  <div key={comment.id} className="p-2 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{comment.author}</span>
                      <span className="text-xs text-gray-400">{comment.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600">{comment.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                />
                <button
                  onClick={handleSubmitComment}
                  className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <button
              onClick={() => {
                onDeleteTask(selectedTask.id);
                setSelectedTask(null);
              }}
              className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
            >
              Supprimer la tâche
            </button>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Nouvelle tâche</h3>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Ex: Valider la section Risques"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Détails supplémentaires..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigner à *</label>
                <select
                  value={newTask.assigneeId}
                  onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section concernée</label>
                <select
                  value={newTask.sectionId}
                  onChange={(e) => setNewTask({ ...newTask, sectionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Aucune section spécifique</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>{section.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateTask}
                disabled={!newTask.title || !newTask.assigneeId}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                Créer la tâche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskAssignment;
