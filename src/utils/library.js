// Pure library logic (Phase 6): the lists behind each Library tab, filtering, "continue
// reading", the followed-creators feed, and "Picked for you". No React and no I/O.

import { filterStories, sortStories } from './discovery';
import { timeAgo } from './format';

export const LIBRARY_TABS = [
  { key: 'saved', label: 'Saved' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'reading', label: 'Reading' },
  { key: 'finished', label: 'Finished' },
  { key: 'recent', label: 'Recent' },
  { key: 'purchased', label: 'Purchased' },
  { key: 'following', label: 'Following' },
];

export const RECENT_MAX = 30;
export const FOLLOWING_FEED_MAX = 20;

// What the demo account starts with (only when it has no saved library yet).
export const DEMO_LIBRARY = {
  savedIds: ['s3', 's8'],
  favoriteIds: ['s1'],
  recent: [
    { id: 's3', at: 0 },
    { id: 's7', at: 0 },
    { id: 's1', at: 0 },
  ],
};

const idList = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && x))] : []);

export function sanitizeRecent(v) {
  const seen = new Set();
  return (Array.isArray(v) ? v : [])
    .filter((r) => r && typeof r.id === 'string' && r.id && !seen.has(r.id) && seen.add(r.id))
    .map((r) => ({ id: r.id, at: Number.isFinite(r.at) ? r.at : 0 }))
    .slice(0, RECENT_MAX);
}

// raw: whatever was saved (or null). `seed`: used when nothing was saved. Purchases are not part
// of this document any more (Phase 7): they come from the access service.
export function sanitizeLibraryDoc(raw, seed = null) {
  if (!raw || typeof raw !== 'object') {
    const s = seed || {};
    return {
      savedIds: idList(s.savedIds),
      favoriteIds: idList(s.favoriteIds),
      recent: sanitizeRecent(s.recent),
    };
  }
  return {
    savedIds: idList(raw.savedIds),
    favoriteIds: idList(raw.favoriteIds),
    recent: sanitizeRecent(raw.recent),
  };
}

export function pushRecent(list, id, at = Date.now()) {
  return [{ id, at }, ...list.filter((r) => r.id !== id)].slice(0, RECENT_MAX);
}

export const removeRecent = (list, id) => list.filter((r) => r.id !== id);

// "just now", "5 min ago", "3 h ago", "2 d ago", "3 wk ago".
export function agoFrom(ms, now = Date.now()) {
  if (!ms) return 'earlier';
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} d ago`;
  return `${Math.floor(d / 7)} wk ago`;
}

export const percentText = (p) => `${Math.round((p || 0) * 100)}%`;

// "Chapter 3 of 8 · 42%", "Panel 2 of 6 · 33%", "42% watched".
export function describeProgress(p) {
  if (!p) return '';
  if (p.finished) return 'Finished';
  if (p.kind === 'chapters') return `Chapter ${(p.position || 0) + 1} of ${p.total || 1} · ${percentText(p.percent)}`;
  if (p.kind === 'gallery') return `Panel ${(p.position || 0) + 1} of ${p.total || 1} · ${percentText(p.percent)}`;
  return `${percentText(p.percent)} watched`;
}

// `doc.purchasedIds` is supplied by the caller from the access service's verified entitlements.
// Builds every tab's items: [{ story, progress, status, at }]. Stories that no longer exist
// (unpublished or deleted) are skipped. `following`: ids of people you follow.
export function buildLibrary({ doc, progress, stories, following = [], now = Date.now() }) {
  const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
  const prog = progress || {};
  const pick = (ids, status) =>
    ids
      .map((id) => byId[id] && { story: byId[id], progress: prog[id] || null, status: status(byId[id], prog[id]), at: 0 })
      .filter(Boolean);

  const byRecency = (finished) =>
    Object.entries(prog)
      .filter(([id, p]) => byId[id] && Boolean(p.finished) === finished && (finished || p.percent > 0 || p.position > 0 || p.kind))
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
      .map(([id, p]) => ({
        story: byId[id],
        progress: p,
        status: finished ? `Finished · ${agoFrom(p.updatedAt, now)}` : describeProgress(p),
        at: p.updatedAt || 0,
      }));

  const opened = new Set([...Object.keys(prog), ...doc.recent.map((r) => r.id)]);
  const feed = sortStories(
    stories.filter((s) => following.includes(s.creatorId)),
    'Newest'
  )
    .slice(0, FOLLOWING_FEED_MAX)
    .map((s) => ({
      story: s,
      progress: prog[s.id] || null,
      status: `${opened.has(s.id) ? '' : 'New · '}${timeAgo(s.daysAgo)}`,
      at: 0,
    }));

  return {
    saved: pick(doc.savedIds, () => 'Saved'),
    favorites: pick(doc.favoriteIds, () => 'Favorite'),
    reading: byRecency(false),
    finished: byRecency(true),
    recent: doc.recent
      .map((r) => byId[r.id] && { story: byId[r.id], progress: prog[r.id] || null, status: `Viewed ${agoFrom(r.at, now)}`, at: r.at })
      .filter(Boolean),
    purchased: pick(doc.purchasedIds, (s, p) => (p && !p.finished && p.percent > 0 ? `Purchased · ${describeProgress(p)}` : 'Purchased')),
    following: feed,
  };
}

// Search + format + access filters over a tab's items, then an optional sort.
// sort: 'Recent' keeps the tab's own order, 'Title' sorts A to Z.
export function filterLibraryItems(items, { query = '', mediaType = 'All', access = 'All', sort = 'Recent' } = {}) {
  const keep = new Set(filterStories(items.map((i) => i.story), { query, mediaType, access }).map((s) => s.id));
  const out = items.filter((i) => keep.has(i.story.id));
  return sort === 'Title' ? [...out].sort((a, b) => a.story.title.localeCompare(b.story.title)) : out;
}

export const isFiltering = (f) => Boolean(String(f.query || '').trim()) || f.mediaType !== 'All' || f.access !== 'All';

// The story to offer as "Continue reading": the most recently touched unfinished one.
export const continueItem = (library) => (library.reading.length ? library.reading[0] : null);

// "Picked for you": stories matching the reader's preferred genres and formats, that they have
// not started. Returns [] when no preference is set (so Home shows nothing rather than guessing).
export function personalPicks(stories, prefs, { progress = {}, purchasedIds = [], limit = 5 } = {}) {
  const genres = prefs.genres || [];
  const formats = prefs.preferredFormats || [];
  if (genres.length === 0 && formats.length === 0 && !prefs.freeOnly) return [];
  return stories
    .filter((s) => {
      const p = progress[s.id];
      if (p && (!p.finished || prefs.hideFinished)) return false;
      if (prefs.freeOnly && s.access === 'Premium' && !purchasedIds.includes(s.id)) return false;
      if (genres.length && !genres.includes(s.genre) && !(formats.length && formats.includes(s.mediaType))) return false;
      if (!genres.length && formats.length && !formats.includes(s.mediaType)) return false;
      return true;
    })
    .map((s) => ({ s, score: (genres.includes(s.genre) ? 2 : 0) + (formats.includes(s.mediaType) ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || b.s.likes - a.s.likes || String(a.s.id).localeCompare(String(b.s.id), undefined, { numeric: true }))
    .slice(0, limit)
    .map((x) => x.s);
}
