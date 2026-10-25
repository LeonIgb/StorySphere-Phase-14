// Media upload service: the one place the app sends files anywhere.
//
// TWO MODES, chosen automatically per upload:
//   CLOUD : signed in with a real account AND the backend is configured AND the media migration is
//           applied (see getMediaMode). Files go to Supabase Storage (services/media/cloudMedia.js)
//           and a story stores a durable address that works on every device.
//   LOCAL : everything else, including the demo account. This is the original PROTOTYPE: the file
//           is validated, copied into this app's storage, and the progress bar is a timed
//           simulation. NOTHING IS SENT TO A SERVER and the file only plays on this device.
//
// The interface is unchanged: upload() returns { promise, cancel() } and the promise resolves to
// { ok, file, persisted, error, kind, retryable, cancelled }.
import { persistFile } from '../utils/mediaStore';
import { simulatedUploadMs, validateMediaFile } from '../utils/mediaFiles';
import { isOnlineMode } from './backend/backendStatus';
import { currentUserId, deleteMediaRow, probeMediaSetup, removeObject, getAsset, replaceMediaRow } from './media/mediaApi';
import { uploadToCloud } from './media/cloudMedia';
import { mediaIdOf } from '../utils/mediaRefs';

let failNext = false;

// The original prototype: validate, copy into app storage, simulated progress. Nothing leaves the device.
function uploadLocal(kind, asset, { onProgress, onStage } = {}) {
  let cancelled = false;
  let timer = null;
  let finish = null;
  const promise = new Promise((resolve) => {
    finish = resolve;
    const checked = validateMediaFile(kind, asset);
    if (!checked.ok) {
      resolve({ ok: false, error: checked.error });
      return;
    }
    if (onStage) onStage('uploading');
    const total = simulatedUploadMs(checked.file.size);
    const started = Date.now();
    const failAt = failNext ? 0.6 : null;
    failNext = false;
    const tick = async () => {
      if (cancelled) return;
      const fraction = Math.min(1, (Date.now() - started) / total);
      if (failAt !== null && fraction >= failAt) {
        resolve({ ok: false, error: 'The upload failed (simulated). Check your connection and try again.' });
        return;
      }
      if (onProgress) onProgress(fraction);
      if (fraction < 1) {
        timer = setTimeout(tick, 80);
        return;
      }
      if (onStage) onStage('saving');
      const stored = await persistFile(checked.file.uri, checked.file.name);
      if (cancelled) return;
      resolve({ ok: true, file: { ...checked.file, uri: stored.uri }, persisted: stored.persisted });
    };
    timer = setTimeout(tick, 80);
  });
  return {
    promise,
    cancel() {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (finish) finish({ ok: false, cancelled: true, error: 'Upload cancelled.' });
    },
  };
}

// ---------------------------------------------------------------- mode
let setupCache = null; // { at, state }
const SETUP_TTL = 60 * 1000;
export function __resetMediaModeForTests() {
  setupCache = null;
}

// { mode: 'local' | 'cloud', reason, state }  reason explains local mode in plain words.
export async function getMediaMode({ force = false } = {}) {
  if (!isOnlineMode()) return { mode: 'local', state: 'local', reason: 'No online service is configured. Files stay on this device.' };
  const uid = await currentUserId();
  if (!uid) return { mode: 'local', state: 'no_session', reason: 'You’re using the demo account, so files stay on this device.' };
  if (force || !setupCache || Date.now() - setupCache.at > SETUP_TTL) {
    const probe = await probeMediaSetup();
    setupCache = { at: Date.now(), state: probe.state, error: probe.error };
  }
  if (setupCache.state === 'ready') return { mode: 'cloud', state: 'ready', reason: '' };
  const reasons = {
    schema_missing: 'The media migration hasn’t been applied to the project yet, so files stay on this device.',
    unreachable: 'The online service can’t be reached right now, so files stay on this device.',
    error: 'Cloud storage isn’t available, so files stay on this device.',
  };
  return { mode: 'local', state: setupCache.state, reason: reasons[setupCache.state] || reasons.error };
}

