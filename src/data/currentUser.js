import { DEMO_FOLLOWERS, DEMO_FOLLOWING } from './people';

// The seed for the DEMO account (Phase 5). Real signed-in users start from a blank profile
// (see defaultProfile in src/utils/account.js). Edits to the demo profile are saved on the
// device like any other account's; "Reset demo profile" in Settings restores this seed.
export const demoSeed = {
  profile: {
    displayName: 'Zara Whitfield',
    handle: '@zara.reads',
    bio: 'Reader by night, aspiring storyteller by sunrise. Currently collecting cozy mysteries and slow-burn fantasy.',
    avatarColor: '#8B6CF0',
    avatarUri: null,
    preferredGenres: ['Fantasy', 'Mystery', 'Slice of Life'],
    role: 'storyteller',
    joinedAt: '2026-01-15T09:00:00.000Z',
  },
  social: {
    following: DEMO_FOLLOWING,
    followers: DEMO_FOLLOWERS,
  },
};
