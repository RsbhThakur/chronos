import './setup-env';
import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';

// ==========================================
// 1. SET UP GLOBAL MUTABLE STATE & MOCK HELPERS
// ==========================================

const mockStore: Record<string, any> = {};

// Dynamic mock states that can be customized dynamically per test-suite
let currentMockUser = { id: 'user-abc-123', name: 'Test User', email: 'test@example.com' };
let simulatedStreamChunks: any[] = [];
let mockGenerateResult: any = null;
const toolExecutorCalls: any[] = [];
const sentFcmPushes: any[] = [];

// Clean database mock store between test suites
function clearMockStore() {
  for (const key in mockStore) {
    delete mockStore[key];
  }
}

// ==========================================
// 2. FIRESTORE DATABASE MOCK IMPLEMENTATION
// ==========================================

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
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
  filters: Array<{ field: string, op: string, val: any }> = [];

  constructor(colPath: string) {
    this.colPath = colPath;
  }

  doc(docId: string) {
    return new MockDocRef(this.colPath, docId);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.orderByField = field;
    this.orderDirection = direction;
    return this;
  }

  limit(num: number) {
    this.limitCount = num;
    return this;
  }

  where(field: string, op: string, val: any) {
    this.filters.push({ field, op, val });
    return this;
  }

  async add(data: any) {
    const docId = 'rand_id_' + Math.floor(Math.random() * 1000000);
    const key = `${this.colPath}/${docId}`;
    mockStore[key] = data;
    return new MockDocRef(this.colPath, docId);
  }

  async get() {
    let docs = Object.keys(mockStore)
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

    // Apply filters
    for (const filter of this.filters) {
      docs = docs.filter(doc => {
        const data = doc.data();
        const docVal = data[filter.field];
        if (filter.op === '>=') return docVal >= filter.val;
        if (filter.op === '<=') return docVal <= filter.val;
        if (filter.op === '==') return docVal === filter.val;
        if (filter.op === '!=') return docVal !== filter.val;
        return true;
      });
    }

    // Sort
    if (this.orderByField) {
      docs.sort((a, b) => {
        const valA = a.data()[this.orderByField!];
        const valB = b.data()[this.orderByField!];
        if (valA < valB) return this.orderDirection === 'desc' ? 1 : -1;
        if (valA > valB) return this.orderDirection === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Limit
    if (this.limitCount !== undefined) {
      docs = docs.slice(0, this.limitCount);
    }

    return {
      docs,
      empty: docs.length === 0,
      size: docs.length
    };
  }
}

const mockDb = {
  collection: (name: string) => new MockCollectionRef(name),
  doc: (pathStr: string) => {
    const parts = pathStr.split('/');
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

const mockMessaging = {
  send: async (payload: any) => {
    sentFcmPushes.push(payload);
    return 'mock-message-id-999';
  }
};

// ==========================================
// 3. MODULE REGISTER CACHE MOCKS
// ==========================================

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

// Register third party dependencies first (before requiring any project modules)
registerMock('../src/lib/firebase-admin', {
  adminDb: mockDb,
  adminMessaging: mockMessaging,
  adminAuth: {
    createCustomToken: async (uid: string) => `mock-firebase-token-${uid}`
  }
});

registerMock('next-auth/next', {
  getServerSession: async () => ({
    user: currentMockUser,
    accessToken: 'mock-access-token'
  })
});

const mockNextAuth = () => () => ({});
(mockNextAuth as any).default = mockNextAuth;
(mockNextAuth as any).getServerSession = async () => ({
  user: currentMockUser,
  accessToken: 'mock-access-token'
});
registerMock('next-auth', mockNextAuth);

registerMock('../src/app/api/auth/[...nextauth]/route', {
  authOptions: {
    providers: [],
  }
});

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

// Load real gemini-client sequentially (after mocks are registered)
const geminiClient = require('../src/lib/ai/gemini-client');
const realGetAgentSystemInstruction = geminiClient.getAgentSystemInstruction;
const realGenerateStructuredContent = geminiClient.generateStructuredContent;
const realGetAgentModelType = geminiClient.getAgentModelType;
const realGetModelName = geminiClient.getModelName;
const realDefaultSafetySettings = geminiClient.defaultSafetySettings;
const realAi = geminiClient.ai;

// Shared structured content generator mock behavior
const mockGenerateStructuredContent = async ({ agentType, prompt, zodSchema, fallbackValue }: any) => {
  if (agentType === 'rescue') {
    return {
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
    };
  }
  if (agentType === 'decomposer') {
    return {
      milestones: [{ title: 'Milestone 1', dueDate: '2026-06-30T12:00:00Z' }],
      tasks: [{ title: 'Subtask 1', description: 'Desc 1', priority: 'high', estimatedMinutes: 45, category: 'Work', milestoneTitle: 'Milestone 1' }],
      totalEstimatedHours: 0.75,
      suggestedSchedule: 'One task per day'
    };
  }
  if (agentType === 'timewarp') {
    return {
      forecasts: [
        {
          date: '2026-06-29',
          riskLevel: 'high',
          reason: 'Predicted crunch on final presentations.',
          taskCount: 5,
          recommendedAction: 'Utilize Rescue Mode.'
        }
      ],
      insights: [
        {
          type: 'achievement',
          title: 'Milestone Velocity',
          description: 'Completed 6 strategic goals early.',
          metric: 85,
          trend: 'up'
        }
      ],
      weeklyReport: '### ⚡ Time Warp Diagnostics\nGood velocity with minor risk tomorrow.'
    };
  }
  return fallbackValue;
};

// Simulated stream generator
const mockGenerateContentStream = async (params: any) => {
  return (async function* () {
    for (const chunk of simulatedStreamChunks) {
      yield chunk;
    }
  })();
};

// Mock generateContent
const mockGenerateContent = async (params: any) => {
  if (mockGenerateResult !== null && mockGenerateResult !== undefined) {
    return mockGenerateResult;
  }
  
  const contentsStr = JSON.stringify(params.contents || params || '');
  
  if (contentsStr.includes('suggestions') || contentsStr.includes('image') || contentsStr.includes('OCR')) {
    if (contentsStr.includes('Physics') || contentsStr.includes('groceries') || currentMockUser.id === 'user-stage12-test') {
      return {
        text: JSON.stringify({
          suggestions: [
            {
              title: 'Finish Physics assignment',
              deadline: '2026-06-30T12:00:00Z',
              priority: 'high',
              category: 'Academics',
              rawText: 'Physics Chapter 4 problems due Tuesday 12pm'
            },
            {
              title: 'Buy groceries',
              deadline: null,
              priority: 'medium',
              category: 'Personal',
              rawText: 'Get milk and eggs'
            }
          ]
        })
      };
    }
    return {
      text: JSON.stringify({
        suggestions: [
          {
            title: 'Review Project Guidelines',
            deadline: '2026-06-30T12:00:00Z',
            priority: 'high',
            category: 'Academics',
            rawText: 'GUIDELINES ASSIGNMENT 1 - DUE JUNE 30'
          }
        ]
      })
    };
  }
  
  return { text: '{}' };
};

// Override real ai singleton models for hermetic mock execution
realAi.models.generateContent = mockGenerateContent;
realAi.models.generateContentStream = mockGenerateContentStream;

// Register customized mock for gemini-client so that other modules required later also get it
registerMock('../src/lib/ai/gemini-client', {
  ai: realAi,
  getModelName: realGetModelName,
  getAgentModelType: realGetAgentModelType,
  getAgentSystemInstruction: realGetAgentSystemInstruction,
  defaultSafetySettings: realDefaultSafetySettings,
  generateStructuredContent: async (params: any) => {
    if (params.prompt === 'Test prompt') {
      return realGenerateStructuredContent(params);
    }
    return mockGenerateStructuredContent(params);
  }
});

// ==========================================
// 4. SEQUENTIALLY LOAD REMAINING PROJECT LIBRARIES
// ==========================================

const { getDemoTasks, generateDemoAnalytics } = require('../src/lib/demo/demo-data');

const { RescuePlanSchema, DEFAULT_FALLBACK_RESCUE_PLAN } = require('../src/lib/ai/agents/rescue-agent');
const { GhostWorkerSchema, DEFAULT_FALLBACK_GHOST_WORKER } = require('../src/lib/ai/agents/ghost-worker-agent');
const { DecomposerSchema } = require('../src/lib/ai/agents/decomposer-agent');

// Grabbing real executeToolCall before we register the mock
const realToolExecutor = require('../src/lib/ai/tool-executor');
const realExecuteToolCall = realToolExecutor.executeToolCall;

registerMock('../src/lib/ai/tool-executor', {
  executeToolCall: async (name: string, args: any, userId: string, session: any) => {
    toolExecutorCalls.push({ name, args, userId });
    return await realExecuteToolCall(name, args, userId, session);
  }
});

const executeToolCall = require('../src/lib/ai/tool-executor').executeToolCall;

// API Handlers
const { GET: getTasks, POST: postTasks, PATCH: patchTasks, DELETE: deleteTasks } = require('../src/app/api/tasks/route');
const { GET: getGoals, POST: postGoals, PATCH: patchGoals, DELETE: deleteGoals } = require('../src/app/api/goals/route');
const { GET: getHabits, POST: postHabits, PATCH: patchHabits } = require('../src/app/api/goals/habits/route');
const { GET: getCalendar, POST: postCalendar } = require('../src/app/api/calendar/sync/route');
const { POST: postDecompose } = require('../src/app/api/ai/decompose/route');
const { GET: getChat, POST: postChat } = require('../src/app/api/ai/chat/route');
const { POST: postScan } = require('../src/app/api/ai/scan/route');
const { GET: getAnalytics } = require('../src/app/api/analytics/route');
const { POST: postLog } = require('../src/app/api/analytics/log/route');
const { GET: getExport } = require('../src/app/api/analytics/export/route');
const { GET: getAnalyze } = require('../src/app/api/ai/analyze/route');
const { GET: getNotifications, PATCH: patchNotification } = require('../src/app/api/notifications/route');
const { POST: checkNotifications } = require('../src/app/api/notifications/check/route');

// ==========================================
// 5. RUN COMBINED UNIT & INTEGRATION TESTS
// ==========================================

// ------------------------------------------
// SUITE 1: Stage 7 Demo Data & Analytics Generator Tests
// ------------------------------------------
test('Stage 7 Demo Data & Analytics Generator Tests', async (t) => {
  clearMockStore();

  await t.test('1. getDemoTasks should return 15+ tasks for each persona mode', () => {
    const studentTasks = getDemoTasks('student');
    const professionalTasks = getDemoTasks('professional');
    const entrepreneurTasks = getDemoTasks('entrepreneur');

    assert.ok(studentTasks.length >= 15, `Student tasks count should be >= 15, got ${studentTasks.length}`);
    assert.ok(professionalTasks.length >= 15, `Professional tasks count should be >= 15, got ${professionalTasks.length}`);
    assert.ok(entrepreneurTasks.length >= 15, `Entrepreneur tasks count should be >= 15, got ${entrepreneurTasks.length}`);

    // Check specific task properties
    const mlTask = studentTasks.find((tk: any) => tk.title === 'Machine Learning Assignment');
    assert.ok(mlTask, 'Student should have Machine Learning Assignment');
    assert.strictEqual(mlTask?.priority, 'critical');
    assert.ok(mlTask?.rescuePlan, 'ML Assignment must have an active rescue plan');
    assert.strictEqual(mlTask?.rescuePlan?.severity, 'red');

    const pitchTask = entrepreneurTasks.find((tk: any) => tk.title === 'Investor Pitch Deck — Final Review');
    assert.ok(pitchTask, 'Entrepreneur should have Pitch Deck task');
    assert.ok(pitchTask?.ghostWorkerOutput, 'Pitch deck task must have ghost worker draft ready');
    assert.strictEqual(pitchTask?.ghostWorkerOutput?.type, 'presentation');
  });

  await t.test('2. generateDemoAnalytics should generate exactly 30 days of data and follow specific score constraints', () => {
    const studentAnalytics = generateDemoAnalytics('student', 'demo-student-001');
    assert.strictEqual(studentAnalytics.length, 30, 'Should generate exactly 30 days of analytics');

    let rescueCount = 0;
    
    studentAnalytics.forEach((data: any) => {
      assert.match(data.date, /^\d{4}-\d{2}-\d{2}$/);

      // Focus minutes constraints (60-300)
      assert.ok(data.focusMinutes >= 60 && data.focusMinutes <= 300, `Focus minutes out of range: ${data.focusMinutes}`);

      const d = new Date(data.date);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      if (isWeekend) {
        assert.ok(data.productivityScore >= 30 && data.productivityScore <= 75, `Weekend score out of range (30-75): ${data.productivityScore} on ${data.date}`);
      } else {
        assert.ok(data.productivityScore >= 60 && data.productivityScore <= 100, `Weekday score out of range (60-100): ${data.productivityScore} on ${data.date}`);
      }

      if (data.rescueModeActivations > 0) {
        rescueCount += data.rescueModeActivations;
        assert.ok(data.bottlenecksDetected.includes('study-distractions'), 'Student rescue day should detect study-distractions bottleneck');
      }
    });

    assert.strictEqual(rescueCount, 2, 'Should include exactly 2 rescue mode activations in the past week');
  });

  await t.test('3. Mock fetch interceptor validation', async () => {
    const mockTasks = getDemoTasks('student');

    if (typeof global.TextEncoder === 'undefined') {
      const { TextEncoder, TextDecoder } = require('util');
      global.TextEncoder = TextEncoder;
      global.TextDecoder = TextDecoder;
    }

    const interceptedFetch = async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('firestore.googleapis.com')) {
        return new Response(JSON.stringify({ success: true, message: 'Intercepted' }));
      }

      if (url.includes('/api/tasks')) {
        const method = init?.method || 'GET';
        if (method === 'GET') {
          return new Response(JSON.stringify({ success: true, tasks: mockTasks }));
        }
      }

      if (url.includes('/api/ai/chat')) {
        const responseText = `Yo Arjun, I see your ML assignment is due in 1.5 hours and you're only 40% done. That's tight but doable if we move NOW. Want me to activate Rescue Mode? I'll build a compressed action plan to get you through this. ⏰🔥`;
        
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const words = responseText.split(' ');
            for (let i = 0; i < words.length; i++) {
              const textChunk = (i === 0 ? '' : ' ') + words[i];
              const sseLine = `data: ${JSON.stringify({ type: 'text', content: textChunk })}\n\n`;
              controller.enqueue(encoder.encode(sseLine));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          }
        });
        return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
      }

      return Promise.resolve(new Response(JSON.stringify({ success: true, fromOriginal: true })));
    };

    const blockedRes = await interceptedFetch('https://firestore.googleapis.com/v1/projects/...', {});
    const blockedData = await blockedRes.json();
    assert.strictEqual(blockedData.message, 'Intercepted');

    const tasksRes = await interceptedFetch('/api/tasks', { method: 'GET' });
    const tasksData = await tasksRes.json();
    assert.strictEqual(tasksData.success, true);
    assert.ok(tasksData.tasks.length >= 15);

    const chatRes = await interceptedFetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: "I'm stressed about my ML assignment" })
    });
    
    assert.strictEqual(chatRes.headers.get('Content-Type'), 'text/event-stream');
    
    const reader = chatRes.body?.getReader();
    const decoder = new TextDecoder();
    let streamOutput = '';
    
    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunkText = decoder.decode(value);
      streamOutput += chunkText;
    }

    assert.ok(streamOutput.includes('data: {"type":"text","content":"Yo"}'));
    assert.ok(streamOutput.includes('data: {"type":"text","content":" Arjun,"}'));
    assert.ok(streamOutput.includes('data: {"type":"done"}'));
  });
});

