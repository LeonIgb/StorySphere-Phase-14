// StorySphere design system: deep indigo, warm cream, restrained coral + violet accents.

export const colors = {
  // Deep indigo scale
  indigo950: '#120F2E',
  indigo900: '#1B1740',
  indigo800: '#25205A',
  indigo700: '#312B78',
  indigo500: '#5B52B8',
  indigo300: '#A39DDB',
  indigo100: '#E3E0F7',

  // Warm cream scale
  cream50: '#FEFBF5',
  cream100: '#FBF6EC',
  cream200: '#F3EBDB',
  cream300: '#E6DCC6',

  // Accents (use sparingly)
  coral: '#FF7A6B',
  coralDark: '#E85F4F',
  coralSoft: '#FFE3DE',
  violet: '#8B6CF0',
  violetSoft: '#ECE6FE',
  // Text-safe versions of the accents (4.5:1 or better on cream and on the soft tints). The plain
  // accents above stay for fills, icons and text on dark backgrounds.
  violetText: '#6B4BD6',
  coralText: '#B83A28',

  // Text
  textPrimary: '#1B1740',
  textSecondary: '#5E5A82',
  textOnDark: '#FBF6EC',
  textOnDarkMuted: '#B9B4E3',

  // Status
  success: '#3FA37A',
  successText: '#26704F',
  danger: '#D64545',
  dangerText: '#B53636',
  gold: '#E3A63A',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Widest the content gets on tablets and wide windows.
export const MAX_CONTENT_WIDTH = 720;

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 };

export const typography = {
  display: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500' },
  micro: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
};

// A horizontal ScrollView must not grow vertically inside a column (it stretches into tall pills).
export const hscroll = { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' };

export const shadows = {
  card: {
    shadowColor: '#1B1740',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#FF7A6B',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

// Genre -> icon used on story covers and chips.
export const genreIcons = {
  Fantasy: 'sparkles',
  'Sci-Fi': 'planet',
  'Slice of Life': 'cafe',
  Mystery: 'search',
  Romance: 'heart',
  Horror: 'moon',
  Adventure: 'compass',
};

// Reader colour themes (cream matches the app, night is easy on the eyes after dark).
export const readerThemes = {
  cream: {
    name: 'cream',
    bg: colors.cream50,
    text: colors.indigo900,
    muted: colors.textSecondary,
    surface: colors.cream200,
    border: colors.cream300,
    accent: colors.violet,
    bar: colors.cream300,
    barFill: colors.coral,
  },
  night: {
    name: 'night',
    bg: colors.indigo950,
    text: '#E9E4F8',
    muted: colors.textOnDarkMuted,
    surface: colors.indigo800,
    border: colors.indigo700,
    accent: colors.coral,
    bar: colors.indigo700,
    barFill: colors.coral,
  },
};

// Story media type -> icon.
export const mediaIcons = {
  Written: 'document-text',
  Image: 'image',
  Video: 'videocam',
  Mixed: 'layers',
};
