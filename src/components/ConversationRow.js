import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CreatorAvatar from './CreatorAvatar';
import { colors, spacing, typography } from '../theme/theme';
import { listTime } from '../utils/messaging';

// One conversation in the list: avatar, name, last-message preview, time and unread badge.
export default function ConversationRow({ conversation, onPress }) {
  const { person, unread, preview, at } = conversation;
  const label = `${person.name}${unread > 0 ? `, ${unread} unread` : ''}, ${preview}`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <CreatorAvatar creator={person} size={48} />
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={[styles.name, unread > 0 && styles.bold]} numberOfLines={1}>{person.name}</Text>
          <Text style={[styles.time, unread > 0 && { color: colors.coralText, fontWeight: '700' }]}>{listTime(at)}</Text>
        </View>
        <View style={styles.bottom}>
          <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>{preview}</Text>
          {unread > 0 ? (
            <View style={styles.badge} accessibilityLabel={`${unread} unread`}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  text: { flex: 1, marginLeft: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  name: { ...typography.heading, fontSize: 15, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  bold: { fontWeight: '800' },
  time: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
  preview: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  previewUnread: { color: colors.textPrimary, fontWeight: '700' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: spacing.sm },
  badgeText: { color: colors.indigo950, fontSize: 11, fontWeight: '800' },
});
