import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

function Mini({ name, label, onPress, disabled, danger }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [styles.mini, disabled && styles.disabled, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={name} size={18} color={danger ? colors.danger : colors.indigo700} />
    </Pressable>
  );
}

// Move up / move down / delete, used on chapters, images and blocks.
export default function RowActions({ onUp, onDown, onDelete, canUp = true, canDown = true, name = 'item', style }) {
  return (
    <View style={[styles.row, style]}>
      <Mini name="chevron-up" label={`Move ${name} up`} onPress={onUp} disabled={!canUp} />
      <Mini name="chevron-down" label={`Move ${name} down`} onPress={onDown} disabled={!canDown} />
      {onDelete ? <Mini name="trash-outline" label={`Delete ${name}`} onPress={onDelete} danger /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  mini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream200,
  },
  disabled: { opacity: 0.35 },
});
