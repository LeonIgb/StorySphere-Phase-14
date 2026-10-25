// Pure community logic (Phase 8): validation, reactions, ratings, comment threads, reports,
// notification building and the per-account document. No React and no I/O, so it is unit tested.
//
// NOTHING here is moderation. A report is saved on this device only. See PROTOTYPE_REPORT_NOTICE.

import { hashString, toggleId } from './account';
import { PEOPLE_BY_ID, baseShares, seedFor } from '../data/community';
import { formatPrice } from './pricing';

export const LIMITS = {
  commentMax: 500,
  reviewMin: 10,
  reviewMax: 1000,
  reportDetailsMax: 300,
  announceNoteMax: 140,
  cooldownMs: 2500, // minimum gap between two posts
  duplicateWindowMs: 60 * 1000, // the same text twice within this window is refused
  actionLockMs: 400, // taps on the same toggle inside this window are ignored
};

export const REACTIONS = [
  { key: 'like', label: 'Like', icon: 'thumbs-up', weight: 55 },
  { key: 'love', label: 'Love', icon: 'heart', weight: 25 },
  { key: 'wow', label: 'Wow', icon: 'sparkles', weight: 10 },
  { key: 'moved', label: 'Moved', icon: 'water', weight: 6 },
  { key: 'laugh', label: 'Funny', icon: 'happy', weight: 4 },
];
export const REACTION_KEYS = REACTIONS.map((r) => r.key);

export const PROTOTYPE_REPORT_NOTICE =
  'Prototype only. Your report is saved on this device and no moderator ever sees it. A real service needs a moderation queue, trained reviewers, a clear policy, appeals, and a safety process for urgent cases.';

export const REPORT_REASONS = {
  story: ['Spam or misleading', 'Hateful or abusive content', 'Sexual or graphic content', 'Violence or dangerous content', 'Copyright or stolen work', 'Something else'],
  comment: ['Spam', 'Harassment or bullying', 'Hateful content', 'Spoiler without warning', 'Something else'],
  review: ['Spam or fake review', 'Harassment or bullying', 'Hateful content', 'Not about this story', 'Something else'],
  user: ['Spam or fake account', 'Impersonation', 'Harassment or bullying', 'Something else'],
  message: ['Spam or scam', 'Harassment or bullying', 'Hateful content', 'Unwanted sexual content', 'Something else'],
};
export const REPORT_TYPES = Object.keys(REPORT_REASONS);

// ------------------------------------------------------------------ validation

const clean = (v) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
export const cleanText = clean;

export function validateComment(text) {
  const t = clean(text);
  if (!t) return 'Write something before posting.';
  if (t.length > LIMITS.commentMax) return `Keep comments under ${LIMITS.commentMax} characters.`;
  return '';
}

// Returns { field: message }.
export function validateReview({ rating, text }) {
  const errors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = 'Choose a star rating from 1 to 5.';
  const t = clean(text);
  if (t.length < LIMITS.reviewMin) errors.text = `Write at least ${LIMITS.reviewMin} characters.`;
  else if (t.length > LIMITS.reviewMax) errors.text = `Keep reviews under ${LIMITS.reviewMax} characters.`;
  return errors;
}

export function validateReport({ type, reason, details }) {
  const errors = {};
  if (!REPORT_TYPES.includes(type)) errors.type = 'Unknown report type.';
  else if (!REPORT_REASONS[type].includes(reason)) errors.reason = 'Choose a reason.';
  if (clean(details).length > LIMITS.reportDetailsMax) errors.details = `Keep details under ${LIMITS.reportDetailsMax} characters.`;
  return errors;
}

export function validateAnnouncement(note) {
  return clean(note).length > LIMITS.announceNoteMax ? `Keep the note under ${LIMITS.announceNoteMax} characters.` : '';
}

// ------------------------------------------------------------------ the saved document

export const emptyDoc = () => ({
  version: 1,
  reactions: {},
  ratings: {},
  reviews: {},
  comments: [],
  commentLikes: [],
  helpful: [],
  hidden: [],
  reports: [],
  readNotifs: [],
  dismissedNotifs: [],
  announcements: [],
  shares: {},
});

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const ids = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string' && x))] : []);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

