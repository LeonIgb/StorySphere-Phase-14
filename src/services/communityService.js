// Where the community document is stored (Phase 8).
//
// PROTOTYPE: reactions, ratings, reviews, comments, reports and notification state are all saved
// on this device, per account (AsyncStorage). In production every one of these is a server
// resource with server-side validation, rate limits and moderation:
//   POST /stories/:id/reactions   PUT /stories/:id/rating   POST /stories/:id/reviews
//   POST /stories/:id/comments    POST /reports (feeds a moderation queue)
//   GET  /notifications           POST /creators/:id/announcements (push / email fan-out)
// Screens never read storage directly; they go through CommunityContext, so only this file and
// the context change when a backend arrives.

import { communityKey } from '../data/storageKeys';
import { demoDoc, emptyDoc, sanitizeDoc } from '../utils/community';
import { loadJSON, saveJSON } from '../utils/storage';

export async function loadCommunity(user) {
  const saved = await loadJSON(communityKey(user.id), null);
  if (saved) return sanitizeDoc(saved);
  const fresh = user.isDemo ? demoDoc() : emptyDoc();
  await saveJSON(communityKey(user.id), fresh);
  return fresh;
}

export const saveCommunity = (user, doc) => saveJSON(communityKey(user.id), doc);

export const freshCommunity = (user) => (user && user.isDemo ? demoDoc() : emptyDoc());
