import test from 'node:test';
import assert from 'node:assert';
import path from 'path';

// ==========================================
// 1. SET UP MOCKS IN REQUIRE CACHE
// ==========================================

const mockStore: Record<string, any> = {};

// Mock Firestore Implementation
class MockDocRef {
  colPath: string;
  docId: string;
  constructor(colPath: string, docId: string) {
    this.colPath = colPath;
    this.docId = docId;
  }

  async get() {
    const key = `${this.colPath}/${this.docId}`;
    return {
      exists: key in mockStore,
      data: () => mockStore[key]
    };
  }

  async set(data: any, options?: any) {
    const key = `${this.colPath}/${this.docId}`;
    if (options?.merge && mockStore[key]) {
      mockStore[key] = { ...mockStore[key], ...data };
    } else {
      mockStore[key] = data;
    }
  }

  async update(data: any) {
    const key = `${this.colPath}/${this.docId}`;
    if (!mockStore[key]) throw new Error(`Document ${key} not found`);
    mockStore[key] = { ...mockStore[key], ...data };
  }

  async delete() {
    const key = `${this.colPath}/${this.docId}`;
    delete mockStore[key];
  }

  collection(subName: string) {
    return new MockCollectionRef(`${this.colPath}/${this.docId}/${subName}`);
  }
}

class MockCollectionRef {
  colPath: string;
  constructor(colPath: string) {
    this.colPath = colPath;
  }

  doc(docId: string) {
    return new MockDocRef(this.colPath, docId);
  }

  async get() {
    const docs = Object.keys(mockStore)
      .filter(k => {
        const parts = k.split('/');
        parts.pop(); // remove last element (docId)
        return parts.join('/') === this.colPath;
      })
      .map(k => {
        const parts = k.split('/');
        const docId = parts[parts.length - 1];
        return {
          id: docId,
          data: () => mockStore[k]
        };
      });

    return {
      docs,
      empty: docs.length === 0
    };
  }

  where(field: string, op: string, value: any) {
    // Basic mock where filtering: just returns this collection for query chains
    return this;
  }

  limit(num: number) {
    return this;
  }
}

const mockDb = {
  collection: (name: string) => new MockCollectionRef(name),
  doc: (path: string) => {
    const parts = path.split('/');
    const docId = parts.pop()!;
    return new MockDocRef(parts.join('/'), docId);
  },
  runTransaction: async (callback: any) => {
    const transaction = {
      get: async (docRef: MockDocRef) => docRef.get(),
      set: async (docRef: MockDocRef, data: any, options?: any) => docRef.set(data, options),
      update: async (docRef: MockDocRef, data: any) => docRef.update(data),
      delete: async (docRef: MockDocRef) => docRef.delete()
    };
    return callback(transaction);
  }
};

// Register Firebase Admin mock
const adminPath = require.resolve('../src/lib/firebase-admin');
require.cache[adminPath] = {
  id: adminPath,
  filename: adminPath,
  loaded: true,
  exports: {
    adminDb: mockDb,
    adminAuth: {
      createCustomToken: async (uid: string) => `mock-firebase-token-${uid}`
    }
  }
} as any;

