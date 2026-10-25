import { useMemo } from 'react';
import useAsync from './useAsync';
import { fetchAllStories } from '../services/storyService';
import { useLibrary } from '../context/LibraryContext';
import { useReading } from '../context/ReadingContext';
import { useAccount } from '../context/AccountContext';
import { useAccess } from '../context/AccessContext';
import { buildLibrary, continueItem, personalPicks } from '../utils/library';

// Everything the Library, Home and Profile need about the signed-in reader's library, built from
// the catalog plus the persisted library, reading progress and follows. One place, so every
// screen shows the same lists and counts.
export default function useLibraryData() {
  const all = useAsync(fetchAllStories, []);
  const { doc } = useLibrary();
  const { purchasedIds } = useAccess();
  const { progress } = useReading();
  const { social, prefs, profile } = useAccount();

  const library = useMemo(
    () => buildLibrary({ doc: { ...doc, purchasedIds }, progress, stories: all.data || [], following: social.following }),
    [doc, purchasedIds, progress, all.data, social.following]
  );
  const picks = useMemo(
    () =>
      personalPicks(
        all.data || [],
        { genres: profile.preferredGenres, preferredFormats: prefs.preferredFormats, freeOnly: prefs.freeOnly, hideFinished: prefs.hideFinished },
        { progress, purchasedIds }
      ),
    [all.data, profile.preferredGenres, prefs.preferredFormats, prefs.freeOnly, prefs.hideFinished, progress, purchasedIds]
  );

  return { ...all, library, picks, continueItem: continueItem(library) };
}
