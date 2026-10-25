import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { levelsKey } from '../data/storageKeys';
import { getStorageMode, loadJSON, saveJSON } from '../utils/storage';
import { evaluateProgress, inputFromWorks } from '../utils/levels';
import { levelsProvider } from '../services/levelsService';
import { useAccount } from './AccountContext';
import { useCreator } from './CreatorContext';
import { useNotice } from './NoticeContext';

// The signed-in storyteller's levels and achievements.
//
//  - Derived: XP, level and progress are recomputed from the creator studio's works every time
//    they change, so they cannot be inflated by repeating an action.
//  - Persisted (per account, AsyncStorage): the series the storyteller marked as finished, the
//    badges already unlocked (an achievement stays in your history) and the last level seen, so
//    "Badge unlocked" and "Level up" messages appear once.
//  - Separate from leaderboards: nothing here reads a ranking.
const LevelsContext = createContext(null);

export function sanitizeLevels(raw) {
  const out = { finished: {}, unlocked: {}, lastLevel: null };
  if (!raw || typeof raw !== 'object') return out;
  const dates = (src, dest) => {
    if (!src || typeof src !== 'object') return;
    Object.keys(src).forEach((k) => {
      if (typeof src[k] === 'string' && !Number.isNaN(new Date(src[k]).getTime())) dest[k] = src[k];
    });
  };
  dates(raw.finished, out.finished);
  dates(raw.unlocked, out.unlocked);
  if (Number.isInteger(raw.lastLevel) && raw.lastLevel >= 1) out.lastLevel = raw.lastLevel;
  return out;
}

export function LevelsProvider({ children }) {
  const { user } = useAccount();
  const { works, hydrated: worksReady } = useCreator();
  const { showNotice } = useNotice();
  const storageKey = levelsKey(user.id);
  const [data, setData] = useState({ finished: {}, unlocked: {}, lastLevel: null });
  const [hydrated, setHydrated] = useState(false);
  const [storageMode, setStorageMode] = useState(getStorageMode());
  const dataRef = useRef(data);
  const noticeRef = useRef(showNotice);
  noticeRef.current = showNotice;

  // The data is tiny, so it is written straight away: an unlocked badge is never lost because the
  // app was closed a moment later.
  const persist = useCallback(
    async (next) => {
      await saveJSON(storageKey, { version: 1, ...next });
      setStorageMode(getStorageMode());
    },
    [storageKey]
  );

  const commit = useCallback(
    (next, { save = true } = {}) => {
      dataRef.current = next;
      setData(next);
      if (save) persist(next);
    },
    [persist]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = null;
      try {
        saved = await loadJSON(storageKey, null);
      } catch (e) {
        saved = null;
      }
      if (cancelled) return;
      commit(sanitizeLevels(saved), { save: false });
      setStorageMode(getStorageMode());
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluation = useMemo(() => {
    const input = inputFromWorks(works, data.finished, new Date(), levelsProvider.model);
    return { input, result: evaluateProgress(input, levelsProvider.model, data.unlocked) };
  }, [works, data]);

  // Record new unlocks once, and tell the storyteller.
  useEffect(() => {
    if (!hydrated || !worksReady) return;
    const { result } = evaluation;
    const fresh = result.badges.filter((b) => b.earned && !data.unlocked[b.id]);
    const levelNow = result.level.level;
    const leveledUp = data.lastLevel !== null && levelNow > data.lastLevel;
    if (!fresh.length && data.lastLevel === levelNow) return;
    const stamp = new Date().toISOString();
    const unlocked = { ...data.unlocked };
    fresh.forEach((b) => {
      unlocked[b.id] = stamp;
    });
    commit({ ...data, unlocked, lastLevel: levelNow });
    if (fresh.length || leveledUp) {
      const lines = [];
      if (leveledUp) lines.push(`You reached level ${levelNow}: ${result.level.name}.`);
      if (fresh.length) lines.push(`${fresh.length === 1 ? 'Badge' : 'Badges'} unlocked: ${fresh.map((b) => b.title).join(', ')}.`);
      // A short pause lets the message that caused this (for example "Your story is live") appear first.
      setTimeout(() => noticeRef.current(leveledUp ? 'Level up' : 'Badge unlocked', lines.join(' '), 'ribbon-outline'), 900);
    }
  }, [hydrated, worksReady, evaluation, data, commit]);

  // Mark one of your own stories as a finished series (3+ qualifying chapters, published).
  const setSeriesFinished = useCallback(
    (workId, finished) => {
      const candidate = evaluation.input.seriesCandidates.find((c) => c.id === workId);
      if (finished && !candidate) {
        return { ok: false, message: 'Only a published story with at least 3 full chapters can be finished as a series.' };
      }
      const next = { ...dataRef.current, finished: { ...dataRef.current.finished } };
      if (finished) next.finished[workId] = new Date().toISOString();
      else delete next.finished[workId];
      commit(next);
      return { ok: true };
    },
    [evaluation, commit]
  );

  // Developer tool: forget finished series, unlocked badges and the last level seen.
  const resetLevels = useCallback(() => {
    commit({ finished: {}, unlocked: {}, lastLevel: null });
  }, [commit]);

  const value = useMemo(
    () => ({
      hydrated: hydrated && worksReady,
      storageMode,
      input: evaluation.input,
      progress: evaluation.result,
      unlocked: data.unlocked,
      finished: data.finished,
      setSeriesFinished,
      resetLevels,
    }),
    [hydrated, worksReady, storageMode, evaluation, data, setSeriesFinished, resetLevels]
  );

  return <LevelsContext.Provider value={value}>{children}</LevelsContext.Provider>;
}

export function useLevels() {
  const ctx = useContext(LevelsContext);
  if (!ctx) throw new Error('useLevels must be used inside LevelsProvider');
  return ctx;
}
