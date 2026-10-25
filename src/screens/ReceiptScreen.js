import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import ConfirmSheet from '../components/ConfirmSheet';
import TxStatusPill from '../components/TxStatusPill';
import DemoPurchaseBanner from '../components/DemoPurchaseBanner';
import { useAccess } from '../context/AccessContext';
import { formatPrice, STATUS_HELP } from '../utils/pricing';
import { colors, radius, spacing, typography } from '../theme/theme';

const dt = (ms) => (ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// One transaction: status, details, and the demo-only controls to settle or refund it.
export default function ReceiptScreen({ txId, navigation }) {
  const { transactions, resolvePending, refund } = useAccess();
  const tx = transactions.find((t) => t.id === txId);
  const [busy, setBusy] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [message, setMessage] = useState('');

  if (!tx) {
    return (
      <ScreenContainer>
        <BackHeader title="Receipt" onBack={navigation.goBack} />
        <EmptyState icon="receipt-outline" title="Receipt not found" message="This transaction is not on this account." actionLabel="Go back" onAction={navigation.goBack} />
      </ScreenContainer>
    );
  }

  const run = async (fn, doneText) => {
    setBusy(true);
    setMessage('');
    try {
      const r = await fn();
      setMessage(r.ok ? doneText : r.message || 'That did not work.');
    } catch (e) {
      setMessage(e && e.message ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <BackHeader title="Receipt" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DemoPurchaseBanner compact />
        <View style={styles.pad}>
          <Text style={styles.title}>{tx.title}</Text>
          <Text style={styles.sub}>{tx.creatorName ? `by ${tx.creatorName}` : ''}</Text>
          <View style={styles.statusRow}>
            <TxStatusPill status={tx.status} />
            <Text style={styles.amount}>{formatPrice(tx.amountCents, tx.currency)}</Text>
          </View>
          <Text style={styles.help}>{STATUS_HELP[tx.status]}</Text>
          {tx.status === 'failed' && tx.failureReason ? <Text style={styles.help}>Reason: {tx.failureReason}</Text> : null}

          <View style={styles.card}>
            <Row label="Reference" value={tx.id} />
            <Row label="Method" value={tx.method} />
            <Row label="Started" value={dt(tx.createdAt)} />
            <Row label="Completed" value={dt(tx.completedAt)} />
            {tx.status === 'refunded' ? <Row label="Refunded" value={dt(tx.refundedAt)} /> : null}
            <Row label="Currency" value={tx.currency} last />
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.indigo700} />
            <Text style={styles.noticeText}>
              This is a simulated record kept on this device. It is not a real payment, invoice or legal receipt.
            </Text>
          </View>

          {message ? <Text style={styles.message} accessibilityRole="alert">{message}</Text> : null}

          {tx.status === 'pending' ? (
            <>
              <Text style={styles.section}>Demo controls</Text>
              <Text style={styles.help}>In a real store the payment provider confirms this by itself. Here you play that part.</Text>
              <Button title="Simulate payment confirmed" icon="checkmark-circle-outline" variant="accent" fullWidth loading={busy} style={styles.gap} onPress={() => run(() => resolvePending(tx.id, 'completed'), 'Payment confirmed. The story is unlocked.')} />
              <Button title="Simulate payment failed" icon="close-circle-outline" variant="secondary" fullWidth disabled={busy} style={styles.gap} onPress={() => run(() => resolvePending(tx.id, 'failed'), 'Payment marked as failed. Nothing was unlocked.')} />
            </>
          ) : null}
          {tx.status === 'completed' ? (
            <Button title="Request demo refund" icon="return-down-back-outline" variant="secondary" fullWidth disabled={busy} style={styles.gap} onPress={() => setConfirmRefund(true)} />
          ) : null}
          <Button
            title={tx.status === 'completed' ? 'Open story' : 'View story'}
            icon="book-outline"
            variant={tx.status === 'completed' ? 'primary' : 'ghost'}
            fullWidth
            style={styles.gap}
            onPress={() => navigation.openStory(tx.storyId)}
          />
          {tx.status === 'failed' || tx.status === 'refunded' ? (
            <Button title="Unlock again" icon="lock-open-outline" variant="accent" fullWidth style={styles.gap} onPress={() => navigation.openUnlock(tx.storyId)} />
          ) : null}
        </View>
      </ScrollView>
      <ConfirmSheet
        visible={confirmRefund}
        title="Refund this demo purchase?"
        message="The story will be locked again on this account. This only affects the simulated record; no real money is involved."
        confirmLabel="Refund"
        destructive
        icon="return-down-back-outline"
        onConfirm={() => {
          setConfirmRefund(false);
          run(() => refund(tx.id), 'Refunded. The story is locked again.');
        }}
        onCancel={() => setConfirmRefund(false)}
      />
    </ScreenContainer>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  pad: { paddingHorizontal: spacing.xl },
  title: { ...typography.title, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  amount: { ...typography.title, color: colors.textPrimary },
  help: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 18 },
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, marginTop: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  rowLabel: { ...typography.caption, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.textPrimary, flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  notice: { flexDirection: 'row', backgroundColor: colors.violetSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  noticeText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, lineHeight: 18 },
  message: { ...typography.body, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.md },
  section: { ...typography.heading, fontSize: 15, color: colors.textPrimary, marginTop: spacing.lg },
  gap: { marginTop: spacing.md },
});
