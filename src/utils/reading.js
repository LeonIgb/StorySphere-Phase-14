import { Platform } from 'react-native';

// Reader typography and themes, plus small progress helpers.

export const FONT_MIN = 14;
export const FONT_MAX = 28;
export const FONT_STEP = 2;
export const FONT_DEFAULT = 18;

export const READER_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, "Times New Roman", serif',
});

export function clampFontSize(size) {
  const n = Number(size);
  if (!Number.isFinite(n)) return FONT_DEFAULT;
  return Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(n)));
}

export function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// Overall progress: finished units plus the fraction through the current one.
export function overallPercent(position, fraction, total) {
  if (!total || total <= 0) return 0;
  return clamp01((position + clamp01(fraction)) / total);
}

// Scroll offset -> 0..1 fraction. Content shorter than the screen counts as fully read.
export function scrollFraction(offsetY, contentHeight, viewHeight) {
  const max = contentHeight - viewHeight;
  if (!(max > 0)) return 1;
  return clamp01(offsetY / max);
}

export function wordCount(paragraphs = []) {
  return paragraphs
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

// About 200 words per minute, never less than one minute.
export function readMinutes(paragraphs = []) {
  return Math.max(1, Math.round(wordCount(paragraphs) / 200));
}

export function percentLabel(value) {
  return `${Math.round(clamp01(value) * 100)}%`;
}
