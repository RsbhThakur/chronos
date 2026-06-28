import './setup-env';
import test from 'node:test';
import assert from 'node:assert';
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
      empty: docs.length === 0
    };
  }
}

const mockDb = {
  collection: (name: string) => new MockCollectionRef(name),
  doc: (path: string) => {
    const parts = path.split('/');
    const docId = parts.pop()!;
    return new MockDocRef(parts.join('/'), docId);
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

// Mock standard AI content response
let mockTimeWarpAiResponse = {
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

registerMock('../src/lib/firebase-admin', {
  adminDb: mockDb,
});

registerMock('../src/lib/ai/gemini-client', {
  generateStructuredContent: async (params: any) => {
    return mockTimeWarpAiResponse;
  }
});

// ==========================================
// 2. IMPORT MODULES TO TEST
// ==========================================

const { GET: getAnalytics } = require('../src/app/api/analytics/route');
const { POST: postLog } = require('../src/app/api/analytics/log/route');
const { GET: getExport } = require('../src/app/api/analytics/export/route');
const { GET: getAnalyze } = require('../src/app/api/ai/analyze/route');

// ==========================================
// 3. DEFINE TESTS
// ==========================================

test('Stage 11: Analytics, Event Telemetry Logging, JSON Exporters & Time Warp AI Tests', async (t) => {
  const userId = 'user-stage11-test';
  const todayStr = new Date().toISOString().split('T')[0];

  // Prepare seed user profile
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
    // Call event log endpoint with 'task_completed'
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
    // formula: 1 * 15 = 15 score
    assert.strictEqual(body1.analytics.productivityScore, 15);

    // Call event log endpoint with 'focus_minutes' value = 45
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
    // formula: (1 * 15) + floor(45 / 3) = 15 + 15 = 30 score
    assert.strictEqual(body2.analytics.productivityScore, 30);

    // Call with 'rescue_activated'
    const req3 = new Request('http://localhost/api/analytics/log', {
      method: 'POST',
      body: JSON.stringify({ userId, event: 'rescue_activated' })
    });
    const res3 = await postLog(req3);
    const body3 = await res3.json();
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(body3.success, true);
    assert.strictEqual(body3.analytics.rescueModeActivations, 1);
    // formula: (1 * 15) + floor(45 / 3) + (1 * 10) = 15 + 15 + 10 = 40 score
    assert.strictEqual(body3.analytics.productivityScore, 40);
  });

  await t.test('2. GET /api/analytics - Real Firestore fetching and date-range filtering', async () => {
    // Seed an older log manually into our mock Firestore
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

    // Query analytics without range filters
    const req1 = new Request(`http://localhost/api/analytics?userId=${userId}`);
    const res1 = await getAnalytics(req1);
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.success, true);
    assert.strictEqual(body1.analytics.length, 2, 'Should return both yesterday and today logs');

    // Query with filter for only today
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
    assert.strictEqual(payload.length, 2, 'Export should list all stored telemetry documents in order');
    assert.strictEqual(payload[0].date, todayStr);
  });

  await t.test('4. GET /api/ai/analyze - Run predictive Gemini analysis & Vertex formatting', async () => {
    // Seed some tasks for user
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

    // Check custom mock content
    assert.strictEqual(body.forecasts[0].riskLevel, 'high');
    assert.strictEqual(body.insights[0].type, 'achievement');
    assert.ok(body.weeklyReport.includes('⚡ Time Warp Diagnostics'));
  });

  await t.test('5. Demo Mode support verification across endpoints', async () => {
    const demoId = 'demo-student-999';

    // GET analytics (uses generateDemoAnalytics dynamically)
    const req1 = new Request(`http://localhost/api/analytics?userId=${demoId}`);
    const res1 = await getAnalytics(req1);
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.success, true);
    assert.strictEqual(body1.analytics.length, 30, 'Demo users should always have exactly 30 days of synthetic data');

    // POST logging
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

    // GET Analyze (uses offline custom demo report presets)
    const req3 = new Request(`http://localhost/api/ai/analyze?userId=${demoId}`);
    const res3 = await getAnalyze(req3);
    const body3 = await res3.json();
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(body3.success, true);
    assert.ok(body3.weeklyReport.includes('### ⚡ Chronos Time Warp Analysis — Student Mode'));
  });
});
