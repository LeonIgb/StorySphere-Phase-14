import { priceFor } from '../data/pricing';

// Creator earnings: the MONEY LOGIC for the Phase 12 dashboard. Pure functions, no React, no I/O,
// and no display code. Screens only format what these functions return.
//
// DEMONSTRATION ONLY. Every amount produced here comes from sample data and an illustrative fee
// schedule. None of it is real money, and nothing here can pay anyone.
//
// Rules this module follows (they are the contract a server-side ledger would also follow):
//   1. Money is always an INTEGER number of cents. No floating point is ever stored or summed;
//      rounding happens in exactly one place (feesForPrice), once per unit, half up.
//   2. Fees are computed per unit sold from the unit price, then multiplied by the number of
//      units. So a batch of 40 sales has exactly 40x the fees of one sale, and every total is the
//      exact sum of its parts (reconciliation holds to the cent).
//   3. The ledger is APPEND-ONLY and derived, never edited: a sale is one entry, a refund is a
//      separate negative entry. Nothing changes a past entry.
//   4. net = gross - platformFee - processingFee, for sales and refunds alike.
//   5. Every entry belongs to exactly one balance bucket (clearing, cleared, held, paid out), so
//      the buckets always add up to the net total.

export const FEE_SCHEDULE = {
  version: 'illustrative-fees-v1',
  currency: 'USD',
  // Estimated platform fee: share of the sale price kept by StorySphere, in basis points (1500 = 15%).
  platformFeeBps: 1500,
  // Estimated payment-processing fee, charged by the payment provider: percentage plus a fixed amount.
  processing: { bps: 290, fixedCents: 30 },
  // On a refund the platform fee is returned to the creator's balance; the processing fee is not.
  refund: { returnPlatformFee: true, returnProcessingFee: false },
  // A sale stays "clearing" this many days (refund and chargeback window) before it can be paid.
  holdDays: 14,
  payout: {
    minCents: 2000, // a run below this carries over to the next run
    runEveryDays: 30,
    firstRunDaysAgo: 15, // the most recent completed run, in days ago
    reviewHoldDays: 90, // a run is held for review for this long after a confirmed major violation
  },
};

export const PAYOUT_STATUS_LABEL = { completed: 'Completed (demo)', scheduled: 'Scheduled (demo)', held: 'Held for review' };
export const ENTRY_STATUS_LABEL = { clearing: 'Clearing', cleared: 'Cleared', paid: 'Paid out (demo)', held: 'Held for review' };

