import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function SegmentedControl({ options, value, onChange }) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.cream200,
    borderRadius: radius.pill,
    padding: 4,
    marginHorizontal: spacing.xl,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  selected: { backgroundColor: colors.indigo900 },
  text: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  textSelected: { color: colors.textOnDark },
});
