import { useEffect, useState } from 'react';

// A tiny "the catalog changed" signal. The creator studio bumps it when a story goes live, is
// unpublished, is deleted, or a scheduled story is released. useAsync listens, so every screen
// that loaded stories (Home, Discover, Library, Profile, story pages) refetches by itself.
let version = 0;
const listeners = new Set();

export function bumpCatalog() {
  version += 1;
  listeners.forEach((listener) => listener(version));
}

export function getCatalogVersion() {
  return version;
}

export function useCatalogVersion() {
  const [value, setValue] = useState(version);
  useEffect(() => {
    const listener = (next) => setValue(next);
    listeners.add(listener);
    setValue(version); // catch a bump that happened between render and subscribe
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return value;
}
