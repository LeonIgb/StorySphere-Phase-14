import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import Header from '../components/Header';
import SectionHeader from '../components/SectionHeader';
import CreatorAvatar from '../components/CreatorAvatar';
import Chip from '../components/Chip';
import StoryCard from '../components/StoryCard';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ConfirmSheet from '../components/ConfirmSheet';
import { useNotice } from '../context/NoticeContext';
import { useLibrary } from '../context/LibraryContext';
import { useAccess } from '../context/AccessContext';
import { useCommunity } from '../context/CommunityContext';
import { useMessaging } from '../context/MessagingContext';
import { mediaProvider } from '../services/mediaService';
import { leaderboardProvider } from '../services/leaderboardService';
import { levelsProvider } from '../services/levelsService';
import { earningsProvider } from '../services/earningsService';
import { useLevels } from '../context/LevelsContext';
import LevelSummary from '../components/LevelSummary';
import { useCreator } from '../context/CreatorContext';
import { useAccount } from '../context/AccountContext';
import { useReading } from '../context/ReadingContext';
import DemoBadge from '../components/DemoBadge';
import Button from '../components/Button';
import { HistoryRow } from './HistoryScreen';
import { fetchAllStories } from '../services/storyService';
import { historyEntries } from '../utils/account';
import useAsync from '../hooks/useAsync';
import { fetchCreator, getSimulateFailure, setSimulateFailure } from '../services/storyService';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatCount } from '../utils/format';

