import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import CreatorAvatar from '../components/CreatorAvatar';
import Chip from '../components/Chip';
import SectionHeader from '../components/SectionHeader';
import StoryCard from '../components/StoryCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { fetchCreator } from '../services/storyService';
import FollowButton from '../components/FollowButton';
import ReportSheet from '../components/ReportSheet';
import ActionLink from '../components/ActionLink';
import { useCommunity } from '../context/CommunityContext';
import { useMessaging } from '../context/MessagingContext';
import Button from '../components/Button';
import DemoBadge from '../components/DemoBadge';
import LevelSummary from '../components/LevelSummary';
import { sampleSubjects } from '../services/levelsService';
import { HistoryRow } from './HistoryScreen';
import { useLibrary } from '../context/LibraryContext';
import { useReading } from '../context/ReadingContext';
import { useAccount } from '../context/AccountContext';
import { followingIdsOf } from '../services/profileService';
import { fetchAllStories } from '../services/storyService';
import { historyEntries } from '../utils/account';
import { colors, genreIcons, radius, spacing, typography } from '../theme/theme';
import { formatCount, formatRating } from '../utils/format';

function Stat({ value, label, onPress }) {
  const inner = (
    <>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={styles.stat}>{inner}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} style={styles.stat}>
      {inner}
    </Pressable>
  );
}

