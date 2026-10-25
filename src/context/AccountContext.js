import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { accountKey, allUserKeys, DEMO_USER_ID } from '../data/storageKeys';
import { demoSeed } from '../data/currentUser';
import { authMode, authProvider } from '../services/authService';
import { profiles as profilesRepo } from '../services/backend/repositories';
import { setMyProfile } from '../services/storyService';
import { bumpCatalog } from '../services/catalog';
import { directory } from '../services/profileService';
import { getStorageMode, loadJSON, removeKey, saveJSON } from '../utils/storage';
import {
  DEFAULT_PREFS,
  applyProfileEdit,
  followersShown,
  makeHandle,
  newAccountDoc,
  publicProfileView,
  sanitizeAccountDoc,
  toggleId,
} from '../utils/account';

// Who is signed in, their profile, preferences and follow lists.
//
// Sign-in goes through services/authService.js: real Supabase accounts when a backend is configured
// (Phase 13), otherwise the local prototype (NOT secure) and the demo account. For a backend
// account the PROFILE and PREFERENCES are also saved to the server (the local copy stays as the
// offline cache). Follow lists, library, history and stories are still local (see
// supabase/README.md for what is and isn't connected). Everything here is per account: the account document is saved under
// accountKey(user.id), and the app remounts the other providers when the user changes
// (see App.js), so two accounts never see each other's library, history or stories.
const AccountContext = createContext(null);

const demoDoc = () => ({
  profile: { ...demoSeed.profile },
  prefs: { ...DEFAULT_PREFS },
  social: { following: [...demoSeed.social.following], followers: [...demoSeed.social.followers] },
});

// Applies a profile row from the server onto the local account doc. The server is the source of
// truth for identity fields (name, handle, bio, role, colour, genres) and preferences.
function mergeRemote(doc, remote) {
  if (!remote) return doc;
  const merged = {
    ...doc,
    profile: {
      ...doc.profile,
      displayName: remote.displayName,
      handle: remote.handle,
      bio: remote.bio,
      role: remote.role,
      avatarColor: remote.avatarColor,
      preferredGenres: remote.preferredGenres,
      joinedAt: remote.joinedAt || doc.profile.joinedAt,
    },
    prefs: { ...doc.prefs, ...(remote.prefs || {}) },
  };
  return sanitizeAccountDoc(merged, doc);
}

const profilePayload = (d) => ({
  displayName: d.profile.displayName,
  bio: d.profile.bio,
  role: d.profile.role,
  avatarColor: d.profile.avatarColor,
  preferredGenres: d.profile.preferredGenres,
  prefs: d.prefs,
});

async function loadDoc(user) {
  const fallback = user.isDemo
    ? demoDoc()
    : newAccountDoc({ displayName: user.email ? user.email.split('@')[0] : 'Reader', role: 'reader', userId: user.id });
  const saved = await loadJSON(accountKey(user.id), null);
  return saved ? sanitizeAccountDoc(saved, fallback) : fallback;
}

