import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { libraryKey } from '../data/storageKeys';
import { loadJSON, saveJSON } from '../utils/storage';
import { DEMO_LIBRARY, pushRecent, removeRecent as dropRecent, sanitizeLibraryDoc } from '../utils/library';
import { useAccount } from './AccountContext';

// The signed-in account's library, kept on this device (one document per account):
//   savedIds / favoriteIds   bookmarks and hearts, newest first
//   recent                   recently viewed story pages [{ id, at }], newest first
//
// Purchases are NOT kept here. They live in the access service's ledger (see AccessContext).
const LibraryContext = createContext(null);

function toggleId(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
}

export function LibraryProvider({ children }) {
  const { user, prefs } = useAccount();
  const key = libraryKey(user.id);
  const seed = user.isDemo ? DEMO_LIBRARY : null;
  const [doc, setDoc] = useState(() => sanitizeLibraryDoc(null, null));
  const [hydrated, setHydrated] = useState(false);
  const loaded = useRef(false);
  const keepHistory = prefs ? prefs.saveHistory : true;
  const keepRef = useRef(keepHistory);
  keepRef.current = keepHistory;

  useEffect(() => {
    let cancelled = false;
    loadJSON(key, null).then((saved) => {
      if (cancelled) return;
      setDoc(sanitizeLibraryDoc(saved, seed));
      loaded.current = true;
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (loaded.current) saveJSON(key, { version: 2, ...doc });
  }, [key, doc]);

  const update = useCallback((fn) => setDoc((prev) => fn(prev)), []);

  const toggleSaved = useCallback((id) => update((d) => ({ ...d, savedIds: toggleId(d.savedIds, id) })), [update]);
  const toggleFavorite = useCallback((id) => update((d) => ({ ...d, favoriteIds: toggleId(d.favoriteIds, id) })), [update]);

  // Recently viewed: recorded when a story page opens, unless the account keeps no history.
  const addRecent = useCallback(
    (id) => {
      if (!id || !keepRef.current) return;
      update((d) => ({ ...d, recent: pushRecent(d.recent, id) }));
    },
    [update]
  );
  const removeRecent = useCallback((id) => update((d) => ({ ...d, recent: dropRecent(d.recent, id) })), [update]);
  const restoreRecent = useCallback((entry) => update((d) => ({ ...d, recent: [entry, ...dropRecent(d.recent, entry.id)] })), [update]);
  const clearRecents = useCallback(() => update((d) => ({ ...d, recent: [] })), [update]);

  const isSaved = useCallback((id) => doc.savedIds.includes(id), [doc.savedIds]);
  const isFavorite = useCallback((id) => doc.favoriteIds.includes(id), [doc.favoriteIds]);

  const value = useMemo(
    () => ({
      hydrated,
      doc,
      savedIds: doc.savedIds,
      favoriteIds: doc.favoriteIds,
      recent: doc.recent,
      toggleSaved,
      toggleFavorite,
      isSaved,
      isFavorite,
      addRecent,
      removeRecent,
      restoreRecent,
      clearRecents,
    }),
    [hydrated, doc, toggleSaved, toggleFavorite, isSaved, isFavorite, addRecent, removeRecent, restoreRecent, clearRecents]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
