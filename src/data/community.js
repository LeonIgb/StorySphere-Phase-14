// Sample community content (Phase 8): the reviews and comments other people "wrote". It is
// generated deterministically from each story, so the same story always shows the same
// discussion. Timestamps are relative to when the app started, so nothing goes stale.
// A real backend replaces all of this; there are no real users behind these names.

import { creators } from './creators';
import { readers } from './people';
import { hashString } from '../utils/account';

export const PEOPLE = [...creators, ...readers].map((p) => ({ id: p.id, name: p.name, handle: p.handle, color: p.color }));
export const PEOPLE_BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

const REVIEWERS = readers.map((r) => r.id);
const EPOCH = Date.now();
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

const REVIEW_TEMPLATES = [
  { rating: 5, text: '“{title}” stayed with me for days. The {genre} elements feel earned and the last stretch is genuinely moving.' },
  { rating: 4, text: 'Beautifully paced. I wanted a little more of the world, but {creator} clearly knows where this is going.' },
  { rating: 5, text: 'Read it in one sitting. {creator} has a gift for making small moments land.' },
  { rating: 3, text: 'Strong start and a slower middle. Worth sticking with for the ending, though.' },
  { rating: 4, text: 'Clever, kind and easy to recommend. I am sending “{title}” to everyone in my book club.' },
  { rating: 5, text: 'I do not usually read {genre}, and this changed my mind. More, please.' },
];

const STORY_COMMENTS = [
  'Just started this and I am already hooked. No spoilers please!',
  'The opening paragraph is perfect. Saving this for a quiet evening.',
  'Is anyone else rereading the first section to catch the small details?',
  'Following {creator} after this. What a voice.',
];
const REPLIES = ['Same here! The details really reward a second read.', 'Agreed. I did not notice that on the first pass.', 'Totally. Welcome to the club.'];
const CHAPTER_COMMENTS = [
  'Chapter {n} gave me chills. That last paragraph!',
  'I did not see the turn in chapter {n} coming at all.',
  'Chapter {n} is my favourite so far. Anyone else?',
];

const pick = (list, seed, i = 0) => list[(seed + i) % list.length];
const fill = (text, story) =>
  text
    .replace(/\{title\}/g, story.title || 'this story')
    .replace(/\{genre\}/g, String(story.genre || 'story').toLowerCase())
    .replace(/\{creator\}/g, story.creator ? story.creator.name : 'the author')
    .replace(/\{n\}/g, '');

const cache = new Map();

// { reviews, comments } for one story. User-made stories (creatorId 'me') start with nothing.
export function seedFor(story) {
  if (!story || story.creatorId === 'me') return { reviews: [], comments: [] };
  const chapters = story.chapterCount || 0;
  const key = `${story.id}|${chapters}`;
  if (cache.has(key)) return cache.get(key);
  const seed = hashString(story.id);

  const reviews = [0, 1, 2].map((i) => {
    const t = pick(REVIEW_TEMPLATES, seed, i * 2);
    return {
      id: `seed:${story.id}:rv${i}`,
      storyId: story.id,
      authorId: pick(REVIEWERS, seed, i * 3),
      rating: t.rating,
      text: fill(t.text, story),
      at: EPOCH - (2 + i * 5 + (seed % 4)) * DAY,
      baseHelpful: ((seed >> i) % 17) + 3,
      seed: true,
    };
  });
  // Reviewers must be distinct people.
  const seen = new Set();
  const uniqueReviews = reviews.filter((r) => (seen.has(r.authorId) ? false : seen.add(r.authorId)));

  const comments = [];
  const addThread = (idx, chapter, text, ageMin, withReply) => {
    const id = `seed:${story.id}:c${idx}`;
    comments.push({ id, storyId: story.id, chapter, parentId: null, authorId: pick(REVIEWERS, seed, idx + 1), text, at: EPOCH - ageMin * MIN, baseLikes: ((seed >> idx) % 23) + 1, seed: true });
    if (withReply) {
      comments.push({ id: `${id}r0`, storyId: story.id, chapter, parentId: id, replyTo: pick(REVIEWERS, seed, idx + 1), authorId: pick(REVIEWERS, seed, idx + 3), text: pick(REPLIES, seed, idx), at: EPOCH - (ageMin - 25) * MIN, baseLikes: (seed >> (idx + 1)) % 6, seed: true });
    }
  };
  STORY_COMMENTS.slice(0, 3).forEach((t, i) => addThread(i, null, fill(t, story), 180 + i * 700 + (seed % 90), i !== 2));
  if (story.creator) addThread(3, null, fill(STORY_COMMENTS[3], story), 4000, false);
  for (let ch = 0; ch < Math.min(chapters, 3); ch += 1) {
    addThread(10 + ch, ch, pick(CHAPTER_COMMENTS, seed, ch).replace('{n}', String(ch + 1)), 300 + ch * 500, ch === 0);
  }
  const out = { reviews: uniqueReviews, comments };
  cache.set(key, out);
  return out;
}

// Baseline "shares" so the share count reads naturally next to the likes.
export const baseShares = (story) => (story && story.creatorId !== 'me' ? Math.round((story.likes || 0) / 40) : 0);
