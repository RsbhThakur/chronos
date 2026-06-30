import { adminDb } from '@/lib/firebase-admin';
import { ai, getModelName, getAgentSystemInstruction, generateStructuredContent } from './gemini-client';
import { AgentType, UserProfile, Task, Goal, Milestone, RescuePlan, GhostWorkerOutput, BottleneckForecast, ProductivityInsight } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';

// Import specialized AI agent Zod schemas and fallback configurations
import { RescuePlanSchema, DEFAULT_FALLBACK_RESCUE_PLAN } from './agents/rescue-agent';
import { GhostWorkerSchema, DEFAULT_FALLBACK_GHOST_WORKER } from './agents/ghost-worker-agent';
import { DecomposerSchema, DEFAULT_FALLBACK_DECOMPOSITION } from './agents/decomposer-agent';
import { ProductivityInsightsResponseSchema, DEFAULT_FALLBACK_INSIGHTS, BottleneckForecastResponseSchema, DEFAULT_FALLBACK_FORECASTS } from './agents/timewarp-agent';

/**
 * Main dispatcher to execute tool calls returned by Vertex AI agents.
 * 
 * @param toolName The name of the tool to execute.
 * @param args The arguments passed to the tool.
 * @param userId The unique ID of the user.
 * @param session The NextAuth session containing the Google OAuth access token.
 */
export async function executeToolCall(
  toolName: string,
  args: any,
  userId: string,
  session: any
): Promise<any> {
  console.log(`[tool-executor] Executing tool "${toolName}" for user "${userId}"`, args);

  switch (toolName) {
    case 'createTask':
      return await toolCreateTask(args, userId, session);
    
    case 'updateTask':
      return await toolUpdateTask(args, userId, session);

    case 'completeTask':
      return await toolCompleteTask(args, userId, session);

    case 'deleteTask':
      return await toolDeleteTask(args, userId, session);

    case 'listTasks':
      return await toolListTasks(args, userId);

    case 'getUpcomingDeadlines':
      return await toolGetUpcomingDeadlines(args, userId);

    case 'activateRescueMode':
      return await toolActivateRescueMode(args, userId);

    case 'generateGhostWorkerDraft':
      return await toolGenerateGhostWorkerDraft(args, userId);

    case 'decomposeGoal':
      return await toolDecomposeGoal(args, userId);

    case 'getProductivityInsights':
      return await toolGetProductivityInsights(args, userId);

    case 'getBottleneckForecast':
      return await toolGetBottleneckForecast(args, userId);

    case 'createCalendarEvent':
      return await toolCreateCalendarEvent(args, session);

    case 'deleteCalendarEvent':
      return await toolDeleteCalendarEvent(args, session);

    case 'updateCalendarEvent':
      return await toolUpdateCalendarEvent(args, session);

    case 'createGoal':
      return await toolCreateGoal(args, userId);

    case 'logHabitCompletion':
      return await toolLogHabitCompletion(args, userId);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ==========================================
// TOOL IMPLEMENTATIONS
// ==========================================

async function toolCreateTask(args: any, userId: string, session: any) {
  const taskId = uuidv4();
  const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId);

  const newTask: Task = {
    id: taskId,
    userId,
    title: args.title,
    description: args.description || '',
    status: 'todo',
    priority: args.priority || 'medium',
    deadline: args.deadline ? new Date(args.deadline) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
    estimatedMinutes: args.estimatedMinutes || 30,
    actualMinutes: 0,
    category: args.category || 'General',
    tags: args.tags || [],
    subtasks: (args.subtasks || []).map((st: any) => ({
      id: uuidv4(),
      title: st.title || st,
      completed: false,
      estimatedMinutes: st.estimatedMinutes || 10
    })),
    aiGenerated: args.aiGenerated ?? true,
    parentGoalId: args.parentGoalId || null,
    rescuePlan: null,
    ghostWorkerOutput: null,
    createdAt: new Date(),
    completedAt: null,
  };

  // Convert Date objects to Firestore friendly format/Dates
  await taskRef.set(newTask);

  // Sync to Google Calendar if enabled
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const calendarSyncEnabled = userData?.preferences?.calendarSyncEnabled === true;

    if (calendarSyncEnabled && session?.accessToken) {
      const deadlineDate = newTask.deadline;
      const startTime = deadlineDate.toISOString();
      const estimatedMinutes = newTask.estimatedMinutes || 30;
      const endTime = new Date(deadlineDate.getTime() + estimatedMinutes * 60 * 1000).toISOString();

      const calendarResult = await toolCreateCalendarEvent({
        title: newTask.title,
        startTime,
        endTime,
        description: newTask.description || '',
      }, session);

      if (calendarResult.success && calendarResult.eventId) {
        await taskRef.update({
          calendarEventId: calendarResult.eventId
        });
        console.log(`[toolCreateTask] Automatically synced task ${taskId} to Google Calendar. Event ID: ${calendarResult.eventId}`);
      }
    }
  } catch (calendarErr) {
    console.error('[toolCreateTask] Automatically syncing task to Google Calendar failed:', calendarErr);
  }

  return { success: true, taskId, message: `Task created: ${newTask.title}` };
}

