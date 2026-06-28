import { NextResponse } from 'next/server';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { adminDb } from '@/lib/firebase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GhostWorkerOutput } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, deliverableType, additionalContext, userId: bodyUserId } = body;
    const session = await getServerSession(authOptions);
    const userId = bodyUserId || session?.user?.id;

    if (!taskId || !deliverableType) {
      return NextResponse.json({ success: false, error: 'Missing taskId or deliverableType' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing userId' }, { status: 401 });
    }

    const result = await executeToolCall(
      'generateGhostWorkerDraft',
      { taskId, deliverableType, additionalContext },
      userId,
      session
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message || 'Draft generation failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, output: result.output });
  } catch (error) {
    const err = error as Error;
    console.error('[API POST GhostWorker] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, approved, edits, userId: bodyUserId } = body;
    const session = await getServerSession(authOptions);
    const userId = bodyUserId || session?.user?.id;

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'Missing taskId' }, { status: 400 });
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
    const ghostWorkerOutput = taskData.ghostWorkerOutput as GhostWorkerOutput;
    if (!ghostWorkerOutput) {
      return NextResponse.json({ success: false, error: 'No Ghost Worker draft exists for this task' }, { status: 400 });
    }

    const updatedOutput: GhostWorkerOutput = {
      ...ghostWorkerOutput,
      approved: approved ?? ghostWorkerOutput.approved,
      edits: edits !== undefined ? edits : ghostWorkerOutput.edits,
    };

    // If there are direct edits, apply them to content
    if (edits) {
      updatedOutput.content = edits;
    }

    await taskRef.update({
      ghostWorkerOutput: updatedOutput
    });

    return NextResponse.json({ success: true, output: updatedOutput });
  } catch (error) {
    const err = error as Error;
    console.error('[API PATCH GhostWorker] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
