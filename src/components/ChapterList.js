import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import { readMinutes } from '../utils/reading';

// Table of contents. Locked chapters show a lock; free-preview chapters of premium stories are tagged.
// currentIndex: highlighted chapter (or -1). readCount: chapters before this index count as read.
export default function ChapterList({
  chapters,
  currentIndex = -1,
  readCount = 0,
  isLocked,
  showPreviewTag = false,
  price = '',
  onSelect,
  style,
}) {
  if (!chapters || chapters.length === 0) return null;
  return (
    <View style={[styles.list, style]}>
      {chapters.map((chapter, index) => {
        const locked = isLocked ? isLocked(index) : false;
        const read = index < readCount;
        const current = index === currentIndex;
        return (
          <Pressable
            key={chapter.id || index}
            onPress={() => onSelect && onSelect(index)}
            accessibilityRole="button"
            accessibilityLabel={`Chapter ${index + 1}, ${chapter.title}${locked ? ', locked' : ''}${
              read ? ', read' : ''
            }`}
            style={({ pressed }) => [
              styles.row,
              index < chapters.length - 1 && styles.rowBorder,
              current && styles.rowCurrent,
              pressed && { opacity: 0.8 },
            ]}
          >
            <View style={[styles.badge, locked ? styles.badgeLocked : read ? styles.badgeRead : null]}>
              {locked ? (
                <Ionicons name="lock-closed" size={14} color={colors.coralDark} />
              ) : read ? (
                <Ionicons name="checkmark" size={16} color={colors.white} />
              ) : (
                <Text style={styles.badgeText}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={2}>
                {chapter.title}
              </Text>
              <Text style={styles.meta}>
                {chapter.minutes !== undefined ? chapter.minutes : readMinutes(chapter.body)} min read
                {current ? '  ·  Current' : ''}
              </Text>
            </View>
            {locked ? (
              <View style={styles.paidTag}>
                <Text style={styles.paidText}>{price ? `PREMIUM · ${price}` : 'PREMIUM'}</Text>
              </View>
            ) : null}
            {!locked && showPreviewTag ? (
              <View style={styles.previewTag}>
                <Text style={styles.previewText}>FREE PREVIEW</Text>
              </View>
            ) : null}
            <Ionicons
              name={locked ? 'lock-closed-outline' : 'chevron-forward'}
              size={18}
              color={locked ? colors.coralDark : colors.indigo300}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cream300,
    marginHorizontal: spacing.xl,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  rowCurrent: { backgroundColor: colors.violetSoft },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cream200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLocked: { backgroundColor: colors.coralSoft },
  badgeRead: { backgroundColor: colors.success },
  badgeText: { ...typography.caption, fontWeight: '700', color: colors.indigo700 },
  text: { flex: 1, marginHorizontal: spacing.md },
  title: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  meta: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  previewTag: {
    backgroundColor: colors.violetSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: spacing.sm,
  },
  paidTag: { backgroundColor: colors.coralSoft, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, marginRight: spacing.sm },
  paidText: { ...typography.micro, fontSize: 11, color: colors.coralText },
  previewText: { ...typography.micro, fontSize: 11, color: colors.violetText },
});
