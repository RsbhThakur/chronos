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

// Stream generator mock for generateContentStream
let simulatedStreamChunks: any[] = [
  { text: 'Hello, ' },
  { text: 'I am ' },
  { text: 'Chronos.' }
];

const mockAi = {
  models: {
    generateContent: async (params: any) => {
      // Mock for Vision / Multimodal extract
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
    },
    generateContentStream: async (params: any) => {
      // Async generator mimicking chunk streaming
      return (async function* () {
        for (const chunk of simulatedStreamChunks) {
          yield chunk;
        }
      })();
    }
  }
};

// Register dependencies
registerMock('../src/lib/firebase-admin', {
  adminDb: mockDb,
});

registerMock('next-auth/next', {
  getServerSession: async () => ({
    user: { id: 'user-999', name: 'Test User', email: 'test@example.com' },
    accessToken: 'mock-access-token'
  })
});

const mockNextAuth = () => () => ({});
(mockNextAuth as any).default = mockNextAuth;
(mockNextAuth as any).getServerSession = async () => ({
  user: { id: 'user-999', name: 'Test User', email: 'test@example.com' },
  accessToken: 'mock-access-token'
});
registerMock('next-auth', mockNextAuth);

registerMock('../src/lib/ai/gemini-client', {
  ai: mockAi,
  getModelName: () => 'gemini-2.5-flash',
  getAgentModelType: () => 'flash',
  getAgentSystemInstruction: () => 'Be a helpful time guardian',
  defaultSafetySettings: []
});

registerMock('../src/lib/ai/tools', {
  coreAgentTools: []
});

registerMock('../src/lib/ai/tool-executor', {
  executeToolCall: async (name: string, args: any) => {
    return { success: true, result: 'Tool execution mock value' };
  }
});

// ==========================================
// 2. IMPORT HANDLERS
// ==========================================

const { GET: getChat, POST: postChat } = require('../src/app/api/ai/chat/route');
const { POST: postScan } = require('../src/app/api/ai/scan/route');

// ==========================================
// 3. RUN TESTS
// ==========================================

test('Stage 9: Vertex AI Chat Sidebar & Multimodal OCR Vision Scanner Tests', async (t) => {
  const userId = 'user-999';
  const convId = 'conv-session-123';

  // Prep seed data
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
    // Set chunk sequence
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

    // Verify events
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

    // Verify persistence to Firestore
    const convData = mockStore[`users/${userId}/conversations/${convId}`];
    assert.ok(convData);
    assert.strictEqual(convData.messages.length, 4); // 2 existing + 2 new (user and assistant)
    assert.strictEqual(convData.messages[2].content, 'Are my systems online?');
    assert.strictEqual(convData.messages[3].content, 'Guardian systems engaged.');
  });

  await t.test('3. POST /api/ai/chat should execute and stream multiple tool call steps', async () => {
    // Sequence containing tool execution call, followed by final answer chunk
    simulatedStreamChunks = [
      {
        functionCalls: [
          { name: 'create_task_tool', args: { title: 'SSE Verification Task' } }
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

    // Verify tool events in stream
    const toolCallEvent = receivedEvents.find(e => e.type === 'tool_call');
    const toolResultEvent = receivedEvents.find(e => e.type === 'tool_result');
    const responseTextEvent = receivedEvents.find(e => e.type === 'text');

    assert.ok(toolCallEvent);
    assert.strictEqual(toolCallEvent.name, 'create_task_tool');
    assert.strictEqual(toolCallEvent.args.title, 'SSE Verification Task');

    assert.ok(toolResultEvent);
    assert.strictEqual(toolResultEvent.name, 'create_task_tool');
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