export function sanitizeDoc(raw) {
  const r = isObj(raw) ? raw : {};
  const out = emptyDoc();
  if (isObj(r.reactions)) Object.entries(r.reactions).forEach(([k, v]) => REACTION_KEYS.includes(v) && (out.reactions[k] = v));
  if (isObj(r.ratings)) Object.entries(r.ratings).forEach(([k, v]) => v && Number.isInteger(v.value) && v.value >= 1 && v.value <= 5 && (out.ratings[k] = { value: v.value, at: num(v.at) }));
  if (isObj(r.reviews)) {
    Object.entries(r.reviews).forEach(([k, v]) => {
      if (v && typeof v.id === 'string' && typeof v.text === 'string' && clean(v.text)) out.reviews[k] = { id: v.id, text: clean(v.text).slice(0, LIMITS.reviewMax), at: num(v.at), editedAt: v.editedAt ? num(v.editedAt) : null };
    });
  }
  out.comments = (Array.isArray(r.comments) ? r.comments : [])
    .filter((c) => c && typeof c.id === 'string' && typeof c.storyId === 'string' && typeof c.text === 'string' && clean(c.text))
    .map((c) => ({
      id: c.id,
      storyId: c.storyId,
      chapter: Number.isInteger(c.chapter) && c.chapter >= 0 ? c.chapter : null,
      parentId: typeof c.parentId === 'string' ? c.parentId : null,
      replyTo: typeof c.replyTo === 'string' && c.replyTo ? c.replyTo : null,
      authorId: typeof c.authorId === 'string' && c.authorId ? c.authorId : 'me',
      text: clean(c.text).slice(0, LIMITS.commentMax),
      at: num(c.at),
      baseLikes: 0,
    }));
  out.commentLikes = ids(r.commentLikes);
  out.helpful = ids(r.helpful);
  out.hidden = ids(r.hidden);
  out.readNotifs = ids(r.readNotifs);
  out.dismissedNotifs = ids(r.dismissedNotifs);
  out.reports = (Array.isArray(r.reports) ? r.reports : [])
    .filter((x) => x && typeof x.id === 'string' && REPORT_TYPES.includes(x.targetType) && typeof x.targetId === 'string')
    .map((x) => ({ id: x.id, targetType: x.targetType, targetId: x.targetId, targetLabel: String(x.targetLabel || ''), reason: String(x.reason || ''), details: clean(x.details).slice(0, LIMITS.reportDetailsMax), at: num(x.at) }));
  out.announcements = (Array.isArray(r.announcements) ? r.announcements : [])
    .filter((a) => a && typeof a.id === 'string' && typeof a.storyId === 'string' && Number.isInteger(a.chapter))
    .map((a) => ({ id: a.id, storyId: a.storyId, chapter: a.chapter, title: String(a.title || ''), note: clean(a.note).slice(0, LIMITS.announceNoteMax), audience: num(a.audience), at: num(a.at) }));
  if (isObj(r.shares)) Object.entries(r.shares).forEach(([k, v]) => Number.isInteger(v) && v > 0 && (out.shares[k] = v));
  return out;
}

// The demo account starts with one comment of its own and a reply from a sample reader, so the
// notification center has real, consistent content to show.
export function demoDoc(now = Date.now()) {
  const d = emptyDoc();
  d.comments = [
    { id: 'cm_demo_1', storyId: 's3', chapter: null, parentId: null, authorId: 'me', text: 'The harbour scene is my favourite. I read it twice.', at: now - 2 * 86400000, baseLikes: 0 },
    { id: 'cm_demo_2', storyId: 's3', chapter: null, parentId: 'cm_demo_1', replyTo: 'me', authorId: 'r2', text: 'Same! The lantern detail gets me every time.', at: now - 36 * 3600000, baseLikes: 0 },
  ];
  // The sample purchase history starts out read, so only fresh activity counts as unread.
  d.readNotifs = ['purchase:tx_demo_1:completed', 'purchase:tx_demo_2:completed', 'purchase:tx_demo_3:failed', 'purchase:tx_demo_4:refunded'];
  return d;
}

