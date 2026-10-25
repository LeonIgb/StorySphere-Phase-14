import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

// A change versus the previous period, as a fraction (0.12 = +12%). null shows nothing.
export function ChangeText({ change }) {
  if (change === null || change === undefined) return null;
  const pct = Math.round(Math.abs(change) * 100);
  if (pct === 0) return <Text style={[styles.change, { color: colors.textSecondary }]}>No change</Text>;
  const up = change > 0;
  return (
    <Text style={[styles.change, { color: up ? colors.success : colors.danger }]} accessibilityLabel={`${up ? 'Up' : 'Down'} ${pct} percent versus the previous period`}>
      {up ? '▲' : '▼'} {pct}%
    </Text>
  );
}

// One headline figure. `value` is already formatted text (the screen formats, this only shows).
export default function StatTile({ label, value, sub, change, tone }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === 'net' && { color: colors.successText }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <ChangeText change={change} />
      {sub ? <Text style={styles.sub} numberOfLines={2}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: '48.5%', backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md, marginBottom: spacing.sm },
  label: { ...typography.micro, color: colors.textSecondary },
  value: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs },
  change: { ...typography.caption, fontWeight: '700', marginTop: 2 },
  sub: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