async function toolUpdateTask(args: any, userId: string) {
  const { taskId, updates } = args;
  if (!taskId) throw new Error('Missing taskId');

  const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new Error('Task not found');

  const cleanedUpdates: any = { ...updates };
  if (updates.deadline) cleanedUpdates.deadline = new Date(updates.deadline);
  if (updates.completedAt) cleanedUpdates.completedAt = new Date(updates.completedAt);

  await taskRef.update(cleanedUpdates);
  return { success: true, taskId, message: 'Task updated' };
}

async function toolCompleteTask(args: any, userId: string) {
  const { taskId } = args;
  if (!taskId) throw new Error('Missing taskId');

  const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new Error('Task not found');

  const taskData = taskSnap.data() as Task;
  if (taskData.status === 'completed') {
    return { success: true, taskId, message: 'Task is already completed' };
  }

  const completedAt = new Date();
  await taskRef.update({
    status: 'completed',
    completedAt,
  });

  // Award XP based on priority: critical=50, high=30, medium=20, low=10
  let xpToAdd = 10;
  if (taskData.priority === 'critical') xpToAdd = 50;
  else if (taskData.priority === 'high') xpToAdd = 30;
  else if (taskData.priority === 'medium') xpToAdd = 20;

  const gamificationResult = await awardUserXPAndStreak(userId, xpToAdd);

  // Log in today's analytics
  await logAnalyticsCompletion(userId);

  return {
    success: true,
    taskId,
    message: `Task completed. Awarded ${xpToAdd} XP. Current Level: ${gamificationResult.level}`,
    leveledUp: gamificationResult.leveledUp
  };
}

async function toolDeleteTask(args: any, userId: string) {
  const { taskId } = args;
  if (!taskId) throw new Error('Missing taskId');

  const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId);
  await taskRef.delete();
  return { success: true, taskId, message: 'Task deleted' };
}

async function toolListTasks(args: any, userId: string) {
  const { filter, limit } = args || {};
  let query = adminDb.collection('users').doc(userId).collection('tasks') as any;

  if (filter?.status) {
    query = query.where('status', '==', filter.status);
  }
  if (filter?.priority) {
    query = query.where('priority', '==', filter.priority);
  }

  const snap = await query.get();
  let tasks = snap.docs.map((doc: any) => {
    const data = doc.data();
    return {
      ...data,
      deadline: (data.deadline as any)?.toDate ? (data.deadline as any).toDate() : new Date(data.deadline),
      createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(data.createdAt),
      completedAt: (data.completedAt as any)?.toDate ? (data.completedAt as any).toDate() : (data.completedAt ? new Date(data.completedAt) : null)
    } as Task;
  });

  if (filter?.dueBefore) {
    const cutoff = new Date(filter.dueBefore);
    tasks = tasks.filter((t: Task) => t.deadline <= cutoff);
  }

  // Priority mapping for sorting: critical=0, high=1, medium=2, low=3
  const priorityWeight = (p: string) => {
    switch (p) {
      case 'critical': return 0;
      case 'high': return 1;
      case 'medium': return 2;
      default: return 3;
    }
  };

  tasks.sort((a: Task, b: Task) => {
    const weightDiff = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (weightDiff !== 0) return weightDiff;
    return a.deadline.getTime() - b.deadline.getTime();
  });

  if (limit) {
    tasks = tasks.slice(0, limit);
  }

  return { success: true, tasks };
}

