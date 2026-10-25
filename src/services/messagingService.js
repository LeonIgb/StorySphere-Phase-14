// Messaging service (Phase 9): the swap point for a real-time backend.
//
// =========================================================================================
// PROTOTYPE. Every message here is stored on THIS DEVICE and goes nowhere. "Sending" is a short
// delay, "delivery" does not exist, and replies are scripted by this file. Nothing reaches a real
// person. The UI says so; keep it that way until a backend is connected.
//
// How a real backend replaces this (the context and screens do not change):
//   transport   an authenticated WebSocket (or SSE) per signed-in device for live events, with
//               REST for history/paging. Events: message.created, message.status, typing,
//               conversation.read, block.changed. `subscribe()` below is that event stream.
//   sending     POST /conversations/:id/messages with a client-generated `clientId` so a retry
//               after a dropped connection never creates a duplicate (we already send one).
//   status      'sending' -> 'sent' (server accepted) -> 'delivered' / 'read' (server events).
//               This prototype never reports delivered or read, because nothing is delivered.
//   rules       the SERVER enforces blocks, the recipient's privacy setting, rate limits, size
//               and type checks on attachments, and malware/abuse scanning. The checks in
//               src/utils/messaging.js are display-side copies.
//   attachments upload to object storage via short-lived signed URLs, scan, then send the
//               returned media id; never embed device file paths in a message.
//   security    TLS everywhere, per-device auth tokens, server-side authorization on every
//               conversation, optional end-to-end encryption (a product decision with
//               trade-offs for moderation and reporting), and retention/deletion policies.
//   push        see src/services/pushService.js. Offline recipients get a push through APNs/FCM.
// =========================================================================================

import { messagingKey } from '../data/storageKeys';
import { PEOPLE, PEOPLE_BY_ID, SAMPLE_INCOMING } from '../data/messaging';
import { newId } from '../utils/creator';
import { loadJSON, saveJSON } from '../utils/storage';
import {
  MESSAGE_LIMITS,
  cleanMessage,
  convIdFor,
  demoDoc,
  emptyDoc,
  incomingAllowed,
  sanitizeDoc,
  sendPolicy,
  simulatedReply,
  validateMessage,
  withBlocked,
  withMessage,
  withMessageStatus,
  withRead,
  withoutConversation,
} from '../utils/messaging';

let userId = null;
let doc = emptyDoc();
let listeners = new Set();
let timers = new Set();
let typing = {}; // { convId: true } while a scripted person is "typing"
let activeConv = null;
let outcome = 'success'; // next send: 'success' | 'fail'
let simulatedReplies = true;
let timings = { sendMs: 700, replyMs: 1800, typingMs: 900 };
let lastSendAt = 0;
let version = 0;

const persist = () => (userId ? saveJSON(messagingKey(userId), doc) : Promise.resolve());
const emit = (event) => {
  version += 1;
  listeners.forEach((fn) => fn(event));
};
const later = (fn, ms) => {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
};
const setDoc = (next) => {
  doc = next;
};

