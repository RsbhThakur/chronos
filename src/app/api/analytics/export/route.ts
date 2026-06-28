import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateDemoAnalytics } from '@/lib/demo/demo-data';
import { UserMode } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    let analyticsData;

    if (userId.startsWith('demo-')) {
      let mode: UserMode = 'student';
      if (userId.includes('professional')) mode = 'professional';
      if (userId.includes('entrepreneur')) mode = 'entrepreneur';
      analyticsData = generateDemoAnalytics(mode, userId);
    } else {
      const snap = await adminDb
        .collection('users')
        .doc(userId)
        .collection('analytics')
        .orderBy('date', 'desc')
        .get();
      analyticsData = snap.docs.map((doc: any) => doc.data());
    }

    const jsonString = JSON.stringify(analyticsData, null, 2);

    return new Response(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="chronos-productivity-export.json"',
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API GET Analytics Export] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
