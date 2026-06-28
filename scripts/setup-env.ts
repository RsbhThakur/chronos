import fs from 'fs';
import path from 'path';

// Load .env.local variables
const envPath = path.join(__dirname, '../.env.local');
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
}

// Handle GOOGLE_APPLICATION_CREDENTIALS_JSON if specified
let tempCredsPath: string | null = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const parsed = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    tempCredsPath = path.join(__dirname, '../temp_credentials_test.json');
    fs.writeFileSync(tempCredsPath, JSON.stringify(parsed, null, 2));
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredsPath;
  } catch (e: any) {
    console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message);
  }
}

// Clean up credentials on exit
process.on('exit', () => {
  if (tempCredsPath && fs.existsSync(tempCredsPath)) {
    try {
      fs.unlinkSync(tempCredsPath);
    } catch (e) {}
  }
});
