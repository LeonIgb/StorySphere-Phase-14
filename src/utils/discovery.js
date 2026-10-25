// Pure discovery helpers: search, filter, sort, trending and recommendations.
// No React and no I/O, so they are easy to test and to move to a real backend later.

import { DEFAULT_SORT } from '../data/discoveryOptions';

const norm = (value) => String(value || '').toLowerCase();

function words(query) {
  return norm(query)
    .split(/\s+/)
    .map((w) => w.replace(/^#/, ''))
    .filter(Boolean);
}

// A story matches when EVERY typed word appears in its title, creator name or tags.
export function matchesQuery(story, query) {
  const parts = words(query);
  if (parts.length === 0) return true;
  const haystack = [story.title, story.creator ? story.creator.name : '', ...(story.tags || [])]
    .map(norm)
    .join(' | ');
  return parts.every((w) => haystack.includes(w));
}

export function filterStories(list, { query = '', genre = 'All', mediaType = 'All', access = 'All' } = {}) {
  return list.filter(
    (s) =>
      matchesQuery(s, query) &&
      (genre === 'All' || s.genre === genre) &&
      (mediaType === 'All' || s.mediaType === mediaType) &&
      (access === 'All' || s.access === access)
  );
}

// Returns a new array. Ties fall back to a stable order so results don't jump around.
export function sortStories(list, sort = DEFAULT_SORT) {
  const copy = [...list];
  const byId = (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  if (sort === 'Newest') {
    return copy.sort((a, b) => a.daysAgo - b.daysAgo || b.likes - a.likes || byId(a, b));
  }
  if (sort === 'Top rated') {
    return copy.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount || byId(a, b));
  }
  // 'Popular'
  return copy.sort((a, b) => b.likes - a.likes || byId(a, b));
}

// Likes, discounted by age, so newer hits can outrank older ones.
export function trendingScore(story) {
  return story.likes / Math.pow(story.daysAgo + 3, 0.6);
}

export function trendingStories(list, limit = 4) {
  return [...list].sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, limit);
}

export function recentStories(list, limit = 5) {
  return sortStories(list, 'Newest').slice(0, limit);
}

// Creators whose genres overlap the reader's interests come first, each with a reason line.
export function recommendCreators(list, interests = [], limit = 6) {
  return list
    .map((creator) => {
      const matched = (creator.genres || []).find((g) => interests.includes(g));
      return {
        creator,
        reason: matched ? `Because you like ${matched}` : 'Popular storyteller',
        score: (matched ? 1 : 0) * 1000000 + creator.followers,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ creator, reason }) => ({ ...creator, reason }));
}

export function matchCreators(list, query) {
  const parts = words(query);
  if (parts.length === 0) return [];
  return list.filter((c) => {
    const haystack = [c.name, c.handle.replace('@', ''), c.specialty].map(norm).join(' | ');
    return parts.every((w) => haystack.includes(w));
  });
}

export function genreSummary(list, genreNames, iconMap = {}) {
  return genreNames.map((name) => ({
    name,
    count: list.filter((s) => s.genre === name).length,
    icon: iconMap[name] || 'book',
  }));
}
