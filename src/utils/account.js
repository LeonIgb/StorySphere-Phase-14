// Pure account and profile logic (Phase 5): validation, profile and preference shapes, the
// follow graph helpers, privacy rules and the reading-history view. No React and no I/O.
//
// NOTHING here is real security. weakHash() exists only so the local demo sign-in does not
// keep passwords as readable text; it is not a password-hashing algorithm.

import { WORK_GENRES } from '../data/creatorOptions';
import { newId } from './creator';
import { toDate } from './schedule';

export const ROLES = ['reader', 'storyteller'];
export const AVATAR_COLORS = ['#8B6CF0', '#E85F4F', '#5B52B8', '#3FA37A', '#312B78', '#B5476B', '#1E6F8C', '#E3A63A'];

export const LIMITS_ACCOUNT = { nameMin: 2, nameMax: 40, bioMax: 240, passwordMin: 8, maxGenres: 7 };

// ------------------------------------------------------------------ validation

export const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export function validateEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return 'Enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'That doesn’t look like an email address.';
  return '';
}

export function validatePassword(password) {
  const p = String(password || '');
  if (!p) return 'Enter a password.';
  if (p.length < LIMITS_ACCOUNT.passwordMin) return `Use at least ${LIMITS_ACCOUNT.passwordMin} characters.`;
  return '';
}

export function validateDisplayName(name) {
  const n = String(name || '').trim();
  if (n.length < LIMITS_ACCOUNT.nameMin) return `Enter a display name (at least ${LIMITS_ACCOUNT.nameMin} characters).`;
  if (n.length > LIMITS_ACCOUNT.nameMax) return `Keep your display name under ${LIMITS_ACCOUNT.nameMax} characters.`;
  return '';
}

export function validateBio(bio) {
  return String(bio || '').length > LIMITS_ACCOUNT.bioMax ? `Keep your bio under ${LIMITS_ACCOUNT.bioMax} characters.` : '';
}

// Returns { field: message } for every problem (empty object when the form is valid).
export function validateRegistration({ displayName, email, password, confirm }) {
  const errors = {};
  const n = validateDisplayName(displayName);
  const e = validateEmail(email);
  const p = validatePassword(password);
  if (n) errors.displayName = n;
  if (e) errors.email = e;
  if (p) errors.password = p;
  if (!p && password !== confirm) errors.confirm = 'The passwords don’t match.';
  return errors;
}

export function validateSignIn({ email, password }) {
  const errors = {};
  const e = validateEmail(email);
  if (e) errors.email = e;
  if (!String(password || '')) errors.password = 'Enter your password.';
  return errors;
}

// ------------------------------------------------------------------ demo-only hashing

