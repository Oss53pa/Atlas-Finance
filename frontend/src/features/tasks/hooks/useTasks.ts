import { useState, useEffect } from 'react';
import { Task, TaskFilters, TaskStats } from '../types/task.types';
import { taskService } from '../services/taskService';

export const useTasks = (filters?: TaskFilters) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await taskService.getTasks(filters);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement tâches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  return { tasks, loading, error, refetch: fetchTasks };
};

export const useTaskStats = () => {
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await taskService.getStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
};

export const useTask = (id: string) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await taskService.getTask(id);
        setTask(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement tâche');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTask();
    }
  }, [id]);

  return { task, loading, error };
};