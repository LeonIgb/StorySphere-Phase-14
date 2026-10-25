// Storyteller leaderboards: the ILLUSTRATIVE scoring model, as PURE functions.
//
// Nothing here reads a screen, storage or the network. It takes a ledger of validated,
// aggregated events (see src/data/leaderboardSample.js for the shape) and returns ranked
// entries. The same code could run in a server job; only the ledger source would change.
//
// IMPORTANT: scores produced here are a demonstration of how a ranking could be built.
// They are NOT a measurement of story quality, and the sample numbers are not real
// reader activity. The weights below are provisional and meant to be tuned.
//
// ---------------------------------------------------------------- the model, in short
// score = 100 x  (sum of weight_i x normalized_i, over the components that apply)
//                / (sum of the weights that apply)
//         x  compliance multiplier  x  integrity multiplier
//
// Components (provisional weights, total 100):
//   genuineReads    22  validated reads only (deduplicated, human, not the creator's own),
//                       after the daily velocity cap
//   uniqueReaders   16  distinct validated readers in the period
//   engagement      16  meaningful actions per unique reader: reviews 5, comments 3,
//                       bookmarks 2, shares 2 (smoothed, so a tiny audience cannot spike it)
//   completion      16  finished / started, smoothed toward a prior for small samples
//   followerGrowth  10  net verified follows (follows minus unfollows) that started from the work
//   consistency     10  share of recent weeks with at least one publication
//   verifiedSales   10  net verified purchases (after refunds). Applies only when the
//                       scope contains priced works; otherwise its weight is redistributed
//                       pro rata, so free-only storytellers are not penalised.
//
// Multipliers (they scale the total, so other points cannot buy back a violation):
//   compliance      confirmed rule violations reduce the score, fading linearly over penaltyDays
//   integrity       a high share of invalid reads lowers confidence; above holdAt the
//                   storyteller is held out of the ranking pending review
//
// Normalization (fixed reference scales, NOT relative to the other creators, so a score
// does not change just because somebody else joined or left a filter):
//   volume metrics  n = clamp( ln(1 + x) / ln(1 + ref[period]), 0, 1 )   (log scale)
//   rate metrics    smoothed = (sum + k x prior) / (n + k);  n = clamp((smoothed - lo) / (hi - lo), 0, 1)
//   consistency     weeks with a publication / weeks considered (8, or 52 for all-time)
//
// Anti-fraud inside the model (the full production design is in leaderboardService.js):
//   - only `valid` reads count; raw reads are used only to measure the invalid share
//   - velocity cap: a day's valid reads above max(k x median of the previous 14 days, floor)
//     are held back when nothing corroborates them (completion rate collapses); the volume
//     fields that day are scaled down by the same factor
//   - per-metric smoothing and caps limit what any single account or day can add
//   - minimum unique readers before a storyteller is ranked at all

export const PERIODS = [
  { key: 'daily', label: 'Daily', days: 1, description: 'the last completed day' },
  { key: 'weekly', label: 'Weekly', days: 7, description: 'the last 7 completed days' },
  { key: 'monthly', label: 'Monthly', days: 30, description: 'the last 30 completed days' },
  { key: 'all', label: 'All-time', days: Infinity, description: 'everything on record' },
];

export const PERIOD_LABELS = PERIODS.map((p) => p.label);

export const MEDIA_FILTERS = ['All', 'Written', 'Image', 'Video', 'Mixed'];

export const COMPONENT_LABELS = {
  genuineReads: 'Genuine reads',
  uniqueReaders: 'Unique readers',
  engagement: 'Meaningful engagement',
  completion: 'Story completion',
  followerGrowth: 'Follower growth',
  consistency: 'Publishing consistency',
  verifiedSales: 'Verified sales',
};

