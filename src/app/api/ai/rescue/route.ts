import { NextResponse } from 'next/server';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { adminDb } from '@/lib/firebase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Task, RescuePlan } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await getServerSession(authOptions);
    const userId = searchParams.get('userId') || session?.user?.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing userId' }, { status: 401 });
    }

    // Returns all active rescue plans for the user (tasks with status 'rescued')
    const snap = await adminDb.collection('users').doc(userId).collection('tasks')
      .where('status', '==', 'rescued')
      .get();

    const tasks = snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        deadline: data.deadline?.toDate ? data.deadline.toDate() : new Date(data.deadline),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? new Date(data.completedAt) : null)
      } as Task;
    });

    const activeRescuePlans = tasks
      .filter(t => t.rescuePlan)
      .map(t => ({
        taskId: t.id,
        taskTitle: t.title,
        rescuePlan: t.rescuePlan
      }));

    return NextResponse.json({ success: true, activeRescuePlans });
  } catch (error) {
    const err = error as Error;
    console.error('[API GET Rescue] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, userId: bodyUserId } = body;
    const session = await getServerSession(authOptions);
    const userId = bodyUserId || session?.user?.id;

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'Missing taskId' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing userId' }, { status: 401 });
    }

    const result = await executeToolCall('activateRescueMode', { taskId }, userId, session);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message || 'Failed to generate rescue plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rescuePlan: result.rescuePlan });
  } catch (error) {
    const err = error as Error;
    console.error('[API POST Rescue] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, stepId, completed, userId: bodyUserId } = body;
    const session = await getServerSession(authOptions);
    const userId = bodyUserId || session?.user?.id;

    if (!taskId || !stepId) {
      return NextResponse.json({ success: false, error: 'Missing taskId or stepId' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing userId' }, { status: 401 });
    }

    const taskRef = adminDb.collection('users').doc(userId).collection('tasks').doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const taskData = taskSnap.data()!;
    const rescuePlan = taskData.rescuePlan as RescuePlan;
    if (!rescuePlan || !rescuePlan.plan) {
      return NextResponse.json({ success: false, error: 'Rescue plan not active on this task' }, { status: 400 });
    }

    // Toggle specific rescue step's completion status
    const updatedPlanSteps = rescuePlan.plan.map(step => {
      if (step.id === stepId) {
        return { ...step, completed };
      }
      return step;
    });

    const completedStepsCount = updatedPlanSteps.filter(s => s.completed).length;

    const updatedRescuePlan: RescuePlan = {
      ...rescuePlan,
      plan: updatedPlanSteps,
      completedSteps: completedStepsCount
    };

    await taskRef.update({
      rescuePlan: updatedRescuePlan
    });

    return NextResponse.json({ success: true, rescuePlan: updatedRescuePlan });
  } catch (error) {
    const err = error as Error;
    console.error('[API PATCH Rescue] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
