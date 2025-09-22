/**
 * Module Mes Tâches avec Sidebar - Version WiseBook
 * Gestion des tâches avec navigation latérale et branding WiseBook
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
  ArrowRight,
  LayoutDashboard,
  CalendarDays,
  FileText,
  FileBarChart,
  Users as UsersIcon,
  UserCheck,
  Settings,
  Activity,
  CheckSquare,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  assigneeAvatar?: string;
  dueDate?: Date;
  tags?: string[];
  completedAt?: Date;
  createdAt: Date;
  progress?: number;
  attachments?: number;
  comments?: number;
}

const TasksModuleWithSidebar: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Révision budget Q2 2024',
      description: 'Note: Analyser les écarts budgétaires',
      status: 'todo',
      priority: 'medium',
      assignee: 'Jean Dupont',
      dueDate: new Date('2024-03-15'),
      tags: ['#budget', '#finance'],
      createdAt: new Date(),
      progress: 40,
      attachments: 12,
      comments: 0
    },
    {
      id: '2',
      title: 'Clôture comptable mensuelle',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Marie Martin',
      dueDate: new Date('2024-03-10'),
      createdAt: new Date(),
      progress: 65,
      attachments: 0,
      comments: 1
    },
    {
      id: '3',
      title: 'Validation des écritures SYSCOHADA',
      status: 'in-progress',
      priority: 'medium',
      assignee: 'Pierre Durand',
      dueDate: new Date('2024-03-20'),
      createdAt: new Date(),
      progress: 48,
      attachments: 12,
      comments: 0
    },
    {
      id: '4',
      title: 'Rapprochement bancaire automatique',
      status: 'review',
      priority: 'high',
      assignee: 'Sophie Leblanc',
      createdAt: new Date(),
      attachments: 12,
      comments: 0
    },
    {
      id: '5',
      title: 'Formation équipe sur nouveau module',
      status: 'review',
      priority: 'medium',
      dueDate: new Date('2024-03-25'),
      assignee: 'Thomas Martin',
      createdAt: new Date(),
      attachments: 12,
      comments: 0
    },
    {
      id: '6',
      title: 'Audit fournisseurs terminé',
      status: 'done',
      priority: 'low',
      assignee: 'Emma Wilson',
      completedAt: new Date('2024-03-01'),
      createdAt: new Date(),
      attachments: 12,
      comments: 0
    }
  ]);

  const [activeSection, setActiveSection] = useState('tasks');
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, count: 0 },
    { id: 'schedule', label: 'Planning', icon: CalendarDays, count: 0 },
    { id: 'note', label: 'Notes', icon: FileText, count: 0 },
    { id: 'report', label: 'Rapports', icon: FileBarChart, count: 0 },
  ];

  const sidebarRecords = [
    { id: 'team', label: 'Équipe', icon: UsersIcon },
    { id: 'clients', label: 'Clients', icon: UserCheck },
  ];

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 60) return 'bg-[#6A8A82]';
    if (progress >= 30) return 'bg-[#F59E0B]';
    return 'bg-[#B87333]';
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

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200 hover:shadow-md transition-shadow">
      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex gap-1 mb-2">
          {task.tags.map((tag, idx) => (
            <span key={idx} className={`text-xs px-2 py-1 rounded-full ${
              idx === 0 ? 'bg-[#6A8A82]/10 text-[#6A8A82]' : 'bg-[#B87333]/10 text-[#B87333]'
            }`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="font-medium text-gray-900 mb-2 text-sm">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 mb-3">{task.description}</p>
      )}

      {/* Progress Bar */}
      {task.progress !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progression</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full">
            <div
              className={`h-full rounded-full ${getProgressColor(task.progress)}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3">
          {/* Assignees */}
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-[#6A8A82]/20 border-2 border-white flex items-center justify-center">
              <User className="w-3 h-3 text-[#6A8A82]" />
            </div>
          </div>

          {/* Attachments */}
          {task.attachments ? (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              📎 {task.attachments}
            </span>
          ) : null}

          {/* Comments */}
          <span className="text-xs text-gray-500 flex items-center gap-1">
            💬 {task.comments || 0}
          </span>
        </div>

        {/* Action Menu */}
        <button className="p-1 hover:bg-gray-100 rounded">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6A8A82] to-[#5A7A72] rounded-lg flex items-center justify-center text-white font-bold shadow-md">
              WB
            </div>
            <div>
              <span className="font-bold text-lg text-gray-900">WiseBook</span>
              <p className="text-xs text-gray-500">Gestion des tâches</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-10 pr-3 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
            />
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 px-4 py-4">
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">PRINCIPAL</p>
            <div className="space-y-1">
              {/* Tasks - Active */}
              <button
                onClick={() => setActiveSection('tasks')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  activeSection === 'tasks'
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">Tâches</span>
                </div>
                <span className="text-xs font-medium bg-[#B87333]/20 text-[#B87333] px-2 py-0.5 rounded-full">
                  6
                </span>
              </button>

              {/* Activities */}
              <button
                onClick={() => setActiveSection('activities')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  activeSection === 'activities'
                    ? 'bg-[#6A8A82]/10 text-[#6A8A82]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-medium">Activités</span>
                </div>
              </button>

              {/* Other Items */}
              {sidebarItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <span className="text-xs text-gray-400">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Records Section */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">GESTION</p>
            <div className="space-y-1">
              {sidebarRecords.map(item => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200">
          {/* Retour Dashboard */}
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors mb-2"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Retour Dashboard</span>
          </button>

          {/* Settings */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Paramètres</span>
          </button>

          {/* User Profile */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3">
              <div className="w-8 h-8 rounded-full bg-[#6A8A82]/20 flex items-center justify-center">
                <User className="w-4 h-4 text-[#6A8A82]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Utilisateur</p>
                <p className="text-xs text-gray-500">user@wisebook.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-semibold text-gray-900">Tableau de bord</h1>
              <select className="text-sm text-gray-600 border-0 focus:ring-0">
                <option>Tâches quotidiennes</option>
                <option>Tâches hebdomadaires</option>
                <option>Tâches mensuelles</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Filtres
              </button>
              <button
                onClick={() => setShowNewTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] text-white rounded-lg hover:from-[#5A7A72] hover:to-[#4A6A62] transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Créer une tâche
              </button>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-gray-500">Mars 2024</span>
            <span className="text-xs text-gray-400">
              Aujourd'hui : {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-4 gap-4 h-full">
            {/* Todo Column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#6A8A82]"></div>
                  <h3 className="font-semibold text-gray-700">À faire</h3>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 space-y-3 bg-gray-50 rounded-lg p-3">
                {tasksByStatus.todo.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                  <h3 className="font-semibold text-gray-700">En cours</h3>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 space-y-3 bg-gray-50 rounded-lg p-3">
                {tasksByStatus['in-progress'].map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* In Review Column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#B87333]"></div>
                  <h3 className="font-semibold text-gray-700">En révision</h3>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 space-y-3 bg-gray-50 rounded-lg p-3">
                {tasksByStatus.review.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                  <h3 className="font-semibold text-gray-700">Terminé</h3>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 space-y-3 bg-gray-50 rounded-lg p-3">
                {tasksByStatus.done.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                  placeholder="Entrez le titre de la tâche"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                  rows={3}
                  placeholder="Description optionnelle"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]">
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
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
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
                onClick={() => setShowNewTask(false)}
                className="px-4 py-2 bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] text-white rounded-lg hover:from-[#5A7A72] hover:to-[#4A6A62] transition-all"
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

export default TasksModuleWithSidebar;