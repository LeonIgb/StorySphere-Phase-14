import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { HIT_CHIP } from '../utils/hit';
import { colors, radius, spacing, typography } from '../theme/theme';

// Horizontally scrolling tabs with counts, for sets that don't fit a segmented control.
// tabs: [{ key, label, count? }]
export default function FilterTabs({ tabs, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === value;
        const text = tab.count === undefined ? tab.label : `${tab.label} (${tab.count})`;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            hitSlop={HIT_CHIP}
            accessibilityState={{ selected }}
            accessibilityLabel={text}
            style={[styles.tab, selected && styles.selected]}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>{text}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // flexGrow 0 keeps the strip as tall as its tabs when it sits directly in a column layout.
  scroll: { flexGrow: 0, flexShrink: 0, minHeight: 44 },
  row: { paddingHorizontal: spacing.xl, alignItems: 'center', paddingVertical: 2 },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.cream200,
    marginRight: spacing.sm,
  },
  selected: { backgroundColor: colors.indigo900 },
  text: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  textSelected: { color: colors.textOnDark },
});
