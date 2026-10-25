import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { HIT_CHIP } from '../utils/hit';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

// Pill used for genres, filters and interests. `icon` and `style` are optional.
export default function Chip({ label, selected = false, onPress, icon, style }) {
  const fg = selected ? colors.textOnDark : colors.indigo700;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={HIT_CHIP}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.idle,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} style={styles.icon} /> : null}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  idle: { backgroundColor: colors.cream50, borderColor: colors.cream300 },
  selected: { backgroundColor: colors.indigo900, borderColor: colors.indigo900 },
  icon: { marginRight: 6 },
  text: { ...typography.caption, fontWeight: '700' },
});
