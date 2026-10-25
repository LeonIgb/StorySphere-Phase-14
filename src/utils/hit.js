// Touch-target helpers. Controls that look small (chips, text links, icon buttons) keep their
// look but get an invisible extra touch area, so the tappable size is at least MIN_TARGET.
export const MIN_TARGET = 44;

// Extra touch area for a control of the given size.
export function hitFor(width, height, min = MIN_TARGET) {
  const v = Math.max(0, Math.ceil((min - height) / 2));
  const h = width == null ? 0 : Math.max(0, Math.ceil((min - width) / 2));
  return { top: v, bottom: v, left: h, right: h };
}

// Common presets.
export const HIT_TEXT_LINK = { top: 14, bottom: 14, left: 8, right: 8 }; // ~16px tall text links
export const HIT_SMALL_ROW = { top: 10, bottom: 10, left: 8, right: 8 }; // ~24px actions
export const HIT_CHIP = { top: 6, bottom: 6, left: 0, right: 0 }; // 32px chips and tabs
