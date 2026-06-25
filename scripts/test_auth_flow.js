const fs = require('fs');
const path = require('path');

// Load environment from .env.local
const envPath = path.join(__dirname, '../.env.local');
console.log(`Loading environment from ${envPath}...`);
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) return;
    const key = trimmed.substring(0, firstEquals).trim();
    let val = trimmed.substring(firstEquals + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
} else {
  console.error('.env.local file not found!');
  process.exit(1);
}

const serviceAccountKeyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKeyB64) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not defined!');
  process.exit(1);
}

// 1. Initialize Firebase Admin SDK and mint Custom Token
const { initializeApp: initAdmin, cert } = require('firebase-admin/app');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');

const decodedJson = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decodedJson);

const adminApp = initAdmin({
  credential: cert(serviceAccount)
}, 'admin-test');

const adminAuth = getAdminAuth(adminApp);

// 2. Initialize Firebase Client SDK
const { initializeApp: initClient } = require('firebase/app');
const { getAuth: getClientAuth, signInWithCustomToken, signOut } = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const clientApp = initClient(firebaseConfig);
const clientAuth = getClientAuth(clientApp);
const clientDb = getFirestore(clientApp);

async function runTest() {
  const mockUid = 'mock-user-123';
  console.log(`\n1. Minting Firebase Custom Token for UID: "${mockUid}"...`);
  const customToken = await adminAuth.createCustomToken(mockUid);
  console.log('✅ Custom Token generated successfully!');

  console.log('\n2. Authenticating Firebase Client SDK with Custom Token...');
  const userCredential = await signInWithCustomToken(clientAuth, customToken);
  console.log(`✅ Client authenticated! Logged in as: ${userCredential.user.uid}`);

  console.log('\n3. Testing Security Rules: Attempting authorized write to own user path...');
  const ownDocRef = doc(clientDb, 'users', mockUid, 'connection_test', 'status');
  try {
    await setDoc(ownDocRef, {
      success: true,
      timestamp: new Date(),
      message: 'Authorized write test'
    });
    console.log('✅ Authorized write succeeded! (Correct behavior under security rules)');
  } catch (err) {
    console.error('❌ Authorized write failed:', err.message);
    throw err;
  }

  console.log('\n4. Testing Security Rules: Attempting authorized read from own user path...');
  try {
    const snap = await getDoc(ownDocRef);
    console.log(`✅ Authorized read succeeded! Data read back:`, JSON.stringify(snap.data()));
  } catch (err) {
    console.error('❌ Authorized read failed:', err.message);
    throw err;
  }

  console.log('\n5. Testing Security Rules: Attempting UNAUTHORIZED write to another user\'s path...');
  const otherUid = 'other-user-456';
  const otherDocRef = doc(clientDb, 'users', otherUid, 'connection_test', 'status');
  try {
    await setDoc(otherDocRef, {
      success: false,
      timestamp: new Date(),
      message: 'Unauthorized write test'
    });
    console.error('❌ FAILED: Unauthorized write succeeded! Security rules are not working.');
    process.exit(1);
  } catch (err) {
    console.log(`✅ Unauthorized write failed with: "${err.message}". (Correct behavior: blocked by rules)`);
  }

  console.log('\n6. Testing Security Rules: Attempting UNAUTHORIZED read from another user\'s path...');
  try {
    await getDoc(otherDocRef);
    console.error('❌ FAILED: Unauthorized read succeeded! Security rules are not working.');
    process.exit(1);
  } catch (err) {
    console.log(`✅ Unauthorized read failed with: "${err.message}". (Correct behavior: blocked by rules)`);
  }

  console.log('\n7. Cleaning up test document...');
  try {
    await deleteDoc(ownDocRef);
    console.log('✅ Temporary document cleaned up.');
  } catch (err) {
    console.warn('⚠️ Warning: Cleanup failed:', err.message);
  }

  console.log('\n8. Signing out client auth...');
  await signOut(clientAuth);
  console.log('✅ Client signed out successfully.');
}

runTest()
  .then(() => {
    console.log('\n🎉 ALL SECURITY RULES AND AUTH SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Test execution failed:', err);
    process.exit(1);
  });
