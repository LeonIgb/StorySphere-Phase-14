// Uploads one file to cloud storage, start to finish:
//
//   1. check the file on the device (type, size, length)         utils/mediaFiles.js
//   2. images: shrink / convert to JPEG                          utils/imageOptimize.js
//   3. ask the SERVER for permission and a path                  request_upload()
//   4. send the bytes, with progress, retries and a stall timer  uploadTransport.js
//   5. ask the server to verify the stored file and publish it   complete_upload()
//
// If anything fails or is cancelled, the reservation and any partly-uploaded file are removed so
// no quota is wasted and no half-finished file can be opened.
//
// uploadToCloud() returns { promise, cancel } like mediaProvider.upload(). The promise resolves to
//   { ok: true, file, persisted: true }  or  { ok: false, error, kind, retryable }  or  { ok: false, cancelled: true }
// `file.uri` is what a story stores: the public URL, or ssmedia://<id> for premium files.

import { mediaConfig } from '../../config/mediaConfig';
import { MEDIA_LIMITS, validateMediaFile } from '../../utils/mediaFiles';
import { optimizeImage } from '../../utils/imageOptimize';
import { makeMediaRef } from '../../utils/mediaRefs';
import { mapError } from '../backend/errors';
import * as api from './mediaApi';
import { putFile } from './uploadTransport';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sizeFromUri(uri) {
  try {
    // eslint-disable-next-line global-require
    let FS = null;
    try {
      FS = require('expo-file-system/legacy');
    } catch (e) {
      FS = require('expo-file-system');
    }
    const info = await FS.getInfoAsync(uri, { size: true });
    if (info && Number.isFinite(info.size) && info.size > 0) return info.size;
  } catch (e) {
    // try the next way
  }
  try {
    if (typeof fetch === 'function' && /^(blob|data|https?):/i.test(uri)) {
      const blob = await (await fetch(uri)).blob();
      if (blob && blob.size > 0) return blob.size;
    }
  } catch (e) {
    // unknown
  }
  return null;
}

// Friendly text for a failed HTTP upload (Storage's own wording is not shown to people).
function describeHttp(status, message) {
  const m = String(message || '').toLowerCase();
  if (status === 413 || m.includes('too large') || m.includes('maximum allowed size')) return { kind: 'invalid', error: 'That file is larger than the limit.', retryable: false };
  if (m.includes('mime') || m.includes('not supported') || status === 415) return { kind: 'invalid', error: 'That file type isn’t supported.', retryable: false };
  if (status === 401) return { kind: 'session', error: 'Your session has ended. Please sign in again.', retryable: false };
  if (status === 403 || m.includes('row-level security') || m.includes('unauthorized')) return { kind: 'permission', error: 'You don’t have permission to upload this file.', retryable: false };
  if (status === 429) return { kind: 'rate_limit', error: 'Too many uploads at once. Wait a minute and try again.', retryable: true };
  if (status >= 500 || status === 408) return { kind: 'server', error: 'The storage service had a problem. Please try again.', retryable: true };
  return { kind: 'unknown', error: 'The upload failed. Please try again.', retryable: true };
}