// ------------------------------------------------------------------ immutable updates

export function withReaction(doc, storyId, key) {
  const reactions = { ...doc.reactions };
  if (key && REACTION_KEYS.includes(key)) reactions[storyId] = key;
  else delete reactions[storyId];
  return { ...doc, reactions };
}

export function withRating(doc, storyId, value, now = Date.now()) {
  const ratings = { ...doc.ratings };
  if (Number.isInteger(value) && value >= 1 && value <= 5) ratings[storyId] = { value, at: now };
  else delete ratings[storyId];
  return { ...doc, ratings };
}

export function withReview(doc, storyId, id, text, now = Date.now()) {
  const prev = doc.reviews[storyId];
  return { ...doc, reviews: { ...doc.reviews, [storyId]: { id: prev ? prev.id : id, text: clean(text), at: prev ? prev.at : now, editedAt: prev ? now : null } } };
}

export function withoutReview(doc, storyId) {
  const reviews = { ...doc.reviews };
  const gone = reviews[storyId];
  delete reviews[storyId];
  return { ...doc, reviews, helpful: gone ? doc.helpful.filter((x) => x !== gone.id) : doc.helpful };
}

export const withComment = (doc, comment) => ({ ...doc, comments: [...doc.comments, comment] });

// Deleting a comment also deletes the replies under it.
export function withoutComment(doc, id) {
  const drop = new Set([id, ...doc.comments.filter((c) => c.parentId === id).map((c) => c.id)]);
  return { ...doc, comments: doc.comments.filter((c) => !drop.has(c.id)), commentLikes: doc.commentLikes.filter((x) => !drop.has(x)), hidden: doc.hidden.filter((x) => !drop.has(x)) };
}

export const withToggledIn = (doc, field, id) => ({ ...doc, [field]: toggleId(doc[field], id) });

// ------------------------------------------------------------------ reactions and ratings

// Splits the baseline likes across the reaction types (largest remainder), deterministically.
export function reactionBreakdown(storyId, total) {
  const base = Math.max(0, Math.round(total || 0));
  const seed = hashString(storyId) % 7;
  const weights = REACTIONS.map((r, i) => r.weight + (i === 0 ? 0 : (seed + i) % 3));
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((w) => (w / sum) * base);
  const counts = exact.map(Math.floor);
  let left = base - counts.reduce((a, b) => a + b, 0);
  exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (left > 0) {
        counts[i] += 1;
        left -= 1;
      }
    });
  return Object.fromEntries(REACTIONS.map((r, i) => [r.key, counts[i]]));
}

// Reaction numbers for one story: the baseline plus this account's reaction.
export function reactionStats(story, mine) {
  const breakdown = reactionBreakdown(story.id, story.likes || 0);
  if (mine) breakdown[mine] = (breakdown[mine] || 0) + 1;
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { total, breakdown, mine: mine || null };
}

// Rating shown for a story: the baseline average plus this account's own star rating.
export function ratingSummary(story, mine) {
  const baseCount = Math.max(0, story.ratingCount || 0);
  const baseAvg = baseCount > 0 ? Number(story.rating) || 0 : 0;
  const count = baseCount + (mine ? 1 : 0);
  const average = count === 0 ? 0 : (baseAvg * baseCount + (mine || 0)) / count;
  const dist = distribution(baseAvg, baseCount);
  if (mine) dist[mine] += 1;
  return { average, count, distribution: dist, mine: mine || 0 };
}

// { 1..5: count } that adds up to `count` and is centred on `average`.
export function distribution(average, count) {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!count) return out;
  const w = [1, 2, 3, 4, 5].map((k) => Math.exp(-((k - Math.min(4.9, average)) ** 2) / (2 * 0.65 ** 2)));
  const sum = w.reduce((a, b) => a + b, 0);
  const exact = w.map((x) => (x / sum) * count);
  const floor = exact.map(Math.floor);
  let left = count - floor.reduce((a, b) => a + b, 0);
  exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (left > 0) {
        floor[i] += 1;
        left -= 1;
      }
    });
  floor.forEach((v, i) => (out[i + 1] = v));
  return out;
}

