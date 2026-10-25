import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import Field from './Field';
import { useCommunity } from '../context/CommunityContext';
import { LIMITS, PROTOTYPE_REPORT_NOTICE, REPORT_REASONS } from '../utils/community';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { useSheetInsets } from '../utils/insets';

const NOUN = { story: 'story', comment: 'comment', review: 'review', user: 'user', message: 'message' };

// Report a story, comment, review or user. PROTOTYPE: the report is stored on this device and goes
// nowhere. The sheet says so before and after sending, so it is never mistaken for moderation.
// target: { type, id, label, ownerId } or null (closed).
export default function ReportSheet({ target, onClose }) {
  const sheetInsets = useSheetInsets();
  const { report } = useCommunity();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setReason('');
    setDetails('');
    setError('');
    setDone(false);
  }, [target && target.type, target && target.id]);

  if (!target) return null;
  const reasons = REPORT_REASONS[target.type] || [];

  const submit = () => {
    if (done) return;
    if (!reason) {
      setError('Choose a reason.');
      return;
    }
    const result = report({ targetType: target.type, targetId: target.id, targetLabel: target.label, reason, details, ownerId: target.ownerId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setDone(true);
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, sheetInsets]} onPress={onClose} accessibilityLabel="Dismiss report">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.titleRow}>
              <Ionicons name="flag-outline" size={22} color={colors.coralDark} />
              <Text style={styles.title}>Report this {NOUN[target.type]}</Text>
            </View>
            <Text style={styles.label} numberOfLines={2}>{target.label}</Text>
            <View style={styles.notice} accessibilityRole="alert">
              <Ionicons name="flask-outline" size={18} color={colors.indigo900} />
              <Text style={styles.noticeText}>{PROTOTYPE_REPORT_NOTICE}</Text>
            </View>
            {done ? (
              <>
                <View style={styles.doneBox}>
                  <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                  <Text style={styles.doneTitle}>Prototype report saved</Text>
                  <Text style={styles.doneText}>It is on this device only. You can review or withdraw it under Settings &gt; My reports.</Text>
                </View>
                <Button title="Done" onPress={onClose} fullWidth />
              </>
            ) : (
              <>
                <Text style={styles.section}>Why are you reporting this?</Text>
                {reasons.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setReason(r);
                      setError('');
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={r}
                    accessibilityState={{ selected: reason === r }}
                    style={[styles.reason, reason === r && styles.reasonOn]}
                  >
                    <Ionicons name={reason === r ? 'radio-button-on' : 'radio-button-off'} size={20} color={reason === r ? colors.coralDark : colors.indigo300} />
                    <Text style={styles.reasonText}>{r}</Text>
                  </Pressable>
                ))}
                <Field
                  label="DETAILS (OPTIONAL)"
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Anything that helps explain the report"
                  multiline
                  maxLength={LIMITS.reportDetailsMax}
                  minHeight={70}
                  style={{ marginTop: spacing.md }}
                />
                {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
                <Button title="Submit prototype report" icon="flag-outline" variant="accent" fullWidth onPress={submit} />
                <Button title="Cancel" variant="ghost" fullWidth onPress={onClose} style={{ marginTop: spacing.sm }} />
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18,15,46,0.55)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.cream50, borderRadius: radius.xl, padding: spacing.xl, maxHeight: '90%', ...shadows.card },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { ...typography.heading, color: colors.textPrimary, marginLeft: spacing.sm },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  notice: { flexDirection: 'row', backgroundColor: colors.coral, borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.md },
  noticeText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo950, lineHeight: 17 },
  section: { ...typography.heading, fontSize: 15, color: colors.textPrimary, marginBottom: spacing.sm },
  reason: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cream300, marginBottom: 6 },
  reasonOn: { borderColor: colors.coral, backgroundColor: colors.coralSoft },
  reasonText: { ...typography.body, marginLeft: spacing.sm, color: colors.textPrimary, flex: 1 },
  error: { ...typography.caption, color: colors.dangerText, marginBottom: spacing.md },
  doneBox: { alignItems: 'center', paddingVertical: spacing.lg },
  doneTitle: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.sm },
  doneText: { ...typography.body, textAlign: 'center', color: colors.textSecondary, marginTop: 4 },
});
