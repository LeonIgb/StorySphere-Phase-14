// How stories point at cloud media. PURE functions (no I/O).
//
//   PUBLIC media   -> its normal public https URL (works anywhere, even without this code).
//   PREMIUM media  -> a reference  ssmedia://<assetId>  that is exchanged for a short-lived signed
//                     URL at display time, and only if the server says this person may see it.
//   Everything else (local files, pasted links, sample images) is left alone.

const REF = /^ssmedia:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const PUBLIC_URL = /\/storage\/v1\/object\/public\/(image|video|audio)-public\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.[a-z0-9]{2,4}(?:\?.*)?$/i;

export const makeMediaRef = (assetId) => `ssmedia://${assetId}`;
export const isMediaRef = (uri) => REF.test(String(uri || ''));
export const parseMediaRef = (uri) => {
  const m = REF.exec(String(uri || ''));
  return m ? { assetId: m[1].toLowerCase() } : null;
};

// { assetId, kind, ownerId } for a public cloud URL made by this app, else null.
export function parsePublicUrl(uri) {
  const m = PUBLIC_URL.exec(String(uri || ''));
  return m ? { kind: m[1].toLowerCase(), ownerId: m[2].toLowerCase(), assetId: m[3].toLowerCase() } : null;
}

export const isCloudUri = (uri) => isMediaRef(uri) || parsePublicUrl(uri) !== null;
// The asset id behind any cloud uri (premium ref or public URL), or null.
export function mediaIdOf(uri) {
  const ref = parseMediaRef(uri);
  if (ref) return ref.assetId;
  const pub = parsePublicUrl(uri);
  return pub ? pub.assetId : null;
}
export const visibilityOfUri = (uri) => (isMediaRef(uri) ? 'premium' : parsePublicUrl(uri) ? 'public' : null);

// Public URL with an optional image-resize ask. Resizing only works when Supabase Image
// Transformations are enabled (Pro plan); otherwise the original URL is returned unchanged.
export function withTransform(url, { width, quality = 80 } = {}, enabled = false) {
  const parsed = parsePublicUrl(url);
  if (!enabled || !width || !parsed || parsed.kind !== 'image') return url;
  const base = String(url).split('?')[0].replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return `${base}?width=${Math.round(width)}&quality=${Math.round(quality)}&resize=contain`;
}

// Where is `assetId` used? works: the creator's works. Returns [{ workId, title, status, where }].
export function usageOf(works, assetId) {
  const out = [];
  const hit = (uri) => mediaIdOf(uri) === assetId;
  (works || []).forEach((w) => {
    const title = (w.title && w.title.trim()) || 'Untitled story';
    const add = (where) => out.push({ workId: w.id, title, status: w.status, where });
    if (hit(w.coverUri)) add('cover');
    (w.images || []).forEach((i, n) => hit(i.uri) && add(`image ${n + 1}`));
    if (w.video && hit(w.video.uri)) add('video');
    (w.chapters || []).forEach((c, ci) => (c.blocks || []).forEach((b) => hit(b.uri) && add(`chapter ${ci + 1} ${b.type}`)));
  });
  return out;
}
