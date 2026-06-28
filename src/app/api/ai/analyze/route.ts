import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateStructuredContent } from '@/lib/ai/gemini-client';
import { TimeWarpSchema, DEFAULT_FALLBACK_TIMEWARP } from '@/lib/ai/agents/timewarp-agent';
import { UserProfile, UserMode, DailyAnalytics } from '@/types';
import { generateDemoAnalytics } from '@/lib/demo/demo-data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const range = searchParams.get('range') || '30';

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    // ====== DEMO MODE BYPASS ======
    if (userId.startsWith('demo-')) {
      let mode: UserMode = 'student';
      if (userId.includes('professional')) mode = 'professional';
      if (userId.includes('entrepreneur')) mode = 'entrepreneur';

      const demoForecasts = getDemoForecasts(mode);
      const demoInsights = getDemoInsights(mode);
      const demoReport = getDemoReport(mode);

      return NextResponse.json({
        success: true,
        forecasts: demoForecasts,
        insights: demoInsights,
        weeklyReport: demoReport,
      });
    }

    // ====== REAL FIREBASE OPERATION ======
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 });
    }
    const userProfile = userDoc.data() as UserProfile;

    // Fetch tasks
    const tasksSnap = await adminDb.collection('users').doc(userId).collection('tasks').get();
    const tasks = tasksSnap.docs.map(doc => doc.data());

    // Fetch analytics (last 30 days)
    const analyticsSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('analytics')
      .orderBy('date', 'desc')
      .limit(30)
      .get();
    const analytics = analyticsSnap.docs.map((doc: any) => doc.data() as DailyAnalytics);

    const prompt = `You are the Time Warp module analyzing productivity bottlenecks.
    Current User Profile: ${JSON.stringify(userProfile)}
    Current Tasks in Board/List: ${JSON.stringify(tasks)}
    Last ${range} Days Telemetry Logs: ${JSON.stringify(analytics)}`;

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
              recommendedAction: { type: 'STRING' },
            },
            required: ['date', 'riskLevel', 'reason', 'taskCount', 'recommendedAction'],
          },
        },
        insights: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: ['achievement', 'warning', 'recommendation', 'pattern'] },
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              metric: { type: 'NUMBER' },
              trend: { type: 'STRING', enum: ['up', 'down', 'stable'] },
            },
            required: ['type', 'title', 'description'],
          },
        },
        weeklyReport: { type: 'STRING' },
      },
      required: ['forecasts', 'insights', 'weeklyReport'],
    };

    const data = await generateStructuredContent({
      agentType: 'timewarp',
      userProfile,
      prompt,
      responseSchema,
      zodSchema: TimeWarpSchema,
      fallbackValue: DEFAULT_FALLBACK_TIMEWARP,
    });

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API GET AI Analyze] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ====== DEMO DATA HELPERS ======

