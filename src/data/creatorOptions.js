// Options and limits for the creator studio (Phase 4).

import { GENRES } from './stories';
import { colors } from '../theme/theme';

// Genres a story can be filed under (the same list readers browse in Discover, minus "All").
export const WORK_GENRES = GENRES.filter((g) => g !== 'All');

// Cover colours for stories that have no cover image (a genre icon sits on top of the colour).
export const COVER_COLORS = ['#312B78', '#25205A', '#8B6CF0', '#5B52B8', '#E85F4F', '#3FA37A', '#B5476B', '#1E6F8C'];

export const LIMITS = {
  title: 80,
  description: 600,
  chapterTitle: 80,
  caption: 200,
  tag: 24,
  tags: 8,
  minTitle: 3,
  minDescription: 10,
};

// The kinds of story a creator can start.
export const STORY_TYPES = [
  {
    key: 'Written',
    icon: 'create-outline',
    title: 'Written story',
    description: 'Write chapters of prose in a distraction-free editor.',
    accent: colors.coral,
    accentSoft: colors.coralSoft,
  },
  {
    key: 'Image',
    icon: 'images-outline',
    title: 'Image story',
    description: 'Arrange ordered images with a caption for each panel.',
    accent: colors.indigo500,
    accentSoft: colors.indigo100,
  },
  {
    key: 'Mixed',
    icon: 'layers-outline',
    title: 'Mixed-media story',
    description: 'Build chapters from text, image, video and audio blocks.',
    accent: colors.violet,
    accentSoft: colors.violetSoft,
  },
  {
    key: 'Video',
    icon: 'videocam-outline',
    title: 'Video story',
    description: 'Upload a video, add a title and description, and publish it.',
    accent: colors.coralDark,
    accentSoft: colors.coralSoft,
  },
];

export const STORAGE_KEY = 'storysphere.creator.v1';
