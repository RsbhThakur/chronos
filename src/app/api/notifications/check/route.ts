import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { executeToolCall } from '@/lib/ai/tool-executor';
import { Task, UserProfile } from '@/types';

// POST /api/notifications/check
// Called periodically to check for approaching deadlines and send alerts or auto-activate Rescue Mode.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId: paramUserId } = body;

    let userIds: string[] = [];
    if (paramUserId) {
      userIds = [paramUserId];
    } else {
      // Query all users
      const usersSnap = await adminDb.collection('users').get();
      userIds = usersSnap.docs.map((doc) => doc.id);
    }

    const now = new Date();
    const results: any[] = [];

    for (const userId of userIds) {
      // Fetch user profile
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) continue;
      const userProfile = userDoc.data() as UserProfile;

      // Get FCM Token
      const fcmToken = userProfile.fcmToken || (userProfile as any).preferences?.fcmToken;

      // Fetch user tasks not completed
      const tasksSnap = await adminDb
        .collection('users')
        .doc(userId)
        .collection('tasks')
        .where('status', '!=', 'completed')
        .get();

      const userResults: any[] = [];

      for (const taskDoc of tasksSnap.docs) {
        const taskData = taskDoc.data();
        const task: Task = {
          ...taskData,
          id: taskDoc.id,
          deadline: taskData.deadline?.toDate ? taskData.deadline.toDate() : new Date(taskData.deadline),
        } as Task;

        // Calculate hours remaining
        const diffMs = task.deadline.getTime() - now.getTime();
        const hoursRemaining = diffMs / (1000 * 60 * 60);

        // Filter tasks within 6 hours (and due in the future/present)
        if (hoursRemaining >= 0 && hoursRemaining <= 6) {
          let notifyType: 'urgent' | 'warning' | 'reminder' | null = null;
          let title = '';
          let bodyMsg = '';

          if (hoursRemaining <= 1) {
            notifyType = 'urgent';
            title = '🚨 URGENT: Deadline in less than 1 hour!';
            bodyMsg = `Your task "${task.title}" is due soon. Click here to secure your progress.`;
          } else if (hoursRemaining <= 3) {
            notifyType = 'warning';
            title = '⚠️ WARNING: Deadline approaching';
            bodyMsg = `"${task.title}" is due in less than 3 hours. Plan your progress accordingly.`;
          } else if (hoursRemaining <= 6) {
            notifyType = 'reminder';
            title = '🔔 REMINDER: Upcoming Deadline';
            bodyMsg = `"${task.title}" is due in less than 6 hours.`;
          }

          let alertCreated = false;
          let pushSent = false;

          if (notifyType) {
            // Check if notification of this type already exists for this task
            const existingSnap = await adminDb
              .collection('users')
              .doc(userId)
              .collection('notifications')
              .where('taskId', '==', task.id)
              .where('type', '==', notifyType)
              .get();

            if (existingSnap.empty) {
              // Create and store
              const newNotification = {
                userId,
                taskId: task.id,
                taskTitle: task.title,
                title,
                body: bodyMsg,
                type: notifyType,
                read: false,
                createdAt: new Date().toISOString(),
              };

              await adminDb
                .collection('users')
                .doc(userId)
                .collection('notifications')
                .add(newNotification);

              alertCreated = true;

              // Send FCM Push notification
              if (fcmToken) {
                try {
                  await adminMessaging.send({
                    token: fcmToken,
                    notification: {
                      title,
                      body: bodyMsg,
                    },
                    data: {
                      click_action: `/rescue/${task.id}`,
                    },
                  });
                  pushSent = true;
                } catch (fcmError: any) {
                  console.warn(`[FCM] Send failed: ${fcmError.message}`);
                }
              }
            }
          }

          // Special Rule: If rescue mode is enabled and task is within 2 hours: Auto-activate rescue mode
          let rescueActivated = false;
          const rescueEnabled = userProfile.preferences?.rescueModeEnabled;

          if (rescueEnabled && hoursRemaining <= 2 && task.status !== 'rescued') {
            try {
              const res = await executeToolCall('activateRescueMode', { taskId: task.id }, userId, null);
              if (res.success) {
                rescueActivated = true;
                console.log(`[Notification Check] Auto-activated Rescue Mode for task ${task.id} (${task.title})`);
              }
            } catch (rescueErr: any) {
              console.error(`[Notification Check] Failed to auto-activate Rescue Mode:`, rescueErr);
            }
          }

          userResults.push({
            taskId: task.id,
            title: task.title,
            hoursRemaining,
            alertCreated,
            notifyType,
            pushSent,
            rescueActivated,
          });
        }
      }

      results.push({ userId, checkedCount: tasksSnap.size, matches: userResults });
    }

    return NextResponse.json({ success: true, checkedAt: now.toISOString(), results });
  } catch (error: any) {
    console.error('[API Notification Check] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
