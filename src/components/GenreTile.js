import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

// Genre browsing tile. `accent` alternates coral / violet down a row.
export default function GenreTile({ name, count = 0, icon = 'book', accent = 'violet', onPress }) {
  const coral = accent === 'coral';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${name}, ${count} ${count === 1 ? 'story' : 'stories'}`}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, { backgroundColor: coral ? colors.coralSoft : colors.violetSoft }]}>
        <Ionicons name={icon} size={20} color={coral ? colors.coralDark : colors.violet} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.count}>
        {count} {count === 1 ? 'story' : 'stories'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 124,
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cream300,
    padding: spacing.md,
    marginRight: spacing.md,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: { ...typography.heading, fontSize: 14, color: colors.textPrimary },
  count: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
