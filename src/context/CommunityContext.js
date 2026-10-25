import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from './AccountContext';
import { useAccess } from './AccessContext';
import { useMessaging } from './MessagingContext';
import useAsync from '../hooks/useAsync';
import { fetchAllStories } from '../services/storyService';
import { freshCommunity, loadCommunity, saveCommunity } from '../services/communityService';
import { newId } from '../utils/creator';
import LoadingState from '../components/LoadingState';
import ScreenContainer from '../components/ScreenContainer';
import {
  LIMITS,
  addReport,
  allComments,
  buildNotifications,
  buildReviews,
  buildThreads,
  cleanText,
  commentCount,
  isReported,
  postBlock,
  ratingSummary,
  reactionStats,
  replyTarget,
  sharesFor,
  storyMetrics,
  unreadCount,
  validateAnnouncement,
  validateComment,
  validateReview,
  withComment,
  withReaction,
  withRating,
  withReview,
  withToggledIn,
  withoutComment,
  withoutReport,
  withoutReview,
} from '../utils/community';

// Community state for the signed-in account: reactions, ratings, reviews, comments, reports,
// notification state and announcements. Saved per account on this device (see
// services/communityService.js for what a backend would own).
//
// Safeguards against accidental repeats: toggles ignore a second tap within LIMITS.actionLockMs,
// posts are rate limited and exact duplicates are refused, a report can only be filed once per
// target, and an announcement can only be sent once per chapter.
const CommunityContext = createContext(null);

