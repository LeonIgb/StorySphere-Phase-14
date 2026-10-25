// Access control, pricing quotes and the (simulated) purchase ledger.
//
// ======================= WHAT IS SIMULATED, WHAT PRODUCTION NEEDS =======================
// SIMULATED here: the payment (there is no payment provider and no card or bank data is ever
// requested), the "server" (everything runs inside the app and its storage), the entitlement
// signature (the signing key ships inside the app, so anyone could forge it: it only shows the
// SHAPE of a server-signed entitlement), refunds, and delayed or failed payments.
//
// PRODUCTION needs: a payment provider (for example Stripe, or Apple / Google in-app purchase
// where store rules require it) that hosts the payment UI; a backend that owns the price list,
// creates orders, receives the provider's signed webhooks, stores transactions and issues
// entitlements; server-side checks on every content request (never a flag in the app);
// receipt validation for store purchases; refund and chargeback handling; tax and invoices;
// and fraud and abuse controls. See docs in the Phase 7 summary.
//
// The app talks to ONE object, `accessProvider`. To go live, implement the same methods against
// your API and export that instead of `localAccessProvider`. Nothing else has to change.
//
//   attach(user) / detach()           start / stop serving an account
//   quote(storyId)                    price and what is included, computed by the "server"
//   purchase({ storyId, idempotencyKey })   create the order; the result carries its status
//   resolvePending(txId, outcome)     DEMO ONLY: stands in for the payment provider's webhook
//   refund(txId)                      DEMO refund: revokes the entitlement
//   listTransactions() / listEntitlements()   the account's history and VERIFIED entitlements
//   authorize(story)                  { entitled, reason } for one story (used before any
//                                     locked content is returned)
// =========================================================================================

import { purchasesKey } from '../data/storageKeys';
import { CURRENCY, priceFor } from '../data/pricing';
import { decideAccess } from '../utils/access';
import { weakHash } from '../utils/account';
import { newId } from '../utils/creator';
import { loadJSON, saveJSON } from '../utils/storage';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const LATENCY = 300;
const PAYMENT_MS = 900;
const DAY = 86400000;

export const STATUSES = ['pending', 'completed', 'failed', 'refunded'];
export const OUTCOMES = ['success', 'fail', 'pending'];
export const DEMO_METHOD = 'Demo wallet (simulated)';

// A key that ships in the app is not a secret. See the header.
const DEMO_SIGNING_KEY = 'storysphere-demo-key-NOT-SECRET';
export const signEntitlement = (userId, storyId, txId) => weakHash(DEMO_SIGNING_KEY, `${userId}|${storyId}|${txId}`);

// storyService registers a lookup so quotes use the catalog's own data, not anything the app sends.
let lookupStory = () => null;
export function registerCatalog(fn) {
  lookupStory = typeof fn === 'function' ? fn : () => null;
}

// ------------------------------------------------------------------ state

let userId = null;
let ledger = { transactions: [], entitlements: [] };
let demoOutcome = 'success';
let devUnlockAll = false;
let chain = Promise.resolve();

const serial = (fn) => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
};

const persist = () => (userId ? saveJSON(purchasesKey(userId), { version: 1, ...ledger }) : Promise.resolve());

// ------------------------------------------------------------------ pure helpers (tested)

export function sanitizeLedger(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
  const transactions = (Array.isArray(r.transactions) ? r.transactions : [])
    .filter((t) => t && typeof t.id === 'string' && typeof t.storyId === 'string' && STATUSES.includes(t.status) && Number.isInteger(t.amountCents))
    .map((t) => ({
      id: t.id,
      storyId: t.storyId,
      title: typeof t.title === 'string' ? t.title : t.storyId,
      creatorName: typeof t.creatorName === 'string' ? t.creatorName : '',
      amountCents: t.amountCents,
      currency: typeof t.currency === 'string' ? t.currency : CURRENCY,
      status: t.status,
      method: DEMO_METHOD,
      demo: true,
      createdAt: num(t.createdAt),
      updatedAt: num(t.updatedAt, num(t.createdAt)),
      completedAt: t.completedAt === undefined || t.completedAt === null ? null : num(t.completedAt),
      refundedAt: t.refundedAt === undefined || t.refundedAt === null ? null : num(t.refundedAt),
      failureReason: typeof t.failureReason === 'string' ? t.failureReason : '',
      idempotencyKey: typeof t.idempotencyKey === 'string' ? t.idempotencyKey : '',
    }));
  const entitlements = (Array.isArray(r.entitlements) ? r.entitlements : [])
    .filter((e) => e && typeof e.id === 'string' && typeof e.storyId === 'string' && typeof e.txId === 'string')
    .map((e) => ({ id: e.id, storyId: e.storyId, txId: e.txId, grantedAt: num(e.grantedAt), source: 'purchase', sig: typeof e.sig === 'string' ? e.sig : '' }));
  return { transactions, entitlements };
}

