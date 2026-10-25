import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { readingKey } from '../data/storageKeys';
import { loadJSON, saveJSON } from '../utils/storage';
import { useAccount } from './AccountContext';
import { useLibrary } from './LibraryContext';
import { FONT_DEFAULT, FONT_MAX, FONT_MIN, FONT_STEP, clamp01, clampFontSize } from '../utils/reading';

// Reading progress (per story) and reader settings, kept per account on this device.
// Progress doubles as the reading / viewing HISTORY. When the account's "Keep reading history"
// preference is off, nothing new is recorded (so Continue reading stops too).
//
// progress[storyId] = { position, fraction, percent, total, finished, kind, updatedAt }
//   position: chapter / panel index, fraction: 0..1 through it, percent: 0..1 overall
const ReadingContext = createContext(null);

export function ReadingProvider({ children }) {
  const { user, prefs } = useAccount();
  const { clearRecents } = useLibrary();
  const key = readingKey(user.id);
  const keepHistory = prefs ? prefs.saveHistory : true;
  const keepRef = useRef(keepHistory);
  keepRef.current = keepHistory;
  const [progress, setProgress] = useState({});
  const [fontSize, setFontSizeState] = useState(FONT_DEFAULT);
  const [theme, setTheme] = useState('cream');
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadJSON(key, null).then((saved) => {
      if (cancelled) return;
      if (saved && typeof saved === 'object') {
        if (saved.progress && typeof saved.progress === 'object') setProgress(saved.progress);
        if (Number.isFinite(saved.fontSize)) setFontSizeState(clampFontSize(saved.fontSize));
        if (saved.theme === 'cream' || saved.theme === 'night') setTheme(saved.theme);
      }
      loaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (loaded.current) saveJSON(key, { version: 1, progress, fontSize, theme });
  }, [key, progress, fontSize, theme]);

  // Clears reading progress and the recently viewed list (saved, favorites and purchases stay).
  const clearHistory = useCallback(() => {
    setProgress({});
    clearRecents();
  }, [clearRecents]);

  // Puts a progress entry back exactly as it was (used by Undo in the library).
  const restoreProgress = useCallback((storyId, entry) => {
    if (storyId && entry) setProgress((prev) => ({ ...prev, [storyId]: entry }));
  }, []);

  const saveProgress = useCallback((storyId, patch) => {
    if (!storyId || !keepRef.current) return;
    setProgress((prev) => {
      const next = {
        ...(prev[storyId] || {}),
        ...patch,
        percent: clamp01(patch.percent !== undefined ? patch.percent : (prev[storyId] || {}).percent),
        updatedAt: Date.now(),
      };
      return { ...prev, [storyId]: next };
    });
  }, []);

  const getProgress = useCallback((storyId) => progress[storyId] || null, [progress]);

  const resetProgress = useCallback((storyId) => {
    setProgress((prev) => {
      if (!prev[storyId]) return prev;
      const copy = { ...prev };
      delete copy[storyId];
      return copy;
    });
  }, []);

  const setFontSize = useCallback((size) => setFontSizeState(clampFontSize(size)), []);
  const increaseFont = useCallback(() => setFontSizeState((s) => clampFontSize(s + FONT_STEP)), []);
  const decreaseFont = useCallback(() => setFontSizeState((s) => clampFontSize(s - FONT_STEP)), []);

  // Most recently touched first.
  const { inProgressIds, finishedIds } = useMemo(() => {
    const entries = Object.entries(progress).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
    return {
      inProgressIds: entries.filter(([, p]) => !p.finished).map(([id]) => id),
      finishedIds: entries.filter(([, p]) => p.finished).map(([id]) => id),
    };
  }, [progress]);

  const value = useMemo(
    () => ({
      progress,
      getProgress,
      saveProgress,
      resetProgress,
      clearHistory,
      restoreProgress,
      keepHistory,
      inProgressIds,
      finishedIds,
      fontSize,
      setFontSize,
      increaseFont,
      decreaseFont,
      canIncreaseFont: fontSize + FONT_STEP <= FONT_MAX,
      canDecreaseFont: fontSize - FONT_STEP >= FONT_MIN,
      theme,
      setTheme,
    }),
    [
      progress,
      getProgress,
      saveProgress,
      resetProgress,
      clearHistory,
      restoreProgress,
      keepHistory,
      inProgressIds,
      finishedIds,
      fontSize,
      setFontSize,
      increaseFont,
      decreaseFont,
      theme,
    ]
  );

  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>;
}

export function useReading() {
  const ctx = useContext(ReadingContext);
  if (!ctx) throw new Error('useReading must be used inside <ReadingProvider>');
  return ctx;
}
