import { NextResponse } from 'next/server';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { adminDb } from '@/lib/firebase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const dueBefore = searchParams.get('dueBefore');
    const limitStr = searchParams.get('limit');

    const filter: Record<string, string> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (dueBefore) filter.dueBefore = dueBefore;

    const result = await executeToolCall(
      'listTasks',
      { filter, limit: limitStr ? parseInt(limitStr) : undefined },
      userId,
      null
    );

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('[API GET Tasks] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const result = await executeToolCall('createTask', body, userId, null);
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
    }

    // Award 10 XP for task creation to encourage productivity
    const statsRef = adminDb.collection('users').doc(userId).collection('gamification').doc('stats');
    const statsSnap = await statsRef.get();
    if (statsSnap.exists) {
      const stats = statsSnap.data()!;
      const currentXp = stats.xp || 0;
      const newXp = currentXp + 10;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      await statsRef.update({ xp: newXp, level: newLevel });
    }

    // Fetch and return the newly created task
    const taskSnap = await adminDb.collection('users').doc(userId).collection('tasks').doc(result.taskId).get();
    const createdTask = taskSnap.exists ? taskSnap.data() : null;

    // Automatically sync to Google Calendar if enabled in settings
    if (createdTask) {
      try {
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const calendarSyncEnabled = userData?.preferences?.calendarSyncEnabled === true;

        if (calendarSyncEnabled) {
          const session = await getServerSession(authOptions) as { accessToken?: string } | null;
          if (session?.accessToken) {
            const deadlineDate = createdTask.deadline && typeof createdTask.deadline.toDate === 'function'
              ? createdTask.deadline.toDate()
              : new Date(createdTask.deadline);

            const startTime = deadlineDate.toISOString();
            const estimatedMinutes = createdTask.estimatedMinutes || 30;
            const endTime = new Date(deadlineDate.getTime() + estimatedMinutes * 60 * 1000).toISOString();

            await executeToolCall(
              'createCalendarEvent',
              {
                title: createdTask.title,
                startTime,
                endTime,
                description: createdTask.description || '',
              },
              userId,
              session
            );
            console.log(`[API POST Tasks] Automatically synced task ${result.taskId} to Google Calendar.`);
          }
        }
      } catch (calendarErr) {
        console.error('[API POST Tasks] Failed to automatically sync task to Google Calendar:', calendarErr);
      }
    }

    return NextResponse.json({ success: true, task: createdTask, message: result.message });
  } catch (error) {
    const err = error as Error;
    console.error('[API POST Tasks] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, updates, userId } = body;
    if (!taskId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing taskId or userId' }, { status: 400 });
    }

    let result;
    if (updates?.status === 'completed') {
      result = await executeToolCall('completeTask', { taskId }, userId, null);
    } else {
      result = await executeToolCall('updateTask', { taskId, updates }, userId, null);
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message || 'Update failed' }, { status: 500 });
    }

    // Fetch and return the updated task
    const taskSnap = await adminDb.collection('users').doc(userId).collection('tasks').doc(taskId).get();
    const updatedTask = taskSnap.exists ? taskSnap.data() : null;

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: result.message,
      leveledUp: result.leveledUp || false
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API PATCH Tasks] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { taskId, userId } = body;
    if (!taskId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing taskId or userId' }, { status: 400 });
    }

    const result = await executeToolCall('deleteTask', { taskId }, userId, null);
    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('[API DELETE Tasks] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