export const DEFAULT_MODEL = {
  version: 'illustrative-v1',
  weights: {
    genuineReads: 22,
    uniqueReaders: 16,
    engagement: 16,
    completion: 16,
    followerGrowth: 10,
    consistency: 10,
    verifiedSales: 10,
  },
  engagementWeights: { reviews: 5, comments: 3, bookmarks: 2, shares: 2 },
  // Reference scales: the value at which a volume metric earns its full normalized score.
  refs: {
    genuineReads: { daily: 120000, weekly: 600000, monthly: 1500000, all: 8000000 },
    uniqueReaders: { daily: 80000, weekly: 400000, monthly: 1000000, all: 5500000 },
    followerGrowth: { daily: 700, weekly: 3500, monthly: 8000, all: 40000 },
    verifiedSales: { daily: 800, weekly: 3500, monthly: 7000, all: 35000 },
  },
  rates: {
    engagement: { prior: 0.32, k: 400, lo: 0.15, hi: 0.45 },
    completion: { prior: 0.6, k: 400, lo: 0.35, hi: 0.8 },
  },
  consistency: { weeksRecent: 8, weeksAllTime: 52 },
  velocity: { lookbackDays: 14, minHistoryDays: 7, multiple: 3, floorReads: 4000, corroboration: 0.6 },
  integrity: { tolerance: 0.1, holdAt: 0.6, maxPenalty: 0.5 },
  compliance: { penaltyDays: 90, severity: { minor: 0.05, major: 0.2 } },
  eligibility: { minUniqueReaders: { daily: 3000, weekly: 20000, monthly: 80000, all: 300000 } },
};

// Merge overrides into the model (shallow per section), so the model is configurable.
export function makeModel(overrides = {}) {
  const merged = { ...DEFAULT_MODEL };
  Object.keys(overrides).forEach((key) => {
    const base = DEFAULT_MODEL[key];
    merged[key] = base && typeof base === 'object' && !Array.isArray(base) ? { ...base, ...overrides[key] } : overrides[key];
  });
  return merged;
}