async function toolGetUpcomingDeadlines(args: any, userId: string) {
  const { hoursAhead } = args;
  if (!hoursAhead) throw new Error('Missing hoursAhead');

  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const snap = await adminDb.collection('users').doc(userId).collection('tasks')
    .where('status', '!=', 'completed')
    .get();

  const tasks = snap.docs.map((doc: any) => {
    const data = doc.data();
    return {
      ...data,
      deadline: (data.deadline as any)?.toDate ? (data.deadline as any).toDate() : new Date(data.deadline)
    } as Task;
  }).filter((t: Task) => t.deadline >= now && t.deadline <= cutoff);

  return { success: true, tasks };
}

async function toolActivateRescueMode(args: any, userId: string) {
  const { taskId } = args;
  if (!taskId) throw new Error('Missing taskId');

  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) throw new Error('User not found');
  const userProfile = userDoc.data() as UserProfile;

  const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new Error('Task not found');
  const taskData = taskSnap.data() as Task;

  const deadlineDate = (taskData.deadline as any)?.toDate ? (taskData.deadline as any).toDate() : new Date(taskData.deadline);
  const now = new Date();
  const totalMinutesAvailable = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / 60000));

  const prompt = `Task: ${taskData.title}
Description: ${taskData.description}
Subtasks remaining: ${JSON.stringify((taskData.subtasks || []).filter(s => !s.completed))}
Current Time: ${now.toISOString()}
Deadline: ${deadlineDate.toISOString()}
Total Minutes Available: ${totalMinutesAvailable}`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      severity: { type: 'STRING', enum: ['yellow', 'orange', 'red'] },
      totalMinutesAvailable: { type: 'INTEGER' },
      totalMinutesNeeded: { type: 'INTEGER' },
      feasible: { type: 'BOOLEAN' },
      plan: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            timeBlock: { type: 'STRING' },
            action: { type: 'STRING' },
            estimatedMinutes: { type: 'INTEGER' },
            tips: { type: 'STRING' },
            canBeSkipped: { type: 'BOOLEAN' },
            completed: { type: 'BOOLEAN' }
          },
          required: ['id', 'timeBlock', 'action', 'estimatedMinutes', 'tips', 'canBeSkipped', 'completed']
        }
      },
      sacrifices: { type: 'ARRAY', items: { type: 'STRING' } },
      motivationalMessage: { type: 'STRING' },
      checkpoints: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            time: { type: 'STRING' },
            milestone: { type: 'STRING' },
            reached: { type: 'BOOLEAN' }
          },
          required: ['time', 'milestone', 'reached']
        }
      }
    },
    required: [
      'severity',
      'totalMinutesAvailable',
      'totalMinutesNeeded',
      'feasible',
      'plan',
      'sacrifices',
      'motivationalMessage',
      'checkpoints'
    ]
  };

  const parsedPlan = await generateStructuredContent({
    agentType: 'rescue',
    userProfile,
    prompt,
    responseSchema,
    zodSchema: RescuePlanSchema,
    fallbackValue: DEFAULT_FALLBACK_RESCUE_PLAN,
  });
  const rescuePlan: RescuePlan = {
    ...parsedPlan,
    activatedAt: new Date(),
    completedSteps: 0
  };

  // Add subtask generated IDs to rescue plan actions
  rescuePlan.plan = rescuePlan.plan.map((step, idx) => ({
    ...step,
    id: step.id || `step-${idx}`,
    completed: false
  }));

  await taskRef.update({
    status: 'rescued',
    rescuePlan
  });

  return { success: true, rescuePlan, message: 'Rescue plan generated and activated' };
}

