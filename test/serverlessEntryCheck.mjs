import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const cjsProbe = spawnSync(
  process.execPath,
  ['test/jwksCjsProbe.cjs'],
  {
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production' }
  }
);

if (cjsProbe.stdout) process.stdout.write(cjsProbe.stdout);
if (cjsProbe.stderr) process.stderr.write(cjsProbe.stderr);

assert.equal(
  cjsProbe.status,
  0,
  `CommonJS probe failed with exit ${cjsProbe.status}: ${cjsProbe.stderr || cjsProbe.stdout}`
);

process.env.NODE_ENV = 'production';
process.env.APP_URL = 'https://portal-vip-brasil.vercel.app';
process.env.FIREBASE_ADMIN_PROJECT_ID = 'portal-runtime-check';
process.env.FIREBASE_ADMIN_CLIENT_EMAIL = 'runtime-check@portal-runtime-check.iam.gserviceaccount.com';
process.env.FIREBASE_ADMIN_PRIVATE_KEY = [
  '-----BEGIN PRIVATE KEY-----',
  'RUNTIME_CHECK_ONLY_NOT_USED_FOR_NETWORK',
  '-----END PRIVATE KEY-----'
].join('\n');
process.env.TOKEN_ENCRYPTION_KEY = 'runtime_check_token_encryption_key_32_bytes';
process.env.CRON_SECRET = 'runtime_check_cron_secret';
process.env.GEMINI_API_KEY = 'runtime_check_gemini_key';
process.env.GEMINI_MEDIA_API_KEY = 'runtime_check_gemini_media_key';
process.env.ADMIN_BOOTSTRAP_ENABLED = 'false';
process.env.PRIVATE_PORTAL_MODE = 'true';
process.env.PORTAL_ADMIN_EMAILS = 'runtime-check@example.com';

const firestoreModule = await import('@google-cloud/firestore');
const storageModule = await import('@google-cloud/storage');

assert.equal(typeof firestoreModule.Firestore, 'function');
assert.equal(typeof storageModule.Storage, 'function');

const apiModule = await import('../api/index.ts');
assert.equal(typeof apiModule.default, 'function');

console.log('[serverless-entry] Firestore import OK');
console.log('[serverless-entry] Storage import OK');
console.log('[serverless-entry] api/index.ts production import OK');
console.log('[serverless-entry] CommonJS/ESM interoperability OK');
