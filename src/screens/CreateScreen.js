import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import SegmentedControl from '../components/SegmentedControl';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import WorkCard from '../components/WorkCard';
import PublishSheet from '../components/PublishSheet';
import ConfirmSheet from '../components/ConfirmSheet';
import { useCreator } from '../context/CreatorContext';
import { STORY_TYPES } from '../data/creatorOptions';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';

const SEGMENTS = [
  { key: 'draft', label: 'Drafts' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'published', label: 'Live' },
];

const EMPTY = {
  draft: {
    icon: 'document-text-outline',
    title: 'No drafts yet',
    message: 'Start a story above. Everything you write is saved here automatically, ready to finish or publish.',
  },
  scheduled: {
    icon: 'time-outline',
    title: 'Nothing scheduled',
    message: 'Choose Publish on a draft, then pick a publication date. (Scheduling is simulated: it only runs while the app is open.)',
  },
  published: {
    icon: 'radio-outline',
    title: 'Nothing live yet',
    message: 'Stories you publish appear here, and in Home, Discover and your profile.',
  },
};

// The creator studio: start a story, then manage drafts, scheduled and live stories.
export default function CreateScreen({ navigation }) {
  const { hydrated, storageMode, counts, grouped, createNewWork, unpublish, deleteWork } = useCreator();
  const [segment, setSegment] = useState('draft');
  const [publishId, setPublishId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'delete' | 'unpublish', id }

  const startStory = (type) => {
    const work = createNewWork(type);
    setSegment('draft');
    navigation.openEditor(work.id);
  };

  const labelFor = (s) => `${s.label} (${counts[s.key]})`;
  const options = SEGMENTS.map(labelFor);
  const current = SEGMENTS.find((s) => s.key === segment);
  const list = grouped[segment];

  const target = confirm ? [...grouped.draft, ...grouped.scheduled, ...grouped.published].find((w) => w.id === confirm.id) : null;
  const targetTitle = target && target.title.trim() ? `“${target.title.trim()}”` : 'this story';

  const runConfirm = () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    if (c.kind === 'delete') deleteWork(c.id);
    if (c.kind === 'unpublish') unpublish(c.id);
  };

  const onPrimary = (work) => {
    if (work.status === 'draft') setPublishId(work.id);
    else setConfirm({ kind: 'unpublish', id: work.id });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Create" subtitle="Your studio for written, image, video and mixed-media stories." />

        <Pressable
          onPress={() => navigation.openDashboard('me')}
          accessibilityRole="button"
          accessibilityLabel="Open creator dashboard"
          style={({ pressed }) => [styles.dashLink, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="stats-chart-outline" size={20} color={colors.indigo500} />
          <Text style={styles.dashLinkText}>Creator dashboard: analytics and earnings (demo)</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.indigo300} />
        </Pressable>

        {storageMode === 'memory' ? (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={20} color={colors.coralDark} />
            <Text style={styles.bannerText}>
              This runtime has no device storage, so drafts are kept for this session only and will be lost when the app
              reloads.
            </Text>
          </View>
        ) : null}

        {STORY_TYPES.map((type) => (
          <Pressable
            key={type.key}
            onPress={() => startStory(type.key)}
            accessibilityRole="button"
            accessibilityLabel={`New ${type.title.toLowerCase()}`}
            style={({ pressed }) => [styles.card, shadows.card, pressed && styles.pressed]}
          >
            <View style={[styles.iconWrap, { backgroundColor: type.accentSoft }]}>
              <Ionicons name={type.icon} size={26} color={type.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{type.title}</Text>
              <Text style={styles.cardDescription}>{type.description}</Text>
            </View>
            <Ionicons name="add-circle" size={26} color={colors.indigo300} />
          </Pressable>
        ))}

        <SectionHeader title="Your stories" />
        {!hydrated ? (
          <LoadingState label="Opening your studio…" />
        ) : (
          <>
            <SegmentedControl
              options={options}
              value={labelFor(current)}
              onChange={(label) => {
                const found = SEGMENTS.find((s) => labelFor(s) === label);
                if (found) setSegment(found.key);
              }}
            />
            <View style={styles.spacer} />
            {segment === 'scheduled' && list.length > 0 ? (
              <View style={styles.sim}>
                <Ionicons name="flask-outline" size={18} color={colors.indigo700} />
                <Text style={styles.simText}>
                  Simulated scheduling: there is no server, so these go live only when the app is open at or after their
                  time.
                </Text>
              </View>
            ) : null}
            {list.length === 0 ? (
              <EmptyState icon={EMPTY[segment].icon} title={EMPTY[segment].title} message={EMPTY[segment].message} />
            ) : (
              list.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  onEdit={() => navigation.openEditor(work.id)}
                  onPreview={() => navigation.openStory(work.id)}
                  onPrimary={() => onPrimary(work)}
                  onDelete={() => setConfirm({ kind: 'delete', id: work.id })}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <PublishSheet workId={publishId} visible={Boolean(publishId)} onClose={() => setPublishId(null)} />
      <ConfirmSheet
        visible={Boolean(confirm)}
        title={
          confirm && confirm.kind === 'delete'
            ? 'Delete this story?'
            : target && target.status === 'scheduled'
            ? 'Cancel the schedule?'
            : 'Unpublish this story?'
        }
        message={
          confirm && confirm.kind === 'delete'
            ? `${targetTitle} will be permanently deleted from this device.`
            : target && target.status === 'scheduled'
            ? `${targetTitle} goes back to your drafts and will not be released.`
            : `${targetTitle} disappears from Home, Discover and your profile and goes back to your drafts. Nothing is deleted.`
        }
        confirmLabel={
          confirm && confirm.kind === 'delete'
            ? 'Delete story'
            : target && target.status === 'scheduled'
            ? 'Cancel schedule'
            : 'Unpublish'
        }
        destructive={Boolean(confirm) && confirm.kind === 'delete'}
        icon={confirm && confirm.kind === 'delete' ? 'trash-outline' : 'help-circle-outline'}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  dashLink: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16 },
  dashLinkText: { flex: 1, marginHorizontal: 10, fontSize: 13, fontWeight: '700', color: colors.indigo700 },
  content: { paddingBottom: spacing.xxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  bannerText: { ...typography.caption, flex: 1, marginLeft: spacing.md, color: colors.textPrimary, lineHeight: 18 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cream300,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, marginHorizontal: spacing.md },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardDescription: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  spacer: { height: spacing.lg },
  sim: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.indigo100,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  simText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo800, lineHeight: 18 },
});
