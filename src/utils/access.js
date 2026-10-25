// Free-preview and locked-content rules, as PURE functions.
//
// These are the rules a backend would run. In this prototype the mock service layer runs them
// (see services/accessService.js and storyService.fetchStory): locked chapters, panels and video
// are removed from what the service returns, so the screens never receive content the account
// has no right to. The screens also use these functions to decide what to DRAW (lock icons,
// "free preview" tags), but they never grant access themselves.

export const FREE_PREVIEW_CHAPTERS = 1;
export const FREE_PREVIEW_PANELS = 3;
export const MAX_PREVIEW = 5;

// kind: 'chapters' | 'gallery'. A creator can set story.previewCount for their primary content
// (chapters for written / mixed stories, panels for image stories).
export function freePreviewCount(story, kind) {
  if (!story || story.access !== 'Premium') return Infinity;
  const primary = story.mediaType === 'Image' ? 'gallery' : 'chapters';
  if (kind === primary && Number.isInteger(story.previewCount) && story.previewCount >= 0) return story.previewCount;
  return kind === 'gallery' ? FREE_PREVIEW_PANELS : FREE_PREVIEW_CHAPTERS;
}

// `entitled`: the account has full access (the service decided: purchase, owner, free story).
export function isUnitLocked(story, index, kind, entitled = false) {
  if (!story || entitled) return false;
  return index >= freePreviewCount(story, kind);
}

// How many of `total` units are readable right now.
export function unlockedCount(story, total, kind, entitled = false) {
  if (entitled) return total;
  return Math.min(total, freePreviewCount(story, kind));
}

// Premium videos play a short preview clip unless the account is entitled. A locked video has
// uri === null (the service withheld it), so there is nothing to play without a preview.
export function videoSource(story, video, entitled = false) {
  if (!video) return { uri: null, isPreview: false };
  if (entitled && video.uri) return { uri: video.uri, isPreview: false };
  if (video.previewUri) return { uri: video.previewUri, isPreview: true };
  return { uri: entitled ? video.uri : null, isPreview: false };
}

// The access decision. `entitlements`: the account's VERIFIED entitlements.
// Returns { entitled, reason } with reason: 'free' | 'owner' | 'purchase' | 'dev-override' | 'locked'.
export function decideAccess({ story, entitlements = [], devOverride = false }) {
  if (!story) return { entitled: false, reason: 'locked' };
  if (story.access !== 'Premium') return { entitled: true, reason: 'free' };
  if (story.creatorId === 'me') return { entitled: true, reason: 'owner' };
  if (entitlements.some((e) => e.storyId === story.id)) return { entitled: true, reason: 'purchase' };
  if (devOverride) return { entitled: true, reason: 'dev-override' };
  return { entitled: false, reason: 'locked' };
}

// Removes what an account may not see. Returns new content; the input is not changed.
// Locked chapters keep their title and reading time (so the contents list works) but lose
// their text and blocks; locked panels lose the image and caption; a locked video loses its
// full-length source (the free preview clip stays).
export function redactContent(story, content, entitled) {
  const c = content || {};
  if (entitled || !story || story.access !== 'Premium') {
    return { chapters: c.chapters || [], gallery: c.gallery || [], video: c.video || null };
  }
  const chapterFree = freePreviewCount(story, 'chapters');
  const panelFree = freePreviewCount(story, 'gallery');
  return {
    chapters: (c.chapters || []).map((ch, i) =>
      i < chapterFree ? ch : { id: ch.id, title: ch.title, minutes: ch.minutes, body: [], locked: true }
    ),
    gallery: (c.gallery || []).map((g, i) =>
      i < panelFree ? g : { id: g.id, caption: '', color: g.color, icon: g.icon, uri: null, locked: true }
    ),
    video: c.video ? { ...c.video, uri: null, locked: true } : null,
  };
}

// How many chapters (or panels, for image stories) of a premium story are free to preview.
export function previewOf(work) {
  if (Number.isInteger(work.previewCount) && work.previewCount >= 0) return work.previewCount;
  if (work.mediaType === 'Video') return 0;
  return work.mediaType === 'Image' ? FREE_PREVIEW_PANELS : FREE_PREVIEW_CHAPTERS;
}
