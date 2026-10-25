// Sample people and scripted content for the local messaging prototype (Phase 9).
// There are no real users behind these names. Replies are scripted and always labelled as
// simulated in the UI. A real backend replaces all of this.

import { PEOPLE, PEOPLE_BY_ID } from './community';

// Who accepts messages from you. Default: everyone. A real service stores this per user.
//  'followers' = they only accept messages from people who follow them (you must follow them)
//  'nobody'    = they do not accept new messages
export const DM_POLICY = { c1: 'followers', r5: 'nobody' };

export const REPLY_LINES = [
  'Thanks for the message! I will have a proper read and get back to you.',
  'Ha, that made my day. Tell me more.',
  'Love that. Have you read the latest chapter yet?',
  'Good point. I had not looked at it that way.',
  'Appreciate you reaching out. Talk soon!',
  'That is kind of you to say. It really helps.',
];
export const SAMPLE_INCOMING = 'Hi! I came across your profile on StorySphere and wanted to say hello. (Sample message)';

const MIN = 60 * 1000;

// The demo account's starting conversations. `agoMin` is relative to when the account is first
// opened, so the timestamps never go stale.
export const DEMO_CONVERSATIONS = [
  {
    personId: 'c3',
    readThrough: 1, // number of messages already read (the rest are unread)
    messages: [
      { from: 'c3', text: 'Hi Zara! Loved your comment on Salt & Paper Boats.', agoMin: 1800 },
      { from: 'me', text: 'Thank you! Your illustrations are why I read it twice.', agoMin: 1740 },
      { from: 'c3', text: 'That means a lot. I am drafting a new set of panels. Want a sneak peek?', agoMin: 55 },
    ],
  },
  {
    personId: 'r2',
    readThrough: 4,
    messages: [
      { from: 'r2', text: 'Did you finish Static Between Stars?', agoMin: 4300 },
      { from: 'me', text: 'Last night. The ending!', agoMin: 4290 },
      { from: 'r2', text: 'Right?! No spoilers here, but chapter 5 is wild.', agoMin: 4280 },
      { from: 'me', text: 'Agreed. Let us compare notes after chapter 6.', agoMin: 4270 },
    ],
  },
  {
    personId: 'r1',
    readThrough: 0,
    messages: [
      { from: 'r1', text: 'Hey Zara, I loved your review of The Lantern Keeper.', agoMin: 190 },
      { from: 'r1', text: 'Do you have more fantasy recommendations?', agoMin: 185 },
    ],
  },
];

export { PEOPLE, PEOPLE_BY_ID };
