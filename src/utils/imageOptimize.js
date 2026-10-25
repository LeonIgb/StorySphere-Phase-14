// Image optimization before upload: shrink big photos, convert HEIC to JPEG, keep GIFs as they are.
//
// planImageOptimization() is PURE (testable). optimizeImage() applies the plan with
// expo-image-manipulator, loaded lazily so the app still works if the package is missing (the
// original file is then uploaded when it already fits the limits).

import { IMAGE_PRESETS } from '../config/mediaConfig';
import { MEDIA_LIMITS } from './mediaFiles';

// info: { width, height, size, mimeType }. Returns { action: 'keep'|'process', resize, format, quality, reason }.
export function planImageOptimization(info, presetName = 'page') {
  const preset = IMAGE_PRESETS[presetName] || IMAGE_PRESETS.page;
  const mime = String(info.mimeType || '').toLowerCase();
  if (mime === 'image/gif') {
    // Animated GIFs would lose their animation if re-encoded.
    return { action: 'keep', reason: 'gif' };
  }
  const w = Number(info.width) || 0;
  const h = Number(info.height) || 0;
  const longest = Math.max(w, h);
  const needsConvert = mime === 'image/heic' || mime === 'image/heif';
  const needsResize = longest > preset.maxEdge;
  const tooBig = Number.isFinite(info.size) && info.size > MEDIA_LIMITS.imageMaxBytes;
  // Small photos that are already in a storable format are uploaded exactly as they are.
  const smallEnough = Number.isFinite(info.size) && info.size <= 400 * 1024;
  if (!needsConvert && !needsResize && !tooBig && (smallEnough || longest === 0)) return { action: 'keep', reason: 'already-small' };
  const keepPng = mime === 'image/png' && !tooBig; // PNG may have transparency: resize, don't flatten
  let resize = null;
  if (needsResize && w && h) resize = w >= h ? { width: preset.maxEdge } : { height: preset.maxEdge };
  return {
    action: 'process',
    resize,
    format: keepPng ? 'png' : 'jpeg',
    quality: preset.quality,
    reason: needsConvert ? 'convert' : needsResize ? 'resize' : 'recompress',
  };
}

let Manipulator = null;
try {
  // eslint-disable-next-line global-require
  Manipulator = require('expo-image-manipulator');
} catch (e) {
  Manipulator = null;
}
export const CAN_OPTIMIZE = Boolean(Manipulator && typeof Manipulator.manipulateAsync === 'function');

let FS = null;
try {
  // eslint-disable-next-line global-require
  FS = require('expo-file-system/legacy');
} catch (e) {
  try {
    // eslint-disable-next-line global-require
    FS = require('expo-file-system');
  } catch (e2) {
    FS = null;
  }
}

async function sizeOf(uri) {
  try {
    if (FS && typeof FS.getInfoAsync === 'function') {
      const info = await FS.getInfoAsync(uri, { size: true });
      if (info && Number.isFinite(info.size)) return info.size;
    }
  } catch (e) {
    // fall through
  }
  return null;
}

function imageSize(uri) {
  // react-native's Image.getSize, loaded lazily so this file stays importable in tests.
  return new Promise((resolve) => {
    try {
      // eslint-disable-next-line global-require
      const { Image } = require('react-native');
      if (!Image || typeof Image.getSize !== 'function') return resolve(null);
      Image.getSize(uri, (width, height) => resolve({ width, height }), () => resolve(null));
    } catch (e) {
      resolve(null);
    }
  });
}

// asset: { uri, name, size, mimeType, width?, height? }. Returns
// { ok: true, asset: { uri, name, size, mimeType, width, height }, optimized, savedBytes } or { ok: false, error }.
export async function optimizeImage(asset, presetName = 'page') {
  const mime = String(asset.mimeType || '').toLowerCase();
  let width = asset.width;
  let height = asset.height;
  if (!(width && height) && CAN_OPTIMIZE) {
    const dim = await imageSize(asset.uri);
    if (dim) ({ width, height } = dim);
  }
  const plan = planImageOptimization({ width, height, size: asset.size, mimeType: mime }, presetName);
  const keep = { ok: true, asset: { ...asset, width: width || null, height: height || null }, optimized: false, savedBytes: 0 };
  if (plan.action === 'keep') return keep;
  if (!CAN_OPTIMIZE) {
    if (mime === 'image/heic' || mime === 'image/heif') {
      return { ok: false, error: 'This photo is in HEIC format and can’t be converted here. Choose a JPEG or PNG instead.' };
    }
    if (Number.isFinite(asset.size) && asset.size > MEDIA_LIMITS.imageMaxBytes) {
      return { ok: false, error: 'This image is too large and can’t be shrunk here. Choose a smaller one.' };
    }
    return keep;
  }
  try {
    const actions = plan.resize ? [{ resize: plan.resize }] : [];
    const format = plan.format === 'png' ? Manipulator.SaveFormat.PNG : Manipulator.SaveFormat.JPEG;
    const out = await Manipulator.manipulateAsync(asset.uri, actions, { compress: plan.quality, format });
    const size = (await sizeOf(out.uri)) ?? null;
    const base = String(asset.name || 'image').replace(/\.[a-z0-9]{2,5}$/i, '');
    const next = {
      ...asset,
      uri: out.uri,
      name: `${base}.${plan.format === 'png' ? 'png' : 'jpg'}`,
      size,
      mimeType: plan.format === 'png' ? 'image/png' : 'image/jpeg',
      width: out.width,
      height: out.height,
    };
    // Never make a file bigger: if the re-encoded copy isn't smaller (and the original is storable), keep the original.
    const storable = mime !== 'image/heic' && mime !== 'image/heif';
    if (storable && Number.isFinite(size) && Number.isFinite(asset.size) && size >= asset.size && asset.size <= MEDIA_LIMITS.imageMaxBytes) {
      return keep;
    }
    return { ok: true, asset: next, optimized: true, savedBytes: Number.isFinite(size) && Number.isFinite(asset.size) ? Math.max(0, asset.size - size) : 0 };
  } catch (e) {
    if (mime === 'image/heic' || mime === 'image/heif' || (Number.isFinite(asset.size) && asset.size > MEDIA_LIMITS.imageMaxBytes)) {
      return { ok: false, error: 'Couldn’t prepare this image for upload. Try a different one.' };
    }
    return keep; // optimization is a nicety; the original still fits the limits
  }
}
