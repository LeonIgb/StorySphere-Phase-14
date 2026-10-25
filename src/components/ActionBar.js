import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

function Action({ icon, activeIcon, label, active, onPress, dark }) {
  const fg = active ? colors.coral : dark ? colors.textOnDark : colors.indigo900;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: Boolean(active) }}
      style={({ pressed }) => [
        styles.action,
        dark ? styles.actionDark : styles.actionLight,
        active && styles.actionActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={active ? activeIcon : icon} size={20} color={fg} />
      <Text style={[styles.label, { color: dark ? colors.textOnDark : colors.indigo900 }]}>{label}</Text>
    </Pressable>
  );
}

// Save to library (bookmark), Favorite (heart) and Share.
export default function ActionBar({ saved, favorite, onSave, onFavorite, onShare, dark = false, style }) {
  return (
    <View style={[styles.row, style]}>
      <Action
        icon="bookmark-outline"
        activeIcon="bookmark"
        label={saved ? 'Saved' : 'Save'}
        active={saved}
        onPress={onSave}
        dark={dark}
      />
      <Action
        icon="heart-outline"
        activeIcon="heart"
        label={favorite ? 'Favorited' : 'Favorite'}
        active={favorite}
        onPress={onFavorite}
        dark={dark}
      />
      <Action icon="share-outline" activeIcon="share" label="Share" onPress={onShare} dark={dark} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  actionLight: { backgroundColor: colors.cream50, borderColor: colors.cream300 },
  actionDark: { backgroundColor: colors.indigo800, borderColor: colors.indigo700 },
  actionActive: { borderColor: colors.coral },
  label: { ...typography.caption, fontWeight: '700', marginLeft: 6 },
});
