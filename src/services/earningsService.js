import { creators as sampleCreators } from '../data/creators';
import { buildSampleLedger } from '../data/leaderboardSample';
import { buildDashboard, buildEmptyDashboard } from '../utils/creatorDashboard';
import { FEE_SCHEDULE, filterStatement } from '../utils/earnings';

// Creator dashboard data layer (prototype).
//
// DEMONSTRATION ONLY. The numbers behind this are a deterministic sample ledger
// (src/data/leaderboardSample.js) run through an illustrative fee schedule
// (src/utils/earnings.js). They are not real reader activity, not real money, and nothing here can
// pay anyone. The signed-in storyteller's own account has no readers or buyers in this demo, so its
// dashboard shows real story counts and honestly empty earnings.
//
// Screens call only the functions at the bottom of this file. They never calculate money. That is
// the seam where a real server plugs in: replace these functions with calls to the API below and
// nothing else in the app changes.
//
// ======================================================================================
// PRODUCTION ARCHITECTURE: server-verified earnings ledger, fee calculation and payouts
// ======================================================================================
// The app is a DISPLAY. It never creates, edits or computes an amount of money.
//
// 1. Earnings ledger (source of truth for money)
//    - Append-only, double-entry style: each sale, refund, chargeback, fee, adjustment and payout
//      is an immutable entry with an id, creator id, work id, currency, integer minor units, a
//      timestamp and a reference to the event that caused it. Mistakes are fixed with new
//      adjustment entries, never by editing an old one.
//    - Entries are written only by the server, from payment-provider webhooks (for example
//      Stripe or Apple/Google billing). The provider's event id is the idempotency key, so a
//      replayed webhook cannot create a second sale. There is no client write path at all.
//    - Sales are not inferred from reads or from anything the client reports.
// 2. Fee calculation service
//    - Fees are computed on the server at sale time from the server's own price quote and a
//      VERSIONED fee schedule (per region, creator agreement and effective date). The schedule
//      version is stored on the entry, so history never changes when rates change.
//    - Platform fee, payment-processing fee (the provider's actual charge, reconciled against the
//      provider's balance transactions) and taxes (VAT/sales tax, with marketplace-facilitator
//      rules) are separate lines. Refund and chargeback rules (which fees come back) live here.
//    - Rounding happens once per unit, in integer minor units. No floating point money.
// 3. Settlement
//    - A sale is "clearing" for a hold period (refund and chargeback window), possibly extended
//      by a risk reserve. Negative balances (refunds after payout) are carried forward.
// 4. Payout service
//    - Eligibility: verified identity (KYC), tax information, a verified payout destination, a
//      minimum balance, and no compliance hold (for example a confirmed major violation).
//    - Scheduled runs create payout instructions with an idempotency key; the provider executes
//      them. Lifecycle: scheduled -> processing -> paid, or failed / returned (money goes back to
//      the creator's balance and the creator is notified).
//    - A reconciliation job compares the ledger with the provider's balances and payouts every
//      day and raises alerts on any difference. Every payout action is written to an audit log
//      and needs role-based access; large or unusual payouts need review.
// 5. Read API (what this app would call)
//      GET /v1/creators/me/dashboard?period=7d|30d|all
//      GET /v1/creators/me/transactions?filter=all|sale|refund|payout&cursor=...
//      GET /v1/creators/me/payouts
//    All amounts are integers in minor units plus an ISO currency code; responses are computed by
//    the server and cached briefly. The same permission checks apply as everywhere else: a creator
//    can only read their own ledger.
// 6. Analytics
//    - Reads, readers, engagement and follower growth come from the same validated event pipeline
//      as the leaderboards and levels, aggregated per (creator, work, day). Invalid and held
//      reads are excluded and shown as such. Earnings are never reduced by ranking rules: only
//      provider-confirmed sales count.
// 7. Controls
//    - Money values are never trusted from the client, never logged with personal data, and
//      exports are generated server-side. Creators can dispute an entry; disputes create review
//      cases, and the outcome is applied as a new ledger entry.
// ======================================================================================

let failNext = false;
const cache = {};

export const earningsProvider = {
  setFailNext(value) {
    failNext = Boolean(value);
  },
  getFailNext() {
    return failNext;
  },
  schedule: FEE_SCHEDULE,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function sampleStorytellers() {
  return sampleCreators.map((c) => ({ id: c.id, name: c.name, handle: c.handle, color: c.color, verified: c.verified, avatarUri: c.avatarUri }));
}

async function gate(ms = 500) {
  await delay(ms);
  if (failNext) {
    failNext = false;
    throw new Error('We could not load your dashboard. Check your connection and try again.');
  }
}

function dashboardFor(subjectId, period, me, schedule) {
  if (subjectId === 'me') {
    return buildEmptyDashboard({ works: (me && me.works) || [], followers: (me && me.followers) || 0, period, schedule });
  }
  const creator = sampleCreators.find((c) => c.id === subjectId);
  if (!creator) throw new Error('This storyteller was not found.');
  const key = `${schedule.version}:${subjectId}:${period}`;
  if (!cache[key]) cache[key] = buildDashboard({ sampleLedger: buildSampleLedger(), creator, period, schedule });
  return cache[key];
}

// Dashboard summary for a subject ('me' or a sample storyteller id) and period. The transaction
// statement is NOT included: it is fetched in pages with fetchStatement.
//   me: { works, followers } for the signed-in storyteller (only used when subjectId === 'me')
export async function fetchDashboard({ subjectId = 'me', period = '30d', me = null, schedule = earningsProvider.schedule } = {}) {
  await gate();
  const { statement, ...summary } = dashboardFor(subjectId, period, me, schedule);
  return { ...summary, statementTotal: statement.length, sample: subjectId !== 'me' };
}

// One page of the transaction history, newest first.
export async function fetchStatement({ subjectId = 'me', filter = 'all', offset = 0, limit = 20, me = null, schedule = earningsProvider.schedule } = {}) {
  await delay(250);
  const rows = filterStatement(dashboardFor(subjectId, 'all', me, schedule).statement, filter);
  return { rows: rows.slice(offset, offset + limit), total: rows.length, offset, hasMore: offset + limit < rows.length };
}
