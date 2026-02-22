import { Task, TaskFilters, TaskStats, TaskStatus, TaskPriority } from '../types/task.types';

class TaskService {
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Valider les factures du mois',
        description: 'Réviser et valider toutes les factures clients pour Mars 2024',
        status: 'in-progress',
        priority: 'high',
        assignee: '',
        assigneeId: 'user-1',
        assigneeTeam: 'Comptabilité',
        dueDate: new Date('2024-04-05'),
        startDate: new Date('2024-03-25'),
        estimatedHours: 8,
        actualHours: 4,
        progress: 50,
        tags: ['comptabilité', 'urgent'],
        category: 'Validation',
        project: 'Clôture mensuelle',
        createdAt: new Date('2024-03-20'),
        createdBy: 'Admin',
        subTasks: [
          { id: 's1', title: 'Réviser factures clients', completed: true },
          { id: 's2', title: 'Vérifier paiements', completed: false }
        ],
        comments: []
      },
      {
        id: '2',
        title: 'Rapprochement bancaire',
        description: 'Effectuer le rapprochement des comptes bancaires',
        status: 'todo',
        priority: 'medium',
        assignee: '',
        assigneeId: 'user-2',
        dueDate: new Date('2024-04-10'),
        estimatedHours: 6,
        progress: 0,
        tags: ['trésorerie'],
        category: 'Trésorerie',
        createdAt: new Date('2024-03-22'),
        subTasks: []
      },
      {
        id: '3',
        title: 'Préparation bilan annuel',
        description: 'Compiler les documents pour le bilan annuel 2023',
        status: 'review',
        priority: 'urgent',
        assignee: '',
        assigneeId: 'user-3',
        dueDate: new Date('2024-04-15'),
        startDate: new Date('2024-03-01'),
        estimatedHours: 40,
        actualHours: 35,
        progress: 85,
        tags: ['bilan', 'annuel'],
        category: 'Reporting',
        project: 'Clôture annuelle',
        createdAt: new Date('2024-03-01'),
        subTasks: []
      },
      {
        id: '4',
        title: 'Saisie écritures comptables',
        description: 'Saisir les écritures du mois de Mars',
        status: 'done',
        priority: 'medium',
        assignee: 'Pierre Leroy',
        assigneeId: 'user-4',
        completedAt: new Date('2024-03-28'),
        dueDate: new Date('2024-03-31'),
        startDate: new Date('2024-03-15'),
        estimatedHours: 12,
        actualHours: 10,
        progress: 100,
        tags: ['saisie'],
        category: 'Saisie',
        createdAt: new Date('2024-03-15'),
        subTasks: []
      },
      {
        id: '5',
        title: 'Relance clients impayés',
        description: 'Contacter les clients avec factures en retard',
        status: 'blocked',
        priority: 'high',
        assignee: 'Lucie Blanc',
        assigneeId: 'user-5',
        dueDate: new Date('2024-04-08'),
        estimatedHours: 4,
        actualHours: 1,
        progress: 20,
        tags: ['recouvrement'],
        category: 'Recouvrement',
        blockedReason: 'En attente de validation direction',
        createdAt: new Date('2024-03-24'),
        subTasks: []
      }
    ];

    return mockTasks;
  }

  async getTask(id: string): Promise<Task | null> {
    const tasks = await this.getTasks();
    return tasks.find(t => t.id === id) || null;
  }

  async createTask(task: Partial<Task>): Promise<Task> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      id: Date.now().toString(),
      title: task.title || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      createdAt: new Date(),
      progress: 0,
      subTasks: [],
      ...task
    } as Task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const task = await this.getTask(id);
    if (!task) throw new Error('Task not found');
    return { ...task, ...updates, modifiedAt: new Date() };
  }

  async deleteTask(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async getStats(): Promise<TaskStats> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const tasks = await this.getTasks();
    const total = tasks.length;
    const byStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdue = tasks.filter(t =>
      t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date()
    ).length;

    const completed = byStatus['done'] || 0;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      todo: byStatus['todo'] || 0,
      inProgress: byStatus['in-progress'] || 0,
      review: byStatus['review'] || 0,
      done: byStatus['done'] || 0,
      cancelled: byStatus['cancelled'] || 0,
      blocked: byStatus['blocked'] || 0,
      overdue,
      completionRate,
      avgCompletionTime: 5.2
    };
  }
}

export const taskService = new TaskService();