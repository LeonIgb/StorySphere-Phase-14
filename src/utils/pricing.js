import { CURRENCY } from '../data/pricing';

// 349 -> "$3.49". Display only: amounts are always integers (cents) in the data.
export function formatPrice(cents, currency = CURRENCY) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return '';
  const value = (Math.abs(n) / 100).toFixed(2);
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${n < 0 ? '-' : ''}${symbol}${value}`;
}

export const STATUS_LABEL = { pending: 'Pending', completed: 'Completed', failed: 'Failed', refunded: 'Refunded' };
export const STATUS_HELP = {
  pending: 'The payment has not been confirmed yet, so access is not unlocked.',
  completed: 'The payment succeeded and the story is unlocked on this account.',
  failed: 'The payment did not go through. You were not charged and nothing was unlocked.',
  refunded: 'The purchase was refunded and access was removed.',
};
