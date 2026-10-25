// Demo price list for premium stories. In production the PRICE LIST LIVES ON THE SERVER: the
// app only displays what the server quotes, and the server charges its own price, never one the
// client sends. Prices are in the smallest currency unit (cents), one-time purchase per story.

export const CURRENCY = 'USD';
export const MIN_PRICE_CENTS = 99;
export const MAX_PRICE_CENTS = 2999;

// What creators can choose for their own premium stories (Create > story settings).
export const PRICE_TIERS = [99, 199, 299, 399, 499, 699];
export const DEFAULT_PRICE_CENTS = 299;

const BY_FORMAT = { Written: 299, Mixed: 399, Image: 249, Video: 449 };
const OVERRIDES = { s2: 399, s4: 249, s5: 349, s9: 499, s13: 449, s15: 299 };

// The quoted price of a premium story, or null for a free one.
export function priceFor(story) {
  if (!story || story.access !== 'Premium') return null;
  if (Number.isInteger(story.priceCents) && story.priceCents >= MIN_PRICE_CENTS) return story.priceCents;
  return OVERRIDES[story.id] || BY_FORMAT[story.mediaType] || DEFAULT_PRICE_CENTS;
}
