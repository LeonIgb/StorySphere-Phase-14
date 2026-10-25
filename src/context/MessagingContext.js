import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from './AccountContext';
import { messagingProvider } from '../services/messagingService';
import { PEOPLE_BY_ID } from '../data/messaging';
import { newId } from '../utils/creator';
import LoadingState from '../components/LoadingState';
import ScreenContainer from '../components/ScreenContainer';
import { buildConversations, convIdFor, inboxOf, requestsOf, sendPolicy, unreadIn } from '../utils/messaging';

// Private messaging state for the signed-in account. PROTOTYPE: everything is local; see
// services/messagingService.js for how a real-time backend replaces it. This context only mirrors
// the provider's snapshot and event stream into React state.
const MessagingContext = createContext(null);

export function MessagingProvider({ children }) {
  const { user, social, prefs } = useAccount();
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const following = social ? social.following : [];
  const ctxRef = useRef({ following, prefs });
  ctxRef.current = { following, prefs };

  useEffect(() => {
    let alive = true;
    const unsub = messagingProvider.subscribe(() => alive && setTick((t) => t + 1));
    messagingProvider.attach(user).then(() => {
      if (!alive) return;
      setReady(true);
      setTick((t) => t + 1);
    });
    return () => {
      alive = false;
      unsub();
      messagingProvider.detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const doc = messagingProvider.getSnapshot();
  const conversations = useMemo(
    () => (ready ? buildConversations({ doc, following, prefs: prefs || {} }) : []),
    // tick changes whenever the provider's document changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, tick, following, prefs]
  );

  const startConversation = useCallback((personId) => messagingProvider.ensureConversation(personId, ctxRef.current), []);
  const sendMessage = useCallback(
    ({ personId, text, attachment, clientId }) => messagingProvider.send({ personId, text, attachment, clientId: clientId || newId('cid') }, ctxRef.current),
    []
  );
  const retryMessage = useCallback((personId, messageId) => messagingProvider.retry(personId, messageId, ctxRef.current), []);
  const markRead = useCallback((personId) => messagingProvider.markRead(convIdFor(personId)), []);
  const setActive = useCallback((personId) => messagingProvider.setActive(personId ? convIdFor(personId) : null), []);
  const block = useCallback((personId) => messagingProvider.block(personId), []);
  const unblock = useCallback((personId) => messagingProvider.unblock(personId), []);
  const clearConversation = useCallback((personId) => messagingProvider.clearConversation(personId), []);
  const simulateIncoming = useCallback(() => messagingProvider.simulateIncoming(ctxRef.current), []);
  const resetMessages = useCallback(() => messagingProvider.reset(user), [user]);
  const setOutcome = useCallback((o) => {
    messagingProvider.setDemoOutcome(o);
    setTick((t) => t + 1);
  }, []);
  const setSimReplies = useCallback((v) => {
    messagingProvider.setSimulatedReplies(v);
    setTick((t) => t + 1);
  }, []);

  const value = useMemo(() => {
    const inbox = inboxOf(conversations);
    const requests = requestsOf(conversations);
    return {
      ready,
      conversations,
      inbox,
      requests,
      unreadInbox: unreadIn(inbox),
      unreadRequests: unreadIn(requests),
      blockedPeople: doc.blocked.map((id) => PEOPLE_BY_ID[id]).filter(Boolean),
      isBlocked: (personId) => doc.blocked.includes(personId),
      messagesFor: (personId) => doc.messages[convIdFor(personId)] || [],
      conversationFor: (personId) => conversations.find((c) => c.personId === personId) || null,
      policyFor: (personId) => sendPolicy(personId, following),
      isTyping: (personId) => messagingProvider.isTyping(convIdFor(personId)),
      outcome: messagingProvider.getDemoOutcome(),
      simReplies: messagingProvider.getSimulatedReplies(),
      startConversation, sendMessage, retryMessage, markRead, setActive, block, unblock, clearConversation, simulateIncoming, resetMessages, setOutcome, setSimReplies,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, conversations, tick, following, startConversation, sendMessage, retryMessage, markRead, setActive, block, unblock, clearConversation, simulateIncoming, resetMessages, setOutcome, setSimReplies]);

  if (!ready) {
    return (
      <ScreenContainer>
        <LoadingState label="Opening messages…" />
      </ScreenContainer>
    );
  }
  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used inside <MessagingProvider>');
  return ctx;
}