// What a card or page shows for a story once this account's reaction and rating are applied.
export function storyMetrics(story, doc) {
  const reaction = doc.reactions[story.id] || null;
  const mine = doc.ratings[story.id] ? doc.ratings[story.id].value : 0;
  const r = ratingSummary(story, mine);
  return { likes: reactionStats(story, reaction).total, rating: r.average, ratingCount: r.count };
}

// ------------------------------------------------------------------ people and reviews

export const authorOf = (authorId, me) => (authorId === 'me' ? { id: 'me', name: me && me.name ? me.name : 'You', color: me && me.color ? me.color : '#8B6CF0', isMe: true } : { ...(PEOPLE_BY_ID[authorId] || { id: authorId, name: 'Reader', color: '#5B52B8' }), isMe: false });

// All reviews for a story: yours first, then the sample reviews. `sort`: 'helpful' | 'newest' | 'highest' | 'lowest'.
export function buildReviews(story, doc, sort = 'helpful') {
  const mine = doc.reviews[story.id];
  const myRating = doc.ratings[story.id] ? doc.ratings[story.id].value : 0;
  const list = seedFor(story).reviews.map((r) => ({ ...r, helpful: r.baseHelpful + (doc.helpful.includes(r.id) ? 1 : 0), markedHelpful: doc.helpful.includes(r.id), isMine: false }));
  const compare = {
    helpful: (a, b) => b.helpful - a.helpful || b.at - a.at,
    newest: (a, b) => b.at - a.at,
    highest: (a, b) => b.rating - a.rating || b.at - a.at,
    lowest: (a, b) => a.rating - b.rating || b.at - a.at,
  }[sort] || ((a, b) => b.at - a.at);
  list.sort(compare);
  if (mine) list.unshift({ id: mine.id, storyId: story.id, authorId: 'me', rating: myRating, text: mine.text, at: mine.at, editedAt: mine.editedAt, helpful: 0, markedHelpful: false, isMine: true, seed: false });
  return list;
}

// ------------------------------------------------------------------ comments

// Every comment visible for a story (sample + yours), newest or most-liked first at the top level.
export function allComments(story, doc) {
  return [...seedFor(story).comments, ...doc.comments.filter((c) => c.storyId === story.id)].map((c) => ({
    ...c,
    likes: (c.baseLikes || 0) + (doc.commentLikes.includes(c.id) ? 1 : 0),
    liked: doc.commentLikes.includes(c.id),
  }));
}

// scope: null = story-level discussion, 'all' = everything, number = one chapter.
export function buildThreads(story, doc, scope = 'all', sort = 'top') {
  const all = allComments(story, doc);
  const tops = all.filter((c) => !c.parentId && (scope === 'all' || (scope === null ? c.chapter === null : c.chapter === scope)));
  const byTop = (a, b) => (sort === 'newest' ? b.at - a.at : b.likes - a.likes || b.at - a.at);
  return tops.sort(byTop).map((top) => ({ comment: top, replies: all.filter((c) => c.parentId === top.id).sort((a, b) => a.at - b.at) }));
}

export function commentCount(story, doc, scope = 'all') {
  const all = allComments(story, doc);
  if (scope === 'all') return all.length;
  return all.filter((c) => (scope === null ? c.chapter === null : c.chapter === scope)).length;
}

// Replies are one level deep: replying to a reply attaches to the top-level comment.
export function replyTarget(story, doc, parentId) {
  const parent = allComments(story, doc).find((c) => c.id === parentId);
  if (!parent) return null;
  const top = parent.parentId ? allComments(story, doc).find((c) => c.id === parent.parentId) || parent : parent;
  return { top, mentions: parent.id !== top.id ? parent.authorId : null };
}

// Should this post be refused as a duplicate or as too fast? `recent`: [{ text, at }] of your posts.
export function postBlock(text, recent, now = Date.now()) {
  const t = clean(text).toLowerCase();
  const last = recent.reduce((m, r) => Math.max(m, r.at), 0);
  if (last && now - last < LIMITS.cooldownMs) return 'You are posting too quickly. Wait a moment.';
  if (recent.some((r) => clean(r.text).toLowerCase() === t && now - r.at < LIMITS.duplicateWindowMs)) return 'You already posted that.';
  return '';
}

