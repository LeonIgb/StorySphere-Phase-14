export function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function formatRating(value) {
  const n = Number(value);
  if (n === 0) return 'New'; // no ratings yet (a freshly published story)
  return Number.isFinite(n) ? n.toFixed(1) : '–';
}

export function timeAgo(days) {
  const d = Number(days);
  if (!Number.isFinite(d) || d <= 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Oct 12, 2026" for a story published `days` days before `now`.
export function formatPublishedDate(days, now = new Date()) {
  const d = Number(days);
  const offset = Number.isFinite(d) ? Math.max(0, d) : 0;
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
