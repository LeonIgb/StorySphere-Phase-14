// Pure messaging rules (Phase 9): privacy and block rules, validation, conversation summaries,
// timestamps, attachments and the saved document. No React and no I/O, so it is unit tested.
//
// PROTOTYPE: these rules run on the device. In production the SERVER applies every one of them
// (recipient privacy, blocks, rate limits, attachment checks); the app only displays the result.

import { DEMO_CONVERSATIONS, DM_POLICY, PEOPLE_BY_ID, REPLY_LINES } from '../data/messaging';
import { MESSAGES_FROM, hashString } from './account';

export const MESSAGE_LIMITS = {
  textMax: 1000,
  imageMaxBytes: 5 * 1024 * 1024,
  sendCooldownMs: 600,
  perConversationMax: 300,
};

export const MESSAGE_PRIVACY = [
  { key: 'everyone', label: 'Everyone', hint: 'Anyone can message you. New people appear in Inbox.' },
  { key: 'following', label: 'People I follow', hint: 'People you don’t follow land in Requests. You can reply to accept.' },
  { key: 'nobody', label: 'No one', hint: 'You start every chat. New incoming messages are not delivered.' },
];
export { MESSAGES_FROM };

export const LOCAL_MESSAGE_NOTICE =
  'Local demo chat. Messages are saved on this device only. They are not delivered to real people, and replies from sample people are scripted.';

// What can be attached. Only images and a shared story are supported.
export const ATTACHMENT_OPTIONS = [
  { kind: 'image', label: 'Photo', icon: 'image-outline', supported: true, hint: 'From your library. JPG, PNG, GIF or WebP, up to 5 MB.' },
  { kind: 'story', label: 'Story', icon: 'book-outline', supported: true, hint: 'Share a story from the catalog.' },
  { kind: 'video', label: 'Video', icon: 'videocam-outline', supported: false, hint: 'Not supported yet. Video needs server storage and scanning.' },
  { kind: 'audio', label: 'Voice message', icon: 'mic-outline', supported: false, hint: 'Not supported yet.' },
  { kind: 'file', label: 'File', icon: 'document-outline', supported: false, hint: 'Not supported yet. Files need virus scanning on a server.' },
];

export const convIdFor = (personId) => `dm:${personId}`;
export const personIdOf = (convId) => String(convId).replace(/^dm:/, '');

const clean = (v) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
export const cleanMessage = clean;

// ------------------------------------------------------------------ attachments

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif)(\?.*)?$/i;

// asset: { uri, name, size?, mimeType? } from the picker. Returns { ok, attachment, error }.
export function validateImageAsset(asset) {
  if (!asset || !asset.uri) return { ok: false, error: 'No image was selected.' };
  const mime = asset.mimeType || '';
  const looksImage = mime ? /^image\//.test(mime) : IMAGE_EXT.test(String(asset.name || asset.uri)) || /^(data:image|blob:|file:|content:|ph:|assets-library:)/.test(asset.uri);
  if (!looksImage) return { ok: false, error: 'Only images can be attached right now.' };
  if (Number.isFinite(asset.size) && asset.size > MESSAGE_LIMITS.imageMaxBytes) return { ok: false, error: 'That image is over 5 MB. Choose a smaller one.' };
  return { ok: true, attachment: { kind: 'image', uri: asset.uri, name: String(asset.name || 'photo').slice(0, 80) } };
}

export const storyAttachment = (story) => (story && story.id ? { kind: 'story', storyId: story.id, title: String(story.title || 'Story'), creatorName: story.creator ? story.creator.name : '' } : null);

function sanitizeAttachment(a) {
  if (!a || typeof a !== 'object') return null;
  if (a.kind === 'image' && typeof a.uri === 'string' && a.uri) return { kind: 'image', uri: a.uri, name: String(a.name || 'photo').slice(0, 80) };
  if (a.kind === 'story' && typeof a.storyId === 'string' && a.storyId) return { kind: 'story', storyId: a.storyId, title: String(a.title || 'Story'), creatorName: String(a.creatorName || '') };
  return null;
}

// Returns an error string, or '' when the message can be sent.
export function validateMessage({ text, attachment }) {
  const t = clean(text);
  if (!t && !attachment) return 'Write a message or attach something first.';
  if (t.length > MESSAGE_LIMITS.textMax) return `Keep messages under ${MESSAGE_LIMITS.textMax} characters.`;
  return '';
}

// ------------------------------------------------------------------ privacy and blocking

