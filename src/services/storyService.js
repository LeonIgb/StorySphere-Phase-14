// Mock data service. Every call is async and can fail, so screens are built
// around real loading and error states. Swap the internals for a real API later
// without touching the screens.
//
// Phase 4: stories the current user publishes in the Create tab (see CreatorContext) are merged
// into the catalog here, so discovery, search, creator pages and the readers see them like any
// other story. Drafts and scheduled stories are NOT in the catalog; only their owner can open
// them, through fetchStory (that is how "Preview" works).

import { stories, GENRES } from '../data/stories';
import { creators } from '../data/creators';
import { content } from '../data/content';
import { readers } from '../data/people';
import { genreIcons } from '../theme/theme';
import {
  filterStories,
  genreSummary,
  matchCreators,
  recentStories,
  recommendCreators,
  sortStories,
  trendingStories,
} from '../utils/discovery';
import { DEFAULT_SORT } from '../data/discoveryOptions';
import { readMinutes } from '../utils/reading';
import { buildContent, workToStory } from '../utils/creator';
import { priceFor } from '../data/pricing';
import { redactContent } from '../utils/access';
import { accessProvider, registerCatalog } from './accessService';

let simulateFailure = false;

export function setSimulateFailure(value) {
  simulateFailure = Boolean(value);
}

export function getSimulateFailure() {
  return simulateFailure;
}

// The current user's works (drafts, scheduled and published). Set by CreatorContext.
let userWorks = [];

export function setUserWorks(list) {
  userWorks = Array.isArray(list) ? list : [];
}

// The signed-in user's public profile (set by AccountContext): { name, handle, bio, color,
// avatarUri, genres, followers, role }. Null when signed out.
let myProfile = null;

export function setMyProfile(profile) {
  myProfile = profile || null;
}

// Sample creators with a story count derived from the sample stories.
const sampleCreators = creators.map((c) => ({
  ...c,
  storyCount: stories.filter((s) => s.creatorId === c.id).length,
}));
const sampleCreatorById = Object.fromEntries(sampleCreators.map((c) => [c.id, c]));

// The signed-in user as a storyteller, built from their profile and published stories.
function buildMe(publishedStories) {
  const p = myProfile || { name: 'You', handle: '@you', bio: '', color: '#8B6CF0', genres: [], followers: 0, role: 'reader' };
  const genres = [...new Set(publishedStories.map((s) => s.genre))];
  const fallbackGenres = p.genres && p.genres.length ? p.genres : [];
  return {
    id: 'me',
    name: p.name,
    handle: p.handle,
    bio: p.bio,
    avatarUri: p.avatarUri || null,
    role: p.role || 'storyteller',
    specialty: genres[0] || fallbackGenres[0] || 'Storyteller',
    genres: genres.length ? genres : fallbackGenres,
    followers: p.followers || 0,
    color: p.color,
    verified: false,
    storyCount: publishedStories.length,
  };
}

// Attach the creator plus numbers derived from the story's actual content, so what the screens
// show (chapters, panels, read time) always matches what is really in the story.
function decorate(story, c, creator) {
  const chapters = (c && c.chapters) || [];
  const written = story.mediaType === 'Written' || story.mediaType === 'Mixed';
  return {
    ...story,
    creator: creator || null,
    chapterCount: chapters.length,
    panelCount: c && c.gallery ? c.gallery.length : 0,
    hasVideo: Boolean(c && c.video),
    priceCents: priceFor(story),
    readMinutes: written && chapters.length ? readMinutes(chapters.flatMap((ch) => ch.body)) : story.readMinutes,
  };
}

const sampleStories = stories.map((s) => decorate(s, content[s.id], sampleCreatorById[s.creatorId]));

function userStory(work, creator, now) {
  return decorate(workToStory(work, now), buildContent(work), creator);
}

// Everything readers can find right now: sample stories plus the user's published stories.
function getCatalog() {
  const now = new Date();
  const published = userWorks.filter((w) => w.status === 'published');
  if (published.length === 0) {
    return { stories: sampleStories, creators: sampleCreators, creatorById: sampleCreatorById, me: buildMe([]) };
  }
  const publishedStories = published.map((w) => workToStory(w, now));
  const me = buildMe(publishedStories);
  const mine = published.map((w) => userStory(w, me, now));
  return {
    stories: [...sampleStories, ...mine],
    creators: myProfile && myProfile.hidden ? sampleCreators : [...sampleCreators, me],
    creatorById: { ...sampleCreatorById, me },
    me,
  };
}