export function uploadToCloud(kind, asset, opts = {}, deps = {}) {
  const A = deps.api || api;
  const send = deps.putFile || putFile;
  const optimize = deps.optimizeImage || optimizeImage;
  const wait = deps.sleep || sleep;
  const sizeOf = deps.sizeFromUri || sizeFromUri;
  const { visibility = 'public', storyId = null, preset = 'page', onProgress, onStage } = opts;
  const attemptsMax = (opts.maxAttempts || mediaConfig.upload.maxAttempts);
  const delays = opts.retryDelaysMs || mediaConfig.upload.retryDelaysMs;

  let cancelled = false;
  let current = null; // the in-flight transport handle
  const stage = (s) => onStage && onStage(s);
  const progress = (f) => onProgress && onProgress(Math.max(0, Math.min(1, f)));

  let reservation = null;
  const abandon = async () => {
    if (!reservation) return;
    const r = reservation;
    reservation = null;
    try {
      await A.deleteMediaRow(r.asset_id); // frees the quota and makes the object removable
      await A.removeObject(r.bucket, r.path);
    } catch (e) {
      // best effort: the server's clean-up job also collects these
    }
  };
  const fail = async (error, extra = {}) => {
    await abandon();
    return { ok: false, error, kind: 'unknown', retryable: true, ...extra };
  };

  const run = async () => {
    stage('uploading');
    progress(0);
    // 1-2. check and prepare on the device
    const first = validateMediaFile(kind, asset, { beforeOptimize: kind === 'image' });
    if (!first.ok) return { ok: false, error: first.error, kind: 'invalid', retryable: false };
    let prepared = { ...asset, mimeType: first.file.mimeType, name: first.file.name };
    if (kind === 'image') {
      const opt = await optimize(prepared, preset);
      if (!opt.ok) return { ok: false, error: opt.error, kind: 'invalid', retryable: false };
      prepared = opt.asset;
    }
    if (cancelled) return { ok: false, cancelled: true };
    if (!Number.isFinite(prepared.size) || prepared.size <= 0) prepared = { ...prepared, size: await sizeOf(prepared.uri) };
    if (!Number.isFinite(prepared.size) || prepared.size <= 0) {
      return { ok: false, error: 'Couldn’t read this file’s size. It may have been moved or deleted.', kind: 'invalid', retryable: false };
    }
    const checked = validateMediaFile(kind, prepared); // real storage limits, no conversions left
    if (!checked.ok) return { ok: false, error: checked.error, kind: 'invalid', retryable: false };
    const file = { ...checked.file, width: prepared.width || null, height: prepared.height || null };

    // 3. permission and path from the server
    const ticket = await A.requestUpload({ kind, visibility, mimeType: file.mimeType, size: file.size, name: file.name, storyId });
    if (!ticket.ok) return { ok: false, error: ticket.error, kind: ticket.kind, retryable: ticket.retryable };
    reservation = ticket.data;
    if (cancelled) { await abandon(); return { ok: false, cancelled: true }; }

    // 4. send the bytes
    const endpoint = A.storageEndpoint();
    if (!endpoint) return fail('Cloud storage isn’t set up.', { kind: 'config', retryable: false });
    const objectUrl = `${endpoint.url}/object/${reservation.bucket}/${reservation.path.split('/').map(encodeURIComponent).join('/')}`;
    let sent = false;
    let lastFailure = null;
    for (let attempt = 1; attempt <= attemptsMax && !sent; attempt += 1) {
      if (cancelled) { await abandon(); return { ok: false, cancelled: true }; }
      const token = await A.getAccessToken();
      if (!token) return fail('Please sign in again to upload.', { kind: 'session', retryable: false });
      current = send({
        url: objectUrl,
        headers: { Authorization: `Bearer ${token}`, apikey: endpoint.anonKey, 'x-upsert': 'false', 'cache-control': 'max-age=3600' },
        file: { uri: file.uri, mimeType: file.mimeType, name: file.name },
        onProgress: (f) => progress(f * 0.95),
        stallTimeoutMs: mediaConfig.upload.stallTimeoutMs,
        ...(deps.transportExtras || {}),
      });
      // eslint-disable-next-line no-await-in-loop
      const res = await current.promise;
      current = null;
      if (cancelled || res.kind === 'cancelled') { await abandon(); return { ok: false, cancelled: true }; }
      if (res.ok) { sent = true; break; }
      // The path is reserved for this one file, so "already exists" on a retry means an earlier attempt got through.
      if (res.kind === 'http' && res.status === 409 && attempt > 1) { sent = true; break; }
      lastFailure = res.kind === 'http'
        ? describeHttp(res.status, res.message)
        : res.kind === 'timeout'
          ? { kind: 'timeout', error: 'The upload stalled. Check your connection and try again.', retryable: true }
          : res.kind === 'config'
            ? { kind: 'invalid', error: res.message, retryable: false }
            : { kind: 'network', error: 'Can’t reach the server. Check your connection and try again.', retryable: true };
      if (!res.retryable || attempt === attemptsMax) break;
      progress(0);
      stage('retrying');
      // eslint-disable-next-line no-await-in-loop
      await wait(delays[Math.min(attempt - 1, delays.length - 1)] || 1000);
      stage('uploading');
    }
    if (!sent) return fail(lastFailure.error, { kind: lastFailure.kind, retryable: lastFailure.retryable });

    // 5. the server verifies the stored file and publishes it
    stage('saving');
    progress(0.97);
    const done = await A.completeUpload(reservation.asset_id, { width: file.width, height: file.height, durationMs: file.durationMs });
    if (!done.ok) {
      // Unsure whether it was recorded: keep the file for now so "Try again" doesn't lose it; the reservation expires in a day.
      const keep = reservation;
      reservation = null;
      if (done.retryable) return { ok: false, error: done.error, kind: done.kind, retryable: true, pendingAssetId: keep.asset_id };
      reservation = keep;
      return fail(done.error, { kind: done.kind, retryable: false });
    }
    if (!done.data || done.data.status !== 'ready') {
      const mapped = mapError({ message: (done.data && done.data.error) || 'unknown' });
      return fail(mapped.message, { kind: 'invalid', retryable: false });
    }
    const assetId = reservation.asset_id;
    const bucket = reservation.bucket;
    const path = reservation.path;
    reservation = null;
    progress(1);
    const uri = visibility === 'premium' ? makeMediaRef(assetId) : A.publicUrlFor(bucket, path);
    if (!uri) return { ok: false, error: 'The file was saved but its address couldn’t be built. Open the media library to find it.', kind: 'unknown', retryable: false };
    return {
      ok: true,
      persisted: true,
      file: {
        uri,
        name: file.name,
        size: Number(done.data.size_bytes) || file.size,
        mimeType: file.mimeType,
        format: file.format,
        durationMs: file.durationMs,
        width: file.width,
        height: file.height,
        mediaId: assetId,
        visibility,
      },
    };
  };

  const promise = run().catch(async (e) => {
    const mapped = mapError(e);
    return fail(mapped.message, { kind: mapped.kind, retryable: mapped.retryable });
  });

  return {
    promise,
    cancel() {
      cancelled = true;
      if (current) current.cancel();
    },
  };
}

export { MEDIA_LIMITS };
