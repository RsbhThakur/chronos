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

const { initializeApp, cert } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');

const decodedJson = Buffer.from(serviceAccountKeyB64, 'base64').toString('utf8');
const serviceAccount = JSON.parse(decodedJson);

const app = initializeApp({
  credential: cert(serviceAccount)
});

async function deploy() {
  const rulesPath = path.join(__dirname, '../firestore.rules');
  console.log(`Reading rules from ${rulesPath}...`);
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');

  console.log('Deploying Firestore security rules...');
  const rules = getSecurityRules(app);
  const ruleset = await rules.releaseFirestoreRulesetFromSource(rulesContent);
  console.log(`✅ Ruleset released successfully: ${ruleset.name}`);
}

deploy()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed to deploy rules:', err.message || err);
    process.exit(1);
  });