// May `personId` start or continue a chat with the signed-in user?
//  - blocked people never can
//  - 'nobody': only conversations you started (you have sent them a message)
//  - 'following': people you follow, or conversations you started (otherwise they land in Requests)
export function incomingAllowed({ messagesFrom }, following, personId, initiated) {
  if (initiated) return true;
  if (messagesFrom === 'everyone') return true;
  if (messagesFrom === 'following') return following.includes(personId);
  return false;
}

// May the signed-in user message this person? Applies the other person's own setting.
export function sendPolicy(personId, following) {
  const person = PEOPLE_BY_ID[personId];
  if (!person) return { ok: false, code: 'unknown', message: 'This person isn’t available.' };
  const policy = DM_POLICY[personId] || 'everyone';
  if (policy === 'nobody') return { ok: false, code: 'policy', message: `${person.name} isn’t accepting new messages.` };
  if (policy === 'followers' && !following.includes(personId)) return { ok: false, code: 'policy', message: `${person.name} only accepts messages from people who follow them. Follow ${person.name.split(' ')[0]} to send a message.` };
  return { ok: true };
}

// ------------------------------------------------------------------ the saved document

export const emptyDoc = () => ({ version: 1, conversations: {}, messages: {}, blocked: [] });
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

export function sanitizeDoc(raw) {
  const r = isObj(raw) ? raw : {};
  const out = emptyDoc();
  const messages = isObj(r.messages) ? r.messages : {};
  Object.entries(messages).forEach(([convId, list]) => {
    if (!/^dm:.+/.test(convId) || !PEOPLE_BY_ID[personIdOf(convId)] || !Array.isArray(list)) return;
    const seen = new Set();
    out.messages[convId] = list
      .filter((m) => m && typeof m.id === 'string' && !seen.has(m.id) && seen.add(m.id) && typeof m.senderId === 'string' && (m.senderId === 'me' || m.senderId === personIdOf(convId)))
      .map((m) => ({
        id: m.id,
        clientId: typeof m.clientId === 'string' ? m.clientId : '',
        senderId: m.senderId,
        text: clean(m.text).slice(0, MESSAGE_LIMITS.textMax),
        attachment: sanitizeAttachment(m.attachment),
        at: num(m.at),
        // A message that was still "sending" when the app closed is shown as failed, never as sent.
        status: m.senderId === 'me' ? (m.status === 'sent' ? 'sent' : 'failed') : 'sent',
        simulated: Boolean(m.simulated),
      }))
      .filter((m) => m.text || m.attachment)
      .sort((a, b) => a.at - b.at)
      .slice(-MESSAGE_LIMITS.perConversationMax);
  });
  const convs = isObj(r.conversations) ? r.conversations : {};
  Object.keys(out.messages).forEach((convId) => {
    const c = convs[convId];
    out.conversations[convId] = { id: convId, personId: personIdOf(convId), createdAt: c ? num(c.createdAt) : 0, lastReadAt: c ? num(c.lastReadAt) : 0 };
  });
  // A conversation with no messages yet (started, nothing sent) is kept so Message > back works.
  Object.keys(convs).forEach((convId) => {
    if (!out.conversations[convId] && /^dm:.+/.test(convId) && PEOPLE_BY_ID[personIdOf(convId)]) out.conversations[convId] = { id: convId, personId: personIdOf(convId), createdAt: num(convs[convId].createdAt), lastReadAt: num(convs[convId].lastReadAt) };
  });
  out.blocked = [...new Set((Array.isArray(r.blocked) ? r.blocked : []).filter((id) => typeof id === 'string' && PEOPLE_BY_ID[id]))];
  return out;
}

export function demoDoc(now = Date.now()) {
  const d = emptyDoc();
  DEMO_CONVERSATIONS.forEach((c) => {
    const id = convIdFor(c.personId);
    const msgs = c.messages.map((m, i) => ({ id: `${id}:seed${i}`, clientId: '', senderId: m.from, text: m.text, attachment: null, at: now - m.agoMin * 60000, status: 'sent', simulated: m.from !== 'me' }));
    d.messages[id] = msgs;
    const readAt = c.readThrough > 0 ? msgs[c.readThrough - 1].at : msgs[0].at - 1;
    d.conversations[id] = { id, personId: c.personId, createdAt: msgs[0].at, lastReadAt: readAt };
  });
  return d;
}

// ------------------------------------------------------------------ immutable updates

export function withMessage(doc, personId, message, now = Date.now()) {
  const id = convIdFor(personId);
  const list = [...(doc.messages[id] || []), message].slice(-MESSAGE_LIMITS.perConversationMax);
  const conv = doc.conversations[id] || { id, personId, createdAt: now, lastReadAt: 0 };
  return { ...doc, messages: { ...doc.messages, [id]: list }, conversations: { ...doc.conversations, [id]: conv } };
}

