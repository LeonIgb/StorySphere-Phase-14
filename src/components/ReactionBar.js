import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import { REACTIONS } from '../utils/community';
import { formatCount } from '../utils/format';

// One reaction per person per story. Tapping your current reaction removes it.
export default function ReactionBar({ stats, onReact, style }) {
  return (
    <View style={[styles.row, style]}>
      {REACTIONS.map((r) => {
        const active = stats.mine === r.key;
        const count = stats.breakdown[r.key] || 0;
        return (
          <Pressable
            key={r.key}
            onPress={() => onReact(r.key)}
            hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
            accessibilityRole="button"
            accessibilityLabel={`${active ? 'Remove reaction' : 'React'}: ${r.label}`}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.chip, active && styles.active, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={active ? r.icon : `${r.icon}-outline`} size={16} color={active ? colors.coralDark : colors.indigo700} />
            <Text style={[styles.count, active && { color: colors.coralText }]}>
              {r.label} {formatCount(count)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  active: { borderColor: colors.coral, backgroundColor: colors.coralSoft },
  count: { ...typography.caption, fontWeight: '700', color: colors.indigo700, marginLeft: 6 },
});
