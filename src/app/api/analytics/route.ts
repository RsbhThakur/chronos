import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateDemoAnalytics } from '@/lib/demo/demo-data';
import { DailyAnalytics, UserMode } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    // Check if demo user
    if (userId.startsWith('demo-')) {
      let mode: UserMode = 'student';
      if (userId.includes('professional')) mode = 'professional';
      if (userId.includes('entrepreneur')) mode = 'entrepreneur';

      let analytics = generateDemoAnalytics(mode, userId);

      // Filter by date
      if (startDate) {
        analytics = analytics.filter(d => d.date >= startDate);
      }
      if (endDate) {
        analytics = analytics.filter(d => d.date <= endDate);
      }

      return NextResponse.json({ success: true, analytics });
    }

    // Query real Firestore
    const analyticsRef = adminDb.collection('users').doc(userId).collection('analytics');
    let query: any = analyticsRef.orderBy('date', 'asc');

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const snap = await query.get();
    const analytics = snap.docs.map((doc: any) => doc.data() as DailyAnalytics);

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    const err = error as Error;
    console.error('[API GET Analytics] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
