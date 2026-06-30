import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

const getFirebaseConfig = () => {
  if (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__) {
    return (window as any).__FIREBASE_CONFIG__;
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyPlaceholderKeyForBuildTimePrerendering',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder-project-id.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder-project-id',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'placeholder-project-id.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:1234567890abcdef',
  };
};

const firebaseConfig = getFirebaseConfig();

let _app: any = null;
let _auth: any = null;
let _db: any = null;

function getClientApp() {
  if (!_app) {
    if (getApps().length > 0) {
      _app = getApp();
    } else {
      const config = getFirebaseConfig();
      // If API key is missing or is the placeholder, log a warning instead of hard crashing on module load
      if (!config.apiKey || config.apiKey.includes('Placeholder')) {
        console.warn('Firebase Client SDK is initializing with placeholder credentials.');
      }
      _app = initializeApp(config);
    }
  }
  return _app;
}

const app = new Proxy({} as any, {
  get(target, prop) {
    const inst = getClientApp();
    const val = (inst as any)[prop];
    return typeof val === 'function' ? val.bind(inst) : val;
  }
});

const auth = new Proxy({} as any, {
  get(target, prop) {
    if (!_auth) _auth = getAuth(getClientApp());
    const val = (_auth as any)[prop];
    return typeof val === 'function' ? val.bind(_auth) : val;
  }
});

const db = new Proxy({} as any, {
  get(target, prop) {
    if (!_db) _db = getFirestore(getClientApp());
    const val = (_db as any)[prop];
    return typeof val === 'function' ? val.bind(_db) : val;
  }
});

// Lazy Messaging Init (client-side only)
let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn('Firebase Messaging is not supported in this browser environment:', err);
  }
}

// Google Auth Provider setup with scopes
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/tasks');

const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
const logOut = () => signOut(auth);

export { app, auth, db, messaging, googleProvider, signInWithGoogle, logOut };
