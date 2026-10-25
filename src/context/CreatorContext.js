import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { creatorKey } from '../data/storageKeys';
import { getStorageMode, loadJSON, saveJSON } from '../utils/storage';
import {
  applyPublish,
  applySchedule,
  applyUnpublish,
  createWork,
  groupWorks,
  releaseDueWorks,
  sanitizeWorks,
} from '../utils/creator';
import { setUserWorks } from '../services/storyService';
import { bumpCatalog } from '../services/catalog';
import { useNotice } from './NoticeContext';
import { useAccount } from './AccountContext';

// The creator studio's state: every draft, scheduled and published story of the current user.
//
//  - Saved locally (AsyncStorage) a moment after every change, and again when the app goes to
//    the background. If the device has no storage module it falls back to memory and says so.
//  - The latest list is mirrored into storyService, so published stories show up in discovery.
//  - SIMULATED SCHEDULING: there is no server. A scheduled story is released by this provider,
//    when the app is open at or after the chosen time (on launch, on resume, every 30 seconds).
const CreatorContext = createContext(null);

const SAVE_DELAY_MS = 600;
const RELEASE_CHECK_MS = 30 * 1000;

export function CreatorProvider({ children }) {
  const { showNotice } = useNotice();
  const { user } = useAccount();
  const storageKey = creatorKey(user.id);
  const [works, setWorks] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageMode, setStorageMode] = useState(getStorageMode());
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'memory'

  const worksRef = useRef([]);
  const hydratedRef = useRef(false);
  const saveTimer = useRef(null);
  const liveDirty = useRef(false);
  const noticeRef = useRef(showNotice);
  noticeRef.current = showNotice;

  // ------------------------------------------------------------ saving
  const persistNow = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!hydratedRef.current) return false;
    setSaveState('saving');
    const ok = await saveJSON(storageKey, { version: 1, works: worksRef.current });
    setStorageMode(getStorageMode());
    setSaveState(ok ? 'saved' : 'memory');
    return ok;
  }, [storageKey]);

  const schedulePersist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persistNow();
    }, SAVE_DELAY_MS);
  }, [persistNow]);

  // next: the full new list. Mirrors it into the service so discovery sees it immediately.
  const commit = useCallback(
    (next, { bump = false, persist = true } = {}) => {
      worksRef.current = next;
      setWorks(next);
      setUserWorks(next);
      if (bump) bumpCatalog();
      if (persist) schedulePersist();
    },
    [schedulePersist]
  );

  // ------------------------------------------------------------ scheduler (simulated)
  const releaseDue = useCallback(() => {
    if (!hydratedRef.current) return;
    const { works: next, released, failed } = releaseDueWorks(worksRef.current, new Date());
    if (released.length === 0 && failed.length === 0) return;
    commit(next, { bump: released.length > 0 });
    const title = (id) => {
      const w = next.find((x) => x.id === id);
      return w && w.title.trim() ? `“${w.title.trim()}”` : 'A story';
    };
    if (released.length > 0) {
      noticeRef.current(
        released.length === 1 ? 'Scheduled story is live' : 'Scheduled stories are live',
        `${released.map(title).join(', ')} ${released.length === 1 ? 'is' : 'are'} now published. (Simulated scheduling: StorySphere released ${released.length === 1 ? 'it' : 'them'} because the app is open.)`,
        'rocket-outline'
      );
    }
    if (failed.length > 0) {
      noticeRef.current(
        'A scheduled story needs attention',
        `${failed.map(title).join(', ')} could not be published because it is no longer complete. It is back in your drafts.`,
        'alert-circle-outline'
      );
    }
  }, [commit]);

  // ------------------------------------------------------------ load on launch
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
      const list = sanitizeWorks(saved);
      hydratedRef.current = true;
      commit(list, { bump: list.some((w) => w.status === 'published'), persist: false });
      setStorageMode(getStorageMode());
      setHydrated(true);
      releaseDue();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for due scheduled stories on a timer and when the app returns to the foreground;
  // save right away when it leaves the foreground.
  useEffect(() => {
    const id = setInterval(releaseDue, RELEASE_CHECK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') releaseDue();
      else persistNow();
    });
    return () => {
      clearInterval(id);
      if (sub && sub.remove) sub.remove();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [releaseDue, persistNow]);

  // Signing out (or switching account) unmounts this provider: write any pending change under
  // this account's key and clear the user's stories out of the shared catalog.
  useEffect(
    () => () => {
      if (hydratedRef.current && saveTimer.current) {
        saveJSON(storageKey, { version: 1, works: worksRef.current });
      }
      setUserWorks([]);
      bumpCatalog();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ------------------------------------------------------------ actions
  const getWork = useCallback((id) => worksRef.current.find((w) => w.id === id) || null, []);

  const createNewWork = useCallback(
    (mediaType) => {
      const work = createWork(mediaType, new Date());
      commit([work, ...worksRef.current]);
      return work;
    },
    [commit]
  );

  // fn: a pure transform from utils/creator.js, e.g. (w) => addChapter(w)
  const editWork = useCallback(
    (id, fn) => {
      const current = worksRef.current.find((w) => w.id === id);
      if (!current) return null;
      const updated = { ...fn(current), updatedAt: new Date().toISOString() };
      if (current.status === 'published') liveDirty.current = true;
      commit(worksRef.current.map((w) => (w.id === id ? updated : w)));
      return updated;
    },
    [commit]
  );

  const transition = useCallback(
    (id, run, { bump }) => {
      const current = worksRef.current.find((w) => w.id === id);
      if (!current) return { ok: false, errors: [{ id: 'missing', message: 'This story no longer exists.' }] };
      const result = run(current);
      if (!result.ok) return { ok: false, errors: result.errors };
      commit(
        worksRef.current.map((w) => (w.id === id ? result.work : w)),
        { bump: bump(current, result.work) }
      );
      persistNow();
      liveDirty.current = false;
      return { ok: true, errors: [], work: result.work };
    },
    [commit, persistNow]
  );

  const publish = useCallback(
    (id) => transition(id, (w) => applyPublish(w, new Date()), { bump: () => true }),
    [transition]
  );
  const schedule = useCallback(
    (id, date) => transition(id, (w) => applySchedule(w, date, new Date()), { bump: () => false }),
    [transition]
  );
  const unpublish = useCallback(
    (id) => transition(id, (w) => applyUnpublish(w, new Date()), { bump: (before) => before.status === 'published' }),
    [transition]
  );

  const deleteWork = useCallback(
    (id) => {
      const current = worksRef.current.find((w) => w.id === id);
      if (!current) return;
      commit(
        worksRef.current.filter((w) => w.id !== id),
        { bump: current.status === 'published' }
      );
      persistNow();
    },
    [commit, persistNow]
  );

  // Edits to a LIVE story show up for readers right away in the service; this refreshes the
  // screens that already loaded it. The editor calls it when it closes.
  const commitLiveEdits = useCallback(() => {
    if (liveDirty.current) {
      liveDirty.current = false;
      bumpCatalog();
    }
  }, []);

  const resetAll = useCallback(() => {
    const hadPublished = worksRef.current.some((w) => w.status === 'published');
    commit([], { bump: hadPublished });
    persistNow();
  }, [commit, persistNow]);

  const grouped = useMemo(() => groupWorks(works), [works]);
  const counts = useMemo(
    () => ({ draft: grouped.draft.length, scheduled: grouped.scheduled.length, published: grouped.published.length }),
    [grouped]
  );

  const value = useMemo(
    () => ({
      hydrated,
      storageMode,
      saveState,
      works,
      grouped,
      counts,
      getWork,
      createNewWork,
      editWork,
      publish,
      schedule,
      unpublish,
      deleteWork,
      commitLiveEdits,
      saveNow: persistNow,
      resetAll,
    }),
    [
      hydrated,
      storageMode,
      saveState,
      works,
      grouped,
      counts,
      getWork,
      createNewWork,
      editWork,
      publish,
      schedule,
      unpublish,
      deleteWork,
      commitLiveEdits,
      persistNow,
      resetAll,
    ]
  );

  return <CreatorContext.Provider value={value}>{children}</CreatorContext.Provider>;
}

export function useCreator() {
  const ctx = useContext(CreatorContext);
  if (!ctx) throw new Error('useCreator must be used inside <CreatorProvider>');
  return ctx;
}

// Same as useCreator, but returns null outside the provider (for shared components).
export function useCreatorOptional() {
  return useContext(CreatorContext) || null;
}
