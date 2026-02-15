import React, { useState } from 'react';
import { Plus, List, Kanban, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal, ModalBody, ModalFooter } from '@/shared/components/ui/Modal';
import { useModal } from '@/shared/hooks';
import { useTasks, useTaskStats } from '../hooks/useTasks';
import { TaskStats } from '../components/TaskStats';
import { TaskTable } from '../components/TaskTable';
import { TaskFilters } from '../components/TaskFilters';
import { TaskFilters as Filters, TaskView, Task } from '../types/task.types';

const TasksPage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<TaskView>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const { tasks, loading: tasksLoading, refetch } = useTasks(filters);
  const { stats, loading: statsLoading } = useTaskStats();

  const newTaskModal = useModal();
  const taskDetailModal = useModal();

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    taskDetailModal.open();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#191919]">Gestion des Tâches</h1>
          <p className="text-[#767676] mt-1">
            Planifiez, suivez et collaborez sur vos tâches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#ECECEC] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-[#767676] hover:bg-[#D9D9D9]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-[#767676] hover:bg-[#D9D9D9]'
              }`}
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-[#767676] hover:bg-[#D9D9D9]'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          <Button icon={Plus} onClick={newTaskModal.open}>
            Nouvelle Tâche
          </Button>
        </div>
      </div>

      <TaskStats stats={stats} loading={statsLoading} />

      <TaskFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <div className="bg-white rounded-lg border border-[#D9D9D9] p-6">
        {viewMode === 'list' && (
          <TaskTable
            tasks={tasks}
            loading={tasksLoading}
            onTaskClick={handleTaskClick}
          />
        )}

        {viewMode === 'kanban' && (
          <div className="text-center text-[#767676] py-8">
            Vue Kanban à implémenter
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="text-center text-[#767676] py-8">
            Vue Calendrier à implémenter
          </div>
        )}
      </div>

      <Modal
        isOpen={newTaskModal.isOpen}
        onClose={newTaskModal.close}
        title="Nouvelle Tâche"
        size="lg"
      >
        <ModalBody>
          <div className="text-center text-[#767676] py-8">
            Formulaire de création de tâche à implémenter
          </div>
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newTaskModal.close}>
              Annuler
            </Button>
            <Button onClick={newTaskModal.close}>
              Créer
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={taskDetailModal.isOpen}
        onClose={taskDetailModal.close}
        title={selectedTask?.title || 'Détail de la tâche'}
        size="xl"
      >
        <ModalBody>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-[#767676]">Description</p>
                <p className="text-[#191919]">
                  {selectedTask.description || 'Aucune description'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#767676]">Statut</p>
                  <p className="font-semibold">{selectedTask.status}</p>
                </div>
                <div>
                  <p className="text-sm text-[#767676]">Priorité</p>
                  <p className="font-semibold">{selectedTask.priority}</p>
                </div>
                <div>
                  <p className="text-sm text-[#767676]">Assigné à</p>
                  <p className="font-semibold">{selectedTask.assignee || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#767676]">Progression</p>
                  <p className="font-semibold">{selectedTask.progress || 0}%</p>
                </div>
              </div>

              {selectedTask.subTasks && selectedTask.subTasks.length > 0 && (
                <div>
                  <p className="text-sm text-[#767676] mb-2">Sous-tâches</p>
                  <div className="space-y-2">
                    {selectedTask.subTasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          readOnly
                          className="rounded"
                        />
                        <span className={subtask.completed ? 'line-through text-[#767676]' : ''}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={taskDetailModal.close}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default TasksPage;