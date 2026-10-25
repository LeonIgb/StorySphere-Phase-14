import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MediaThumb from './MediaThumb';
import ActionLink from './ActionLink';
import { colors, radius, spacing, typography } from '../theme/theme';
import { STATUS_TEXT, formatClock } from '../utils/messaging';

// One chat message. Yours sit on the right with a local status ("Saved on this device", never
// "delivered"). Scripted messages from sample people carry a "Simulated" tag.
export default function MessageBubble({ message, hidden, onToggleHidden, onRetry, onReport, onOpenStory }) {
  const mine = message.senderId === 'me';
  const a = message.attachment;
  if (hidden) {
    return (
      <View style={[styles.hiddenRow, mine ? styles.right : styles.left]}>
        <Text style={styles.hiddenText}>You reported this message. It is hidden for you.</Text>
        <ActionLink label="Show" onPress={onToggleHidden} accessibilityLabel="Show reported message" />
      </View>
    );
  }
  return (
    <View style={[styles.wrap, mine ? styles.right : styles.left]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {a && a.kind === 'image' ? <MediaThumb uri={a.uri} width={200} height={150} style={styles.image} /> : null}
        {a && a.kind === 'story' ? (
          <Pressable
            onPress={() => onOpenStory(a.storyId)}
            accessibilityRole="button"
            accessibilityLabel={`Shared story: ${a.title}`}
            style={[styles.story, mine ? styles.storyMine : styles.storyTheirs]}
          >
            <Ionicons name="book-outline" size={20} color={mine ? colors.textOnDark : colors.indigo700} />
            <View style={styles.storyText}>
              <Text style={[styles.storyTitle, { color: mine ? colors.textOnDark : colors.textPrimary }]} numberOfLines={2}>{a.title}</Text>
              {a.creatorName ? <Text style={[styles.storyMeta, { color: mine ? colors.textOnDarkMuted : colors.textSecondary }]}>{a.creatorName}</Text> : null}
            </View>
          </Pressable>
        ) : null}
        {message.text ? (
          <Text style={[styles.text, { color: mine ? colors.textOnDark : colors.textPrimary }]} selectable>
            {message.text}
          </Text>
        ) : null}
      </View>
      <View style={[styles.meta, mine ? { justifyContent: 'flex-end' } : null]}>
        <Text style={styles.time}>{formatClock(message.at)}</Text>
        {mine ? (
          <Text style={[styles.status, message.status === 'failed' && { color: colors.dangerText }]} accessibilityLabel={`Status: ${STATUS_TEXT[message.status]}`}>
            · {STATUS_TEXT[message.status]}
          </Text>
        ) : message.simulated ? (
          <Text style={styles.status}>· Simulated</Text>
        ) : null}
      </View>
      {mine && message.status === 'failed' ? (
        <View style={styles.actions}>
          <ActionLink icon="refresh" label="Retry" danger onPress={onRetry} accessibilityLabel="Retry sending message" />
        </View>
      ) : null}
      {!mine ? (
        <View style={styles.actions}>
          <ActionLink icon="flag-outline" label="Report" onPress={onReport} accessibilityLabel="Report this message" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%', marginBottom: spacing.md },
  right: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  left: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  mine: { backgroundColor: colors.indigo800, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.cream50, borderWidth: 1, borderColor: colors.cream300, borderBottomLeftRadius: 4 },
  text: { ...typography.body, lineHeight: 21 },
  image: { borderRadius: radius.md, marginBottom: 6, alignSelf: 'center' },
  story: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.sm, marginBottom: 6 },
  storyMine: { backgroundColor: colors.indigo700 },
  storyTheirs: { backgroundColor: colors.cream200 },
  storyText: { marginLeft: spacing.sm, flexShrink: 1 },
  storyTitle: { ...typography.caption, fontWeight: '700' },
  storyMeta: { ...typography.caption, fontSize: 11 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  time: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
  status: { ...typography.caption, fontSize: 11, color: colors.textSecondary, marginLeft: 4 },
  actions: { flexDirection: 'row', marginTop: 2 },
  hiddenRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cream200, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
  hiddenText: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
});
