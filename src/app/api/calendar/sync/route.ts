import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { adminDb } from '@/lib/firebase-admin';
import { google } from 'googleapis';
import { Task } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const session = await getServerSession(authOptions) as { accessToken?: string } | null;
    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing Google OAuth credentials' }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch upcoming events from primary calendar (next 30 days)
    const now = new Date();
    const timeMax = new Date();
    timeMax.setDate(now.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (response.data.items || []).map(event => ({
      title: event.summary || 'Untitled Event',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      description: event.description || '',
    }));

    return NextResponse.json({ success: true, events });
  } catch (error) {
    const err = error as Error;
    console.error('[API GET Calendar Sync] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, userId } = body;

    if (!taskId || !userId) {
      return NextResponse.json({ success: false, error: 'Missing taskId or userId' }, { status: 400 });
    }

    const session = await getServerSession(authOptions) as { accessToken?: string } | null;
    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized or missing Google OAuth credentials' }, { status: 401 });
    }

    // Retrieve task details
    const taskSnap = await adminDb.collection('users').doc(userId).collection('tasks').doc(taskId).get();
    if (!taskSnap.exists) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const task = taskSnap.data() as Task;
    const deadlineDate = task.deadline && typeof (task.deadline as { toDate?: () => Date }).toDate === 'function'
      ? (task.deadline as { toDate: () => Date }).toDate()
      : new Date(task.deadline as string | number | Date);
    
    // Set start time to task deadline, and end time based on estimatedMinutes
    const startTime = deadlineDate.toISOString();
    const estimatedMinutes = task.estimatedMinutes || 30;
    const endTime = new Date(deadlineDate.getTime() + estimatedMinutes * 60 * 1000).toISOString();

    const result = await executeToolCall(
      'createCalendarEvent',
      {
        title: task.title,
        startTime,
        endTime,
        description: task.description || '',
      },
      userId,
      session
    );

    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('[API POST Calendar Sync] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
