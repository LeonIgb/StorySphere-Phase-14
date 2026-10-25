import { creators as sampleCreators } from '../data/creators';
import { stories } from '../data/stories';
import { content } from '../data/content';
import { buildSampleLedger } from '../data/leaderboardSample';
import { DEFAULT_LEVEL_MODEL, evaluateProgress, inputFromLedger } from '../utils/levels';

// Levels and achievements data layer (prototype).
//
// What is real here: the signed-in storyteller's own stories (published, chapters, publishing
// weeks, series they mark as finished) are read from the creator studio on this device and
// persisted by LevelsContext.
// What is sample data: the progress of the eight sample storytellers comes from the same
// deterministic validated-event ledger as the Phase 10 leaderboards. It is NOT real reader
// activity. Levels use lifetime totals and never read leaderboard ranks.
//
// ======================================================================================
// PRODUCTION DESIGN: awarding XP and badges from validated server-side events
// ======================================================================================
// 1. The client never awards anything. It cannot send "I earned a badge" or "I have 500 XP".
//    The server derives progress from its own validated event log (the same pipeline that
//    feeds leaderboards: attested, deduplicated, bot-scored, payment-provider confirmed).
// 2. Progress is DERIVED, not accumulated. A scheduled job recomputes each storyteller's XP
//    from validated aggregates with a versioned rule set, so replaying an action (publish and
//    unpublish, re-reading, re-posting) cannot add XP, and a rule change can be re-run.
// 3. Badge awards are written once, idempotently, with the rule version, the evidence window
//    and a timestamp, to an append-only audit table. Awards are revocable: when fraud is
//    found, the underlying events are invalidated, progress is recomputed and the award is
//    withdrawn with a note. Appeals go through the same review queue as leaderboard holds.
// 4. Anti-abuse rules (all enforced server-side): qualifying-content gates (minimum length,
//    duplicate detection), one rewarded publication per day, caps on every XP source,
//    reads counted only when validated, engagement counted only per "engaged week" with
//    enough distinct readers and a low invalid share, sales counted only after payment
//    provider confirmation and refund window, held-for-review storytellers earn no audience
//    XP, and confirmed rule violations reduce audience XP for a fading period.
// 5. Delivery: a level-up or badge is a notification created by the awarding job, so the app
//    only displays it. Public level and badge data is exposed through a cached read API;
//    private evidence (raw events, reader ids) is never exposed.
// 6. Levels stay separate from rankings: levels never read another storyteller's numbers;
//    leaderboards never read levels. Any reward tied to a rank is paid from finalised boards,
//    and any reward tied to a level is paid from the awards table.
// ======================================================================================

let failNext = false;
const cache = {};

export const levelsProvider = {
  setFailNext(value) {
    failNext = Boolean(value);
  },
  getFailNext() {
    return failNext;
  },
  model: DEFAULT_LEVEL_MODEL,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The chaptered stories a sample storyteller has in the sample catalog.
function catalogFor(creatorId) {
  return stories
    .filter((s) => s.creatorId === creatorId)
    .map((s) => ({
      id: s.id,
      status: s.status,
      chapters: content[s.id] && Array.isArray(content[s.id].chapters) ? content[s.id].chapters.length : 0,
    }));
}

// Sample storytellers a person can view progress for.
export function sampleSubjects() {
  return sampleCreators.map((c) => ({ id: c.id, name: c.name, handle: c.handle, color: c.color, verified: c.verified, avatarUri: c.avatarUri }));
}

export function sampleProgress(creatorId, model = levelsProvider.model) {
  const key = `${model.version}:${creatorId}`;
  if (!cache[key]) {
    const input = inputFromLedger(buildSampleLedger(), creatorId, catalogFor(creatorId));
    cache[key] = { input, result: evaluateProgress(input, model) };
  }
  return cache[key];
}

// Resolves with a sample storyteller's progress after a short simulated delay. Rejects once when
// the developer "fail next load" switch is armed.
export async function fetchSampleProgress(creatorId) {
  await delay(450);
  if (failNext) {
    failNext = false;
    throw new Error('We could not load achievements. Check your connection and try again.');
  }
  if (!sampleCreators.some((c) => c.id === creatorId)) throw new Error('This storyteller was not found.');
  return { ...sampleProgress(creatorId), sample: true };
}
