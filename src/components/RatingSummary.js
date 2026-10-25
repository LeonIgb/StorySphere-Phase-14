import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import StarRating from './StarRating';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatCount, formatRating } from '../utils/format';

// Average, star row and the 5-to-1 distribution bars.
export default function RatingSummary({ summary, style }) {
  if (!summary.count) {
    return (
      <View style={style}>
        <Text style={styles.empty}>No ratings yet. Be the first to rate this story.</Text>
      </View>
    );
  }
  return (
    <View style={[styles.row, style]}>
      <View style={styles.left}>
        <Text style={styles.avg} accessibilityLabel={`Average rating ${formatRating(summary.average)} out of 5`}>
          {formatRating(summary.average)}
        </Text>
        <StarRating value={summary.average} size={14} />
        <Text style={styles.count}>{formatCount(summary.count)} ratings</Text>
      </View>
      <View style={styles.bars}>
        {[5, 4, 3, 2, 1].map((n) => {
          const share = summary.count ? summary.distribution[n] / summary.count : 0;
          return (
            <View key={n} style={styles.barRow}>
              <Text style={styles.barLabel}>{n}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  left: { alignItems: 'center', marginRight: spacing.xl },
  avg: { fontSize: 40, fontWeight: '800', color: colors.textPrimary },
  count: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  bars: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  barLabel: { ...typography.caption, width: 14, color: colors.textSecondary },
  track: { flex: 1, height: 7, borderRadius: radius.pill, backgroundColor: colors.cream200, overflow: 'hidden' },
  fill: { height: 7, borderRadius: radius.pill, backgroundColor: colors.gold },
  empty: { ...typography.body, color: colors.textSecondary },
});
