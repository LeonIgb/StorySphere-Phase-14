import { stories as sampleStories } from './stories';
import { creators as sampleCreators } from './creators';

// ILLUSTRATIVE SAMPLE EVENT LEDGER for the Phase 10 leaderboards.
//
// This is NOT real reader activity. It is a deterministic stand-in for the validated,
// aggregated event tables a real backend would keep (see src/services/leaderboardService.js
// for the production design). No random numbers are used, so the same data appears on
// every run and every device, and the automated tests can check exact invariants.
//
// Time is expressed as "day offsets": offset 1 is yesterday (the latest COMPLETED day),
// offset 2 is the day before, and so on. Because everything is relative, the sample data
// never goes stale. Today (offset 0) is never ranked, because a day is not final until it ends.
//
// What the ledger holds, per work (a story, or a creator's older works) per day:
//   raw          every read the client reported
//   valid        reads that survived validation (deduplicated, human, not the creator's own)
//   unique       distinct valid readers that day
//   completions  readers who finished the story/chapter run that day
//   reviews, comments, bookmarks, shares   meaningful engagement actions
//   sales, refunds                          verified purchases and refunded ones
//   follows, unfollows                      follows that started from this work, and churn
// Windows are sums over days, so All-time >= Monthly >= Weekly >= Daily by construction.
//
// Older works: each sample creator also has "earlier works" that are not in the sample
// catalog. They share the creator's genres and media types, so category filters stay
// consistent, and they give the all-time and monthly boards real history to rank.

export const HORIZON = 400; // days of history in the ledger

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic value in [0, 1) for a key.
function unit(key) {
  return (hash(key) % 100000) / 100000;
}

// Per-creator behaviour that makes the sample varied but explainable.
const BEHAVIOUR = {
  c1: { cadence: 3, quality: 0.04, invalid: 0.04 },
  c2: { cadence: 5, quality: 0.02, invalid: 0.05 },
  c3: { cadence: 4, quality: 0.05, invalid: 0.03 },
  c4: { cadence: 11, quality: 0.0, invalid: 0.05 },
  c5: { cadence: 4, quality: 0.07, invalid: 0.03 },
  c6: { cadence: 9, quality: -0.02, invalid: 0.06 },
  c7: { cadence: 8, quality: 0.01, invalid: 0.04 },
  c8: { cadence: 13, quality: 0.0, invalid: 0.05 },
};

const BASE_COMPLETION = { Written: 0.52, Image: 0.71, Video: 0.64, Mixed: 0.58 };

// Confirmed rule violations (after review). `day` is the day offset it was confirmed.
export const SAMPLE_VIOLATIONS = {
  c4: [{ day: 40, severity: 'major', code: 'paid-engagement', note: 'Bought reviews (confirmed after review)' }],
  c7: [{ day: 12, severity: 'minor', code: 'spam-comments', note: 'Repeated self-promotion in comments (confirmed after review)' }],
};

// Scripted fraud scenarios used to show the defences working.
export const SAMPLE_SCENARIOS = {
  // A bot farm hits one story on two days. Every one of those reads fails validation.
  botBurst: { creatorId: 'c6', workId: 's6', days: [3, 4], rawReads: 140000 },
  // An unusual spike that LOOKS valid (it passed every per-read check). The velocity cap holds the excess.
  validLookingSpike: { creatorId: 'c8', workId: 's9', day: 2, factor: 7 },
};

function makeWork(base) {
  return { ...base, rows: new Array(HORIZON + 1).fill(null) };
}

function fillRows(work, creator, reads, tau, floor) {
  const behaviour = BEHAVIOUR[creator.id] || { quality: 0, invalid: 0.04 };
  const life = work.publishedDaysAgo;
  const weights = [];
  let total = 0;
  for (let d = 1; d <= life; d += 1) {
    const age = life - d; // 0 on the day it was published
    const wk = 1 + 0.12 * Math.sin((d * 2 * Math.PI) / 7);
    const w = (Math.exp(-age / tau) + floor) * wk;
    weights[d] = w;
    total += w;
  }
  const completionBase =
    (BASE_COMPLETION[work.mediaType] || 0.55) + behaviour.quality + ((work.rating || 4.5) - 4.5) * 0.15 + (unit(`${work.id}:cr`) - 0.5) * 0.08;
  const premium = work.access === 'Premium';
  for (let d = 1; d <= life; d += 1) {
    const noise = 0.88 + 0.24 * unit(`${work.id}:${d}:n`);
    const valid = Math.max(0, Math.round((reads * weights[d] * noise) / total));
    const invalidShare = behaviour.invalid * (0.7 + 0.6 * unit(`${work.id}:${d}:i`));
    const raw = Math.round(valid / (1 - invalidShare));
    const unique = Math.round(valid * (0.6 + 0.12 * unit(`${work.id}:${d}:u`)));
    const completions = Math.round(unique * Math.min(0.95, Math.max(0.2, completionBase * (0.95 + 0.1 * unit(`${work.id}:${d}:c`)))));
    const q = 1 + ((work.rating || 4.5) - 4.5) * 0.4;
    const sales = premium ? Math.round(unique * 0.016 * q * (0.8 + 0.4 * unit(`${work.id}:${d}:s`))) : 0;
    const follows = Math.round(unique * 0.012 * q * (0.8 + 0.4 * unit(`${work.id}:${d}:f`)));
    work.rows[d] = {
      raw,
      valid,
      unique,
      completions,
      reviews: Math.round(unique * 0.010 * q * (0.8 + 0.4 * unit(`${work.id}:${d}:r`))),
      comments: Math.round(unique * 0.028 * q * (0.8 + 0.4 * unit(`${work.id}:${d}:m`))),
      bookmarks: Math.round(unique * 0.07 * q * (0.8 + 0.4 * unit(`${work.id}:${d}:b`))),
      shares: Math.round(unique * 0.022 * q * (0.8 + 0.4 * unit(`${work.id}:${d}:h`))),
      sales,
      refunds: Math.round(sales * 0.04),
      follows,
      unfollows: Math.round(follows * 0.18),
    };
  }
}

