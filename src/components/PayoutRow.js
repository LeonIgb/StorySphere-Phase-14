import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusPill } from './StatementRow';
import { colors, radius, spacing, typography } from '../theme/theme';
import { dayLabel, formatMoney } from '../utils/earnings';

// One demo payout run. There is deliberately no action button: nothing can be withdrawn.
export default function PayoutRow({ payout }) {
  const upcoming = payout.estimated;
  const note = payout.status === 'held'
    ? 'Held while a confirmed rule violation is reviewed.'
    : payout.belowMinimum
      ? 'Below the demo minimum, so it would carry over to the following run.'
      : upcoming
        ? 'Estimate from entries that will have cleared by then.'
        : `${payout.entryCount.toLocaleString('en-US')} cleared entries`;
  return (
    <View style={styles.row} accessible accessibilityLabel={`Demo payout run, ${dayLabel(payout.runDay)}, ${formatMoney(payout.amountCents)}, ${payout.status}`}>
      <View style={styles.text}>
        <Text style={styles.title}>{upcoming ? 'Next demo run' : 'Demo run'} · {dayLabel(payout.runDay)}</Text>
        <Text style={styles.sub}>{note}</Text>
        <StatusPill status={payout.status} payout />
      </View>
      <Text style={styles.amount}>{upcoming ? '≈ ' : ''}{formatMoney(payout.amountCents)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md, marginBottom: spacing.sm },
  text: { flex: 1 },
  title: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  sub: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginVertical: spacing.xs },
  amount: { ...typography.title, fontSize: 18, color: colors.textPrimary, marginLeft: spacing.sm },
});
