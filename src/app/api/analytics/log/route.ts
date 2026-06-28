import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { DailyAnalytics } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, event, value } = body;

    if (!userId || !event) {
      return NextResponse.json({ success: false, error: 'Missing userId or event' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if demo user
    if (userId.startsWith('demo-')) {
      return NextResponse.json({ success: true, date: todayStr, message: 'Demo Mode logged event successfully' });
    }

    const docRef = adminDb.collection('users').doc(userId).collection('analytics').doc(todayStr);
    const snap = await docRef.get();

    let data: DailyAnalytics = {
      date: todayStr,
      tasksCompleted: 0,
      tasksCreated: 0,
      focusMinutes: 0,
      rescueModeActivations: 0,
      productivityScore: 0,
      bottlenecksDetected: [],
    };

    if (snap.exists) {
      data = snap.data() as DailyAnalytics;
    }

    // Process event types
    if (event === 'task_completed' || event === 'tasksCompleted') {
      data.tasksCompleted = (data.tasksCompleted || 0) + 1;
    } else if (event === 'task_created' || event === 'tasksCreated') {
      data.tasksCreated = (data.tasksCreated || 0) + 1;
    } else if (event === 'rescue_activated' || event === 'rescueModeActivations') {
      data.rescueModeActivations = (data.rescueModeActivations || 0) + 1;
    } else if (event === 'focus_minutes' || event === 'focusMinutes') {
      const minutes = typeof value === 'number' ? value : 25; // default 25-minute Pomodoro
      data.focusMinutes = (data.focusMinutes || 0) + minutes;
    }

    // Dynamic Productivity Score Calculation
    // Formula: (tasksCompleted * 15) + (focusMinutes / 3) + (rescueModeActivations * 10) capped at 100
    const calculatedScore = Math.min(
      100,
      (data.tasksCompleted * 15) + Math.floor(data.focusMinutes / 3) + (data.rescueModeActivations * 10)
    );
    data.productivityScore = calculatedScore > 0 ? calculatedScore : 0;

    await docRef.set(data, { merge: true });

    return NextResponse.json({ success: true, date: todayStr, analytics: data });
  } catch (error) {
    const err = error as Error;
    console.error('[API POST Analytics Log] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
