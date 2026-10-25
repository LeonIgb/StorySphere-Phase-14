import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useSheetInsets } from '../utils/insets';
import { DEFAULT_LEVEL_MODEL } from '../utils/levels';
import { colors, radius, spacing, typography } from '../theme/theme';

// "How levels work": every number is read from the level model, so it cannot drift from the code.
export default function LevelsInfoSheet({ visible, onClose, model = DEFAULT_LEVEL_MODEL }) {
  const insets = useSheetInsets();
  const x = model.xp;
  const g = model.gates;
  return (
    <Modal transparent visible={Boolean(visible)} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, insets]}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">How levels work</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close levels explanation" hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.indigo700} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.warn}>Illustrative rules ({model.version}). Sample progress is not real reader data.</Text>

            <Text style={styles.h}>Levels are not rankings</Text>
            <Text style={styles.p}>A level is long-term progress toward fixed goals. It never compares you with other storytellers. Leaderboards rank storytellers over a chosen period and move up and down. The two never feed each other.</Text>

            <Text style={styles.h}>Levels</Text>
            {model.levels.map((l) => (
              <View key={l.level} style={styles.row}>
                <Text style={styles.cell}>Level {l.level} · {l.name}</Text>
                <Text style={styles.val}>{l.xp.toLocaleString('en-US')} XP</Text>
              </View>
            ))}

            <Text style={styles.h}>Where XP comes from</Text>
            <Text style={styles.p}>
              • Publishing: {x.publish.perItem} XP per qualifying story (up to {x.publish.maxItems}).{'\n'}
              • Chapters: {x.chapters.perItem} XP per qualifying published chapter (up to {x.chapters.maxItems}).{'\n'}
              • Finished series: {x.series.perItem} XP each (up to {x.series.maxItems}).{'\n'}
              • Consistent publishing: {x.consistency.perWeek} XP per week of your longest run of consecutive publishing weeks (up to {x.consistency.maxWeeks}).{'\n'}
              • Genuine reads and unique readers: up to {x.reads.pool} and {x.readers.pool} XP on a square-root curve, so growth keeps counting without one number dominating.{'\n'}
              • Sustained engagement: {x.engagement.perWeek} XP per engaged week (up to {x.engagement.maxWeeks}). A week is engaged when at least {model.engagedWeek.minUnique.toLocaleString('en-US')} genuine readers took part, meaningful actions per reader reached {model.engagedWeek.minRate}, and no more than {Math.round(model.engagedWeek.maxInvalidShare * 100)}% of reads failed validation.{'\n'}
              • Verified sales: up to {x.sales.pool} XP on a square-root curve, from sales that survived refunds.
            </Text>

            <Text style={styles.h}>What does not count</Text>
            <Text style={styles.p}>
              • Invalid or held reads, and engagement without readers behind it.{'\n'}
              • Stories shorter than {g.minWords} words ({g.minImages} images, {g.minBlocks} blocks), duplicates of an earlier story, and more than {g.maxPublicationsPerDay} rewarded publication per day.{'\n'}
              • Chapters under {g.minChapterWords} words. A series needs {g.seriesMinChapters}+ qualifying chapters and must be marked finished while still published.{'\n'}
              • Audience XP is reduced if more than {Math.round(model.integrity.tolerance * 100)}% of reads failed validation, paused while activity is under review, and reduced for {model.compliance.penaltyDays} days after a confirmed rule violation.{'\n'}
              • Repeating an action cannot add XP, because XP is worked out from your current validated activity.
            </Text>

            <Text style={styles.h}>Your account in this demo</Text>
            <Text style={styles.p}>Your own stories have no real readers or buyers here, so reader, engagement and sales badges are unavailable for you. Publishing, series and consistency work from your real activity on this device. Sample storytellers show the full system. Badges you unlock are saved on this device.</Text>

            <Text style={styles.h}>In production</Text>
            <Text style={styles.p}>The server would award XP and badges from validated events, record each award with its evidence and rule version, and withdraw it if fraud is found. The app would only display the result.</Text>
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
  title: { ...typography.title, color: colors.textPrimary },
  warn: { ...typography.caption, color: colors.coralText, backgroundColor: colors.coralSoft, padding: spacing.md, borderRadius: radius.md },
  h: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  p: { ...typography.body, color: colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  cell: { ...typography.body, color: colors.textPrimary },
  val: { ...typography.body, fontWeight: '700', color: colors.indigo700 },
  btn: { marginTop: spacing.md },
});
