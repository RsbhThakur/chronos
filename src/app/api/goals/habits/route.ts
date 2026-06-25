import { NextResponse } from 'next/server';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { adminDb } from '@/lib/firebase-admin';
import { Habit } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const snap = await adminDb.collection('users').doc(userId).collection('habits').get();
    const habits = snap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));

    return NextResponse.json({ success: true, habits });
  } catch (error) {
    const err = error as Error;
    console.error('[API GET Habits] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, frequency, category } = body;

    if (!userId || !title) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const habitId = uuidv4();
    const habitRef = adminDb.collection('users').doc(userId).collection('habits').doc(habitId);

    const newHabit: Habit = {
      id: habitId,
      userId,
      title,
      frequency: frequency || 'daily',
      completedDates: [],
      streak: 0,
      category: category || 'General',
    };

    await habitRef.set(newHabit);
    return NextResponse.json({ success: true, habit: newHabit, message: `Habit created: ${title}` });
  } catch (error) {
    const err = error as Error;
    console.error('[API POST Habits] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { habitId, userId } = body;

    if (!habitId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const result = await executeToolCall('logHabitCompletion', { habitId }, userId, null);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message || 'Log habit completion failed' }, { status: 500 });
    }

    // Fetch and return the updated habit doc
    const habitSnap = await adminDb.collection('users').doc(userId).collection('habits').doc(habitId).get();
    const updatedHabit = habitSnap.exists ? habitSnap.data() : null;

    return NextResponse.json({
      success: true,
      habit: updatedHabit,
      message: result.message,
      streak: result.streak
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API PATCH Habits] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