// Register Gemini Client mock
const clientPath = require.resolve('../src/lib/ai/gemini-client');
require.cache[clientPath] = {
  id: clientPath,
  filename: clientPath,
  loaded: true,
  exports: {
    ai: {
      models: {
        generateContent: async (params: any) => {
          if (params.contents.includes('Task:')) {
            // Rescue mode
            return {
              text: JSON.stringify({
                severity: 'orange',
                totalMinutesAvailable: 120,
                totalMinutesNeeded: 90,
                feasible: true,
                plan: [
                  { id: 'step-0', timeBlock: '1:00 PM - 1:30 PM', action: 'Write draft', estimatedMinutes: 30, tips: 'Focus', canBeSkipped: false, completed: false }
                ],
                sacrifices: ['Skip meeting'],
                motivationalMessage: 'Keep going!',
                checkpoints: []
              })
            };
          }
          if (params.contents.includes('Goal Title:')) {
            // Goal decomposition
            return {
              text: JSON.stringify({
                milestones: [{ title: 'Milestone 1', dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }],
                tasks: [{ title: 'Subtask 1', description: 'Desc 1', priority: 'high', estimatedMinutes: 45, category: 'Work', milestoneTitle: 'Milestone 1' }],
                totalEstimatedHours: 0.75,
                suggestedSchedule: 'One task per day'
              })
            };
          }
          if (params.contents.includes('Time Range')) {
            // Productivity Insights
            return {
              text: JSON.stringify({
                insights: [{ type: 'achievement', title: 'Great job', description: 'Completions up 20%' }]
              })
            };
          }
          if (params.contents.includes('bottlenecks')) {
            // Bottleneck forecast
            return {
              text: JSON.stringify({
                forecasts: [{ date: '2026-06-26', riskLevel: 'medium', reason: 'High load', taskCount: 3, recommendedAction: 'Reschedule low priority tasks' }]
              })
            };
          }
          return { text: '{}' };
        }
      }
    },
    getModelName: (type: 'flash' | 'pro') => type === 'flash' ? 'gemini-3.5-flash' : 'gemini-2.5-pro',
    getAgentSystemInstruction: () => 'Mock system instruction',
    generateStructuredContent: async ({ agentType, prompt, zodSchema, fallbackValue }: any) => {
      const mockResult = await (require.cache[clientPath] as any).exports.ai.models.generateContent({ contents: prompt });
      const rawText = mockResult.text;
      if (!rawText) return fallbackValue;
      try {
        const parsed = JSON.parse(rawText);
        const validated = zodSchema.safeParse(parsed);
        return validated.success ? validated.data : fallbackValue;
      } catch (err) {
        return fallbackValue;
      }
    }
  }
} as any;

// ==========================================
// 2. IMPORT THE DISPATCHER UNDER TEST
// ==========================================
import { executeToolCall } from '../src/lib/ai/tool-executor';

// ==========================================
// 3. RUN UNIT TESTS
// ==========================================

