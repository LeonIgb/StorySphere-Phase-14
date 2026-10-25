import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import { ENTRY_STATUS_LABEL, PAYOUT_STATUS_LABEL, dayLabel, formatMoney } from '../utils/earnings';

const TONES = {
  clearing: { bg: '#FBEFD2', fg: '#8A6410' },
  cleared: { bg: '#E3F4EC', fg: '#1F6B4B' },
  paid: { bg: colors.violetSoft, fg: colors.violetText },
  completed: { bg: colors.violetSoft, fg: colors.violetText },
  scheduled: { bg: '#FBEFD2', fg: '#8A6410' },
  held: { bg: colors.coralSoft, fg: colors.coralText },
};
const ICONS = { sale: 'cash-outline', refund: 'return-down-back-outline', payout: 'swap-vertical-outline' };

export function StatusPill({ status, payout }) {
  const tone = TONES[status] || TONES.clearing;
  const label = payout ? PAYOUT_STATUS_LABEL[status] || status : ENTRY_STATUS_LABEL[status] || status;
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]} accessibilityLabel={`Status ${label}`}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{String(label).toUpperCase()}</Text>
    </View>
  );
}

// One line of the transaction history. Amounts are formatted here from integer cents; no maths.
export default function StatementRow({ row }) {
  const isPayout = row.kind === 'payout';
  const title =
    row.kind === 'sale' ? `${row.units.toLocaleString('en-US')} sale${row.units === 1 ? '' : 's'} · ${row.title}` :
    row.kind === 'refund' ? `${row.units.toLocaleString('en-US')} refund${row.units === 1 ? '' : 's'} · ${row.title}` :
    row.title;
  const sub = isPayout
    ? `${dayLabel(row.day)} · ${row.units.toLocaleString('en-US')} cleared entries · demo, no money moved`
    : `${dayLabel(row.day)} · ${row.mediaType} · ${formatMoney(row.gross)} gross · ${formatMoney(row.fees)} fees`;
  const amount = `${row.amountCents > 0 ? '+' : ''}${formatMoney(row.amountCents)}`;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}, ${amount}, ${sub}`}>
      <View style={styles.icon}>
        <Ionicons name={ICONS[row.kind]} size={18} color={colors.indigo500} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.sub} numberOfLines={2}>{sub}</Text>
        <StatusPill status={row.status} payout={isPayout} />
      </View>
      <Text style={[styles.amount, { color: row.amountCents >= 0 ? colors.success : colors.textPrimary }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md, marginBottom: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.violetSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  text: { flex: 1 },
  title: { ...typography.heading, fontSize: 14, color: colors.textPrimary },
  sub: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xs },
  amount: { ...typography.heading, fontSize: 15, marginLeft: spacing.sm },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { ...typography.micro, fontSize: 11 },
});