function Stat({ value, label, onPress }) {
  const inner = (
    <>
      <Text style={styles.statValue}>{formatCount(value)}</Text>
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

export default function ProfileScreen({ navigation }) {
  const { showNotice } = useNotice();
  const { savedIds, isSaved, toggleSaved } = useLibrary();
  const { counts, resetAll } = useCreator();
  const { resetLevels } = useLevels();
  const { profile, social, isDemo } = useAccount();
  const { progress } = useReading();
  const allStories = useAsync(fetchAllStories, []);
  const recent = useMemo(() => {
    const byId = Object.fromEntries((allStories.data || []).map((x) => [x.id, x]));
    return historyEntries(progress, byId).slice(0, 3);
  }, [progress, allStories.data]);
  const [confirmReset, setConfirmReset] = useState(false);
  const mine = useAsync(() => fetchCreator('me'), []);
  const myStories = mine.data ? mine.data.stories : [];
  const { unread, resetCommunity } = useCommunity();
  const msg = useMessaging();
  const { premiumUnlocked, setPremiumUnlocked, purchasedIds, outcome, setOutcome, resetPurchases } = useAccess();
  const [failureOn, setFailureOn] = useState(getSimulateFailure());

  const toggleFailure = (value) => {
    setSimulateFailure(value);
    setFailureOn(value);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Profile" />

        <View style={styles.card}>
          <CreatorAvatar
            creator={{ name: profile.displayName, color: profile.avatarColor, avatarUri: profile.avatarUri }}
            size={78}
          />
          <Text style={styles.name}>{profile.displayName}</Text>
          <Text style={styles.handle}>
            {profile.handle} · {profile.role === 'reader' ? 'Reader' : 'Storyteller'}
          </Text>
          {isDemo ? <DemoBadge style={styles.demo} /> : null}
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.statsRow}>
            <Stat value={counts.published} label="Stories" />
            <View style={styles.divider} />
            <Stat value={social.followers.length} label="Followers" onPress={() => navigation.openFollowList('me', 'followers', profile.displayName)} />
            <View style={styles.divider} />
            <Stat value={social.following.length} label="Following" onPress={() => navigation.openFollowList('me', 'following', profile.displayName)} />
            <View style={styles.divider} />
            <Stat value={savedIds.length} label="Saved" />
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Edit profile" icon="create-outline" variant="accent" size="sm" style={styles.actionBtn} onPress={() => navigation.openEditProfile()} />
          <Button title="Public view" icon="eye-outline" variant="secondary" size="sm" style={styles.actionBtn} onPress={() => navigation.openCreator('me')} />
        </View>

        {profile.role === 'reader' ? null : (
          <View style={styles.levelWrap}>
            <LevelSummary subjectId="me" onPress={() => navigation.openLevels('me')} />
          </View>
        )}

        <SectionHeader title="Preferred genres" />
        {profile.preferredGenres.length === 0 ? (
          <Text style={styles.emptyNote}>None chosen yet. Add some in Edit profile to improve your recommendations.</Text>
        ) : (
          <View style={styles.chipRow}>
            {profile.preferredGenres.map((interest) => (
              <Chip key={interest} label={interest} selected />
            ))}
          </View>
        )}

        <SectionHeader title="Recently read" actionLabel="History" onAction={() => navigation.openHistory()} />
        {recent.length === 0 ? (
          <Text style={styles.emptyNote}>Stories you read, view or watch will show up here.</Text>
        ) : (
          recent.map((e) => <HistoryRow key={e.id} entry={e} onPress={(st) => navigation.openStory(st.id)} />)
        )}

        <SectionHeader title="Your stories" actionLabel="Open studio" onAction={() => navigation.navigate('Create')} />
        {mine.error && !mine.data ? (
          <ErrorState compact message={mine.error.message} onRetry={mine.reload} />
        ) : myStories.length === 0 ? (
          <EmptyState
            icon="create-outline"
            title="No published stories yet"
            message={
              counts.draft + counts.scheduled > 0
                ? `You have ${counts.draft} draft${counts.draft === 1 ? '' : 's'} and ${counts.scheduled} scheduled. Publish one to see it here.`
                : 'Stories you publish from the Create tab appear here for readers to find.'
            }
            actionLabel="Open studio"
            onAction={() => navigation.navigate('Create')}
          />
        ) : (
          <>
            {myStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                variant="compact"
                emphasis="newest"
                onPress={() => navigation.openStory(story.id)}
                saved={isSaved(story.id)}
                onToggleSave={toggleSaved}
              />
            ))}
            {counts.draft + counts.scheduled > 0 ? (
              <Text style={styles.draftNote}>
                Also in your studio: {counts.draft} draft{counts.draft === 1 ? '' : 's'}, {counts.scheduled} scheduled.
              </Text>
            ) : null}
          </>
        )}

        <SectionHeader title="Account" />
        <View style={styles.list}>
          {[
            { key: 'edit', icon: 'person-circle-outline', label: 'Edit profile', onPress: () => navigation.openEditProfile() },
            { key: 'history', icon: 'time-outline', label: 'Reading history', onPress: () => navigation.openHistory() },
            { key: 'messages', icon: 'chatbubble-ellipses-outline', label: msg.unreadInbox > 0 ? `Messages · ${msg.unreadInbox} unread` : 'Messages', onPress: () => navigation.openMessages() },
            { key: 'notifications', icon: 'notifications-outline', label: unread > 0 ? `Notifications · ${unread} new` : 'Notifications', onPress: () => navigation.openNotifications() },
            { key: 'dashboard', icon: 'stats-chart-outline', label: 'Creator dashboard', onPress: () => navigation.openDashboard('me') },
            { key: 'levels', icon: 'ribbon-outline', label: 'Levels & achievements', onPress: () => navigation.openLevels('me') },
            { key: 'leaderboards', icon: 'trophy-outline', label: 'Leaderboards', onPress: () => navigation.openLeaderboards() },
            { key: 'purchases', icon: 'receipt-outline', label: 'Purchases & receipts', onPress: () => navigation.openPurchases() },
            { key: 'prefs', icon: 'options-outline', label: 'Reading preferences', onPress: () => navigation.openPreferences() },
            { key: 'settings', icon: 'settings-outline', label: 'Settings & privacy', onPress: () => navigation.openSettings() },
            { key: 'help', icon: 'help-circle-outline', label: 'Help & feedback', onPress: () => showNotice('Help & feedback', 'Help and feedback arrive in a later phase.', 'help-circle-outline') },
          ].map((item, index, arr) => (
            <Pressable
              key={item.key}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              style={({ pressed }) => [styles.row, index < arr.length - 1 && styles.rowBorder, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name={item.icon} size={22} color={colors.indigo500} />
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.indigo300} />
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Developer tools" />
        <View style={styles.list}>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="cloud-offline-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Simulate network errors</Text>
              <Text style={styles.rowHint}>Then pull to refresh on any tab to see error states.</Text>
            </View>
            <Switch
              value={failureOn}
              onValueChange={toggleFailure}
              trackColor={{ false: colors.cream300, true: colors.coral }}
              thumbColor={colors.white}
              accessibilityLabel="Simulate network errors"
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="lock-open-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Developer override: unlock all premium</Text>
              <Text style={styles.rowHint}>Bypasses purchases for testing. Not an access model; a real backend ignores it.</Text>
            </View>
            <Switch
              value={premiumUnlocked}
              onValueChange={setPremiumUnlocked}
              trackColor={{ false: colors.cream300, true: colors.coral }}
              thumbColor={colors.white}
              accessibilityLabel="Developer override unlock all premium"
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="flask-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Next demo payment</Text>
              <Text style={styles.rowHint}>Choose what the next simulated purchase does.</Text>
              <View style={styles.outcomeRow}>
                {[['success', 'Succeeds'], ['fail', 'Fails'], ['pending', 'Pending']].map(([key, label]) => (
                  <Button
                    key={key}
                    title={label}
                    size="sm"
                    variant={outcome === key ? 'primary' : 'secondary'}
                    onPress={() => setOutcome(key)}
                    accessibilityLabel={`Demo payment ${label}`}
                  />
                ))}
              </View>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Community data</Text>
              <Text style={styles.rowHint}>Reactions, ratings, reviews, comments, reports and read state on this account.</Text>
            </View>
            <Button title="Reset" size="sm" variant="secondary" onPress={resetCommunity} accessibilityLabel="Reset community data" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="bag-remove-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Reset purchases</Text>
              <Text style={styles.rowHint}>{purchasedIds.length} premium {purchasedIds.length === 1 ? 'story' : 'stories'} owned. Restores this account's demo purchase history.</Text>
            </View>
            <Button title="Reset" size="sm" variant="secondary" onPress={resetPurchases} accessibilityLabel="Reset purchases" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Next media upload fails</Text>
              <Text style={styles.rowHint}>Makes the next audio or video upload stop partway so the error state can be tested.</Text>
            </View>
            <Button title="Arm" size="sm" variant="secondary" onPress={() => mediaProvider.setFailNext(true)} accessibilityLabel="Make the next media upload fail" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="trophy-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Next leaderboard load fails</Text>
              <Text style={styles.rowHint}>Makes the next leaderboard load fail once so the error state can be tested.</Text>
            </View>
            <Button title="Arm" size="sm" variant="secondary" onPress={() => leaderboardProvider.setFailNext(true)} accessibilityLabel="Make the next leaderboard load fail" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="ribbon-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Next achievements load fails</Text>
              <Text style={styles.rowHint}>Makes the next sample-storyteller achievements load fail once so the error state can be tested.</Text>
            </View>
            <Button title="Arm" size="sm" variant="secondary" onPress={() => levelsProvider.setFailNext(true)} accessibilityLabel="Make the next achievements load fail" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="refresh-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Reset achievements</Text>
              <Text style={styles.rowHint}>Forgets your unlocked badges and finished series on this device. Your stories are not touched.</Text>
            </View>
            <Button title="Reset" size="sm" variant="secondary" onPress={resetLevels} accessibilityLabel="Reset achievements" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="stats-chart-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Next dashboard load fails</Text>
              <Text style={styles.rowHint}>Makes the next creator dashboard load fail once so the error state can be tested.</Text>
            </View>
            <Button title="Arm" size="sm" variant="secondary" onPress={() => earningsProvider.setFailNext(true)} accessibilityLabel="Make the next dashboard load fail" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="paper-plane-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Next message send</Text>
              <Text style={styles.rowHint}>Choose whether the next simulated send is saved or fails. Nothing is ever delivered to a real person.</Text>
              <View style={styles.outcomeRow}>
                {[['success', 'Succeeds'], ['fail', 'Fails']].map(([key, label]) => (
                  <Button
                    key={key}
                    title={label}
                    size="sm"
                    variant={msg.outcome === key ? 'primary' : 'secondary'}
                    onPress={() => msg.setOutcome(key)}
                    accessibilityLabel={`Message send ${label}`}
                  />
                ))}
              </View>
            </View>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Simulated replies</Text>
              <Text style={styles.rowHint}>Sample people answer with scripted lines, marked Simulated.</Text>
            </View>
            <Switch
              value={msg.simReplies}
              onValueChange={msg.setSimReplies}
              trackColor={{ false: colors.cream300, true: colors.coral }}
              thumbColor={colors.white}
              accessibilityLabel="Simulated replies"
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="mail-unread-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Receive a sample message</Text>
              <Text style={styles.rowHint}>Adds a local demo message, subject to your “Who can message me” setting.</Text>
            </View>
            <Button title="Receive" size="sm" variant="secondary" onPress={msg.simulateIncoming} accessibilityLabel="Receive a sample message" />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Reset messages</Text>
              <Text style={styles.rowHint}>Restores this account's demo conversations and clears blocks.</Text>
            </View>
            <Button title="Reset" size="sm" variant="secondary" onPress={msg.resetMessages} accessibilityLabel="Reset messages" />
          </View>
          <Pressable
            onPress={() => setConfirmReset(true)}
            accessibilityRole="button"
            accessibilityLabel="Delete all my stories"
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="trash-outline" size={22} color={colors.coralDark} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabelInline}>Delete all my stories</Text>
              <Text style={styles.rowHint}>Removes every draft, scheduled and live story you created on this device.</Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.version}>{'StorySphere · Phase 9 messages & notifications'}</Text>
      </ScrollView>
      <ConfirmSheet
        visible={confirmReset}
        title="Delete all your stories?"
        message="Every draft, scheduled and live story you created will be permanently removed from this device. Sample stories are not affected."
        confirmLabel="Delete everything"
        destructive
        icon="trash-outline"
        onConfirm={() => {
          setConfirmReset(false);
          resetAll();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  levelWrap: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  outcomeRow: { flexDirection: 'row', marginTop: 6, gap: 6 },
  content: { paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.indigo900,
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  name: { ...typography.title, color: colors.textOnDark, marginTop: spacing.md },
  handle: { ...typography.caption, color: colors.coral, marginTop: 2 },
  bio: {
    ...typography.body,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
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
  demo: { marginTop: spacing.sm },
  actionBtn: { marginHorizontal: 5 },
  actions: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  emptyNote: { ...typography.caption, color: colors.textSecondary, marginHorizontal: spacing.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl },
  list: {
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cream300,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  rowLabel: { ...typography.body, flex: 1, color: colors.textPrimary, marginLeft: spacing.md },
  rowTextBlock: { flex: 1, marginHorizontal: spacing.md },
  rowLabelInline: { ...typography.body, color: colors.textPrimary },
  rowHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  draftNote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginHorizontal: spacing.xl },
  version: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
