'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { db, messaging } from '@/lib/firebase';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';

export interface ChronosNotification {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  title: string;
  body: string;
  type: 'urgent' | 'warning' | 'reminder';
  read: boolean;
  createdAt: string;
}

export const useNotifications = (userId: string) => {
  const { isDemo } = useDemo();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<ChronosNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Subscribe to Firestore in-app notifications
  useEffect(() => {
    if (isDemo) {
      // Setup demo mock notifications state
      const mockNotifications: ChronosNotification[] = [
        {
          id: 'demo-notif-1',
          userId: 'demo-user',
          taskId: 'demo-task-ml',
          taskTitle: 'Machine Learning Assignment',
          title: '🚨 URGENT: Deadline in less than 1 hour!',
          body: 'Your task "Machine Learning Assignment" is due soon. Click here to secure your progress.',
          type: 'urgent',
          read: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: 'demo-notif-2',
          userId: 'demo-user',
          taskId: 'demo-task-dsa',
          taskTitle: 'Review DSA Notes for Interview',
          title: '⚠️ WARNING: Deadline approaching',
          body: '"Review DSA Notes for Interview" is due in less than 3 hours. Plan your progress accordingly.',
          type: 'warning',
          read: false,
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        }
      ];
      setNotifications(mockNotifications);
      setUnreadCount(2);
      return;
    }

    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as ChronosNotification[];

        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      },
      (err) => {
        console.error('[useNotifications] Firestore subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [userId, isDemo]);

  // 2. Request permission and retrieve FCM token
  const requestPermission = async (isAutomatic = false) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported in this browser.');
      return false;
    }

    const existingPermission = Notification.permission;

    if (isDemo) {
      if (!isAutomatic) {
        showToast({
          type: 'success',
          message: 'Demo Notification Permission Granted!',
        });
      }
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        if (existingPermission !== 'granted' && !isAutomatic) {
          showToast({
            type: 'success',
            message: 'Notifications enabled successfully!',
          });
        }

        // Register Service Worker and retrieve Token
        if (messaging && 'serviceWorker' in navigator) {
          const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || (typeof window !== 'undefined' ? (window as any).__FIREBASE_CONFIG__?.vapidKey : '');
          if (!vapidKey) {
            console.warn('[useNotifications] VAPID key is missing in environment. Push registration skipped.');
            return true;
          }

          const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
          // Wait for service worker to become active and ready to avoid PushManager subscription AbortError
          await navigator.serviceWorker.ready;
          if (!reg.active && (reg.installing || reg.waiting)) {
            const activeSw = reg.installing || reg.waiting;
            if (activeSw) {
              await new Promise<void>((resolve) => {
                const handler = () => {
                  if (activeSw.state === 'activated') {
                    activeSw.removeEventListener('statechange', handler);
                    resolve();
                  }
                };
                activeSw.addEventListener('statechange', handler);
                setTimeout(resolve, 3000);
              });
            }
          }

          const token = await getToken(messaging, {
            serviceWorkerRegistration: reg,
            vapidKey: vapidKey,
          });

          if (token && userId) {
            // Save token to user profile
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { fcmToken: token });
            console.log('[useNotifications] FCM Token saved to profile.');
          }
        }
        return true;
      } else {
        showToast({
          type: 'error',
          message: 'Notification permission was denied.',
        });
        return false;
      }
    } catch (err: any) {
      console.error('[useNotifications] Error requesting notification permission:', err);
      return false;
    }
  };

  // 3. Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (isDemo) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      showToast({
        type: 'success',
        message: 'Notification marked as read (Demo).',
      });
      return;
    }

    if (!userId || !notificationId) return;

    try {
      // Attempt API fetch PATCH
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, userId, read: true }),
      });

      if (!res.ok) {
        // Fallback to direct client-side Firestore write if API route has permission/session bounds
        const notifDocRef = doc(db, 'users', userId, 'notifications', notificationId);
        await updateDoc(notifDocRef, { read: true, updatedAt: new Date().toISOString() });
      }
    } catch (err: any) {
      console.error('[useNotifications] Failed to mark as read, falling back to direct write:', err);
      try {
        const notifDocRef = doc(db, 'users', userId, 'notifications', notificationId);
        await updateDoc(notifDocRef, { read: true, updatedAt: new Date().toISOString() });
      } catch (directErr) {
        console.error('[useNotifications] Direct write failed:', directErr);
      }
    }
  };

  return {
    notifications,
    unreadCount,
    requestPermission,
    markAsRead,
  };
};
