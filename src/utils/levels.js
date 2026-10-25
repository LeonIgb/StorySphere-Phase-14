import { DEFAULT_MODEL as BOARD_MODEL, dailySeries, velocityFactors, complianceMultiplier, integrityMultiplier } from './leaderboard';
import { chapterIsEmpty, toParagraphs, workCounts } from './creator';
import { wordCount } from './reading';

// Storyteller levels and achievements (Phase 11). Pure logic, no React and no I/O.
//
// LEVELS ARE NOT LEADERBOARD RANKS.
//   - A leaderboard (Phase 10) ranks storytellers against each other over a chosen period
//     (a day, a week...). It moves up and down.
//   - A level is long-term progression for one storyteller, measured against fixed goals. It
//     never looks at anyone else's numbers and never uses a rank.
//   Nothing in this file imports ranking code except the shared building blocks that validate
//   reads (velocity cap, integrity and compliance multipliers), so both systems judge
//   "was this a genuine read?" the same way.
//
// HOW XP WORKS (illustrative, configurable in DEFAULT_LEVEL_MODEL)
//   XP is DERIVED from the current validated state, not accumulated from events. That makes it
//   impossible to farm by repeating an action (publish and unpublish, open the same story
//   again, post the same comment): the same state always gives the same XP.
//   Sources, each with a cap so no single source can carry a level:
//     publish      per qualifying publication (quality gate, duplicate check, one per day)
//     chapters     per qualifying published chapter
//     series       per series marked finished (3+ qualifying chapters, still published)
//     reads        genuine (validated) reads, square-root scaled to a pool
//     readers      unique genuine readers, square-root scaled to a pool
//     engagement   per "engaged week": enough readers, meaningful engagement per reader,
//                  and a low invalid share that week
//     consistency  per week in the longest run of consecutive publishing weeks
//     sales        verified net sales (after refunds), square-root scaled to a pool
//   Audience-based sources (reads, readers, engagement, sales) are multiplied by the same
//   integrity and compliance multipliers the leaderboard uses, and are withheld while a
//   storyteller is held for review.
//
// WHAT IS NOT REWARDED: raw or invalid reads, held (spike) reads, likes/engagement counts
//   without readers behind them, empty or tiny stories, duplicate stories, several
//   publications on one day, and anything in the sample that an integrity rule rejected.

