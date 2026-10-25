import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import CoverImage from './CoverImage';
import AccessBadge from './AccessBadge';
import { colors, mediaIcons, radius, spacing, typography } from '../theme/theme';

// One story in the library. Tap the row to open it (`onPress`); the trailing button removes it
// from the current list (`onRemove`, omitted for lists you can't remove from).
export default function LibraryRow({ item, onPress, onRemove, removeLabel = 'Remove' }) {
  const { story, progress, status } = item;
  const creator = story.creator ? story.creator.name : 'Unknown creator';
  const showBar = progress && !progress.finished && progress.percent > 0;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${story.title} by ${creator}, ${status}`}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.cover, { backgroundColor: story.coverColor || colors.indigo700 }]}>
          <Ionicons name={mediaIcons[story.mediaType] || 'book'} size={22} color="rgba(251,246,236,0.9)" />
          <CoverImage uri={story.coverUri} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>{story.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {creator} · {story.genre} · {story.mediaType || 'Written'}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.status} numberOfLines={1}>{status}</Text>
            <AccessBadge access={story.access} />
          </View>
          {showBar ? <ProgressBar value={progress.percent} height={5} style={styles.bar} /> : null}
        </View>
      </Pressable>
      {onRemove ? (
        <Pressable
          onPress={() => onRemove(item)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${removeLabel} ${story.title}`}
          style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="close-circle-outline" size={24} color={colors.indigo300} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream200,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  cover: { width: 56, height: 76, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, marginHorizontal: spacing.md },
  title: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  status: { ...typography.caption, fontWeight: '700', color: colors.violetText, marginRight: spacing.sm, flexShrink: 1 },
  bar: { marginTop: 6 },
  remove: { padding: 4 },
});
