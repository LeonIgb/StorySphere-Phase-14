import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressBar from './ProgressBar';
import { colors, radius, spacing, typography } from '../theme/theme';
import { progressText } from '../utils/levels';

export const TIER_COLORS = { bronze: '#C58A5A', silver: '#9AA3B2', gold: colors.gold, platinum: colors.violet };

const dateText = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// One achievement badge: earned (coloured), in progress (progress bar), or unavailable.
export default function BadgeTile({ badge }) {
  const tint = TIER_COLORS[badge.tier] || colors.indigo500;
  const state = badge.earned ? 'earned' : badge.withheld ? 'paused' : badge.supported ? 'progress' : 'unavailable';
  const label =
    state === 'earned'
      ? `${badge.title}, earned`
      : state === 'progress'
        ? `${badge.title}, ${progressText(badge)}`
        : state === 'paused'
          ? `${badge.title}, paused for review`
          : `${badge.title}, not available`;
  return (
    <View style={[styles.tile, state === 'earned' && { borderColor: tint }]} accessible accessibilityLabel={label}>
      <View style={[styles.medal, { backgroundColor: state === 'earned' ? tint : colors.cream200 }]}>
        <Ionicons
          name={state === 'earned' ? badge.icon : state === 'unavailable' || state === 'paused' ? 'lock-closed' : badge.icon}
          size={22}
          color={state === 'earned' ? colors.white : colors.indigo300}
        />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, state !== 'earned' && { color: colors.textSecondary }]} numberOfLines={2}>{badge.title}</Text>
        <Text style={styles.desc} numberOfLines={3}>{badge.description}</Text>
        {state === 'earned' ? (
          <Text style={[styles.status, { color: colors.successText }]}>Earned{badge.unlockedAt ? ` · ${dateText(badge.unlockedAt)}` : ''}</Text>
        ) : state === 'progress' ? (
          <View style={styles.bar}>
            <ProgressBar value={badge.fraction} height={6} color={tint} />
            <Text style={styles.status}>{progressText(badge)}</Text>
          </View>
        ) : state === 'paused' ? (
          <Text style={styles.status}>Paused while activity is reviewed</Text>
        ) : (
          <Text style={styles.status}>Not available yet</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.cream300,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  medal: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  text: { flex: 1 },
  title: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  desc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  bar: { marginTop: spacing.sm },
  status: { ...typography.caption, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.xs },
});