export const DEFAULT_LEVEL_MODEL = {
  version: 'illustrative-levels-v1',
  levels: [
    { level: 1, name: 'Newcomer', xp: 0 },
    { level: 2, name: 'Apprentice', xp: 100 },
    { level: 3, name: 'Storyteller', xp: 250 },
    { level: 4, name: 'Wordsmith', xp: 450 },
    { level: 5, name: 'Weaver', xp: 700 },
    { level: 6, name: 'Chronicler', xp: 1000 },
    { level: 7, name: 'Luminary', xp: 1400 },
    { level: 8, name: 'Laureate', xp: 1900 },
    { level: 9, name: 'Sage', xp: 2500 },
    { level: 10, name: 'Legend', xp: 3100 },
  ],
  xp: {
    publish: { label: 'Publishing stories', perItem: 40, maxItems: 15 },
    chapters: { label: 'Published chapters', perItem: 4, maxItems: 50 },
    series: { label: 'Finished series', perItem: 150, maxItems: 4 },
    reads: { label: 'Genuine reads', pool: 700, ref: 12000000, curve: 0.5 },
    readers: { label: 'Unique readers', pool: 500, ref: 6000000, curve: 0.5 },
    engagement: { label: 'Sustained engagement', perWeek: 40, maxWeeks: 10 },
    consistency: { label: 'Consistent publishing', perWeek: 25, maxWeeks: 12 },
    sales: { label: 'Verified sales', pool: 400, ref: 30000, curve: 0.5 },
  },
  // Quality gates for the signed-in storyteller's own stories.
  gates: {
    minWords: 200, // Written story, total
    minChapterWords: 100, // a Written chapter counts toward chapter XP and series
    minBlocks: 3, // Mixed story
    minChapterBlocks: 2, // a Mixed chapter counts
    minImages: 3, // Image story
    seriesMinChapters: 3,
    maxPublicationsPerDay: 1,
  },
  engagedWeek: { minUnique: 20000, minRate: 0.3, maxInvalidShare: 0.1 },
  integrity: BOARD_MODEL.integrity,
  compliance: BOARD_MODEL.compliance,
  // Badge tiers. metric: which progress number the badge reads. track groups them in the UI.
  badges: [
    { id: 'first-story', track: 'publish', metric: 'published', target: 1, tier: 'bronze', icon: 'create', title: 'First story', description: 'Publish your first qualifying story.' },
    { id: 'shelf-3', track: 'publish', metric: 'published', target: 3, tier: 'silver', icon: 'library', title: 'A growing shelf', description: 'Publish 3 qualifying stories.' },
    { id: 'shelf-10', track: 'publish', metric: 'published', target: 10, tier: 'gold', icon: 'albums', title: 'Prolific', description: 'Publish 10 qualifying stories.' },
    { id: 'series-1', track: 'series', metric: 'seriesFinished', target: 1, tier: 'bronze', icon: 'flag', title: 'Series finished', description: 'Finish a series of 3 or more chapters.' },
    { id: 'series-3', track: 'series', metric: 'seriesFinished', target: 3, tier: 'gold', icon: 'ribbon', title: 'Finisher', description: 'Finish 3 series.' },
    { id: 'readers-10k', track: 'readers', metric: 'readers', target: 10000, tier: 'bronze', icon: 'people', title: '10,000 readers', description: '10,000 genuine unique readers.' },
    { id: 'readers-100k', track: 'readers', metric: 'readers', target: 100000, tier: 'silver', icon: 'people', title: '100,000 readers', description: '100,000 genuine unique readers.' },
    { id: 'readers-500k', track: 'readers', metric: 'readers', target: 500000, tier: 'gold', icon: 'people', title: '500,000 readers', description: '500,000 genuine unique readers.' },
    { id: 'readers-2m', track: 'readers', metric: 'readers', target: 2000000, tier: 'platinum', icon: 'earth', title: '2 million readers', description: '2,000,000 genuine unique readers.' },
    { id: 'engaged-4', track: 'engagement', metric: 'engagedStreak', target: 4, tier: 'bronze', icon: 'chatbubbles', title: 'Steady conversation', description: '4 engaged weeks in a row.' },
    { id: 'engaged-8', track: 'engagement', metric: 'engagedStreak', target: 8, tier: 'silver', icon: 'chatbubbles', title: 'Lasting conversation', description: '8 engaged weeks in a row.' },
    { id: 'engaged-12', track: 'engagement', metric: 'engagedStreak', target: 12, tier: 'gold', icon: 'chatbubbles', title: 'Devoted audience', description: '12 engaged weeks in a row.' },
    { id: 'consistent-4', track: 'consistency', metric: 'publishStreak', target: 4, tier: 'bronze', icon: 'calendar', title: 'Four-week rhythm', description: 'Publish in 4 consecutive weeks.' },
    { id: 'consistent-8', track: 'consistency', metric: 'publishStreak', target: 8, tier: 'silver', icon: 'calendar', title: 'Eight-week rhythm', description: 'Publish in 8 consecutive weeks.' },
    { id: 'consistent-12', track: 'consistency', metric: 'publishStreak', target: 12, tier: 'gold', icon: 'calendar', title: 'Twelve-week rhythm', description: 'Publish in 12 consecutive weeks.' },
    { id: 'sales-100', track: 'sales', metric: 'sales', target: 100, tier: 'bronze', icon: 'cash', title: '100 verified sales', description: '100 verified sales after refunds.' },
    { id: 'sales-1000', track: 'sales', metric: 'sales', target: 1000, tier: 'silver', icon: 'cash', title: '1,000 verified sales', description: '1,000 verified sales after refunds.' },
    { id: 'sales-5000', track: 'sales', metric: 'sales', target: 5000, tier: 'gold', icon: 'cash', title: '5,000 verified sales', description: '5,000 verified sales after refunds.' },
  ],
};

