// Calls to the media tables, functions and Storage. Everything here goes through the user's own
// session (the anon key plus their access token), so the database rules in
// supabase/migrations/20261024000004_media.sql decide what is allowed.
//
// Every function returns { ok, data } or { ok: false, error, kind, retryable } and never throws.

import { getSupabase } from '../backend/supabaseClient';
import { call, mapError } from '../backend/errors';
import { getClientInfo } from '../backend/supabaseClient';
import { mediaConfig } from '../../config/mediaConfig';

const NOT_ONLINE = { ok: false, error: 'Cloud storage isn’t set up. Files stay on this device.', kind: 'config', retryable: false };

export function storageEndpoint() {
  const { config } = getClientInfo();
  return config && config.state === 'configured' ? { url: `${String(config.url).replace(/\/+$/, '')}/storage/v1`, anonKey: config.key } : null;
}

export async function getAccessToken() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data && data.session ? data.session.access_token : null;
  } catch (e) {
    return null;
  }
}

export async function currentUserId() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data && data.session && data.session.user ? data.session.user.id : null;
  } catch (e) {
    return null;
  }
}

export async function requestUpload({ kind, visibility, mimeType, size, name, storyId }) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  return call(() => sb.rpc('request_upload', { p_kind: kind, p_visibility: visibility, p_mime: mimeType, p_size: size, p_name: name || '', p_story_id: storyId || null }), { timeoutMs: 20000 });
}

export async function completeUpload(assetId, { width, height, durationMs } = {}) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  // complete_upload is safe to repeat (it returns the same result once ready), so it may be retried.
  return call(() => sb.rpc('complete_upload', { p_asset_id: assetId, p_width: width || null, p_height: height || null, p_duration_ms: durationMs || null }), { timeoutMs: 20000, retryReads: true });
}

export async function attachMedia(assetId, storyId) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  return call(() => sb.rpc('attach_media', { p_asset_id: assetId, p_story_id: storyId }));
}

export async function deleteMediaRow(assetId) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  return call(() => sb.rpc('delete_media', { p_asset_id: assetId }));
}

export async function replaceMediaRow(oldId, newId) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  return call(() => sb.rpc('replace_media', { p_old: oldId, p_new: newId }));
}

// Removes the stored file. Allowed by policy only for files that are not live (pending, failed, deleted).
export async function removeObject(bucket, path) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  return call(() => sb.storage.from(bucket).remove([path]));
}

export function publicUrlFor(bucket, path) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data && data.publicUrl ? data.publicUrl : null;
}

const COLUMNS = 'id, owner_id, story_id, kind, visibility, bucket, path, mime_type, size_bytes, original_name, width, height, duration_ms, status, processing, variants, created_at';

export async function getAsset(assetId) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  const res = await call(() => sb.from('media_assets').select(COLUMNS).eq('id', assetId).maybeSingle(), { retryReads: true });
  if (res.ok && !res.data) return { ok: false, error: 'We couldn’t find that file.', kind: 'not_found', retryable: false };
  return res;
}

export async function listMyAssets({ limit = 100 } = {}) {
  const sb = getSupabase();
  const uid = await currentUserId();
  if (!sb || !uid) return NOT_ONLINE;
  return call(() => sb.from('media_assets').select(COLUMNS).eq('owner_id', uid).neq('status', 'deleted').order('created_at', { ascending: false }).limit(limit), { retryReads: true });
}

// A short-lived link to a PRIVATE file. Storage only creates it when the select policy allows.
export async function signedUrlFor(bucket, path, { width } = {}) {
  const sb = getSupabase();
  if (!sb) return NOT_ONLINE;
  const options = mediaConfig.imageTransforms && width ? { transform: { width: Math.round(width), quality: 80, resize: 'contain' } } : undefined;
  const res = await call(() => sb.storage.from(bucket).createSignedUrl(path, mediaConfig.signedUrlSeconds, options), { retryReads: true });
  if (res.ok && !(res.data && res.data.signedUrl)) return { ok: false, error: 'You don’t have access to this file.', kind: 'permission', retryable: false };
  return res;
}

// Checks (read-only) that the media migration is applied: the table must exist and be readable.
export async function probeMediaSetup() {
  const sb = getSupabase();
  if (!sb) return { ok: false, state: 'local' };
  try {
    const { error } = await sb.from('media_assets').select('id', { head: true, count: 'exact' }).limit(1);
    if (!error) return { ok: true, state: 'ready' };
    const mapped = mapError(error);
    const missing = ['PGRST205', '42P01'].includes(String(error.code)) || mapped.kind === 'not_found';
    return { ok: false, state: missing ? 'schema_missing' : mapped.kind === 'network' || mapped.kind === 'timeout' ? 'unreachable' : 'error', error: mapped.message };
  } catch (e) {
    const mapped = mapError(e);
    return { ok: false, state: mapped.kind === 'network' || mapped.kind === 'timeout' ? 'unreachable' : 'error', error: mapped.message };
  }
}