// ------------------------------------------
// SUITE 2: Stage 5 AI Agents Instruction & Validation Tests
// ------------------------------------------
test('Stage 5 AI Agents System Instruction Tests', async (t) => {
  const baseProfile = {
    id: 'user-123',
    displayName: 'Jane Doe',
    email: 'jane@example.com',
    photoURL: '',
    mode: 'professional' as const,
    personality: {
      workStyle: 'marathoner' as const,
      motivationType: 'encouragement' as const,
      communicationStyle: 'casual' as const,
      timezone: 'EST',
      peakHours: [8, 9, 10]
    },
    preferences: {
      gamificationEnabled: true,
      ghostWorkerEnabled: true,
      rescueModeEnabled: true,
      voiceEnabled: false,
      notificationChannels: ['push' as const]
    },
    onboardingCompleted: true,
    createdAt: new Date(),
  };

  await t.test('Core Agent: instruction contains user profile and behavioral rules', () => {
    const profile = {
      ...baseProfile,
      displayName: 'Alice Sprinter',
      mode: 'entrepreneur' as const,
      personality: {
        ...baseProfile.personality,
        workStyle: 'sprinter' as const,
        communicationStyle: 'minimal' as const,
      }
    };

    const instruction = realGetAgentSystemInstruction('core', profile);
    assert.match(instruction, /Alice Sprinter/);
    assert.match(instruction, /entrepreneur/);
    assert.match(instruction, /sprinter/);
    assert.match(instruction, /minimal/);
    assert.match(instruction, /activateRescueMode/);
  });

  await t.test('Accountability Agent: Encourager Mode', () => {
    const profile = {
      ...baseProfile,
      personality: {
        ...baseProfile.personality,
        motivationType: 'encouragement' as const,
      }
    };

    const instruction = realGetAgentSystemInstruction('accountability', profile);
    assert.match(instruction, /Encourager Mode/);
    assert.match(instruction, /🌟/);
  });

  await t.test('Accountability Agent: Drill Sergeant Mode', () => {
    const profile = {
      ...baseProfile,
      personality: {
        ...baseProfile.personality,
        motivationType: 'pressure' as const,
      }
    };

    const instruction = realGetAgentSystemInstruction('accountability', profile);
    assert.match(instruction, /Drill Sergeant Mode/);
    assert.match(instruction, /⚠️/);
  });

  await t.test('Accountability Agent: Data Analyst Mode', () => {
    const profile = {
      ...baseProfile,
      personality: {
        ...baseProfile.personality,
        motivationType: 'data-driven' as const,
      }
    };

    const instruction = realGetAgentSystemInstruction('accountability', profile);
    assert.match(instruction, /Data Analyst Mode/);
    assert.match(instruction, /📊/);
  });
});