function getDemoForecasts(mode: UserMode) {
  const tomorrow = new Date();
  const forecasts = [];

  const riskLevels: Record<UserMode, Array<'low' | 'medium' | 'high' | 'critical'>> = {
    student: ['low', 'high', 'critical', 'medium', 'low', 'low', 'medium'],
    professional: ['medium', 'medium', 'high', 'low', 'low', 'low', 'medium'],
    entrepreneur: ['high', 'critical', 'high', 'medium', 'low', 'low', 'critical'],
  };

  const reasons: Record<UserMode, string[]> = {
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

  const tasksCount: Record<UserMode, number[]> = {
    student: [2, 5, 8, 3, 1, 0, 3],
    professional: [3, 4, 6, 2, 2, 0, 4],
    entrepreneur: [5, 7, 6, 4, 2, 1, 6],
  };

  const recommendations: Record<UserMode, string[]> = {
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
    const dateStr = d.toISOString().split('T')[0];

    forecasts.push({
      date: dateStr,
      riskLevel: riskLevels[mode][i],
      reason: reasons[mode][i],
      taskCount: tasksCount[mode][i],
      recommendedAction: recommendations[mode][i],
    });
  }

  return forecasts;
}

function getDemoInsights(mode: UserMode) {
  if (mode === 'student') {
    return [
      {
        type: 'achievement',
        title: 'Clutch Study Streak Active',
        description: 'You completed 4 high-priority lecture tasks in the last 48 hours!',
        metric: 92,
        trend: 'up',
      },
      {
        type: 'warning',
        title: 'Crunch Period Detected',
        description: 'Two critical academic deadlines are due within the next 72 hours.',
        metric: 3,
        trend: 'up',
      },
      {
        type: 'recommendation',
        title: 'Activate Rescue Protocol',
        description: 'Leverage Rescue Mode on your Machine Learning assignment to optimize focus blocks.',
        metric: 15,
        trend: 'stable',
      },
      {
        type: 'pattern',
        title: 'Midnight Focus Peaks',
        description: 'Your highest focus-minutes occur between 10 PM and 2 AM. Align tasks accordingly.',
        metric: 84,
        trend: 'up',
      },
    ];
  } else if (mode === 'professional') {
    return [
      {
        type: 'achievement',
        title: 'Sprint Velocity Unlocked',
        description: 'You checked off all key engineering milestones ahead of your weekly release.',
        metric: 98,
        trend: 'up',
      },
      {
        type: 'warning',
        title: 'Context-Switching Drag',
        description: 'Heavy meeting clusters are causing frequent gaps in focus blocks.',
        metric: 45,
        trend: 'down',
      },
      {
        type: 'recommendation',
        title: 'Utilize Ghost Worker Studio',
        description: 'Draft release newsletters and agenda items with AI to shave 90 focus-minutes.',
        metric: 90,
        trend: 'stable',
      },
      {
        type: 'pattern',
        title: 'Morning Code Velocity',
        description: 'Most code tasks are completed before lunch. Protect mornings for deep work.',
        metric: 76,
        trend: 'up',
      },
    ];
  } else {
    return [
      {
        type: 'achievement',
        title: 'Founder Velocity Surge',
        description: 'You completed 12 founder strategy milestones today, boosting XP by +120!',
        metric: 120,
        trend: 'up',
      },
      {
        type: 'warning',
        title: 'Decision Paralysis Alert',
        description: 'High task density is stalling progression across several marketing drafts.',
        metric: 8,
        trend: 'up',
      },
      {
        type: 'recommendation',
        title: 'Decompose Goals Rapidly',
        description: 'Feed large investor outreach milestones into the Decomposer to extract quick subtasks.',
        metric: 40,
        trend: 'stable',
      },
      {
        type: 'pattern',
        title: 'Sunday Preparation Power',
        description: 'Tasks scheduled on Sunday evenings have a 95% execution success rate.',
        metric: 95,
        trend: 'up',
      },
    ];
  }
}

function getDemoReport(mode: UserMode): string {
  if (mode === 'student') {
    return `### ⚡ Chronos Time Warp Analysis — Student Mode

Based on your academic telemetry over the past 30 days, we have mapped out your predicted workload and study velocity.

#### 🎯 Performance Diagnostics
- **Syllabus Progress**: Excellent velocity on minor assignments (+15% score increase).
- **Procrastination Penalty**: Your focus is concentrated within 6 hours of assignments. This raises risk levels during exam phases.
- **Midnight Peak**: 65% of study hours are logged between 10 PM and 2 AM.

#### ⏳ Predicted Academic Crunch
Our Time Warp model predicts a **Critical Bottleneck in 2 Days**. There are **8 distinct syllabus tasks** converging on your calendar. Specifically, your *Machine Learning Assignment* and *Math Mock Quiz* are competing for deep hours.

#### 💡 Chronos Recommendation
1. **Engage Rescue Mode** on the Machine Learning task immediately.
2. **Decompress your study block** by moving 90 focus minutes of research tasks to Friday morning.
3. Protect your peak late-night focus hours by muting slack and social notifications.`;
  } else if (mode === 'professional') {
    return `### ⚡ Chronos Time Warp Analysis — Professional Mode

Based on your workspace telemetry and sprint velocity logs, we have analyzed your upcoming code release cycle.

#### 🎯 Performance Diagnostics
- **Sprint Completion**: 92% completion efficiency on direct engineering tickets.
- **Meeting Drag**: Synchronous standups and design reviews account for a 40-minute drag on your core block.
- **Focus Efficiency**: Focus hours are stable but highly fragmented on Wednesdays.

#### ⏳ Predicted Workspace Crunch
Our model forecasts a **High Bottleneck in 3 Days** due to a release validation deadline colliding with weekly sprint retrospectives. If meeting volume continues, your time debt on code checks will increase to **3.2 hours**.

#### 💡 Chronos Recommendation
1. Protect your **Focus Friday** block. Decline auxiliary check-ins.
2. Use **Ghost Worker Studio** to automate agenda drafting for the upcoming design walkthrough.
3. Delegate non-critical QA tickets to early-morning blocks to secure a solid afternoon focus phase.`;
  } else {
    return `### ⚡ Chronos Time Warp Analysis — Founder Mode

Founder velocity analytics have processed your strategic pipeline and stakeholder outreach logs.

#### 🎯 Performance Diagnostics
- **Execution Rate**: Exceptionally high execution velocity on pitching and collateral design.
- **Task Proliferation**: High density of general management task items is threatening strategic deep-dives.
- **Aesthetic Velocity**: Over 300 focus minutes spent editing visual slide details.

#### ⏳ Predicted Startup Crunch
Our model predicts a **Critical Bottleneck Tomorrow** as your *Investor Pitch Deck* final reviews collide with *Financial Model Submission*. Task density will spike to **7 active items** requiring immediate decisions.

#### 💡 Chronos Recommendation
1. **Activate Rescue Mode** on the Investor Pitch Deck checklist.
2. Delegate all minor administrative agenda items to your team or automate drafts using **Ghost Worker Studio**.
3. Safeguard your peak focus morning slot (9 AM - 12 PM) for deep financial modeling, skipping other minor reviews.`;
  }
}
