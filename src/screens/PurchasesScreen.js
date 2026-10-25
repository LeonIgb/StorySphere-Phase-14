import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import FilterTabs from '../components/FilterTabs';
import EmptyState from '../components/EmptyState';
import TxStatusPill from '../components/TxStatusPill';
import DemoPurchaseBanner from '../components/DemoPurchaseBanner';
import { useAccess } from '../context/AccessContext';
import { STATUSES } from '../services/accessService';
import { formatPrice, STATUS_LABEL } from '../utils/pricing';
import { colors, radius, spacing, typography } from '../theme/theme';

export const formatTxDate = (ms) =>
  new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Purchase history: every demo transaction with its status.
export default function PurchasesScreen({ navigation }) {
  const { transactions, spentCents } = useAccess();
  const [filter, setFilter] = useState('all');
  const tabs = [
    { key: 'all', label: 'All', count: transactions.length },
    ...STATUSES.map((st) => ({ key: st, label: STATUS_LABEL[st], count: transactions.filter((t) => t.status === st).length })),
  ];
  const shown = transactions.filter((t) => filter === 'all' || t.status === filter);

  return (
    <ScreenContainer>
      <BackHeader title="Purchases & receipts" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DemoPurchaseBanner compact />
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Total spent (demo)</Text>
          <Text style={styles.summaryValue}>{formatPrice(spentCents)}</Text>
          <Text style={styles.summaryNote}>Completed purchases only. Simulated, not real money.</Text>
        </View>
        <FilterTabs tabs={tabs} value={filter} onChange={setFilter} />
        <View style={styles.spacer} />
        {shown.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title={transactions.length === 0 ? 'No purchases yet' : `No ${STATUS_LABEL[filter].toLowerCase()} purchases`}
            message="Premium stories you unlock will be listed here with their status."
            actionLabel="Find a story"
            onAction={() => navigation.navigate('Discover')}
          />
        ) : (
          shown.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => navigation.openReceipt(t.id)}
              accessibilityRole="button"
              accessibilityLabel={`${t.title}, ${STATUS_LABEL[t.status]}, ${formatPrice(t.amountCents, t.currency)}`}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.text}>
                <Text style={styles.title} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>{formatTxDate(t.createdAt)} · {t.id}</Text>
                <TxStatusPill status={t.status} style={styles.pill} />
              </View>
              <Text style={[styles.amount, t.status !== 'completed' && styles.amountMuted]}>{formatPrice(t.amountCents, t.currency)}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.indigo300} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  spacer: { height: spacing.md },
  summary: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
  summaryValue: { ...typography.title, color: colors.textPrimary, marginTop: 2 },
  summaryNote: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  text: { flex: 1 },
  title: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: 4 },
  pill: { marginTop: 2 },
  amount: { ...typography.heading, fontSize: 15, color: colors.textPrimary, marginHorizontal: spacing.md },
  amountMuted: { color: colors.textSecondary, textDecorationLine: 'line-through' },
});