export function AccountProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [doc, setDoc] = useState(null);
  const [storageMode, setStorageMode] = useState(getStorageMode());
  const docRef = useRef(null);
  const userRef = useRef(null);
  // Server sync state for backend accounts: 'local' | 'synced' | 'syncing' | 'error'.
  const [sync, setSync] = useState({ state: 'local', message: '' });
  const pushTimer = useRef(null);

  const apply = useCallback((nextUser, nextDoc) => {
    userRef.current = nextUser;
    docRef.current = nextDoc;
    setUser(nextUser);
    setDoc(nextDoc);
  }, []);

  // Restore the session on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let result = { ok: false };
      try {
        result = await authProvider.restoreSession();
      } catch (e) {
        result = { ok: false };
      }
      if (cancelled) return;
      if (result.ok && result.user) {
        let d = await loadDoc(result.user);
        if (result.user.backend) {
          const remote = await profilesRepo.getMine();
          if (remote.ok) {
            d = mergeRemote(d, remote.data);
            await saveJSON(accountKey(result.user.id), d);
            setSync({ state: 'synced', message: '' });
          } else {
            setSync({ state: 'error', message: remote.error });
          }
        }
        if (cancelled) return;
        apply(result.user, d);
      }
      setStorageMode(getStorageMode());
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const persistDoc = useCallback(async (nextDoc) => {
    const u = userRef.current;
    if (!u) return;
    await saveJSON(accountKey(u.id), nextDoc);
    setStorageMode(getStorageMode());
  }, []);

  // Sends the profile and preferences to the server (backend accounts only). Debounced so typing
  // or toggling several switches makes one request. On failure the local copy is kept and the
  // Settings screen offers a retry.
  const pushNow = useCallback(async () => {
    const u = userRef.current;
    const d = docRef.current;
    if (!u || !u.backend || !d) return;
    setSync({ state: 'syncing', message: '' });
    const res = await profilesRepo.updateMine(profilePayload(d));
    if (userRef.current !== u) return; // signed out meanwhile
    setSync(res.ok ? { state: 'synced', message: '' } : { state: 'error', message: res.error });
  }, []);

  const schedulePush = useCallback(() => {
    const u = userRef.current;
    if (!u || !u.backend) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      pushNow();
    }, 800);
  }, [pushNow]);

  const flushPush = useCallback(async () => {
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
      await pushNow();
    }
  }, [pushNow]);

  useEffect(
    () => () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    },
    []
  );

  const commitDoc = useCallback(
    (nextDoc) => {
      docRef.current = nextDoc;
      setDoc(nextDoc);
      persistDoc(nextDoc);
      schedulePush();
    },
    [persistDoc, schedulePush]
  );

  // ---------------------------------------------------------------- auth actions
  const finishSignIn = useCallback(
    async (result, firstDoc) => {
      if (!result.ok) return result;
      let d = await loadDoc(result.user);
      if (firstDoc) {
        d = firstDoc;
      }
      if (result.user.backend) {
        // The server created the profile at sign-up; take its handle and saved preferences.
        const remote = await profilesRepo.getMine();
        if (remote.ok) {
          d = mergeRemote(d, remote.data);
          setSync({ state: 'synced', message: '' });
        } else {
          setSync({ state: 'error', message: remote.error });
        }
      } else {
        setSync({ state: 'local', message: '' });
      }
      if (firstDoc || result.user.backend) await saveJSON(accountKey(result.user.id), d);
      apply(result.user, d);
      setStorageMode(getStorageMode());
      return result;
    },
    [apply]
  );

  const signUp = useCallback(
    async (form) => {
      const result = await authProvider.signUp(form);
      if (!result.ok) return result;
      const taken = directory.map((p) => p.handle);
      const first = newAccountDoc({
        displayName: form.displayName.trim(),
        role: form.role,
        handle: makeHandle(form.displayName, taken),
        userId: result.user.id,
      });
      return finishSignIn(result, first);
    },
    [finishSignIn]
  );

  const signIn = useCallback(async (form) => finishSignIn(await authProvider.signIn(form)), [finishSignIn]);
  const signInDemo = useCallback(async () => finishSignIn(await authProvider.signInDemo()), [finishSignIn]);

  const signOut = useCallback(async () => {
    await flushPush();
    await authProvider.signOut();
    setSync({ state: 'local', message: '' });
    apply(null, null);
  }, [apply, flushPush]);

  // Returns { ok, error? }. For a backend account the server deletes the account FIRST; if that
  // fails, nothing local is removed and the person can try again.
  const deleteAccount = useCallback(async () => {
    const u = userRef.current;
    if (!u) return { ok: true };
    if (u.backend) {
      if (pushTimer.current) {
        clearTimeout(pushTimer.current);
        pushTimer.current = null;
      }
      const res = await authProvider.deleteAccount(u.id, u);
      if (!res.ok) return res;
    }
    apply(null, null); // unmounts per-account providers, which flush their last save
    await new Promise((resolve) => setTimeout(resolve, 80));
    await Promise.all(allUserKeys(u.id).map((k) => removeKey(k)));
    if (!u.backend) await authProvider.deleteAccount(u.id, u);
    setSync({ state: 'local', message: '' });
    return { ok: true };
  }, [apply]);

  // ---------------------------------------------------------------- profile, prefs, follows
  const updateProfile = useCallback(
    (patch) => {
      const current = docRef.current;
      if (!current) return { ok: false, errors: {} };
      const result = applyProfileEdit(current.profile, patch);
      if (result.ok) commitDoc({ ...current, profile: result.profile });
      return result;
    },
    [commitDoc]
  );

  const setPref = useCallback(
    (key, value) => {
      const current = docRef.current;
      if (!current) return;
      commitDoc({ ...current, prefs: { ...current.prefs, [key]: value } });
    },
    [commitDoc]
  );

  const toggleFollow = useCallback(
    (personId) => {
      const current = docRef.current;
      if (!current || !personId || personId === 'me') return false;
      const following = toggleId(current.social.following, personId);
      commitDoc({ ...current, social: { ...current.social, following } });
      return following.includes(personId);
    },
    [commitDoc]
  );

  // Puts the demo account's profile, preferences and follow lists back to the seed.
  const resetDemo = useCallback(() => {
    if (!userRef.current || !userRef.current.isDemo) return;
    commitDoc(demoDoc());
  }, [commitDoc]);

  // ---------------------------------------------------------------- derived
  const profile = doc ? doc.profile : null;
  const prefs = doc ? doc.prefs : null;
  const social = doc ? doc.social : null;

  // The signed-in user as a directory entry (what other screens show).
  const me = useMemo(
    () =>
      profile
        ? {
            id: 'me',
            name: profile.displayName,
            handle: profile.handle,
            bio: profile.bio,
            color: profile.avatarColor,
            avatarUri: profile.avatarUri,
            role: profile.role,
            genres: profile.preferredGenres,
            followers: social.followers.length,
            verified: false,
          }
        : null,
    [profile, social]
  );

  // Keep the mock service in step with the profile so Home, Discover and creator pages agree.
  // (Runs on every profile change; a change refetches the screens through the catalog version.)
  const view = prefs ? publicProfileView(prefs) : null;
  useEffect(() => {
    if (!me) {
      setMyProfile(null);
      return;
    }
    setMyProfile({
      name: me.name,
      handle: me.handle,
      bio: view.showBio ? me.bio : '',
      color: me.color,
      avatarUri: me.avatarUri,
      genres: me.genres,
      followers: me.followers,
      role: me.role,
      hidden: !view.visible,
    });
    bumpCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, view && view.visible, view && view.showBio]);

  const isFollowing = useCallback((id) => Boolean(social) && social.following.includes(id), [social]);
  // Follower number to show for anyone. Yours is real (your list); others are base + you.
  const followerCountFor = useCallback(
    (person) => {
      if (!person) return 0;
      if (person.id === 'me') return social ? social.followers.length : 0;
      return followersShown(person, isFollowing(person.id));
    },
    [social, isFollowing]
  );

  const value = useMemo(
    () => ({
      ready,
      user,
      isDemo: Boolean(user && user.isDemo),
      isSignedIn: Boolean(user),
      storageMode,
      profile,
      prefs,
      social,
      me,
      publicView: view,
      signUp,
      signIn,
      signInDemo,
      signOut,
      deleteAccount,
      authMode: authMode(),
      sync,
      retrySync: pushNow,
      updateProfile,
      setPref,
      toggleFollow,
      isFollowing,
      followerCountFor,
      resetDemo,
    }),
    [
      ready, user, storageMode, profile, prefs, social, me, view, signUp, signIn, signInDemo, signOut,
      deleteAccount, sync, pushNow, updateProfile, setPref, toggleFollow, isFollowing, followerCountFor, resetDemo,
    ]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>');
  return ctx;
}

export { DEMO_USER_ID };