// An entitlement counts only if its signature checks out AND the transaction behind it is
// completed for the same story. A hand-edited or refunded record is ignored.
export function verifiedEntitlements(uid, led) {
  return led.entitlements.filter((e) => {
    const tx = led.transactions.find((t) => t.id === e.txId);
    return Boolean(tx) && tx.status === 'completed' && tx.storyId === e.storyId && e.sig === signEntitlement(uid, e.storyId, e.txId);
  });
}

// Total spent: completed purchases only (pending, failed and refunded are not spend).
export const totalSpentCents = (transactions) => transactions.filter((t) => t.status === 'completed').reduce((s, t) => s + t.amountCents, 0);

// ------------------------------------------------------------------ server-side logic

function quoteSync(storyId) {
  const story = lookupStory(storyId);
  if (!story) return { ok: false, code: 'not-found', message: 'This story is no longer available.' };
  if (story.access !== 'Premium') return { ok: false, code: 'free', message: 'This story is free. There is nothing to buy.' };
  if (story.creatorId === 'me') return { ok: false, code: 'owner', message: 'You created this story, so you already have full access.' };
  const owned = verifiedEntitlements(userId, ledger).some((e) => e.storyId === storyId);
  return {
    ok: true,
    alreadyOwned: owned,
    quote: {
      storyId,
      title: story.title,
      creatorName: story.creator ? story.creator.name : '',
      mediaType: story.mediaType,
      priceCents: priceFor(story),
      currency: CURRENCY,
      previewCount: story.previewCount,
      chapterCount: story.chapterCount || 0,
      panelCount: story.panelCount || 0,
      hasVideo: Boolean(story.hasVideo),
      coverColor: story.coverColor,
      coverUri: story.coverUri || null,
      icon: story.icon,
    },
  };
}

function grant(tx, now) {
  const exists = ledger.entitlements.some((e) => e.txId === tx.id);
  if (!exists) {
    ledger.entitlements = [
      ...ledger.entitlements,
      { id: newId('ent'), storyId: tx.storyId, txId: tx.id, grantedAt: now, source: 'purchase', sig: signEntitlement(userId, tx.storyId, tx.id) },
    ];
  }
}

const replaceTx = (tx) => {
  ledger.transactions = ledger.transactions.map((t) => (t.id === tx.id ? tx : t));
};

function seedDemoLedger(now) {
  const make = (id, storyId, status, daysAgo, extra = {}) => {
    const story = lookupStory(storyId);
    const at = now - daysAgo * DAY;
    return {
      id,
      storyId,
      title: story ? story.title : storyId,
      creatorName: story && story.creator ? story.creator.name : '',
      amountCents: story ? priceFor(story) || 0 : 0,
      currency: CURRENCY,
      status,
      method: DEMO_METHOD,
      demo: true,
      createdAt: at,
      updatedAt: at,
      completedAt: status === 'completed' || status === 'refunded' ? at : null,
      refundedAt: null,
      failureReason: '',
      idempotencyKey: `seed-${id}`,
      ...extra,
    };
  };
  const txs = [
    make('tx_demo_1', 's5', 'completed', 12),
    make('tx_demo_2', 's2', 'completed', 5),
    make('tx_demo_3', 's13', 'failed', 3, { failureReason: 'Simulated payment failure (demo)' }),
    make('tx_demo_4', 's9', 'refunded', 20, { refundedAt: now - 18 * DAY }),
  ];
  const led = { transactions: txs, entitlements: [] };
  txs.filter((t) => t.status === 'completed').forEach((t) => {
    led.entitlements.push({ id: `ent_${t.id}`, storyId: t.storyId, txId: t.id, grantedAt: t.createdAt, source: 'purchase', sig: signEntitlement(userId, t.storyId, t.id) });
  });
  return led;
}

// ------------------------------------------------------------------ the provider