test('Stage 5 AI Agents Schema Validation Tests', async (t) => {
  await t.test('RescuePlanSchema validation matches schema requirements', () => {
    const validPayload = {
      severity: 'orange',
      totalMinutesAvailable: 120,
      totalMinutesNeeded: 90,
      feasible: true,
      plan: [
        {
          id: 'step-1',
          timeBlock: '10:00 - 10:30',
          action: 'Coding initial draft',
          estimatedMinutes: 30,
          tips: 'Focus without distraction',
          canBeSkipped: false,
          completed: false
        }
      ],
      sacrifices: ['Skip coffee break'],
      motivationalMessage: 'You are so close to finishing!',
      checkpoints: [
        {
          time: '10:30',
          milestone: 'Draft completed',
          reached: false
        }
      ]
    };

    const parsed = RescuePlanSchema.safeParse(validPayload);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.severity, 'orange');
      assert.strictEqual(parsed.data.plan[0].action, 'Coding initial draft');
    }
  });

  await t.test('DecomposerSchema validation matches smart decomposition output', () => {
    const validPayload = {
      milestones: [
        { title: 'Database setup', dueDate: '2026-06-30T12:00:00Z' }
      ],
      tasks: [
        {
          title: 'Design schema',
          description: 'Define relational models',
          priority: 'high',
          estimatedMinutes: 45,
          category: 'Database',
          tags: ['backend'],
          milestoneTitle: 'Database setup'
        }
      ],
      totalEstimatedHours: 0.75,
      criticalPath: [],
      suggestedSchedule: 'Complete schema setup first'
    };

    const parsed = DecomposerSchema.safeParse(validPayload);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.milestones[0].title, 'Database setup');
      assert.strictEqual(parsed.data.tasks[0].title, 'Design schema');
    }
  });

  await t.test('GhostWorkerSchema validation parses deliverables draft format', () => {
    const validPayload = {
      type: 'email',
      title: 'Project Status Update',
      content: '# Update\n\nAll tasks completed successfully.',
      reviewNotes: ['Check spelling of names']
    };

    const parsed = GhostWorkerSchema.safeParse(validPayload);
    assert.strictEqual(parsed.success, true);
  });
});

