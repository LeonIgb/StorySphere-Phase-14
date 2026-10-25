import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import Chip from '../components/Chip';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import LevelCard from '../components/LevelCard';
import GoalRow from '../components/GoalRow';
import BadgeTile from '../components/BadgeTile';
import LevelsInfoSheet from '../components/LevelsInfoSheet';
import useAsync from '../hooks/useAsync';
import { useLevels } from '../context/LevelsContext';
import { useAccount } from '../context/AccountContext';
import { fetchSampleProgress, levelsProvider, sampleSubjects } from '../services/levelsService';
import { TRACKS, UNSUPPORTED_TEXT } from '../utils/levels';
import { colors, radius, spacing, typography } from '../theme/theme';

// Levels and achievements. Long-term progression for one storyteller: it never reads leaderboard
// ranks. "You" shows live progress from your own stories (saved on this device); the sample
// storytellers show the whole system working on illustrative, validated sample data.
export default function LevelsScreen({ navigation, subjectId = 'me' }) {
  const levels = useLevels();
  const { profile } = useAccount();
  const [subject, setSubject] = useState(subjectId);
  const [info, setInfo] = useState(false);
  const [message, setMessage] = useState('');
  const samples = sampleSubjects();
  const isMe = subject === 'me';
  const sample = useAsync(() => (isMe ? Promise.resolve(null) : fetchSampleProgress(subject)), [subject]);
  const person = isMe ? { name: profile.displayName } : samples.find((s) => s.id === subject);

  let progress = null;
  let input = null;
  let body;
  if (isMe) {
    if (!levels.hydrated) body = <LoadingState label="Loading your progress…" />;
    else {
      progress = levels.progress;
      input = levels.input;
    }
  } else if (sample.error) body = <ErrorState message={sample.error.message} onRetry={sample.reload} />;
  else if (sample.loading || !sample.data) body = <LoadingState label="Loading achievements…" />;
  else {
    progress = sample.data.result;
    input = sample.data.input;
  }

  const toggleSeries = (c) => {
    const res = levels.setSeriesFinished(c.id, !c.finished);
    setMessage(res.ok ? (c.finished ? `“${c.title}” reopened.` : `“${c.title}” marked as a finished series.`) : res.message);
  };

  if (progress) {
    const earned = progress.badges.filter((b) => b.earned).length;
    body = (
      <>
        <LevelCard progress={progress} title={isMe ? 'YOUR LEVEL' : `${person.name.toUpperCase()} · LEVEL`} />
        <Text style={styles.summary} accessibilityLiveRegion="polite">
          {earned} of {progress.badges.length} badges earned
        </Text>

        {progress.holds.map((h) => (
          <View key={h} style={styles.hold}>
            <Ionicons name="shield-half-outline" size={18} color={colors.coralDark} />
            <Text style={styles.holdText}>{h}</Text>
          </View>
        ))}

        <Text style={styles.heading} accessibilityRole="header">Next goals</Text>
        {progress.goals.length === 0 ? (
          <Text style={styles.note}>No open goals. Every badge available to this storyteller is earned.</Text>
        ) : (
          <View style={styles.pad}>{progress.goals.map((b) => <GoalRow key={b.id} badge={b} />)}</View>
        )}

        <Text style={styles.heading} accessibilityRole="header">Where your XP comes from</Text>
        <View style={[styles.pad, styles.card]}>
          {progress.parts.map((p) => (
            <View key={p.key} style={styles.xpRow}>
              <View style={styles.xpTop}>
                <Text style={styles.xpLabel}>{p.label}</Text>
                <Text style={styles.xpValue}>{p.xp} / {p.max} XP</Text>
              </View>
              <ProgressBar value={p.max ? p.xp / p.max : 0} height={5} color={colors.violet} />
              <Text style={styles.xpNote}>{p.note}</Text>
            </View>
          ))}
        </View>

        {isMe ? (
          <>
            <Text style={styles.heading} accessibilityRole="header">Your series</Text>
            <View style={styles.pad}>
              {input.seriesCandidates.length === 0 ? (
                <EmptyState
                  icon="flag-outline"
                  title="No series yet"
                  message="Publish a story with at least 3 full chapters (each 100+ words, or 2+ blocks for mixed media), then mark it as a finished series here."
                  actionLabel="Open studio"
                  onAction={() => navigation.navigate('Create')}
                />
              ) : (
                input.seriesCandidates.map((c) => (
                  <View key={c.id} style={styles.seriesRow}>
                    <View style={styles.seriesText}>
                      <Text style={styles.seriesTitle} numberOfLines={1}>{c.title || 'Untitled story'}</Text>
                      <Text style={styles.xpNote}>{c.chapters} chapters · {c.finished ? 'Finished' : 'In progress'}</Text>
                    </View>
                    <Button
                      title={c.finished ? 'Reopen' : 'Mark finished'}
                      size="sm"
                      variant={c.finished ? 'secondary' : 'primary'}
                      onPress={() => toggleSeries(c)}
                      accessibilityLabel={`${c.finished ? 'Reopen' : 'Mark finished'}: ${c.title || 'Untitled story'}`}
                    />
                  </View>
                ))
              )}
              {message ? <Text style={styles.note} accessibilityLiveRegion="polite">{message}</Text> : null}
            </View>
          </>
        ) : null}

        <Text style={styles.heading} accessibilityRole="header">Achievements</Text>
        {TRACKS.map((track) => {
          const list = progress.badges.filter((b) => b.track === track.key);
          const supported = progress.supported[track.key];
          return (
            <View key={track.key} style={styles.pad}>
              <View style={styles.trackHead}>
                <Ionicons name={track.icon} size={18} color={colors.indigo500} />
                <Text style={styles.trackTitle}>{track.label}</Text>
              </View>
              {!supported && UNSUPPORTED_TEXT[track.key] ? <Text style={styles.note}>{isMe ? UNSUPPORTED_TEXT[track.key] : 'Not available: this sample storyteller has no priced stories.'}</Text> : null}
              {list.map((b) => <BadgeTile key={b.id} badge={b} />)}
            </View>
          );
        })}
      </>
    );
  }

  return (
    <ScreenContainer>
      <BackHeader title="Levels & achievements" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="trending-up-outline" size={18} color={colors.indigo700} />
          <Text style={styles.bannerText}>
            Levels show long-term progress and are separate from leaderboard rankings, which compare storytellers over a chosen period.
          </Text>
        </View>
        <Pressable onPress={() => navigation.openLeaderboards()} accessibilityRole="button" accessibilityLabel="Open leaderboards" style={styles.link}>
          <Ionicons name="trophy-outline" size={16} color={colors.violet} />
          <Text style={styles.linkText}>Open leaderboards</Text>
        </Pressable>
        {!isMe ? (
          <View style={styles.sampleBanner}>
            <Ionicons name="flask-outline" size={16} color={colors.coralDark} />
            <Text style={styles.sampleText}>Sample data. Progress for sample storytellers is illustrative, not real reader activity.</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Viewing</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          <Chip label="You" selected={isMe} onPress={() => setSubject('me')} />
          {samples.map((s) => (
            <Chip key={s.id} label={s.name} selected={subject === s.id} onPress={() => setSubject(s.id)} style={styles.chip} />
          ))}
        </ScrollView>
        <Pressable onPress={() => setInfo(true)} accessibilityRole="button" accessibilityLabel="How levels work" style={styles.link}>
          <Ionicons name="information-circle-outline" size={18} color={colors.violet} />
          <Text style={styles.linkText}>How levels work</Text>
        </Pressable>
        {body}
      </ScrollView>
      <LevelsInfoSheet visible={info} onClose={() => setInfo(false)} model={levelsProvider.model} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl * 2 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  bannerText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, lineHeight: 17 },
  sampleBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  sampleText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.coralText },
  link: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginVertical: spacing.xs },
  linkText: { ...typography.caption, fontWeight: '700', color: colors.violetText, marginLeft: spacing.xs },
  label: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.sm },
  chipScroll: { flexGrow: 0, minHeight: 48 },
  chips: { paddingVertical: spacing.sm, alignItems: 'center' },
  chip: { marginLeft: spacing.sm },
  heading: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },
  summary: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  hold: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  holdText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary },
  pad: { marginBottom: spacing.sm },
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  xpRow: { marginBottom: spacing.md },
  xpTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  xpLabel: { ...typography.caption, fontWeight: '700', color: colors.textPrimary },
  xpValue: { ...typography.caption, fontWeight: '700', color: colors.indigo700 },
  xpNote: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  seriesRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md, marginBottom: spacing.sm },
  seriesText: { flex: 1, marginRight: spacing.md },
  seriesTitle: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  trackHead: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  trackTitle: { ...typography.heading, color: colors.textPrimary, marginLeft: spacing.sm },
});