export const mediaProvider = {
  // DEMO control (Profile > Developer tools): make the next upload fail so the error state can be seen.
  setFailNext(value) {
    failNext = Boolean(value);
  },
  getFailNext: () => failNext,
  getMediaMode,

  // Validates and "uploads" one picked file.
  //   kind: 'video' | 'audio'
  //   asset: { uri, name, size, mimeType, duration } from a picker
  //   onProgress(fraction 0..1), onStage('checking' | 'uploading' | 'saving')
  // Returns { cancel(), promise } where promise resolves to { ok, file, persisted, error }.
  //
  //   options: { visibility: 'public' | 'premium', storyId, preset ('cover'|'avatar'|'page'|'chat'), onProgress, onStage }
  //   kind may also be 'image' (cloud mode only; in local mode images are used by reference as before).
  upload(kind, asset, options = {}) {
    let inner = null;
    let cancelled = false;
    const promise = (async () => {
      const mode = await getMediaMode();
      if (cancelled) return { ok: false, cancelled: true, error: 'Upload cancelled.' };
      if (mode.mode === 'cloud') {
        if (failNext) {
          failNext = false;
          return { ok: false, error: 'The upload failed (simulated). Check your connection and try again.', kind: 'network', retryable: true };
        }
        inner = uploadToCloud(kind, asset, options, options.__deps); // __deps: test hook only
        const res = await inner.promise;
        return res.cancelled ? { ...res, error: 'Upload cancelled.' } : res;
      }
      if (kind === 'image') {
        return { ok: true, file: { uri: asset.uri, name: asset.name || '', size: asset.size ?? null, mimeType: asset.mimeType || '' }, persisted: false, local: true };
      }
      inner = uploadLocal(kind, asset, options);
      return inner.promise;
    })();
    return {
      promise,
      cancel() {
        cancelled = true;
        if (inner) inner.cancel();
      },
    };
  },

  // Uploads several images with at most two at a time. results[i] matches items[i].
  //   onProgress(overallFraction), onItem(index, result)
  uploadImages(items, { visibility, onProgress, onItem, ...rest } = {}) {
    const handles = new Set();
    let cancelled = false;
    const fractions = items.map(() => 0);
    const vis = (i) => (typeof visibility === 'function' ? visibility(i) : visibility || 'public');
    const report = () => onProgress && onProgress(fractions.reduce((a, b) => a + b, 0) / Math.max(1, items.length));
    const results = new Array(items.length);
    let next = 0;
    const worker = async () => {
      while (!cancelled && next < items.length) {
        const i = next;
        next += 1;
        const h = mediaProvider.upload('image', items[i], { ...rest, visibility: vis(i), onProgress: (f) => { fractions[i] = f; report(); } });
        handles.add(h);
        // eslint-disable-next-line no-await-in-loop
        const res = await h.promise;
        handles.delete(h);
        fractions[i] = 1;
        results[i] = res;
        if (onItem) onItem(i, res);
        report();
      }
    };
    const promise = Promise.all([worker(), worker()]).then(() => items.map((_, i) => results[i] || { ok: false, cancelled: true, error: 'Upload cancelled.' }));
    return {
      promise,
      cancel() {
        cancelled = true;
        handles.forEach((h) => h.cancel());
      },
    };
  },

  // Deletes a cloud file (row + stored object). Does nothing for local files and links.
  // The caller must make sure no story still uses it (see usageOf in utils/mediaRefs.js).
  async remove(uri) {
    const id = mediaIdOf(uri);
    if (!id) return { ok: true, skipped: true };
    const row = await deleteMediaRow(id);
    if (!row.ok) return row;
    const gone = await removeObject(row.data.bucket, row.data.path);
    // If the file couldn't be removed now, the server's clean-up job collects it later.
    return { ok: true, fileRemoved: gone.ok };
  },

  // Swaps old for new on the server (new must already be uploaded) and removes the old file.
  async replace(oldUri, newUri) {
    const oldId = mediaIdOf(oldUri);
    const newId = mediaIdOf(newUri);
    if (!oldId || !newId) return { ok: true, skipped: true };
    const row = await replaceMediaRow(oldId, newId);
    if (!row.ok) return row;
    const gone = await removeObject(row.data.bucket, row.data.path);
    return { ok: true, fileRemoved: gone.ok };
  },

  async details(uri) {
    const id = mediaIdOf(uri);
    return id ? getAsset(id) : { ok: false, error: 'Not a cloud file.', kind: 'not_found', retryable: false };
  },
};
