// Real authentication with Supabase Auth. Same interface as the local prototype provider in
// services/authService.js. Passwords are sent over HTTPS to Supabase and hashed there (bcrypt);
// this app never stores a password. The session lives in AsyncStorage, managed by supabase-js.

import { getSupabase } from './supabaseClient';
import { call, mapError, withTimeout } from './errors';
import { normalizeEmail, validateRegistration, validateSignIn } from '../../utils/account';

const toUser = (u) => ({
  id: u.id,
  email: u.email || null,
  isDemo: false,
  createdAt: u.created_at || new Date().toISOString(),
  backend: true,
});

const failure = (e) => {
  const m = mapError(e);
  return { ok: false, errors: {}, error: m.message, kind: m.kind, retryable: m.retryable };
};

export const supabaseAuthProvider = {
  // Reads the stored session. supabase-js refreshes an expired access token with the refresh
  // token; if that needs the network and it is down, the stored session is kept for next time.
  async restoreSession() {
    const client = getSupabase();
    if (!client) return { ok: true, user: null };
    try {
      const { data, error } = await withTimeout(client.auth.getSession(), 12000);
      if (error || !data || !data.session) return { ok: true, user: null, error: error ? mapError(error).message : undefined };
      return { ok: true, user: toUser(data.session.user) };
    } catch (e) {
      return { ok: true, user: null, error: mapError(e).message };
    }
  },

  async signUp({ displayName, email, password, confirm, role }) {
    const errors = validateRegistration({ displayName, email, password, confirm });
    if (Object.keys(errors).length) return { ok: false, errors, error: 'Check the highlighted fields.' };
    const client = getSupabase();
    if (!client) return { ok: false, errors: {}, error: 'The online service isn’t set up.', kind: 'config' };
    try {
      const { data, error } = await withTimeout(
        client.auth.signUp({
          email: normalizeEmail(email),
          password,
          // The profile row is created by a database trigger from this metadata (validated there).
          options: { data: { display_name: String(displayName).trim(), role: role === 'storyteller' ? 'storyteller' : 'reader' } },
        }),
        20000
      );
      if (error) {
        const out = failure(error);
        if (out.kind === 'conflict') out.errors = { email: out.error };
        if (out.kind === 'invalid') out.errors = { password: out.error };
        return out;
      }
      // With email confirmation on, Supabase hides whether an address exists by returning a user
      // with no identities instead of an error.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { ok: false, errors: { email: 'An account with this email already exists. Try signing in.' }, error: 'Email already used.', kind: 'conflict' };
      }
      if (!data.session) {
        return {
          ok: false,
          pending: true,
          errors: {},
          error: 'Almost done. We sent a confirmation link to your email. Open it, then sign in.',
          kind: 'confirm_email',
        };
      }
      return { ok: true, user: toUser(data.session.user) };
    } catch (e) {
      return failure(e);
    }
  },

  async signIn({ email, password }) {
    const errors = validateSignIn({ email, password });
    if (Object.keys(errors).length) return { ok: false, errors, error: 'Check the highlighted fields.' };
    const client = getSupabase();
    if (!client) return { ok: false, errors: {}, error: 'The online service isn’t set up.', kind: 'config' };
    try {
      const { data, error } = await withTimeout(client.auth.signInWithPassword({ email: normalizeEmail(email), password }), 20000);
      if (error) return failure(error);
      return { ok: true, user: toUser(data.session.user) };
    } catch (e) {
      return failure(e);
    }
  },

  async signInDemo() {
    return { ok: false, errors: {}, error: 'Demo mode is handled locally.' };
  },

  // scope 'local' ends this device's session without needing the network.
  async signOut() {
    const client = getSupabase();
    if (!client) return { ok: true };
    try {
      await withTimeout(client.auth.signOut({ scope: 'local' }), 8000);
    } catch (e) {
      // Even if the call fails, the local session is cleared by supabase-js on a best-effort basis.
    }
    return { ok: true };
  },

  // Deleting an auth user needs a privileged key, so it is done by the "delete-account" Edge
  // Function (supabase/functions/delete-account). The function identifies the caller from the JWT.
  async deleteAccount() {
    const client = getSupabase();
    if (!client) return { ok: false, error: 'The online service isn’t set up.', kind: 'config' };
    const res = await call(() => client.functions.invoke('delete-account', { method: 'POST' }), { timeoutMs: 20000 });
    if (!res.ok) return { ok: false, error: res.error, kind: res.kind, retryable: res.retryable };
    await this.signOut();
    return { ok: true };
  },
};
