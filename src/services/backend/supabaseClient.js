// The one place the Supabase client is created.
//
// - Uses ONLY the public URL and anon/publishable key from config/backendConfig.js, which refuses
//   privileged keys. The service_role key is never read anywhere in the app.
// - The session (access + refresh token) is kept by supabase-js in AsyncStorage and refreshed
//   automatically while the app is in the foreground.
// - Returns null when the backend isn't configured or the package isn't installed, so callers
//   can fall back to local demo mode.

import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readBackendConfig } from '../../config/backendConfig';

let cached;
let loadError = null;
let appStateSub = null;

export function getClientInfo() {
  const config = readBackendConfig();
  return { config, loadError };
}

export function getSupabase() {
  if (cached !== undefined) return cached;
  cached = null;
  const config = readBackendConfig();
  if (config.state !== 'configured') return cached;
  try {
    // Loaded lazily so a missing package only disables the backend, not the whole app.
    try {
      require('react-native-url-polyfill/auto'); // supabase-js on React Native needs URL support
    } catch (e) {
      // Optional on platforms that already provide URL (web).
    }
    const { createClient } = require('@supabase/supabase-js');
    cached = createClient(config.url, config.key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // supabase-js docs: only refresh tokens while the app is active.
    if (!appStateSub && AppState && typeof AppState.addEventListener === 'function') {
      appStateSub = AppState.addEventListener('change', (state) => {
        if (!cached) return;
        if (state === 'active') cached.auth.startAutoRefresh();
        else cached.auth.stopAutoRefresh();
      });
    }
  } catch (e) {
    loadError = 'The @supabase/supabase-js package could not be loaded.';
    cached = null;
  }
  return cached;
}

export const isBackendEnabled = () => getSupabase() !== null;

// For tests only.
export function __resetClientForTests() {
  cached = undefined;
  loadError = null;
}
