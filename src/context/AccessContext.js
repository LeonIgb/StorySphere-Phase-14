import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { accessProvider, totalSpentCents } from '../services/accessService';
import { bumpCatalog } from '../services/catalog';
import { useAccount } from './AccountContext';
import LoadingState from '../components/LoadingState';
import ScreenContainer from '../components/ScreenContainer';

// Access state for the signed-in account: its purchase history and the entitlements the access
// service has VERIFIED. This context never decides what content a person may see. The service
// layer does that when it returns a story (see storyService.fetchStory), and the screens read the
// result from the story itself (`story.entitled`). Here we hold the lists the UI shows (history,
// "Owned" badges, the Purchased tab), and send the actions to the access provider.
//
// After any change (purchase, refund, settlement, developer override) the story catalog is
// bumped, so every open screen refetches its story and receives, or loses, the locked content.
const AccessContext = createContext(null);

export function AccessProvider({ children }) {
  const { user } = useAccount();
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [outcome, setOutcomeState] = useState(accessProvider.getDemoOutcome());
  const [devUnlock, setDevUnlock] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const [txs, ents] = await Promise.all([accessProvider.listTransactions(), accessProvider.listEntitlements()]);
    if (!alive.current) return;
    setTransactions(txs);
    setEntitlements(ents);
  }, []);

  useEffect(() => {
    alive.current = true;
    (async () => {
      await accessProvider.attach(user);
      await refresh();
      if (alive.current) setReady(true);
    })();
    return () => {
      alive.current = false;
      accessProvider.detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const changed = useCallback(async () => {
    await refresh();
    bumpCatalog();
  }, [refresh]);

  const buy = useCallback(
    async (storyId, idempotencyKey) => {
      const result = await accessProvider.purchase({ storyId, idempotencyKey });
      if (result.ok) await changed();
      return result;
    },
    [changed]
  );
  const resolvePending = useCallback(
    async (txId, result) => {
      const r = await accessProvider.resolvePending(txId, result);
      if (r.ok) await changed();
      return r;
    },
    [changed]
  );
  const refund = useCallback(
    async (txId) => {
      const r = await accessProvider.refund(txId);
      if (r.ok) await changed();
      return r;
    },
    [changed]
  );
  const quote = useCallback((storyId) => accessProvider.quote(storyId), []);
  const resetPurchases = useCallback(async () => {
    await accessProvider.resetPurchases(user);
    await changed();
  }, [user, changed]);

  const setOutcome = useCallback((o) => {
    accessProvider.setDemoOutcome(o);
    setOutcomeState(accessProvider.getDemoOutcome());
  }, []);

  // DEVELOPER OVERRIDE (Profile > Developer tools): asks the access service to treat premium
  // as unlocked. It bypasses purchases, so it is a test switch, not an access model.
  const setPremiumUnlocked = useCallback(
    (value) => {
      accessProvider.setDevUnlockAll(value);
      setDevUnlock(Boolean(value));
      bumpCatalog();
    },
    []
  );

  // Story ids this account owns through a completed, verified purchase.
  const purchasedIds = useMemo(() => entitlements.map((e) => e.storyId), [entitlements]);
  const owns = useCallback((storyId) => purchasedIds.includes(storyId), [purchasedIds]);
  const spentCents = useMemo(() => totalSpentCents(transactions), [transactions]);

  const value = useMemo(
    () => ({
      ready,
      transactions,
      entitlements,
      purchasedIds,
      owns,
      spentCents,
      outcome,
      setOutcome,
      buy,
      resolvePending,
      refund,
      quote,
      resetPurchases,
      refresh,
      premiumUnlocked: devUnlock,
      setPremiumUnlocked,
    }),
    [ready, transactions, entitlements, purchasedIds, owns, spentCents, outcome, setOutcome, buy, resolvePending, refund, quote, resetPurchases, refresh, devUnlock, setPremiumUnlocked]
  );

  // Don't render screens (which fetch stories) until the access service has this account's ledger.
  if (!ready) {
    return (
      <ScreenContainer>
        <LoadingState label="Opening your account…" />
      </ScreenContainer>
    );
  }
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used inside <AccessProvider>');
  return ctx;
}
