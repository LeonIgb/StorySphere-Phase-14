// Which media is public and which is premium (private, access-controlled). PURE.
//
// Rule: in a PREMIUM story everything after the free preview is premium media; the free preview
// itself, covers and avatars are public (anyone may see them anyway). A video story that is
// Premium is premium in full (it has no free preview). Free stories are entirely public.

import { previewOf } from './access';
import { visibilityOfUri } from './mediaRefs';

// section: 'images' (gallery panel), 'chapter' (a block inside chapter #index), 'video'. index is 0-based.
export function visibilityFor(work, section, index = 0) {
  if (!work || work.access !== 'Premium') return 'public';
  if (section === 'video') return 'premium';
  return index >= previewOf(work) ? 'premium' : 'public';
}

// Looks for media stored with the WRONG visibility. Uses only each uri, so it needs no extra metadata.
//   exposed : locked content stored publicly (anyone with the link could open it)
//   hidden  : free-preview content stored as premium (people who haven't bought it can't open it)
export function auditMediaVisibility(work) {
  const exposed = [];
  const hidden = [];
  if (!work) return { exposed, hidden };
  const check = (uri, want, where) => {
    const have = visibilityOfUri(uri);
    if (!have || have === want) return;
    (have === 'public' ? exposed : hidden).push(where);
  };
  (work.images || []).forEach((i, n) => check(i.uri, visibilityFor(work, 'images', n), `image ${n + 1}`));
  if (work.video && work.video.uri) check(work.video.uri, visibilityFor(work, 'video'), 'the video');
  (work.chapters || []).forEach((c, ci) =>
    (c.blocks || []).forEach((b) => b.uri && check(b.uri, visibilityFor(work, 'chapter', ci), `chapter ${ci + 1} ${b.type}`))
  );
  return { exposed, hidden };
}
