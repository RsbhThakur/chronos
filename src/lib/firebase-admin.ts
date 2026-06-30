import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';

let _app: any = null;
function getAdminApp() {
  if (!_app) {
    if (getApps().length > 0) {
      _app = getApp();
    } else {
      const serviceAccountKeyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKeyB64) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not defined!');
      }
      try {
        const decodedJson = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(decodedJson);
        _app = initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (err: any) {
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${err.message}`);
      }
    }
  }
  return _app;
}

// Export lazy proxies for app, Db, Auth, and Messaging
export const adminApp = new Proxy({} as unknown as App, {
  get(target, prop) {
    const appInstance = getAdminApp();
    const val = (appInstance as any)[prop];
    return typeof val === 'function' ? val.bind(appInstance) : val;
  }
});

export const adminDb = new Proxy({} as unknown as Firestore, {
  get(target, prop) {
    const db = getFirestore(getAdminApp());
    const val = (db as any)[prop];
    return typeof val === 'function' ? val.bind(db) : val;
  }
});

export const adminAuth = new Proxy({} as unknown as Auth, {
  get(target, prop) {
    const auth = getAuth(getAdminApp());
    const val = (auth as any)[prop];
    return typeof val === 'function' ? val.bind(auth) : val;
  }
});

export const adminMessaging = new Proxy({} as unknown as Messaging, {
  get(target, prop) {
    const messaging = getMessaging(getAdminApp());
    const val = (messaging as any)[prop];
    return typeof val === 'function' ? val.bind(messaging) : val;
  }
});
