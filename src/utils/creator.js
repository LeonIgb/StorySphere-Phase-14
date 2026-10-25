// Pure creator-studio logic (Phase 4): the work (draft/published story) model, editing
// operations, validation, publishing transitions and the bridge to the story shape that
// discovery, the story page and the readers already understand.
// No React and no I/O, so all of it can be tested and later moved to a real backend.
//
// A "work" is one story the current user is creating:
//   {
//     id, mediaType: 'Written' | 'Image' | 'Mixed' | 'Video',
//     title, description, genre, tags: [], access: 'Free' | 'Premium',
//     coverUri: string | null, coverColor,
//     chapters: [{ id, title, text }]            // Written
//               [{ id, title, blocks: [...] }]   // Mixed; block = { id, type: 'text'|'image'|'video'|'audio', text | uri, caption, + name/size/mimeType/format/durationMs for audio and video }
//     images:   [{ id, uri, caption }]           // Image
//     video:    null | { uri, caption, name, size, mimeType, format, durationMs }   // Video
//     status: 'draft' | 'scheduled' | 'published',
//     scheduledFor: ISO | null, publishedAt: ISO | null, createdAt: ISO, updatedAt: ISO
//   }

import { genreIcons } from '../theme/theme';
import { COVER_COLORS, LIMITS } from '../data/creatorOptions';
import { DEFAULT_PRICE_CENTS, MAX_PRICE_CENTS, MIN_PRICE_CENTS } from '../data/pricing';
import { MAX_PREVIEW, previewOf } from './access';
import { auditMediaVisibility } from './mediaVisibility';
import { formatPrice } from './pricing';
import { wordCount } from './reading';
import { formatDateTime, isDue, toDate, validateSchedule } from './schedule';
import { sanitizeMediaMeta, fileSummary } from './mediaFiles';

export const MEDIA_TYPES = ['Written', 'Image', 'Mixed', 'Video'];
export const STATUSES = ['draft', 'scheduled', 'published'];
export const BLOCK_TYPES = ['text', 'image', 'video', 'audio'];
const MEDIA_BLOCKS = ['video', 'audio'];

const DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------------ ids and text

