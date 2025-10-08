/**
 * Module Complet de Gestion des Tâches
 * Inclut tous les sous-modules et fonctionnalités avancées
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  FileText,
  Link2,
  Paperclip,
  MessageSquare,
  Users,
  Bell,
  BarChart3,
  Target,
  RefreshCw,
  Archive,
  Flag,
  GitBranch,
  Zap,
  Timer,
  Activity,
  CheckSquare,
  List,
  Kanban,
  CalendarDays,
  TrendingUp,
  PieChart,
  Download,
  Upload,
  Settings,
  Mail,
  Phone,
  MapPin,
  Share2,
  Copy,
  History,
  FolderOpen,
  Bookmark,
  Award,
  Briefcase,
  DollarSign,
  Repeat,
  PlayCircle,
  PauseCircle
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  assigneeTeam?: string;
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  completedAt?: Date;
  createdAt: Date;
  createdBy?: string;
  modifiedAt?: Date;
  modifiedBy?: string;
  progress?: number;
  category?: string;
  project?: string;
  subTasks?: SubTask[];
  attachments?: Attachment[];
  comments?: Comment[];
  dependencies?: string[];
  budget?: number;
  actualCost?: number;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  reminders?: Reminder[];
  customFields?: Record<string, any>;
  automationRules?: AutomationRule[];
  labels?: Label[];
  checklist?: ChecklistItem[];
  timeEntries?: TimeEntry[];
  links?: TaskLink[];
  watchers?: string[];
  isTemplate?: boolean;
  templateId?: string;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: string;
  dueDate?: Date;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string;
  type: string;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
  mentions?: string[];
  attachments?: Attachment[];
}

interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

interface Reminder {
  id: string;
  type: 'email' | 'notification' | 'sms';
  beforeDays: number;
  beforeHours: number;
  recipients: string[];
}

interface AutomationRule {
  id: string;
  trigger: string;
  action: string;
  conditions?: Record<string, any>;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

interface TimeEntry {
  id: string;
  date: Date;
  hours: number;
  description?: string;
  user: string;
  billable: boolean;
}

interface TaskLink {
  id: string;
  type: 'blocks' | 'blocked-by' | 'related-to' | 'duplicate-of';
  targetTaskId: string;
}

const CompleteTasksModule: React.FC = () => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Révision budget Q2 2024',
      description: 'Analyser et valider le budget prévisionnel du deuxième trimestre',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Jean Dupont',
      assigneeTeam: 'Finance',
      dueDate: new Date('2024-03-15'),
      startDate: new Date('2024-03-01'),
      estimatedHours: 24,
      actualHours: 18,
      tags: ['Budget', 'Q2', 'Urgent'],
      createdAt: new Date(),
      createdBy: 'Admin',
      progress: 65,
      category: 'Finance',
      project: 'Clôture Q2',
      budget: 5000,
      actualCost: 3250,
      subTasks: [
        { id: 's1', title: 'Collecter données Q1', completed: true },
        { id: 's2', title: 'Analyser tendances', completed: true },
        { id: 's3', title: 'Préparer projection', completed: false }
      ],
      checklist: [
        { id: 'c1', text: 'Vérifier les chiffres de vente', completed: true },
        { id: 'c2', text: 'Calculer les marges', completed: true },
        { id: 'c3', text: 'Valider avec direction', completed: false }
      ],
      watchers: ['Marie Martin', 'Pierre Durand'],
      comments: [
        {
          id: 'com1',
          text: 'Les prévisions semblent optimistes, à revoir',
          author: 'Marie Martin',
          createdAt: new Date('2024-03-05')
        }
      ]
    },
    {
      id: '2',
      title: 'Clôture comptable mensuelle',
      description: 'Finaliser les écritures et préparer les états financiers',
      status: 'todo',
      priority: 'urgent',
      assignee: 'Marie Martin',
      assigneeTeam: 'Comptabilité',
      dueDate: new Date('2024-03-10'),
      tags: ['Comptabilité', 'Mensuel', 'Récurrent'],
      createdAt: new Date(),
      isRecurring: true,
      recurringPattern: {
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 10
      },
      reminders: [
        {
          id: 'r1',
          type: 'email',
          beforeDays: 2,
          beforeHours: 0,
          recipients: ['marie.martin@wisebook.com']
        }
      ]
    },
    {
      id: '3',
      title: 'Audit fournisseurs stratégiques',
      description: 'Vérifier les contrats et conditions avec les principaux fournisseurs',
      status: 'review',
      priority: 'medium',
      assignee: 'Pierre Durand',
      assigneeTeam: 'Achats',
      dueDate: new Date('2024-03-20'),
      tags: ['Audit', 'Fournisseurs', 'Contrats'],
      createdAt: new Date(),
      progress: 90,
      attachments: [
        {
          id: 'a1',
          name: 'Contrats_2024.pdf',
          url: '/files/contrats.pdf',
          size: 2456789,
          uploadedAt: new Date(),
          uploadedBy: 'Pierre Durand',
          type: 'application/pdf'
        }
      ]
    },
    {
      id: '4',
      title: 'Formation SYSCOHADA - Nouvelles normes',
      description: 'Organiser la session de formation sur les nouvelles normes comptables',
      status: 'done',
      priority: 'low',
      assignee: 'Sophie Leblanc',
      assigneeTeam: 'Formation',
      completedAt: new Date('2024-03-01'),
      tags: ['Formation', 'SYSCOHADA', 'Compliance'],
      createdAt: new Date(),
      category: 'Formation',
      timeEntries: [
        {
          id: 't1',
          date: new Date('2024-02-28'),
          hours: 8,
          description: 'Préparation supports',
          user: 'Sophie Leblanc',
          billable: false
        },
        {
          id: 't2',
          date: new Date('2024-03-01'),
          hours: 4,
          description: 'Animation session',
          user: 'Sophie Leblanc',
          billable: true
        }
      ]
    },
    {
      id: '5',
      title: 'Intégration nouveau module CRM',
      description: 'Déployer et configurer le nouveau module CRM dans l\'ERP',
      status: 'blocked',
      priority: 'high',
      assignee: 'Alex Chen',
      assigneeTeam: 'IT',
      dueDate: new Date('2024-03-25'),
      tags: ['IT', 'CRM', 'Intégration'],
      createdAt: new Date(),
      progress: 35,
      dependencies: ['3', '1'],
      links: [
        {
          id: 'l1',
          type: 'blocked-by',
          targetTaskId: '2'
        }
      ]
    }
  ]);

  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'timeline'>('kanban');
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects' | 'team' | 'reports'>('tasks');
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'assignee' | 'project'>('status');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created' | 'title'>('dueDate');

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    tags: [],
    subTasks: [],
    checklist: []
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'todo': 'bg-gray-100 text-gray-700',
      'in-progress': 'bg-[#6A8A82]/10 text-[#6A8A82]',
      'review': 'bg-yellow-100 text-yellow-700',
      'done': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
      'blocked': 'bg-orange-100 text-orange-700'
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

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filter !== 'all' && task.status !== filter) return false;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return task.title.toLowerCase().includes(searchLower) ||
               task.description?.toLowerCase().includes(searchLower) ||
               task.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
               task.assignee?.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [tasks, filter, searchTerm]);

  const tasksByGroup = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    filteredTasks.forEach(task => {
      let key = '';
      switch (groupBy) {
        case 'status':
          key = task.status;
          break;
        case 'priority':
          key = task.priority;
          break;
        case 'assignee':
          key = task.assignee || 'Non assigné';
          break;
        case 'project':
          key = task.project || 'Sans projet';
          break;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(task);
    });

    return grouped;
  }, [filteredTasks, groupBy]);

  const statistics = useMemo(() => {
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'done').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
      highPriority: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      totalBudget: tasks.reduce((sum, t) => sum + (t.budget || 0), 0),
      totalCost: tasks.reduce((sum, t) => sum + (t.actualCost || 0), 0),
      totalHours: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
      avgProgress: Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length)
    };

    stats.completionRate = Math.round((stats.completed / stats.total) * 100);

    return stats;
  }, [tasks]);

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const statusFlow = ['todo', 'in-progress', 'review', 'done'];
        const currentIndex = statusFlow.indexOf(task.status);
        const nextStatus = statusFlow[(currentIndex + 1) % statusFlow.length] as Task['status'];
        return { ...task, status: nextStatus, modifiedAt: new Date() };
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
      status: newTask.status || 'todo',
      priority: newTask.priority || 'medium',
      dueDate: newTask.dueDate,
      createdAt: new Date(),
      tags: newTask.tags || [],
      subTasks: newTask.subTasks || [],
      checklist: newTask.checklist || [],
      progress: 0
    };

    setTasks(prev => [task, ...prev]);
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      tags: [],
      subTasks: [],
      checklist: []
    });
    setShowNewTask(false);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const duplicateTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      title: `${task.title} (Copie)`,
      status: 'todo',
      createdAt: new Date(),
      completedAt: undefined,
      progress: 0
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div className="bg-white rounded-lg p-4 mb-3 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskStatus(task.id);
            }}
            className="mt-1 transition-transform hover:scale-110"
          >
            {task.status === 'done' ?
              <CheckCircle2 className="w-5 h-5 text-green-500" /> :
              task.status === 'blocked' ?
              <AlertCircle className="w-5 h-5 text-orange-500" /> :
              <Circle className="w-5 h-5 text-gray-700" />
            }
          </button>
          <div
            className="flex-1"
            onClick={() => {
              setSelectedTask(task);
              setShowTaskDetails(true);
            }}
          >
            <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-700' : ''}`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs ${
                  new Date(task.dueDate) < new Date() && task.status !== 'done'
                    ? 'text-red-500'
                    : 'text-gray-700'
                }`}>
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

              {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <Timer className="w-3 h-3" />
                  {task.actualHours || 0}/{task.estimatedHours}h
                </div>
              )}

              {task.budget && (
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <DollarSign className="w-3 h-3" />
                  {task.actualCost || 0}/{task.budget}
                </div>
              )}

              {task.isRecurring && (
                <Repeat className="w-3 h-3 text-blue-500" />
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <Paperclip className="w-3 h-3" />
                  {task.attachments.length}
                </div>
              )}

              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <MessageSquare className="w-3 h-3" />
                  {task.comments.length}
                </div>
              )}

              {task.subTasks && task.subTasks.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-700">
                  <CheckSquare className="w-3 h-3" />
                  {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
                </div>
              )}
            </div>

            {task.progress !== undefined && task.progress > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6A8A82] to-[#B87333] transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 font-medium">{task.progress}%</span>
              </div>
            )}

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {task.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-xs rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {getPriorityIcon(task.priority)}
          <div className="relative">
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const KanbanView = () => (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Object.entries(tasksByGroup).map(([group, groupTasks]) => (
        <div key={group} className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 capitalize flex items-center gap-2">
              {groupBy === 'status' && group === 'in-progress' && <Clock className="w-4 h-4" />}
              {groupBy === 'status' && group === 'done' && <CheckCircle2 className="w-4 h-4" />}
              {groupBy === 'status' && group === 'blocked' && <AlertCircle className="w-4 h-4" />}
              {group.replace('-', ' ')}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(group).split(' ').slice(0, 2).join(' ')}`}>
              {groupTasks.length}
            </span>
          </div>
          <div className="space-y-2">
            {groupTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="bg-white rounded-lg shadow">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Titre</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Priorité</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Assigné</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Échéance</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Progrès</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filteredTasks.map(task => (
            <tr key={task.id} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium">{task.title}</div>
                  {task.tags && (
                    <div className="flex gap-1 mt-1">
                      {task.tags.map(tag => (
                        <span key={tag} className="text-xs text-gray-700">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {getPriorityIcon(task.priority)}
                  <span className="text-sm capitalize">{task.priority}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                {task.assignee || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
              </td>
              <td className="px-4 py-3">
                {task.progress !== undefined ? (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-[#6A8A82] rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs">{task.progress}%</span>
                  </div>
                ) : '-'}
              </td>
              <td className="px-4 py-3">
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header avec onglets */}
      <div className="bg-white border-b">
        <div className="px-6 pt-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gestion des Tâches</h2>
              <p className="text-sm text-gray-700 mt-1">
                {statistics.total} tâches • {statistics.inProgress} en cours • {statistics.overdue} en retard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStatistics(!showStatistics)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Statistiques
              </button>
              <button
                onClick={() => setShowAutomation(!showAutomation)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Automation
              </button>
              <button
                onClick={() => setShowNewTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle tâche
              </button>
            </div>
          </div>

          {/* Onglets principaux */}
          <div className="flex gap-6 mt-6 border-b">
            {['tasks', 'projects', 'team', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-[#B87333] border-[#B87333]'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {tab === 'tasks' && 'Mes Tâches'}
                {tab === 'projects' && 'Projets'}
                {tab === 'team' && 'Équipe'}
                {tab === 'reports' && 'Rapports'}
              </button>
            ))}
          </div>
        </div>

        {/* Barre d'outils */}
        <div className="px-6 py-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50 w-64"
                />
              </div>

              {/* Filtres rapides */}
              <div className="flex gap-2">
                {['all', 'todo', 'in-progress', 'review', 'done', 'blocked'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === status
                        ? 'bg-[#B87333] text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                  >
                    {status === 'all' ? 'Toutes' :
                     status === 'todo' ? 'À faire' :
                     status === 'in-progress' ? 'En cours' :
                     status === 'review' ? 'Révision' :
                     status === 'blocked' ? 'Bloquées' : 'Terminées'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Grouper par */}
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
              >
                <option value="status">Grouper par statut</option>
                <option value="priority">Grouper par priorité</option>
                <option value="assignee">Grouper par assigné</option>
                <option value="project">Grouper par projet</option>
              </select>

              {/* Trier par */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
              >
                <option value="dueDate">Trier par échéance</option>
                <option value="priority">Trier par priorité</option>
                <option value="created">Trier par création</option>
                <option value="title">Trier par titre</option>
              </select>

              {/* Mode d'affichage */}
              <div className="flex bg-white border rounded-lg">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 ${viewMode === 'kanban' ? 'bg-[#B87333] text-white' : 'text-gray-600'} rounded-l-lg transition-colors`}
                >
                  <Kanban className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-[#B87333] text-white' : 'text-gray-600'} transition-colors`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 ${viewMode === 'calendar' ? 'bg-[#B87333] text-white' : 'text-gray-600'} transition-colors`}
                >
                  <CalendarDays className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`p-2 ${viewMode === 'timeline' ? 'bg-[#B87333] text-white' : 'text-gray-600'} rounded-r-lg transition-colors`}
                >
                  <GitBranch className="w-4 h-4" />
                </button>
              </div>

              {/* Actions supplémentaires */}
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Télécharger">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Paramètres">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de statistiques (si visible) */}
      {showStatistics && (
        <div className="bg-white border-b px-6 py-4">
          <div className="grid grid-cols-8 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
              <div className="text-xs text-gray-700">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
              <div className="text-xs text-gray-700">Terminées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#6A8A82]">{statistics.inProgress}</div>
              <div className="text-xs text-gray-700">{t('status.inProgress')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.overdue}</div>
              <div className="text-xs text-gray-700">En retard</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{statistics.highPriority}</div>
              <div className="text-xs text-gray-700">Prioritaires</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.completionRate}%</div>
              <div className="text-xs text-gray-700">Complété</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.totalHours}h</div>
              <div className="text-xs text-gray-700">Heures</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#B87333]">{statistics.avgProgress}%</div>
              <div className="text-xs text-gray-700">Progrès moy.</div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'tasks' && (
          <>
            {viewMode === 'kanban' && <KanbanView />}
            {viewMode === 'list' && <ListView />}
            {viewMode === 'calendar' && (
              <div className="bg-white rounded-lg p-6 text-center">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-600">Vue calendrier en cours de développement</p>
              </div>
            )}
            {viewMode === 'timeline' && (
              <div className="bg-white rounded-lg p-6 text-center">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-700" />
                <p className="text-gray-600">Vue timeline en cours de développement</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'projects' && (
          <div className="bg-white rounded-lg p-6 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-600">Module Projets en cours de développement</p>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white rounded-lg p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-600">Module Équipe en cours de développement</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg p-6 text-center">
            <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-700" />
            <p className="text-gray-600">Module Rapports en cours de développement</p>
          </div>
        )}
      </div>

      {/* Modal Nouvelle Tâche */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Créer une nouvelle tâche</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
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
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                  rows={3}
                  placeholder="Description détaillée de la tâche"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priorité
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                  >
                    <option value="low">Faible</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statut initial
                  </label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                  >
                    <option value="todo">À faire</option>
                    <option value="in-progress">{t('status.inProgress')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de début
                  </label>
                  <input
                    type="date"
                    onChange={(e) => setNewTask(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: new Date(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (séparés par des virgules)
                </label>
                <input
                  type="text"
                  onChange={(e) => setNewTask(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                  placeholder="Ex: Budget, Urgent, Q2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heures estimées
                  </label>
                  <input
                    type="number"
                    onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget
                  </label>
                  <input
                    type="number"
                    onChange={(e) => setNewTask(prev => ({ ...prev, budget: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B87333]/50"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewTask(false);
                  setNewTask({
                    title: '',
                    description: '',
                    priority: 'medium',
                    status: 'todo',
                    tags: [],
                    subTasks: [],
                    checklist: []
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addTask}
                className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
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

export default CompleteTasksModule;