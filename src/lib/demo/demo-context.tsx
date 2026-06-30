'use client';

import React, { createContext, useState, useEffect, useRef } from 'react';
import { UserMode, UserProfile, Task, Goal, Habit, DailyAnalytics, RescueSeverity } from '@/types';
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
  updateDemoUser: (updates: Partial<UserProfile>) => Promise<UserProfile>;
}

export const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [currentMode, setCurrentMode] = useState<UserMode>('student');
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  // Helper to load profile for a mode, using localStorage custom profile if available
  const getProfileForMode = (mode: UserMode): UserProfile => {
    if (typeof window === 'undefined') return demoUsers[mode];
    const storedProfiles = localStorage.getItem('chronos_demo_profiles');
    if (storedProfiles) {
      try {
        const parsed = JSON.parse(storedProfiles);
        if (parsed[mode]) {
          const profile = parsed[mode];
          if (profile.createdAt && typeof profile.createdAt === 'string') {
            profile.createdAt = new Date(profile.createdAt);
          }
          return profile;
        }
      } catch (err) {
        console.error('Failed to parse stored demo profiles:', err);
      }
    }
    return demoUsers[mode];
  };

  // Active demo user profile state
  const [demoUser, setDemoUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const persistedMode = localStorage.getItem('chronos_demo_mode_persona') as UserMode || 'student';
      const storedProfiles = localStorage.getItem('chronos_demo_profiles');
      if (storedProfiles) {
        try {
          const parsed = JSON.parse(storedProfiles);
          if (parsed[persistedMode]) {
            const profile = parsed[persistedMode];
            if (profile.createdAt && typeof profile.createdAt === 'string') {
              profile.createdAt = new Date(profile.createdAt);
            }
            return profile;
          }
        } catch (err) {
          console.error('Failed to parse stored demo profiles on init:', err);
        }
      }
      return demoUsers[persistedMode];
    }
    return demoUsers.student;
  });
  
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
    
    // Set active demoUser from localStorage or default
    setDemoUser(getProfileForMode(persistedMode));

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

      let url = '';
      if (typeof input === 'string') {
        url = input;
      } else if (input && typeof input === 'object') {
        if ('url' in input) {
          url = (input as any).url || '';
        } else if (typeof input.toString === 'function') {
          url = input.toString();
        }
      }

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

      if (url.includes('/api/ai/rescue')) {
        const method = init?.method || 'GET';
        if (method === 'GET') {
          const rescuedTasks = state.tasks.filter(t => t.status === 'rescued' && t.rescuePlan);
          const activeRescuePlans = rescuedTasks.map(t => ({
            taskId: t.id,
            taskTitle: t.title,
            rescuePlan: t.rescuePlan
          }));
          return new Response(JSON.stringify({ success: true, activeRescuePlans }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (method === 'POST') {
          const body = JSON.parse(init?.body as string || '{}');
          const { taskId } = body;
          const task = state.tasks.find(t => t.id === taskId);
          if (!task) {
            return new Response(JSON.stringify({ success: false, error: 'Task not found' }), { status: 404 });
          }

          const now = new Date();
          const deadline = new Date(task.deadline);
          const totalMinutesAvailable = Math.max(15, Math.floor((deadline.getTime() - now.getTime()) / 60000));
          
          let severity: RescueSeverity = 'yellow';
          if (totalMinutesAvailable < 60) severity = 'red';
          else if (totalMinutesAvailable < 120) severity = 'orange';

          const planSteps = [
            { id: 'step-1', timeBlock: 'Next 15 mins', action: `Deconstruct & outline: ${task.title}`, estimatedMinutes: 15, tips: 'Isolate critical paths and list core functions.', canBeSkipped: false, completed: false },
            { id: 'step-2', timeBlock: 'Next 30 mins', action: `Rapid prototyping & logic implementation`, estimatedMinutes: 30, tips: 'Focus on minimal viable code blocks. Avoid refactoring.', canBeSkipped: false, completed: false },
            { id: 'step-3', timeBlock: 'Next 15 mins', action: `Quick verification & safety checks`, estimatedMinutes: 15, tips: 'Ensure edge-cases compile. No comprehensive unit tests.', canBeSkipped: true, completed: false }
          ];

          const rescuePlan = {
            severity,
            totalMinutesAvailable,
            totalMinutesNeeded: 60,
            feasible: totalMinutesAvailable >= 60,
            plan: planSteps,
            sacrifices: ['Detailed visual styling', 'Extensive error logging and analytics track hooks'],
            motivationalMessage: 'Focus on progress over perfection. Let\'s conquer this step-by-step!',
            checkpoints: [
              { time: 'T+15m', milestone: 'Requirements locked', reached: false },
              { time: 'T+45m', milestone: 'Core implementation compiles', reached: false }
            ],
            activatedAt: now,
            completedSteps: 0
          };

          await updateTask(taskId, { status: 'rescued', rescuePlan });

          return new Response(JSON.stringify({ success: true, rescuePlan }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (method === 'PATCH') {
          const body = JSON.parse(init?.body as string || '{}');
          const { taskId, stepId, completed } = body;
          const task = state.tasks.find(t => t.id === taskId);
          if (!task || !task.rescuePlan) {
            return new Response(JSON.stringify({ success: false, error: 'Task or rescue plan not found' }), { status: 404 });
          }

          const updatedSteps = task.rescuePlan.plan.map((step: any) => {
            if (step.id === stepId) {
              return { ...step, completed };
            }
            return step;
          });

          const completedCount = updatedSteps.filter((s: any) => s.completed).length;

          const updatedRescuePlan = {
            ...task.rescuePlan,
            plan: updatedSteps,
            completedSteps: completedCount
          };

          await updateTask(taskId, { rescuePlan: updatedRescuePlan });

          return new Response(JSON.stringify({ success: true, rescuePlan: updatedRescuePlan }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      if (url.includes('/api/ai/ghost-worker')) {
        const method = init?.method || 'POST';
        if (method === 'POST') {
          const body = JSON.parse(init?.body as string || '{}');
          const { taskId, deliverableType, additionalContext } = body;
          const task = state.tasks.find(t => t.id === taskId);
          if (!task) {
            return new Response(JSON.stringify({ success: false, error: 'Task not found' }), { status: 404 });
          }

          const output = {
            type: deliverableType,
            title: `${deliverableType.toUpperCase()} Draft - ${task.title}`,
            content: `### Autogenerated ${deliverableType}\n\nThis is a premium ${deliverableType} draft created by **Chronos Ghost Worker Agent** for task **${task.title}**.\n\n#### Context details:\n* Task Title: ${task.title}\n* Additional context: ${additionalContext || 'None provided.'}\n\n#### Content Draft:\nHere is the body content designed automatically around the deliverable requirements. Edit any details or sections that need customization.\n\n\`\`\`\n[PLACEHOLDER] Fill in specific names and links\n\`\`\`\n\nHope this boosts your speed!`,
            generatedAt: new Date(),
            approved: false,
            edits: null
          };

          await updateTask(taskId, { ghostWorkerOutput: output });

          return new Response(JSON.stringify({ success: true, output }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (method === 'PATCH') {
          const body = JSON.parse(init?.body as string || '{}');
          const { taskId, approved, edits } = body;
          const task = state.tasks.find(t => t.id === taskId);
          if (!task || !task.ghostWorkerOutput) {
            return new Response(JSON.stringify({ success: false, error: 'Task or Ghost Worker output not found' }), { status: 404 });
          }

          const updatedOutput = {
            ...task.ghostWorkerOutput,
            approved: approved ?? task.ghostWorkerOutput.approved,
            edits: edits !== undefined ? edits : task.ghostWorkerOutput.edits,
            content: edits || task.ghostWorkerOutput.content
          };

          await updateTask(taskId, { ghostWorkerOutput: updatedOutput });

          return new Response(JSON.stringify({ success: true, output: updatedOutput }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
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

      // Intercept GET /api/analytics
      if (url.includes('/api/analytics') && !url.includes('/api/analytics/log') && !url.includes('/api/analytics/export')) {
        const { searchParams } = new URL(url, window.location.origin);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let filtered = [...state.analytics];
        if (startDate) {
          filtered = filtered.filter(d => d.date >= startDate);
        }
        if (endDate) {
          filtered = filtered.filter(d => d.date <= endDate);
        }

        return new Response(JSON.stringify({ success: true, analytics: filtered }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Intercept POST /api/analytics/log
      if (url.includes('/api/analytics/log')) {
        const body = JSON.parse(init?.body as string || '{}');
        const { event, value } = body;
        const todayStr = new Date().toISOString().split('T')[0];

        let updatedAnalytics = [...state.analytics];
        let todayIdx = updatedAnalytics.findIndex(d => d.date === todayStr);

        let todayData = todayIdx >= 0 ? { ...updatedAnalytics[todayIdx] } : {
          date: todayStr,
          tasksCompleted: 0,
          tasksCreated: 0,
          focusMinutes: 0,
          rescueModeActivations: 0,
          productivityScore: 0,
          bottlenecksDetected: [],
        };

        if (event === 'task_completed' || event === 'tasksCompleted') {
          todayData.tasksCompleted = (todayData.tasksCompleted || 0) + 1;
        } else if (event === 'task_created' || event === 'tasksCreated') {
          todayData.tasksCreated = (todayData.tasksCreated || 0) + 1;
        } else if (event === 'rescue_activated' || event === 'rescueModeActivations') {
          todayData.rescueModeActivations = (todayData.rescueModeActivations || 0) + 1;
        } else if (event === 'focus_minutes' || event === 'focusMinutes') {
          const minutes = typeof value === 'number' ? value : 25;
          todayData.focusMinutes = (todayData.focusMinutes || 0) + minutes;
        }

        const calculatedScore = Math.min(
          100,
          (todayData.tasksCompleted * 15) + Math.floor(todayData.focusMinutes / 3) + (todayData.rescueModeActivations * 10)
        );
        todayData.productivityScore = calculatedScore > 0 ? calculatedScore : 0;

        if (todayIdx >= 0) {
          updatedAnalytics[todayIdx] = todayData;
        } else {
          updatedAnalytics.push(todayData);
        }

        setAnalytics(updatedAnalytics);

        return new Response(JSON.stringify({ success: true, date: todayStr, analytics: todayData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Intercept GET /api/analytics/export
      if (url.includes('/api/analytics/export')) {
        const jsonString = JSON.stringify(state.analytics, null, 2);
        return new Response(jsonString, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': 'attachment; filename="chronos-productivity-export.json"',
          },
        });
      }

      // Intercept GET /api/ai/analyze
      if (url.includes('/api/ai/analyze')) {
        const mode = state.currentMode;
        const tomorrow = new Date();
        const forecasts = [];
        const riskLevels: Record<string, string[]> = {
          student: ['low', 'high', 'critical', 'medium', 'low', 'low', 'medium'],
          professional: ['medium', 'medium', 'high', 'low', 'low', 'low', 'medium'],
          entrepreneur: ['high', 'critical', 'high', 'medium', 'low', 'low', 'critical'],
        };
        const reasons: Record<string, string[]> = {
          student: [
            'Normal focus hours allocated.',
            'Upcoming Machine Learning assignment deadline.',
            'Critical exam prep deadline collision.',
            'Post-deadline decompression period.',
            'Light lecture load.',
            'Weekend rest block.',
            'Weekly syllabus readings start.',
          ],
          professional: [
            'Routine sprint planning sessions.',
            'Daily standup and backlog backlog syncs.',
            'Mid-week release validation deadline.',
            'Post-release monitoring and syncs.',
            'Focus Friday and deep work hours.',
            'Weekend off-duty cycle.',
            'Product design alignment workshops.',
          ],
          entrepreneur: [
            'Investor outreach checklist items.',
            'Investor Pitch Deck final review deadline.',
            'Financial model submission crunch.',
            'Hiring strategy interviews scheduling.',
            'Deep strategic outline block.',
            'Weekend founder strategy block.',
            'Major product MVP release review.',
          ],
        };
        const tasksCount: Record<string, number[]> = {
          student: [2, 5, 8, 3, 1, 0, 3],
          professional: [3, 4, 6, 2, 2, 0, 4],
          entrepreneur: [5, 7, 6, 4, 2, 1, 6],
        };
        const recommendations: Record<string, string[]> = {
          student: [
            'Maintain standard study habits.',
            'Activate Rescue Mode or decompose ML task sub-milestones.',
            'Utilize visual focus blocks and mute messaging apps.',
            'Log focus hours and catch up on sleep targets.',
            'Complete pre-readings to avoid weekend cramming.',
            'Take a clean digital detox break.',
            'List 3 high-priority tasks to start the week.',
          ],
          professional: [
            'Block out calendar hours for async coding.',
            'Decline optional synchronization slots.',
            'Focus strictly on compiling deliverables.',
            'Verify QA status before making code deployments.',
            'Use Ghost Worker output to draft quick release notes.',
            'Completely disconnect from corporate slack channels.',
            'Plan key milestones during Sunday evening review.',
          ],
          entrepreneur: [
            'Delegate administrative tickets to secondary pipelines.',
            'Initiate Rescue Mode and leverage Ghost Worker draft structures.',
            'Cancel lower-priority partner chats.',
            'Block out focus time before noon.',
            'Refine the MVP landing page assets.',
            'Formulate next-week strategic roadmap blocks.',
            'Re-examine system metrics and telemetry loops.',
          ],
        };

        for (let i = 0; i < 7; i++) {
          const d = new Date(tomorrow);
          d.setDate(tomorrow.getDate() + i);
          forecasts.push({
            date: d.toISOString().split('T')[0],
            riskLevel: riskLevels[mode][i],
            reason: reasons[mode][i],
            taskCount: tasksCount[mode][i],
            recommendedAction: recommendations[mode][i],
          });
        }

        const insights = mode === 'student' ? [
          { type: 'achievement', title: 'Clutch Study Streak Active', description: 'You completed 4 high-priority lecture tasks in the last 48 hours!', metric: 92, trend: 'up' },
          { type: 'warning', title: 'Crunch Period Detected', description: 'Two critical academic deadlines are due within the next 72 hours.', metric: 3, trend: 'up' },
          { type: 'recommendation', title: 'Activate Rescue Protocol', description: 'Leverage Rescue Mode on your Machine Learning assignment to optimize focus blocks.', metric: 15, trend: 'stable' },
          { type: 'pattern', title: 'Midnight Focus Peaks', description: 'Your highest focus-minutes occur between 10 PM and 2 AM. Align tasks accordingly.', metric: 84, trend: 'up' }
        ] : mode === 'professional' ? [
          { type: 'achievement', title: 'Sprint Velocity Unlocked', description: 'You checked off all key engineering milestones ahead of your weekly release.', metric: 98, trend: 'up' },
          { type: 'warning', title: 'Context-Switching Drag', description: 'Heavy meeting clusters are causing frequent gaps in focus blocks.', metric: 45, trend: 'down' },
          { type: 'recommendation', title: 'Utilize Ghost Worker Studio', description: 'Draft release newsletters and agenda items with AI to shave 90 focus-minutes.', metric: 90, trend: 'stable' },
          { type: 'pattern', title: 'Morning Code Velocity', description: 'Most code tasks are completed before lunch. Protect mornings for deep work.', metric: 76, trend: 'up' }
        ] : [
          { type: 'achievement', title: 'Founder Velocity Surge', description: 'You completed 12 founder strategy milestones today, boosting XP by +120!', metric: 120, trend: 'up' },
          { type: 'warning', title: 'Decision Paralysis Alert', description: 'High task density is stalling progression across several marketing drafts.', metric: 8, trend: 'up' },
          { type: 'recommendation', title: 'Decompose Goals Rapidly', description: 'Feed large investor outreach milestones into the Decomposer to extract quick subtasks.', metric: 40, trend: 'stable' },
          { type: 'pattern', title: 'Sunday Preparation Power', description: 'Tasks scheduled on Sunday evenings have a 95% execution success rate.', metric: 95, trend: 'up' }
        ];

        const report = mode === 'student' ? `### ⚡ Chronos Time Warp Analysis — Student Mode

Based on your academic telemetry over the past 30 days, we have mapped out your predicted workload and study velocity.

#### 🎯 Performance Diagnostics
- **Syllabus Progress**: Excellent velocity on minor assignments (+15% score increase).
- **Procrastination Penalty**: Your focus is concentrated within 6 hours of assignments.
- **Midnight Peak**: 65% of study hours are logged between 10 PM and 2 AM.

#### ⏳ Predicted Academic Crunch
Our Time Warp model predicts a **Critical Bottleneck in 2 Days**. There are **8 distinct syllabus tasks** converging on your calendar.

#### 💡 Chronos Recommendation
1. **Engage Rescue Mode** on the Machine Learning task immediately.
2. **Decompress your study block** by moving 90 focus minutes of research tasks to Friday morning.
3. Protect your peak late-night focus hours by muting slack and social notifications.` : mode === 'professional' ? `### ⚡ Chronos Time Warp Analysis — Professional Mode

Based on your workspace telemetry and sprint velocity logs, we have analyzed your upcoming code release cycle.

#### 🎯 Performance Diagnostics
- **Sprint Completion**: 92% completion efficiency on direct engineering tickets.
- **Meeting Drag**: Synchronous standups and design reviews account for a 40-minute drag on your core block.
- **Focus Efficiency**: Focus hours are stable but highly fragmented on Wednesdays.

#### ⏳ Predicted Workspace Crunch
Our model forecasts a **High Bottleneck in 3 Days** due to a release validation deadline.

#### 💡 Chronos Recommendation
1. Protect your **Focus Friday** block. Decline auxiliary check-ins.
2. Use **Ghost Worker Studio** to automate agenda drafting for the upcoming design walkthrough.
3. Delegate non-critical QA tickets to early-morning blocks to secure a solid afternoon focus phase.` : `### ⚡ Chronos Time Warp Analysis — Founder Mode

Founder velocity analytics have processed your strategic pipeline and stakeholder outreach logs.

#### 🎯 Performance Diagnostics
- **Execution Rate**: Exceptionally high execution velocity on pitching and collateral design.
- **Task Proliferation**: High density of general management task items is threatening strategic deep-dives.
- **Aesthetic Velocity**: Over 300 focus minutes spent editing visual slide details.

#### ⏳ Predicted Startup Crunch
Our model predicts a **Critical Bottleneck Tomorrow** as your *Investor Pitch Deck* final reviews collide with *Financial Model Submission*.

#### 💡 Chronos Recommendation
1. **Activate Rescue Mode** on the Investor Pitch Deck checklist.
2. Delegate all minor administrative agenda items to your team or automate drafts using **Ghost Worker Studio**.
3. Safeguard your peak focus morning slot (9 AM - 12 PM) for deep financial modeling, skipping other minor reviews.`;

        return new Response(JSON.stringify({
          success: true,
          forecasts,
          insights,
          weeklyReport: report
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
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

      // Sync user profile state
      setDemoUser(getProfileForMode(mode));

      setIsSwitching(false);
    }, 200); // 200ms shimmer overlay transition
  };

  const startDemo = (mode: UserMode = 'student') => {
    localStorage.setItem('chronos_demo_mode', 'true');
    localStorage.setItem('chronos_demo_mode_persona', mode);
    setCurrentMode(mode);
    setIsDemo(true);
    
    // Sync user profile state
    setDemoUser(getProfileForMode(mode));

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

  const updateDemoUser = async (updates: Partial<UserProfile>) => {
    const updated = {
      ...demoUser,
      ...updates,
      personality: updates.personality ? {
        ...demoUser.personality,
        ...updates.personality
      } : demoUser.personality,
      preferences: updates.preferences ? {
        ...demoUser.preferences,
        ...updates.preferences
      } : demoUser.preferences,
    } as UserProfile;

    const storedProfiles = localStorage.getItem('chronos_demo_profiles');
    let parsed: Record<string, any> = {};
    if (storedProfiles) {
      try {
        parsed = JSON.parse(storedProfiles);
      } catch (err) {
        console.error('Failed to parse stored demo profiles:', err);
      }
    }
    parsed[currentMode] = updated;
    localStorage.setItem('chronos_demo_profiles', JSON.stringify(parsed));

    setDemoUser(updated);
    return updated;
  };

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
        updateDemoUser,
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
          zIndex: 90,
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