export function withMessageStatus(doc, convId, messageId, status) {
  const list = doc.messages[convId];
  if (!list) return doc;
  return { ...doc, messages: { ...doc.messages, [convId]: list.map((m) => (m.id === messageId ? { ...m, status } : m)) } };
}

export function withRead(doc, convId, now = Date.now()) {
  const c = doc.conversations[convId];
  if (!c) return doc;
  const last = (doc.messages[convId] || []).reduce((m, x) => Math.max(m, x.at), 0);
  const lastReadAt = Math.max(c.lastReadAt, last, 0);
  if (lastReadAt === c.lastReadAt) return doc;
  return { ...doc, conversations: { ...doc.conversations, [convId]: { ...c, lastReadAt } } };
}

export const withBlocked = (doc, personId, blocked) => ({ ...doc, blocked: blocked ? [...new Set([...doc.blocked, personId])] : doc.blocked.filter((x) => x !== personId) });

export function withoutConversation(doc, convId) {
  const messages = { ...doc.messages };
  const conversations = { ...doc.conversations };
  delete messages[convId];
  delete conversations[convId];
  return { ...doc, messages, conversations };
}

// ------------------------------------------------------------------ summaries

export function previewOf(message) {
  if (!message) return 'No messages yet';
  const mine = message.senderId === 'me';
  let body = clean(message.text).replace(/\n/g, ' ');
  if (message.attachment) {
    const label = message.attachment.kind === 'image' ? 'Photo' : `Story: ${message.attachment.title}`;
    body = body ? `${label} · ${body}` : label;
  }
  return mine ? `You: ${body}` : body;
}

// One entry per conversation, newest activity first. `state`:
//   inbox     normal conversations
//   request   someone you don't follow wrote first (privacy: People I follow)
//   hidden    not delivered because of the privacy setting (No one)
//   blocked   you blocked them
export function buildConversations({ doc, following = [], prefs = {} }) {
  const items = Object.values(doc.conversations).map((c) => {
    const list = doc.messages[c.id] || [];
    const last = list.length ? list[list.length - 1] : null;
    const initiated = list.some((m) => m.senderId === 'me');
    const incoming = list.filter((m) => m.senderId !== 'me');
    const unread = incoming.filter((m) => m.at > c.lastReadAt).length;
    const lastIncoming = incoming.length ? incoming[incoming.length - 1] : null;
    const blocked = doc.blocked.includes(c.personId);
    const allowed = incomingAllowed(prefs, following, c.personId, initiated);
    let state = 'inbox';
    if (blocked) state = 'blocked';
    else if (!allowed) state = (prefs.messagesFrom || 'following') === 'nobody' ? 'hidden' : 'request';
    return { id: c.id, personId: c.personId, person: PEOPLE_BY_ID[c.personId], last, lastIncoming, preview: previewOf(last), at: last ? last.at : c.createdAt, unread, initiated, state, count: list.length };
  });
  return items.sort((a, b) => b.at - a.at);
}

export const inboxOf = (list) => list.filter((c) => c.state === 'inbox' && (c.count > 0 || c.initiated));
export const requestsOf = (list) => list.filter((c) => c.state === 'request' && c.count > 0);
export const unreadIn = (list) => list.reduce((n, c) => n + c.unread, 0);

// ------------------------------------------------------------------ timestamps

const pad = (n) => String(n).padStart(2, '0');
export const formatClock = (at) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const startOfDay = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "14:05", "Yesterday", "Mon", "Oct 12": the short time shown in the conversation list.
export function listTime(at, now = Date.now()) {
  const diff = Math.round((startOfDay(now) - startOfDay(at)) / 86400000);
  if (diff <= 0) return formatClock(at);
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return DAYS[new Date(at).getDay()];
  const d = new Date(at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function dayLabel(at, now = Date.now()) {
  const diff = Math.round((startOfDay(now) - startOfDay(at)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = new Date(at);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// [{ key, label, messages }] in order, for the day separators in a chat.
export function groupByDay(messages, now = Date.now()) {
  const groups = [];
  messages.forEach((m) => {
    const key = startOfDay(m.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.messages.push(m);
    else groups.push({ key, label: dayLabel(m.at, now), messages: [m] });
  });
  return groups;
}

export const STATUS_TEXT = { sending: 'Sending…', sent: 'Saved on this device', failed: 'Not sent' };

// A scripted reply (simulated). Deterministic for the same person and message count.
export const simulatedReply = (personId, count) => REPLY_LINES[hashString(`${personId}:${count}`) % REPLY_LINES.length];