export function hashString(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// NOT a secure hash. Two rounds of a 32-bit string hash with a salt: it only avoids storing the
// password as plain text in the local demo. A real backend replaces all of this.
export function weakHash(salt, password) {
  const a = hashString(`${salt}:${password}`);
  const b = hashString(`${a}:${password}:${salt}`);
  return `${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}

export const newSalt = () => newId('s');

// ------------------------------------------------------------------ profiles

export function makeHandle(displayName, taken = []) {
  const base =
    String(displayName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 20) || 'reader';
  const used = new Set(taken.map((h) => String(h).toLowerCase()));
  let handle = `@${base}`;
  let n = 1;
  while (used.has(handle)) {
    n += 1;
    handle = `@${base}${n}`;
  }
  return handle;
}

export function defaultProfile({ displayName, role = 'reader', handle, now = new Date(), colorSeed } = {}) {
  const name = String(displayName || '').trim() || 'New reader';
  return {
    displayName: name,
    handle: handle || makeHandle(name),
    bio: '',
    avatarColor: AVATAR_COLORS[hashString(colorSeed || name) % AVATAR_COLORS.length],
    avatarUri: null,
    preferredGenres: [],
    role: ROLES.includes(role) ? role : 'reader',
    joinedAt: now.toISOString(),
  };
}

export function sanitizeProfile(raw, fallback) {
  const base = fallback || defaultProfile();
  const r = raw && typeof raw === 'object' ? raw : {};
  const str = (v, d) => (typeof v === 'string' ? v : d);
  const genres = (Array.isArray(r.preferredGenres) ? r.preferredGenres : base.preferredGenres).filter((g) =>
    WORK_GENRES.includes(g)
  );
  return {
    displayName: str(r.displayName, base.displayName).trim() || base.displayName,
    handle: /^@[a-z0-9.]+$/.test(str(r.handle, '')) ? r.handle : base.handle,
    bio: str(r.bio, base.bio).slice(0, LIMITS_ACCOUNT.bioMax),
    avatarColor: AVATAR_COLORS.includes(r.avatarColor) ? r.avatarColor : base.avatarColor,
    avatarUri: typeof r.avatarUri === 'string' && r.avatarUri ? r.avatarUri : null,
    preferredGenres: [...new Set(genres)].slice(0, LIMITS_ACCOUNT.maxGenres),
    role: ROLES.includes(r.role) ? r.role : base.role,
    joinedAt: toDate(r.joinedAt) ? new Date(r.joinedAt).toISOString() : base.joinedAt,
  };
}

// Validates and applies a profile edit. Returns { ok, profile, errors }.
export function applyProfileEdit(profile, patch) {
  const next = { ...profile, ...patch };
  const errors = {};
  const n = validateDisplayName(next.displayName);
  const b = validateBio(next.bio);
  if (n) errors.displayName = n;
  if (b) errors.bio = b;
  if (Object.keys(errors).length) return { ok: false, profile, errors };
  return {
    ok: true,
    errors: {},
    profile: sanitizeProfile({ ...next, displayName: next.displayName.trim() }, profile),
  };
}

// ------------------------------------------------------------------ preferences and privacy

export const MESSAGES_FROM = ['everyone', 'following', 'nobody'];

export const DEFAULT_PREFS = {
  notifyNewChapters: true,
  notifyFollowers: true,
  notifyNews: false,
  notifyMessages: true,
  notifyComments: true,
  notifyPurchases: true,
  // Who may message you: 'everyone' | 'following' (people you follow) | 'nobody' (you start every chat).
  messagesFrom: 'following',
  profilePublic: true,
  showFollowLists: true,
  showReadingActivity: false,
  saveHistory: true,
  // Personalization (Phase 6): used for "Picked for you" on Home.
  preferredFormats: [],
  freeOnly: false,
  hideFinished: true,
};

export const FORMATS = ['Written', 'Image', 'Video', 'Mixed'];

export function sanitizePrefs(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const out = { ...DEFAULT_PREFS };
  Object.keys(DEFAULT_PREFS).forEach((key) => {
    if (typeof DEFAULT_PREFS[key] === 'boolean' && typeof r[key] === 'boolean') out[key] = r[key];
  });
  out.messagesFrom = MESSAGES_FROM.includes(r.messagesFrom) ? r.messagesFrom : DEFAULT_PREFS.messagesFrom;
  out.preferredFormats = [...new Set(Array.isArray(r.preferredFormats) ? r.preferredFormats.filter((f) => FORMATS.includes(f)) : [])];
  return out;
}

// What someone else sees when they open this profile.
export function publicProfileView(prefs) {
  const p = sanitizePrefs(prefs);
  return {
    visible: p.profilePublic,
    showBio: p.profilePublic,
    showLists: p.profilePublic && p.showFollowLists,
    showActivity: p.profilePublic && p.showReadingActivity,
  };
}

// ------------------------------------------------------------------ account document

export const toggleId = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

const idList = (v, fallback = []) =>
  Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && x))] : fallback;

// The saved document for one account: { profile, prefs, social: { following, followers } }.
export function sanitizeAccountDoc(raw, fallback) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const social = r.social && typeof r.social === 'object' ? r.social : {};
  return {
    profile: sanitizeProfile(r.profile, fallback.profile),
    prefs: sanitizePrefs(r.prefs),
    social: {
      following: idList(social.following, fallback.social.following),
      followers: idList(social.followers, fallback.social.followers),
    },
  };
}

export function newAccountDoc({ displayName, role, handle, now = new Date(), userId }) {
  return {
    profile: defaultProfile({ displayName, role, handle, now, colorSeed: userId }),
    prefs: { ...DEFAULT_PREFS },
    social: { following: [], followers: [] },
  };
}

// Follower count to display for someone in the sample directory: their base number plus you,
// when you follow them. Every screen uses this one rule, so the numbers always agree.
export function followersShown(person, followingNow) {
  return Math.max(0, (person && person.followers) || 0) + (followingNow ? 1 : 0);
}

// A stable pseudo-random sample of `pool`, used for the follower and following lists of people
// who are not the signed-in user (there is no real social graph yet).
export function sampleList(pool, seedKey, min = 3, max = 6) {
  if (pool.length === 0) return [];
  const seed = hashString(seedKey);
  const size = Math.min(pool.length, min + (seed % (max - min + 1)));
  const start = seed % pool.length;
  const out = [];
  for (let i = 0; i < size; i += 1) out.push(pool[(start + i * 3) % pool.length]);
  return [...new Set(out)];
}

// ------------------------------------------------------------------ history

const KIND_LABEL = { chapters: 'Reading', gallery: 'Viewing', video: 'Watching' };

// Reading and viewing history, newest first, from the progress map and the stories it refers to.
// Stories that no longer exist (an unpublished story, say) are left out.
export function historyEntries(progress, storiesById, now = Date.now()) {
  return Object.entries(progress || {})
    .filter(([id]) => storiesById[id])
    .map(([id, p]) => {
      const story = storiesById[id];
      const unit = p.kind === 'chapters' ? 'Chapter' : p.kind === 'gallery' ? 'Panel' : '';
      const where = unit ? `${unit} ${(p.position || 0) + 1} of ${p.total || 1}` : '';
      const verb = KIND_LABEL[p.kind] || 'Reading';
      const status = p.finished ? 'Finished' : where ? `${verb} · ${where}` : verb;
      return { id, story, progress: p, updatedAt: p.updatedAt || 0, finished: Boolean(p.finished), status, now };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
