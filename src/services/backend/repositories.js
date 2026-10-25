// Data access for the Supabase backend (Phase 13). Every function returns
//   { ok: true, data } or { ok: false, error, kind, retryable }
// and never throws. Authorization is NOT enforced here: these are plain requests, and the
// database's Row Level Security policies and functions (supabase/migrations) decide what is
// allowed. A tampered client can therefore not read or change anything it shouldn't.
//
// STATUS: these repositories are written and unit-tested against a mock client only. They are
// not yet wired into the story, library and community screens (those still use the local
// prototype data), and they have not been run against a real Supabase project.

import { getSupabase } from './supabaseClient';
import { call } from './errors';

const NOT_SETUP = { ok: false, error: 'The online service isn’t set up.', kind: 'config', retryable: false };

// Runs `build(client)` which returns a supabase-js query; reads retry once on network failure.
function read(build, opts) {
  const client = getSupabase();
  if (!client) return Promise.resolve(NOT_SETUP);
  return call(() => build(client), { retryReads: true, ...opts });
}
function write(build, opts) {
  const client = getSupabase();
  if (!client) return Promise.resolve(NOT_SETUP);
  return call(() => build(client), { retryReads: false, ...opts });
}

// The signed-in user's id from the local session (no network call).
async function me(client) {
  const { data } = await client.auth.getSession();
  return data && data.session ? data.session.user.id : null;
}
const needUser = () => ({ data: null, error: { code: '28000', message: 'not_authenticated' } });

// ---------------------------------------------------------------- profiles
const PROFILE_COLS = 'id, handle, display_name, bio, role, avatar_color, avatar_url, preferred_genres, prefs, created_at';

export const fromProfileRow = (r) =>
  r && {
    id: r.id,
    handle: r.handle,
    displayName: r.display_name,
    bio: r.bio,
    role: r.role,
    avatarColor: r.avatar_color,
    avatarUrl: r.avatar_url,
    preferredGenres: r.preferred_genres || [],
    prefs: r.prefs || {},
    joinedAt: r.created_at,
  };

export const toProfileRow = (p) => {
  const row = {};
  if (p.displayName !== undefined) row.display_name = p.displayName;
  if (p.bio !== undefined) row.bio = p.bio;
  if (p.role !== undefined) row.role = p.role;
  if (p.avatarColor !== undefined) row.avatar_color = p.avatarColor;
  if (p.preferredGenres !== undefined) row.preferred_genres = p.preferredGenres;
  if (p.prefs !== undefined) row.prefs = p.prefs;
  return row;
};

export const profiles = {
  async getMine() {
    const r = await read(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('profiles').select(PROFILE_COLS).eq('id', uid).single();
    });
    return r.ok ? { ok: true, data: fromProfileRow(r.data) } : r;
  },
  async updateMine(patch) {
    const row = toProfileRow(patch);
    const r = await write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('profiles').update(row).eq('id', uid).select(PROFILE_COLS).single();
    });
    return r.ok ? { ok: true, data: fromProfileRow(r.data) } : r;
  },
  async getByHandle(handle) {
    const r = await read((c) => c.from('profiles').select(PROFILE_COLS).eq('handle', handle).single());
    return r.ok ? { ok: true, data: fromProfileRow(r.data) } : r;
  },
};

// ---------------------------------------------------------------- genres and tags
export const genres = {
  list: () => read((c) => c.from('genres').select('id, name, sort_order').order('sort_order')),
};
export const tags = {
  search: (prefix, limit = 10) =>
    read((c) => c.from('tags').select('id, name').ilike('name', `${String(prefix).replace(/[%_]/g, '')}%`).order('name').limit(limit)),
};

// ---------------------------------------------------------------- stories
const STORY_COLS =
  'id, author_id, title, synopsis, cover_url, cover_color, genre_id, story_type, is_mature, status, published_at, created_at, updated_at, story_tags(tags(name))';

