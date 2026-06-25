import { NextResponse } from 'next/server';
import { executeToolCall } from '@/lib/ai/tool-executor';

export async function POST(request: Request) {
  try {
    const { title, description, deadline, userId } = await request.json();
    if (!title || !description || !deadline || !userId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const result = await executeToolCall(
      'decomposeGoal',
      {
        goalTitle: title,
        goalDescription: description,
        deadline,
      },
      userId,
      null
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message || 'Decomposition failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      goal: result.goal,
      tasks: result.tasks,
      totalHours: result.totalHours,
      suggestedSchedule: result.suggestedSchedule,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API Decompose] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
