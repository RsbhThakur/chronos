import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

const serviceAccountKeyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKeyB64) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not defined!');
}

let serviceAccount;
try {
  const decodedJson = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf8');
  serviceAccount = JSON.parse(decodedJson);
} catch (err: any) {
  throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${err.message}`);
}

const app = getApps().length === 0
  ? initializeApp({
      credential: cert(serviceAccount),
    })
  : getApp();

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);
const adminMessaging = getMessaging(app);

export { app as adminApp, adminDb, adminAuth, adminMessaging };