export const localAccessProvider = {
  async attach(user, now = Date.now()) {
    userId = user.id;
    const saved = await loadJSON(purchasesKey(userId), null);
    ledger = saved ? sanitizeLedger(saved) : user.isDemo ? seedDemoLedger(now) : { transactions: [], entitlements: [] };
    if (!saved) await persist();
    devUnlockAll = false;
    return { ok: true };
  },

  detach() {
    userId = null;
    ledger = { transactions: [], entitlements: [] };
    devUnlockAll = false;
  },

  async listTransactions() {
    return [...ledger.transactions].sort((a, b) => b.createdAt - a.createdAt);
  },

  async getTransaction(txId) {
    return ledger.transactions.find((t) => t.id === txId) || null;
  },

  async listEntitlements() {
    return verifiedEntitlements(userId, ledger);
  },

  async quote(storyId) {
    await delay(LATENCY);
    return quoteSync(storyId);
  },

  purchase({ storyId, idempotencyKey }) {
    return serial(async () => {
      await delay(LATENCY);
      if (!userId) return { ok: false, code: 'signed-out', message: 'Sign in to buy.' };
      // The same key never creates a second charge (a double tap, or a retry after a timeout).
      const again = ledger.transactions.find((t) => t.idempotencyKey && t.idempotencyKey === idempotencyKey);
      if (again) return { ok: true, transaction: again, duplicate: true };
      const q = quoteSync(storyId);
      if (!q.ok) return q;
      if (q.alreadyOwned) return { ok: false, code: 'owned', message: 'You already own this story.' };
      const now = Date.now();
      let tx = {
        id: newId('tx'),
        storyId,
        title: q.quote.title,
        creatorName: q.quote.creatorName,
        amountCents: q.quote.priceCents,
        currency: q.quote.currency,
        status: 'pending',
        method: DEMO_METHOD,
        demo: true,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        refundedAt: null,
        failureReason: '',
        idempotencyKey: String(idempotencyKey || ''),
      };
      ledger.transactions = [tx, ...ledger.transactions];
      await persist();
      await delay(PAYMENT_MS); // stands in for the payment provider
      if (demoOutcome === 'success') {
        tx = { ...tx, status: 'completed', completedAt: Date.now(), updatedAt: Date.now() };
        replaceTx(tx);
        grant(tx, Date.now());
      } else if (demoOutcome === 'fail') {
        tx = { ...tx, status: 'failed', failureReason: 'Simulated payment failure (demo)', updatedAt: Date.now() };
        replaceTx(tx);
      } // 'pending': stays pending until resolvePending
      await persist();
      return { ok: true, transaction: tx };
    });
  },

  // DEMO ONLY. In production this is the payment provider's signed webhook, never the app.
  resolvePending(txId, outcome) {
    return serial(async () => {
      await delay(LATENCY);
      const tx = ledger.transactions.find((t) => t.id === txId);
      if (!tx) return { ok: false, code: 'not-found', message: 'Transaction not found.' };
      if (tx.status !== 'pending') return { ok: false, code: 'not-pending', message: 'Only a pending payment can be resolved.' };
      const now = Date.now();
      const next =
        outcome === 'completed'
          ? { ...tx, status: 'completed', completedAt: now, updatedAt: now }
          : { ...tx, status: 'failed', failureReason: 'Simulated payment failure (demo)', updatedAt: now };
      replaceTx(next);
      if (next.status === 'completed') grant(next, now);
      await persist();
      return { ok: true, transaction: next };
    });
  },

  refund(txId) {
    return serial(async () => {
      await delay(LATENCY);
      const tx = ledger.transactions.find((t) => t.id === txId);
      if (!tx) return { ok: false, code: 'not-found', message: 'Transaction not found.' };
      if (tx.status !== 'completed') return { ok: false, code: 'not-refundable', message: 'Only a completed purchase can be refunded.' };
      const now = Date.now();
      const next = { ...tx, status: 'refunded', refundedAt: now, updatedAt: now };
      replaceTx(next);
      ledger.entitlements = ledger.entitlements.filter((e) => e.txId !== tx.id);
      await persist();
      return { ok: true, transaction: next };
    });
  },

  async authorize(story) {
    return decideAccess({ story, entitlements: verifiedEntitlements(userId, ledger), devOverride: devUnlockAll });
  },

  // Demo controls (Profile > Developer tools).
  setDemoOutcome(outcome) {
    if (OUTCOMES.includes(outcome)) demoOutcome = outcome;
  },
  getDemoOutcome: () => demoOutcome,
  setDevUnlockAll(value) {
    devUnlockAll = Boolean(value);
  },
  getDevUnlockAll: () => devUnlockAll,

  // Clears this account's purchases (the demo account goes back to its sample history).
  resetPurchases(user, now = Date.now()) {
    return serial(async () => {
      ledger = user && user.isDemo ? seedDemoLedger(now) : { transactions: [], entitlements: [] };
      await persist();
      return { ok: true };
    });
  },
};

// The swap point.
export const accessProvider = localAccessProvider;