export const localMessagingProvider = {
  async attach(user, now = Date.now()) {
    userId = user.id;
    const saved = await loadJSON(messagingKey(userId), null);
    doc = saved ? sanitizeDoc(saved) : user.isDemo ? demoDoc(now) : emptyDoc();
    typing = {};
    activeConv = null;
    outcome = 'success';
    lastSendAt = 0;
    if (!saved) await persist();
    return { ok: true };
  },

  detach() {
    timers.forEach((t) => clearTimeout(t));
    timers = new Set();
    userId = null;
    typing = {};
    activeConv = null;
  },

  // The live event stream. A real backend pushes events over a socket; here the service emits them.
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot: () => doc,
  getVersion: () => version,
  isTyping: (convId) => Boolean(typing[convId]),

  // Which chat is open, so a scripted reply that arrives while you look at it is read at once.
  setActive(convId) {
    activeConv = convId;
    if (convId && doc.conversations[convId]) {
      setDoc(withRead(doc, convId));
      persist();
      emit({ type: 'read', convId });
    }
  },

  // ctx = { following: [ids] }: what the server would know about the signed-in user.
  ensureConversation(personId, ctx) {
    if (!PEOPLE_BY_ID[personId] || personId === 'me') return { ok: false, code: 'unknown', message: 'This person isn’t available.' };
    if (doc.blocked.includes(personId)) return { ok: false, code: 'blocked', message: 'You blocked this person. Unblock them in Settings to message them.' };
    const convId = convIdFor(personId);
    if (doc.conversations[convId]) return { ok: true, convId };
    const policy = sendPolicy(personId, ctx.following || []);
    if (!policy.ok) return policy;
    setDoc({ ...doc, conversations: { ...doc.conversations, [convId]: { id: convId, personId, createdAt: Date.now(), lastReadAt: Date.now() } }, messages: { ...doc.messages, [convId]: [] } });
    persist();
    emit({ type: 'conversation', convId });
    return { ok: true, convId };
  },

  // Validates, stores the message as 'sending', then settles it after a short delay.
  async send({ personId, text, attachment = null, clientId }, ctx = {}) {
    if (!userId) return { ok: false, code: 'signed-out', message: 'Sign in to send messages.' };
    const error = validateMessage({ text, attachment });
    if (error) return { ok: false, code: 'invalid', message: error };
    if (clientId) {
      // Idempotency: the same clientId never creates a second message (a double tap or a retry).
      const existing = (doc.messages[convIdFor(personId)] || []).find((m) => m.clientId === clientId);
      if (existing) return { ok: true, message: existing, duplicate: true };
    }
    const now = Date.now();
    if (now - lastSendAt < MESSAGE_LIMITS.sendCooldownMs) return { ok: false, code: 'rate', message: 'You are sending too quickly. Wait a moment.' };
    const ensured = this.ensureConversation(personId, ctx);
    if (!ensured.ok) return ensured;
    const policy = sendPolicy(personId, ctx.following || []);
    if (!policy.ok) return policy;
    lastSendAt = now;
    const message = { id: newId('msg'), clientId: String(clientId || ''), senderId: 'me', text: cleanMessage(text), attachment, at: now, status: 'sending', simulated: false };
    setDoc(withMessage(doc, personId, message, now));
    persist();
    emit({ type: 'message', convId: ensured.convId, message });
    settle(personId, message.id);
    return { ok: true, message };
  },

  // Retry a message that failed. It gets a fresh send attempt, not a second copy.
  retry(personId, messageId, ctx = {}) {
    const convId = convIdFor(personId);
    const m = (doc.messages[convId] || []).find((x) => x.id === messageId);
    if (!m || m.status !== 'failed') return { ok: false, code: 'not-failed', message: 'Only a message that was not sent can be retried.' };
    const policy = sendPolicy(personId, ctx.following || []);
    if (!policy.ok || doc.blocked.includes(personId)) return { ok: false, code: 'policy', message: policy.message || 'You can’t message this person.' };
    setDoc(withMessageStatus(doc, convId, messageId, 'sending'));
    persist();
    emit({ type: 'status', convId });
    settle(personId, messageId);
    return { ok: true };
  },

  // Where the recipient's privacy setting is applied. A real server does this for the recipient;
  // here "you" are the recipient of a scripted message. ctx = { following, prefs }.
  deliverIncoming(personId, text, ctx = {}) {
    if (!PEOPLE_BY_ID[personId]) return { ok: false, code: 'unknown', message: 'Unknown sender.' };
    if (doc.blocked.includes(personId)) return { ok: false, code: 'blocked', message: 'Blocked: this message was not delivered.' };
    const convId = convIdFor(personId);
    const list = doc.messages[convId] || [];
    const initiated = list.some((m) => m.senderId === 'me');
    const prefs = ctx.prefs || {};
    if (!incomingAllowed(prefs, ctx.following || [], personId, initiated)) {
      if (prefs.messagesFrom === 'nobody') return { ok: false, code: 'privacy', message: 'Not delivered: your privacy setting is “No one”.' };
    }
    const now = Date.now();
    const message = { id: newId('msg'), clientId: '', senderId: personId, text: cleanMessage(text), attachment: null, at: now, status: 'sent', simulated: true };
    let next = withMessage(doc, personId, message, now);
    if (activeConv === convId) next = withRead(next, convId, now);
    setDoc(next);
    persist();
    emit({ type: 'message', convId, message });
    return { ok: true, message };
  },

  // DEMO: pretend someone new wrote to you (Profile > Developer tools).
  simulateIncoming(ctx = {}) {
    const following = ctx.following || [];
    const candidate = PEOPLE.find((p) => !doc.conversations[convIdFor(p.id)] && !doc.blocked.includes(p.id));
    const pick = candidate || PEOPLE.find((p) => !doc.blocked.includes(p.id));
    if (!pick) return { ok: false, message: 'Everyone is blocked. Nobody is left to send a sample message.' };
    const result = this.deliverIncoming(pick.id, SAMPLE_INCOMING, { ...ctx, following });
    return result.ok ? { ...result, person: pick } : result;
  },

  markRead(convId) {
    const next = withRead(doc, convId);
    if (next === doc) return;
    setDoc(next);
    persist();
    emit({ type: 'read', convId });
  },

  block(personId) {
    if (!PEOPLE_BY_ID[personId]) return { ok: false };
    setDoc(withBlocked(doc, personId, true));
    persist();
    emit({ type: 'block', personId });
    return { ok: true };
  },
  unblock(personId) {
    setDoc(withBlocked(doc, personId, false));
    persist();
    emit({ type: 'block', personId });
    return { ok: true };
  },
  clearConversation(personId) {
    setDoc(withoutConversation(doc, convIdFor(personId)));
    persist();
    emit({ type: 'conversation', convId: convIdFor(personId) });
    return { ok: true };
  },
  reset(user, now = Date.now()) {
    timers.forEach((t) => clearTimeout(t));
    timers = new Set();
    typing = {};
    setDoc(user && user.isDemo ? demoDoc(now) : emptyDoc());
    persist();
    emit({ type: 'reset' });
    return { ok: true };
  },

  // Demo controls.
  setDemoOutcome(value) {
    if (value === 'success' || value === 'fail') outcome = value;
  },
  getDemoOutcome: () => outcome,
  setSimulatedReplies(value) {
    simulatedReplies = Boolean(value);
  },
  getSimulatedReplies: () => simulatedReplies,
  setTimings(next) {
    timings = { ...timings, ...next };
  },
};

