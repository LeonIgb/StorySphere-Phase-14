import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

const VARIANTS = {
  primary: { bg: colors.indigo900, fg: colors.textOnDark, border: colors.indigo900 },
  accent: { bg: colors.coral, fg: colors.indigo950, border: colors.coral },
  secondary: { bg: colors.cream50, fg: colors.indigo900, border: colors.cream300 },
  ghost: { bg: 'transparent', fg: colors.indigo700, border: 'transparent' },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;
  const small = size === 'sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={small ? { top: 4, bottom: 4, left: 0, right: 0 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        small ? styles.small : styles.medium,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Ionicons name={icon} size={small ? 16 : 18} color={v.fg} style={styles.icon} />
          ) : null}
          <Text style={[small ? styles.textSmall : styles.text, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  medium: { paddingVertical: 13, paddingHorizontal: spacing.xl, minHeight: 48 },
  small: { paddingVertical: 8, paddingHorizontal: spacing.lg, minHeight: 36 },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { marginRight: spacing.sm },
  text: { ...typography.heading, fontSize: 15 },
  textSmall: { ...typography.caption, fontWeight: '700' },
});
