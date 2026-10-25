// Sample readers. Storytellers live in src/data/creators.js. Together they are the "people
// directory" that follower and following lists are drawn from.
// Readers have role 'reader' and publish nothing.

export const readers = [
  {
    id: 'r1',
    name: 'Nia Adeyemi',
    handle: '@nia.reads',
    bio: 'Night-shift nurse, day-time dragon enthusiast. Reviews every fantasy she finishes.',
    color: '#E85F4F',
    role: 'reader',
    genres: ['Fantasy', 'Adventure'],
    followers: 41,
  },
  {
    id: 'r2',
    name: 'Tomás Herrera',
    handle: '@tomas.pages',
    bio: 'Collects slow mysteries and quiet science fiction. Always mid-book, never in a hurry.',
    color: '#5B52B8',
    role: 'reader',
    genres: ['Mystery', 'Sci-Fi'],
    followers: 27,
  },
  {
    id: 'r3',
    name: 'Mei Lin Zhou',
    handle: '@meilin.reads',
    bio: 'Illustrated stories and cosy slice of life, preferably with tea.',
    color: '#3FA37A',
    role: 'reader',
    genres: ['Slice of Life', 'Romance'],
    followers: 63,
  },
  {
    id: 'r4',
    name: 'Samuel Okoye',
    handle: '@sam.afterhours',
    bio: 'Reads horror with the lights on. Mostly.',
    color: '#312B78',
    role: 'reader',
    genres: ['Horror', 'Mystery'],
    followers: 18,
  },
  {
    id: 'r5',
    name: 'Hannah Becker',
    handle: '@hannah.b',
    bio: 'Audiobook convert learning to love reading on a phone.',
    color: '#B5476B',
    role: 'reader',
    genres: ['Romance', 'Slice of Life'],
    followers: 9,
  },
  {
    id: 'r6',
    name: 'Kofi Mensah',
    handle: '@kofi.quests',
    bio: 'Adventure first, plot second. Looking for the next great road story.',
    color: '#1E6F8C',
    role: 'reader',
    genres: ['Adventure', 'Fantasy'],
    followers: 33,
  },
];

// The demo account starts out following and followed by a few of these people.
export const DEMO_FOLLOWING = ['c1', 'c3', 'r2'];
export const DEMO_FOLLOWERS = ['r1', 'r2', 'r3', 'r4', 'c3'];
