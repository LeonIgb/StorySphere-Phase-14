import React, { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import Header from '../components/Header';
import IconButton from '../components/IconButton';
import SearchBar from '../components/SearchBar';
import Chip from '../components/Chip';
import FilterTabs from '../components/FilterTabs';
import LibraryRow from '../components/LibraryRow';
import ContinueCard from '../components/ContinueCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useLibraryData from '../hooks/useLibraryData';
import { useLibrary } from '../context/LibraryContext';
import { useReading } from '../context/ReadingContext';
import { useAccount } from '../context/AccountContext';
import { LIBRARY_TABS, filterLibraryItems, isFiltering } from '../utils/library';
import { colors, radius, spacing, typography, hscroll } from '../theme/theme';

const FORMATS = ['All', 'Written', 'Image', 'Video', 'Mixed'];
const ACCESS = ['All', 'Free', 'Premium'];
const UNDO_MS = 6000;

const EMPTY = {
  saved: { icon: 'bookmark-outline', title: 'Nothing saved yet', message: 'Tap the bookmark on any story to keep it here for later.', action: 'Discover stories' },
  favorites: { icon: 'heart-outline', title: 'No favorites yet', message: 'Tap the heart on a story page to add it to your favorites.', action: 'Discover stories' },
  reading: { icon: 'book-outline', title: 'Nothing in progress', message: 'Stories you start reading, viewing or watching appear here so you can pick up where you left off.', action: 'Find a story' },
  finished: { icon: 'checkmark-done-outline', title: 'No finished stories yet', message: 'Stories you complete are collected here.', action: 'Find a story' },
  recent: { icon: 'time-outline', title: 'Nothing viewed recently', message: 'Stories you open will be listed here, newest first.', action: 'Find a story' },
  purchased: { icon: 'bag-check-outline', title: 'No purchases yet', message: 'Premium stories you unlock with a demo purchase appear here and stay unlocked. Open a premium story and choose Unlock to try it.' },
  following: { icon: 'people-outline', title: 'Follow storytellers', message: 'Their latest stories will show up here as soon as they publish.', action: 'Find storytellers' },
};

const REMOVE_LABEL = { saved: 'Remove from saved:', favorites: 'Remove from favorites:', reading: 'Remove from history:', finished: 'Remove from history:', recent: 'Remove from recent:' };

// Your library: continue reading, then saved, favorites, in-progress, finished, recently viewed,
// purchased and the latest from the people you follow. Search and filter any list, and remove
// items (with Undo). Everything is saved on this device for the signed-in account.
export default function LibraryScreen({ navigation, params }) {
  const data = useLibraryData();
  const { toggleSaved, toggleFavorite, removeRecent, restoreRecent, addRecent, recent } = useLibrary();
  const { resetProgress, restoreProgress } = useReading();
  const { social } = useAccount();
  const [tab, setTab] = useState('saved');
  const [filter, setFilter] = useState({ query: '', mediaType: 'All', access: 'All', sort: 'Recent' });
  const [undo, setUndo] = useState(null); // { label, restore }
  const timer = useRef(null);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  // Other screens can open a specific tab, e.g. navigate('Library', { tab: 'following' }).
  useEffect(() => {
    if (params && LIBRARY_TABS.some((t) => t.key === params.tab)) setTab(params.tab);
  }, [params]);

  const showUndo = (label, restore) => {
    if (timer.current) clearTimeout(timer.current);
    setUndo({ label, restore });
    timer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const open = (item) => {
    const { story } = item;
    const p = item.progress;
    if (p && !p.finished && p.percent > 0) {
      // Started but not finished: straight to the saved place in the reader, gallery or video.
      addRecent(story.id);
      navigation.openContent(story);
    } else {
      navigation.openStory(story.id);
    }
  };

  const remove = (item) => {
    const { story, progress } = item;
    const title = `“${story.title}”`;
    if (tab === 'saved') {
      toggleSaved(story.id);
      showUndo(`Removed ${title} from saved`, () => toggleSaved(story.id));
    } else if (tab === 'favorites') {
      toggleFavorite(story.id);
      showUndo(`Removed ${title} from favorites`, () => toggleFavorite(story.id));
    } else if (tab === 'reading' || tab === 'finished') {
      resetProgress(story.id);
      showUndo(`Removed ${title} from history`, () => restoreProgress(story.id, progress));
    } else if (tab === 'recent') {
      const entry = recent.find((r) => r.id === story.id);
      removeRecent(story.id);
      showUndo(`Removed ${title} from recent`, () => entry && restoreRecent(entry));
    }
  };

  const canRemove = ['saved', 'favorites', 'reading', 'finished', 'recent'].includes(tab);
  const lib = data.library;
  const tabs = LIBRARY_TABS.map((t) => ({ ...t, count: lib[t.key].length }));
  const items = lib[tab];
  const shown = filterLibraryItems(items, filter);
  const filtering = isFiltering(filter);
  const setF = (patch) => setFilter((f) => ({ ...f, ...patch }));

  let body;
  if (data.loading && !data.data) {
    body = <LoadingState label={'Loading your library…'} />;
  } else if (data.error && !data.data) {
    body = <ErrorState message={data.error.message} onRetry={data.reload} />;
  } else if (items.length === 0) {
    const e = EMPTY[tab];
    body = (
      <EmptyState
        icon={e.icon}
        title={tab === 'following' && social.following.length > 0 ? 'Nothing new yet' : e.title}
        message={
          tab === 'following' && social.following.length > 0
            ? 'The storytellers you follow haven’t published anything yet. Readers you follow don’t publish stories.'
            : e.message
        }
        actionLabel={e.action}
        onAction={e.action ? () => navigation.navigate('Discover') : undefined}
      />
    );
  } else {
    body = (
      <>
        {data.error ? <ErrorState compact message={data.error.message} onRetry={data.reload} /> : null}
        <View style={styles.filters}>
          <SearchBar value={filter.query} onChangeText={(query) => setF({ query })} placeholder="Search this list" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.chips}>
          {FORMATS.map((f) => (
            <Chip key={f} label={f} selected={filter.mediaType === f} onPress={() => setF({ mediaType: f })} style={styles.chip} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.chips}>
          {ACCESS.map((a) => (
            <Chip key={a} label={a === 'All' ? 'Free & premium' : a} selected={filter.access === a} onPress={() => setF({ access: a })} style={styles.chip} />
          ))}
          <Chip
            label={filter.sort === 'Title' ? 'Sorted A–Z' : 'Sort A–Z'}
            icon="text-outline"
            selected={filter.sort === 'Title'}
            onPress={() => setF({ sort: filter.sort === 'Title' ? 'Recent' : 'Title' })}
            style={styles.chip}
          />
        </ScrollView>
        {tab === 'purchased' ? <Text style={styles.note}>Purchases stay in your library and keep premium stories unlocked.</Text> : null}
        {shown.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No matches"
            message="Nothing in this list fits your search or filters."
            actionLabel="Clear filters"
            onAction={() => setFilter({ query: '', mediaType: 'All', access: 'All', sort: 'Recent' })}
          />
        ) : (
          shown.map((item) => (
            <LibraryRow
              key={item.story.id}
              item={item}
              onPress={open}
              onRemove={canRemove ? remove : undefined}
              removeLabel={REMOVE_LABEL[tab]}
            />
          ))
        )}
        {filtering && shown.length > 0 ? <Text style={styles.note}>Showing {shown.length} of {items.length}.</Text> : null}
      </>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={colors.violet} colors={[colors.violet]} />
        }
      >
        <Header
          title="Library"
          subtitle="Everything you've saved, started and bought."
          right={<IconButton name="options-outline" label="Reading preferences" onPress={() => navigation.openPreferences()} />}
        />
        {data.continueItem ? <ContinueCard item={data.continueItem} onContinue={(it) => { addRecent(it.story.id); navigation.openContent(it.story); }} /> : null}
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} />
        <View style={styles.spacer} />
        {body}
      </ScrollView>
      {undo ? (
        <View style={styles.undo} accessibilityLiveRegion="polite">
          <Text style={styles.undoText} numberOfLines={2}>{undo.label}</Text>
          <Pressable
            onPress={() => {
              undo.restore();
              setUndo(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Undo"
            hitSlop={8}
          >
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  spacer: { height: spacing.lg },
  filters: { marginBottom: spacing.sm },
  chips: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  chip: { marginRight: spacing.sm },
  note: { ...typography.caption, color: colors.textSecondary, marginHorizontal: spacing.xl, marginVertical: spacing.sm },
  undo: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.indigo900,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  undoText: { ...typography.caption, flex: 1, color: colors.textOnDark },
  undoAction: { ...typography.body, fontWeight: '800', color: colors.coral, marginLeft: spacing.lg },
});
