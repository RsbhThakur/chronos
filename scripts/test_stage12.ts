import './setup-env';
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// ==========================================
// 1. SET UP HERMETIC MOCKS IN REQUIRE.CACHE
// ==========================================

const mockStore: Record<string, any> = {};

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
  }
};

const sentFcmPushes: any[] = [];
const mockMessaging = {
  send: async (payload: any) => {
    sentFcmPushes.push(payload);
    return 'mock-message-id-999';
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

// Mock standard Tool Executor calls
const toolExecutorCalls: any[] = [];
registerMock('../src/lib/ai/tool-executor', {
  executeToolCall: async (name: string, args: any, userId: string, auth: any) => {
    toolExecutorCalls.push({ name, args, userId });
    return { success: true };
  }
});

// Mock Firestore Admin SDK
registerMock('../src/lib/firebase-admin', {
  adminDb: mockDb,
  adminMessaging: mockMessaging
});

// Mock Gemini Client
registerMock('../src/lib/ai/gemini-client', {
  getModelName: (tier: string) => `gemini-mock-${tier}`,
  ai: {
    models: {
      generateContent: async (config: any) => {
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
    }
  }
});

// Mock Next-Auth options
registerMock('../src/app/api/auth/[...nextauth]/route', {
  authOptions: {
    providers: [],
  }
});

registerMock('next-auth', {
  getServerSession: async () => {
    return {
      user: {
        id: 'user-stage12-test',
        name: 'Anya Timekeeper',
        email: 'anya@example.com'
      }
    };
  }
});

// ==========================================
// 2. IMPORT MODULES TO TEST
// ==========================================

const { GET: getNotifications, PATCH: patchNotification } = require('../src/app/api/notifications/route');
const { POST: checkNotifications } = require('../src/app/api/notifications/check/route');
const { POST: scanOCR } = require('../src/app/api/ai/scan/route');

// ==========================================
// 3. DEFINE TESTS
// ==========================================

test('Stage 12: Voice-Enabled Chat, Camera OCR Vision, PWA, and Deadline Checking System Integration Tests', async (t) => {
  const userId = 'user-stage12-test';

  // Seed user profile
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
    // Clear state
    sentFcmPushes.length = 0;
    toolExecutorCalls.length = 0;
    
    // Seed tasks with different deadlines relative to now
    const now = new Date();

    // Task 1: Due in 45 mins (Urgent - 1h range)
    const task1Due = new Date(now.getTime() + 45 * 60 * 1000);
    mockStore[`users/${userId}/tasks/task1`] = {
      id: 'task1',
      title: 'ML assignment submission',
      status: 'in_progress',
      priority: 'high',
      deadline: task1Due.toISOString(),
    };

    // Task 2: Due in 2.5 hours (Warning - 3h range)
    const task2Due = new Date(now.getTime() + 150 * 60 * 1000);
    mockStore[`users/${userId}/tasks/task2`] = {
      id: 'task2',
      title: 'DSA Review session',
      status: 'in_progress',
      priority: 'medium',
      deadline: task2Due.toISOString(),
    };

    // Task 3: Due in 5 hours (Reminder - 6h range)
    const task3Due = new Date(now.getTime() + 300 * 60 * 1000);
    mockStore[`users/${userId}/tasks/task3`] = {
      id: 'task3',
      title: 'Laundry laundry',
      status: 'pending',
      priority: 'low',
      deadline: task3Due.toISOString(),
    };

    // Task 4: Due in 12 hours (Out of scope - ignored)
    const task4Due = new Date(now.getTime() + 12 * 3600 * 1000);
    mockStore[`users/${userId}/tasks/task4`] = {
      id: 'task4',
      title: 'Gym workout',
      status: 'pending',
      priority: 'low',
      deadline: task4Due.toISOString(),
    };

    // Trigger check
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
    assert.strictEqual(matches.length, 3, 'Should check and alert only on the 3 tasks within 6 hours');

    // Inspect matches
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

    // Verify FCM push payloads
    assert.strictEqual(sentFcmPushes.length, 3);
    assert.ok(sentFcmPushes[0].notification.title.includes('🚨 URGENT'), 'FCM push 1 title check');
    assert.ok(sentFcmPushes[1].notification.title.includes('⚠️ WARNING'), 'FCM push 2 title check');
    assert.ok(sentFcmPushes[2].notification.title.includes('🔔 REMINDER'), 'FCM push 3 title check');

    // Verify Firestore stored alerts
    const notificationDocsKeys = Object.keys(mockStore).filter((k) => k.startsWith(`users/${userId}/notifications/`));
    assert.strictEqual(notificationDocsKeys.length, 3);
    
    const notif1 = mockStore[notificationDocsKeys.find((k) => mockStore[k].taskId === 'task1')!];
    assert.strictEqual(notif1.type, 'urgent');
    assert.strictEqual(notif1.read, false);
  });

  await t.test('3. POST /api/notifications/check - Special Rule: Auto-trigger Rescue Mode for tasks < 2h', async () => {
    // Task 1 (ML assignment submission) from previous test is due in 45 minutes (< 2 hours).
    // Let's verify if 'activateRescueMode' tool call was auto-triggered on it!
    assert.strictEqual(toolExecutorCalls.length, 1, 'Should auto-activate rescue mode once');
    assert.strictEqual(toolExecutorCalls[0].name, 'activateRescueMode');
    assert.strictEqual(toolExecutorCalls[0].args.taskId, 'task1');
    assert.strictEqual(toolExecutorCalls[0].userId, userId);
  });

  await t.test('4. GET /api/notifications & PATCH /api/notifications CRUD flow', async () => {
    // 1. GET unread notifications
    const reqGet = new Request(`http://localhost/api/notifications?userId=${userId}`);
    const resGet = await getNotifications(reqGet);
    const bodyGet = await resGet.json();

    assert.strictEqual(resGet.status, 200);
    assert.strictEqual(bodyGet.success, true);
    assert.strictEqual(bodyGet.notifications.length, 3, 'Should fetch the 3 unread notification documents');

    const targetNotifId = bodyGet.notifications[0].id;

    // 2. PATCH unread notification to read: true
    const reqPatch = new Request('http://localhost/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ userId, notificationId: targetNotifId, read: true }),
    });
    const resPatch = await patchNotification(reqPatch);
    const bodyPatch = await resPatch.json();

    assert.strictEqual(resPatch.status, 200);
    assert.strictEqual(bodyPatch.success, true);

    // 3. Re-fetch unread notifications, length should now be 2
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

    const res = await scanOCR(req);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(body.suggestions), 'OCR output should expose parsed task suggestions array');
    assert.strictEqual(body.suggestions.length, 2);
    
    assert.strictEqual(body.suggestions[0].title, 'Finish Physics assignment');
    assert.strictEqual(body.suggestions[0].priority, 'high');
    assert.strictEqual(body.suggestions[0].category, 'Academics');
    assert.strictEqual(body.suggestions[0].rawText, 'Physics Chapter 4 problems due Tuesday 12pm');
  });
});
