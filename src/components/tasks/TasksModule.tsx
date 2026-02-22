/**
 * Module Mes Tâches
 * Gestion des tâches et TODO list pour les utilisateurs
 */

import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  Search,
  MoreVertical,
  Tag,
  User,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  ArrowRight
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  dueDate?: Date;
  tags?: string[];
  completedAt?: Date;
  createdAt: Date;
  progress?: number;
}

const TasksModule: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Révision budget Q2 2024',
      description: 'Analyser et valider le budget prévisionnel du deuxième trimestre',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Jean Dupont',
      dueDate: new Date('2024-03-15'),
      tags: ['Budget', 'Q2'],
      createdAt: new Date(),
      progress: 65
    },
    {
      id: '2',
      title: 'Clôture comptable mensuelle',
      description: 'Finaliser les écritures et préparer les états financiers',
      status: 'todo',
      priority: 'urgent',
      assignee: 'Marie Martin',
      dueDate: new Date('2024-03-10'),
      tags: ['Comptabilité', 'Mensuel'],
      createdAt: new Date()
    },
    {
      id: '3',
      title: 'Audit fournisseurs',
      description: 'Vérifier les contrats et conditions avec les principaux fournisseurs',
      status: 'review',
      priority: 'medium',
      assignee: 'Pierre Durand',
      dueDate: new Date('2024-03-20'),
      tags: ['Audit', 'Fournisseurs'],
      createdAt: new Date(),
      progress: 90
    },
    {
      id: '4',
      title: 'Formation SYSCOHADA',
      description: 'Organiser la session de formation sur les nouvelles normes',
      status: 'done',
      priority: 'low',
      assignee: 'Sophie Leblanc',
      completedAt: new Date('2024-03-01'),
      tags: ['Formation'],
      createdAt: new Date()
    }
  ]);

  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: ''
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'todo': 'bg-gray-100 text-gray-700',
      'in-progress': 'bg-[#171717]/10 text-[#171717]',
      'review': 'bg-yellow-100 text-yellow-700',
      'done': 'bg-green-100 text-green-700'
    };
    return colors[status as keyof typeof colors] || colors.todo;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ArrowUp className="w-4 h-4 text-red-500" />;
      case 'high':
        return <ArrowUp className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <ArrowRight className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <ArrowDown className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter !== 'all' && task.status !== filter) return false;
    if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    done: filteredTasks.filter(t => t.status === 'done')
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const statusFlow = ['todo', 'in-progress', 'review', 'done'];
        const currentIndex = statusFlow.indexOf(task.status);
        const nextStatus = statusFlow[(currentIndex + 1) % statusFlow.length] as Task['status'];
        return { ...task, status: nextStatus };
      }
      return task;
    }));
  };

  const addTask = () => {
    if (!newTask.title) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: 'todo',
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      createdAt: new Date(),
      tags: []
    };

    setTasks(prev => [task, ...prev]);
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
    setShowNewTask(false);
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={() => toggleTaskStatus(task.id)}
            className="mt-1"
          >
            {task.status === 'done' ?
              <CheckCircle2 className="w-5 h-5 text-green-500" /> :
              <Circle className="w-5 h-5 text-gray-700" />
            }
          </button>
          <div className="flex-1">
            <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-700' : ''}`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2">
              {task.dueDate && (
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}
              {task.assignee && (
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <User className="w-3 h-3" />
                  {task.assignee}
                </div>
              )}
              {task.progress !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-[#171717] rounded-full"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-700">{task.progress}%</span>
                </div>
              )}
            </div>
            {task.tags && task.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {task.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getPriorityIcon(task.priority)}
          <button className="p-1 hover:bg-gray-100 rounded">
            <MoreVertical className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mes Tâches</h2>
            <p className="text-sm text-gray-700 mt-1">
              {tasks.length} tâches • {tasksByStatus['in-progress'].length} en cours
            </p>
          </div>
          <button
            onClick={() => setShowNewTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle tâche
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
            <input
              type="text"
              placeholder="Rechercher une tâche..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]/50"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'todo', 'in-progress', 'review', 'done'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-[#525252] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'Toutes' :
                 status === 'todo' ? 'À faire' :
                 status === 'in-progress' ? 'En cours' :
                 status === 'review' ? 'Révision' : 'Terminées'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4">
          {/* Todo Column */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Circle className="w-4 h-4" />
                À faire
              </h3>
              <span className="bg-gray-200 px-2 py-1 rounded-full text-xs">
                {tasksByStatus.todo.length}
              </span>
            </div>
            {tasksByStatus.todo.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {/* In Progress Column */}
          <div className="bg-[#171717]/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#171717] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                En cours
              </h3>
              <span className="bg-[#171717]/20 px-2 py-1 rounded-full text-xs text-[#171717]">
                {tasksByStatus['in-progress'].length}
              </span>
            </div>
            {tasksByStatus['in-progress'].map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {/* Review Column */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-yellow-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Révision
              </h3>
              <span className="bg-yellow-100 px-2 py-1 rounded-full text-xs text-yellow-700">
                {tasksByStatus.review.length}
              </span>
            </div>
            {tasksByStatus.review.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {/* Done Column */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Terminées
              </h3>
              <span className="bg-green-100 px-2 py-1 rounded-full text-xs text-green-700">
                {tasksByStatus.done.length}
              </span>
            </div>
            {tasksByStatus.done.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nouvelle tâche</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]/50"
                  placeholder="Entrez le titre de la tâche"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]/50"
                  rows={3}
                  placeholder="Description optionnelle"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as typeof prev.priority }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]/50"
                  >
                    <option value="low">Faible</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#525252]/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewTask(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addTask}
                className="px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040] transition-colors"
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

export default TasksModule;