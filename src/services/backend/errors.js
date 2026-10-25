// Turns Supabase / PostgREST / network failures into friendly, safe messages.
// Raw database or server text is never shown to people, because it can reveal table names,
// constraints and other internals.
//
// mapError(err) -> { kind, message, retryable }
//   kind: 'network' | 'timeout' | 'auth' | 'session' | 'permission' | 'conflict' | 'invalid' |
//         'not_found' | 'rate_limit' | 'server' | 'config' | 'unknown'

export class TimeoutError extends Error {
  constructor(ms) {
    super(`Request timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

const RPC_MESSAGES = {
  // Media (Phase 14). Longer keys first: some contain shorter ones.
  story_not_found_or_not_owner: 'That story doesn’t exist or isn’t yours.',
  too_many_pending_uploads: 'Too many uploads are waiting. Let them finish, or try again in a little while.',
  storage_quota_exceeded: 'You’ve used all of your storage. Delete some media you no longer use, then try again.',
  new_file_not_ready: 'The new file isn’t ready yet. Try again in a moment.',
  file_not_uploaded: 'The file didn’t finish uploading. Please try again.',
  upload_not_pending: 'That upload is no longer waiting. Start it again.',
  unsupported_type: 'That file type isn’t supported.',
  file_too_large: 'That file is larger than the limit.',
  type_mismatch: 'The uploaded file wasn’t the type it said it was.',
  kind_mismatch: 'A replacement must be the same kind of file.',
  empty_file: 'That file is empty.',
  invalid_kind: 'That kind of file isn’t supported.',
  invalid_visibility: 'That file can’t be stored that way.',
  needs_a_chapter_with_text: 'Add a chapter with some text before publishing.',
  title_too_short: 'Give the story a title of at least 3 characters.',
  synopsis_too_short: 'Add a short description (at least 10 characters) before publishing.',
  chapter_is_empty: 'This chapter has no text yet.',
  too_many_tags: 'A story can have up to 8 tags.',
  not_found_or_not_owner: 'That item doesn’t exist or isn’t yours to change.',
  not_authenticated: 'Please sign in again.',
  not_signed_in: 'Please sign in again.',
};

const has = (text, ...needles) => needles.some((n) => text.includes(n));

export function mapError(err) {
  if (!err) return { kind: 'unknown', message: 'Something went wrong. Please try again.', retryable: true };
  const msg = String(err.message || err.error_description || err.msg || '').toLowerCase();
  const code = String(err.code || err.error_code || '');
  const status = Number(err.status || err.statusCode || 0);
  const name = String(err.name || '');

  // Network and timeouts (nothing reached the server, or no reply came back).
  if (err instanceof TimeoutError || name === 'TimeoutError') {
    return { kind: 'timeout', message: 'The server took too long to answer. Please try again.', retryable: true };
  }
  if (
    name === 'AuthRetryableFetchError' ||
    has(msg, 'network request failed', 'failed to fetch', 'networkerror', 'network error', 'load failed', 'fetch failed') ||
    (name === 'TypeError' && has(msg, 'network', 'fetch'))
  ) {
    return { kind: 'network', message: 'Can’t reach the server. Check your connection and try again.', retryable: true };
  }

  // Sign-in and sign-up.
  if (code === 'invalid_credentials' || has(msg, 'invalid login credentials')) {
    return { kind: 'auth', message: 'That email and password don’t match an account.', retryable: false };
  }
  if (code === 'email_not_confirmed' || has(msg, 'email not confirmed')) {
    return { kind: 'auth', message: 'Please confirm your email first. Check your inbox for the link.', retryable: false };
  }
  if (code === 'user_already_exists' || code === 'email_exists' || has(msg, 'user already registered', 'already been registered')) {
    return { kind: 'conflict', message: 'An account with this email already exists. Try signing in.', retryable: false };
  }
  if (code === 'weak_password' || has(msg, 'password should be', 'weak password')) {
    return { kind: 'invalid', message: 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.', retryable: false };
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429 || has(msg, 'rate limit', 'too many requests')) {
    return { kind: 'rate_limit', message: 'Too many attempts. Please wait a minute and try again.', retryable: false };
  }
  if (code === 'signup_disabled') {
    return { kind: 'auth', message: 'New sign-ups are turned off for this app.', retryable: false };
  }

  // Sessions.
  if (code === 'PGRST301' || code === 'bad_jwt' || has(msg, 'jwt expired', 'invalid jwt', 'refresh token', 'session_not_found', 'auth session missing')) {
    return { kind: 'session', message: 'Your session has ended. Please sign in again.', retryable: false };
  }

  // Database rules (PostgREST passes Postgres SQLSTATE codes through as `code`).
  if (RPC_MESSAGES[msg]) return { kind: code === '28000' ? 'session' : 'invalid', message: RPC_MESSAGES[msg], retryable: false };
  for (const key of Object.keys(RPC_MESSAGES)) {
    if (msg.includes(key)) return { kind: key === 'not_authenticated' || key === 'not_signed_in' ? 'session' : 'invalid', message: RPC_MESSAGES[key], retryable: false };
  }
  if (code === '42501' || status === 401 || status === 403 || has(msg, 'row-level security', 'permission denied')) {
    return { kind: 'permission', message: 'You don’t have permission to do that.', retryable: false };
  }
  if (code === '23505') return { kind: 'conflict', message: 'That already exists.', retryable: false };
  if (code === '23503') return { kind: 'invalid', message: 'That refers to something that no longer exists.', retryable: false };
  if (code === '23514' || code === '22001' || code === '22P02') {
    return { kind: 'invalid', message: 'Some of that information isn’t valid. Check it and try again.', retryable: false };
  }
  if (code === 'PGRST116' || code === 'PGRST205' || status === 404 || code === '42P01') {
    return { kind: 'not_found', message: 'We couldn’t find that.', retryable: false };
  }
  if (status >= 500 || code === 'PGRST000' || code === 'PGRST002') {
    return { kind: 'server', message: 'The server had a problem. Please try again in a moment.', retryable: true };
  }
  return { kind: 'unknown', message: 'Something went wrong. Please try again.', retryable: true };
}

export function withTimeout(promise, ms = 15000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs `fn` (which returns a promise of { data, error } like supabase-js) with a timeout and, for
// SAFE reads only, retries once on a network failure. Returns { ok, data?, error?, kind?, retryable? }.
// Writes are never retried automatically: a retry could apply the change twice.
export async function call(fn, { timeoutMs = 15000, retryReads = false, retryDelayMs = 400 } = {}) {
  const attempt = async () => {
    try {
      const res = await withTimeout(Promise.resolve().then(fn), timeoutMs);
      if (res && res.error) return { ok: false, mapped: mapError(res.error) };
      return { ok: true, data: res ? res.data : null };
    } catch (e) {
      return { ok: false, mapped: mapError(e) };
    }
  };
  let out = await attempt();
  if (!out.ok && retryReads && out.mapped.retryable && ['network', 'timeout', 'server'].includes(out.mapped.kind)) {
    await sleep(retryDelayMs);
    out = await attempt();
  }
  if (out.ok) return { ok: true, data: out.data };
  return { ok: false, error: out.mapped.message, kind: out.mapped.kind, retryable: out.mapped.retryable };
}
