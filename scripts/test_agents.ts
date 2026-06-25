import test from 'node:test';
import assert from 'node:assert';

// ==========================================
// 1. SETUP HERMETIC MOCKS IN REQUIRE.CACHE
// ==========================================

let mockGenerateResult: any = { text: '{}' };

const genaiPath = require.resolve('@google/genai');
require.cache[genaiPath] = {
  id: genaiPath,
  filename: genaiPath,
  loaded: true,
  exports: {
    GoogleGenAI: class {
      models = {
        generateContent: async (params: any) => {
          return mockGenerateResult;
        }
      };
      chats = {
        create: () => ({})
      };
    }
  }
} as any;

// Now load the actual modules under test
import { getAgentSystemInstruction, generateStructuredContent } from '../src/lib/ai/gemini-client';
import { RescuePlanSchema, DEFAULT_FALLBACK_RESCUE_PLAN } from '../src/lib/ai/agents/rescue-agent';
import { GhostWorkerSchema, DEFAULT_FALLBACK_GHOST_WORKER } from '../src/lib/ai/agents/ghost-worker-agent';
import { DecomposerSchema, DEFAULT_FALLBACK_DECOMPOSITION } from '../src/lib/ai/agents/decomposer-agent';
import { TimeWarpSchema, DEFAULT_FALLBACK_TIMEWARP, ProductivityInsightsResponseSchema, DEFAULT_FALLBACK_INSIGHTS, BottleneckForecastResponseSchema, DEFAULT_FALLBACK_FORECASTS } from '../src/lib/ai/agents/timewarp-agent';
import { AccountabilitySchema, DEFAULT_FALLBACK_ACCOUNTABILITY } from '../src/lib/ai/agents/accountability-agent';

// Mock user profiles
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

// ==========================================
// 2. RUN UNIT TESTS
// ==========================================

test('Stage 5 AI Agents System Instruction Tests', async (t) => {
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

    const instruction = getAgentSystemInstruction('core', profile);
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

    const instruction = getAgentSystemInstruction('accountability', profile);
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

    const instruction = getAgentSystemInstruction('accountability', profile);
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

    const instruction = getAgentSystemInstruction('accountability', profile);
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

    const result = await generateStructuredContent({
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

    const result = await generateStructuredContent({
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

    const result = await generateStructuredContent({
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
});