export const fromStoryRow = (r) =>
  r && {
    id: r.id,
    authorId: r.author_id,
    title: r.title,
    synopsis: r.synopsis,
    coverUrl: r.cover_url,
    coverColor: r.cover_color,
    genreId: r.genre_id,
    type: r.story_type,
    mature: r.is_mature,
    status: r.status,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    tags: (r.story_tags || []).map((t) => t.tags && t.tags.name).filter(Boolean),
  };

const toStoryRow = (s) => {
  const row = {};
  if (s.title !== undefined) row.title = s.title;
  if (s.synopsis !== undefined) row.synopsis = s.synopsis;
  if (s.coverUrl !== undefined) row.cover_url = s.coverUrl;
  if (s.coverColor !== undefined) row.cover_color = s.coverColor;
  if (s.genreId !== undefined) row.genre_id = s.genreId;
  if (s.type !== undefined) row.story_type = s.type;
  if (s.mature !== undefined) row.is_mature = s.mature;
  return row;
};
const mapStory = (r) => (r.ok ? { ok: true, data: fromStoryRow(r.data) } : r);
const mapStories = (r) => (r.ok ? { ok: true, data: (r.data || []).map(fromStoryRow) } : r);

export const stories = {
  // Published stories (RLS hides everyone's drafts from this query automatically).
  async listPublished({ genreId, authorId, limit = 20, offset = 0 } = {}) {
    return mapStories(
      await read((c) => {
        let q = c.from('stories').select(STORY_COLS).eq('status', 'published');
        if (genreId) q = q.eq('genre_id', genreId);
        if (authorId) q = q.eq('author_id', authorId);
        return q.order('published_at', { ascending: false }).range(offset, offset + Math.min(limit, 50) - 1);
      })
    );
  },
  async get(id) {
    return mapStory(await read((c) => c.from('stories').select(STORY_COLS).eq('id', id).single()));
  },
  async listMine() {
    return mapStories(
      await read(async (c) => {
        const uid = await me(c);
        if (!uid) return needUser();
        return c.from('stories').select(STORY_COLS).eq('author_id', uid).order('updated_at', { ascending: false });
      })
    );
  },
  async createDraft(story) {
    return mapStory(
      await write(async (c) => {
        const uid = await me(c);
        if (!uid) return needUser();
        // author_id is set from the session, and the database rejects any value that isn't you.
        return c.from('stories').insert({ ...toStoryRow(story), author_id: uid }).select(STORY_COLS).single();
      })
    );
  },
  async update(id, patch) {
    return mapStory(await write((c) => c.from('stories').update(toStoryRow(patch)).eq('id', id).select(STORY_COLS).single()));
  },
  // Publishing goes through a database function that checks ownership and content rules.
  async publish(id) {
    return write((c) => c.rpc('publish_story', { p_story_id: id }));
  },
  async unpublish(id) {
    return write((c) => c.rpc('unpublish_story', { p_story_id: id }));
  },
  async remove(id) {
    return write((c) => c.from('stories').delete().eq('id', id));
  },
  async setTags(id, list) {
    return write((c) => c.rpc('set_story_tags', { p_story_id: id, p_tags: list }));
  },
};

// ---------------------------------------------------------------- chapters
export const chapters = {
  list: (storyId) =>
    read((c) => c.from('chapters').select('id, story_id, position, title, body, status, updated_at').eq('story_id', storyId).order('position')),
  add: (storyId, { position, title, body }) =>
    write((c) => c.from('chapters').insert({ story_id: storyId, position, title, body }).select().single()),
  update: (id, patch) => {
    const row = {};
    if (patch.position !== undefined) row.position = patch.position;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.body !== undefined) row.body = patch.body;
    return write((c) => c.from('chapters').update(row).eq('id', id).select().single());
  },
  remove: (id) => write((c) => c.from('chapters').delete().eq('id', id)),
  publish: (id) => write((c) => c.rpc('publish_chapter', { p_chapter_id: id })),
};

