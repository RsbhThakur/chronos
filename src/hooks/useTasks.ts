import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task } from '@/types';
import { useDemo } from '@/hooks/useDemo';

export interface UseTasksFilters {
  status?: string;
  priority?: string;
  dueBefore?: string;
}

export const useTasks = (userId: string, filters?: UseTasksFilters) => {
  const [firestoreTasks, setFirestoreTasks] = useState<Task[]>([]);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isDemo, tasks: demoTasks, createTask: demoCreateTask, updateTask: demoUpdateTask, completeTask: demoCompleteTask, deleteTask: demoDeleteTask } = useDemo();

  // Sync demo mode tasks
  useEffect(() => {
    if (isDemo) {
      setFirestoreTasks(demoTasks);
      setLoading(false);
    }
  }, [isDemo, demoTasks]);

  // Real-time Firestore Sync
  useEffect(() => {
    if (isDemo) return;
    if (!userId) {
      Promise.resolve().then(() => {
        setFirestoreTasks([]);
        setLoading(false);
      });
      return;
    }

    Promise.resolve().then(() => {
      setLoading(true);
      setError(null);
    });

    const tasksCollectionRef = collection(db, 'users', userId, 'tasks');
    const unsubscribe = onSnapshot(
      tasksCollectionRef,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            deadline: data.deadline?.toDate ? data.deadline.toDate() : new Date(data.deadline),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : null),
          } as Task;
        });

        setFirestoreTasks(fetched);
        setLoading(false);

        // Clean up completed optimistic tasks that are now present in firestore
        const firestoreIds = new Set(fetched.map((t) => t.id));
        setOptimisticTasks((prev) => prev.filter((ot) => !firestoreIds.has(ot.id)));
      },
      (err) => {
        console.error('Firestore onSnapshot error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  // Combined tasks list (Firestore + Optimistic - Deleted)
  const tasks = useMemo(() => {
    // Filter out deleted task IDs
    const currentFirestore = firestoreTasks.filter((t) => !deletedIds.has(t.id));
    const currentOptimistic = optimisticTasks.filter((t) => !deletedIds.has(t.id));

    // Exclude optimistic tasks that have a matching ID or same title in Firestore to prevent duplicate flash
    const firestoreIds = new Set(currentFirestore.map((t) => t.id));
    const firestoreTitles = new Set(currentFirestore.map((t) => t.title.toLowerCase()));
    
    const uniqueOptimistic = currentOptimistic.filter(
      (t) => !firestoreIds.has(t.id) && !firestoreTitles.has(t.title.toLowerCase())
    );

    let merged = [...currentFirestore, ...uniqueOptimistic];

    // Client-side filtering
    if (filters) {
      if (filters.status) {
        merged = merged.filter((t) => t.status === filters.status);
      }
      if (filters.priority) {
        merged = merged.filter((t) => t.priority === filters.priority);
      }
      if (filters.dueBefore) {
        const cutoff = new Date(filters.dueBefore);
        merged = merged.filter((t) => t.deadline <= cutoff);
      }
    }

    // Client-side sorting: Priority (critical first) then deadline (earliest first)
    const priorityWeight = (p: string) => {
      switch (p) {
        case 'critical': return 0;
        case 'high': return 1;
        case 'medium': return 2;
        default: return 3;
      }
    };

    merged.sort((a, b) => {
      const weightDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (weightDiff !== 0) return weightDiff;
      return a.deadline.getTime() - b.deadline.getTime();
    });

    return merged;
  }, [firestoreTasks, optimisticTasks, deletedIds, filters]);

  // --- CRUD API Calls with Optimistic Updates ---

  const createTask = async (taskInput: Omit<Task, 'id' | 'userId' | 'createdAt' | 'completedAt' | 'actualMinutes' | 'aiGenerated' | 'parentGoalId' | 'rescuePlan' | 'ghostWorkerOutput'> & { parentGoalId?: string | null }) => {
    if (isDemo) {
      return demoCreateTask(taskInput);
    }
    const tempId = 'temp-' + Math.random().toString(36).substring(2, 11);
    const optimisticTask: Task = {
      ...taskInput,
      id: tempId,
      userId,
      status: 'todo',
      actualMinutes: 0,
      subtasks: (taskInput.subtasks || []).map((st) => ({
        id: 'st-temp-' + Math.random().toString(36).substring(2, 11),
        title: st.title,
        completed: st.completed || false,
      })),
      aiGenerated: false,
      parentGoalId: taskInput.parentGoalId || null,
      rescuePlan: null,
      ghostWorkerOutput: null,
      createdAt: new Date(),
      completedAt: null,
    };

    // Add to optimistic state
    setOptimisticTasks((prev) => [...prev, optimisticTask]);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskInput, userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create task');
      }
      
      // Update optimistic task with final server-side data once returned
      if (data.task) {
        setOptimisticTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, ...data.task } : t))
        );
      }
      return data.task;
    } catch (err) {
      const error = err as Error;
      console.error('createTask error:', error);
      setError(error.message);
      // Rollback optimistic task
      setOptimisticTasks((prev) => prev.filter((t) => t.id !== tempId));
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (isDemo) {
      return demoUpdateTask(taskId, updates);
    }
    // Keep reference to previous state for rollback
    const originalTasks = [...firestoreTasks];
    const originalOptimistic = [...optimisticTasks];

    // Optimistically update states
    const updateMapper = (t: Task) => (t.id === taskId ? { ...t, ...updates } : t);
    setFirestoreTasks((prev) => prev.map(updateMapper));
    setOptimisticTasks((prev) => prev.map(updateMapper));

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, updates, userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update task');
      }
      return data.task;
    } catch (err) {
      const error = err as Error;
      console.error('updateTask error:', error);
      setError(error.message);
      // Rollback on failure
      setFirestoreTasks(originalTasks);
      setOptimisticTasks(originalOptimistic);
      throw error;
    }
  };

  const completeTask = async (taskId: string) => {
    if (isDemo) {
      return demoCompleteTask(taskId);
    }
    // Keep reference to previous state for rollback
    const originalTasks = [...firestoreTasks];
    const originalOptimistic = [...optimisticTasks];

    // Optimistically mark as completed
    const completionMapper = (t: Task) =>
      t.id === taskId ? { ...t, status: 'completed' as const, completedAt: new Date() } : t;
    setFirestoreTasks((prev) => prev.map(completionMapper));
    setOptimisticTasks((prev) => prev.map(completionMapper));

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, updates: { status: 'completed' }, userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete task');
      }
      return data.task;
    } catch (err) {
      const error = err as Error;
      console.error('completeTask error:', error);
      setError(error.message);
      // Rollback on failure
      setFirestoreTasks(originalTasks);
      setOptimisticTasks(originalOptimistic);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    if (isDemo) {
      return demoDeleteTask(taskId);
    }
    // Optimistically remove from view
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });

    try {
      const res = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, userId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete task');
      }
    } catch (err) {
      const error = err as Error;
      console.error('deleteTask error:', error);
      setError(error.message);
      // Rollback deleted ID
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      throw error;
    }
  };

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  };
};
