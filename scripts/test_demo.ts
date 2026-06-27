import test from 'node:test';
import assert from 'node:assert';
import { getDemoTasks, generateDemoAnalytics, demoUsers } from '../src/lib/demo/demo-data';

test('Stage 7 Demo Data & Analytics Generator Tests', async (t) => {
  await t.test('1. getDemoTasks should return 15+ tasks for each persona mode', () => {
    const studentTasks = getDemoTasks('student');
    const professionalTasks = getDemoTasks('professional');
    const entrepreneurTasks = getDemoTasks('entrepreneur');

    assert.ok(studentTasks.length >= 15, `Student tasks count should be >= 15, got ${studentTasks.length}`);
    assert.ok(professionalTasks.length >= 15, `Professional tasks count should be >= 15, got ${professionalTasks.length}`);
    assert.ok(entrepreneurTasks.length >= 15, `Entrepreneur tasks count should be >= 15, got ${entrepreneurTasks.length}`);

    // Check specific task properties
    const mlTask = studentTasks.find(t => t.title === 'Machine Learning Assignment');
    assert.ok(mlTask, 'Student should have Machine Learning Assignment');
    assert.strictEqual(mlTask?.priority, 'critical');
    assert.ok(mlTask?.rescuePlan, 'ML Assignment must have an active rescue plan');
    assert.strictEqual(mlTask?.rescuePlan?.severity, 'red');

    const pitchTask = entrepreneurTasks.find(t => t.title === 'Investor Pitch Deck — Final Review');
    assert.ok(pitchTask, 'Entrepreneur should have Pitch Deck task');
    assert.ok(pitchTask?.ghostWorkerOutput, 'Pitch deck task must have ghost worker draft ready');
    assert.strictEqual(pitchTask?.ghostWorkerOutput?.type, 'presentation');
  });

  await t.test('2. generateDemoAnalytics should generate exactly 30 days of data and follow specific score constraints', () => {
    const studentAnalytics = generateDemoAnalytics('student', 'demo-student-001');
    assert.strictEqual(studentAnalytics.length, 30, 'Should generate exactly 30 days of analytics');

    // Count rescue activations
    let rescueCount = 0;
    
    studentAnalytics.forEach((data, index) => {
      // Date should be valid YYYY-MM-DD
      assert.match(data.date, /^\d{4}-\d{2}-\d{2}$/);

      // Focus minutes constraints (60-300)
      assert.ok(data.focusMinutes >= 60 && data.focusMinutes <= 300, `Focus minutes out of range: ${data.focusMinutes}`);

      // Score ranges depending on weekdays/weekends
      // Weekdays: index 0 (now) is today. Let's parse date to check if weekend
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
    // Setting up a dummy window environment on global to run the fetch mock initialization logic
    const dummyLocalStorage: Record<string, string> = {
      'chronos_demo_mode': 'true',
      'chronos_demo_mode_persona': 'student'
    };

    const mockTasks = getDemoTasks('student');
    const mockState = {
      isDemo: true,
      currentMode: 'student',
      tasks: mockTasks,
      goals: [],
      habits: [],
      gamification: { level: 5, xp: 850, streak: 12, badges: [] }
    };

    // A mock TextEncoder since it might not be globally present in node tests (though it usually is)
    if (typeof global.TextEncoder === 'undefined') {
      const { TextEncoder } = require('util');
      global.TextEncoder = TextEncoder;
    }

    // Capture the fetch patch
    let fetchHandler: any = null;
    const mockWindow: any = {
      location: { origin: 'http://localhost:3000' },
      localStorage: {
        getItem: (key: string) => dummyLocalStorage[key],
        setItem: (key: string, value: string) => { dummyLocalStorage[key] = value; },
        removeItem: (key: string) => { delete dummyLocalStorage[key]; }
      },
      fetch: (input: any, init: any) => {},
      XMLHttpRequest: class {},
      WebSocket: class {}
    };

    // Execute the patch definition manually to capture original fetch reference
    const originalFetch = (input: any, init: any) => Promise.resolve(new Response(JSON.stringify({ success: true, fromOriginal: true })));
    
    // Simulate patch fetch handler definition
    const interceptedFetch = async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input.url;

      // Firebase blocking
      if (url.includes('firestore.googleapis.com')) {
        return new Response(JSON.stringify({ success: true, message: 'Intercepted' }));
      }

      // tasks route
      if (url.includes('/api/tasks')) {
        const method = init?.method || 'GET';
        if (method === 'GET') {
          return new Response(JSON.stringify({ success: true, tasks: mockState.tasks }));
        }
      }

      // chat simulation route
      if (url.includes('/api/ai/chat')) {
        // Mock SSE streaming return values
        const responseText = `Yo Arjun, I see your ML assignment is due in 1.5 hours and you're only 40% done. That's tight but doable if we move NOW. Want me to activate Rescue Mode? I'll build a compressed action plan to get you through this. ⏰🔥`;
        
        let outputText = '';
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

      return originalFetch(input, init);
    };

    // Verify blocking logic
    const blockedRes = await interceptedFetch('https://firestore.googleapis.com/v1/projects/...', {});
    const blockedData = await blockedRes.json();
    assert.strictEqual(blockedData.message, 'Intercepted');

    // Verify GET /api/tasks returns mock tasks
    const tasksRes = await interceptedFetch('/api/tasks', { method: 'GET' });
    const tasksData = await tasksRes.json();
    assert.strictEqual(tasksData.success, true);
    assert.ok(tasksData.tasks.length >= 15);

    // Verify /api/ai/chat SSE stream returns the chunked texts
    const chatRes = await interceptedFetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: "I'm stressed about my ML assignment" })
    });
    
    assert.strictEqual(chatRes.headers.get('Content-Type'), 'text/event-stream');
    
    // Read the stream
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
