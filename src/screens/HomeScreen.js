import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import Header from '../components/Header';
import IconButton from '../components/IconButton';
import SectionHeader from '../components/SectionHeader';
import StoryCard from '../components/StoryCard';
import CreatorCard from '../components/CreatorCard';
import GenreTile from '../components/GenreTile';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { fetchHomeFeed } from '../services/storyService';
import { useLibrary } from '../context/LibraryContext';
import { useCommunity } from '../context/CommunityContext';
import { useAccount } from '../context/AccountContext';
import { useMessaging } from '../context/MessagingContext';
import ContinueCard from '../components/ContinueCard';
import useLibraryData from '../hooks/useLibraryData';
import { colors, spacing, hscroll } from '../theme/theme';
import { greeting } from '../utils/format';

export default function HomeScreen({ navigation }) {
  const { unread } = useCommunity();
  const { unreadInbox } = useMessaging();
  const { isSaved, toggleSaved, addRecent } = useLibrary();
  const mine = useLibraryData();
  const { profile } = useAccount();
  const feed = useAsync(fetchHomeFeed, []);

  const openStory = (story) => navigation.openStory(story.id);
  const openCreator = (creator) => navigation.openCreator(creator.id);

  const data = feed.data;
  const firstName = profile.displayName.split(' ')[0];

  const storyList = (list, emphasis) =>
    list.map((story) => (
      <StoryCard
        key={story.id}
        story={story}
        variant="compact"
        emphasis={emphasis}
        onPress={openStory}
        saved={isSaved(story.id)}
        onToggleSave={toggleSaved}
      />
    ));

  let body;
  if (feed.loading && !data) {
    body = <LoadingState />;
  } else if (feed.error && !data) {
    body = <ErrorState message={feed.error.message} onRetry={feed.reload} />;
  } else if (!data || (data.featured.length === 0 && data.trending.length === 0)) {
    body = (
      <EmptyState
        icon="book-outline"
        title="No stories yet"
        message="New stories will show up here as creators publish them."
        actionLabel="Refresh"
        onAction={feed.reload}
      />
    );
  } else {
    body = (
      <>
        {feed.error ? <ErrorState compact message={feed.error.message} onRetry={feed.reload} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.hscroll}>
          {data.featured.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              variant="featured"
              onPress={openStory}
              saved={isSaved(story.id)}
              onToggleSave={toggleSaved}
            />
          ))}
        </ScrollView>

        {mine.continueItem ? (
          <ContinueCard
            item={mine.continueItem}
            onContinue={(it) => {
              addRecent(it.story.id);
              navigation.openContent(it.story);
            }}
          />
        ) : null}

        {mine.picks.length > 0 ? (
          <>
            <SectionHeader title="Picked for you" actionLabel="Preferences" onAction={() => navigation.openPreferences()} />
            {storyList(mine.picks, 'rating')}
          </>
        ) : null}

        {mine.library.following.length > 0 ? (
          <>
            <SectionHeader title="From people you follow" actionLabel="See all" onAction={() => navigation.navigate('Library', { tab: 'following' })} />
            {storyList(mine.library.following.slice(0, 3).map((i) => i.story), 'newest')}
          </>
        ) : null}

        <SectionHeader title="Browse by genre" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.hscroll}>
          {data.genres.map((genre, index) => (
            <GenreTile
              key={genre.name}
              name={genre.name}
              count={genre.count}
              icon={genre.icon}
              accent={index % 2 === 0 ? 'violet' : 'coral'}
              onPress={() => navigation.navigate('Discover', { genre: genre.name })}
            />
          ))}
        </ScrollView>

        <SectionHeader
          title="Trending now"
          actionLabel="See all"
          onAction={() => navigation.navigate('Discover', { sort: 'Popular' })}
        />
        {storyList(data.trending, 'popularity')}

        <SectionHeader title="Recommended storytellers" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.hscroll}>
          {data.recommended.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} reason={creator.reason} onPress={openCreator} />
          ))}
        </ScrollView>

        <SectionHeader
          title="Recently published"
          actionLabel="See all"
          onAction={() => navigation.navigate('Discover', { sort: 'Newest' })}
        />
        {storyList(data.recent, 'newest')}
      </>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={feed.refresh}
            tintColor={colors.violet}
            colors={[colors.violet]}
          />
        }
      >
        <Header
          eyebrow={greeting()}
          title={`Welcome back, ${firstName}`}
          subtitle="Pick up a story or find your next obsession."
          right={
            <View style={styles.actions}>
            <View style={styles.msgBtn}>
              <IconButton
                name={unreadInbox > 0 ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                label={unreadInbox > 0 ? `Messages, ${unreadInbox} unread` : 'Messages'}
                onPress={() => navigation.openMessages()}
              />
              {unreadInbox > 0 ? (
                <View style={styles.badge} pointerEvents="none">
                  <Text style={styles.badgeText}>{unreadInbox > 9 ? '9+' : unreadInbox}</Text>
                </View>
              ) : null}
            </View>
            <View>
              <IconButton
                name={unread > 0 ? 'notifications' : 'notifications-outline'}
                label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                onPress={() => navigation.openNotifications()}
              />
              {unread > 0 ? (
                <View style={styles.badge} pointerEvents="none">
                  <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                </View>
              ) : null}
            </View>
            </View>
          }
        />
        {body}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center' },
  msgBtn: { marginRight: spacing.sm },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: colors.indigo950, fontSize: 11, fontWeight: '800' },
  content: { paddingBottom: spacing.xl },
  hscroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  bottomSpace: { height: spacing.lg },
});
