import { creators as sampleCreators } from '../data/creators';
import { buildSampleLedger, SAMPLE_VIOLATIONS } from '../data/leaderboardSample';
import { DEFAULT_MODEL, computeLeaderboard, ledgerGenres } from '../utils/leaderboard';

// Leaderboard data layer (prototype).
//
// THIS IS A DEMONSTRATION. The ledger behind it is deterministic SAMPLE data
// (src/data/leaderboardSample.js), not real reader activity, and the scores are not a
// measure of story quality. Screens call `fetchLeaderboard`; nothing else knows where the
// numbers come from, so the source can be swapped for a server later.
//
// ======================================================================================
// PRODUCTION DESIGN: rankings computed from validated SERVER-SIDE events
// ======================================================================================
// Principle: the client never reports a score, a rank or a count. It reports that something
// happened; the server decides whether it counts. Ranks are derived data that can be
// recomputed from the event log at any time.
//
// 1. Event capture (trusted boundary)
//    - Clients send small signed events (read_started, read_progress, read_completed,
//      review_posted, comment_posted, bookmark, share, follow, purchase_intent) over TLS
//      with the user's session token, a per-event idempotency key and a device attestation
//      token (Play Integrity / App Attest). Unauthenticated or unattested events are
//      accepted into a low-trust lane that never counts toward rankings.
//    - Purchases are NEVER client-reported. A sale counts only when the payment provider's
//      server-to-server webhook confirms it; refunds and chargebacks arrive the same way
//      and reverse the sale. Sales are finalised after the refund window closes.
//    - A "read" is a server-side judgement from a sequence of progress events (minimum
//      dwell time, scroll/playback continuity), not a page view.
// 2. Validation pipeline (per event, before anything is counted)
//    - authenticate, authorise, schema-check, deduplicate by idempotency key;
//    - one counted read per reader per work per day, however many times it is opened;
//    - exclude the creator's own accounts, linked accounts, and known test accounts;
//    - rate limits per account, device, IP range and ASN; reject impossible speeds
//      (a 5,000-word chapter "finished" in seconds);
//    - bot and farm scoring: headless/emulator signals, datacenter IPs, device and
//      account clustering, new-account bursts, synchronised timing across accounts;
//    - engagement quality: only reviews/comments that pass spam and duplicate checks and
//      come from accounts with real history count; reciprocal "follow-for-follow" and
//      paid-engagement rings are detected from the follow/engagement graph;
//    - every event ends up as valid, invalid(reason) or held-for-review. Invalid events
//      are kept for audit but never counted.
// 3. Storage and aggregation
//    - append-only event log (for example Kafka -> object storage) is the source of truth;
//    - a stream job writes per (creator, work, day) aggregates: raw, valid, unique,
//      completions, engagement actions, verified sales, refunds, follows, unfollows;
//      unique readers use per-day sets/HyperLogLog, with exact counts for the final board;
//    - the day's aggregates are FINAL only after a delay (for example 48 hours) so late
//      events, appeals and chargebacks settle. Daily/weekly/monthly boards therefore
//      rank COMPLETED days only (this prototype does the same: today is never ranked).
// 4. Scoring job
//    - a scheduled batch job reads the aggregates and applies a VERSIONED model
//      (see src/utils/leaderboard.js). The model version is stored with every board so a
//      change of weights is auditable and reversible. New versions run in shadow mode
//      first and are compared against the live board before they replace it.
//    - velocity caps, smoothing and per-metric caps bound the influence of any single
//      account or day. Held reads are released if review finds them genuine.
//    - compliance penalties come from the trust-and-safety case system (confirmed
//      violations only, never from automated suspicion alone) and fade over time.
// 5. Serving
//    - results are materialised per (period, category, genre) into a read-optimised table
//      and served through a cached, paginated API. Clients cannot request arbitrary
//      computations. The API returns display data only (rank, public profile, score,
//      public metrics), never raw user ids or per-reader data.
// 6. Integrity and governance
//    - published methodology, an appeals process, and a human review queue for
//      held-for-review creators; rank changes above a threshold are checked before publishing;
//    - retroactive correction: when fraud is found, events are invalidated and the
//      affected boards are recomputed, with the correction noted;
//    - privacy: aggregate counts only, retention limits on raw events, and no exposure of
//      individual readers.
// 7. Abuse of the leaderboard itself
//    - rank-based rewards are paid only on finalised boards;
//    - anomaly alerts on sudden jumps, concentration of reads in few accounts, and
//      engagement with no matching completion pattern.
// ======================================================================================

let failNext = false;
let creatorsForBoards = sampleCreators;

export const leaderboardProvider = {
  // Developer control: make the next load fail once (to see the error state).
  setFailNext(value) {
    failNext = Boolean(value);
  },
  getFailNext() {
    return failNext;
  },
  model: DEFAULT_MODEL,
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test hook: replace the creators the boards are built for.
export function setBoardCreators(list) {
  creatorsForBoards = list || sampleCreators;
}

// Resolves with a ranked board. Rejects (once) when the dev "fail next load" switch is armed.
export async function fetchLeaderboard({ period = 'weekly', media = 'All', genre = 'All' } = {}) {
  await delay(600);
  if (failNext) {
    failNext = false;
    throw new Error('We could not load the leaderboard. Check your connection and try again.');
  }
  const ledger = buildSampleLedger();
  const board = computeLeaderboard(ledger, creatorsForBoards, { period, media, genre }, leaderboardProvider.model);
  return {
    ...board,
    genres: ledgerGenres(ledger),
    sample: true,
    // Confirmed violations are public facts in the sample (shown in the score breakdown).
    violations: SAMPLE_VIOLATIONS,
  };
}