export const TRACKS = [
  { key: 'publish', label: 'First stories', icon: 'create-outline' },
  { key: 'series', label: 'Series milestones', icon: 'flag-outline' },
  { key: 'readers', label: 'Genuine readers', icon: 'people-outline' },
  { key: 'engagement', label: 'Sustained engagement', icon: 'chatbubbles-outline' },
  { key: 'consistency', label: 'Consistent publishing', icon: 'calendar-outline' },
  { key: 'sales', label: 'Verified sales', icon: 'cash-outline' },
];

// Why a track may be unavailable for a subject.
export const UNSUPPORTED_TEXT = {
  readers: 'Needs validated reader data. Stories you publish in this demo have no real readers, so nothing here can be earned yet.',
  engagement: 'Needs validated reader data. Stories you publish in this demo have no real readers, so nothing here can be earned yet.',
  sales: 'The demo has no way to sell your stories, so verified sales are not available for your account. Sample storytellers show how it works.',
};

export function makeLevelModel(overrides = {}) {
  const merged = { ...DEFAULT_LEVEL_MODEL };
  Object.keys(overrides).forEach((key) => {
    const base = DEFAULT_LEVEL_MODEL[key];
    merged[key] = base && typeof base === 'object' && !Array.isArray(base) ? { ...base, ...overrides[key] } : overrides[key];
  });
  return merged;
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
// Power curve: steady gains all the way up (a log curve saturates and stops telling large creators apart).
const volume = (x, ref, curve = 0.5) => Math.pow(clamp(Math.max(0, x) / ref, 0, 1), curve);

// ------------------------------------------------------------------ streaks

// Longest and current run of consecutive week indexes. `current` counts only when the most
// recent week is this week or last week (a streak that lapsed is not "current").
export function streaks(weekIndexes) {
  const weeks = [...new Set(weekIndexes)].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  let prev = null;
  weeks.forEach((w) => {
    run = prev !== null && w === prev + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = w;
  });
  // Current = the run containing the most recent week, if that week is recent (index <= 1).
  let current = 0;
  if (weeks.length && weeks[0] <= 1) {
    current = 1;
    for (let i = 1; i < weeks.length && weeks[i] === weeks[i - 1] + 1; i += 1) current += 1;
  }
  return { longest, current };
}

const weekOfDay = (day) => Math.floor(Math.max(0, day) / 7);

// ------------------------------------------------------------------ progress input
// The pure evaluator reads one plain object:
//   {
//     published: number,            qualifying stories
//     chapters: number,             qualifying published chapters
//     publishDays: number[],        day offsets (days ago) of qualifying publications
//     series: { eligible, finished },
//     audience: null | { validReads, uniqueReaders, invalidShare, engagedWeeks: number[], violations: [] },
//     sales:    null | { netSales },
//   }
// `audience: null` means "this subject has no validated reader data" (the signed-in demo
// storyteller). Those tracks show as unavailable instead of as zero, so nobody is told they
// failed at something that cannot be measured.

// Build the input for the signed-in storyteller from their own local works.
//   works:    the studio's works (see src/utils/creator.js)
//   finished: { [workId]: ISO date } series the storyteller marked as finished
export function inputFromWorks(works, finished = {}, now = new Date(), model = DEFAULT_LEVEL_MODEL) {
  const g = model.gates;
  const DAY = 86400000;
  const nowMs = now.getTime();
  const dayKey = (iso) => Math.floor((nowMs - new Date(iso).getTime()) / DAY);

  const published = (works || [])
    .filter((w) => w.status === 'published' && w.publishedAt && !Number.isNaN(new Date(w.publishedAt).getTime()))
    .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

  const seenPrint = new Set();
  const perDay = {};
  const qualified = [];
  published.forEach((w) => {
    const counts = workCounts(w);
    let ok = false;
    if (w.mediaType === 'Written') ok = counts.words >= g.minWords;
    else if (w.mediaType === 'Mixed') ok = counts.blocks >= g.minBlocks;
    else if (w.mediaType === 'Image') ok = (w.images || []).filter((i) => i.uri).length >= g.minImages;
    else if (w.mediaType === 'Video') ok = Boolean(w.video && w.video.uri);
    if (!ok) return;
    const first = (w.chapters || [])[0];
    const body = first ? (first.text || (first.blocks || []).map((b) => b.text || b.uri || '').join(' ')) : (w.images && w.images[0] && w.images[0].uri) || (w.video && w.video.uri) || '';
    const print = `${String(w.title || '').trim().toLowerCase()}|${String(body).trim().toLowerCase().slice(0, 120)}`;
    if (seenPrint.has(print)) return; // duplicate of an earlier story
    const day = dayKey(w.publishedAt);
    perDay[day] = (perDay[day] || 0) + 1;
    if (perDay[day] > g.maxPublicationsPerDay) return; // one rewarded publication per day
    seenPrint.add(print);
    qualified.push({ work: w, day });
  });

  let chapters = 0;
  let seriesEligible = 0;
  let seriesFinished = 0;
  qualified.forEach(({ work }) => {
    if (work.mediaType !== 'Written' && work.mediaType !== 'Mixed') return;
    const good = (work.chapters || []).filter((c) => {
      if (chapterIsEmpty(work, c)) return false;
      if (work.mediaType === 'Written') return wordCount(toParagraphs(c.text)) >= g.minChapterWords;
      return (c.blocks || []).filter((b) => (b.type === 'text' ? toParagraphs(b.text).length > 0 : Boolean(b.uri))).length >= g.minChapterBlocks;
    }).length;
    chapters += good;
    if (good >= g.seriesMinChapters) {
      seriesEligible += 1;
      if (finished[work.id]) seriesFinished += 1;
    }
  });

  return {
    published: qualified.length,
    chapters,
    publishDays: qualified.map((q) => q.day),
    series: { eligible: seriesEligible, finished: seriesFinished },
    audience: null,
    sales: null,
    // For the UI: which stories can be marked finished.
    seriesCandidates: qualified
      .filter(({ work }) => (work.mediaType === 'Written' || work.mediaType === 'Mixed') && (work.chapters || []).length >= g.seriesMinChapters)
      .map(({ work }) => ({ id: work.id, title: work.title, chapters: (work.chapters || []).length, finished: Boolean(finished[work.id]) })),
  };
}

// Which of a work's chapters are good enough to count (used by the UI to explain a refusal).
export function canFinishSeries(work, model = DEFAULT_LEVEL_MODEL) {
  const input = inputFromWorks([work], {}, new Date(Date.now() + 86400000 * 0), model);
  return input.series.eligible > 0;
}

// Build the input for a sample storyteller from the validated sample ledger.
//   catalog: [{ id, status: 'Completed'|'Ongoing', chapters: number }] this storyteller's chaptered stories
export function inputFromLedger(ledger, creatorId, catalog = [], boardModel = BOARD_MODEL, model = DEFAULT_LEVEL_MODEL) {
  const works = ledger.works.filter((w) => w.creatorId === creatorId);
  const events = ledger.creatorEvents[creatorId] || { publishes: [], violations: [] };
  const series = dailySeries(works, ledger.horizon);
  const win = { from: 1, to: ledger.horizon };
  const { factors } = velocityFactors(series, win, boardModel);
  const ew = boardModel.engagementWeights;
  const weekly = {};
  let raw = 0;
  let rawValid = 0;
  let valid = 0;
  let unique = 0;
  let sales = 0;
  for (let d = 1; d <= ledger.horizon; d += 1) {
    const day = series[d];
    if (!day) continue;
    const f = factors[d] || 1; // held spike reads are scaled down, exactly as on the leaderboard
    const w = Math.floor((d - 1) / 7);
    const b = weekly[w] || (weekly[w] = { raw: 0, valid: 0, unique: 0, actions: 0 });
    const actions = (day.reviews * ew.reviews + day.comments * ew.comments + day.bookmarks * ew.bookmarks + day.shares * ew.shares) * f;
    b.raw += day.raw;
    b.valid += day.valid;
    b.unique += day.unique * f;
    b.actions += actions;
    raw += day.raw;
    rawValid += day.valid;
    valid += day.valid * f;
    unique += day.unique * f;
    sales += (day.sales - day.refunds) * f;
  }
  const ewk = model.engagedWeek;
  const engagedWeeks = Object.keys(weekly)
    .map(Number)
    .filter((w) => {
      const b = weekly[w];
      if (b.unique < ewk.minUnique) return false;
      if (b.actions / b.unique < ewk.minRate) return false;
      return (b.raw > 0 ? (b.raw - b.valid) / b.raw : 0) <= ewk.maxInvalidShare;
    });
  const publishDays = [...new Set(events.publishes.map((p) => p.day))];
  const chaptered = catalog.filter((s) => s.chapters >= model.gates.seriesMinChapters);
  const priced = works.some((w) => w.access === 'Premium');
  return {
    published: works.length,
    chapters: catalog.reduce((n, s) => n + s.chapters, 0),
    publishDays,
    series: { eligible: chaptered.length, finished: chaptered.filter((s) => s.status === 'Completed').length },
    audience: {
      validReads: Math.round(valid),
      uniqueReaders: Math.round(unique),
      invalidShare: raw > 0 ? clamp((raw - rawValid) / raw, 0, 1) : 0,
      engagedWeeks,
      violations: events.violations || [],
    },
    sales: priced ? { netSales: Math.max(0, Math.round(sales)) } : null,
  };
}

// ------------------------------------------------------------------ evaluation

export function levelFor(xp, model = DEFAULT_LEVEL_MODEL) {
  let current = model.levels[0];
  model.levels.forEach((l) => {
    if (xp >= l.xp) current = l;
  });
  const next = model.levels.find((l) => l.level === current.level + 1) || null;
  const span = next ? next.xp - current.xp : 0;
  return {
    level: current.level,
    name: current.name,
    xpAtLevel: current.xp,
    next,
    xpToNext: next ? Math.max(0, next.xp - xp) : 0,
    progress: next ? clamp((xp - current.xp) / span, 0, 1) : 1,
  };
}

// earnedBefore: { [badgeId]: ISO date } badges the storyteller already unlocked. Once unlocked, a
// badge stays (an achievement is history), unless audience badges are withheld for review.
export function evaluateProgress(input, model = DEFAULT_LEVEL_MODEL, earnedBefore = {}) {
  const x = model.xp;
  const aud = input.audience;
  const publishStreak = streaks(input.publishDays.map(weekOfDay));
  const engagedStreak = aud ? streaks(aud.engagedWeeks) : { longest: 0, current: 0 };

  // Audience gate: the same integrity and compliance judgement as the leaderboard.
  let audienceFactor = 1;
  const holds = [];
  let heldForReview = false;
  let complianceApplied = [];
  if (aud) {
    const integrity = integrityMultiplier(aud.invalidShare, { integrity: model.integrity });
    const compliance = complianceMultiplier(aud.violations, { from: 1, to: 1 }, { compliance: model.compliance });
    complianceApplied = compliance.applied;
    heldForReview = aud.invalidShare > model.integrity.holdAt;
    audienceFactor = heldForReview ? 0 : integrity * compliance.multiplier;
    if (heldForReview) holds.push('Audience XP and badges are paused while unusual reading activity is reviewed.');
    else {
      if (integrity < 1) holds.push(`Audience XP is reduced (x${integrity.toFixed(2)}) because some reads failed validation.`);
      if (compliance.multiplier < 1) holds.push(`Audience XP is reduced (x${compliance.multiplier.toFixed(2)}) while a confirmed rule violation fades.`);
    }
  }
  const metrics = {
    published: input.published,
    seriesFinished: input.series.finished,
    readers: aud ? aud.uniqueReaders : 0,
    engagedStreak: engagedStreak.longest,
    publishStreak: publishStreak.longest,
    sales: input.sales ? input.sales.netSales : 0,
  };

  const parts = [];
  const add = (key, raw, xp, max, note) => parts.push({ key, label: x[key].label, raw, xp: Math.round(xp), max, note });
  add('publish', input.published, Math.min(input.published, x.publish.maxItems) * x.publish.perItem, x.publish.maxItems * x.publish.perItem, `${x.publish.perItem} XP per qualifying story, up to ${x.publish.maxItems}`);
  add('chapters', input.chapters, Math.min(input.chapters, x.chapters.maxItems) * x.chapters.perItem, x.chapters.maxItems * x.chapters.perItem, `${x.chapters.perItem} XP per qualifying chapter, up to ${x.chapters.maxItems}`);
  add('series', input.series.finished, Math.min(input.series.finished, x.series.maxItems) * x.series.perItem, x.series.maxItems * x.series.perItem, `${x.series.perItem} XP per finished series, up to ${x.series.maxItems}`);
  add('consistency', publishStreak.longest, Math.min(publishStreak.longest, x.consistency.maxWeeks) * x.consistency.perWeek, x.consistency.maxWeeks * x.consistency.perWeek, `${x.consistency.perWeek} XP per week of your longest publishing run, up to ${x.consistency.maxWeeks}`);
  add('reads', aud ? aud.validReads : 0, aud ? x.reads.pool * volume(aud.validReads, x.reads.ref, x.reads.curve) * audienceFactor : 0, x.reads.pool, 'Square-root scaled; only validated reads count');
  add('readers', aud ? aud.uniqueReaders : 0, aud ? x.readers.pool * volume(aud.uniqueReaders, x.readers.ref, x.readers.curve) * audienceFactor : 0, x.readers.pool, 'Square-root scaled; unique genuine readers');
  add('engagement', engagedStreak.longest, aud ? Math.min(aud.engagedWeeks.length, x.engagement.maxWeeks) * x.engagement.perWeek * audienceFactor : 0, x.engagement.maxWeeks * x.engagement.perWeek, `${x.engagement.perWeek} XP per engaged week, up to ${x.engagement.maxWeeks}`);
  add('sales', metrics.sales, input.sales ? x.sales.pool * volume(input.sales.netSales, x.sales.ref, x.sales.curve) * audienceFactor : 0, x.sales.pool, 'Square-root scaled; verified sales after refunds');
  const xp = parts.reduce((s, p) => s + p.xp, 0);

  const supported = { publish: true, series: true, consistency: true, readers: Boolean(aud), engagement: Boolean(aud), sales: Boolean(input.sales) };
  const badges = model.badges.map((b) => {
    const current = metrics[b.metric];
    const isSupported = supported[b.track];
    const withheld = isSupported && heldForReview && ['readers', 'engagement', 'sales'].includes(b.track);
    const earned = isSupported && !withheld && (current >= b.target || Boolean(earnedBefore[b.id]));
    return { ...b, current, fraction: clamp(current / b.target, 0, 1), supported: isSupported, withheld, earned, unlockedAt: earnedBefore[b.id] || null };
  });

  const goals = badges
    .filter((b) => b.supported && !b.withheld && !b.earned)
    .sort((a, b) => b.fraction - a.fraction || a.target - b.target)
    .filter((b, i, arr) => arr.findIndex((o) => o.track === b.track) === i) // one goal per track
    .slice(0, 3);

  return {
    xp,
    parts,
    level: levelFor(xp, model),
    metrics,
    streaks: { publish: publishStreak, engagement: engagedStreak },
    badges,
    earnedCount: badges.filter((b) => b.earned).length,
    goals,
    holds,
    heldForReview,
    complianceApplied,
    supported,
    modelVersion: model.version,
  };
}

// Human text for a badge's progress, e.g. "2 of 3".
export function progressText(badge) {
  const unit = badge.metric === 'engagedStreak' || badge.metric === 'publishStreak' ? ' weeks' : '';
  const fmt = (n) => (n >= 1000 ? n.toLocaleString('en-US') : String(n));
  return `${fmt(Math.min(badge.current, badge.target))} of ${fmt(badge.target)}${unit}`;
}