export function modelWeightTotal(model = DEFAULT_MODEL) {
  return Object.values(model.weights).reduce((a, b) => a + b, 0);
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round1 = (n) => Math.round(n * 10) / 10;

export function periodByKey(key) {
  return PERIODS.find((p) => p.key === key) || PERIODS[1];
}

// Inclusive day-offset window for a period. `previous` is the window just before it
// (used for rank movement). All-time has no previous window.
export function windowFor(periodKey, horizon, previous = false) {
  const period = periodByKey(periodKey);
  if (period.days === Infinity) return previous ? null : { from: 1, to: horizon };
  const len = period.days;
  return previous ? { from: 1 + len, to: 2 * len } : { from: 1, to: len };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function emptyDay() {
  return { raw: 0, valid: 0, unique: 0, completions: 0, reviews: 0, comments: 0, bookmarks: 0, shares: 0, sales: 0, refunds: 0, follows: 0, unfollows: 0 };
}

const VOLUME_FIELDS = ['valid', 'unique', 'completions', 'reviews', 'comments', 'bookmarks', 'shares', 'sales', 'refunds', 'follows', 'unfollows'];

// Per-day totals for a creator's in-scope works, offsets 1..horizon.
export function dailySeries(works, horizon) {
  const series = new Array(horizon + 1).fill(null);
  works.forEach((work) => {
    for (let d = 1; d <= horizon; d += 1) {
      const row = work.rows[d];
      if (!row) continue;
      if (!series[d]) series[d] = emptyDay();
      Object.keys(row).forEach((k) => {
        series[d][k] += row[k];
      });
    }
  });
  return series;
}

// Velocity cap. Returns { factors, heldReads } where factors[d] in (0, 1] scales that day's
// volume fields. A day is capped only when BOTH are true:
//   1. its valid reads exceed multiple x the median of the previous `lookbackDays` days
//      (never below floorReads), and there is enough history to judge; and
//   2. nothing corroborates the jump: that day's completion rate is below `corroboration` x
//      the creator's recent median completion rate.
// Rule 2 stops a genuine release-day or viral surge (readers who finish and engage) from being
// capped, while a spike made of drive-by reads is held back. Held reads are not deleted: in
// production they would be released if review finds them genuine.
export function velocityFactors(series, win, model = DEFAULT_MODEL) {
  const cfg = model.velocity;
  const factors = {};
  let heldReads = 0;
  for (let d = win.from; d <= win.to; d += 1) {
    const day = series[d];
    if (!day || !day.valid) continue;
    const history = [];
    const rates = [];
    for (let h = d + 1; h <= d + cfg.lookbackDays && h < series.length; h += 1) {
      if (series[h] && series[h].valid > 0) {
        history.push(series[h].valid);
        if (series[h].unique > 0) rates.push(series[h].completions / series[h].unique);
      }
    }
    if (history.length < cfg.minHistoryDays) continue;
    const cap = Math.max(median(history) * cfg.multiple, cfg.floorReads);
    if (day.valid <= cap) continue;
    const dayRate = day.unique > 0 ? day.completions / day.unique : 0;
    if (dayRate >= median(rates) * cfg.corroboration) continue; // corroborated: readers finished the story
    factors[d] = cap / day.valid;
    heldReads += day.valid - cap;
  }
  return { factors, heldReads: Math.round(heldReads) };
}

export function complianceMultiplier(violations = [], win, model = DEFAULT_MODEL) {
  const { penaltyDays, severity } = model.compliance;
  let factor = 1;
  const applied = [];
  violations.forEach((v) => {
    const age = v.day - win.from; // days before the newest day of the window
    if (age < 0 || age > penaltyDays) return; // not yet confirmed at that time, or fully faded
    const cut = (severity[v.severity] || 0) * (1 - age / penaltyDays);
    factor *= 1 - cut;
    applied.push({ code: v.code, severity: v.severity, note: v.note, cut: Math.round(cut * 1000) / 1000 });
  });
  return { multiplier: factor, applied };
}

export function integrityMultiplier(invalidShare, model = DEFAULT_MODEL) {
  const { tolerance, holdAt, maxPenalty } = model.integrity;
  if (invalidShare <= tolerance) return 1;
  return 1 - maxPenalty * clamp((invalidShare - tolerance) / (holdAt - tolerance), 0, 1);
}

function publishWeeks(events, workIds, win, weeks) {
  const active = new Set();
  events.forEach((e) => {
    if (!workIds.has(e.workId)) return;
    const age = e.day - win.from;
    if (age < 0 || age >= weeks * 7) return;
    active.add(Math.floor(age / 7));
  });
  return active.size;
}

// Raw per-creator metrics for one window and scope. Returns null when the creator has
// no work in scope.
export function creatorMetrics(ledger, creatorId, win, scope = {}, model = DEFAULT_MODEL, periodKey = 'weekly') {
  const { media = 'All', genre = 'All' } = scope;
  const works = ledger.works.filter(
    (w) => w.creatorId === creatorId && (media === 'All' || w.mediaType === media) && (genre === 'All' || w.genre === genre)
  );
  if (!works.length) return null;
  const series = dailySeries(works, ledger.horizon);
  const { factors, heldReads } = velocityFactors(series, win, model);
  const totals = { raw: 0, valid: 0, unique: 0, completions: 0, reviews: 0, comments: 0, bookmarks: 0, shares: 0, sales: 0, refunds: 0, follows: 0, unfollows: 0 };
  for (let d = win.from; d <= win.to && d <= ledger.horizon; d += 1) {
    const day = series[d];
    if (!day) continue;
    const f = factors[d] || 1;
    totals.raw += day.raw;
    VOLUME_FIELDS.forEach((k) => {
      totals[k] += day[k] * f;
    });
  }
  const rawInWindow = totals.raw;
  const rawValid = (() => {
    let v = 0;
    for (let d = win.from; d <= win.to && d <= ledger.horizon; d += 1) if (series[d]) v += series[d].valid;
    return v;
  })();
  const invalidShare = rawInWindow > 0 ? clamp((rawInWindow - rawValid) / rawInWindow, 0, 1) : 0;
  const ew = model.engagementWeights;
  const weightedActions = totals.reviews * ew.reviews + totals.comments * ew.comments + totals.bookmarks * ew.bookmarks + totals.shares * ew.shares;
  const started = totals.unique;
  const events = (ledger.creatorEvents[creatorId] || {}).publishes || [];
  const workIds = new Set(works.map((w) => w.id));
  const weeksConsidered = periodByKey(periodKey).key === 'all' ? model.consistency.weeksAllTime : model.consistency.weeksRecent;
  const activeWeeks = publishWeeks(events, workIds, win, weeksConsidered);
  const priced = works.some((w) => w.access === 'Premium' && w.publishedDaysAgo >= win.from);
  const activeWorks = works.filter((w) => w.publishedDaysAgo >= win.from);
  return {
    works: works.length,
    activeWorks: activeWorks.length,
    rawReads: Math.round(totals.raw),
    validBeforeCap: Math.round(rawValid),
    validReads: Math.round(totals.valid),
    uniqueReaders: Math.round(totals.unique),
    started: Math.round(started),
    completions: Math.round(totals.completions),
    weightedActions: Math.round(weightedActions),
    netFollows: Math.round(totals.follows - totals.unfollows),
    netSales: Math.round(totals.sales - totals.refunds),
    heldReads,
    invalidShare,
    activeWeeks,
    weeksConsidered,
    hasPricedWork: priced,
  };
}

function volume(x, ref) {
  return clamp(Math.log1p(Math.max(0, x)) / Math.log1p(ref), 0, 1);
}

function smoothedRate(sum, n, cfg) {
  const smoothed = (sum + cfg.k * cfg.prior) / (n + cfg.k);
  return { smoothed, normalized: clamp((smoothed - cfg.lo) / (cfg.hi - cfg.lo), 0, 1) };
}

// Turn raw metrics into a score with a full breakdown.
export function scoreMetrics(metrics, periodKey, creatorEvents = {}, win, model = DEFAULT_MODEL) {
  const key = periodByKey(periodKey).key;
  const refs = model.refs;
  const eng = smoothedRate(metrics.weightedActions, metrics.uniqueReaders, model.rates.engagement);
  // weightedActions per reader is on a 0..~1 scale already; completion is a share.
  const comp = smoothedRate(metrics.completions, metrics.started, model.rates.completion);
  const parts = {
    genuineReads: { raw: metrics.validReads, normalized: volume(metrics.validReads, refs.genuineReads[key]) },
    uniqueReaders: { raw: metrics.uniqueReaders, normalized: volume(metrics.uniqueReaders, refs.uniqueReaders[key]) },
    engagement: { raw: eng.smoothed, normalized: eng.normalized },
    completion: { raw: comp.smoothed, normalized: comp.normalized },
    followerGrowth: { raw: metrics.netFollows, normalized: volume(metrics.netFollows, refs.followerGrowth[key]) },
    consistency: { raw: metrics.activeWeeks / metrics.weeksConsidered, normalized: clamp(metrics.activeWeeks / metrics.weeksConsidered, 0, 1) },
    verifiedSales: { raw: metrics.netSales, normalized: volume(metrics.netSales, refs.verifiedSales[key]) },
  };
  const applies = (name) => (name === 'verifiedSales' ? metrics.hasPricedWork : true);
  const weightSum = Object.keys(model.weights).reduce((sum, name) => sum + (applies(name) ? model.weights[name] : 0), 0);
  const breakdown = Object.keys(model.weights).map((name) => {
    const on = applies(name);
    const points = on ? (100 * model.weights[name] * parts[name].normalized) / weightSum : 0;
    return {
      key: name,
      label: COMPONENT_LABELS[name],
      applies: on,
      weight: model.weights[name],
      effectiveWeight: on ? Math.round((1000 * model.weights[name]) / weightSum) / 10 : 0,
      raw: parts[name].raw,
      normalized: parts[name].normalized,
      points,
    };
  });
  const base = breakdown.reduce((sum, b) => sum + b.points, 0);
  const compliance = complianceMultiplier((creatorEvents || {}).violations, win, model);
  const integrity = integrityMultiplier(metrics.invalidShare, model);
  const score = base * compliance.multiplier * integrity;
  return {
    score: round1(score),
    baseScore: round1(base),
    breakdown,
    complianceMultiplier: compliance.multiplier,
    complianceApplied: compliance.applied,
    integrityMultiplier: integrity,
    completionRate: comp.smoothed,
    engagementRate: eng.smoothed,
  };
}

function eligibility(metrics, periodKey, model) {
  const key = periodByKey(periodKey).key;
  if (!metrics || metrics.activeWorks === 0 || metrics.validReads === 0) return { ok: false, reason: 'no-activity' };
  if (metrics.invalidShare > model.integrity.holdAt) return { ok: false, reason: 'held-for-review' };
  if (metrics.uniqueReaders < model.eligibility.minUniqueReaders[key]) return { ok: false, reason: 'too-few-readers' };
  return { ok: true };
}

export function rankEntries(entries) {
  return [...entries]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.metrics.uniqueReaders - a.metrics.uniqueReaders ||
        b.metrics.validReads - a.metrics.validReads ||
        a.creator.name.localeCompare(b.creator.name)
    )
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

function boardFor(ledger, creators, scope, periodKey, win, model) {
  const entries = [];
  const excluded = [];
  creators.forEach((creator) => {
    const metrics = creatorMetrics(ledger, creator.id, win, scope, model, periodKey);
    const check = eligibility(metrics, periodKey, model);
    if (!check.ok) {
      if (metrics) excluded.push({ creatorId: creator.id, name: creator.name, reason: check.reason });
      return;
    }
    const scored = scoreMetrics(metrics, periodKey, ledger.creatorEvents[creator.id], win, model);
    entries.push({ creator, creatorId: creator.id, score: scored.score, scored, metrics });
  });
  return { entries: rankEntries(entries), excluded };
}

// The leaderboard for one period and category filter.
//   creators: sample creator records (id, name, handle, color, verified, followers ...)
//   scope:    { media: 'All'|'Written'|..., genre: 'All'|'Fantasy'|... }
export function computeLeaderboard(ledger, creators, { period = 'weekly', media = 'All', genre = 'All' } = {}, model = DEFAULT_MODEL) {
  const scope = { media, genre };
  const win = windowFor(period, ledger.horizon, false);
  const current = boardFor(ledger, creators, scope, period, win, model);
  const prevWin = windowFor(period, ledger.horizon, true);
  const prev = prevWin ? boardFor(ledger, creators, scope, period, prevWin, model) : null;
  const prevRank = {};
  if (prev) prev.entries.forEach((e) => (prevRank[e.creatorId] = e.rank));
  const entries = current.entries.map((e) => {
    let movement = null;
    if (prev) movement = prevRank[e.creatorId] ? { previousRank: prevRank[e.creatorId], delta: prevRank[e.creatorId] - e.rank, isNew: false } : { previousRank: null, delta: 0, isNew: true };
    return { ...e, movement };
  });
  const totalRaw = entries.reduce((s, e) => s + e.metrics.rawReads, 0);
  const totalValid = entries.reduce((s, e) => s + e.metrics.validBeforeCap, 0);
  return {
    period,
    media,
    genre,
    window: win,
    entries,
    excluded: current.excluded,
    meta: {
      modelVersion: model.version,
      rawReads: totalRaw,
      validReads: totalValid,
      invalidReads: Math.max(0, totalRaw - totalValid),
      heldReads: entries.reduce((s, e) => s + e.metrics.heldReads, 0),
    },
  };
}

// Genre names that appear in the ledger, in a stable order.
export function ledgerGenres(ledger) {
  const seen = [];
  ledger.works.forEach((w) => {
    if (!seen.includes(w.genre)) seen.push(w.genre);
  });
  return seen.sort();
}

// Human text for an exclusion reason.
export const EXCLUSION_TEXT = {
  'no-activity': 'no activity in this period',
  'too-few-readers': 'too few unique readers to rank fairly yet',
  'held-for-review': 'held back while unusual activity is reviewed',
};

export function describeExclusions(excluded) {
  if (!excluded || !excluded.length) return '';
  const counts = {};
  excluded.forEach((e) => (counts[e.reason] = (counts[e.reason] || 0) + 1));
  return Object.keys(counts)
    .map((reason) => `${counts[reason]} ${EXCLUSION_TEXT[reason] ? EXCLUSION_TEXT[reason] : reason}`)
    .join('; ');
}