test('Stage 5 AI Agents Safety settings & fallback execution tests', async (t) => {
  const dummyPrompt = 'Test prompt';
  const dummySchema = { type: 'OBJECT' };
  const baseProfile = {
    id: 'user-123',
    displayName: 'Jane Doe',
    email: 'jane@example.com',
    photoURL: '',
    mode: 'professional' as const,
    personality: {
      workStyle: 'marathoner' as const,
      motivationType: 'encouragement' as const,
      communicationStyle: 'casual' as const,
      timezone: 'EST',
      peakHours: [8, 9, 10]
    },
    preferences: {
      gamificationEnabled: true,
      ghostWorkerEnabled: true,
      rescueModeEnabled: true,
      voiceEnabled: false,
      notificationChannels: ['push' as const]
    },
    onboardingCompleted: true,
    createdAt: new Date(),
  };

  await t.test('Returns structured response if parsing and validation succeeds', async () => {
    mockGenerateResult = {
      text: JSON.stringify({
        severity: 'red',
        totalMinutesAvailable: 30,
        totalMinutesNeeded: 45,
        feasible: false,
        plan: [],
        sacrifices: ['Cut presentation down'],
        motivationalMessage: 'Work hard!',
        checkpoints: []
      })
    };

    const result = await realGenerateStructuredContent({
      agentType: 'rescue',
      userProfile: baseProfile,
      prompt: dummyPrompt,
      responseSchema: dummySchema,
      zodSchema: RescuePlanSchema,
      fallbackValue: DEFAULT_FALLBACK_RESCUE_PLAN,
    });

    assert.strictEqual(result.feasible, false);
    assert.strictEqual(result.severity, 'red');
    assert.strictEqual(result.motivationalMessage, 'Work hard!');
  });

  await t.test('Returns fallback if response blocked by safety', async () => {
    mockGenerateResult = {
      candidates: [
        {
          finishReason: 'SAFETY',
          content: { parts: [{ text: '' }] }
        }
      ]
    };

    const result = await realGenerateStructuredContent({
      agentType: 'rescue',
      userProfile: baseProfile,
      prompt: dummyPrompt,
      responseSchema: dummySchema,
      zodSchema: RescuePlanSchema,
      fallbackValue: DEFAULT_FALLBACK_RESCUE_PLAN,
    });

    assert.strictEqual(result.feasible, false);
    assert.strictEqual(result.severity, 'yellow'); // fallback default
    assert.deepStrictEqual(result.sacrifices, ['No sacrifices determined due to processing fallback.']);
  });

  await t.test('Returns fallback if output format fails validation', async () => {
    mockGenerateResult = {
      text: JSON.stringify({
        invalid_key: 'invalid_data'
      })
    };

    const result = await realGenerateStructuredContent({
      agentType: 'ghost-worker',
      userProfile: baseProfile,
      prompt: dummyPrompt,
      responseSchema: dummySchema,
      zodSchema: GhostWorkerSchema,
      fallbackValue: DEFAULT_FALLBACK_GHOST_WORKER,
    });

    assert.strictEqual(result.type, 'document');
    assert.match(result.content, /Draft Blocked or Unavailable/);
  });

  // Re-initialize generator status
  mockGenerateResult = null;
});

