'use client';

import { useContext } from 'react';
import { DemoContext } from '@/lib/demo/demo-context';

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    // Graceful fallback defaults when used outside DemoProvider (e.g. testing)
    return {
      isDemo: false,
      currentMode: 'student' as const,
      demoUser: null as any,
      tasks: [],
      goals: [],
      habits: [],
      gamification: { level: 1, xp: 0, streak: 0, badges: [] },
      analytics: [],
      startDemo: () => {},
      switchDemoMode: () => {},
      exitDemo: () => {},
      createTask: async () => ({} as any),
      updateTask: async () => ({} as any),
      completeTask: async () => ({} as any),
      deleteTask: async () => {},
      createGoal: async () => ({} as any),
      updateGoal: async () => ({} as any),
      deleteGoal: async () => {},
      createHabit: async () => ({} as any),
      logHabitCompletion: async () => ({} as any),
    };
  }
  return context;
};