async function toolGenerateGhostWorkerDraft(args: any, userId: string) {
  const { taskId, deliverableType, additionalContext } = args;
  if (!taskId || !deliverableType) throw new Error('Missing arguments');

  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userProfile = userDoc.data() as UserProfile;

  const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId);
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new Error('Task not found');
  const taskData = taskSnap.data() as Task;

  const prompt = `Task Title: ${taskData.title}
Task Description: ${taskData.description}
Deliverable Type requested: ${deliverableType}
Additional Instructions: ${additionalContext || 'None'}`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      type: { type: 'STRING', enum: ['email', 'document', 'presentation', 'code', 'agenda'] },
      title: { type: 'STRING' },
      content: { type: 'STRING' },
      reviewNotes: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['type', 'title', 'content', 'reviewNotes']
  };

  const parsedOutput = await generateStructuredContent({
    agentType: 'ghost-worker',
    userProfile,
    prompt,
    responseSchema,
    zodSchema: GhostWorkerSchema,
    fallbackValue: DEFAULT_FALLBACK_GHOST_WORKER,
  });
  const ghostWorkerOutput: GhostWorkerOutput = {
    ...parsedOutput,
    generatedAt: new Date(),
    approved: false,
    edits: null
  };

  await taskRef.update({
    ghostWorkerOutput
  });

  return { success: true, output: ghostWorkerOutput };
}

async function toolDecomposeGoal(args: any, userId: string) {
  const { goalTitle, goalDescription, deadline, context } = args;
  if (!goalTitle || !goalDescription || !deadline) throw new Error('Missing arguments');

  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userProfile = userDoc.data() as UserProfile;

  const now = new Date();
  const goalDeadline = new Date(deadline);

  const prompt = `Goal Title: ${goalTitle}
Goal Description: ${goalDescription}
Final Deadline: ${goalDeadline.toISOString()}
Current Date: ${now.toISOString()}
Context: ${context || 'None'}`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      milestones: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            dueDate: { type: 'STRING' }
          },
          required: ['title', 'dueDate']
        }
      },
      tasks: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            priority: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] },
            estimatedMinutes: { type: 'INTEGER' },
            category: { type: 'STRING' },
            tags: { type: 'ARRAY', items: { type: 'STRING' } },
            milestoneTitle: { type: 'STRING' }
          },
          required: ['title', 'description', 'priority', 'estimatedMinutes', 'category', 'milestoneTitle']
        }
      },
      totalEstimatedHours: { type: 'NUMBER' },
      suggestedSchedule: { type: 'STRING' }
    },
    required: ['milestones', 'tasks', 'totalEstimatedHours', 'suggestedSchedule']
  };

  const decomposition = await generateStructuredContent({
    agentType: 'decomposer',
    userProfile,
    prompt,
    responseSchema,
    zodSchema: DecomposerSchema,
    fallbackValue: DEFAULT_FALLBACK_DECOMPOSITION,
  });
  const goalId = uuidv4();

  // Map milestones
  const mappedMilestones: Milestone[] = decomposition.milestones.map((ms: any) => ({
    id: uuidv4(),
    title: ms.title,
    completed: false,
    dueDate: new Date(ms.dueDate)
  }));

  // Create sub-tasks
  const createdTaskIds: string[] = [];
  const tasksToCreate: Task[] = [];

  for (const t of decomposition.tasks) {
    const taskId = uuidv4();
    createdTaskIds.push(taskId);

    // Find milestone deadline to match
    const matchingMs = mappedMilestones.find(ms => ms.title.toLowerCase() === t.milestoneTitle.toLowerCase());
    const taskDeadline = matchingMs ? matchingMs.dueDate : goalDeadline;

    const newTask: Task = {
      id: taskId,
      userId,
      title: t.title,
      description: t.description || '',
      status: 'todo',
      priority: t.priority || 'medium',
      deadline: taskDeadline,
      estimatedMinutes: t.estimatedMinutes || 60,
      actualMinutes: 0,
      category: t.category || 'General',
      tags: t.tags || [],
      subtasks: [],
      aiGenerated: true,
      parentGoalId: goalId,
      rescuePlan: null,
      ghostWorkerOutput: null,
      createdAt: new Date(),
      completedAt: null
    };

    tasksToCreate.push(newTask);
    await adminDb.collection('users').doc(userId).collection('tasks').doc(taskId).set(newTask);
  }

  // Create Goal document
  const goalRef = adminDb.collection('users').doc(userId).collection('goals').doc(goalId);
  const goalDoc: Goal = {
    id: goalId,
    userId,
    title: goalTitle,
    description: goalDescription,
    deadline: goalDeadline,
    progress: 0,
    milestones: mappedMilestones,
    linkedTaskIds: createdTaskIds,
    status: 'active',
    createdAt: new Date()
  };

  await goalRef.set(goalDoc);

  return {
    success: true,
    goalId,
    goal: goalDoc,
    tasks: tasksToCreate,
    totalHours: decomposition.totalEstimatedHours,
    suggestedSchedule: decomposition.suggestedSchedule
  };
}

