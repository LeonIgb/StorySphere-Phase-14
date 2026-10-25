import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import SegmentedControl from '../components/SegmentedControl';
import FilterTabs from '../components/FilterTabs';
import Chip from '../components/Chip';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import LeaderboardRow from '../components/LeaderboardRow';
import ScoreInfoSheet from '../components/ScoreInfoSheet';
import useAsync from '../hooks/useAsync';
import { fetchLeaderboard, leaderboardProvider } from '../services/leaderboardService';
import { MEDIA_FILTERS, PERIODS, PERIOD_LABELS, describeExclusions } from '../utils/leaderboard';
import { formatCount } from '../utils/format';
import { colors, radius, spacing, typography, hscroll } from '../theme/theme';

const MEDIA_TABS = MEDIA_FILTERS.map((m) => ({ key: m, label: m === 'All' ? 'All types' : m === 'Mixed' ? 'Mixed media' : m }));
const MEDIA_NAMES = { Written: 'written', Image: 'image', Video: 'video', Mixed: 'mixed-media' };

export default function LeaderboardScreen({ navigation, initial }) {
  const start = initial || {};
  const [periodKey, setPeriodKey] = useState(start.period || 'weekly');
  const [media, setMedia] = useState(start.media || 'All');
  const [genre, setGenre] = useState(start.genre || 'All');
  const [info, setInfo] = useState(false);
  const board = useAsync(() => fetchLeaderboard({ period: periodKey, media, genre }), [periodKey, media, genre]);

  const period = PERIODS.find((p) => p.key === periodKey);
  const genres = (board.data && board.data.genres) || [];
  const clear = () => {
    setMedia('All');
    setGenre('All');
  };
  const filtered = media !== 'All' || genre !== 'All';

  let body;
  if (board.loading) body = <LoadingState label="Calculating rankings…" />;
  else if (board.error) body = <ErrorState message={board.error.message} onRetry={board.reload} />;
  else if (board.data.entries.length === 0) {
    const ex = describeExclusions(board.data.excluded);
    body = (
      <EmptyState
        icon="trophy-outline"
        title="No one is ranked here yet"
        message={
          (filtered
            ? `No storytellers have enough activity for ${genre !== 'All' ? genre : ''}${genre !== 'All' && media !== 'All' ? ' ' : ''}${media !== 'All' ? MEDIA_NAMES[media] + ' ' : ''}stories in this period.`
            : 'No storytellers have enough activity in this period.') + (ex ? ` (${ex}.)` : '')
        }
        actionLabel={filtered ? 'Clear filters' : 'Try a longer period'}
        onAction={filtered ? clear : () => setPeriodKey('all')}
      />
    );
  } else {
    body = (
      <>
        <Text style={styles.summary} accessibilityLiveRegion="polite">
          {board.data.entries.length} ranked · {period.description}
        </Text>
        {board.data.entries.map((entry) => (
          <LeaderboardRow key={entry.creatorId} entry={entry} onOpenCreator={navigation.openCreator} showMovement={periodKey !== 'all'} />
        ))}
        {board.data.excluded.length > 0 ? (
          <Text style={styles.footnote}>Not ranked: {describeExclusions(board.data.excluded)}.</Text>
        ) : null}
        <Text style={styles.footnote}>
          Reads checked: {formatCount(board.data.meta.validReads)} of {formatCount(board.data.meta.rawReads)} counted
          {board.data.meta.heldReads > 0 ? ` · ${formatCount(board.data.meta.heldReads)} held back` : ''}.
        </Text>
      </>
    );
  }

  return (
    <ScreenContainer>
      <BackHeader title="Leaderboards" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="flask-outline" size={18} color={colors.coralDark} />
          <Text style={styles.bannerText}>
            Prototype data. Scores are illustrative and are not a measure of story quality.
          </Text>
        </View>
        <SegmentedControl
          options={PERIOD_LABELS}
          value={period.label}
          onChange={(label) => setPeriodKey(PERIODS.find((p) => p.label === label).key)}
        />
        <View style={styles.gap} />
        <FilterTabs tabs={MEDIA_TABS} value={media} onChange={setMedia} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.chips}>
          <Chip label="All genres" selected={genre === 'All'} onPress={() => setGenre('All')} />
          {genres.map((g) => (
            <Chip key={g} label={g} selected={genre === g} onPress={() => setGenre(g)} style={styles.chip} />
          ))}
        </ScrollView>
        <Pressable onPress={() => setInfo(true)} accessibilityRole="button" accessibilityLabel="How scores work" style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={18} color={colors.violet} />
          <Text style={styles.infoText}>How scores work</Text>
        </Pressable>
        {body}
      </ScrollView>
      <ScoreInfoSheet visible={info} onClose={() => setInfo(false)} model={leaderboardProvider.model} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bannerText: { ...typography.caption, color: colors.coralText, flex: 1, marginLeft: spacing.sm },
  gap: { height: spacing.md },
  chips: { paddingVertical: spacing.md, alignItems: 'center' },
  chip: { marginLeft: spacing.sm },
  infoBtn: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginBottom: spacing.xs },
  infoText: { ...typography.caption, fontWeight: '700', color: colors.violetText, marginLeft: spacing.xs },
  summary: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  footnote: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
});
