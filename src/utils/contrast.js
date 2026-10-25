// Picks readable text for a coloured background (avatars, tags, covers).
// Returns the light or the dark text colour, whichever gives the higher WCAG contrast ratio.
import { colors } from '../theme/theme';

function luminance(hex) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return 0;
  const channel = (i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function readableOn(background, light = colors.textOnDark, dark = colors.indigo950) {
  return contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
}