export function timeAgoFrom(at, now = Date.now()) {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d ago`;
  if (d < 60) return `${Math.floor(d / 7)} w ago`;
  return `${Math.floor(d / 30)} mo ago`;
}

// ------------------------------------------------------------------ reports

export const isReported = (doc, targetType, targetId) => doc.reports.some((r) => r.targetType === targetType && r.targetId === targetId);

// Adds a report unless this account already reported the same target. Returns { ok, doc, error }.
export function addReport(doc, { id, targetType, targetId, targetLabel, reason, details, ownerId }, now = Date.now()) {
  const errors = validateReport({ type: targetType, reason, details });
  if (Object.keys(errors).length) return { ok: false, doc, error: errors.reason || errors.details || errors.type };
  if (ownerId === 'me') return { ok: false, doc, error: 'You can’t report your own content.' };
  if (isReported(doc, targetType, targetId)) return { ok: false, doc, error: 'You already reported this.' };
  const report = { id, targetType, targetId, targetLabel: String(targetLabel || ''), reason, details: clean(details), at: now };
  return { ok: true, doc: { ...doc, reports: [report, ...doc.reports], hidden: targetType === 'comment' || targetType === 'review' || targetType === 'message' ? [...new Set([...doc.hidden, targetId])] : doc.hidden }, report };
}

export function withoutReport(doc, reportId) {
  const gone = doc.reports.find((r) => r.id === reportId);
  return { ...doc, reports: doc.reports.filter((r) => r.id !== reportId), hidden: gone ? doc.hidden.filter((x) => x !== gone.targetId) : doc.hidden };
}

// ------------------------------------------------------------------ notifications

const DAY = 86400000;
export const NOTIFICATION_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'message', label: 'Messages' },
  { key: 'reply', label: 'Replies' },
  { key: 'follower', label: 'Followers' },
  { key: 'purchase', label: 'Purchases' },
  { key: 'chapter', label: 'Chapters' },
];

// Where a notification comes from, shown on each one so nothing is mistaken for a live service.
export const ORIGIN_LABEL = {
  sample: 'Sample notification',
  message: 'Local demo message',
  purchase: 'Demo purchase (simulated)',
  mine: 'Simulated announcement',
};

const PURCHASE_TEXT = {
  completed: (t) => ({ title: 'Purchase completed (demo)', body: `“${t.title}” is unlocked on this account for ${formatPrice(t.amountCents, t.currency)}.` }),
  pending: (t) => ({ title: 'Payment pending (demo)', body: `“${t.title}” will unlock when the simulated payment is confirmed.` }),
  failed: (t) => ({ title: 'Payment failed (demo)', body: `“${t.title}” was not unlocked and you were not charged.` }),
  refunded: (t) => ({ title: 'Refund processed (demo)', body: `“${t.title}” was refunded and locked again.` }),
};

// Community activity for one account, newest first. Everything is derived from the same data
// the rest of the app uses (follows, stories, comments), so it always agrees with the UI.
// stories: the catalog. prefs: notification switches. me: { name }.
// conversations: from utils/messaging buildConversations. transactions: this account's demo purchases.
export function buildNotifications({ stories, doc, following = [], followers = [], prefs = {}, conversations = [], transactions = [], now = Date.now() }) {
  const items = [];
  const byId = Object.fromEntries((stories || []).map((s) => [s.id, s]));

  if (prefs.notifyNewChapters !== false) {
    (stories || [])
      .filter((s) => following.includes(s.creatorId) && s.creatorId !== 'me' && (s.daysAgo || 0) <= 45)
      .forEach((s) => {
        const chapters = s.chapterCount || 0;
        const ongoing = s.status === 'Ongoing' && chapters > 0;
        items.push({
          id: `chapter:${s.id}`,
          type: 'chapter',
          at: now - (s.daysAgo || 0) * DAY - 3600000,
          actorId: s.creatorId,
          storyId: s.id,
          chapter: ongoing ? chapters - 1 : null,
          title: `${s.creator ? s.creator.name : 'A storyteller you follow'} ${ongoing ? `posted chapter ${chapters}` : 'published a story'}`,
          body: ongoing ? `“${s.title}” has a new chapter.` : `“${s.title}” is out now.`,
          actionLabel: ongoing ? 'Read chapter' : 'View story',
          origin: 'sample',
        });
      });
  }

  const mineIds = new Set(doc.comments.filter((c) => c.authorId === 'me').map((c) => c.id));
  if (prefs.notifyComments !== false) doc.comments
    .filter((c) => c.authorId !== 'me' && c.parentId && mineIds.has(c.parentId))
    .forEach((c) => {
      const story = byId[c.storyId];
      items.push({
        id: `reply:${c.id}`,
        type: 'reply',
        at: c.at,
        actorId: c.authorId,
        storyId: c.storyId,
        chapter: c.chapter,
        title: `${authorOf(c.authorId).name} replied to your comment`,
        body: c.text,
        subtitle: story ? story.title : '',
        actionLabel: 'View discussion',
        origin: 'sample',
      });
    });

  if (prefs.notifyFollowers !== false) {
    followers.slice(0, 4).forEach((id, i) => {
      if (!PEOPLE_BY_ID[id]) return;
      items.push({ id: `follower:${id}`, type: 'follower', at: now - ((hashString(id) % 12) + 1 + i) * DAY, actorId: id, title: `${PEOPLE_BY_ID[id].name} started following you`, body: PEOPLE_BY_ID[id].handle, actionLabel: 'View profile', origin: 'sample' });
    });
  }

  if (prefs.notifyNews) {
    items.push({ id: 'news:community', type: 'news', at: now - 5 * DAY, title: 'StorySphere news (sample)', body: 'Community features are in preview. Reactions, reviews and comments are saved on this device only.', actionLabel: '', origin: 'sample' });
  }

  if (prefs.notifyMessages !== false) {
    conversations
      .filter((c) => c.state === 'inbox' && c.lastIncoming)
      .forEach((c) => {
        items.push({
          id: `message:${c.id}:${c.lastIncoming.id}`,
          type: 'message',
          at: c.lastIncoming.at,
          actorId: c.personId,
          personId: c.personId,
          title: `${c.person.name} sent you ${c.unread > 1 ? `${c.unread} messages` : 'a message'}`,
          body: c.lastIncoming.text || (c.lastIncoming.attachment ? 'Sent an attachment' : ''),
          actionLabel: 'Open chat',
          origin: 'message',
          forceRead: c.unread === 0,
        });
      });
  }

  if (prefs.notifyPurchases !== false) {
    (transactions || [])
      .filter((t) => now - (t.updatedAt || t.createdAt || 0) <= 45 * DAY && PURCHASE_TEXT[t.status])
      .forEach((t) => {
        const text = PURCHASE_TEXT[t.status](t);
        items.push({ id: `purchase:${t.id}:${t.status}`, type: 'purchase', at: t.updatedAt || t.createdAt || now, txId: t.id, storyId: t.storyId, title: text.title, body: text.body, actionLabel: 'View receipt', origin: 'purchase' });
      });
  }

  doc.announcements.forEach((a) => {
    items.push({ id: `sent:${a.id}`, type: 'sent', at: a.at, storyId: a.storyId, chapter: a.chapter, title: `You announced “${a.title}”`, body: `${a.audience.toLocaleString('en-US')} follower${a.audience === 1 ? '' : 's'} would be notified. This is a simulation: nobody received it.`, actionLabel: 'View story', origin: 'mine' });
  });

  return items
    .filter((n) => !doc.dismissedNotifs.includes(n.id))
    .map((n) => ({ ...n, label: ORIGIN_LABEL[n.origin] || '', read: n.type === 'sent' || Boolean(n.forceRead) || doc.readNotifs.includes(n.id) }))
    .sort((a, b) => b.at - a.at);
}

export const unreadCount = (list) => list.filter((n) => !n.read).length;

export function filterNotifications(list, tab) {
  if (tab === 'unread') return list.filter((n) => !n.read);
  if (tab === 'all') return list;
  return list.filter((n) => n.type === tab);
}

export const sharesFor = (story, doc) => baseShares(story) + (doc.shares[story.id] || 0);
