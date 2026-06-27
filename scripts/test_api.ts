import test from 'node:test';
import assert from 'node:assert';
import path from 'path';

// ==========================================
// 1. SET UP HERMETIC MOCKS IN REQUIRE.CACHE
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

function registerMock(modulePath: string, mockExports: any) {
  const resolved = require.resolve(modulePath);
  const normalizedLower = resolved.charAt(0).toLowerCase() + resolved.slice(1);
  const normalizedUpper = resolved.charAt(0).toUpperCase() + resolved.slice(1);
  
  const cacheEntry = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: mockExports
  } as any;
  
  require.cache[resolved] = cacheEntry;
  require.cache[normalizedLower] = cacheEntry;
  require.cache[normalizedUpper] = cacheEntry;
  
  const withoutExt = resolved.replace(/\.ts$/, '');
  const normalizedLowerNoExt = withoutExt.charAt(0).toLowerCase() + withoutExt.slice(1);
  const normalizedUpperNoExt = withoutExt.charAt(0).toUpperCase() + withoutExt.slice(1);
  
  require.cache[withoutExt] = cacheEntry;
  require.cache[normalizedLowerNoExt] = cacheEntry;
  require.cache[normalizedUpperNoExt] = cacheEntry;
}

// Register mocks
registerMock('../src/lib/firebase-admin', {
  adminDb: mockDb,
  adminAuth: {
    createCustomToken: async (uid: string) => `mock-firebase-token-${uid}`
  }
});

registerMock('next-auth/next', {
  getServerSession: async () => ({
    user: { id: 'user-abc-123' },
    accessToken: 'mock-google-access-token'
  })
});

const mockNextAuth = () => () => ({});
(mockNextAuth as any).default = mockNextAuth;
registerMock('next-auth', mockNextAuth);

registerMock('googleapis', {
  google: {
    auth: {
      OAuth2: class {
        setCredentials() {}
      }
    },
    calendar: () => ({
      events: {
        list: async () => ({
          data: {
            items: [
              { summary: 'Meeting with Lead', start: { dateTime: '2026-06-26T10:00:00Z' }, end: { dateTime: '2026-06-26T11:00:00Z' }, description: 'Check-in' }
            ]
          }
        }),
        insert: async (params: any) => ({
          data: {
            id: 'mock-event-id-999',
            htmlLink: 'https://calendar.google.com/mock-link'
          }
        })
      }
    })
  }
});

registerMock('../src/lib/ai/gemini-client', {
  ai: {
    models: {
      generateContent: async () => ({ text: '{}' })
    }
  },
  getModelName: (type: string) => 'mock-model',
  getAgentSystemInstruction: () => 'Mock instruction',
  generateStructuredContent: async ({ agentType, prompt, zodSchema, fallbackValue }: any) => {
    if (agentType === 'decomposer') {
      return {
        milestones: [{ title: 'Milestone 1', dueDate: '2026-06-30T12:00:00Z' }],
        tasks: [{ title: 'Subtask 1', description: 'Desc 1', priority: 'high', estimatedMinutes: 45, category: 'Work', milestoneTitle: 'Milestone 1' }],
        totalEstimatedHours: 0.75,
        suggestedSchedule: 'One task per day'
      };
    }
    return fallbackValue;
  }
});

// ==========================================
// 2. IMPORT THE HANDLERS UNDER TEST
// ==========================================

const { GET: getTasks, POST: postTasks, PATCH: patchTasks, DELETE: deleteTasks } = require('../src/app/api/tasks/route');
const { GET: getGoals, POST: postGoals, PATCH: patchGoals, DELETE: deleteGoals } = require('../src/app/api/goals/route');
const { GET: getHabits, POST: postHabits, PATCH: patchHabits } = require('../src/app/api/goals/habits/route');
const { GET: getCalendar, POST: postCalendar } = require('../src/app/api/calendar/sync/route');
const { POST: postDecompose } = require('../src/app/api/ai/decompose/route');

// ==========================================
// 3. RUN UNIT TESTS
// ==========================================

