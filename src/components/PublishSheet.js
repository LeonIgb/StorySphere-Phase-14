import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import IconButton from './IconButton';
import SegmentedControl from './SegmentedControl';
import SchedulePicker from './SchedulePicker';
import { colors, radius, spacing, typography } from '../theme/theme';
import { useCreator } from '../context/CreatorContext';
import { useNotice } from '../context/NoticeContext';
import { validateWork } from '../utils/creator';
import { defaultSchedule, formatDateTime, validateSchedule } from '../utils/schedule';
import { useSheetInsets } from '../utils/insets';

const MODES = ['Publish now', 'Schedule'];

function Check({ icon, color, text }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

// Publish a draft now, or pick a publication date.
// SCHEDULING IS SIMULATED: there is no server. The app releases the story itself when it is open
// at or after the chosen time, so nothing happens while the app is closed.
export default function PublishSheet({ workId, visible, onClose, onDone }) {
  const sheetInsets = useSheetInsets();
  const { getWork, publish, schedule } = useCreator();
  const { showNotice } = useNotice();
  const [mode, setMode] = useState(MODES[0]);
  const [date, setDate] = useState(defaultSchedule());
  const [problems, setProblems] = useState([]);

  useEffect(() => {
    if (visible) {
      setMode(MODES[0]);
      setDate(defaultSchedule());
      setProblems([]);
    }
  }, [visible]);

  const work = workId ? getWork(workId) : null;
  if (!work) return null;

  const { errors, warnings, ready } = validateWork(work);
  const scheduling = mode === MODES[1];
  const scheduleCheck = validateSchedule(date, new Date());
  const title = work.title.trim() || 'Untitled story';

  const confirm = () => {
    const result = scheduling ? schedule(work.id, date) : publish(work.id);
    if (!result.ok) {
      setProblems(result.errors);
      return;
    }
    onClose();
    if (scheduling) {
      showNotice(
        'Scheduled (simulated)',
        `“${title}” is set to go live on ${formatDateTime(date)}. StorySphere has no server yet, so it will be released the next time the app is open at or after that time. Nothing happens while the app is closed.`,
        'time-outline'
      );
    } else {
      showNotice(
        'Your story is live',
        `“${title}” is now published. Find it in Home, Discover and your profile.`,
        'rocket-outline'
      );
    }
    if (onDone) onDone(result.work);
  };

  return (
    <Modal transparent visible={Boolean(visible)} animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, sheetInsets]} onPress={onClose} accessibilityLabel="Dismiss">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              Publish {'“'}
              {title}
              {'”'}
            </Text>
            <IconButton name="close" label="Close" onPress={onClose} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.checklist}>
              {errors.map((e) => (
                <Check key={e.id} icon="close-circle" color={colors.danger} text={e.message} />
              ))}
              {warnings.map((w) => (
                <Check key={w.id} icon="alert-circle" color={colors.gold} text={w.message} />
              ))}
              {ready ? <Check icon="checkmark-circle" color={colors.success} text="Everything required is filled in." /> : null}
            </View>

            {ready ? (
              <>
                <SegmentedControl options={MODES} value={mode} onChange={setMode} />
                <View style={styles.spacer} />

                {scheduling ? (
                  <>
                    <View style={styles.simBanner}>
                      <Ionicons name="flask-outline" size={20} color={colors.indigo700} />
                      <Text style={styles.simText}>
                        <Text style={styles.simStrong}>Simulated scheduling. </Text>
                        StorySphere has no server yet, so nothing publishes for you while the app is closed. A scheduled
                        story goes live when the app is open at or after the chosen time (checked on launch, on return,
                        and every 30 seconds while open).
                      </Text>
                    </View>
                    <SchedulePicker value={date} onChange={setDate} />
                  </>
                ) : (
                  <Text style={styles.nowText}>
                    Your story goes live immediately and appears in Home, Discover and your profile. You can unpublish it
                    any time to return it to drafts.
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.nowText}>Fix the items marked in red, then come back to publish.</Text>
            )}

            {problems.length > 0 ? (
              <View style={styles.problems}>
                {problems.map((p) => (
                  <Text key={p.id} style={styles.problemText}>
                    {p.message}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={scheduling ? `Schedule for ${formatDateTime(date)}` : 'Publish now'}
              icon={scheduling ? 'time-outline' : 'rocket-outline'}
              variant="accent"
              fullWidth
              disabled={!ready || (scheduling && !scheduleCheck.ok)}
              onPress={confirm}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 15, 46, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.cream100,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sheetTitle: { ...typography.title, fontSize: 20, flex: 1, marginRight: spacing.md, color: colors.textPrimary },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  checklist: {
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  checkText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, lineHeight: 18 },
  spacer: { height: spacing.lg },
  simBanner: {
    flexDirection: 'row',
    backgroundColor: colors.indigo100,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  simText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo800, lineHeight: 18 },
  simStrong: { fontWeight: '800' },
  nowText: { ...typography.body, color: colors.textSecondary },
  problems: { backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  problemText: { ...typography.caption, color: colors.textPrimary },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
});