// ---------------------------------------------------------------- follows
export const follows = {
  follow: (followeeId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('follows').insert({ follower_id: uid, followee_id: followeeId });
    }),
  unfollow: (followeeId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('follows').delete().eq('follower_id', uid).eq('followee_id', followeeId);
    }),
  following: (userId) => read((c) => c.from('follows').select('followee_id, created_at').eq('follower_id', userId)),
  followers: (userId) => read((c) => c.from('follows').select('follower_id, created_at').eq('followee_id', userId)),
};

// ---------------------------------------------------------------- bookmarks
export const bookmarks = {
  list: () => read((c) => c.from('bookmarks').select('story_id, created_at').order('created_at', { ascending: false })),
  add: (storyId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('bookmarks').insert({ user_id: uid, story_id: storyId });
    }),
  remove: (storyId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('bookmarks').delete().eq('user_id', uid).eq('story_id', storyId);
    }),
};

// ---------------------------------------------------------------- reading progress
export const progress = {
  list: () => read((c) => c.from('reading_progress').select('story_id, chapter_id, position, updated_at').order('updated_at', { ascending: false })),
  get: (storyId) => read((c) => c.from('reading_progress').select('story_id, chapter_id, position, updated_at').eq('story_id', storyId).maybeSingle()),
  // One row per (user, story); saving again replaces the previous position.
  save: (storyId, chapterId, position) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      const pos = Math.min(1, Math.max(0, Number(position) || 0));
      return c.from('reading_progress').upsert({ user_id: uid, story_id: storyId, chapter_id: chapterId || null, position: pos }, { onConflict: 'user_id,story_id' });
    }),
  clear: (storyId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('reading_progress').delete().eq('user_id', uid).eq('story_id', storyId);
    }),
};

// ---------------------------------------------------------------- likes
export const likes = {
  like: (storyId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('story_likes').insert({ user_id: uid, story_id: storyId });
    }),
  unlike: (storyId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('story_likes').delete().eq('user_id', uid).eq('story_id', storyId);
    }),
  stats: (storyId) =>
    read((c) => c.from('story_stats').select('story_id, like_count, bookmark_count, review_count, avg_rating, comment_count').eq('story_id', storyId).maybeSingle()),
};

// ---------------------------------------------------------------- reviews
export const reviews = {
  list: (storyId, { limit = 20, offset = 0 } = {}) =>
    read((c) => c.from('reviews').select('id, user_id, rating, body, created_at, profiles(handle, display_name, avatar_color)').eq('story_id', storyId).order('created_at', { ascending: false }).range(offset, offset + limit - 1)),
  // Creates your review or replaces the one you already wrote.
  saveMine: (storyId, rating, body = '') =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('reviews').upsert({ story_id: storyId, user_id: uid, rating, body }, { onConflict: 'story_id,user_id' }).select().single();
    }),
  removeMine: (storyId) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('reviews').delete().eq('story_id', storyId).eq('user_id', uid);
    }),
};

// ---------------------------------------------------------------- comments
export const comments = {
  list: (storyId, { chapterId, limit = 50, offset = 0 } = {}) =>
    read((c) => {
      let q = c.from('comments').select('id, user_id, parent_id, chapter_id, body, created_at, profiles(handle, display_name, avatar_color)').eq('story_id', storyId);
      if (chapterId) q = q.eq('chapter_id', chapterId);
      return q.order('created_at').range(offset, offset + limit - 1);
    }),
  add: (storyId, body, { chapterId = null, parentId = null } = {}) =>
    write(async (c) => {
      const uid = await me(c);
      if (!uid) return needUser();
      return c.from('comments').insert({ story_id: storyId, user_id: uid, chapter_id: chapterId, parent_id: parentId, body }).select().single();
    }),
  edit: (id, body) => write((c) => c.from('comments').update({ body }).eq('id', id).select().single()),
  remove: (id) => write((c) => c.from('comments').delete().eq('id', id)),
};

export const backendRepos = { profiles, genres, tags, stories, chapters, follows, bookmarks, progress, likes, reviews, comments };