test('Stage 6 End-to-End API sync & CRUD Tests', async (t) => {
  const userId = 'user-abc-123';

  // Seed User Stats
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
    displayName: 'Test User',
    mode: 'professional',
    personality: {
      workStyle: 'sprinter',
      motivationType: 'pressure',
      communicationStyle: 'casual',
      timezone: 'UTC'
    }
  };

  await t.test('1. POST /api/tasks should create a task and award XP', async () => {
    const taskInput = {
      userId,
      title: 'Submit Hackathon Presentation',
      description: 'Record video and submit forms',
      priority: 'high',
      deadline: '2026-06-30T12:00:00Z',
      estimatedMinutes: 45,
      category: 'Work'
    };

    const req = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskInput)
    });

    const res = await postTasks(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.task.id);
    assert.strictEqual(data.task.title, 'Submit Hackathon Presentation');

    // Verify XP is awarded (10 XP for creation)
    const stats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(stats.xp, 10);
  });

  await t.test('2. GET /api/tasks should return list of filtered tasks', async () => {
    const req = new Request(`http://localhost/api/tasks?userId=${userId}&status=todo`);
    const res = await getTasks(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.tasks));
    assert.ok(data.tasks.length > 0);
  });

  await t.test('3. PATCH /api/tasks should complete a task and award completion XP', async () => {
    // Locate taskId of created task
    const taskKeys = Object.keys(mockStore).filter(k => k.startsWith(`users/${userId}/tasks/`));
    const taskId = taskKeys[0].split('/').pop()!;

    const patchInput = {
      taskId,
      userId,
      updates: { status: 'completed' }
    };

    const req = new Request('http://localhost/api/tasks', {
      method: 'PATCH',
      body: JSON.stringify(patchInput)
    });

    const res = await patchTasks(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.task.status, 'completed');

    // Verify task completion XP is awarded (10 + high priority 30 XP = 40 XP total)
    const stats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(stats.xp, 40);
  });

  await t.test('4. POST /api/ai/decompose should decompose goal into milestones/tasks', async () => {
    const decomposeInput = {
      userId,
      title: 'Deploy Production MVP',
      description: 'Set up pipelines and launch server',
      deadline: '2026-06-30T12:00:00Z'
    };

    const req = new Request('http://localhost/api/ai/decompose', {
      method: 'POST',
      body: JSON.stringify(decomposeInput)
    });

    const res = await postDecompose(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.goal);
    assert.ok(data.tasks.length > 0);
  });

  await t.test('5. POST & GET & PATCH /api/goals/habits should perform CRUD', async () => {
    // Create Habit
    const habitInput = {
      userId,
      title: 'Read Coding Blogs',
      frequency: 'daily',
      category: 'Growth'
    };

    const postReq = new Request('http://localhost/api/goals/habits', {
      method: 'POST',
      body: JSON.stringify(habitInput)
    });
    const postRes = await postHabits(postReq);
    const postData = await postRes.json();
    assert.strictEqual(postRes.status, 200);
    assert.strictEqual(postData.success, true);
    assert.ok(postData.habit.id);

    const habitId = postData.habit.id;

    // List Habits
    const getReq = new Request(`http://localhost/api/goals/habits?userId=${userId}`);
    const getRes = await getHabits(getReq);
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    assert.ok(getData.habits.length > 0);

    // Log completion
    const patchReq = new Request('http://localhost/api/goals/habits', {
      method: 'PATCH',
      body: JSON.stringify({ userId, habitId })
    });
    const patchRes = await patchHabits(patchReq);
    const patchData = await patchRes.json();
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchData.success, true);
    assert.strictEqual(patchData.streak, 1);
  });

  await t.test('6. GET & POST /api/calendar/sync should synch Google Calendar', async () => {
    // Fetch upcoming events from calendar
    const getReq = new Request(`http://localhost/api/calendar/sync?userId=${userId}`);
    const getRes = await getCalendar(getReq);
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getData.success, true);
    assert.ok(getData.events.length > 0);
    assert.strictEqual(getData.events[0].title, 'Meeting with Lead');

    // Create Calendar Event from Task
    const taskKeys = Object.keys(mockStore).filter(k => k.startsWith(`users/${userId}/tasks/`));
    const taskId = taskKeys[0].split('/').pop()!;

    const postReq = new Request('http://localhost/api/calendar/sync', {
      method: 'POST',
      body: JSON.stringify({ userId, taskId })
    });
    const postRes = await postCalendar(postReq);
    const postData = await postRes.json();
    assert.strictEqual(postRes.status, 200);
    assert.strictEqual(postData.success, true);
    assert.strictEqual(postData.eventId, 'mock-event-id-999');
  });
});
