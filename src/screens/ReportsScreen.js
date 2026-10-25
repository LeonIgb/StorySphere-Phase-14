import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import ConfirmSheet from '../components/ConfirmSheet';
import ActionLink from '../components/ActionLink';
import { useCommunity } from '../context/CommunityContext';
import { PROTOTYPE_REPORT_NOTICE, timeAgoFrom } from '../utils/community';
import { colors, radius, spacing, typography } from '../theme/theme';

const TYPE_LABEL = { story: 'Story', comment: 'Comment', review: 'Review', user: 'User', message: 'Message' };

// The reports this account has filed. PROTOTYPE: nothing here is reviewed by anyone.
export default function ReportsScreen({ navigation }) {
  const { reports, withdrawReport } = useCommunity();
  const [confirm, setConfirm] = useState(null);

  return (
    <ScreenContainer>
      <BackHeader title="My reports" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner} accessibilityRole="alert">
          <Ionicons name="flask-outline" size={18} color={colors.indigo900} />
          <Text style={styles.bannerText}>{PROTOTYPE_REPORT_NOTICE}</Text>
        </View>
        {reports.length === 0 ? (
          <EmptyState icon="flag-outline" title="No reports" message="Reports you file on stories, comments, reviews and people are listed here. Use Report on any of them." />
        ) : (
          reports.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.type}>{TYPE_LABEL[r.targetType].toUpperCase()}</Text>
                <Text style={styles.status}>SAVED LOCALLY · NOT REVIEWED</Text>
              </View>
              <Text style={styles.label} numberOfLines={2}>{r.targetLabel || r.targetId}</Text>
              <Text style={styles.reason}>Reason: {r.reason}</Text>
              {r.details ? <Text style={styles.details}>“{r.details}”</Text> : null}
              <View style={styles.row}>
                <Text style={styles.time}>{timeAgoFrom(r.at)}</Text>
                <ActionLink icon="arrow-undo-outline" label="Withdraw" onPress={() => setConfirm(r)} accessibilityLabel={`Withdraw report: ${r.targetLabel}`} />
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <ConfirmSheet
        visible={Boolean(confirm)}
        title="Withdraw this report?"
        message="It is removed from this device. A reported comment or review is shown again."
        confirmLabel="Withdraw"
        icon="arrow-undo-outline"
        onConfirm={() => {
          withdrawReport(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  banner: { flexDirection: 'row', backgroundColor: colors.coral, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  bannerText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo950, lineHeight: 17 },
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  type: { ...typography.micro, fontSize: 11, color: colors.violetText },
  status: { ...typography.micro, fontSize: 11, color: colors.textSecondary },
  label: { ...typography.body, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  reason: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  details: { ...typography.caption, color: colors.textPrimary, marginTop: 4, fontStyle: 'italic' },
  time: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
});