async function toolGetProductivityInsights(args: any, userId: string) {
  const { timeRange } = args;
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userProfile = userDoc.data() as UserProfile;

  // Retrieve last 30 analytics logs
  const snap = await adminDb.collection('users').doc(userId).collection('analytics').limit(30).get();
  const logs = snap.docs.map(doc => doc.data());

  const prompt = `Generate productivity insights based on these historical analytics records:
${JSON.stringify(logs)}
Time Range requested: ${timeRange}`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      insights: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            type: { type: 'STRING', enum: ['achievement', 'warning', 'recommendation', 'pattern'] },
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            metric: { type: 'NUMBER' },
            trend: { type: 'STRING', enum: ['up', 'down', 'stable'] }
          },
          required: ['type', 'title', 'description']
        }
      }
    },
    required: ['insights']
  };

  const data = await generateStructuredContent({
    agentType: 'timewarp',
    userProfile,
    prompt,
    responseSchema,
    zodSchema: ProductivityInsightsResponseSchema,
    fallbackValue: DEFAULT_FALLBACK_INSIGHTS,
  });
  return { success: true, insights: data.insights };
}

async function toolGetBottleneckForecast(args: any, userId: string) {
  const { daysAhead } = args;
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userProfile = userDoc.data() as UserProfile;

  // Retrieve current tasks
  const tasksSnap = await adminDb.collection('users').doc(userId).collection('tasks').get();
  const tasks = tasksSnap.docs.map(doc => doc.data());

  const prompt = `Analyze future bottlenecks for the next ${daysAhead} days.
Current Task list: ${JSON.stringify(tasks)}`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      forecasts: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING' },
            riskLevel: { type: 'STRING', enum: ['low', 'medium', 'high', 'critical'] },
            reason: { type: 'STRING' },
            taskCount: { type: 'INTEGER' },
            recommendedAction: { type: 'STRING' }
          },
          required: ['date', 'riskLevel', 'reason', 'taskCount', 'recommendedAction']
        }
      }
    },
    required: ['forecasts']
  };

  const data = await generateStructuredContent({
    agentType: 'timewarp',
    userProfile,
    prompt,
    responseSchema,
    zodSchema: BottleneckForecastResponseSchema,
    fallbackValue: DEFAULT_FALLBACK_FORECASTS,
  });
  return { success: true, forecasts: data.forecasts };
}

async function toolCreateCalendarEvent(args: any, session: any) {
  const { title, startTime, endTime, description } = args;
  if (!title || !startTime || !endTime) throw new Error('Missing parameters');

  if (!session || !session.accessToken) {
    return { success: false, error: 'Google Calendar access token is missing or not linked. Please sign in via Google OAuth.' };
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description || '',
        start: { dateTime: startTime },
        end: { dateTime: endTime },
      },
    });

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      message: `Calendar event created: ${title}`
    };
  } catch (err: any) {
    console.error('Google Calendar event insertion failed:', err.message || err);
    return { success: false, error: `Google API error: ${err.message || err}` };
  }
}

async function toolCreateGoal(args: any, userId: string) {
  const goalId = uuidv4();
  const goalRef = adminDb.collection('users').doc(userId).collection('goals').doc(goalId);

  const newGoal: Goal = {
    id: goalId,
    userId,
    title: args.title,
    description: args.description || '',
    deadline: new Date(args.deadline),
    progress: 0,
    milestones: [],
    linkedTaskIds: [],
    status: 'active',
    createdAt: new Date(),
  };

  await goalRef.set(newGoal);
  return { success: true, goalId, message: `Goal created: ${newGoal.title}` };
}