// Display only: integer cents -> "$1,234.56" (US dollars; the demo has one currency).
export function formatMoney(cents) {
  const n = Math.round(Number(cents));
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  return `${n < 0 ? '-' : ''}$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
}

const roundHalfUp = (n) => Math.floor(n + 0.5);

// Fees for ONE unit sold at `priceCents`. All three results are integers and
// gross = platformFee + processingFee + net.
export function feesForPrice(priceCents, schedule = FEE_SCHEDULE) {
  const gross = Math.max(0, Math.round(priceCents));
  const platformFee = roundHalfUp((gross * schedule.platformFeeBps) / 10000);
  const processingFee = roundHalfUp((gross * schedule.processing.bps) / 10000) + schedule.processing.fixedCents;
  return { gross, platformFee, processingFee, net: gross - platformFee - processingFee };
}

// The effect of refunding ONE unit. Amounts are signed: gross and net are negative; a returned fee
// is negative (a credit), a kept fee is its original positive amount.
export function refundForPrice(priceCents, schedule = FEE_SCHEDULE) {
  const u = feesForPrice(priceCents, schedule);
  const platformFee = schedule.refund.returnPlatformFee ? -u.platformFee : 0;
  const processingFee = schedule.refund.returnProcessingFee ? -u.processingFee : 0;
  const gross = -u.gross;
  return { gross, platformFee, processingFee, net: gross - platformFee - processingFee };
}

// ------------------------------------------------------------------ the earnings ledger

// price of a ledger work, or null for a free one (same price list the purchase flow uses)
export function workPrice(work) {
  return priceFor({ id: work.id, access: work.access, mediaType: work.mediaType });
}

// Build the append-only earnings ledger for one storyteller from validated sales events.
//   sampleLedger: the validated event ledger (src/data/leaderboardSample.js shape)
// Returns entries newest first. One entry per work per day per kind (sale or refund).
//   { id, kind: 'sale'|'refund', workId, title, mediaType, day, units, unitPriceCents,
//     gross, platformFee, processingFee, net }   (day = days ago)
export function buildEarningsLedger(sampleLedger, creatorId, schedule = FEE_SCHEDULE) {
  const entries = [];
  sampleLedger.works
    .filter((w) => w.creatorId === creatorId)
    .forEach((work) => {
      const price = workPrice(work);
      if (price === null) return;
      const sale = feesForPrice(price, schedule);
      const refund = refundForPrice(price, schedule);
      for (let d = 1; d <= sampleLedger.horizon; d += 1) {
        const row = work.rows[d];
        if (!row) continue;
        const base = { workId: work.id, title: work.title, mediaType: work.mediaType, day: d, unitPriceCents: price };
        if (row.sales > 0) {
          entries.push({
            ...base,
            id: `${work.id}:${d}:sale`,
            kind: 'sale',
            units: row.sales,
            gross: sale.gross * row.sales,
            platformFee: sale.platformFee * row.sales,
            processingFee: sale.processingFee * row.sales,
            net: sale.net * row.sales,
          });
        }
        if (row.refunds > 0) {
          entries.push({
            ...base,
            id: `${work.id}:${d}:refund`,
            kind: 'refund',
            units: row.refunds,
            gross: refund.gross * row.refunds,
            platformFee: refund.platformFee * row.refunds,
            processingFee: refund.processingFee * row.refunds,
            net: refund.net * row.refunds,
          });
        }
      }
    });
  return entries.sort((a, b) => a.day - b.day || a.workId.localeCompare(b.workId) || (a.kind === 'sale' ? -1 : 1));
}

// ------------------------------------------------------------------ totals and breakdowns

const ZERO = () => ({ units: 0, refundedUnits: 0, gross: 0, refunds: 0, platformFee: 0, processingFee: 0, fees: 0, net: 0 });

function addEntry(t, e) {
  if (e.kind === 'sale') {
    t.units += e.units;
    t.gross += e.gross;
  } else {
    t.refundedUnits += e.units;
    t.refunds += -e.gross; // shown as a positive amount refunded
  }
  t.platformFee += e.platformFee;
  t.processingFee += e.processingFee;
  t.fees = t.platformFee + t.processingFee;
  t.net += e.net;
  return t;
}

// Totals for entries whose day is within [from, to] (days ago, inclusive).
//   gross       money charged to readers
//   refunds     money refunded to readers
//   platformFee, processingFee, fees   estimated fees, net of any fee credited back on refunds
//   net         what the creator keeps: gross - refunds - fees (to the cent)
export function totalsFor(entries, win = { from: 1, to: Infinity }) {
  return entries.filter((e) => e.day >= win.from && e.day <= win.to).reduce(addEntry, ZERO());
}

// Revenue by story over a window, largest net first. `works` adds free stories (net 0) so the
// list is complete. Each row also carries its share of the total net, as a number 0..1.
export function revenueByStory(entries, works, win = { from: 1, to: Infinity }) {
  const rows = new Map();
  works.forEach((w) => {
    rows.set(w.id, { workId: w.id, title: w.title, mediaType: w.mediaType, access: w.access === 'Premium' ? 'Premium' : 'Free', priceCents: workPrice(w), ...ZERO() });
  });
  entries
    .filter((e) => e.day >= win.from && e.day <= win.to)
    .forEach((e) => {
      const row = rows.get(e.workId);
      if (row) addEntry(row, e);
    });
  const list = [...rows.values()];
  const total = list.reduce((s, r) => s + r.net, 0);
  return list
    .map((r) => ({ ...r, share: total > 0 && r.net > 0 ? r.net / total : 0 }))
    .sort((a, b) => b.net - a.net || a.title.localeCompare(b.title));
}

export const MEDIA_ORDER = ['Written', 'Image', 'Video', 'Mixed'];

// Revenue by media type over a window (always the four types, in a fixed order).
export function revenueByMedia(entries, win = { from: 1, to: Infinity }) {
  const map = Object.fromEntries(MEDIA_ORDER.map((m) => [m, { mediaType: m, ...ZERO() }]));
  entries
    .filter((e) => e.day >= win.from && e.day <= win.to)
    .forEach((e) => {
      if (map[e.mediaType]) addEntry(map[e.mediaType], e);
    });
  const list = MEDIA_ORDER.map((m) => map[m]);
  const total = list.reduce((s, r) => s + r.net, 0);
  return list.map((r) => ({ ...r, share: total > 0 && r.net > 0 ? r.net / total : 0 }));
}

// ------------------------------------------------------------------ clearing, payouts and balances

// Payout runs, oldest first, from the most recent run date back to the start of the ledger, plus
// the next run (in the future). runDay is "days ago"; the next run has a negative runDay.
export function payoutRunDays(horizon, schedule = FEE_SCHEDULE) {
  const { runEveryDays, firstRunDaysAgo } = schedule.payout;
  const days = [];
  for (let d = firstRunDaysAgo; d <= horizon; d += runEveryDays) days.push(d);
  days.reverse(); // oldest first
  return { past: days, next: firstRunDaysAgo - runEveryDays };
}

// A run is held when a confirmed MAJOR violation is within the review window before it.
export function runIsHeld(runDay, violations = [], schedule = FEE_SCHEDULE) {
  return (violations || []).some((v) => v.severity === 'major' && v.day >= runDay && v.day - runDay <= schedule.payout.reviewHoldDays);
}

// Compute payouts, entry statuses and balance buckets in one pass.
//   An entry "clears" (can be paid) once it is older than holdDays.
//   Each past run pays every entry that has cleared by its date and is not yet in a payout.
//   A run below the minimum pays nothing and carries over.
//   A held run does not pay: its entries are recorded as held for review.
// Returns { payouts (newest first), upcoming, statusById, balances, carriedCents }.
export function settle(entries, { violations = [], horizon = 400, schedule = FEE_SCHEDULE } = {}) {
  const hold = schedule.holdDays;
  const clearDay = (e) => e.day - hold; // days ago at which the entry cleared (negative: not yet)
  const { past, next } = payoutRunDays(horizon, schedule);
  const assigned = new Map(); // entry id -> payout id
  const payouts = [];
  let carriedCents = 0;

  const pool = (runDay) => entries.filter((e) => !assigned.has(e.id) && clearDay(e) >= runDay);

  past.forEach((runDay) => {
    const batch = pool(runDay);
    const total = batch.reduce((s, e) => s + e.net, 0);
    if (batch.length === 0) return;
    const held = runIsHeld(runDay, violations, schedule);
    if (!held && total < schedule.payout.minCents) {
      carriedCents = total; // carried to the next run; entries stay unassigned
      return;
    }
    const status = held ? 'held' : 'completed';
    const id = `payout-${runDay}`;
    batch.forEach((e) => assigned.set(e.id, id));
    payouts.push({ id, runDay, status, amountCents: total, entryCount: batch.length, carriedIn: carriedCents });
    carriedCents = 0;
  });

  // The next run (in the future): an estimate from everything that will have cleared by then.
  const nextBatch = pool(next);
  const nextTotal = nextBatch.reduce((s, e) => s + e.net, 0);
  let upcoming = null;
  if (nextBatch.length > 0) {
    const held = runIsHeld(next, violations, schedule);
    upcoming = {
      id: `payout-${next}`,
      runDay: next,
      status: held ? 'held' : 'scheduled',
      amountCents: nextTotal,
      entryCount: nextBatch.length,
      belowMinimum: !held && nextTotal < schedule.payout.minCents,
      estimated: true,
    };
  }

  const payoutById = Object.fromEntries(payouts.map((p) => [p.id, p]));
  const statusById = {};
  const balances = { clearing: 0, cleared: 0, held: 0, paidOut: 0 };
  entries.forEach((e) => {
    const p = assigned.has(e.id) ? payoutById[assigned.get(e.id)] : null;
    let status;
    if (p) status = p.status === 'held' ? 'held' : 'paid';
    else status = clearDay(e) >= 0 ? 'cleared' : 'clearing';
    statusById[e.id] = status;
    if (status === 'paid') balances.paidOut += e.net;
    else if (status === 'held') balances.held += e.net;
    else balances[status] += e.net;
  });
  return { payouts: payouts.sort((a, b) => a.runDay - b.runDay), upcoming, statusById, balances, carriedCents };
}

export function balanceTotal(balances) {
  return balances.clearing + balances.cleared + balances.held + balances.paidOut;
}

// ------------------------------------------------------------------ statement (transaction history)

export const STATEMENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sale', label: 'Sales' },
  { key: 'refund', label: 'Refunds' },
  { key: 'payout', label: 'Payouts' },
];

// One chronological list (newest first) of sales, refunds and payout runs.
//   amountCents: the effect on the creator's balance (sales +, refunds -, payouts -)
export function buildStatement(entries, settlement) {
  const rows = entries.map((e) => ({
    id: e.id,
    kind: e.kind,
    day: e.day,
    title: e.title,
    mediaType: e.mediaType,
    units: e.units,
    unitPriceCents: e.unitPriceCents,
    gross: e.gross,
    fees: e.platformFee + e.processingFee,
    amountCents: e.net,
    status: settlement.statusById[e.id],
  }));
  settlement.payouts.forEach((p) =>
    rows.push({
      id: p.id,
      kind: 'payout',
      day: p.runDay,
      title: p.status === 'held' ? 'Demo payout run (held for review)' : 'Demo payout run',
      units: p.entryCount,
      gross: 0,
      fees: 0,
      amountCents: -p.amountCents,
      status: p.status,
    })
  );
  const order = { sale: 0, refund: 1, payout: 2 };
  return rows.sort((a, b) => a.day - b.day || order[a.kind] - order[b.kind] || a.id.localeCompare(b.id));
}

export function filterStatement(rows, filter = 'all') {
  return filter === 'all' ? rows : rows.filter((r) => r.kind === filter);
}

// Calendar date for "days ago".
export function dateForDay(day, now = new Date()) {
  return new Date(now.getTime() - day * 86400000);
}

export function dayLabel(day, now = new Date()) {
  if (day < 0) return `In ${-day} day${day === -1 ? '' : 's'}`;
  if (day === 0) return 'Today';
  return dateForDay(day, now).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
