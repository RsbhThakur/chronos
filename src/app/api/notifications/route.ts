import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// GET /api/notifications?userId={}
// Returns unread notifications for the user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const notificationsRef = adminDb.collection('users').doc(userId).collection('notifications');
    const snapshot = await notificationsRef
      .where('read', '==', false)
      .orderBy('createdAt', 'desc')
      .get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('[API GET Notifications] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/notifications
// Request: { notificationId: string, read: true, userId: string }
// Marks notification as read
export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { notificationId, read, userId } = body;

    if (!notificationId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing notificationId or userId' }, { status: 400 });
    }

    const notificationRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .doc(notificationId);

    const doc = await notificationRef.get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    await notificationRef.update({
      read: read === undefined ? true : read,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Notification updated successfully' });
  } catch (error: any) {
    console.error('[API PATCH Notifications] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