let counter = 0;
export function newId(prefix = 'x') {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Every line break starts a new paragraph (that is how people type on a phone).
export function toParagraphs(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function normalizeTag(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[#,;:!?"“”.()[\]{}<>\\/|@$%^&*+=~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITS.tag);
}

// Add the tags typed in `input` (separated by commas, semicolons or line breaks).
export function addTags(existing, input, max = LIMITS.tags) {
  const tags = [...(existing || [])];
  const rejected = [];
  String(input || '')
    .split(/[,;\n]/)
    .forEach((piece) => {
      const tag = normalizeTag(piece);
      if (!tag) return;
      if (tags.includes(tag)) return;
      if (tags.length >= max) {
        rejected.push(tag);
        return;
      }
      tags.push(tag);
    });
  return { tags, rejected };
}

export { previewOf };

export function isLocalUri(uri) {
  return /^(file|content|blob|ph|assets-library):/i.test(String(uri || ''));
}

// ------------------------------------------------------------------ list helpers

export function moveItem(list, id, direction) {
  const i = list.findIndex((x) => x.id === id);
  const j = i + (direction < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return list;
  const copy = [...list];
  const tmp = copy[i];
  copy[i] = copy[j];
  copy[j] = tmp;
  return copy;
}

const patchItem = (list, id, patch) => list.map((x) => (x.id === id ? { ...x, ...patch } : x));
const removeItem = (list, id) => list.filter((x) => x.id !== id);

// ------------------------------------------------------------------ creating works

export function newBlock(type, extra = {}) {
  const base =
    type === 'text'
      ? { id: newId('b'), type, text: '' }
      : MEDIA_BLOCKS.includes(type)
        ? { id: newId('b'), type, uri: '', caption: '', ...sanitizeMediaMeta(null) }
        : { id: newId('b'), type, uri: '', caption: '' };
  return { ...base, ...extra };
}

export function newChapter(mediaType) {
  if (mediaType === 'Mixed') return { id: newId('c'), title: '', blocks: [newBlock('text')] };
  return { id: newId('c'), title: '', text: '' };
}

export function createWork(mediaType, now = new Date(), random = Math.random) {
  const iso = now.toISOString();
  const type = MEDIA_TYPES.includes(mediaType) ? mediaType : 'Written';
  return {
    id: newId('w'),
    mediaType: type,
    title: '',
    description: '',
    genre: '',
    tags: [],
    access: 'Free',
    priceCents: DEFAULT_PRICE_CENTS,
    previewCount: null,
    coverUri: null,
    coverColor: COVER_COLORS[Math.floor(random() * COVER_COLORS.length) % COVER_COLORS.length],
    chapters: type === 'Image' || type === 'Video' ? [] : [newChapter(type)],
    images: [],
    video: null,
    status: 'draft',
    scheduledFor: null,
    publishedAt: null,
    createdAt: iso,
    updatedAt: iso,
  };
}

export function chapterName(chapter, index) {
  const t = chapter && typeof chapter.title === 'string' ? chapter.title.trim() : '';
  return t || `Chapter ${index + 1}`;
}

// ------------------------------------------------------------------ editing operations
// Every operation returns a NEW work and never mutates its input.

export function addChapter(work) {
  return { ...work, chapters: [...work.chapters, newChapter(work.mediaType)] };
}
export function updateChapter(work, chapterId, patch) {
  return { ...work, chapters: patchItem(work.chapters, chapterId, patch) };
}
export function removeChapter(work, chapterId) {
  return { ...work, chapters: removeItem(work.chapters, chapterId) };
}
export function moveChapter(work, chapterId, direction) {
  return { ...work, chapters: moveItem(work.chapters, chapterId, direction) };
}

export function addImages(work, items) {
  const added = (items || [])
    .filter((item) => item && item.uri)
    .map((item) => ({ id: newId('i'), uri: item.uri, caption: item.caption || '' }));
  return { ...work, images: [...work.images, ...added] };
}
export function updateImage(work, imageId, patch) {
  return { ...work, images: patchItem(work.images, imageId, patch) };
}
export function removeImage(work, imageId) {
  return { ...work, images: removeItem(work.images, imageId) };
}
export function moveImage(work, imageId, direction) {
  return { ...work, images: moveItem(work.images, imageId, direction) };
}

function withBlocks(work, chapterId, fn) {
  return {
    ...work,
    chapters: work.chapters.map((c) => (c.id === chapterId ? { ...c, blocks: fn(c.blocks || []) } : c)),
  };
}
export function addBlock(work, chapterId, type, extra) {
  return withBlocks(work, chapterId, (blocks) => [...blocks, newBlock(type, extra)]);
}
// Insert a block at a position (0 = first). Used to place audio and video where the creator chooses.
export function insertBlockAt(work, chapterId, index, type, extra) {
  return withBlocks(work, chapterId, (blocks) => {
    const at = Math.max(0, Math.min(blocks.length, Number.isInteger(index) ? index : blocks.length));
    return [...blocks.slice(0, at), newBlock(type, extra), ...blocks.slice(at)];
  });
}

// Attach an uploaded file to a block (audio, video or image), keeping its caption.
export function setBlockMedia(work, chapterId, blockId, file) {
  return withBlocks(work, chapterId, (blocks) =>
    patchItem(blocks, blockId, file ? { uri: file.uri, ...sanitizeMediaMeta(file) } : { uri: '', ...sanitizeMediaMeta(null) })
  );
}

// Where a block sits: { chapterId, index } or null.
export function findBlock(work, blockId) {
  for (const c of work.chapters || []) {
    const index = (c.blocks || []).findIndex((b) => b.id === blockId);
    if (index >= 0) return { chapterId: c.id, index };
  }
  return null;
}

// The video of a Video story.
export function setVideo(work, file, caption) {
  if (!file) return { ...work, video: null };
  return { ...work, video: { uri: file.uri, caption: typeof caption === 'string' ? caption : (work.video && work.video.caption) || '', ...sanitizeMediaMeta(file) } };
}
export function updateVideo(work, patch) {
  return work.video ? { ...work, video: { ...work.video, ...patch } } : work;
}

export function updateBlock(work, chapterId, blockId, patch) {
  return withBlocks(work, chapterId, (blocks) => patchItem(blocks, blockId, patch));
}
export function removeBlock(work, chapterId, blockId) {
  return withBlocks(work, chapterId, (blocks) => removeItem(blocks, blockId));
}
export function moveBlock(work, chapterId, blockId, direction) {
  return withBlocks(work, chapterId, (blocks) => moveItem(blocks, blockId, direction));
}

// ------------------------------------------------------------------ counting

function blockIsEmpty(block) {
  if (!block) return true;
  if (block.type === 'text') return toParagraphs(block.text).length === 0;
  return !(typeof block.uri === 'string' && block.uri.trim());
}

function chapterParagraphs(work, chapter) {
  if (work.mediaType === 'Mixed') {
    return (chapter.blocks || []).filter((b) => b.type === 'text').flatMap((b) => toParagraphs(b.text));
  }
  return toParagraphs(chapter.text);
}

export function chapterIsEmpty(work, chapter) {
  if (work.mediaType === 'Mixed') return (chapter.blocks || []).every(blockIsEmpty);
  return toParagraphs(chapter.text).length === 0;
}

export function workCounts(work) {
  const chapters = work.chapters || [];
  const words = chapters.reduce((sum, c) => sum + wordCount(chapterParagraphs(work, c)), 0);
  const blocks = chapters.reduce((sum, c) => sum + (c.blocks || []).filter((b) => !blockIsEmpty(b)).length, 0);
  const allBlocks = chapters.flatMap((c) => (c.blocks || []).filter((b) => !blockIsEmpty(b)));
  const videos = allBlocks.filter((b) => b.type === 'video').length + (work.video && work.video.uri ? 1 : 0);
  const audio = allBlocks.filter((b) => b.type === 'audio').length;
  return { chapters: chapters.length, images: (work.images || []).length, blocks, words, videos, audio };
}

const plural = (n, word) => `${n.toLocaleString ? n.toLocaleString('en-US') : n} ${word}${n === 1 ? '' : 's'}`;

export function workSummary(work) {
  const c = workCounts(work);
  if (work.mediaType === 'Image') return plural(c.images, 'image');
  if (work.mediaType === 'Video') return work.video && work.video.uri ? `1 video${fileSummary(work.video) ? ` · ${fileSummary(work.video)}` : ''}` : 'No video yet';
  if (work.mediaType === 'Mixed') return `${plural(c.chapters, 'chapter')} · ${plural(c.blocks, 'block')}${c.audio ? ` · ${plural(c.audio, 'audio clip')}` : ''}`;
  return `${plural(c.chapters, 'chapter')} · ${plural(c.words, 'word')}`;
}

// ------------------------------------------------------------------ validation

// Returns { errors, warnings, ready }. Errors block publishing; warnings are advice.
export function validateWork(work) {
  const errors = [];
  const warnings = [];
  const err = (id, message) => errors.push({ id, message });
  const warn = (id, message) => warnings.push({ id, message });

  const title = String(work.title || '').trim();
  const description = String(work.description || '').trim();
  if (title.length < LIMITS.minTitle) err('title', `Add a title (at least ${LIMITS.minTitle} characters).`);
  if (description.length < LIMITS.minDescription) {
    err('description', `Add a description (at least ${LIMITS.minDescription} characters) so readers know what the story is about.`);
  }
  if (!work.genre) err('genre', 'Choose a genre.');

  if (work.access === 'Premium') {
    if (!Number.isInteger(work.priceCents) || work.priceCents < MIN_PRICE_CENTS || work.priceCents > MAX_PRICE_CENTS) {
      err('price', `Set a price between ${formatPrice(MIN_PRICE_CENTS)} and ${formatPrice(MAX_PRICE_CENTS)}.`);
    }
  }

  if (work.mediaType === 'Video') {
    if (!work.video || !work.video.uri) err('video', 'Upload a video first.');
    else if (work.access === 'Premium') warn('premium', 'A Premium video has no free preview: readers see a lock until they buy it (demo purchase).');
  } else if (work.mediaType === 'Image') {
    const images = (work.images || []).filter((i) => i.uri);
    if (images.length === 0) err('images', 'Add at least one image.');
    const uncaptioned = images.filter((i) => !String(i.caption || '').trim()).length;
    if (uncaptioned > 0) warn('captions', `${plural(uncaptioned, 'image')} ${uncaptioned === 1 ? 'has' : 'have'} no caption.`);
    if (work.access === 'Premium' && images.length > 0 && images.length <= previewOf(work)) {
      warn('premium', `Premium shows the first ${previewOf(work)} panels free. With ${previewOf(work)} or fewer images, nothing is locked.`);
    }
  } else {
    const chapters = work.chapters || [];
    if (chapters.length === 0) err('chapters', 'Add at least one chapter.');
    chapters.forEach((chapter, i) => {
      if (chapterIsEmpty(work, chapter)) {
        err(`chapter-${chapter.id}`, `${chapterName(chapter, i)} is empty. Add some content or delete it.`);
      }
    });
    if (work.mediaType === 'Mixed') {
      const emptyBlocks = chapters.reduce(
        (sum, c) => sum + (chapterIsEmpty(work, c) ? 0 : (c.blocks || []).filter(blockIsEmpty).length),
        0
      );
      if (emptyBlocks > 0) warn('blocks', `${plural(emptyBlocks, 'empty block')} will be left out.`);
    }
    if (work.access === 'Premium' && chapters.length <= previewOf(work)) {
      warn('premium', `Premium shows the first ${previewOf(work)} chapter${previewOf(work) === 1 ? '' : 's'} free. With ${chapters.length} chapter${chapters.length === 1 ? '' : 's'}, nothing is locked.`);
    }
  }

  if (!work.coverUri) warn('cover', 'No cover image. A generated cover will be used.');
  if (!work.tags || work.tags.length === 0) warn('tags', 'No tags. Tags help readers find your story in search.');

  const uris = [
    work.coverUri,
    ...(work.images || []).map((i) => i.uri),
    ...(work.chapters || []).flatMap((c) => (c.blocks || []).map((b) => b.uri)),
    work.video ? work.video.uri : null,
  ].filter(Boolean);
  if (uris.some(isLocalUri)) {
    warn('local-media', 'Media picked from this device is stored by reference and will only show on this device.');
  }

  if (work.access === 'Premium') {
    const { exposed, hidden } = auditMediaVisibility(work);
    if (exposed.length) {
      warn('media-exposed', `Locked content is stored publicly, so anyone with the link could open it: ${exposed.slice(0, 3).join(', ')}${exposed.length > 3 ? ` and ${exposed.length - 3} more` : ''}. Re-upload it after setting the story to Premium.`);
    }
    if (hidden.length) {
      warn('media-hidden', `Free-preview content is stored privately, so readers who haven’t bought the story can’t see it: ${hidden.slice(0, 3).join(', ')}${hidden.length > 3 ? ` and ${hidden.length - 3} more` : ''}. Re-upload it.`);
    }
  }

  return { errors, warnings, ready: errors.length === 0 };
}

// ------------------------------------------------------------------ publishing transitions
// Each returns { ok, work, errors } and never mutates its input.

export function applyPublish(work, now = new Date()) {
  const { errors, ready } = validateWork(work);
  if (!ready) return { ok: false, work, errors };
  const iso = now.toISOString();
  return { ok: true, errors: [], work: { ...work, status: 'published', publishedAt: iso, scheduledFor: null, updatedAt: iso } };
}

export function applySchedule(work, date, now = new Date()) {
  const { errors, ready } = validateWork(work);
  if (!ready) return { ok: false, work, errors };
  const check = validateSchedule(date, now);
  if (!check.ok) return { ok: false, work, errors: [{ id: 'schedule', message: check.message }] };
  const when = toDate(date);
  return {
    ok: true,
    errors: [],
    work: { ...work, status: 'scheduled', scheduledFor: when.toISOString(), publishedAt: null, updatedAt: now.toISOString() },
  };
}

// Back to a private draft. Works for published and scheduled stories.
export function applyUnpublish(work, now = new Date()) {
  return { ok: true, errors: [], work: { ...work, status: 'draft', publishedAt: null, scheduledFor: null, updatedAt: now.toISOString() } };
}

// Release every scheduled work whose time has come. A work that no longer passes validation
// goes back to draft instead (and is reported in `failed`).
export function releaseDueWorks(works, now = new Date()) {
  const released = [];
  const failed = [];
  const iso = now.toISOString();
  const next = works.map((w) => {
    if (!isDue(w, now)) return w;
    if (!validateWork(w).ready) {
      failed.push(w.id);
      return { ...w, status: 'draft', scheduledFor: null, updatedAt: iso };
    }
    released.push(w.id);
    return { ...w, status: 'published', publishedAt: w.scheduledFor, scheduledFor: null, updatedAt: iso };
  });
  return { works: released.length || failed.length ? next : works, released, failed };
}

export function statusLabel(work) {
  if (work.status === 'published') return 'Live';
  if (work.status === 'scheduled') return 'Scheduled';
  return 'Draft';
}

// Group for the studio lists: drafts (newest edit first), scheduled (soonest first), live (newest first).
export function groupWorks(works) {
  const ms = (v) => {
    const d = toDate(v);
    return d ? d.getTime() : 0;
  };
  const by = (status) => works.filter((w) => w.status === status);
  return {
    draft: by('draft').sort((a, b) => ms(b.updatedAt) - ms(a.updatedAt)),
    scheduled: by('scheduled').sort((a, b) => ms(a.scheduledFor) - ms(b.scheduledFor)),
    published: by('published').sort((a, b) => ms(b.publishedAt) - ms(a.publishedAt)),
  };
}

// ------------------------------------------------------------------ bridge to the reader screens

const EMPTY_NOTE = 'This chapter has no content yet.';

// { chapters, gallery, video } in the shape the story page, reader and gallery already use.
export function buildContent(work) {
  const icon = genreIcons[work.genre] || 'book';
  if (work.mediaType === 'Image') {
    const gallery = (work.images || [])
      .filter((i) => i.uri)
      .map((i) => ({
        id: i.id,
        uri: i.uri,
        caption: String(i.caption || '').trim(),
        color: work.coverColor,
        icon,
      }));
    return { chapters: [], gallery, video: null };
  }
  if (work.mediaType === 'Video') {
    const v = work.video && work.video.uri ? work.video : null;
    return {
      chapters: [],
      gallery: [],
      video: v ? { uri: v.uri, previewUri: null, caption: String(v.caption || '').trim(), name: v.name || '', size: v.size, format: v.format || '', durationMs: v.durationMs || null, about: String(work.description || '').trim(), userUpload: true } : null,
    };
  }

  const chapters = (work.chapters || []).map((chapter, index) => {
    const title = chapterName(chapter, index);
    if (work.mediaType === 'Mixed') {
      const blocks = (chapter.blocks || [])
        .filter((b) => !blockIsEmpty(b))
        .map((b) =>
          b.type === 'text'
            ? { id: b.id, type: 'text', paragraphs: toParagraphs(b.text) }
            : { id: b.id, type: b.type, uri: b.uri.trim(), caption: String(b.caption || '').trim(), ...(MEDIA_BLOCKS.includes(b.type) ? sanitizeMediaMeta(b) : {}) }
        );
      const body = chapterParagraphs(work, chapter);
      return {
        id: chapter.id,
        title,
        blocks,
        body: blocks.length === 0 ? [EMPTY_NOTE] : body,
      };
    }
    const body = toParagraphs(chapter.text);
    return { id: chapter.id, title, body: body.length ? body : [EMPTY_NOTE] };
  });
  return { chapters, gallery: [], video: null };
}

function approxReadMinutes(work, content) {
  if (work.mediaType === 'Image') return Math.max(1, Math.round(content.gallery.length * 0.5));
  if (work.mediaType === 'Video') return Math.max(1, Math.round(((content.video && content.video.durationMs) || 60000) / 60000));
  const paragraphs = content.chapters.flatMap((c) => c.body);
  return Math.max(1, Math.round(wordCount(paragraphs) / 200));
}

// The story record that discovery, the story page and the readers consume.
// Drafts and scheduled works get `preview: true`: only their owner can open them.
export function workToStory(work, now = new Date()) {
  const published = work.status === 'published';
  const publishedAt = published ? toDate(work.publishedAt) : null;
  const daysAgo = publishedAt ? Math.max(0, Math.floor((now.getTime() - publishedAt.getTime()) / DAY_MS)) : 0;
  const content = buildContent(work);

  let publishLabel;
  if (work.status === 'draft') publishLabel = 'Not published yet (draft preview)';
  if (work.status === 'scheduled') publishLabel = `Scheduled for ${formatDateTime(work.scheduledFor)} (simulated)`;

  return {
    id: work.id,
    title: String(work.title || '').trim() || 'Untitled story',
    creatorId: 'me',
    genre: work.genre || 'Draft',
    mediaType: work.mediaType,
    access: work.access === 'Premium' ? 'Premium' : 'Free',
    priceCents: work.access === 'Premium' ? work.priceCents : null,
    previewCount: work.access === 'Premium' ? previewOf(work) : null,
    blurb: String(work.description || '').trim() || 'No description yet.',
    readMinutes: approxReadMinutes(work, content),
    likes: 0,
    rating: 0,
    ratingCount: 0,
    daysAgo,
    subgenres: [],
    featured: false,
    coverColor: work.coverColor || COVER_COLORS[0],
    coverUri: work.coverUri || null,
    icon: genreIcons[work.genre] || 'book',
    tags: [...(work.tags || [])],
    isUserStory: true,
    preview: !published,
    workStatus: work.status,
    publishLabel,
  };
}


// ------------------------------------------------------------------ loading saved data

function str(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeBlock(b) {
  if (!b || typeof b !== 'object' || typeof b.id !== 'string' || !BLOCK_TYPES.includes(b.type)) return null;
  if (b.type === 'text') return { id: b.id, type: 'text', text: str(b.text) };
  return { id: b.id, type: b.type, uri: str(b.uri), caption: str(b.caption), ...(MEDIA_BLOCKS.includes(b.type) ? sanitizeMediaMeta(b) : {}) };
}

// Turns whatever was saved into a valid work, or null when it is unusable.
export function sanitizeWork(raw, now = new Date()) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id) return null;
  if (!MEDIA_TYPES.includes(raw.mediaType)) return null;
  const iso = now.toISOString();
  const createdAt = toDate(raw.createdAt) ? raw.createdAt : iso;
  const updatedAt = toDate(raw.updatedAt) ? raw.updatedAt : createdAt;

  const chapters = (Array.isArray(raw.chapters) ? raw.chapters : [])
    .filter((c) => c && typeof c === 'object' && typeof c.id === 'string')
    .map((c) =>
      raw.mediaType === 'Mixed'
        ? { id: c.id, title: str(c.title), blocks: (Array.isArray(c.blocks) ? c.blocks : []).map(sanitizeBlock).filter(Boolean) }
        : { id: c.id, title: str(c.title), text: str(c.text) }
    );
  const images = (Array.isArray(raw.images) ? raw.images : [])
    .filter((i) => i && typeof i === 'object' && typeof i.id === 'string' && typeof i.uri === 'string' && i.uri)
    .map((i) => ({ id: i.id, uri: i.uri, caption: str(i.caption) }));

  let status = STATUSES.includes(raw.status) ? raw.status : 'draft';
  let scheduledFor = toDate(raw.scheduledFor) ? new Date(raw.scheduledFor).toISOString() : null;
  let publishedAt = toDate(raw.publishedAt) ? new Date(raw.publishedAt).toISOString() : null;
  if (status === 'scheduled' && !scheduledFor) status = 'draft';
  if (status === 'published' && !publishedAt) publishedAt = updatedAt;
  if (status !== 'scheduled') scheduledFor = null;
  if (status !== 'published') publishedAt = null;

  return {
    id: raw.id,
    mediaType: raw.mediaType,
    title: str(raw.title),
    description: str(raw.description),
    genre: str(raw.genre),
    tags: (Array.isArray(raw.tags) ? raw.tags : []).map(normalizeTag).filter(Boolean).slice(0, LIMITS.tags),
    access: raw.access === 'Premium' ? 'Premium' : 'Free',
    priceCents: Number.isInteger(raw.priceCents) && raw.priceCents >= MIN_PRICE_CENTS && raw.priceCents <= MAX_PRICE_CENTS ? raw.priceCents : DEFAULT_PRICE_CENTS,
    previewCount: Number.isInteger(raw.previewCount) && raw.previewCount >= 0 && raw.previewCount <= MAX_PREVIEW ? raw.previewCount : null,
    coverUri: typeof raw.coverUri === 'string' && raw.coverUri ? raw.coverUri : null,
    coverColor: typeof raw.coverColor === 'string' && raw.coverColor ? raw.coverColor : COVER_COLORS[0],
    chapters,
    images,
    video: raw.mediaType === 'Video' && raw.video && typeof raw.video === 'object' && typeof raw.video.uri === 'string' && raw.video.uri ? { uri: raw.video.uri, caption: str(raw.video.caption), ...sanitizeMediaMeta(raw.video) } : null,
    status,
    scheduledFor,
    publishedAt,
    createdAt,
    updatedAt,
  };
}

export function sanitizeWorks(raw, now = new Date()) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.works) ? raw.works : [];
  const seen = new Set();
  const out = [];
  list.forEach((item) => {
    const work = sanitizeWork(item, now);
    if (work && !seen.has(work.id)) {
      seen.add(work.id);
      out.push(work);
    }
  });
  return out;
}
