'use client';

import React, { createContext, useState, useEffect, useRef } from 'react';
import { UserMode, UserProfile, Task, Goal, Habit, DailyAnalytics } from '@/types';
import { demoUsers, getDemoTasks, demoGoals, demoHabits, demoGamification, generateDemoAnalytics, scriptedChatResponses, demoConversations } from './demo-data';

interface DemoContextType {
  isDemo: boolean;
  currentMode: UserMode;
  demoUser: UserProfile;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  gamification: { level: number; xp: number; streak: number; badges: string[] };
  analytics: DailyAnalytics[];
  startDemo: (mode?: UserMode) => void;
  switchDemoMode: (mode: UserMode) => void;
  exitDemo: () => void;
  
  // Local CRUD helpers
  createTask: (taskInput: Omit<Task, 'id' | 'userId' | 'createdAt' | 'completedAt' | 'actualMinutes' | 'aiGenerated' | 'parentGoalId' | 'rescuePlan' | 'ghostWorkerOutput'> & { parentGoalId?: string | null }) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<Task>;
  completeTask: (taskId: string) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  
  createGoal: (goalInput: Omit<Goal, 'id' | 'userId' | 'progress' | 'createdAt'>) => Promise<Goal>;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (goalId: string) => Promise<void>;
  
  createHabit: (habitInput: Omit<Habit, 'id' | 'userId' | 'streak' | 'completedDates'>) => Promise<Habit>;
  logHabitCompletion: (habitId: string) => Promise<{ habit: Habit; streak: number }>;
}

