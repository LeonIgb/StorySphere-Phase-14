// Backend configuration (Phase 13).
//
// WHAT GOES HERE: only two PUBLIC values from your Supabase project (Project Settings > API):
//   - the Project URL                     e.g. https://abcdxyz.supabase.co
//   - the anon / publishable key          (safe to ship in an app: Row Level Security protects data)
//
// WHAT MUST NEVER GO HERE: the service_role key, a key starting "sb_secret_", the database
// password, or a JWT secret. They bypass all access rules. This file refuses to use them (see
// readBackendConfig below), but the only real protection is that you never paste them in.
// Privileged work happens in Supabase Edge Functions, where such keys are server-side secrets.
//
// HOW TO SUPPLY THE VALUES
//   Local Expo project:  copy .env.example to .env and fill in the two EXPO_PUBLIC_ variables.
//   Expo Snack (no .env): paste the two values into SNACK_URL and SNACK_ANON_KEY below.
// With both empty the app runs in LOCAL DEMO MODE, exactly as before Phase 13.

const SNACK_URL = '';
const SNACK_ANON_KEY = '';

// These must stay literal `process.env.EXPO_PUBLIC_*` expressions so Expo can inline them at build
// time. The try/catch covers runtimes (such as Snack) where `process` doesn't exist.
let ENV_URL = '';
let ENV_KEY = '';
try {
  ENV_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  ENV_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
} catch (e) {
  // No environment available: fall back to the SNACK_* constants above.
}

const clean = (v) => (typeof v === 'string' ? v.trim() : '');

// Decodes the middle part of a JWT (base64url JSON). Returns null when it is not a JWT.
export function decodeJwtPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    let json;
    if (typeof atob === 'function') {
      json = decodeURIComponent(
        atob(b64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
    } else {
      json = Buffer.from(b64, 'base64').toString('utf8');
    }
    const payload = JSON.parse(json);
    return payload && typeof payload === 'object' ? payload : null;
  } catch (e) {
    return null;
  }
}

// Returns { state, url, key, reason }.
//   state 'not_configured' : nothing supplied, the app uses local demo mode.
//   state 'invalid'        : something was supplied but is unsafe or malformed, so it is NOT used.
//   state 'configured'     : url + public key look usable (this does NOT mean they work).
export function readBackendConfig(input) {
  const url = clean(input ? input.url : ENV_URL || SNACK_URL);
  const key = clean(input ? input.key : ENV_KEY || SNACK_ANON_KEY);
  if (!url && !key) return { state: 'not_configured', url: '', key: '', reason: 'No backend URL or key has been set.' };
  if (!url || !key) {
    return { state: 'invalid', url: '', key: '', reason: 'Both the project URL and the public key are needed.' };
  }
  if (!/^https:\/\/[^\s/]+\.[^\s/]+/i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url)) {
    return { state: 'invalid', url: '', key: '', reason: 'The project URL must start with https://.' };
  }
  // Privileged credentials are refused outright.
  if (/^sb_secret_/i.test(key)) {
    return { state: 'invalid', url: '', key: '', reason: 'That is a secret key. Use the publishable (anon) key. Secret keys must never be in the app.' };
  }
  const payload = decodeJwtPayload(key);
  if (payload && payload.role && payload.role !== 'anon') {
    return {
      state: 'invalid',
      url: '',
      key: '',
      reason: `That key has the "${payload.role}" role. Only the anon/publishable key may be used in the app. Privileged keys must never be in client code.`,
    };
  }
  if (!payload && !/^sb_publishable_/i.test(key)) {
    return { state: 'invalid', url: '', key: '', reason: 'The key is not a recognised anon or publishable key.' };
  }
  return { state: 'configured', url: url.replace(/\/+$/, ''), key, reason: '' };
}
