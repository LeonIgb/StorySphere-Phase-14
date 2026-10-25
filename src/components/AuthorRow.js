import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';
import { readableOn } from '../utils/contrast';
import { timeAgoFrom } from '../utils/community';

// Avatar circle + name + "time ago" used by comments and reviews. Tapping opens the profile.
export default function AuthorRow({ author, at, edited, onPress, small = false }) {
  const size = small ? 28 : 34;
  const initials = String(author.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${author.name}'s profile`} style={styles.row}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: author.color || colors.indigo500 }]}>
        <Text style={[styles.initials, { fontSize: small ? 11 : 13, color: readableOn(author.color || colors.indigo500) }]}>{initials}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {author.isMe ? `${author.name} (you)` : author.name}
        </Text>
        <Text style={styles.time}>
          {timeAgoFrom(at)}
          {edited ? ' · edited' : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flex: 1, minHeight: 44 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.white, fontWeight: '800' },
  text: { marginLeft: spacing.sm, flexShrink: 1 },
  name: { ...typography.caption, fontWeight: '700', color: colors.textPrimary },
  time: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
});