// ------------------------------------------
// SUITE 3: Stage 4 End-to-End Tool Execution Dispatcher Tests
// ------------------------------------------
test('Stage 4 End-to-End Tool Execution Dispatcher Tests', async (t) => {
  clearMockStore();
  const userId = 'user-abc-123';
  currentMockUser = { id: userId, name: 'John Tester', email: 'john@example.com' };
  const mockSession = { accessToken: 'mock-google-calendar-oauth-token' };

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
    
    const savedTask = mockStore[`users/${userId}/tasks/${result.taskId}`];
    assert.ok(savedTask);
    assert.strictEqual(savedTask.title, 'Finish hackathon project');
    assert.strictEqual(savedTask.status, 'todo');
    assert.strictEqual(savedTask.priority, 'high');
  });

  await t.test('2. updateTask should merge updates', async () => {
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
    const createResult = await executeToolCall('createTask', {
      title: 'XP Task',
      priority: 'high'
    }, userId, mockSession);

    const completeResult = await executeToolCall('completeTask', {
      taskId: createResult.taskId
    }, userId, mockSession);

    assert.strictEqual(completeResult.success, true);
    
    const completedTask = mockStore[`users/${userId}/tasks/${createResult.taskId}`];
    assert.strictEqual(completedTask.status, 'completed');
    assert.ok(completedTask.completedAt);

    const stats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(stats.xp, 30);
    assert.strictEqual(stats.level, 1);
    assert.strictEqual(stats.totalTasksCompleted, 1);

    // Double check Level 2 (crossed at 100 XP)
    const taskA = await executeToolCall('createTask', { title: 'T1', priority: 'critical' }, userId, mockSession);
    const taskB = await executeToolCall('createTask', { title: 'T2', priority: 'critical' }, userId, mockSession);

    await executeToolCall('completeTask', { taskId: taskA.taskId }, userId, mockSession);
    const finalComplete = await executeToolCall('completeTask', { taskId: taskB.taskId }, userId, mockSession);

    assert.strictEqual(finalComplete.leveledUp, true);
    
    const finalStats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(finalStats.xp, 130); // 30 + 50 + 50
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

// ------------------------------------------
// SUITE 4: Stage 6 End-to-End API sync & CRUD Tests
// ------------------------------------------
test('Stage 6 End-to-End API sync & CRUD Tests', async (t) => {
  clearMockStore();
  const userId = 'user-abc-123';
  currentMockUser = { id: userId, name: 'Test User', email: 'test@example.com' };

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

    const stats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(stats.xp, 10); // 10 XP for task creation
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

    const stats = mockStore[`users/${userId}/gamification/stats`];
    assert.strictEqual(stats.xp, 40); // 10 creation + 30 priority high = 40 XP
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
    const getReq = new Request(`http://localhost/api/calendar/sync?userId=${userId}`);
    const getRes = await getCalendar(getReq);
    const getData = await getRes.json();
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getData.success, true);
    assert.ok(getData.events.length > 0);
    assert.strictEqual(getData.events[0].title, 'Meeting with Lead');

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

// ------------------------------------------
// SUITE 5: Stage 9 Vertex AI Chat Sidebar & Scanner Tests
// ------------------------------------------
test('Stage 9: Vertex AI Chat Sidebar & Multimodal OCR Vision Scanner Tests', async (t) => {
  clearMockStore();
  const userId = 'user-999';
  const convId = 'conv-session-123';
  currentMockUser = { id: userId, name: 'Test User', email: 'test@example.com' };

  mockStore[`users/${userId}`] = {
    id: userId,
    displayName: 'Test User',
    mode: 'professional',
    personality: {
      workStyle: 'marathoner',
      motivationType: 'rewards',
      communicationStyle: 'casual',
      timezone: 'UTC'
    }
  };

  mockStore[`users/${userId}/conversations/${convId}`] = {
    id: convId,
    userId,
    messages: [
      { id: 'msg-1', role: 'user', content: 'hello', timestamp: new Date() },
      { id: 'msg-2', role: 'assistant', content: 'Hello there!', timestamp: new Date() }
    ]
  };

  await t.test('1. GET /api/ai/chat should retrieve conversation history from Firestore', async () => {
    const req = new Request(`http://localhost/api/ai/chat?conversationId=${convId}&userId=${userId}`);
    const res = await getChat(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.messages));
    assert.strictEqual(data.messages.length, 2);
    assert.strictEqual(data.messages[0].content, 'hello');
    assert.strictEqual(data.messages[1].content, 'Hello there!');
  });

  await t.test('2. POST /api/ai/chat should return a real-time SSE stream for word-by-word streaming responses', async () => {
    simulatedStreamChunks = [
      { text: 'Guardian ' },
      { text: 'systems ' },
      { text: 'engaged.' }
    ];

    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Are my systems online?',
        conversationId: convId,
        userId: userId
      })
    });

    const res = await postChat(req);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'text/event-stream');

    const reader = res.body.getReader();
    let receivedEvents: any[] = [];
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const eventData = JSON.parse(line.trim().substring(6));
          receivedEvents.push(eventData);
        }
      }
    }

    const setupEvent = receivedEvents.find(e => e.type === 'setup');
    const textEvents = receivedEvents.filter(e => e.type === 'text');
    const doneEvent = receivedEvents.find(e => e.type === 'done');

    assert.ok(setupEvent);
    assert.strictEqual(setupEvent.conversationId, convId);
    assert.strictEqual(textEvents.length, 3);
    assert.strictEqual(textEvents[0].content, 'Guardian ');
    assert.strictEqual(textEvents[1].content, 'systems ');
    assert.strictEqual(textEvents[2].content, 'engaged.');
    assert.ok(doneEvent);

    const convData = mockStore[`users/${userId}/conversations/${convId}`];
    assert.ok(convData);
    assert.strictEqual(convData.messages.length, 4);
    assert.strictEqual(convData.messages[2].content, 'Are my systems online?');
    assert.strictEqual(convData.messages[3].content, 'Guardian systems engaged.');
  });

  await t.test('3. POST /api/ai/chat should execute and stream multiple tool call steps', async () => {
    simulatedStreamChunks = [
      {
        functionCalls: [
          { name: 'createTask', args: { title: 'SSE Verification Task' } }
        ]
      },
      { text: 'Task successfully created!' }
    ];

    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Create a verification task',
        conversationId: convId,
        userId: userId
      })
    });

    const res = await postChat(req);
    assert.strictEqual(res.status, 200);

    const reader = res.body.getReader();
    let receivedEvents: any[] = [];
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const eventData = JSON.parse(line.trim().substring(6));
          receivedEvents.push(eventData);
        }
      }
    }

    const toolCallEvent = receivedEvents.find(e => e.type === 'tool_call');
    const toolResultEvent = receivedEvents.find(e => e.type === 'tool_result');
    const responseTextEvent = receivedEvents.find(e => e.type === 'text');

    assert.ok(toolCallEvent);
    assert.strictEqual(toolCallEvent.name, 'createTask'); // executeToolCall converts core tool schema names appropriately
    assert.strictEqual(toolCallEvent.args.title, 'SSE Verification Task');

    assert.ok(toolResultEvent);
    assert.strictEqual(toolResultEvent.name, 'createTask');
    assert.ok(toolResultEvent.result.includes('success'));

    assert.ok(responseTextEvent);
    assert.strictEqual(responseTextEvent.content, 'Task successfully created!');
  });

  await t.test('4. POST /api/ai/scan should analyze vision snapshots and extract suggestions structured according to strict JSON Schema', async () => {
    const fakeBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const req = new Request('http://localhost/api/ai/scan', {
      method: 'POST',
      body: JSON.stringify({
        image: fakeBase64Image,
        userId: userId
      })
    });

    const res = await postScan(req);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.suggestions));
    assert.strictEqual(data.suggestions.length, 1);
    assert.strictEqual(data.suggestions[0].title, 'Review Project Guidelines');
    assert.strictEqual(data.suggestions[0].priority, 'high');
    assert.strictEqual(data.suggestions[0].category, 'Academics');
    assert.strictEqual(data.suggestions[0].rawText, 'GUIDELINES ASSIGNMENT 1 - DUE JUNE 30');
  });
});

