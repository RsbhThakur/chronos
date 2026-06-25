const fs = require('fs');
const path = require('path');

// 1. Simple parser for .env.local
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

// 2. Handle GOOGLE_APPLICATION_CREDENTIALS_JSON if specified
let tempCredsPath = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const parsed = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    tempCredsPath = path.join(__dirname, '../temp_credentials.json');
    fs.writeFileSync(tempCredsPath, JSON.stringify(parsed, null, 2));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredsPath;
  } catch (e) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message);
  }
}

function cleanup() {
  if (tempCredsPath && fs.existsSync(tempCredsPath)) {
    try {
      fs.unlinkSync(tempCredsPath);
    } catch (e) {}
  }
}

async function testVertex() {
  console.log('\n=== Testing Vertex AI (via @google/genai) ===');
  const project = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION;
  const modelName = process.env.GEMINI_MODEL_FLASH;

  console.log(`Project:  ${project}`);
  console.log(`Location: ${location}`);
  console.log(`Model:    ${modelName}`);

  const { GoogleGenAI } = require('@google/genai');
  try {
    const ai = new GoogleGenAI({
      vertexai: true,
      project: project,
      location: location,
    });

    console.log('Sending test prompt using @google/genai client...');
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
    });

    const text = response.text || (response.candidates && response.candidates[0].content.parts[0].text) || JSON.stringify(response);
    console.log(`✅ Vertex AI Success! Response: ${text.trim()}`);
    return true;
  } catch (err) {
    console.log(`❌ Vertex AI Failed: ${err.message || err}`);
    if (err.stack) {
      console.log(err.stack);
    }
    return false;
  }
}

async function testFirebaseAdmin() {
  console.log('\n=== Testing Firebase Admin ===');
  const serviceAccountKeyB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKeyB64) {
    console.log('❌ Error: FIREBASE_SERVICE_ACCOUNT_KEY is empty or not defined!');
    return false;
  }

  const { initializeApp, cert, deleteApp } = require('firebase-admin/app');
  const { getFirestore, FieldValue } = require('firebase-admin/firestore');

  try {
    const decodedJson = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decodedJson);
    console.log(`Decoded Service Account: ${serviceAccount.client_email}`);
    console.log(`Targeting Firebase Project: ${serviceAccount.project_id}`);

    const app = initializeApp({
      credential: cert(serviceAccount)
    }, 'test-app');

    const db = getFirestore(app);

    console.log('Attempting Firestore write to collection "connection_test"...');
    const testDoc = db.collection('connection_test').doc('status');
    await testDoc.set({
      connected: true,
      timestamp: FieldValue.serverTimestamp(),
      testBy: 'Chronos Env Checker'
    });

    console.log('Attempting Firestore read...');
    const snapshot = await testDoc.get();
    const data = snapshot.data();
    console.log(`✅ Firebase Admin Success! Read back document:`, JSON.stringify(data));

    await testDoc.delete();
    console.log('Temporary document cleaned up.');

    await deleteApp(app);
    return true;
  } catch (err) {
    console.log(`❌ Firebase Admin Failed: ${err.message || err}`);
    return false;
  }
}

async function main() {
  const vertexOk = await testVertex();
  const firebaseOk = await testFirebaseAdmin();

  console.log('\n=== Final Environment Status ===');
  console.log(`Vertex AI:      ${vertexOk ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Firebase Admin: ${firebaseOk ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (!vertexOk || !firebaseOk) {
    console.log('\n⚠️ Some environment variables need adjustment. Please check the logs above.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL CORE SERVICES AUTHENTICATED SUCCESSFULLY!');
    process.exit(0);
  }
}

main()
  .then(() => {
    cleanup();
  })
  .catch(err => {
    console.error(err);
    cleanup();
    process.exit(1);
  });