function applyScenarios(works) {
  const { botBurst, validLookingSpike } = SAMPLE_SCENARIOS;
  const burstWork = works.find((w) => w.id === botBurst.workId);
  botBurst.days.forEach((d) => {
    if (burstWork && burstWork.rows[d]) burstWork.rows[d].raw += botBurst.rawReads; // all invalid: valid is unchanged
  });
  const spikeWork = works.find((w) => w.id === validLookingSpike.workId);
  const row = spikeWork && spikeWork.rows[validLookingSpike.day];
  if (row) {
    const f = validLookingSpike.factor;
    row.valid = Math.round(row.valid * f);
    row.raw = Math.round(row.raw * f);
    row.unique = Math.round(row.unique * f);
    row.completions = Math.round(row.completions * 1.2);
    row.follows = Math.round(row.follows * 1.5);
  }
}

// Publishing events: each creator publishes on a steady cadence (a chapter or a story),
// attached to a work that existed on that day. Stories also publish on their first day.
function publishEvents(creator, works) {
  const behaviour = BEHAVIOUR[creator.id] || { cadence: 10 };
  const mine = works.filter((w) => w.creatorId === creator.id);
  const events = [];
  mine.forEach((w) => {
    if (!w.archived) events.push({ day: w.publishedDaysAgo, workId: w.id });
  });
  const phase = 1 + (hash(`${creator.id}:phase`) % behaviour.cadence);
  for (let d = phase; d <= HORIZON; d += behaviour.cadence) {
    const active = mine.filter((w) => w.publishedDaysAgo >= d);
    if (active.length) {
      const pick = active[hash(`${creator.id}:${d}`) % active.length];
      events.push({ day: d, workId: pick.id });
    }
  }
  return events;
}

let cached = null;

export function buildSampleLedger() {
  if (cached) return cached;
  const works = [];
  sampleCreators.forEach((creator) => {
    const mine = sampleStories.filter((s) => s.creatorId === creator.id);
    mine.forEach((s) => {
      const work = makeWork({
        id: s.id,
        creatorId: creator.id,
        title: s.title,
        genre: s.genre,
        mediaType: s.mediaType,
        access: s.access,
        rating: s.rating,
        archived: false,
        publishedDaysAgo: Math.max(1, s.daysAgo),
      });
      fillRows(work, creator, s.likes * 13, 10, 0.25);
      works.push(work);
    });
    const pairs = [];
    mine.forEach((s) => {
      if (!pairs.some((p) => p.genre === s.genre && p.mediaType === s.mediaType)) {
        pairs.push({ genre: s.genre, mediaType: s.mediaType, access: s.access, rating: s.rating });
      }
    });
    pairs.forEach((p, i) => {
      const work = makeWork({
        id: `${creator.id}-earlier-${i + 1}`,
        creatorId: creator.id,
        title: `${creator.name}: earlier ${p.genre} works`,
        genre: p.genre,
        mediaType: p.mediaType,
        access: p.access,
        rating: p.rating,
        archived: true,
        publishedDaysAgo: 120 + (hash(`${creator.id}:${i}:age`) % 240),
      });
      fillRows(work, creator, (creator.followers * 90) / pairs.length, 150, 0.5);
      works.push(work);
    });
  });
  applyScenarios(works);
  const creatorEvents = {};
  sampleCreators.forEach((c) => {
    creatorEvents[c.id] = { publishes: publishEvents(c, works), violations: SAMPLE_VIOLATIONS[c.id] || [] };
  });
  cached = { horizon: HORIZON, works, creatorEvents };
  return cached;
}