test('Stage 4 End-to-End Tool Execution Dispatcher Tests', async (t) => {
  const userId = 'user-abc-123';
  const mockSession = { accessToken: 'mock-google-calendar-oauth-token' };

  // Setup user and gamification stats first
  mockStore[`users/${userId}/gamification/stats`] = {
    xp: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    badges: [],
    tasksCompletedToday: 0,
    totalTasksCompleted: 0
  };

  mockStore[`users/${userId}`] = {
    id: userId,
    displayName: 'John Tester',
    mode: 'professional',
    personality: {
      workStyle: 'sprinter',
      motivationType: 'pressure',
      communicationStyle: 'casual',
      timezone: 'UTC',
      peakHours: [9, 10]
    }
  };

  await t.test('1. createTask should save new task to Firestore', async () => {
    const result = await executeToolCall('createTask', {
      title: 'Finish hackathon project',
      description: 'Draft the final presentation',
      priority: 'high',
      deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      estimatedMinutes: 45,
      category: 'Work',
      tags: ['hackathon', 'urgent']
    }, userId, mockSession);

    assert.strictEqual(result.success, true);
    assert.ok(result.taskId);
    
    // Check mock database contents
    const savedTask = mockStore[`users/${userId}/tasks/${result.taskId}`];
    assert.ok(savedTask);
    assert.strictEqual(savedTask.title, 'Finish hackathon project');
    assert.strictEqual(savedTask.status, 'todo');
    assert.strictEqual(savedTask.priority, 'high');
  });

  await t.test('2. updateTask should merge updates', async () => {
    // Create a task first
    const createResult = await executeToolCall('createTask', {
      title: 'Task to update',
      priority: 'low',
      category: 'Personal'
    }, userId, mockSession);

    const updateResult = await executeToolCall('updateTask', {
      taskId: createResult.taskId,
      updates: {
        priority: 'critical',
        status: 'in_progress'
      }
    }, userId, mockSession);

    assert.strictEqual(updateResult.success, true);
    
    const updatedTask = mockStore[`users/${userId}/tasks/${createResult.taskId}`];
    assert.strictEqual(updatedTask.priority, 'critical');
    assert.strictEqual(updatedTask.status, 'in_progress');
  });

  await t.test('3. completeTask should update status, set completedAt, and award XP under quadratic scale', async () => {
    // Create task
    const createResult = await executeToolCall('createTask', {
      title: 'XP Task',
      priority: 'high' // should give 30 XP
    }, userId, mockSession);

    const completeResult = await executeToolCall('completeTask', {
      taskId: createResult.taskId
    }, userId, mockSession);

    assert.strictEqual(completeResult.success, true);
    
    const completedTask = mockStore[`users/${userId}/tasks/${createResult.taskId}`];
    assert.strictEqual(completedTask.status, 'completed');
    assert.ok(completedTask.completedAt);

    // Verify gamification stats updates
    const stats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(stats.xp, 30);
    // level = Math.floor(Math.sqrt(30/100)) + 1 = 1
    assert.strictEqual(stats.level, 1);
    assert.strictEqual(stats.totalTasksCompleted, 1);

    // Awarding additional XP to trigger level-up
    // Level 2 needs 100 XP (sqrt(100/100) + 1 = 2)
    // Create a critical priority task (50 XP) and complete it twice to cross 100 XP
    const taskA = await executeToolCall('createTask', { title: 'T1', priority: 'critical' }, userId, mockSession);
    const taskB = await executeToolCall('createTask', { title: 'T2', priority: 'critical' }, userId, mockSession);

    await executeToolCall('completeTask', { taskId: taskA.taskId }, userId, mockSession);
    const finalComplete = await executeToolCall('completeTask', { taskId: taskB.taskId }, userId, mockSession);

    assert.strictEqual(finalComplete.leveledUp, true);
    
    const finalStats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(finalStats.xp, 130); // 30 + 50 + 50
    // level = Math.floor(Math.sqrt(130/100)) + 1 = 2
    assert.strictEqual(finalStats.level, 2);
  });

  await t.test('4. deleteTask should remove task', async () => {
    const createResult = await executeToolCall('createTask', {
      title: 'Temporary Task'
    }, userId, mockSession);

    const deleteResult = await executeToolCall('deleteTask', {
      taskId: createResult.taskId
    }, userId, mockSession);

    assert.strictEqual(deleteResult.success, true);
    assert.strictEqual(mockStore[`users/${userId}/tasks/${createResult.taskId}`], undefined);
  });

  await t.test('5. activateRescueMode should query agent and set rescued status', async () => {
    const task = await executeToolCall('createTask', {
      title: 'Late Task',
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    }, userId, mockSession);

    const rescueResult = await executeToolCall('activateRescueMode', {
      taskId: task.taskId
    }, userId, mockSession);

    assert.strictEqual(rescueResult.success, true);
    assert.ok(rescueResult.rescuePlan);
    assert.strictEqual(rescueResult.rescuePlan.severity, 'orange');
    assert.strictEqual(rescueResult.rescuePlan.feasible, true);

    const rescuedTask = mockStore[`users/${userId}/tasks/${task.taskId}`];
    assert.strictEqual(rescuedTask.status, 'rescued');
    assert.ok(rescuedTask.rescuePlan);
  });

  await t.test('6. decomposeGoal should create goal doc and linked task docs', async () => {
    const decomposeResult = await executeToolCall('decomposeGoal', {
      goalTitle: 'Learn Vertex AI',
      goalDescription: 'Read docs and build demo',
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    }, userId, mockSession);

    assert.strictEqual(decomposeResult.success, true);
    assert.ok(decomposeResult.goalId);
    assert.ok(decomposeResult.goal);
    assert.strictEqual(decomposeResult.tasks.length, 1);

    const savedGoal = mockStore[`users/${userId}/goals/${decomposeResult.goalId}`];
    assert.ok(savedGoal);
    assert.strictEqual(savedGoal.title, 'Learn Vertex AI');
    assert.strictEqual(savedGoal.linkedTaskIds.length, 1);

    const savedChildTask = mockStore[`users/${userId}/tasks/${savedGoal.linkedTaskIds[0]}`];
    assert.ok(savedChildTask);
    assert.strictEqual(savedChildTask.parentGoalId, decomposeResult.goalId);
    assert.strictEqual(savedChildTask.title, 'Subtask 1');
  });

  await t.test('7. logHabitCompletion should update completion Dates and award 10 XP', async () => {
    const habitId = 'habit-xyz';
    mockStore[`users/${userId}/habits/${habitId}`] = {
      id: habitId,
      userId,
      title: 'Drink Water',
      frequency: 'daily',
      completedDates: [],
      streak: 0,
      category: 'Health'
    };

    const result = await executeToolCall('logHabitCompletion', {
      habitId
    }, userId, mockSession);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.streak, 1);

    const updatedHabit = mockStore[`users/${userId}/habits/${habitId}`];
    assert.strictEqual(updatedHabit.streak, 1);
    assert.strictEqual(updatedHabit.completedDates.length, 1);
  });
});