// ------------------------------------------
// SUITE 6: Stage 11 Analytics & Time Warp Tests
// ------------------------------------------
test('Stage 11: Analytics, Event Telemetry Logging, JSON Exporters & Time Warp AI Tests', async (t) => {
  clearMockStore();
  const userId = 'user-stage11-test';
  currentMockUser = { id: userId, name: 'Anya Timekeeper', email: 'anya@example.com' };
  const todayStr = new Date().toISOString().split('T')[0];

  mockStore[`users/${userId}`] = {
    id: userId,
    displayName: 'Anya Timekeeper',
    mode: 'professional',
    personality: {
      workStyle: 'marathoner',
      motivationType: 'rewards',
      communicationStyle: 'casual',
      timezone: 'UTC'
    }
  };

  await t.test('1. POST /api/analytics/log - Real Firestore accumulation & dynamic scoring', async () => {
    const req1 = new Request('http://localhost/api/analytics/log', {
      method: 'POST',
      body: JSON.stringify({ userId, event: 'task_completed' })
    });
    const res1 = await postLog(req1);
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.success, true);
    assert.strictEqual(body1.date, todayStr);
    assert.strictEqual(body1.analytics.tasksCompleted, 1);
    assert.strictEqual(body1.analytics.productivityScore, 15);

    const req2 = new Request('http://localhost/api/analytics/log', {
      method: 'POST',
      body: JSON.stringify({ userId, event: 'focus_minutes', value: 45 })
    });
    const res2 = await postLog(req2);
    const body2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.analytics.tasksCompleted, 1);
    assert.strictEqual(body2.analytics.focusMinutes, 45);
    assert.strictEqual(body2.analytics.productivityScore, 30); // 15 + 15

    const req3 = new Request('http://localhost/api/analytics/log', {
      method: 'POST',
      body: JSON.stringify({ userId, event: 'rescue_activated' })
    });
    const res3 = await postLog(req3);
    const body3 = await res3.json();
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(body3.success, true);
    assert.strictEqual(body3.analytics.rescueModeActivations, 1);
    assert.strictEqual(body3.analytics.productivityScore, 40); // 30 + 10
  });

  await t.test('2. GET /api/analytics - Real Firestore fetching and date-range filtering', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    mockStore[`users/${userId}/analytics/${yesterdayStr}`] = {
      date: yesterdayStr,
      tasksCompleted: 3,
      focusMinutes: 120,
      rescueModeActivations: 0,
      productivityScore: 85,
      bottlenecksDetected: []
    };

    const req1 = new Request(`http://localhost/api/analytics?userId=${userId}`);
    const res1 = await getAnalytics(req1);
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.success, true);
    assert.strictEqual(body1.analytics.length, 2, 'Should return both yesterday and today logs');

    const req2 = new Request(`http://localhost/api/analytics?userId=${userId}&startDate=${todayStr}&endDate=${todayStr}`);
    const res2 = await getAnalytics(req2);
    const body2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.analytics.length, 1);
    assert.strictEqual(body2.analytics[0].date, todayStr);
  });

  await t.test('3. GET /api/analytics/export - Download telemetry export payloads as attachments', async () => {
    const req = new Request(`http://localhost/api/analytics/export?userId=${userId}`);
    const res = await getExport(req);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('Content-Type'), 'application/json');
    assert.ok(res.headers.get('Content-Disposition')?.includes('attachment; filename="chronos-productivity-export.json"'));

    const payload = await res.json();
    assert.strictEqual(payload.length, 2);
    assert.strictEqual(payload[0].date, todayStr);
  });

  await t.test('4. GET /api/ai/analyze - Run predictive Gemini analysis & Vertex formatting', async () => {
    mockStore[`users/${userId}/tasks/task1`] = { id: 'task1', title: 'Complete Presentation', status: 'in_progress', priority: 'high' };
    mockStore[`users/${userId}/tasks/task2`] = { id: 'task2', title: 'Code Deploy', status: 'completed', priority: 'medium' };

    const req = new Request(`http://localhost/api/ai/analyze?userId=${userId}`);
    const res = await getAnalyze(req);
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.forecasts));
    assert.ok(Array.isArray(body.insights));
    assert.ok(typeof body.weeklyReport === 'string');

    assert.strictEqual(body.forecasts[0].riskLevel, 'high');
    assert.strictEqual(body.insights[0].type, 'achievement');
    assert.ok(body.weeklyReport.includes('⚡ Time Warp Diagnostics'));
  });

  await t.test('5. Demo Mode support verification across endpoints', async () => {
    const demoId = 'demo-student-999';

    const req1 = new Request(`http://localhost/api/analytics?userId=${demoId}`);
    const res1 = await getAnalytics(req1);
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.success, true);
    assert.strictEqual(body1.analytics.length, 30, 'Demo users should always have exactly 30 days of synthetic data');

    const req2 = new Request('http://localhost/api/analytics/log', {
      method: 'POST',
      body: JSON.stringify({ userId: demoId, event: 'task_completed' })
    });
    const res2 = await postLog(req2);
    const body2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.date, todayStr);
    assert.strictEqual(body2.message, 'Demo Mode logged event successfully');

    const req3 = new Request(`http://localhost/api/ai/analyze?userId=${demoId}`);
    const res3 = await getAnalyze(req3);
    const body3 = await res3.json();
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(body3.success, true);
    assert.ok(body3.weeklyReport.includes('### ⚡ Chronos Time Warp Analysis — Student Mode'));
  });
});

