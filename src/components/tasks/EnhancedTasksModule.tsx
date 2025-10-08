/**
 * Module Amélioré de Gestion des Tâches
 * Avec permissions par rôle et modal de détail
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import AdvancedTaskForm from './AdvancedTaskForm';
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
  Download,
  Upload,
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
  PauseCircle,
  X,
  Send,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Eye,
  Save,
  ChevronDown
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  assigneeId?: string;
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
  history?: TaskHistory[];
}

interface TaskHistory {
  id: string;
  action: string;
  user: string;
  date: Date;
  details?: string;
  oldValue?: any;
  newValue?: any;
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

interface EnhancedTasksModuleProps {
  userRole?: 'manager' | 'comptable' | 'admin';
  currentUserId?: string;
  currentUser?: string;
}

const EnhancedTasksModule: React.FC<EnhancedTasksModuleProps> = ({
  userRole = 'comptable',
  currentUserId = 'user1',
  currentUser = 'Marie Dupont'
}) => {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Révision budget Q2 2024',
      description: 'Analyser et valider le budget prévisionnel du deuxième trimestre avec les nouvelles projections',
      status: 'in-progress',
      priority: 'high',
      assignee: 'Jean Dupont',
      assigneeId: 'user2',
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
      watchers: ['Marie Dupont', 'Pierre Durand'],
      comments: [
        {
          id: 'com1',
          text: 'Les prévisions semblent optimistes, à revoir',
          author: 'Marie Martin',
          createdAt: new Date('2024-03-05')
        }
      ],
      history: [
        {
          id: 'h1',
          action: 'created',
          user: 'Admin',
          date: new Date('2024-03-01'),
          details: 'Tâche créée'
        },
        {
          id: 'h2',
          action: 'assigned',
          user: 'Admin',
          date: new Date('2024-03-01'),
          oldValue: null,
          newValue: 'Jean Dupont',
          details: 'Tâche assignée à Jean Dupont'
        }
      ]
    },
    {
      id: '2',
      title: 'Clôture comptable mensuelle',
      description: 'Finaliser les écritures et préparer les états financiers',
      status: 'todo',
      priority: 'urgent',
      assignee: 'Marie Dupont',
      assigneeId: 'user1',
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
          recipients: ['marie.dupont@wisebook.com']
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
      assigneeId: 'user3',
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
      title: 'Déclaration TVA mensuelle',
      description: 'Préparer et soumettre la déclaration TVA du mois',
      status: 'todo',
      priority: 'high',
      assignee: 'Marie Dupont',
      assigneeId: 'user1',
      assigneeTeam: 'Comptabilité',
      dueDate: new Date('2024-03-15'),
      tags: ['TVA', 'Déclaration', 'Fiscal'],
      createdAt: new Date(),
      category: 'Fiscal'
    },
    {
      id: '5',
      title: 'Rapport financier trimestriel',
      description: 'Compiler et analyser les données financières du trimestre',
      status: 'in-progress',
      priority: 'medium',
      assignee: 'Sophie Leblanc',
      assigneeId: 'user4',
      assigneeTeam: 'Finance',
      dueDate: new Date('2024-03-25'),
      tags: ['Rapport', 'Finance', 'Trimestriel'],
      createdAt: new Date(),
      progress: 45,
      category: 'Reporting'
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
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState(false);
  const [newComment, setNewComment] = useState('');

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    tags: [],
    subTasks: [],
    checklist: []
  });

  // Liste des utilisateurs disponibles pour l'attribution
  const availableUsers = [
    { id: 'user1', name: 'Marie Dupont', role: 'Comptable', team: 'Comptabilité' },
    { id: 'user2', name: 'Jean Dupont', role: 'Manager', team: 'Finance' },
    { id: 'user3', name: 'Pierre Durand', role: 'Acheteur', team: 'Achats' },
    { id: 'user4', name: 'Sophie Leblanc', role: 'Analyste', team: 'Finance' },
    { id: 'user5', name: 'Alex Chen', role: 'Développeur', team: 'IT' }
  ];

  // Filtrer les tâches selon le rôle
  const visibleTasks = useMemo(() => {
    if (userRole === 'manager' || userRole === 'admin') {
      // Le manager voit toutes les tâches
      return tasks;
    } else {
      // Le comptable ne voit que ses tâches
      return tasks.filter(task => task.assigneeId === currentUserId);
    }
  }, [tasks, userRole, currentUserId]);

  const getStatusColor = (status: string) => {
    const colors = {
      'todo': 'bg-secondary/20 text-secondary-foreground',
      'in-progress': 'bg-wisebook-primary/20 text-wisebook-primary',
      'review': 'bg-warning/20 text-warning-foreground',
      'done': 'bg-success/20 text-success-foreground',
      'cancelled': 'bg-destructive/20 text-destructive-foreground',
      'blocked': 'bg-wisebook-secondary/20 text-wisebook-secondary'
    };
    return colors[status as keyof typeof colors] || colors.todo;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ArrowUp className="w-4 h-4 text-destructive" />;
      case 'high':
        return <ArrowUp className="w-4 h-4 text-wisebook-secondary" />;
      case 'medium':
        return <ArrowRight className="w-4 h-4 text-warning" />;
      case 'low':
        return <ArrowDown className="w-4 h-4 text-success" />;
      default:
        return null;
    }
  };

  const filteredTasks = useMemo(() => {
    return visibleTasks.filter(task => {
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
  }, [visibleTasks, filter, searchTerm]);

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
      total: visibleTasks.length,
      completed: visibleTasks.filter(t => t.status === 'done').length,
      inProgress: visibleTasks.filter(t => t.status === 'in-progress').length,
      overdue: visibleTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
      highPriority: visibleTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      totalBudget: visibleTasks.reduce((sum, t) => sum + (t.budget || 0), 0),
      totalCost: visibleTasks.reduce((sum, t) => sum + (t.actualCost || 0), 0),
      totalHours: visibleTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0),
      avgProgress: Math.round(visibleTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / visibleTasks.length) || 0
    };

    stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return stats;
  }, [visibleTasks]);

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const statusFlow = ['todo', 'in-progress', 'review', 'done'];
        const currentIndex = statusFlow.indexOf(task.status);
        const nextStatus = statusFlow[(currentIndex + 1) % statusFlow.length] as Task['status'];

        // Ajouter à l'historique
        const historyEntry: TaskHistory = {
          id: Date.now().toString(),
          action: 'status_changed',
          user: currentUser,
          date: new Date(),
          oldValue: task.status,
          newValue: nextStatus,
          details: `Statut changé de ${task.status} à ${nextStatus}`
        };

        return {
          ...task,
          status: nextStatus,
          modifiedAt: new Date(),
          modifiedBy: currentUser,
          history: [...(task.history || []), historyEntry]
        };
      }
      return task;
    }));
  };

  const assignTask = (taskId: string, userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return;

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const historyEntry: TaskHistory = {
          id: Date.now().toString(),
          action: 'assigned',
          user: currentUser,
          date: new Date(),
          oldValue: task.assignee,
          newValue: user.name,
          details: `Tâche assignée à ${user.name}`
        };

        return {
          ...task,
          assignee: user.name,
          assigneeId: user.id,
          assigneeTeam: user.team,
          modifiedAt: new Date(),
          modifiedBy: currentUser,
          history: [...(task.history || []), historyEntry]
        };
      }
      return task;
    }));
  };

  const transferTask = (taskId: string, fromUserId: string, toUserId: string) => {
    const toUser = availableUsers.find(u => u.id === toUserId);
    const fromUser = availableUsers.find(u => u.id === fromUserId);
    if (!toUser || !fromUser) return;

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const historyEntry: TaskHistory = {
          id: Date.now().toString(),
          action: 'transferred',
          user: currentUser,
          date: new Date(),
          oldValue: fromUser.name,
          newValue: toUser.name,
          details: `Tâche transférée de ${fromUser.name} à ${toUser.name}`
        };

        return {
          ...task,
          assignee: toUser.name,
          assigneeId: toUser.id,
          assigneeTeam: toUser.team,
          modifiedAt: new Date(),
          modifiedBy: currentUser,
          history: [...(task.history || []), historyEntry]
        };
      }
      return task;
    }));
  };

  const addComment = () => {
    if (!newComment.trim() || !selectedTask) return;

    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment,
      author: currentUser,
      createdAt: new Date()
    };

    setTasks(prev => prev.map(task => {
      if (task.id === selectedTask.id) {
        return {
          ...task,
          comments: [...(task.comments || []), comment]
        };
      }
      return task;
    }));

    setSelectedTask(prev => prev ? {
      ...prev,
      comments: [...(prev.comments || []), comment]
    } : null);

    setNewComment('');
  };

  const addTask = () => {
    if (!newTask.title) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      status: newTask.status || 'todo',
      priority: newTask.priority || 'medium',
      assignee: newTask.assignee || currentUser,
      assigneeId: newTask.assigneeId || currentUserId,
      dueDate: newTask.dueDate,
      createdAt: new Date(),
      createdBy: currentUser,
      tags: newTask.tags || [],
      subTasks: newTask.subTasks || [],
      checklist: newTask.checklist || [],
      progress: 0,
      history: [{
        id: Date.now().toString(),
        action: 'created',
        user: currentUser,
        date: new Date(),
        details: 'Tâche créée'
      }]
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
    setShowTaskDetails(false);
    setSelectedTask(null);
  };

  const duplicateTask = (task: Task) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      title: `${task.title} (Copie)`,
      status: 'todo',
      createdAt: new Date(),
      createdBy: currentUser,
      completedAt: undefined,
      progress: 0,
      history: [{
        id: Date.now().toString(),
        action: 'created',
        user: currentUser,
        date: new Date(),
        details: `Copié depuis la tâche ${task.title}`
      }]
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => (
    <div
      className="bg-card rounded-lg p-4 mb-3 border hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => {
        setSelectedTask(task);
        setShowTaskDetails(true);
      }}
    >
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
              <CheckCircle2 className="w-5 h-5 text-success" /> :
              task.status === 'blocked' ?
              <AlertCircle className="w-5 h-5 text-wisebook-secondary" /> :
              <Circle className="w-5 h-5 text-muted-foreground" />
            }
          </button>
          <div className="flex-1">
            <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {task.dueDate && (
                <div className={`flex items-center gap-1 text-xs ${
                  new Date(task.dueDate) < new Date() && task.status !== 'done'
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}

              {task.assignee && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  {task.assignee}
                </div>
              )}

              {task.estimatedHours && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="w-3 h-3" />
                  {task.actualHours || 0}/{task.estimatedHours}h
                </div>
              )}

              {task.budget && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  {task.actualCost || 0}/{task.budget}
                </div>
              )}

              {task.isRecurring && (
                <Repeat className="w-3 h-3 text-wisebook-primary" />
              )}

              {task.attachments && task.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="w-3 h-3" />
                  {task.attachments.length}
                </div>
              )}

              {task.comments && task.comments.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="w-3 h-3" />
                  {task.comments.length}
                </div>
              )}

              {task.subTasks && task.subTasks.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckSquare className="w-3 h-3" />
                  {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
                </div>
              )}
            </div>

            {task.progress !== undefined && task.progress > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-wisebook-primary to-wisebook-secondary transition-all duration-500"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{task.progress}%</span>
              </div>
            )}

            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {task.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-secondary text-xs rounded-full hover:bg-secondary/80 transition-colors"
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
              onClick={(e) => {
                e.stopPropagation();
                // Menu contextuel
              }}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const TaskDetailsModal = () => {
    if (!selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border shadow-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">Détails de la tâche</h2>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedTask.status)}`}>
                {selectedTask.status}
              </span>
              <div className="flex items-center gap-1">
                {getPriorityIcon(selectedTask.priority)}
                <span className="text-xs capitalize">{selectedTask.priority}</span>
              </div>
            </div>
            <button
              onClick={() => setShowTaskDetails(false)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Titre et description */}
              <div className="mb-6">
                {editingTask ? (
                  <input
                    type="text"
                    value={selectedTask.title}
                    onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                    className="text-2xl font-bold w-full px-3 py-2 border rounded-lg mb-3"
                  />
                ) : (
                  <h3 className="text-2xl font-bold text-foreground mb-3">{selectedTask.title}</h3>
                )}

                {editingTask ? (
                  <textarea
                    value={selectedTask.description}
                    onChange={(e) => setSelectedTask({...selectedTask, description: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={4}
                  />
                ) : (
                  <p className="text-muted-foreground">{selectedTask.description || 'Aucune description'}</p>
                )}
              </div>

              {/* Informations */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Informations</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Statut</span>
                      <select
                        value={selectedTask.status}
                        onChange={(e) => {
                          const newStatus = e.target.value;
                          setSelectedTask({...selectedTask, status: newStatus});
                          setTasks(prev => prev.map(t => {
                            if (t.id === selectedTask.id) {
                              const historyEntry: TaskHistory = {
                                id: Date.now().toString(),
                                action: 'status_changed',
                                user: currentUser,
                                date: new Date(),
                                oldValue: t.status,
                                newValue: newStatus,
                                details: `Statut changé de ${t.status} à ${newStatus}`
                              };
                              return {
                                ...t,
                                status: newStatus,
                                modifiedAt: new Date(),
                                modifiedBy: currentUser,
                                history: [...(t.history || []), historyEntry]
                              };
                            }
                            return t;
                          }));
                        }}
                        className={`px-2 py-1 text-xs rounded-full border-0 font-medium ${getStatusColor(selectedTask.status)}`}
                        disabled={userRole === 'comptable' && selectedTask.assigneeId !== currentUserId}
                      >
                        <option value="todo" className="text-muted-foreground">À faire</option>
                        <option value="in-progress" className="text-wisebook-primary">{t('status.inProgress')}</option>
                        <option value="review" className="text-warning">Révision</option>
                        <option value="testing" className="text-info">Test</option>
                        <option value="done" className="text-success">{t('status.completed')}</option>
                        <option value="blocked" className="text-destructive">Bloqué</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Assigné à</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedTask.assignee}</span>
                        {(userRole === 'manager' || userRole === 'admin') && (
                          <button
                            onClick={() => setShowTransferModal(true)}
                            className="p-1 hover:bg-muted rounded"
                            title="Transférer la tâche"
                          >
                            <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Équipe</span>
                      <span className="text-sm font-medium">{selectedTask.assigneeTeam || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date de début</span>
                      <span className="text-sm font-medium">
                        {selectedTask.startDate ? new Date(selectedTask.startDate).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date d'échéance</span>
                      <span className="text-sm font-medium">
                        {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Créé par</span>
                      <span className="text-sm font-medium">{selectedTask.createdBy || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Créé le</span>
                      <span className="text-sm font-medium">
                        {new Date(selectedTask.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-3">Métriques</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Progression</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full">
                          <div
                            className="h-full bg-wisebook-primary rounded-full"
                            style={{ width: `${selectedTask.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{selectedTask.progress || 0}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Heures</span>
                      <span className="text-sm font-medium">
                        {selectedTask.actualHours || 0}/{selectedTask.estimatedHours || 0}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('navigation.budget')}</span>
                      <span className="text-sm font-medium">
                        {selectedTask.actualCost || 0}€/{selectedTask.budget || 0}€
                      </span>
                    </div>
                    {selectedTask.tags && selectedTask.tags.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">Tags</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedTask.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-secondary text-xs rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-foreground mb-3">Checklist</h4>
                  <div className="space-y-2">
                    {selectedTask.checklist.map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => {
                            // Mise à jour checklist
                          }}
                          className="rounded border-input text-wisebook-primary focus:ring-wisebook-primary"
                        />
                        <span className={item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commentaires */}
              <div className="mb-6">
                <h4 className="font-semibold text-foreground mb-3">Commentaires</h4>
                <div className="space-y-3 mb-4">
                  {selectedTask.comments?.map(comment => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addComment()}
                    placeholder="Ajouter un commentaire..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-wisebook-primary/50"
                  />
                  <button
                    onClick={addComment}
                    className="px-4 py-2 bg-wisebook-primary text-wisebook-light rounded-lg hover:bg-wisebook-primary-hover transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pièces jointes */}
              <div className="mb-6">
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Pièces jointes
                </h4>
                <div className="space-y-2 mb-4">
                  {selectedTask.attachments?.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{attachment.name}</span>
                        <span className="text-xs text-muted-foreground">({attachment.size})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-1 hover:bg-muted rounded transition-colors"
                          title={t('actions.download')} aria-label="Télécharger">
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {(userRole === 'manager' || userRole === 'admin' || selectedTask.assigneeId === currentUserId) && (
                          <button
                            className="p-1 hover:bg-destructive/10 rounded transition-colors"
                            title={t('common.delete')}
                            onClick={() => {
                              // Supprimer la pièce jointe
                              setTasks(prev => prev.map(t => {
                                if (t.id === selectedTask.id) {
                                  return {
                                    ...t,
                                    attachments: t.attachments?.filter((_, i) => i !== index)
                                  };
                                }
                                return t;
                              }));
                              setSelectedTask({
                                ...selectedTask,
                                attachments: selectedTask.attachments?.filter((_, i) => i !== index)
                              });
                            }}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!selectedTask.attachments || selectedTask.attachments.length === 0) && (
                    <p className="text-sm text-muted-foreground">Aucune pièce jointe</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        const newAttachments = Array.from(files).map(file => ({
                          name: file.name,
                          size: `${(file.size / 1024).toFixed(2)} KB`,
                          url: URL.createObjectURL(file),
                          uploadedAt: new Date(),
                          uploadedBy: currentUser
                        }));

                        setTasks(prev => prev.map(t => {
                          if (t.id === selectedTask.id) {
                            return {
                              ...t,
                              attachments: [...(t.attachments || []), ...newAttachments]
                            };
                          }
                          return t;
                        }));

                        setSelectedTask({
                          ...selectedTask,
                          attachments: [...(selectedTask.attachments || []), ...newAttachments]
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-4 py-2 bg-wisebook-secondary text-wisebook-light rounded-lg hover:bg-wisebook-secondary-hover transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Ajouter des fichiers
                  </label>
                </div>
              </div>

              {/* Historique */}
              {selectedTask.history && selectedTask.history.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Historique</h4>
                  <div className="space-y-2">
                    {selectedTask.history.map(entry => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground mt-1.5" />
                        <div className="flex-1">
                          <span className="font-medium">{entry.user}</span>
                          <span className="text-muted-foreground"> {entry.details}</span>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(entry.date).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(userRole === 'manager' || userRole === 'admin') && (
                <>
                  <button
                    onClick={() => setEditingTask(!editingTask)}
                    className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    {editingTask ? 'Annuler' : 'Modifier'}
                  </button>
                  {editingTask && (
                    <button
                      onClick={() => {
                        // Sauvegarder les modifications
                        setTasks(prev => prev.map(t => t.id === selectedTask.id ? selectedTask : t));
                        setEditingTask(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-wisebook-primary text-wisebook-light rounded-lg hover:bg-wisebook-primary-hover transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </button>
                  )}
                  <button
                    onClick={() => duplicateTask(selectedTask)}
                    className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Dupliquer
                  </button>
                  <button
                    onClick={() => deleteTask(selectedTask.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setShowTaskDetails(false)}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TransferModal = () => {
    const [selectedUserId, setSelectedUserId] = useState('');

    if (!showTransferModal || !selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg p-6 w-full max-w-md border shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Transférer la tâche</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Transférer de : <span className="font-bold">{selectedTask.assignee}</span>
            </label>

            <label className="block text-sm font-medium text-foreground mb-2">
              Vers :
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-wisebook-primary/50"
            >
              <option value="">Sélectionner un utilisateur</option>
              {availableUsers
                .filter(u => u.id !== selectedTask.assigneeId)
                .map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.role} ({user.team})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowTransferModal(false);
                setSelectedUserId('');
              }}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (selectedUserId && selectedTask.assigneeId) {
                  transferTask(selectedTask.id, selectedTask.assigneeId, selectedUserId);
                  setShowTransferModal(false);
                  setSelectedUserId('');
                }
              }}
              disabled={!selectedUserId}
              className="px-4 py-2 bg-wisebook-primary text-wisebook-light rounded-lg hover:bg-wisebook-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Transférer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);

    if (draggedTask && draggedTask.status !== newStatus) {
      // Vérifier les permissions
      if (userRole === 'comptable' && draggedTask.assigneeId !== currentUserId) {
        alert('Vous ne pouvez modifier que vos propres tâches');
        return;
      }

      setTasks(prev => prev.map(task => {
        if (task.id === draggedTask.id) {
          const historyEntry: TaskHistory = {
            id: Date.now().toString(),
            action: 'status_changed',
            user: currentUser,
            date: new Date(),
            oldValue: task.status,
            newValue: newStatus,
            details: `Statut changé de ${task.status} à ${newStatus} (drag & drop)`
          };

          return {
            ...task,
            status: newStatus,
            modifiedAt: new Date(),
            modifiedBy: currentUser,
            history: [...(task.history || []), historyEntry]
          };
        }
        return task;
      }));
    }
    setDraggedTask(null);
  };

  const KanbanView = () => (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Object.entries(tasksByGroup).map(([group, groupTasks]) => (
        <div
          key={group}
          className={`bg-muted/50 rounded-lg p-4 min-h-[400px] transition-all ${
            dragOverStatus === group ? 'bg-wisebook-primary/10 ring-2 ring-wisebook-primary' : ''
          }`}
          onDragOver={(e) => groupBy === 'status' && handleDragOver(e, group)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => groupBy === 'status' && handleDrop(e, group)}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground capitalize flex items-center gap-2">
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
              <div
                key={task.id}
                draggable={groupBy === 'status' && (userRole !== 'comptable' || task.assigneeId === currentUserId)}
                onDragStart={(e) => handleDragStart(e, task)}
                className={`cursor-move ${
                  draggedTask?.id === task.id ? 'opacity-50' : ''
                }`}
              >
                <TaskCard task={task} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const ListView = () => (
    <div className="bg-card rounded-lg shadow border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Titre</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Priorité</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Assigné</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Échéance</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Progrès</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filteredTasks.map(task => (
            <tr
              key={task.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => {
                setSelectedTask(task);
                setShowTaskDetails(true);
              }}
            >
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
                        <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
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
                    <div className="w-20 h-2 bg-muted rounded-full">
                      <div
                        className="h-full bg-wisebook-primary rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs">{task.progress}%</span>
                  </div>
                ) : '-'}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="p-1 hover:bg-muted rounded"
                >
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
    <div className="h-full bg-background flex flex-col">
      {/* Header avec onglets */}
      <div className="bg-card border-b">
        <div className="px-6 pt-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {userRole === 'manager' ? 'Gestion des Tâches - Équipe' : 'Mes Tâches'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {statistics.total} tâches • {statistics.inProgress} en cours • {statistics.overdue} en retard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowStatistics(!showStatistics)}
                className="flex items-center gap-2 px-4 py-2 text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Statistiques
              </button>
              {(userRole === 'manager' || userRole === 'admin') && (
                <button
                  onClick={() => setShowAssignModal(!showAssignModal)}
                  className="flex items-center gap-2 px-4 py-2 text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Assigner
                </button>
              )}
              <button
                onClick={() => setShowNewTask(true)}
                className="flex items-center gap-2 px-4 py-2 bg-wisebook-secondary text-wisebook-light rounded-lg hover:bg-wisebook-secondary-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle tâche
              </button>
            </div>
          </div>
        </div>

        {/* Barre d'outils */}
        <div className="px-6 py-3 bg-muted/50 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-wisebook-secondary/50 w-64"
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
                        ? 'bg-wisebook-secondary text-wisebook-light'
                        : 'bg-card text-muted-foreground hover:bg-muted border'
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
              {/* Mode d'affichage */}
              <div className="flex bg-card border rounded-lg">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 ${viewMode === 'kanban' ? 'bg-wisebook-secondary text-wisebook-light' : 'text-muted-foreground'} rounded-l-lg transition-colors`}
                >
                  <Kanban className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-wisebook-secondary text-wisebook-light' : 'text-muted-foreground'} rounded-r-lg transition-colors`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zone de statistiques (si visible) */}
      {showStatistics && (
        <div className="bg-card border-b px-6 py-4">
          <div className="grid grid-cols-8 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{statistics.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{statistics.completed}</div>
              <div className="text-xs text-muted-foreground">Terminées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-wisebook-primary">{statistics.inProgress}</div>
              <div className="text-xs text-muted-foreground">{t('status.inProgress')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{statistics.overdue}</div>
              <div className="text-xs text-muted-foreground">En retard</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-wisebook-secondary">{statistics.highPriority}</div>
              <div className="text-xs text-muted-foreground">Prioritaires</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{statistics.completionRate}%</div>
              <div className="text-xs text-muted-foreground">Complété</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-wisebook-primary">{statistics.totalHours}h</div>
              <div className="text-xs text-muted-foreground">Heures</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-wisebook-secondary">{statistics.avgProgress}%</div>
              <div className="text-xs text-muted-foreground">Progrès moy.</div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'kanban' && <KanbanView />}
        {viewMode === 'list' && <ListView />}
      </div>

      {/* Modals */}
      {showTaskDetails && <TaskDetailsModal />}
      <TransferModal />

      {/* Nouveau Formulaire de Tâche Avancé */}
      <AdvancedTaskForm
        isOpen={showNewTask}
        onClose={() => setShowNewTask(false)}
        onSubmit={(data) => {
          const newTaskData = {
            id: String(Math.max(...tasks.map(t => Number(t.id))) + 1),
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            assignee: data.assignedTo?.name || currentUser,
            assigneeId: data.assignedTo?.id || currentUserId,
            assigneeTeam: data.team?.name || 'Comptabilité',
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            createdAt: new Date(),
            author: currentUser,
            authorId: currentUserId,
            progress: data.progress,
            estimatedHours: data.estimatedHours,
            actualHours: data.actualHours,
            budget: data.budget,
            actualCost: data.actualCost,
            tags: data.tags,
            attachments: data.attachments.map(f => f.name),
            contributors: data.contributors.map(c => c.name),
            isRecurrent: data.isRecurrent,
            recurrencePattern: data.recurrencePattern,
          };
          setTasks(prev => [...prev, newTaskData]);
          setShowNewTask(false);
          // Notification de succès
          alert('Tâche créée avec succès!');
        }}
        mode="create"
      />
    </div>
  );
};

export default EnhancedTasksModule;