export function CommunityProvider({ children }) {
  const { user, me, social, prefs } = useAccount();
  const { transactions } = useAccess();
  const { conversations, markRead: markChatRead } = useMessaging();
  const [doc, setDoc] = useState(null);
  const docRef = useRef(null);
  const userRef = useRef(user);
  userRef.current = user;
  const locks = useRef({});
  const stories = useAsync(fetchAllStories, []);

  useEffect(() => {
    let alive = true;
    loadCommunity(user).then((d) => {
      if (!alive) return;
      docRef.current = d;
      setDoc(d);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const commit = useCallback((fn) => {
    const current = docRef.current;
    if (!current) return current;
    const next = fn(current);
    if (next === current) return current;
    docRef.current = next;
    setDoc(next);
    saveCommunity(userRef.current, next);
    return next;
  }, []);

  // True when the same action key was used a moment ago (an accidental double tap).
  const tooSoon = useCallback((key) => {
    const now = Date.now();
    const last = locks.current[key] || 0;
    if (now - last < LIMITS.actionLockMs) return true;
    locks.current[key] = now;
    return false;
  }, []);

  const ownStory = (story) => Boolean(story) && story.creatorId === 'me';

  // ---------------------------------------------------------------- reactions and ratings
  const react = useCallback(
    (story, key) => {
      if (!story || tooSoon(`react:${story.id}`)) return;
      commit((d) => withReaction(d, story.id, d.reactions[story.id] === key ? null : key));
    },
    [commit, tooSoon]
  );

  const rate = useCallback(
    (story, value) => {
      if (!story) return { ok: false, error: 'Story not found.' };
      if (ownStory(story)) return { ok: false, error: 'You can’t rate your own story.' };
      if (tooSoon(`rate:${story.id}`)) return { ok: true, ignored: true };
      commit((d) => withRating(d, story.id, value));
      return { ok: true };
    },
    [commit, tooSoon]
  );

  const saveReview = useCallback(
    (story, { rating, text }) => {
      if (!story) return { ok: false, errors: { text: 'Story not found.' } };
      if (ownStory(story)) return { ok: false, errors: { text: 'You can’t review your own story.' } };
      const errors = validateReview({ rating, text });
      if (Object.keys(errors).length) return { ok: false, errors };
      if (tooSoon(`review:${story.id}`)) return { ok: true, ignored: true };
      commit((d) => withReview(withRating(d, story.id, rating), story.id, newId('rv'), text));
      return { ok: true };
    },
    [commit, tooSoon]
  );

  const deleteReview = useCallback((story) => story && commit((d) => withoutReview(d, story.id)), [commit]);
  const toggleHelpful = useCallback(
    (id) => {
      if (tooSoon(`helpful:${id}`)) return;
      commit((d) => withToggledIn(d, 'helpful', id));
    },
    [commit, tooSoon]
  );

  // ---------------------------------------------------------------- comments
  const postComment = useCallback(
    ({ story, chapter = null, parentId = null, text }) => {
      const current = docRef.current;
      if (!story || !current) return { ok: false, error: 'Story not found.' };
      const error = validateComment(text);
      if (error) return { ok: false, error };
      let useChapter = chapter;
      let replyTo = null;
      let top = null;
      if (parentId) {
        const target = replyTarget(story, current, parentId);
        if (!target) return { ok: false, error: 'The comment you are replying to is gone.' };
        top = target.top.id;
        useChapter = target.top.chapter;
        replyTo = target.mentions || target.top.authorId;
        if (replyTo === 'me') replyTo = null;
      } else if (useChapter !== null && (!Number.isInteger(useChapter) || useChapter < 0 || useChapter >= (story.chapterCount || 0))) {
        return { ok: false, error: 'That chapter doesn’t exist.' };
      }
      const mineRecent = current.comments.filter((c) => c.authorId === 'me').map((c) => ({ text: c.text, at: c.at }));
      const blocked = postBlock(text, mineRecent);
      if (blocked) return { ok: false, error: blocked };
      const comment = { id: newId('cm'), storyId: story.id, chapter: useChapter, parentId: top, replyTo, authorId: 'me', text: cleanText(text), at: Date.now(), baseLikes: 0 };
      commit((d) => withComment(d, comment));
      return { ok: true, comment };
    },
    [commit]
  );

  const deleteComment = useCallback(
    (id) => {
      const current = docRef.current;
      if (!current || !current.comments.some((c) => c.id === id && c.authorId === 'me')) return;
      commit((d) => withoutComment(d, id));
    },
    [commit]
  );

  const toggleCommentLike = useCallback(
    (id) => {
      if (tooSoon(`clike:${id}`)) return;
      commit((d) => (d.comments.some((c) => c.id === id && c.authorId === 'me') ? d : withToggledIn(d, 'commentLikes', id)));
    },
    [commit, tooSoon]
  );

  // ---------------------------------------------------------------- reports (prototype)
  const report = useCallback(
    (args) => {
      if (tooSoon(`report:${args.targetType}:${args.targetId}`)) return { ok: false, error: 'Already sending. One moment.' };
      let result = { ok: false, error: 'Could not save the report.' };
      commit((d) => {
        result = addReport(d, { id: newId('rp'), ...args });
        return result.doc;
      });
      return result.ok ? { ok: true, report: result.report } : { ok: false, error: result.error };
    },
    [commit, tooSoon]
  );
  const withdrawReport = useCallback((id) => commit((d) => withoutReport(d, id)), [commit]);
  const toggleHidden = useCallback((id) => commit((d) => withToggledIn(d, 'hidden', id)), [commit]);

  // ---------------------------------------------------------------- announcements (simulated)
  const sendAnnouncement = useCallback(
    ({ story, chapter, note }) => {
      const current = docRef.current;
      if (!story || !current) return { ok: false, error: 'Story not found.' };
      if (!ownStory(story)) return { ok: false, error: 'You can only announce your own stories.' };
      const noteError = validateAnnouncement(note);
      if (noteError) return { ok: false, error: noteError };
      const audience = social ? social.followers.length : 0;
      if (audience === 0) return { ok: false, error: 'You have no followers yet, so there is nobody to announce to.' };
      if (current.announcements.some((a) => a.storyId === story.id && a.chapter === chapter)) return { ok: false, error: 'You already announced this chapter.' };
      if (tooSoon(`announce:${story.id}:${chapter}`)) return { ok: false, error: 'Already sending. One moment.' };
      const title = chapter >= 0 ? `${story.title} · chapter ${chapter + 1}` : story.title;
      commit((d) => ({ ...d, announcements: [{ id: newId('an'), storyId: story.id, chapter, title, note: cleanText(note), audience, at: Date.now() }, ...d.announcements] }));
      return { ok: true, audience };
    },
    [commit, social, tooSoon]
  );

  // ---------------------------------------------------------------- notifications
  const notifications = useMemo(
    () =>
      doc
        ? buildNotifications({ stories: stories.data || [], doc, following: social ? social.following : [], followers: social ? social.followers : [], prefs: prefs || {}, conversations, transactions })
        : [],
    [doc, stories.data, social, prefs, conversations, transactions]
  );
  const unread = useMemo(() => unreadCount(notifications), [notifications]);
  const markRead = useCallback((id) => commit((d) => (d.readNotifs.includes(id) ? d : { ...d, readNotifs: [...d.readNotifs, id] })), [commit]);
  const markAllRead = useCallback(
    () => {
      // Message notifications are read when the chat is read.
      notifications.filter((n) => n.type === 'message' && !n.read).forEach((n) => markChatRead(n.personId));
      return commit((d) => ({ ...d, readNotifs: [...new Set([...d.readNotifs, ...notifications.map((n) => n.id)])] }));
    },
    [commit, notifications, markChatRead]
  );
  const dismiss = useCallback((id) => commit((d) => (d.dismissedNotifs.includes(id) ? d : { ...d, dismissedNotifs: [...d.dismissedNotifs, id] })), [commit]);

  // ---------------------------------------------------------------- sharing
  const recordShare = useCallback(
    (storyId) => {
      if (!storyId || tooSoon(`share:${storyId}`)) return;
      commit((d) => ({ ...d, shares: { ...d.shares, [storyId]: (d.shares[storyId] || 0) + 1 } }));
    },
    [commit, tooSoon]
  );

  const resetCommunity = useCallback(() => commit(() => freshCommunity(userRef.current)), [commit]);

  const value = useMemo(() => {
    const d = doc || freshCommunity(null);
    return {
      doc: d,
      me,
      // reading
      metricsFor: (story) => storyMetrics(story, d),
      reactionFor: (story) => d.reactions[story.id] || null,
      reactionStatsFor: (story) => reactionStats(story, d.reactions[story.id] || null),
      myRating: (story) => (d.ratings[story.id] ? d.ratings[story.id].value : 0),
      ratingSummaryFor: (story) => ratingSummary(story, d.ratings[story.id] ? d.ratings[story.id].value : 0),
      myReview: (story) => d.reviews[story.id] || null,
      reviewsFor: (story, sort) => buildReviews(story, d, sort),
      threadsFor: (story, scope, sort) => buildThreads(story, d, scope, sort),
      commentCountFor: (story, scope) => commentCount(story, d, scope),
      commentsFor: (story) => allComments(story, d),
      isHidden: (id) => d.hidden.includes(id),
      isReported: (type, id) => isReported(d, type, id),
      reports: d.reports,
      shareCountFor: (story) => sharesFor(story, d),
      announcementFor: (storyId, chapter) => d.announcements.find((a) => a.storyId === storyId && a.chapter === chapter) || null,
      // actions
      react, rate, saveReview, deleteReview, toggleHelpful,
      postComment, deleteComment, toggleCommentLike,
      report, withdrawReport, toggleHidden,
      sendAnnouncement, recordShare, resetCommunity,
      notifications, unread, markRead, markAllRead, dismiss,
    };
  }, [doc, me, react, rate, saveReview, deleteReview, toggleHelpful, postComment, deleteComment, toggleCommentLike, report, withdrawReport, toggleHidden, sendAnnouncement, recordShare, resetCommunity, notifications, unread, markRead, markAllRead, dismiss]);

  if (!doc) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading community…" />
      </ScreenContainer>
    );
  }
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used inside <CommunityProvider>');
  return ctx;
}