// ------------------------------------------
// SUITE 7: Stage 12 PWA, Push Notifications & Deadline Checking System Tests
// ------------------------------------------
test('Stage 12: Voice-Enabled Chat, Camera OCR Vision, PWA, and Deadline Checking System Integration Tests', async (t) => {
  clearMockStore();
  const userId = 'user-stage12-test';
  currentMockUser = { id: userId, name: 'Anya Timekeeper', email: 'anya@example.com' };

  mockStore[`users/${userId}`] = {
    id: userId,
    displayName: 'Anya Timekeeper',
    fcmToken: 'mock-fcm-token-1234567890',
    preferences: {
      rescueModeEnabled: true,
      voiceEnabled: true,
      notificationChannels: ['inApp']
    }
  };

  await t.test('1. Static File Auditing (manifest.json & firebase-messaging-sw.js)', async () => {
    const manifestPath = path.join(__dirname, '../public/manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in public/');
    const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifestContent.short_name, 'Chronos');
    assert.strictEqual(manifestContent.display, 'standalone');

    const swPath = path.join(__dirname, '../public/firebase-messaging-sw.js');
    assert.ok(fs.existsSync(swPath), 'firebase-messaging-sw.js must exist in public/');
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes('importScripts'), 'Service worker must load Firebase scripts');
    assert.ok(swContent.includes('messaging.onBackgroundMessage'), 'Service worker must define background listeners');
  });

  await t.test('2. POST /api/notifications/check - Deadline matching & alert persistence with FCM', async () => {
    sentFcmPushes.length = 0;
    toolExecutorCalls.length = 0;
    
    const now = new Date();

    // Task 1: Due in 45 mins (Urgent - <1h range)
    const task1Due = new Date(now.getTime() + 45 * 60 * 1000);
    mockStore[`users/${userId}/tasks/task1`] = {
      id: 'task1',
      title: 'ML assignment submission',
      status: 'in_progress',
      priority: 'high',
      deadline: task1Due.toISOString(),
      subtasks: [],
    };

    // Task 2: Due in 2.5 hours (Warning - <3h range)
    const task2Due = new Date(now.getTime() + 150 * 60 * 1000);
    mockStore[`users/${userId}/tasks/task2`] = {
      id: 'task2',
      title: 'DSA Review session',
      status: 'in_progress',
      priority: 'medium',
      deadline: task2Due.toISOString(),
      subtasks: [],
    };

    // Task 3: Due in 5 hours (Reminder - <6h range)
    const task3Due = new Date(now.getTime() + 300 * 60 * 1000);
    mockStore[`users/${userId}/tasks/task3`] = {
      id: 'task3',
      title: 'Laundry laundry',
      status: 'pending',
      priority: 'low',
      deadline: task3Due.toISOString(),
      subtasks: [],
    };

    // Task 4: Due in 12 hours (ignored)
    const task4Due = new Date(now.getTime() + 12 * 3600 * 1000);
    mockStore[`users/${userId}/tasks/task4`] = {
      id: 'task4',
      title: 'Gym workout',
      status: 'pending',
      priority: 'low',
      deadline: task4Due.toISOString(),
      subtasks: [],
    };

    const req = new Request('http://localhost/api/notifications/check', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });

    const res = await checkNotifications(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.results[0].checkedCount, 4);

    const matches = body.results[0].matches;
    assert.strictEqual(matches.length, 3);

    const m1 = matches.find((m: any) => m.taskId === 'task1');
    assert.strictEqual(m1.notifyType, 'urgent');
    assert.strictEqual(m1.alertCreated, true);
    assert.strictEqual(m1.pushSent, true);

    const m2 = matches.find((m: any) => m.taskId === 'task2');
    assert.strictEqual(m2.notifyType, 'warning');
    assert.strictEqual(m2.alertCreated, true);
    assert.strictEqual(m2.pushSent, true);

    const m3 = matches.find((m: any) => m.taskId === 'task3');
    assert.strictEqual(m3.notifyType, 'reminder');
    assert.strictEqual(m3.alertCreated, true);
    assert.strictEqual(m3.pushSent, true);

    assert.strictEqual(sentFcmPushes.length, 3);
    assert.ok(sentFcmPushes[0].notification.title.includes('🚨 URGENT'));
    assert.ok(sentFcmPushes[1].notification.title.includes('⚠️ WARNING'));
    assert.ok(sentFcmPushes[2].notification.title.includes('🔔 REMINDER'));

    const notificationDocsKeys = Object.keys(mockStore).filter((k) => k.startsWith(`users/${userId}/notifications/`));
    assert.strictEqual(notificationDocsKeys.length, 3);
    
    const notif1 = mockStore[notificationDocsKeys.find((k) => mockStore[k].taskId === 'task1')!];
    assert.strictEqual(notif1.type, 'urgent');
    assert.strictEqual(notif1.read, false);
  });

  await t.test('3. POST /api/notifications/check - Special Rule: Auto-trigger Rescue Mode for tasks < 2h', async () => {
    // Task 1 (ML assignment submission) from previous test is due in 45 minutes (< 2 hours).
    assert.strictEqual(toolExecutorCalls.length, 1);
    assert.strictEqual(toolExecutorCalls[0].name, 'activateRescueMode');
    assert.strictEqual(toolExecutorCalls[0].args.taskId, 'task1');
    assert.strictEqual(toolExecutorCalls[0].userId, userId);
  });

  await t.test('4. GET /api/notifications & PATCH /api/notifications CRUD flow', async () => {
    const reqGet = new Request(`http://localhost/api/notifications?userId=${userId}`);
    const resGet = await getNotifications(reqGet);
    const bodyGet = await resGet.json();

    assert.strictEqual(resGet.status, 200);
    assert.strictEqual(bodyGet.success, true);
    assert.strictEqual(bodyGet.notifications.length, 3);

    const targetNotifId = bodyGet.notifications[0].id;

    const reqPatch = new Request('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ userId, notificationId: targetNotifId, read: true }),
    });
    const resPatch = await patchNotification(reqPatch);
    const bodyPatch = await resPatch.json();

    assert.strictEqual(resPatch.status, 200);
    assert.strictEqual(bodyPatch.success, true);

    const resGet2 = await getNotifications(reqGet);
    const bodyGet2 = await resGet2.json();
    assert.strictEqual(bodyGet2.notifications.length, 2, 'Unread count should have decremented after PATCH');
  });

  await t.test('5. POST /api/ai/scan - Vision Gemini Flash OCR document parser', async () => {
    const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const req = new Request('http://localhost/api/ai/scan', {
      method: 'POST',
      body: JSON.stringify({ userId, image: dummyBase64 }),
    });

    const res = await postScan(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(body.suggestions));
    assert.strictEqual(body.suggestions.length, 2);
    
    assert.strictEqual(body.suggestions[0].title, 'Finish Physics assignment');
    assert.strictEqual(body.suggestions[0].priority, 'high');
    assert.strictEqual(body.suggestions[0].category, 'Academics');
    assert.strictEqual(body.suggestions[0].rawText, 'Physics Chapter 4 problems due Tuesday 12pm');
  });
});
