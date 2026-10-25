import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import SegmentedControl from '../components/SegmentedControl';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import ConfirmSheet from '../components/ConfirmSheet';
import ProgressBar from '../components/ProgressBar';
import CoverImage from '../components/CoverImage';
import useAsync from '../hooks/useAsync';
import { useReading } from '../context/ReadingContext';
import { fetchAllStories } from '../services/storyService';
import { historyEntries } from '../utils/account';
import { colors, mediaIcons, radius, spacing, typography } from '../theme/theme';

const FILTERS = ['All', 'In progress', 'Finished'];

export function HistoryRow({ entry, onPress }) {
  const { story } = entry;
  return (
    <Pressable
      onPress={() => onPress(story)}
      accessibilityRole="button"
      accessibilityLabel={`${story.title}, ${entry.status}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.cover, { backgroundColor: story.coverColor || colors.indigo700 }]}>
        <Ionicons name={mediaIcons[story.mediaType] || 'book'} size={22} color="rgba(251,246,236,0.9)" />
        <CoverImage uri={story.coverUri} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>{story.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {story.creator ? story.creator.name : 'Unknown'} · {entry.status}
        </Text>
        {!entry.finished ? <ProgressBar value={entry.progress.percent || 0} /> : null}
      </View>
      <Ionicons name={entry.finished ? 'checkmark-circle' : 'chevron-forward'} size={20} color={entry.finished ? colors.success : colors.indigo300} />
    </Pressable>
  );
}

// Everything the signed-in user has read, viewed or watched, newest first.
export default function HistoryScreen({ navigation }) {
  const { progress, clearHistory, keepHistory } = useReading();
  const all = useAsync(fetchAllStories, []);
  const [filter, setFilter] = useState('All');
  const [confirm, setConfirm] = useState(false);

  const entries = useMemo(() => {
    const byId = Object.fromEntries((all.data || []).map((s) => [s.id, s]));
    return historyEntries(progress, byId);
  }, [progress, all.data]);
  const shown = entries.filter((e) => (filter === 'All' ? true : filter === 'Finished' ? e.finished : !e.finished));

  let body;
  if (all.loading && !all.data) body = <LoadingState label="Loading your history…" />;
  else if (all.error && !all.data) body = <ErrorState message={all.error.message} onRetry={all.reload} />;
  else if (shown.length === 0) {
    body = (
      <EmptyState
        icon="time-outline"
        title={entries.length === 0 ? 'No history yet' : `Nothing ${filter === 'Finished' ? 'finished' : 'in progress'}`}
        message={
          keepHistory
            ? 'Stories you read, view or watch will be listed here.'
            : 'History is turned off, so nothing new is being recorded. You can turn it back on in Settings.'
        }
        actionLabel="Find a story"
        onAction={() => navigation.navigate('Discover')}
      />
    );
  } else {
    body = shown.map((e) => <HistoryRow key={e.id} entry={e} onPress={(s) => navigation.openStory(s.id)} />);
  }

  return (
    <ScreenContainer>
      <BackHeader
        title="Reading history"
        onBack={navigation.goBack}
        right={
          entries.length > 0 ? (
            <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" accessibilityLabel="Clear history">
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!keepHistory ? (
          <View style={styles.banner}>
            <Ionicons name="pause-circle-outline" size={20} color={colors.coralDark} />
            <Text style={styles.bannerText}>History is off. New reading isn’t being recorded (this also turns off Continue reading).</Text>
          </View>
        ) : null}
        <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
        <View style={styles.spacer} />
        {body}
      </ScrollView>
      <ConfirmSheet
        visible={confirm}
        title="Clear your history?"
        message="This removes your reading and viewing history, your place in every story and your recently viewed list. Saved stories, favorites and purchases are kept."
        confirmLabel="Clear history"
        destructive
        icon="trash-outline"
        onConfirm={() => {
          setConfirm(false);
          clearHistory();
        }}
        onCancel={() => setConfirm(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  spacer: { height: spacing.md },
  clear: { ...typography.caption, fontWeight: '700', color: colors.coralText },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream200,
  },
  cover: { width: 48, height: 64, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, marginHorizontal: spacing.md },
  title: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2, marginBottom: 4 },
});
