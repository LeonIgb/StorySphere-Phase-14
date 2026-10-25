// Honest backend status. "connected" is only ever reported after a REAL request to your project
// succeeded: the Auth health endpoint and a read of the genres table (which needs the schema from
// supabase/migrations to be installed). Having a URL and key configured is NOT "connected".

import { readBackendConfig } from '../../config/backendConfig';
import { getClientInfo, getSupabase } from './supabaseClient';
import { call, withTimeout } from './errors';

// state: 'local' | 'invalid_config' | 'unverified' | 'checking' | 'connected' | 'schema_missing' | 'unreachable'
let current = null;
const listeners = new Set();

function baseStatus() {
  const { config, loadError } = getClientInfo();
  if (config.state === 'not_configured') {
    return { state: 'local', title: 'Local demo mode', detail: 'No online service is configured. Accounts and data stay on this device.', checkedAt: null };
  }
  if (config.state === 'invalid') {
    return { state: 'invalid_config', title: 'Backend settings not used', detail: config.reason, checkedAt: null };
  }
  if (loadError) {
    return { state: 'invalid_config', title: 'Backend package missing', detail: loadError, checkedAt: null };
  }
  return { state: 'unverified', title: 'Configured, not verified', detail: 'A project URL and public key are set, but the connection has not been checked yet.', checkedAt: null };
}

export function getBackendStatus() {
  if (!current) current = baseStatus();
  return current;
}

export function subscribeBackendStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(next) {
  current = next;
  listeners.forEach((fn) => fn(current));
  return current;
}

export const isOnlineMode = () => readBackendConfig().state === 'configured' && getSupabase() !== null;

// Makes real requests and reports exactly what happened.
export async function verifyConnection(fetchImpl) {
  const base = baseStatus();
  if (base.state !== 'unverified') return set(base);
  set({ ...base, state: 'checking', title: 'Checking connection…', detail: 'Contacting your project.' });
  const { config } = getClientInfo();
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const now = new Date().toISOString();

  // 1. Is the Auth service reachable with this key?
  try {
    const res = await withTimeout(doFetch(`${config.url}/auth/v1/health`, { headers: { apikey: config.key } }), 10000);
    if (!res.ok) {
      const bad = res.status === 401 || res.status === 403;
      return set({
        state: 'unreachable',
        title: bad ? 'The key was rejected' : 'Server returned an error',
        detail: bad ? 'Your project answered but rejected the public key. Check EXPO_PUBLIC_SUPABASE_ANON_KEY.' : `The auth service answered with status ${res.status}.`,
        checkedAt: now,
      });
    }
  } catch (e) {
    return set({ state: 'unreachable', title: 'Can’t reach the server', detail: 'No reply from your project URL. Check the URL and your connection.', checkedAt: now });
  }

  // 2. Is the schema installed, and is the database answering through the API with RLS in force?
  const client = getSupabase();
  const res = await call(() => client.from('genres').select('id', { count: 'exact' }).limit(1), { timeoutMs: 10000 });
  if (!res.ok) {
    if (res.kind === 'not_found') {
      return set({ state: 'schema_missing', title: 'Connected, schema not installed', detail: 'Your project is reachable, but the StorySphere tables are missing. Run the SQL files in supabase/migrations.', checkedAt: now });
    }
    return set({ state: 'unreachable', title: 'Database check failed', detail: res.error, checkedAt: now });
  }
  return set({ state: 'connected', title: 'Connected and verified', detail: 'Your project answered, and the StorySphere schema is installed.', checkedAt: now });
}

// For tests only.
export function __resetStatusForTests() {
  current = null;
}
