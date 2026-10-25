import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useSheetInsets } from '../utils/insets';
import { COMPONENT_LABELS, DEFAULT_MODEL } from '../utils/leaderboard';
import { colors, radius, spacing, typography } from '../theme/theme';

// "How scores work": every figure is read from the model object, so it cannot drift from the code.
export default function ScoreInfoSheet({ visible, onClose, model = DEFAULT_MODEL }) {
  const insets = useSheetInsets();
  const m = model;
  const keys = Object.keys(m.weights);
  return (
    <Modal transparent visible={Boolean(visible)} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, insets]}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">How scores work</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close score explanation" hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.indigo700} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.warn}>
              Illustrative model ({m.version}). The sample scores here are not real-world measurements and are not a judgement of story quality.
            </Text>

            <Text style={styles.h}>Provisional weights (total {keys.reduce((s, k) => s + m.weights[k], 0)})</Text>
            {keys.map((k) => (
              <View key={k} style={styles.row}>
                <Text style={styles.cell}>{COMPONENT_LABELS[k]}</Text>
                <Text style={styles.val}>{m.weights[k]}</Text>
              </View>
            ))}
            <Text style={styles.p}>
              Engagement counts reviews ({m.engagementWeights.reviews}), comments ({m.engagementWeights.comments}), bookmarks ({m.engagementWeights.bookmarks}) and shares ({m.engagementWeights.shares}) as a weighted share of readers. Verified sales only count in boards that include priced stories; otherwise its weight is shared out across the other parts.
            </Text>

            <Text style={styles.h}>Normalization</Text>
            <Text style={styles.p}>
              Volumes (reads, readers, follower growth, sales) use a log scale against a fixed reference for each period, so one huge number cannot dominate and scores do not depend on who else is on the board. Rates (engagement, completion) are smoothed toward a prior so small samples do not swing, then mapped between a low and high bound. Consistency is the share of recent weeks with a publication ({m.consistency.weeksRecent} weeks, or {m.consistency.weeksAllTime} for all-time). Each part is scaled 0 to 1, multiplied by its weight, and the total is scaled to 0 to 100.
            </Text>

            <Text style={styles.h}>Rules and fairness</Text>
            <Text style={styles.p}>
              • Only validated reads count; invalid reads are excluded and shown in the breakdown.{'\n'}
              • Sudden spikes without matching completions are held back ({m.velocity.multiple}× the creator's normal level).{'\n'}
              • If more than {Math.round(m.integrity.tolerance * 100)}% of reads fail validation the score is reduced, up to {Math.round(m.integrity.maxPenalty * 100)}%; above {Math.round(m.integrity.holdAt * 100)}% the creator is held for review and not ranked.{'\n'}
              • Confirmed rule violations reduce the score (minor {Math.round(m.compliance.severity.minor * 100)}%, major {Math.round(m.compliance.severity.major * 100)}%), fading over {m.compliance.penaltyDays} days.{'\n'}
              • A minimum number of unique readers is needed to be ranked.{'\n'}
              • Boards rank completed days only; today is never included.
            </Text>

            <Text style={styles.h}>In production</Text>
            <Text style={styles.p}>
              Rankings would be computed on the server from validated, signed events with deduplication, device attestation and bot detection. Sales come only from payment-provider confirmations. The app would only display results.
            </Text>
          </ScrollView>
          <Button title="Got it" onPress={onClose} style={styles.btn} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 15, 46, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.cream50,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '88%',
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  title: { ...typography.title, color: colors.textPrimary },
  warn: { ...typography.caption, color: colors.coralText, backgroundColor: colors.coralSoft, padding: spacing.md, borderRadius: radius.md },
  h: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  p: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  cell: { ...typography.body, color: colors.textPrimary },
  val: { ...typography.body, fontWeight: '700', color: colors.indigo700 },
  btn: { marginTop: spacing.md },
});
