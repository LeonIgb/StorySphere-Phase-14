import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, mediaIcons, radius, shadows, spacing, typography } from '../theme/theme';
import { formatCount, formatRating, timeAgo } from '../utils/format';
import AccessBadge from './AccessBadge';
import ProgressBar from './ProgressBar';
import CoverImage from './CoverImage';
import { useCommunity } from '../context/CommunityContext';

// Reusable story preview card.
// variant:  'featured' (large, home hero) | 'tile' (carousel) | 'compact' (list row)
// emphasis: which extra stat the meta row shows: 'newest' | 'popularity' | 'rating' | (default: read time)
// `story` shape: see src/data/stories.js, with `creator` attached by the service layer.

function Cover({ story, height, style, showLabel = false, badgeOnCover = false }) {
  const media = story.mediaType || 'Written';
  return (
    <View style={[styles.cover, { backgroundColor: story.coverColor || colors.indigo700, height }, style]}>
      <Ionicons
        name={story.icon || 'book'}
        size={Math.min(44, height * 0.42)}
        color="rgba(251, 246, 236, 0.9)"
      />
      <CoverImage uri={story.coverUri} />
      <View style={styles.mediaChip}>
        <Ionicons name={mediaIcons[media] || 'document-text'} size={11} color={colors.textOnDark} />
        {showLabel ? <Text style={styles.mediaChipText}>{media.toUpperCase()}</Text> : null}
      </View>
      {badgeOnCover ? <AccessBadge access={story.access} onCover style={styles.coverAccess} /> : null}
    </View>
  );
}

function BookmarkButton({ saved, onToggle, dark }) {
  if (!onToggle) return null;
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from library' : 'Save to library'}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Ionicons
        name={saved ? 'bookmark' : 'bookmark-outline'}
        size={22}
        color={saved ? colors.coral : dark ? colors.textOnDarkMuted : colors.indigo500}
      />
    </Pressable>
  );
}

function MetaItem({ icon, iconColor, text, tone }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={iconColor || tone} />
      <Text style={[styles.metaText, { color: tone }]}>{text}</Text>
    </View>
  );
}

function Meta({ story, dark, emphasis }) {
  const tone = dark ? colors.textOnDarkMuted : colors.textSecondary;
  const media = story.mediaType || 'Written';

  let extra;
  if (emphasis === 'newest') {
    extra = <MetaItem icon="time-outline" text={timeAgo(story.daysAgo)} tone={tone} />;
  } else if (emphasis === 'popularity') {
    extra = <MetaItem icon="heart" iconColor={colors.coral} text={formatCount(story.likes)} tone={tone} />;
  } else if (emphasis === 'rating') {
    extra = <MetaItem icon="people-outline" text={`${formatCount(story.ratingCount)} ratings`} tone={tone} />;
  } else {
    extra = <MetaItem icon="time-outline" text={`${story.readMinutes} min`} tone={tone} />;
  }

  return (
    <View style={styles.metaRow}>
      <MetaItem icon={mediaIcons[media] || 'document-text'} text={media} tone={tone} />
      <MetaItem icon="star" iconColor={colors.gold} text={formatRating(story.rating)} tone={tone} />
      {extra}
    </View>
  );
}

