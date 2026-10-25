import { DEFAULT_MODEL as BOARD_MODEL } from './leaderboard';
import { audienceFor, changeFraction, storyCounts, windowOf } from './analytics';
import { FEE_SCHEDULE, balanceTotal, buildEarningsLedger, buildStatement, revenueByMedia, revenueByStory, settle, totalsFor } from './earnings';

// Composes the creator dashboard from the three pure parts: audience analytics, the earnings
// ledger and settlement. It does arithmetic only and returns plain data: it never formats text
// for display. DEMONSTRATION data: not real reader activity and not real money.
//
// Inputs
//   sampleLedger  validated event ledger (src/data/leaderboardSample.js shape)
//   creator       the sample storyteller record (id, name, followers, ...)
//   period        '7d' | '30d' | 'all'
//   schedule      fee schedule (FEE_SCHEDULE by default)
export function buildDashboard({ sampleLedger, creator, period = '30d', schedule = FEE_SCHEDULE, boardModel = BOARD_MODEL }) {
  const horizon = sampleLedger.horizon;
  const win = windowOf(period, horizon, false);
  const prevWin = windowOf(period, horizon, true);
  const events = sampleLedger.creatorEvents[creator.id] || { violations: [] };
  const works = sampleLedger.works.filter((w) => w.creatorId === creator.id);

  const audience = audienceFor(sampleLedger, creator.id, win, boardModel);
  const previousAudience = prevWin ? audienceFor(sampleLedger, creator.id, prevWin, boardModel) : null;

  const entries = buildEarningsLedger(sampleLedger, creator.id, schedule);
  const settlement = settle(entries, { violations: events.violations, horizon, schedule });
  const totals = totalsFor(entries, win);
  const previousTotals = prevWin ? totalsFor(entries, prevWin) : null;
  const lifetime = totalsFor(entries, { from: 1, to: horizon });

  const change = (key, source, prev) => (prev ? changeFraction(source[key], prev[key]) : null);
  return {
    subjectId: creator.id,
    period,
    window: win,
    hasData: true,
    counts: storyCounts(works),
    followersNow: creator.followers,
    audience,
    previousAudience,
    audienceChange: {
      validReads: change('validReads', audience, previousAudience),
      uniqueReaders: change('uniqueReaders', audience, previousAudience),
      netFollows: change('netFollows', audience, previousAudience),
      engagementActions: change('engagementActions', audience, previousAudience),
    },
    earnings: { totals, previousTotals, netChange: previousTotals ? changeFraction(totals.net, previousTotals.net) : null, lifetime },
    byStory: revenueByStory(entries, works, win),
    byMedia: revenueByMedia(entries, win),
    balances: settlement.balances,
    balanceTotal: balanceTotal(settlement.balances),
    payouts: [...settlement.payouts].sort((a, b) => a.runDay - b.runDay), // newest first (small runDay = recent)
    upcoming: settlement.upcoming,
    carriedCents: settlement.carriedCents,
    statement: buildStatement(entries, settlement),
    schedule,
  };
}

// The dashboard for an account that has no audience or sales in the demo (the signed-in storyteller).
// Real numbers: how many stories they have published. Everything else is honestly empty.
export function buildEmptyDashboard({ works = [], followers = 0, period = '30d', schedule = FEE_SCHEDULE }) {
  const published = works.filter((w) => w.status === 'published');
  const zeroTotals = { units: 0, refundedUnits: 0, gross: 0, refunds: 0, platformFee: 0, processingFee: 0, fees: 0, net: 0 };
  const zeroAudience = { rawReads: 0, validReads: 0, excludedReads: 0, uniqueReaders: 0, completions: 0, reviews: 0, comments: 0, bookmarks: 0, shares: 0, engagementActions: 0, engagementRate: 0, completionRate: 0, follows: 0, unfollows: 0, netFollows: 0, heldReadsLifetime: 0 };
  return {
    subjectId: 'me',
    period,
    window: null,
    hasData: false,
    counts: storyCounts(published),
    drafts: works.filter((w) => w.status === 'draft').length,
    scheduled: works.filter((w) => w.status === 'scheduled').length,
    followersNow: followers,
    audience: zeroAudience,
    previousAudience: null,
    audienceChange: { validReads: null, uniqueReaders: null, netFollows: null, engagementActions: null },
    earnings: { totals: zeroTotals, previousTotals: null, netChange: null, lifetime: zeroTotals },
    byStory: [],
    byMedia: revenueByMedia([]),
    balances: { clearing: 0, cleared: 0, held: 0, paidOut: 0 },
    balanceTotal: 0,
    payouts: [],
    upcoming: null,
    carriedCents: 0,
    statement: [],
    schedule,
  };
}
