import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import Chip from '../components/Chip';
import SectionHeader from '../components/SectionHeader';
import StoryCard from '../components/StoryCard';
import CreatorCard from '../components/CreatorCard';
import FilterPanel from '../components/FilterPanel';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { fetchCreators, searchStories } from '../services/storyService';
import { GENRES } from '../data/stories';
import { DEFAULT_SORT } from '../data/discoveryOptions';
import { useLibrary } from '../context/LibraryContext';
import { colors, genreIcons, radius, spacing, typography, hscroll } from '../theme/theme';

const EMPHASIS = { Newest: 'newest', Popular: 'popularity', 'Top rated': 'rating' };

export default function DiscoverScreen({ navigation, params }) {
  const { isSaved, toggleSaved } = useLibrary();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [mediaType, setMediaType] = useState('All');
  const [access, setAccess] = useState('All');
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Apply a request coming from another screen (genre tile, "See all", a tag tap).
  const lastNonce = useRef(null);
  useEffect(() => {
    if (!params || params.nonce === lastNonce.current) return;
    lastNonce.current = params.nonce;
    setQuery(params.query || '');
    setDebouncedQuery((params.query || '').trim());
    setGenre(params.genre || 'All');
    setMediaType(params.mediaType || 'All');
    setAccess(params.access || 'All');
    setSort(params.sort || DEFAULT_SORT);
    setFiltersOpen(Boolean(params.mediaType || params.access));
  }, [params]);

  // Debounce typing so we don't "fetch" on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useAsync(
    () => searchStories({ query: debouncedQuery, genre, mediaType, access, sort }),
    [debouncedQuery, genre, mediaType, access, sort]
  );
  const topCreators = useAsync(fetchCreators, []);

  const isFiltering =
    debouncedQuery.length > 0 || genre !== 'All' || mediaType !== 'All' || access !== 'All';
  const canReset = isFiltering || sort !== DEFAULT_SORT;
  const activeFilterCount = (mediaType !== 'All' ? 1 : 0) + (access !== 'All' ? 1 : 0);

  const clearAll = () => {
    setQuery('');
    setDebouncedQuery('');
    setGenre('All');
    setMediaType('All');
    setAccess('All');
    setSort(DEFAULT_SORT);
  };

  const refreshAll = () => {
    results.refresh();
    topCreators.refresh();
  };

  const openStory = (story) => navigation.openStory(story.id);
  const openCreator = (creator) => navigation.openCreator(creator.id);

  const found = results.data ? results.data.stories : null;
  const matchedCreators = results.data ? results.data.creators : [];

  let resultsBody;
  if (results.loading && !results.data) {
    resultsBody = <LoadingState label={'Searching…'} />;
  } else if (results.error && !results.data) {
    resultsBody = <ErrorState message={results.error.message} onRetry={results.reload} />;
  } else if (found && found.length === 0) {
    resultsBody = (
      <EmptyState
        icon="search-outline"
        title="No stories found"
        message={
          debouncedQuery
            ? `Nothing matches “${debouncedQuery}” with these filters. Try a different word or loosen a filter.`
            : 'No stories match these filters. Try loosening one of them.'
        }
        actionLabel="Clear all filters"
        onAction={clearAll}
      />
    );
  } else if (found) {
    resultsBody = (
      <>
        {results.error ? <ErrorState compact message={results.error.message} onRetry={results.reload} /> : null}
        {found.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            variant="compact"
            emphasis={EMPHASIS[sort]}
            onPress={openStory}
            saved={isSaved(story.id)}
            onToggleSave={toggleSaved}
          />
        ))}
      </>
    );
  }

  const showMatchedCreators = debouncedQuery.length > 0 && matchedCreators.length > 0;
  const showTopCreators = !isFiltering && topCreators.data && topCreators.data.length > 0;

  return (
    <ScreenContainer>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={results.refreshing || topCreators.refreshing}
            onRefresh={refreshAll}
            tintColor={colors.violet}
            colors={[colors.violet]}
          />
        }
      >
        <Header title="Discover" subtitle="Search by title, storyteller or tag." />
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Title, storyteller or #tag"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.chips}>
          {GENRES.map((g) => (
            <Chip
              key={g}
              label={g}
              icon={genreIcons[g] || 'apps-outline'}
              selected={g === genre}
              onPress={() => setGenre(g)}
            />
          ))}
        </ScrollView>

        <View style={styles.filterBar}>
          <Pressable
            onPress={() => setFiltersOpen((open) => !open)}
            hitSlop={{ top: 5, bottom: 5, left: 0, right: 0 }}
            accessibilityRole="button"
            accessibilityLabel={filtersOpen ? 'Hide filters' : 'Show filters'}
            accessibilityState={{ expanded: filtersOpen }}
            style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="options-outline" size={18} color={colors.indigo900} />
            <Text style={styles.filterButtonText}>Filters</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{activeFilterCount}</Text>
              </View>
            ) : null}
            <Ionicons
              name={filtersOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.indigo500}
            />
          </Pressable>
          <Text style={styles.sortLabel}>Sorted by {sort}</Text>
        </View>

        {filtersOpen ? (
          <FilterPanel
            mediaType={mediaType}
            access={access}
            sort={sort}
            onMediaType={setMediaType}
            onAccess={setAccess}
            onSort={setSort}
            onReset={clearAll}
            canReset={canReset}
          />
        ) : null}

        {showMatchedCreators ? (
          <>
            <SectionHeader title="Storytellers" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.hscroll}>
              {matchedCreators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} onPress={openCreator} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {showTopCreators ? (
          <>
            <SectionHeader title="Top storytellers" actionLabel="Leaderboards" onAction={() => navigation.openLeaderboards()} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.hscroll}>
              {topCreators.data.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} onPress={openCreator} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionHeader title={isFiltering ? 'Results' : 'All stories'} />
        {found && found.length > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summary}>
              {found.length} {found.length === 1 ? 'story' : 'stories'}
            </Text>
            {canReset ? (
              <Pressable onPress={clearAll} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear all filters">
                <Text style={styles.clear}>Clear all</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {results.loading && results.data ? (
          <View style={styles.inlineSpinner}>
            <ActivityIndicator color={colors.violet} />
          </View>
        ) : null}
        {resultsBody}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  chips: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  hscroll: { paddingHorizontal: spacing.xl },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  filterButtonText: { ...typography.caption, fontWeight: '700', color: colors.indigo900, marginHorizontal: 6 },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  countText: { ...typography.micro, fontSize: 11, color: colors.indigo950 },
  sortLabel: { ...typography.caption, color: colors.textSecondary },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  summary: { ...typography.caption, color: colors.textSecondary },
  clear: { ...typography.caption, fontWeight: '700', color: colors.violetText },
  inlineSpinner: { alignItems: 'center', paddingBottom: spacing.md },
});