export const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<UserMode>('student');
  const [isSwitching, setIsSwitching] = useState<boolean>(false);
  
  // Active demo data states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [gamification, setGamification] = useState(demoGamification.student);
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);

  // Persistent record to store manually added/edited tasks per mode
  const customTasksRef = useRef<Record<UserMode, Task[]>>({
    student: [],
    professional: [],
    entrepreneur: [],
  });

  // Keep a reference to latest state for fetch interceptor
  const demoStateRef = useRef({
    isDemo,
    currentMode,
    tasks,
    goals,
    habits,
    gamification,
    analytics,
  });

  // Sync state reference
  useEffect(() => {
    demoStateRef.current = {
      isDemo,
      currentMode,
      tasks,
      goals,
      habits,
      gamification,
      analytics,
    };
  }, [isDemo, currentMode, tasks, goals, habits, gamification, analytics]);

  // Read demo mode state from localStorage on init
  useEffect(() => {
    const persistedDemo = localStorage.getItem('chronos_demo_mode') === 'true';
    const persistedMode = localStorage.getItem('chronos_demo_mode_persona') as UserMode || 'student';
    
    if (persistedDemo) {
      setCurrentMode(persistedMode);
      setIsDemo(true);
      
      // Load datasets
      const defaultTasks = getDemoTasks(persistedMode);
      const customTasks = customTasksRef.current[persistedMode];
      
      // Merge: custom tasks replace default tasks if they match by ID, or get appended
      const customIds = new Set(customTasks.map(t => t.id));
      const mergedTasks = [
        ...defaultTasks.filter(t => !customIds.has(t.id)),
        ...customTasks,
      ];

      setTasks(mergedTasks);
      setGoals(demoGoals[persistedMode]);
      setHabits(demoHabits[persistedMode]);
      setGamification(demoGamification[persistedMode]);
      setAnalytics(generateDemoAnalytics(persistedMode, demoUsers[persistedMode].id));
    }
  }, []);

  // Global Network Interceptors
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Save originals
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;
    const originalWebSocket = window.WebSocket;

    // Patch fetch
    window.fetch = async function (input, init) {
      const state = demoStateRef.current;
      if (!state.isDemo) {
        return originalFetch.apply(this, arguments as any);
      }

      const url = typeof input === 'string' ? input : (input as Request).url;

      // Block Google Firebase network traffic
      if (
        url.includes('firestore.googleapis.com') ||
        url.includes('securetoken.googleapis.com') ||
        url.includes('identitytoolkit.googleapis.com') ||
        url.includes('googleapis.com/google.firestore')
      ) {
        console.log('[Demo Network Interceptor] Blocked outgoing Firebase fetch request:', url);
        return new Response(JSON.stringify({ success: true, message: 'Intercepted' }), { status: 200 });
      }

      // Intercept App API endpoints
      if (url.includes('/api/tasks')) {
        const method = init?.method || 'GET';
        
        if (method === 'GET') {
          // Emulate client filtering and sorting
          const { searchParams } = new URL(url, window.location.origin);
          const statusFilter = searchParams.get('status');
          const priorityFilter = searchParams.get('priority');
          const dueBeforeFilter = searchParams.get('dueBefore');

          let filtered = [...state.tasks];
          if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
          if (priorityFilter) filtered = filtered.filter(t => t.priority === priorityFilter);
          if (dueBeforeFilter) {
            const cutoff = new Date(dueBeforeFilter);
            filtered = filtered.filter(t => t.deadline <= cutoff);
          }

          return new Response(JSON.stringify({ success: true, tasks: filtered }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (method === 'POST') {
          const body = JSON.parse(init?.body as string || '{}');
          const newTask = await createTask(body);
          return new Response(JSON.stringify({ success: true, task: newTask }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (method === 'PATCH') {
          const body = JSON.parse(init?.body as string || '{}');
          const { taskId, updates } = body;
          let updatedTask;
          let leveledUp = false;

          if (updates?.status === 'completed') {
            updatedTask = await completeTask(taskId);
            leveledUp = true; // Simulating level up animation trigger
          } else {
            updatedTask = await updateTask(taskId, updates);
          }

          return new Response(JSON.stringify({ success: true, task: updatedTask, leveledUp }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (method === 'DELETE') {
          const body = JSON.parse(init?.body as string || '{}');
          const { taskId } = body;
          await deleteTask(taskId);
          return new Response(JSON.stringify({ success: true, message: 'Deleted' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (url.includes('/api/goals')) {
        const method = init?.method || 'GET';

        if (url.includes('/api/goals/habits')) {
          if (method === 'GET') {
            return new Response(JSON.stringify({ success: true, habits: state.habits }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (method === 'POST') {
            const body = JSON.parse(init?.body as string || '{}');
            const newHabit = await createHabit(body);
            return new Response(JSON.stringify({ success: true, habit: newHabit }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (method === 'PATCH') {
            const body = JSON.parse(init?.body as string || '{}');
            const { habitId } = body;
            const res = await logHabitCompletion(habitId);
            return new Response(JSON.stringify({ success: true, habit: res.habit, streak: res.streak }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } else {
          // Standard Goals routing
          if (method === 'GET') {
            return new Response(JSON.stringify({ success: true, goals: state.goals }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (method === 'POST') {
            const body = JSON.parse(init?.body as string || '{}');
            const newGoal = await createGoal(body);
            return new Response(JSON.stringify({ success: true, goal: newGoal }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (method === 'PATCH') {
            const body = JSON.parse(init?.body as string || '{}');
            const { goalId, updates } = body;
            const updatedGoal = await updateGoal(goalId, updates);
            return new Response(JSON.stringify({ success: true, goal: updatedGoal }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          if (method === 'DELETE') {
            const body = JSON.parse(init?.body as string || '{}');
            const { goalId } = body;
            await deleteGoal(goalId);
            return new Response(JSON.stringify({ success: true, message: 'Goal archived' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      }

      if (url.includes('/api/calendar/sync')) {
        const method = init?.method || 'GET';
        if (method === 'GET') {
          // Mock some external calendar events
          const events = [
            { title: 'Lecture on Neurons', start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), end: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(), description: 'Intro to deep learning' },
            { title: 'Project Sync Meeting', start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), end: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), description: 'Progress alignment' },
          ];
          return new Response(JSON.stringify({ success: true, events }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (method === 'POST') {
          return new Response(JSON.stringify({ success: true, message: 'Synced to Google Calendar successfully' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (url.includes('/api/ai/decompose')) {
        const body = JSON.parse(init?.body as string || '{}');
        const { title, description, deadline } = body;
        
        const goalInput = { title, description, deadline };
        const createdGoal = await createGoal(goalInput);

        // Generate 3 subtasks
        const sub1 = await createTask({ title: `Draft literature for ${title}`, description: 'Phase 1 prep', priority: 'medium', deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), estimatedMinutes: 60, category: 'Research', tags: ['Decomposed'], subtasks: [], parentGoalId: createdGoal.id });
        const sub2 = await createTask({ title: `Prototype code for ${title}`, description: 'Phase 2 implementation', priority: 'high', deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), estimatedMinutes: 180, category: 'Coding', tags: ['Decomposed'], subtasks: [], parentGoalId: createdGoal.id });
        const sub3 = await createTask({ title: `Submit findings for ${title}`, description: 'Phase 3 handoff', priority: 'low', deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), estimatedMinutes: 30, category: 'Documentation', tags: ['Decomposed'], subtasks: [], parentGoalId: createdGoal.id });

        return new Response(JSON.stringify({
          success: true,
          goal: createdGoal,
          tasks: [sub1, sub2, sub3],
          totalHours: 4.5,
          suggestedSchedule: 'A gradual split of 1 hour on Day 1, 3 hours on Day 3, and 30 minutes on Day 6.',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // AI Chat simulation endpoint
      if (url.includes('/api/ai/chat')) {
        const body = JSON.parse(init?.body as string || '{}');
        const { message } = body;
        const normalizedMsg = (message || '').toLowerCase().trim().replace(/[?.,!]/g, '');

        // Match scripted answers
        let responseText = `Yo! I'm Chronos, your AI assistant. Let's make today highly productive!`;
        const answers = scriptedChatResponses[state.currentMode];
        if (answers[normalizedMsg]) {
          responseText = answers[normalizedMsg];
        } else if (normalizedMsg === 'yes please' && state.currentMode === 'student') {
          responseText = `🚨 **RESCUE MODE ACTIVATED!**
Here's your compressed plan:
• **4:15 - 4:35 PM** — Complete Section 3 (Neural Network diagrams)
• **4:35 - 4:55 PM** — Write Results analysis (use template)
• **4:55 - 5:00 PM** — Quick break, stretch
• **5:00 - 5:20 PM** — Write Conclusion + References
• **5:20 - 5:30 PM** — Proofread + Submit

🎯 **Skip**: Formatting bibliography (use auto-cite). You got this! 💪`;
        } else {
          // Tone matching fallbacks
          if (state.currentMode === 'student') {
            responseText = `Hey Arjun! Keep pushing, your Academics tasks look achievable today. Let's focus on the Capstone components. 🎓🔥`;
          } else if (state.currentMode === 'professional') {
            responseText = `Hello Priya. The Sprint review slide notes are prepared. Let's allocate time to review the 3 pending PRs. 📊`;
          } else {
            responseText = `Karan, speed is everything. Let's get the pitch deck final checks completed. Want me to trigger Ghost Worker? 🚀`;
          }
        }

        // Return ReadableStream mimicking SSE with realistic chunk delays
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const words = responseText.split(' ');
            
            // Introduce a short initial delay for realism (300ms)
            await new Promise(resolve => setTimeout(resolve, 300));

            for (let i = 0; i < words.length; i++) {
              const textChunk = (i === 0 ? '' : ' ') + words[i];
              const sseLine = `data: ${JSON.stringify({ type: 'text', content: textChunk })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
              // Delay between words: ~50ms
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }

      return originalFetch.apply(this, arguments as any);
    };

    // Patch XHR
    const originalOpen = originalXHR.prototype.open;
    originalXHR.prototype.open = function (method, url) {
      const state = demoStateRef.current;
      if (state.isDemo && typeof url === 'string') {
        if (
          url.includes('firestore.googleapis.com') ||
          url.includes('securetoken.googleapis.com') ||
          url.includes('identitytoolkit.googleapis.com') ||
          url.includes('googleapis.com/google.firestore')
        ) {
          console.log('[Demo Network Interceptor] Blocked XHR connection to Firebase:', url);
          this.send = function () {
            // Emulate load event instantly with empty response
            Object.defineProperty(this, 'readyState', { value: 4 });
            Object.defineProperty(this, 'status', { value: 200 });
            Object.defineProperty(this, 'responseText', { value: '{}' });
            if (this.onload) {
              const ev = new Event('load');
              this.onload(ev as any);
            }
          };
          return;
        }
      }
      return originalOpen.apply(this, arguments as any);
    };

    // Patch WebSocket
    window.WebSocket = function (url: any, protocols?: any) {
      const state = demoStateRef.current;
      if (state.isDemo && typeof url === 'string' && (url.includes('firestore.googleapis.com') || url.includes('firebase'))) {
        console.log('[Demo Network Interceptor] Blocked WebSocket connection:', url);
        
        const dummyWS = {
          url,
          readyState: 3, // CLOSED
          close: () => {},
          send: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
        };
        return dummyWS as any;
      }
      return new (originalWebSocket as any)(url, protocols);
    } as any;
    
    if (originalWebSocket) {
      window.WebSocket.prototype = originalWebSocket.prototype;
    }

    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = originalXHR;
      window.WebSocket = originalWebSocket;
    };
  }, []);

  // --- CRUD ACTIONS ---

  const createTask = async (taskInput: any) => {
    const tempId = taskInput.id || 'demo-t-' + Math.random().toString(36).substring(2, 11);
    const newTask: Task = {
      id: tempId,
      userId: `demo-${currentMode}-001`,
      title: taskInput.title,
      description: taskInput.description || '',
      status: taskInput.status || 'todo',
      priority: taskInput.priority || 'medium',
      deadline: taskInput.deadline ? new Date(taskInput.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      estimatedMinutes: taskInput.estimatedMinutes || 30,
      actualMinutes: taskInput.actualMinutes || 0,
      category: taskInput.category || 'General',
      tags: taskInput.tags || [],
      subtasks: (taskInput.subtasks || []).map((st: any) => ({
        id: st.id || 'st-' + Math.random().toString(36).substring(2, 9),
        title: st.title,
        completed: !!st.completed,
      })),
      aiGenerated: !!taskInput.aiGenerated,
      parentGoalId: taskInput.parentGoalId || null,
      rescuePlan: taskInput.rescuePlan || null,
      ghostWorkerOutput: taskInput.ghostWorkerOutput || null,
      createdAt: new Date(),
      completedAt: taskInput.completedAt ? new Date(taskInput.completedAt) : null,
    };

    setTasks(prev => {
      const next = [...prev, newTask];
      customTasksRef.current[currentMode] = next.filter(t => t.id.startsWith('demo-t-'));
      return next;
    });

    // Award 10 XP on creation
    setGamification(prev => {
      const nextXp = prev.xp + 10;
      const nextLevel = Math.floor(Math.sqrt(nextXp / 100)) + 1;
      return { ...prev, xp: nextXp, level: nextLevel };
    });

    return newTask;
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    let updated: Task | null = null;
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId) {
          updated = { ...t, ...updates } as Task;
          return updated;
        }
        return t;
      });
      customTasksRef.current[currentMode] = next.filter(t => t.id.startsWith('demo-t-') || t.id === taskId);
      return next;
    });
    return updated || ({} as Task);
  };

  const completeTask = async (taskId: string) => {
    let updated: Task | null = null;
    let xpAward = 10;

    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id === taskId) {
          // Determine completion XP based on priority
          if (t.priority === 'critical') xpAward = 50;
          else if (t.priority === 'high') xpAward = 30;
          else if (t.priority === 'medium') xpAward = 20;
          else xpAward = 10;

          updated = {
            ...t,
            status: 'completed',
            completedAt: new Date(),
          };
          return updated;
        }
        return t;
      });
      customTasksRef.current[currentMode] = next.filter(t => t.id.startsWith('demo-t-') || t.id === taskId);
      return next;
    });

    setGamification(prev => {
      const nextXp = prev.xp + xpAward;
      const nextLevel = Math.floor(Math.sqrt(nextXp / 100)) + 1;
      
      // Update streak
      const nextStreak = prev.streak + 1;

      // Unlock badges based on XP or streak
      const nextBadges = [...prev.badges];
      if (nextStreak >= 10 && !nextBadges.includes('10-Task Streak')) {
        nextBadges.push('10-Task Streak');
      }

      return {
        ...prev,
        xp: nextXp,
        level: nextLevel,
        streak: nextStreak,
        badges: nextBadges,
      };
    });

    return updated || ({} as Task);
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => {
      const next = prev.filter(t => t.id !== taskId);
      customTasksRef.current[currentMode] = next.filter(t => t.id.startsWith('demo-t-'));
      return next;
    });
  };

  const createGoal = async (goalInput: any) => {
    const newGoal: Goal = {
      id: 'demo-g-' + Math.random().toString(36).substring(2, 11),
      userId: `demo-${currentMode}-001`,
      title: goalInput.title,
      description: goalInput.description || '',
      status: 'active',
      progress: 0,
      milestones: (goalInput.milestones || []).map((ms: any) => ({
        id: ms.id || 'm-' + Math.random().toString(36).substring(2, 9),
        title: ms.title,
        completed: false,
        dueDate: ms.dueDate ? new Date(ms.dueDate) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      })),
      linkedTaskIds: goalInput.linkedTaskIds || [],
      createdAt: new Date(),
      deadline: goalInput.deadline ? new Date(goalInput.deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    setGoals(prev => [...prev, newGoal]);
    return newGoal;
  };

  const updateGoal = async (goalId: string, updates: Partial<Goal>) => {
    let updated: Goal | null = null;
    setGoals(prev => {
      return prev.map(g => {
        if (g.id === goalId) {
          // Calculate progress if milestones are updated
          let progress = g.progress;
          if (updates.milestones) {
            const completed = updates.milestones.filter(m => m.completed).length;
            progress = Math.round((completed / updates.milestones.length) * 100);
          }
          updated = { ...g, ...updates, progress } as Goal;
          return updated;
        }
        return g;
      });
    });
    return updated || ({} as Goal);
  };

  const deleteGoal = async (goalId: string) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: 'abandoned' } : g));
  };

  const createHabit = async (habitInput: any) => {
    const newHabit: Habit = {
      id: 'demo-h-' + Math.random().toString(36).substring(2, 11),
      userId: `demo-${currentMode}-001`,
      title: habitInput.title,
      frequency: habitInput.frequency || 'daily',
      completedDates: [],
      streak: 0,
      category: habitInput.category || 'General',
    };

    setHabits(prev => [...prev, newHabit]);
    return newHabit;
  };

  const logHabitCompletion = async (habitId: string) => {
    let updatedHabit: Habit | null = null;
    let newStreak = 0;

    setHabits(prev => {
      return prev.map(h => {
        if (h.id === habitId) {
          const todayStr = new Date().toISOString().split('T')[0];
          const completedDates = [...h.completedDates];
          
          if (!completedDates.includes(todayStr)) {
            completedDates.push(todayStr);
          }

          newStreak = h.streak + 1;
          updatedHabit = {
            ...h,
            completedDates,
            streak: newStreak,
          };
          return updatedHabit;
        }
        return h;
      });
    });

    // Award 10 XP on habit log
    setGamification(prev => {
      const nextXp = prev.xp + 10;
      const nextLevel = Math.floor(Math.sqrt(nextXp / 100)) + 1;
      return { ...prev, xp: nextXp, level: nextLevel };
    });

    return { habit: updatedHabit || ({} as Habit), streak: newStreak };
  };

  // Switch demo modes (Personas)
  const switchDemoMode = (mode: UserMode) => {
    setIsSwitching(true);
    
    setTimeout(() => {
      setCurrentMode(mode);
      localStorage.setItem('chronos_demo_mode_persona', mode);

      // Load base tasks and merge with custom tasks for the new persona
      const defaultTasks = getDemoTasks(mode);
      const customTasks = customTasksRef.current[mode];
      const customIds = new Set(customTasks.map(t => t.id));
      const mergedTasks = [
        ...defaultTasks.filter(t => !customIds.has(t.id)),
        ...customTasks,
      ];

      setTasks(mergedTasks);
      setGoals(demoGoals[mode]);
      setHabits(demoHabits[mode]);
      setGamification(demoGamification[mode]);
      setAnalytics(generateDemoAnalytics(mode, demoUsers[mode].id));

      setIsSwitching(false);
    }, 200); // 200ms shimmer overlay transition
  };

  const startDemo = (mode: UserMode = 'student') => {
    localStorage.setItem('chronos_demo_mode', 'true');
    localStorage.setItem('chronos_demo_mode_persona', mode);
    setCurrentMode(mode);
    setIsDemo(true);
    
    // Load datasets
    const defaultTasks = getDemoTasks(mode);
    const customTasks = customTasksRef.current[mode];
    const customIds = new Set(customTasks.map(t => t.id));
    const mergedTasks = [
      ...defaultTasks.filter(t => !customIds.has(t.id)),
      ...customTasks,
    ];

    setTasks(mergedTasks);
    setGoals(demoGoals[mode]);
    setHabits(demoHabits[mode]);
    setGamification(demoGamification[mode]);
    setAnalytics(generateDemoAnalytics(mode, demoUsers[mode].id));
  };

  const exitDemo = () => {
    localStorage.removeItem('chronos_demo_mode');
    localStorage.removeItem('chronos_demo_mode_persona');
    setIsDemo(false);
    // Reload to clear interceptors and reset hooks
    window.location.reload();
  };

  const demoUser = demoUsers[currentMode];

  return (
    <DemoContext.Provider
      value={{
        isDemo,
        currentMode,
        demoUser,
        tasks,
        goals,
        habits,
        gamification,
        analytics,
        startDemo,
        switchDemoMode,
        exitDemo,
        createTask,
        updateTask,
        completeTask,
        deleteTask,
        createGoal,
        updateGoal,
        deleteGoal,
        createHabit,
        logHabitCompletion,
      }}
    >
      {children}
      
      {/* Floating Cyberpunk Mode Switcher Pill */}
      {isDemo && (
        <div style={{
          position: 'fixed',
          bottom: '25px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(10, 10, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '30px',
          padding: '8px 16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.25)',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontSize: '0.85rem',
        }}>
          <button
            onClick={() => switchDemoMode('student')}
            style={{
              background: currentMode === 'student' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              border: currentMode === 'student' ? '1px solid #00e5ff' : 'none',
              color: currentMode === 'student' ? '#00e5ff' : '#888',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: currentMode === 'student' ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
            }}
          >
            🎓 Student
          </button>
          <button
            onClick={() => switchDemoMode('professional')}
            style={{
              background: currentMode === 'professional' ? 'rgba(191, 0, 255, 0.2)' : 'transparent',
              border: currentMode === 'professional' ? '1px solid #bf00ff' : 'none',
              color: currentMode === 'professional' ? '#bf00ff' : '#888',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: currentMode === 'professional' ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
            }}
          >
            💼 Professional
          </button>
          <button
            onClick={() => switchDemoMode('entrepreneur')}
            style={{
              background: currentMode === 'entrepreneur' ? 'rgba(255, 0, 127, 0.2)' : 'transparent',
              border: currentMode === 'entrepreneur' ? '1px solid #ff007f' : 'none',
              color: currentMode === 'entrepreneur' ? '#ff007f' : '#888',
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: currentMode === 'entrepreneur' ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
            }}
          >
            🚀 Entrepreneur
          </button>
          
          <div style={{ width: '1px', height: '20px', background: '#333', margin: '0 4px' }} />
          
          <button
            onClick={exitDemo}
            style={{
              background: 'rgba(255, 0, 0, 0.15)',
              border: '1px solid #ff0000',
              color: '#ff0000',
              padding: '4px 10px',
              borderRadius: '15px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
          >
            Exit
          </button>
        </div>
      )}

      {/* Shimmer Shroud Transition Overlay */}
      {isSwitching && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          background: 'rgba(5, 5, 10, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <style>{`
            @keyframes pulse {
              0% { opacity: 0.45; transform: scale(0.98); }
              100% { opacity: 1; transform: scale(1.02); text-shadow: 0 0 25px #00e5ff; }
            }
          `}</style>
          <div style={{
            color: '#00e5ff',
            fontFamily: 'var(--font-orbitron), sans-serif',
            fontSize: '1.4rem',
            letterSpacing: '4px',
            fontWeight: 'bold',
            textShadow: '0 0 12px #00e5ff',
            animation: 'pulse 0.4s infinite alternate ease-in-out',
          }}>
            WARPING TIME MATRIX...
          </div>
        </div>
      )}
    </DemoContext.Provider>
  );
};
