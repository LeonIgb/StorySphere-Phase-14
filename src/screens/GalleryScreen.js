import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import IconButton from '../components/IconButton';
import Button from '../components/Button';
import GalleryImage from '../components/GalleryImage';
import LockedCard from '../components/LockedCard';
import ProgressBar from '../components/ProgressBar';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { fetchStory } from '../services/storyService';
import { useReading } from '../context/ReadingContext';
import { colors, radius, spacing, typography } from '../theme/theme';
import { isUnitLocked } from '../utils/access';
import { formatPrice } from '../utils/pricing';
import useShare from '../hooks/useShare';

// Image-story gallery: swipeable panels with captions, a progress bar and locked panels.
export default function GalleryScreen({ storyId, initialIndex, navigation }) {
  const share = useShare();
  const { getProgress, saveProgress } = useReading();
  const { width } = useWindowDimensions();

  const detail = useAsync(() => fetchStory(storyId), [storyId]);
  const data = detail.data;
  const story = data ? data.story : null;
  const gallery = data ? data.content.gallery : [];
  const total = gallery.length;
  // Gallery progress is only tracked for image stories. Mixed stories track their text.
  const tracksProgress = Boolean(data) && data.content.chapters.length === 0;

  const initial = useRef(null);
  if (initial.current === null) {
    const p = getProgress(storyId);
    initial.current =
      typeof initialIndex === 'number'
        ? initialIndex
        : p && p.kind === 'gallery' && !p.finished
        ? p.position || 0
        : 0;
  }

  const [index, setIndex] = useState(initial.current);
  const [pagerHeight, setPagerHeight] = useState(0);
  const listRef = useRef(null);

  const safeIndex = total > 0 ? Math.min(Math.max(index, 0), total - 1) : 0;
  const panel = total > 0 ? gallery[safeIndex] : null;
  // Whether this account may see every panel is decided by the service (story.entitled).
  const unlocked = Boolean(story) && Boolean(story.entitled);
  const price = story && story.priceCents ? formatPrice(story.priceCents) : '';
  const locked = Boolean(story) && total > 0 && isUnitLocked(story, safeIndex, 'gallery', unlocked);
  const premiumPreview = Boolean(story) && story.access === 'Premium' && !unlocked;

  useEffect(() => {
    if (!story || story.preview || !tracksProgress || total === 0 || locked) return;
    saveProgress(story.id, {
      kind: 'gallery',
      position: safeIndex,
      fraction: 1,
      total,
      percent: (safeIndex + 1) / total,
      finished: safeIndex === total - 1,
    });
  }, [story, tracksProgress, total, safeIndex, locked, saveProgress]);

  const goTo = useCallback(
    (next) => {
      if (next < 0 || next >= total) return;
      setIndex(next);
      try {
        if (listRef.current) listRef.current.scrollToOffset({ offset: next * width, animated: true });
      } catch (e) {
        // the pager will still settle on the right page
      }
    },
    [total, width]
  );

  const onScroll = (event) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    if (next !== index && next >= 0 && next < total) setIndex(next);
  };

  const openUnlock = () => navigation.openUnlock(storyId);

  let body;
  if (detail.loading && !data) {
    body = <LoadingState label={'Opening gallery…'} />;
  } else if (detail.error && !data) {
    body = <ErrorState message={detail.error.message} onRetry={detail.reload} />;
  } else if (!story || total === 0) {
    body = (
      <EmptyState
        icon="images-outline"
        title={story ? 'No images yet' : 'Story not found'}
        message={story ? 'This story doesn’t have a gallery.' : 'This story may have been removed.'}
        actionLabel="Go back"
        onAction={navigation.goBack}
      />
    );
  } else {
    body = (
      <>
        <View style={styles.pager} onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}>
          {pagerHeight > 0 ? (
            <FlatList
              ref={listRef}
              data={gallery}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(initial.current, total - 1)}
              getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
              onScroll={onScroll}
              scrollEventThrottle={32}
              renderItem={({ item, index: i }) => {
                const pageLocked = isUnitLocked(story, i, 'gallery', unlocked);
                return (
                  <View style={{ width, height: pagerHeight, justifyContent: 'center' }}>
                    {pageLocked ? (
                      <LockedCard
                        dark
                        title="Premium panel"
                        message={`Unlock the full story${price ? ` for ${price}` : ''} to see every panel. (Demo purchase: no real money.)`}
                        actionLabel={price ? `Unlock · ${price}` : 'Unlock full story'}
                        onAction={openUnlock}
                      />
                    ) : (
                      <GalleryImage panel={item} style={styles.image} />
                    )}
                  </View>
                );
              }}
            />
          ) : null}
        </View>

        <View style={styles.captionArea}>
          <View style={styles.captionTop}>
            <Text style={styles.counter}>
              PANEL {safeIndex + 1} OF {total}
            </Text>
            {premiumPreview && !locked ? (
              <View style={styles.previewPill}>
                <Text style={styles.previewText}>FREE PREVIEW</Text>
              </View>
            ) : null}
            {locked ? (
              <View style={[styles.previewPill, styles.lockedPill]}>
                <Text style={[styles.previewText, { color: colors.coral }]}>LOCKED</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.caption}>{locked ? 'This panel is part of the Premium story.' : panel.caption}</Text>
          <ProgressBar
            value={(safeIndex + 1) / total}
            height={4}
            color={colors.coral}
            trackColor={colors.indigo700}
            style={styles.progress}
          />
          <View style={styles.navRow}>
            <Button
              title="Previous"
              icon="chevron-back"
              variant="secondary"
              disabled={safeIndex === 0}
              onPress={() => goTo(safeIndex - 1)}
              style={styles.navButton}
            />
            {safeIndex < total - 1 ? (
              <Button title="Next" icon="chevron-forward" onPress={() => goTo(safeIndex + 1)} style={styles.navButton} />
            ) : (
              <Button title="Story page" icon="book-outline" onPress={navigation.goBack} style={styles.navButton} />
            )}
          </View>
        </View>
      </>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <StatusBar style="light" />
      <BackHeader
        dark
        title={story ? story.title : 'Gallery'}
        onBack={navigation.goBack}
        right={
          story ? (
            <IconButton
              name="share-outline"
              label="Share story"
              background={colors.indigo800}
              color={colors.textOnDark}
              onPress={() => share(story)}
            />
          ) : null
        }
      />
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.indigo950 },
  pager: { flex: 1 },
  image: { flex: 1, marginHorizontal: spacing.lg, marginVertical: spacing.sm, borderRadius: radius.xl },
  captionArea: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg },
  captionTop: { flexDirection: 'row', alignItems: 'center' },
  counter: { ...typography.micro, color: colors.coral },
  previewPill: {
    borderWidth: 1,
    borderColor: colors.indigo300,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: spacing.md,
  },
  lockedPill: { borderColor: colors.coral },
  previewText: { ...typography.micro, fontSize: 11, color: colors.indigo300 },
  caption: { ...typography.body, fontSize: 16, color: colors.textOnDark, marginTop: spacing.sm, minHeight: 48 },
  progress: { marginTop: spacing.md },
  navRow: { flexDirection: 'row', marginTop: spacing.lg },
  navButton: { flex: 1, alignSelf: 'stretch', marginHorizontal: spacing.xs },
});
