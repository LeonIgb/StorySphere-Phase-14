// Rules for uploaded audio and video files, as PURE functions (no React, no I/O), so they can be
// tested and later moved to a backend that repeats them (never trust the client alone).

export const MEDIA_LIMITS = {
  videoMaxBytes: 200 * 1024 * 1024, // 200 MB
  audioMaxBytes: 25 * 1024 * 1024, // 25 MB
  videoMaxMinutes: 30,
  audioMaxMinutes: 60,
  imageMaxBytes: 10 * 1024 * 1024, // 10 MB (after optimization; cloud storage enforces the same limit)
  imagePickMaxBytes: 40 * 1024 * 1024, // largest original we will try to shrink on the device
};

// Formats that play on both iOS and Android with the system players. Files are stored as picked:
// nothing is re-encoded here, so quality is exactly what the creator uploaded.
export const VIDEO_FORMATS = [
  { ext: 'mp4', mime: 'video/mp4' },
  { ext: 'mov', mime: 'video/quicktime' },
  { ext: 'm4v', mime: 'video/x-m4v' },
  { ext: 'webm', mime: 'video/webm' },
  { ext: '3gp', mime: 'video/3gpp' },
];
export const AUDIO_FORMATS = [
  { ext: 'mp3', mime: 'audio/mpeg' },
  { ext: 'm4a', mime: 'audio/mp4' },
  { ext: 'aac', mime: 'audio/aac' },
  { ext: 'wav', mime: 'audio/wav' },
  { ext: 'ogg', mime: 'audio/ogg' },
];

// Images: what can be STORED in the cloud. HEIC/HEIF photos (iPhone) are accepted from the picker and
// converted to JPEG on the device first (see utils/imageOptimize.js); they are never uploaded as is.
export const IMAGE_FORMATS = [
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'png', mime: 'image/png' },
  { ext: 'webp', mime: 'image/webp' },
  { ext: 'gif', mime: 'image/gif' },
];
export const IMAGE_INPUT_ONLY = [
  { ext: 'heic', mime: 'image/heic' },
  { ext: 'heif', mime: 'image/heif' },
];

const FORMATS = { video: VIDEO_FORMATS, audio: AUDIO_FORMATS, image: IMAGE_FORMATS };
const MAX = { video: () => MEDIA_LIMITS.videoMaxBytes, audio: () => MEDIA_LIMITS.audioMaxBytes, image: () => MEDIA_LIMITS.imageMaxBytes };
const MAX_MIN = { video: MEDIA_LIMITS.videoMaxMinutes, audio: MEDIA_LIMITS.audioMaxMinutes, image: 0 };

export const formatList = (kind) => FORMATS[kind].map((f) => f.ext.toUpperCase()).join(', ');
export const KINDS = ['image', 'video', 'audio'];

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// 83000 -> "1:23", 3725000 -> "1:02:05"
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function extensionOf(name) {
  const clean = String(name || '').split('?')[0].split('#')[0];
  const m = /\.([a-z0-9]{2,5})$/i.exec(clean);
  return m ? m[1].toLowerCase() : '';
}

// Which supported format is this file? Looks at the mime type first, then the file extension.
export function detectFormat(kind, { name, uri, mimeType } = {}, { allowConvertible = false } = {}) {
  const list = kind === 'image' && allowConvertible ? [...FORMATS.image, ...IMAGE_INPUT_ONLY] : FORMATS[kind];
  const mime = String(mimeType || '').toLowerCase().replace('image/jpg', 'image/jpeg').replace('image/pjpeg', 'image/jpeg');
  if (mime) {
    const byMime = list.find((f) => f.mime === mime || (kind === 'audio' && f.ext === 'mp3' && mime === 'audio/mp3') || (kind === 'audio' && f.ext === 'm4a' && (mime === 'audio/x-m4a' || mime === 'audio/m4a')) || (kind === 'audio' && f.ext === 'wav' && (mime === 'audio/x-wav' || mime === 'audio/wave')));
    if (byMime) return byMime;
  }
  const ext = extensionOf(name) || extensionOf(uri);
  if (kind === 'image' && ext === 'jpeg') return list.find((f) => f.ext === 'jpg') || null;
  return list.find((f) => f.ext === ext) || null;
}

// asset: { uri, name?, size?, mimeType?, duration? (ms) } straight from a picker.
// Returns { ok: true, file } or { ok: false, error }. `file` is what gets stored on the story.
// opts.beforeOptimize (images): the file is about to be shrunk/converted on the device, so HEIC is
// accepted and the larger "picked original" limit applies. After optimization it is validated again
// WITHOUT this option against the real storage limits.
export function validateMediaFile(kind, asset, opts = {}) {
  if (!FORMATS[kind]) return { ok: false, error: 'Unsupported media kind.' };
  const noun = kind === 'video' ? 'video' : kind === 'image' ? 'image' : 'audio file';
  if (!asset || typeof asset.uri !== 'string' || !asset.uri) return { ok: false, error: `No ${noun} was selected.` };
  const convertible = kind === 'image' && opts.beforeOptimize;
  const format = detectFormat(kind, asset, { allowConvertible: Boolean(convertible) });
  if (!format) return { ok: false, error: `That file type isn’t supported. Use ${formatList(kind)}.` };
  const size = Number.isFinite(asset.size) ? asset.size : null;
  if (size === 0) return { ok: false, error: 'That file is empty.' };
  const maxBytes = convertible ? MEDIA_LIMITS.imagePickMaxBytes : MAX[kind]();
  if (size !== null && size > maxBytes) {
    return { ok: false, error: `That ${noun} is ${formatBytes(size)}. The limit is ${formatBytes(maxBytes)}.` };
  }
  const durationMs = Number.isFinite(asset.duration) && asset.duration > 0 ? Math.round(asset.duration) : null;
  if (durationMs !== null && MAX_MIN[kind] > 0 && durationMs > MAX_MIN[kind] * 60000) {
    return { ok: false, error: `That ${noun} is longer than ${MAX_MIN[kind]} minutes.` };
  }
  return {
    ok: true,
    file: {
      uri: asset.uri,
      name: String(asset.name || `${kind}.${format.ext}`).slice(0, 120),
      size,
      mimeType: format.mime,
      format: format.ext,
      durationMs,
    },
  };
}

// The metadata kept with a media block or video story. Everything is validated again when a saved
// story is loaded, so a corrupted save can never crash a screen.
export function sanitizeMediaMeta(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    name: typeof r.name === 'string' ? r.name.slice(0, 120) : '',
    size: Number.isFinite(r.size) && r.size >= 0 ? r.size : null,
    mimeType: typeof r.mimeType === 'string' ? r.mimeType.slice(0, 60) : '',
    format: typeof r.format === 'string' ? r.format.slice(0, 8) : '',
    durationMs: Number.isFinite(r.durationMs) && r.durationMs > 0 ? Math.round(r.durationMs) : null,
  };
}

// How long the simulated upload takes: longer for bigger files, between 0.8 s and 4 s.
export function simulatedUploadMs(size) {
  const mb = Number.isFinite(size) ? size / (1024 * 1024) : 5;
  return Math.max(800, Math.min(4000, Math.round(600 + mb * 25)));
}

// A description for lists and the editor: "MP4 · 12.4 MB · 1:23".
export function fileSummary(file) {
  if (!file) return '';
  const parts = [];
  if (file.format) parts.push(String(file.format).toUpperCase());
  if (Number.isFinite(file.size)) parts.push(formatBytes(file.size));
  if (file.durationMs) parts.push(formatDuration(file.durationMs));
  return parts.join(' · ');
}
