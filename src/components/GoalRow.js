import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { TIER_COLORS } from './BadgeTile';
import { colors, radius, spacing, typography } from '../theme/theme';
import { progressText } from '../utils/levels';

// A "next goal": the closest unearned badge in one track, with its progress.
export default function GoalRow({ badge }) {
  const tint = TIER_COLORS[badge.tier] || colors.indigo500;
  return (
    <View style={styles.row} accessible accessibilityLabel={`Next goal: ${badge.title}, ${progressText(badge)}`}>
      <View style={[styles.icon, { backgroundColor: tint }]}>
        <Ionicons name={badge.icon} size={18} color={colors.white} />
      </View>
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>{badge.title}</Text>
          <Text style={styles.count}>{progressText(badge)}</Text>
        </View>
        <ProgressBar value={badge.fraction} height={7} color={tint} />
        <Text style={styles.desc} numberOfLines={2}>{badge.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md, marginBottom: spacing.sm },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  text: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.xs },
  title: { ...typography.heading, fontSize: 15, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  count: { ...typography.caption, fontWeight: '700', color: colors.indigo700 },
  desc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
