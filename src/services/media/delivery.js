// Turns what a story stores into something a player can open.
//
//   http(s) / file / blob uris  -> returned as they are (public media, pasted links, local files)
//   ssmedia://<id>              -> a signed URL, requested from Storage as the signed-in person.
//                                  Storage only issues it if they are the owner, the story's author
//                                  or hold an access grant. Links are cached until shortly before
//                                  they expire, and simultaneous requests share one call.
//
// resolveMediaUri() never throws: { ok: true, uri } or { ok: false, kind, error, retryable }.
// kind 'permission' means "locked for this person" (show a lock, not an error).

import { mediaConfig } from '../../config/mediaConfig';
import { isMediaRef, parseMediaRef, withTransform } from '../../utils/mediaRefs';
import * as api from './mediaApi';

const cache = new Map(); // key -> { uri, expires }
const inflight = new Map();
const EARLY_MS = 60 * 1000;

export function clearMediaCache() {
  cache.clear();
  inflight.clear();
}

export async function resolveMediaUri(uri, { width, deps, now } = {}) {
  const A = (deps && deps.api) || api;
  const clock = now || Date.now;
  if (!uri) return { ok: false, kind: 'not_found', error: 'No file.', retryable: false };
  if (!isMediaRef(uri)) return { ok: true, uri: withTransform(uri, { width }, mediaConfig.imageTransforms) };
  const { assetId } = parseMediaRef(uri);
  const key = `${assetId}:${width || 0}`;
  const hit = cache.get(key);
  if (hit && hit.expires > clock()) return { ok: true, uri: hit.uri };
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const row = await A.getAsset(assetId);
    if (!row.ok) {
      // A premium file we may not read looks like "not found" (row-level security hides it).
      const locked = row.kind === 'not_found' || row.kind === 'permission';
      return locked
        ? { ok: false, kind: 'permission', error: 'This is locked. Unlock the story to see it.', retryable: false }
        : { ok: false, kind: row.kind, error: row.error, retryable: row.retryable };
    }
    const a = row.data;
    if (a.visibility === 'public') {
      const url = A.publicUrlFor(a.bucket, a.path);
      return url ? { ok: true, uri: withTransform(url, { width }, mediaConfig.imageTransforms) } : { ok: false, kind: 'not_found', error: 'We couldn’t find that file.', retryable: false };
    }
    const signed = await A.signedUrlFor(a.bucket, a.path, { width });
    if (!signed.ok) {
      return signed.kind === 'permission' || signed.kind === 'not_found'
        ? { ok: false, kind: 'permission', error: 'This is locked. Unlock the story to see it.', retryable: false }
        : { ok: false, kind: signed.kind, error: signed.error, retryable: signed.retryable };
    }
    const url = signed.data.signedUrl;
    cache.set(key, { uri: url, expires: clock() + mediaConfig.signedUrlSeconds * 1000 - EARLY_MS });
    return { ok: true, uri: url };
  })().finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}
