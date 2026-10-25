import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import MediaThumb from './MediaThumb';
import StatusPill from './StatusPill';
import { colors, genreIcons, mediaIcons, radius, spacing, typography } from '../theme/theme';
import { workSummary } from '../utils/creator';
import { describeCountdown, editedLabel, formatDateTime } from '../utils/schedule';
import { formatPublishedDate } from '../utils/format';

// A story in the creator studio: cover, status, summary and the actions that fit its status.
export default function WorkCard({ work, onEdit, onPreview, onPrimary, onDelete }) {
  const title = work.title.trim() || 'Untitled story';
  const icon = genreIcons[work.genre] || 'book';

  let primaryLabel = 'Publish';
  let primaryIcon = 'rocket-outline';
  if (work.status === 'published') {
    primaryLabel = 'Unpublish';
    primaryIcon = 'eye-off-outline';
  } else if (work.status === 'scheduled') {
    primaryLabel = 'Cancel schedule';
    primaryIcon = 'close-circle-outline';
  }

  let when = `Edited ${editedLabel(work.updatedAt)}`;
  if (work.status === 'scheduled') {
    when = `Goes live ${formatDateTime(work.scheduledFor)} (${describeCountdown(work.scheduledFor)}), if the app is open`;
  } else if (work.status === 'published' && work.publishedAt) {
    const days = Math.max(0, Math.floor((Date.now() - Date.parse(work.publishedAt)) / 86400000));
    when = `Published ${formatPublishedDate(days)}`;
  }

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${title}`}
        style={({ pressed }) => [styles.top, pressed && { opacity: 0.9 }]}
      >
        <MediaThumb uri={work.coverUri} kind="cover" width={72} height={96} color={work.coverColor} icon={icon} />
        <View style={styles.body}>
          <StatusPill status={work.status} />
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name={mediaIcons[work.mediaType] || 'document-text'} size={13} color={colors.textSecondary} />
            <Text style={styles.meta} numberOfLines={1}>
              {work.mediaType} {'·'} {work.access} {'·'} {workSummary(work)}
            </Text>
          </View>
          <Text style={styles.when}>{when}</Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Button title="Edit" icon="create-outline" size="sm" onPress={onEdit} style={styles.action} />
        <Button title="Preview" icon="eye-outline" size="sm" variant="secondary" onPress={onPreview} style={styles.action} />
        <Button
          title={primaryLabel}
          icon={primaryIcon}
          size="sm"
          variant={work.status === 'draft' ? 'accent' : 'secondary'}
          onPress={onPrimary}
          style={styles.action}
        />
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          style={({ pressed }) => [styles.trash, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={19} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cream300,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  top: { flexDirection: 'row' },
  body: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.heading, fontSize: 16, color: colors.textPrimary, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginLeft: 5, flex: 1 },
  when: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: spacing.md },
  action: { marginRight: spacing.sm, marginBottom: 2 },
  trash: {
    marginLeft: 'auto',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coralSoft,
  },
});
