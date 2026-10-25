import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CreatorAvatar from './CreatorAvatar';
import { colors, radius, spacing, typography } from '../theme/theme';

// Tappable creator row that opens the creator profile.
export default function CreatorLink({ creator, onPress, caption, dark = false, style }) {
  if (!creator) return null;
  return (
    <Pressable
      onPress={() => onPress && onPress(creator)}
      accessibilityRole="button"
      accessibilityLabel={`View ${creator.name}`}
      style={({ pressed }) => [styles.row, dark ? styles.rowDark : styles.rowLight, pressed && { opacity: 0.8 }, style]}
    >
      <CreatorAvatar creator={creator} size={40} />
      <View style={styles.text}>
        {caption ? <Text style={[styles.caption, { color: dark ? colors.textOnDarkMuted : colors.textSecondary }]}>{caption}</Text> : null}
        <Text style={[styles.name, { color: dark ? colors.textOnDark : colors.textPrimary }]}>{creator.name}</Text>
        <Text style={[styles.handle, { color: dark ? colors.textOnDarkMuted : colors.textSecondary }]}>{creator.handle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.indigo300} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1 },
  rowLight: { backgroundColor: colors.cream50, borderColor: colors.cream300 },
  rowDark: { backgroundColor: colors.indigo800, borderColor: colors.indigo700 },
  text: { flex: 1, marginLeft: spacing.md },
  caption: { ...typography.micro, fontSize: 11, marginBottom: 1 },
  name: { ...typography.heading, fontSize: 15 },
  handle: { ...typography.caption },
});
