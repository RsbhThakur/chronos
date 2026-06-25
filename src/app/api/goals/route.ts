import { NextResponse } from 'next/server';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    let query: FirebaseFirestore.Query = adminDb.collection('users').doc(userId).collection('goals');
    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    const goals = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        deadline: data.deadline?.toDate ? data.deadline.toDate() : new Date(data.deadline),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      };
    });

    return NextResponse.json({ success: true, goals });
  } catch (error) {
    const err = error as Error;
    console.error('[API GET Goals] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, description, deadline } = body;

    if (!userId || !title || !deadline) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const result = await executeToolCall('createGoal', { title, description, deadline }, userId, null);
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Failed to create goal' }, { status: 500 });
    }

    // Retrieve and return the created goal doc
    const goalSnap = await adminDb.collection('users').doc(userId).collection('goals').doc(result.goalId).get();
    const createdGoal = goalSnap.exists ? goalSnap.data() : null;

    return NextResponse.json({ success: true, goal: createdGoal, message: result.message });
  } catch (error) {
    const err = error as Error;
    console.error('[API POST Goals] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { goalId, userId, updates } = body as {
      goalId: string;
      userId: string;
      updates: {
        deadline?: string;
        milestones?: Array<{
          id: string;
          title: string;
          dueDate: string;
          status: 'todo' | 'completed';
        }>;
        [key: string]: unknown;
      };
    };

    if (!goalId || !userId || !updates) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const goalRef = adminDb.collection('users').doc(userId).collection('goals').doc(goalId);
    
    // Convert deadline string to Date if provided
    const firestoreUpdates = { ...updates } as Record<string, unknown>;
    if (updates.deadline) {
      firestoreUpdates.deadline = new Date(updates.deadline);
    }
    
    // Map milestones array dates if present
    if (updates.milestones) {
      firestoreUpdates.milestones = updates.milestones.map((ms) => ({
        ...ms,
        dueDate: new Date(ms.dueDate)
      }));
    }

    await goalRef.update(firestoreUpdates);

    const goalSnap = await goalRef.get();
    const updatedGoal = goalSnap.exists ? goalSnap.data() : null;

    return NextResponse.json({ success: true, goal: updatedGoal, message: 'Goal updated successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('[API PATCH Goals] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { goalId, userId } = body;

    if (!goalId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const goalRef = adminDb.collection('users').doc(userId).collection('goals').doc(goalId);
    await goalRef.update({ status: 'abandoned' });

    return NextResponse.json({ success: true, message: 'Goal archived/abandoned successfully' });
  } catch (error) {
    const err = error as Error;
    console.error('[API DELETE Goals] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