export default function StoryCard({
  story: baseStory,
  variant = 'compact',
  onPress,
  saved = false,
  onToggleSave,
  emphasis,
  progress,
}) {
  // Likes and rating include this account's own reaction and star rating, so every card agrees
  // with the story page.
  const { metricsFor } = useCommunity();
  const story = baseStory ? { ...baseStory, ...metricsFor(baseStory) } : baseStory;
  if (!story) return null;
  const creatorName = story.creator && story.creator.name ? story.creator.name : 'Unknown creator';
  const handlePress = () => onPress && onPress(story);
  const handleToggle = onToggleSave ? () => onToggleSave(story.id) : undefined;
  const a11y = `${story.title} by ${creatorName}, ${story.genre}, ${story.mediaType || 'Written'}, ${
    story.access === 'Premium' ? 'premium' : 'free'
  }`;

  if (variant === 'featured') {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.featured, shadows.card, pressed && styles.pressed]}
      >
        <Cover story={story} height={150} style={styles.featuredCover} showLabel badgeOnCover />
        <View style={styles.featuredBody}>
          <Text style={styles.genreDark}>{story.genre.toUpperCase()}</Text>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {story.title}
          </Text>
          <Text style={styles.featuredBlurb} numberOfLines={2}>
            {story.blurb}
          </Text>
          <View style={styles.featuredFooter}>
            <View style={styles.flex}>
              <Text style={styles.featuredAuthor} numberOfLines={1}>
                {creatorName}
              </Text>
              <Meta story={story} dark emphasis={emphasis || 'popularity'} />
            </View>
            <BookmarkButton saved={saved} onToggle={handleToggle} dark />
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'tile') {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      >
        <Cover story={story} height={120} style={styles.tileCover} badgeOnCover />
        <Text style={styles.tileTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.tileAuthor} numberOfLines={1}>
          {creatorName}
        </Text>
        <View style={styles.metaRow}>
          <MetaItem icon="star" iconColor={colors.gold} text={formatRating(story.rating)} tone={colors.textSecondary} />
          <MetaItem
            icon={mediaIcons[story.mediaType] || 'document-text'}
            text={story.mediaType || 'Written'}
            tone={colors.textSecondary}
          />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.compact, pressed && styles.pressed]}
    >
      <Cover story={story} height={96} style={styles.compactCover} />
      <View style={styles.compactBody}>
        <View style={styles.genreRow}>
          <Text style={styles.genre} numberOfLines={1}>
            {story.genre.toUpperCase()}
          </Text>
          <AccessBadge access={story.access} style={styles.inlineBadge} />
        </View>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.compactAuthor} numberOfLines={1}>
          {creatorName}
        </Text>
        <Meta story={story} emphasis={emphasis} />
        {typeof progress === 'number' ? (
          <View style={styles.progressWrap}>
            <ProgressBar value={progress} height={5} />
            <Text style={styles.progressText}>{Math.round(progress * 100)}% complete</Text>
          </View>
        ) : null}
      </View>
      <BookmarkButton saved={saved} onToggle={handleToggle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  cover: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mediaChip: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 15, 46, 0.55)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  mediaChipText: { ...typography.micro, fontSize: 11, color: colors.textOnDark, marginLeft: 4 },
  coverAccess: { position: 'absolute', right: spacing.sm, top: spacing.sm },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md },
  metaText: { ...typography.caption, fontSize: 12, marginLeft: 4 },

  genreRow: { flexDirection: 'row', alignItems: 'center' },
  genre: { ...typography.micro, fontSize: 11, color: colors.violetText, flexShrink: 1 },
  genreDark: { ...typography.micro, fontSize: 11, color: colors.coral },
  inlineBadge: { marginLeft: spacing.sm },

  // featured
  featured: {
    width: 290,
    backgroundColor: colors.indigo900,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginRight: spacing.lg,
  },
  featuredCover: { borderRadius: 0 },
  featuredBody: { padding: spacing.lg },
  featuredTitle: { ...typography.heading, fontSize: 19, color: colors.textOnDark, marginTop: 4 },
  featuredBlurb: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: 6, lineHeight: 19 },
  featuredFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  featuredAuthor: { ...typography.caption, fontWeight: '700', color: colors.textOnDark },

  // tile
  tile: { width: 150, marginRight: spacing.lg },
  tileCover: { borderRadius: radius.md, marginBottom: spacing.sm },
  tileTitle: { ...typography.caption, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  tileAuthor: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // compact
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cream300,
  },
  compactCover: { width: 84, borderRadius: radius.md },
  compactBody: { flex: 1, marginHorizontal: spacing.md },
  compactTitle: { ...typography.heading, fontSize: 16, color: colors.textPrimary, marginTop: 2 },
  compactAuthor: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  progressWrap: { marginTop: spacing.sm },
  progressText: { ...typography.caption, fontSize: 11, color: colors.textSecondary, marginTop: 3 },
});
