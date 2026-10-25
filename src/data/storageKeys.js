// Where each piece of local prototype data lives. Everything user-specific is keyed by the
// account's id, so two accounts on one device never see each other's data.
//
// The demo account keeps the Phase 4 creator key, so stories made before accounts existed
// still belong to it.

export const AUTH_KEY = 'storysphere.auth.v1';
export const DEMO_USER_ID = 'demo';

export const accountKey = (userId) => `storysphere.account.v1.${userId}`;
export const libraryKey = (userId) => `storysphere.library.v1.${userId}`;
export const readingKey = (userId) => `storysphere.reading.v1.${userId}`;
export const purchasesKey = (userId) => `storysphere.purchases.v1.${userId}`;
export const communityKey = (userId) => `storysphere.community.v1.${userId}`;
export const messagingKey = (userId) => `storysphere.messaging.v1.${userId}`;
export const levelsKey = (userId) => `storysphere.levels.v1.${userId}`;
export const creatorKey = (userId) =>
  userId === DEMO_USER_ID ? 'storysphere.creator.v1' : `storysphere.creator.v1.${userId}`;

// Every key an account owns (used when an account is deleted).
export const allUserKeys = (userId) => [accountKey(userId), libraryKey(userId), readingKey(userId), purchasesKey(userId), communityKey(userId), messagingKey(userId), creatorKey(userId), levelsKey(userId)];
