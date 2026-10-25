import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ProgressBar from './ProgressBar';
import { colors, spacing, typography } from '../theme/theme';

// One row of a revenue breakdown: label, a bar for its share of net, and amounts (pre-formatted).
export default function RevenueBarRow({ label, meta, share, netText, detail, muted }) {
  const pct = Math.round((share || 0) * 100);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}, net ${netText}, ${pct} percent of net${detail ? `, ${detail}` : ''}`}>
      <View style={styles.top}>
        <View style={styles.names}>
          <Text style={[styles.label, muted && { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
          {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        </View>
        <Text style={[styles.net, muted && { color: colors.textSecondary }]}>{netText}</Text>
      </View>
      <ProgressBar value={share || 0} height={6} color={colors.violet} />
      <Text style={styles.detail}>{pct}% of net{detail ? ` · ${detail}` : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  names: { flex: 1, marginRight: spacing.sm },
  label: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, fontSize: 12, color: colors.textSecondary },
  net: { ...typography.heading, fontSize: 15, color: colors.successText },
  detail: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
});
