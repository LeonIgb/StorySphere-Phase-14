// People directory and public profiles (Phase 5). Mock data, like storyService.
// Swap the internals for API calls later; the screens only use these functions.
//
// The directory is the 8 sample storytellers, 6 sample readers and the signed-in user ('me').
// Follower and following LISTS for sample people are a stable sample of the directory (there is
// no real social graph); the signed-in user's own lists are real and come from their account.

import { creators } from '../data/creators';
import { readers } from '../data/people';
import { sampleList } from '../utils/account';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const asPerson = (c) => ({ ...c, role: 'storyteller' });
export const directory = [...creators.map(asPerson), ...readers];
const byId = Object.fromEntries(directory.map((p) => [p.id, p]));

// `me` is the signed-in user's directory entry (see AccountContext.me).
function resolve(id, me) {
  if (id === 'me') return me || null;
  return byId[id] || null;
}

// Followers (ids) of someone. For sample people: a stable sample, plus you if you follow them.
export function followerIdsOf(personId, social) {
  if (personId === 'me') return social.followers;
  const pool = directory.map((p) => p.id).filter((id) => id !== personId);
  const ids = sampleList(pool, `followers:${personId}`, 3, 6);
  return social.following.includes(personId) ? ['me', ...ids] : ids;
}

// Who someone follows (ids).
export function followingIdsOf(personId, social) {
  if (personId === 'me') return social.following;
  const pool = directory.map((p) => p.id).filter((id) => id !== personId);
  return sampleList(pool, `following:${personId}`, 2, 5);
}

// { people }: the people in a follower or following list.
export async function fetchFollowList(personId, kind, { social, me }) {
  await delay(350);
  const ids = kind === 'followers' ? followerIdsOf(personId, social) : followingIdsOf(personId, social);
  return { people: ids.map((id) => resolve(id, me)).filter(Boolean) };
}

export function lookupPerson(id, me) {
  return resolve(id, me);
}
