import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useSheetInsets } from '../utils/insets';
import { FEE_SCHEDULE, feesForPrice, formatMoney, refundForPrice } from '../utils/earnings';
import { colors, radius, spacing, typography } from '../theme/theme';

// "How earnings are calculated". Every figure comes from the fee schedule and the same money
// functions the dashboard uses, so this text cannot disagree with the numbers.
export default function EarningsInfoSheet({ visible, onClose, schedule = FEE_SCHEDULE }) {
  const insets = useSheetInsets();
  const ex = feesForPrice(299, schedule);
  const rf = refundForPrice(299, schedule);
  const pct = (bps) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
  return (
    <Modal transparent visible={Boolean(visible)} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, insets]}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">How earnings are calculated</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close earnings explanation" hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.indigo700} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.warn}>Demonstration only ({schedule.version}). These are not real earnings, the fee rates are illustrative, and no payout is available.</Text>

            <Text style={styles.h}>Fee schedule (estimated)</Text>
            <Text style={styles.p}>
              • Platform fee: {pct(schedule.platformFeeBps)} of the sale price.{'\n'}
              • Payment processing: {pct(schedule.processing.bps)} of the sale price plus {formatMoney(schedule.processing.fixedCents)} per sale.{'\n'}
              • Net earnings = gross sales − refunds − platform fee − processing fee.
            </Text>

            <Text style={styles.h}>Example: one {formatMoney(ex.gross)} sale</Text>
            <Text style={styles.p}>
              Gross {formatMoney(ex.gross)}, platform fee {formatMoney(ex.platformFee)}, processing fee {formatMoney(ex.processingFee)}, net {formatMoney(ex.net)}.{'\n'}
              If it is refunded: the reader gets {formatMoney(-rf.gross)} back, the platform fee ({formatMoney(-rf.platformFee)}) is returned and the processing fee is kept, so the balance falls by {formatMoney(-rf.net)}.
            </Text>

            <Text style={styles.h}>Money handling</Text>
            <Text style={styles.p}>Amounts are whole cents, with rounding once per sale (half up). A batch of sales has exactly that many times the fees of one sale, so every total is the exact sum of its parts.</Text>

            <Text style={styles.h}>Clearing and payouts (demo)</Text>
            <Text style={styles.p}>
              • A sale is "Clearing" for {schedule.holdDays} days (the refund window), then "Cleared".{'\n'}
              • Demo payout runs happen every {schedule.payout.runEveryDays} days and include everything cleared and not yet included. A run under {formatMoney(schedule.payout.minCents)} carries over.{'\n'}
              • A run is held for review for up to {schedule.payout.reviewHoldDays} days after a confirmed major rule violation.{'\n'}
              • "Paid out (demo)" is a label in sample data. No money moves, no payout method exists, and the app cannot send a payout.
            </Text>

            <Text style={styles.h}>Audience numbers</Text>
            <Text style={styles.p}>Reads, readers, engagement and follower growth use the same validated sample ledger as the leaderboards and levels: invalid reads are excluded, and unexplained spikes are held back. Earnings are never reduced by ranking rules; only confirmed sales count.</Text>

            <Text style={styles.h}>Your own account</Text>
            <Text style={styles.p}>Stories you publish here have no readers or buyers, so your dashboard shows your real story counts and no earnings. Sample storytellers show the full dashboard.</Text>

            <Text style={styles.h}>In production</Text>
            <Text style={styles.p}>A server would keep an append-only earnings ledger written from payment-provider confirmations, calculate fees with a versioned schedule, and run a payout service with identity checks, holds and reconciliation. The app would only display the result.</Text>
          </ScrollView>
          <Button title="Got it" onPress={onClose} style={styles.btn} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 15, 46, 0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream50, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '88%' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.title, color: colors.textPrimary, flex: 1, marginRight: spacing.md },
  warn: { ...typography.caption, color: colors.coralText, backgroundColor: colors.coralSoft, padding: spacing.md, borderRadius: radius.md },
  h: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  p: { ...typography.body, color: colors.textSecondary },
  btn: { marginTop: spacing.md },
});
