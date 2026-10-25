import { DEFAULT_MODEL, dailySeries, velocityFactors } from './leaderboard';

// Creator analytics: audience metrics for the Phase 12 dashboard. Pure logic, no display code.
//
// These numbers come from the SAME validated-event ledger and the SAME read validation as the
// Phase 10 leaderboards and Phase 11 levels (invalid reads excluded, spike reads held back by the
// velocity cap), so a creator sees one consistent set of numbers wherever they look. DEMONSTRATION
// data only: not real reader activity.

export const DASHBOARD_PERIODS = [
  { key: '7d', label: '7 days', days: 7, description: 'the last 7 completed days' },
  { key: '30d', label: '30 days', days: 30, description: 'the last 30 completed days' },
  { key: 'all', label: 'All time', days: Infinity, description: 'everything on record' },
];

export const PERIOD_LABELS = DASHBOARD_PERIODS.map((p) => p.label);

export function periodOf(key) {
  return DASHBOARD_PERIODS.find((p) => p.key === key) || DASHBOARD_PERIODS[1];
}

// Inclusive window in "days ago". The previous window sits immediately before it (all time has none).
export function windowOf(periodKey, horizon, previous = false) {
  const p = periodOf(periodKey);
  if (p.days === Infinity) return previous ? null : { from: 1, to: horizon };
  return previous ? { from: 1 + p.days, to: 2 * p.days } : { from: 1, to: p.days };
}

// Percentage change as a fraction (0.12 = +12%), or null when there is nothing to compare with.
export function changeFraction(current, previous) {
  if (!previous || previous <= 0) return null;
  return (current - previous) / previous;
}

// Audience totals for one storyteller over a window.
//   rawReads        every read the client reported
//   validReads      validated reads (after the velocity cap)
//   excludedReads   raw - valid: invalid reads plus reads held back as an unexplained spike
//   uniqueReaders   distinct genuine readers, summed per day (as on the leaderboards)
//   completions     readers who finished
//   reviews, comments, bookmarks, shares   meaningful engagement actions
//   engagementActions                      their plain sum
//   engagementRate  weighted actions per unique reader (same weights as the leaderboard)
//   completionRate  completions per unique reader
//   follows, unfollows, netFollows         follower growth
export function audienceFor(sampleLedger, creatorId, win, model = DEFAULT_MODEL) {
  const works = sampleLedger.works.filter((w) => w.creatorId === creatorId);
  const series = dailySeries(works, sampleLedger.horizon);
  const { factors, heldReads } = velocityFactors(series, { from: 1, to: sampleLedger.horizon }, model);
  const t = { raw: 0, valid: 0, unique: 0, completions: 0, reviews: 0, comments: 0, bookmarks: 0, shares: 0, follows: 0, unfollows: 0 };
  for (let d = win.from; d <= win.to && d <= sampleLedger.horizon; d += 1) {
    const day = series[d];
    if (!day) continue;
    const f = factors[d] || 1;
    t.raw += day.raw;
    t.valid += day.valid * f;
    t.unique += day.unique * f;
    t.completions += day.completions * f;
    t.reviews += day.reviews * f;
    t.comments += day.comments * f;
    t.bookmarks += day.bookmarks * f;
    t.shares += day.shares * f;
    t.follows += day.follows * f;
    t.unfollows += day.unfollows * f;
  }
  const ew = model.engagementWeights;
  const r = (n) => Math.round(n);
  const weighted = t.reviews * ew.reviews + t.comments * ew.comments + t.bookmarks * ew.bookmarks + t.shares * ew.shares;
  return {
    rawReads: r(t.raw),
    validReads: r(t.valid),
    excludedReads: Math.max(0, r(t.raw) - r(t.valid)),
    uniqueReaders: r(t.unique),
    completions: r(t.completions),
    reviews: r(t.reviews),
    comments: r(t.comments),
    bookmarks: r(t.bookmarks),
    shares: r(t.shares),
    engagementActions: r(t.reviews) + r(t.comments) + r(t.bookmarks) + r(t.shares),
    engagementRate: t.unique > 0 ? weighted / t.unique : 0,
    completionRate: t.unique > 0 ? t.completions / t.unique : 0,
    follows: r(t.follows),
    unfollows: r(t.unfollows),
    netFollows: r(t.follows) - r(t.unfollows),
    heldReadsLifetime: heldReads,
  };
}

// Published-story counts from a list of works (anything with mediaType and access).
export function storyCounts(works) {
  const byMedia = { Written: 0, Image: 0, Video: 0, Mixed: 0 };
  let premium = 0;
  works.forEach((w) => {
    if (byMedia[w.mediaType] !== undefined) byMedia[w.mediaType] += 1;
    if (w.access === 'Premium') premium += 1;
  });
  return { published: works.length, free: works.length - premium, premium, byMedia };
}