// The access service looks stories up here to quote prices (it never trusts a client price).
registerCatalog((id) => getCatalog().stories.find((s) => s.id === id) || null);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function guarded(producer, ms = 650) {
  await delay(ms);
  if (simulateFailure) {
    throw new Error('We could not reach StorySphere. Check your connection and try again.');
  }
  return producer();
}

const byFollowers = (a, b) => b.followers - a.followers;

export function fetchHomeFeed() {
  return guarded(() => {
    const all = getCatalog().stories;
    return {
      featured: all.filter((s) => s.featured),
      trending: trendingStories(all, 4),
      recent: recentStories(all, 5),
      recommended: recommendCreators(sampleCreators, (myProfile && myProfile.genres) || [], 6),
      genres: genreSummary(all, GENRES.slice(1), genreIcons),
    };
  });
}

// Stories matching the query/filters (sorted), plus creators matching the query.
export function searchStories({
  query = '',
  genre = 'All',
  mediaType = 'All',
  access = 'All',
  sort = DEFAULT_SORT,
} = {}) {
  return guarded(() => {
    const catalog = getCatalog();
    const found = sortStories(filterStories(catalog.stories, { query, genre, mediaType, access }), sort);
    return { stories: found, creators: matchCreators(catalog.creators, query).sort(byFollowers) };
  }, 450);
}

export function fetchCreators() {
  return guarded(() => [...sampleCreators].sort(byFollowers), 500);
}

export function fetchAllStories() {
  return guarded(() => getCatalog().stories, 400);
}

// Resolves to null when the id is unknown (screens show a "not found" state).
// Returns the story, its content (chapters / gallery / video) and two "related" lists.
// A draft or scheduled story of the current user also resolves (with story.preview === true),
// which is what powers "Preview" in the studio.
export function fetchStory(id) {
  return guarded(async () => {
    const catalog = getCatalog();
    let story = catalog.stories.find((s) => s.id === id);
    let c = content[id];
    if (!story) {
      const work = userWorks.find((w) => w.id === id);
      if (!work) return null;
      story = userStory(work, catalog.me, new Date());
      c = buildContent(work);
    } else if (!c) {
      const work = userWorks.find((w) => w.id === id);
      c = work ? buildContent(work) : {};
    }
    const others = catalog.stories.filter((s) => s.id !== id);
    const related = sortStories(
      others.filter((s) => s.genre === story.genre),
      'Popular'
    ).slice(0, 6);
    const moreFromCreator = sortStories(
      others.filter((s) => s.creatorId === story.creatorId),
      'Popular'
    ).slice(0, 6);
    // ACCESS CONTROL happens here, in the service layer: ask the access provider whether this
    // account may see the full story, then remove whatever it may not see BEFORE returning.
    // (With a real backend this decision and the removal happen on the server.)
    const access = await accessProvider.authorize(story);
    const full = {
      chapters: (c.chapters || []).map((ch) => ({ ...ch, minutes: readMinutes(ch.body || []) })),
      gallery: c.gallery || [],
      video: c.video || null,
    };
    return {
      story: { ...story, entitled: access.entitled, entitlementReason: access.reason },
      related,
      moreFromCreator,
      content: redactContent(story, full, access.entitled),
    };
  }, 400);
}

export function fetchCreator(id) {
  return guarded(() => {
    const catalog = getCatalog();
    // The user's own page exists even before they publish anything.
    const reader = readers.find((r) => r.id === id);
    const creator = catalog.creatorById[id] || (id === 'me' ? catalog.me : null) || (reader ? { ...reader, specialty: (reader.genres || [])[0] || 'Reader', storyCount: 0 } : null);
    if (!creator) return null;
    const theirStories = sortStories(
      catalog.stories.filter((s) => s.creatorId === id),
      'Popular'
    );
    const ratings = theirStories.reduce((sum, s) => sum + s.ratingCount, 0);
    const averageRating = ratings
      ? theirStories.reduce((sum, s) => sum + s.rating * s.ratingCount, 0) / ratings
      : null;
    return { creator, stories: theirStories, averageRating };
  }, 400);
}