// Settles a 'sending' message after the simulated network delay, then maybe schedules a reply.
function settle(personId, messageId) {
  const convId = convIdFor(personId);
  later(() => {
    const status = outcome === 'fail' ? 'failed' : 'sent';
    setDoc(withMessageStatus(doc, convId, messageId, status));
    persist();
    emit({ type: 'status', convId });
    if (status === 'sent') scheduleReply(personId);
  }, timings.sendMs);
}

function scheduleReply(personId) {
  const convId = convIdFor(personId);
  if (!simulatedReplies || doc.blocked.includes(personId) || !PEOPLE_BY_ID[personId]) return;
  const count = (doc.messages[convId] || []).length;
  later(() => {
    typing = { ...typing, [convId]: true };
    emit({ type: 'typing', convId });
  }, Math.max(0, timings.replyMs - timings.typingMs));
  later(() => {
    typing = { ...typing, [convId]: false };
    if (doc.blocked.includes(personId)) {
      emit({ type: 'typing', convId });
      return;
    }
    const message = { id: newId('msg'), clientId: '', senderId: personId, text: simulatedReply(personId, count), attachment: null, at: Date.now(), status: 'sent', simulated: true };
    let next = withMessage(doc, personId, message, message.at);
    if (activeConv === convId) next = withRead(next, convId, message.at);
    setDoc(next);
    persist();
    emit({ type: 'message', convId, message });
  }, timings.replyMs);
}

// The swap point.
export const messagingProvider = localMessagingProvider;