// Public profile of a storyteller or reader (or of you: then it shows what others see, with your
// privacy settings applied). Follow button, follower / following lists, portfolio of stories.
export default function CreatorScreen({ creatorId, navigation }) {
  const { isSaved, toggleSaved } = useLibrary();
  const { progress } = useReading();
  const { isDemo, social, publicView, followerCountFor } = useAccount();
  const detail = useAsync(() => fetchCreator(creatorId), [creatorId]);
  const allStories = useAsync(fetchAllStories, []);
  const isMe = creatorId === 'me';
  const { isReported } = useCommunity();
  const messaging = useMessaging();
  const [reportTarget, setReportTarget] = useState(null);
  const recent = useMemo(() => {
    const byId = Object.fromEntries((allStories.data || []).map((x) => [x.id, x]));
    return historyEntries(progress, byId).slice(0, 3);
  }, [progress, allStories.data]);

  const creator = detail.data ? detail.data.creator : null;
  const list = detail.data ? detail.data.stories : [];
  const averageRating = detail.data ? detail.data.averageRating : null;

  let body;
  if (detail.loading && !detail.data) {
    body = <LoadingState label={'Loading profile…'} />;
  } else if (detail.error && !detail.data) {
    body = <ErrorState message={detail.error.message} onRetry={detail.reload} />;
  } else if (!creator) {
    body = (
      <EmptyState
        icon="person-outline"
        title="Profile not found"
        message="This profile may have been removed or the link is out of date."
        actionLabel="Go back"
        onAction={navigation.goBack}
      />
    );
  } else if (isMe && !publicView.visible) {
    body = (
      <>
        <View style={styles.card}>
          <CreatorAvatar creator={creator} size={84} />
          <Text style={styles.name}>{creator.name}</Text>
        </View>
        <EmptyState
          icon="lock-closed-outline"
          title="Your profile is private"
          message="Other people can’t open your profile page or find you in Discover. Your published stories stay public."
          actionLabel="Privacy settings"
          onAction={() => navigation.openSettings()}
        />
      </>
    );
  } else {
    const isReader = creator.role === 'reader' && !(creator.storyCount > 0);
    const lists = !isMe || publicView.showLists;
    const followers = followerCountFor(creator);
    const following = isMe ? social.following.length : followingIdsOf(creator.id, social).length;
    const openList = (kind) => navigation.openFollowList(creator.id, kind, creator.name);
    body = (
      <>
        {isMe ? (
          <View style={styles.ownerBanner}>
            <Ionicons name="eye-outline" size={18} color={colors.indigo800} />
            <Text style={styles.ownerText}>This is how other people see your profile.</Text>
          </View>
        ) : null}
        <View style={styles.card}>
          <CreatorAvatar creator={creator} size={84} />
          <Text style={styles.name}>{creator.name}</Text>
          <View style={styles.handleRow}>
            <Text style={styles.handle}>{creator.handle}</Text>
            {creator.verified ? (
              <View style={styles.verified}>
                <Ionicons name="checkmark-circle" size={14} color={colors.coral} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
          </View>
          {isMe && isDemo ? <DemoBadge style={styles.demo} /> : null}
          <Text style={styles.role}>{isReader ? 'READER' : 'STORYTELLER'}</Text>
          {creator.bio ? <Text style={styles.bio}>{creator.bio}</Text> : null}

          <View style={styles.statsRow}>
            <Stat value={followers.toLocaleString('en-US')} label="Followers" onPress={lists ? () => openList('followers') : undefined} />
            <View style={styles.divider} />
            <Stat value={formatCount(following)} label="Following" onPress={lists ? () => openList('following') : undefined} />
            {isReader ? null : (
              <>
                <View style={styles.divider} />
                <Stat value={String(creator.storyCount)} label="Stories" />
                <View style={styles.divider} />
                <Stat value={averageRating ? formatRating(averageRating) : '–'} label="Avg rating" />
              </>
            )}
          </View>
          {!lists ? <Text style={styles.hiddenNote}>Followers and following are hidden.</Text> : null}
          {isMe ? (
            <Button title="Edit profile" icon="create-outline" variant="accent" size="sm" onPress={() => navigation.openEditProfile()} style={styles.follow} />
          ) : (
            <View style={styles.follow}>
              <FollowButton person={creator} size="md" />
              {(() => {
                const blocked = messaging.isBlocked(creator.id);
                const policy = messaging.policyFor(creator.id);
                const reason = blocked ? 'You blocked this person.' : policy.ok ? '' : policy.message;
                return (
                  <View style={styles.messageWrap}>
                    <Button
                      title="Message"
                      icon="chatbubble-ellipses-outline"
                      size="sm"
                      variant="secondary"
                      disabled={Boolean(reason)}
                      onPress={() => navigation.openChat(creator.id)}
                      accessibilityLabel={reason ? `Message ${creator.name}, unavailable` : `Message ${creator.name}`}
                    />
                    {reason ? <Text style={styles.reportedNote}>{reason}</Text> : null}
                  </View>
                );
              })()}
              {isReported('user', creator.id) ? (
                <Text style={styles.reportedNote}>You reported this profile</Text>
              ) : (
                <ActionLink icon="flag-outline" label="Report profile" danger onDark onPress={() => setReportTarget({ type: 'user', id: creator.id, label: `${creator.name} (${creator.handle})`, ownerId: creator.id })} accessibilityLabel={`Report ${creator.name}`} />
              )}
            </View>
          )}
        </View>

        {!isReader && (isMe || sampleSubjects().some((c) => c.id === creatorId)) ? (
          <View style={styles.levelWrap}>
            <LevelSummary subjectId={creatorId} onPress={() => navigation.openLevels(creatorId)} />
          </View>
        ) : null}

        <SectionHeader title={isReader ? 'Reading interests' : 'Genres'} />
        <View style={styles.chipRow}>
          {(creator.genres || [creator.specialty]).map((g) => (
            <Chip
              key={g}
              label={g}
              icon={genreIcons[g]}
              onPress={() => navigation.navigate('Discover', { genre: g })}
              style={styles.chip}
            />
          ))}
        </View>

        {isMe && publicView.showActivity && recent.length > 0 ? (
          <>
            <SectionHeader title="Recently reading" />
            {recent.map((e) => (
              <HistoryRow key={e.id} entry={e} onPress={(st) => navigation.openStory(st.id)} />
            ))}
          </>
        ) : null}

        {isReader ? null : <SectionHeader title={`Portfolio · ${list.length} published`} />}
        {isReader ? (
          <EmptyState
            icon="book-outline"
            title="Reader profile"
            message="Readers follow storytellers and save stories. They haven’t published any stories."
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No stories yet"
            message="Stories from this storyteller will appear here once they publish."
          />
        ) : (
          list.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              variant="compact"
              emphasis="popularity"
              onPress={() => navigation.openStory(story.id)}
              saved={isSaved(story.id)}
              onToggleSave={toggleSaved}
            />
          ))
        )}
      </>
    );
  }

  return (
    <ScreenContainer>
      <BackHeader title={creator ? creator.name : ''} onBack={navigation.goBack} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {body}
      </ScrollView>
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  levelWrap: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  messageWrap: { alignItems: 'center', marginTop: spacing.sm },
  content: { paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.indigo900,
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  name: { ...typography.title, color: colors.textOnDark, marginTop: spacing.md },
  handleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  handle: { ...typography.caption, color: colors.coral },
  verified: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm },
  verifiedText: { ...typography.caption, fontSize: 12, color: colors.textOnDarkMuted, marginLeft: 3 },
  bio: { ...typography.body, color: colors.textOnDarkMuted, textAlign: 'center', marginTop: spacing.md },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    backgroundColor: colors.indigo800,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.heading, color: colors.textOnDark },
  statLabel: { ...typography.caption, fontSize: 11, color: colors.textOnDarkMuted, marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: colors.indigo700 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl },
  chip: { marginBottom: spacing.sm },
  role: { ...typography.micro, fontSize: 11, color: colors.textOnDarkMuted, marginTop: spacing.sm },
  demo: { marginTop: spacing.sm },
  follow: { marginTop: spacing.lg, alignItems: 'center' },
  reportedNote: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: spacing.sm },
  hiddenNote: { ...typography.caption, fontSize: 12, color: colors.textOnDarkMuted, marginTop: spacing.sm },
  ownerBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.indigo100, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  ownerText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo800 },
});