async function toolLogHabitCompletion(args: any, userId: string) {
  const { habitId } = args;
  if (!habitId) throw new Error('Missing habitId');

  const habitRef = adminDb.collection('users').doc(userId).collection('habits').doc(habitId);
  const snap = await habitRef.get();
  if (!snap.exists) throw new Error('Habit not found');

  const habit = snap.data()!;
  const completedDates = habit.completedDates || [];
  
  // Format today's date in local YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  if (completedDates.includes(todayStr)) {
    return { success: true, streak: habit.streak || 0, message: 'Habit already completed today' };
  }

  const updatedDates = [...completedDates, todayStr].sort();

  // Streak calculation
  let streak = 1;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (completedDates.includes(yesterdayStr)) {
    streak = (habit.streak || 0) + 1;
  }

  await habitRef.update({
    completedDates: updatedDates,
    streak
  });

  // Award 10 XP for habit completion
  const gamificationResult = await awardUserXPAndStreak(userId, 10);

  return {
    success: true,
    streak,
    message: `Logged habit completion. Awarded 10 XP. Current Level: ${gamificationResult.level}`
  };
}

// ==========================================
// GAMIFICATION HELPERS
// ==========================================

async function awardUserXPAndStreak(userId: string, xpToAdd: number) {
  const statsRef = adminDb.collection('users').doc(userId).collection('gamification').doc('stats');

  return await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(statsRef);
    let xp = xpToAdd;
    let level = 1;
    let streak = 0;
    let longestStreak = 0;
    let tasksCompletedToday = 0;
    let totalTasksCompleted = 0;
    let badges: string[] = [];

    if (doc.exists) {
      const data = doc.data()!;
      xp = (data.xp || 0) + xpToAdd;
      level = data.level || 1;
      streak = data.streak || 0;
      longestStreak = data.longestStreak || 0;
      tasksCompletedToday = data.tasksCompletedToday || 0;
      totalTasksCompleted = data.totalTasksCompleted || 0;
      badges = data.badges || [];
    }

    // Quadratic Level formula: level = Math.floor(Math.sqrt(xp / 100)) + 1
    const newLevel = Math.floor(Math.sqrt(xp / 100)) + 1;
    const leveledUp = newLevel > level;

    // Check streak updates
    // Check if task completed yesterday. If this is the first task completed today:
    // (We increment tasksCompletedToday inside this transaction block)
    const newTasksCompletedToday = tasksCompletedToday + 1;
    let newStreak = streak;

    if (tasksCompletedToday === 0) {
      // First task completed today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayAnalyticsDoc = await transaction.get(
        adminDb.collection('users').doc(userId).collection('analytics').doc(yesterdayStr)
      );

      if (yesterdayAnalyticsDoc.exists && (yesterdayAnalyticsDoc.data()?.tasksCompleted || 0) > 0) {
        newStreak = streak + 1;
      } else {
        newStreak = 1;
      }
    }

    const newLongestStreak = Math.max(longestStreak, newStreak);

    const updates = {
      xp,
      level: newLevel,
      streak: newStreak,
      longestStreak: newLongestStreak,
      tasksCompletedToday: newTasksCompletedToday,
      totalTasksCompleted: totalTasksCompleted + 1,
      badges
    };

    transaction.set(statsRef, updates, { merge: true });

    return { xp, level: newLevel, leveledUp, streak: newStreak };
  });
}

async function logAnalyticsCompletion(userId: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  const analyticsRef = adminDb.collection('users').doc(userId).collection('analytics').doc(todayStr);

  await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(analyticsRef);
    let tasksCompleted = 1;
    let tasksCreated = 0;
    let focusMinutes = 0;
    let rescueModeActivations = 0;

    if (doc.exists) {
      const data = doc.data()!;
      tasksCompleted = (data.tasksCompleted || 0) + 1;
      tasksCreated = data.tasksCreated || 0;
      focusMinutes = data.focusMinutes || 0;
      rescueModeActivations = data.rescueModeActivations || 0;
    }

    // Productivity Score = Math.min(100, tasksCompleted * 20)
    const productivityScore = Math.min(100, tasksCompleted * 20);

    const updates = {
      date: todayStr,
      tasksCompleted,
      tasksCreated,
      focusMinutes,
      rescueModeActivations,
      productivityScore,
      bottlenecksDetected: []
    };

    transaction.set(analyticsRef, updates, { merge: true });
  });
}
