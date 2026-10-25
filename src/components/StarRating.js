import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/theme';

// Read-only stars (`value` may be fractional) or, with `onChange`, a 1-5 star input.
export default function StarRating({ value = 0, size = 16, onChange, disabled = false, style }) {
  const stars = [1, 2, 3, 4, 5].map((n) => {
    const icon = value >= n - 0.25 ? 'star' : value >= n - 0.75 ? 'star-half' : 'star-outline';
    if (!onChange) return <Ionicons key={n} name={icon} size={size} color={colors.gold} style={styles.star} />;
    return (
      <Pressable
        key={n}
        onPress={() => onChange(n)}
        disabled={disabled}
        hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
        accessibilityRole="button"
        accessibilityLabel={`Rate ${n} star${n === 1 ? '' : 's'}`}
        accessibilityState={{ selected: Math.round(value) === n, disabled }}
      >
        <Ionicons name={icon} size={size} color={disabled ? colors.indigo300 : colors.gold} style={styles.star} />
      </Pressable>
    );
  });
  return (
    <View style={[styles.row, style]} accessibilityLabel={onChange ? undefined : `${Number(value).toFixed(1)} out of 5 stars`}>
      {stars}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: { marginRight: 2 },
});
