import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import IconButton from '../components/IconButton';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import ReaderSettings from '../components/ReaderSettings';
import ChapterList from '../components/ChapterList';
import LockedCard from '../components/LockedCard';
import MediaBlocks from '../components/MediaBlocks';
import ActionBar from '../components/ActionBar';
import CreatorLink from '../components/CreatorLink';
import RelatedStories from '../components/RelatedStories';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { fetchStory } from '../services/storyService';
import { useLibrary } from '../context/LibraryContext';
import { useReading } from '../context/ReadingContext';
import { colors, radius, readerThemes, spacing, typography } from '../theme/theme';
import { READER_FONT, overallPercent, percentLabel, readMinutes, scrollFraction } from '../utils/reading';
import { isUnitLocked } from '../utils/access';
import { formatPrice } from '../utils/pricing';
import useShare from '../hooks/useShare';
import { useCommunity } from '../context/CommunityContext';
import { useSheetInsets } from '../utils/insets';

// Memoized so scrolling (which updates the progress bar) never re-lays-out the text.
const ChapterBody = React.memo(function ChapterBody({ paragraphs, fontSize, color }) {
  const lineHeight = Math.round(fontSize * 1.65);
  const gap = Math.round(fontSize * 0.95);
  return (
    <>
      {paragraphs.map((text, i) => (
        <Text
          key={i}
          style={{ fontFamily: READER_FONT, fontSize, lineHeight, color, marginBottom: gap }}
        >
          {text}
        </Text>
      ))}
    </>
  );
});

// Written-story reader: adjustable type, themes, chapters, progress, free preview and locks.
export default function ReaderScreen({ storyId, initialChapter, navigation }) {
  const sheetInsets = useSheetInsets();
  const { isSaved, toggleSaved, isFavorite, toggleFavorite } = useLibrary();
  const {
    fontSize,
    increaseFont,
    decreaseFont,
    canIncreaseFont,
    canDecreaseFont,
    theme,
    setTheme,
    getProgress,
    saveProgress,
  } = useReading();
  const t = readerThemes[theme] || readerThemes.cream;
  const share = useShare();
  const { commentCountFor } = useCommunity();

  const detail = useAsync(() => fetchStory(storyId), [storyId]);
  const data = detail.data;
  const story = data ? data.story : null;
  const chapters = data ? data.content.chapters : [];
  const gallery = data ? data.content.gallery : [];
  const total = chapters.length;

  // Where to start: an explicit chapter, otherwise resume where the reader left off.
  const initial = useRef(null);
  if (initial.current === null) {
    const p = getProgress(storyId);
    const resume = typeof initialChapter !== 'number' && p && p.kind === 'chapters' && !p.finished;
    initial.current = {
      chapter: typeof initialChapter === 'number' ? initialChapter : resume ? p.position || 0 : 0,
      fraction: resume ? p.fraction || 0 : null,
    };
  }

  const [chapter, setChapter] = useState(initial.current.chapter);
  const [fraction, setFraction] = useState(initial.current.fraction || 0);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  const fractionRef = useRef(initial.current.fraction || 0);
  const restoreRef = useRef(initial.current.fraction);
  const scrollRef = useRef(null);
  const viewHeight = useRef(0);
  const contentHeight = useRef(0);

  const safeChapter = total > 0 ? Math.min(Math.max(chapter, 0), total - 1) : 0;
  const current = total > 0 ? chapters[safeChapter] : null;
  // Whether this account may read everything is decided by the service (story.entitled).
  const unlocked = Boolean(story) && Boolean(story.entitled);
  const price = story && story.priceCents ? formatPrice(story.priceCents) : '';
  const locked = Boolean(story) && total > 0 && isUnitLocked(story, safeChapter, 'chapters', unlocked);
  const premiumPreview = Boolean(story) && story.access === 'Premium' && !unlocked;

  // Latest values for callbacks that outlive a render (scroll end, unmount).
  const live = useRef({});
  live.current = { story, total, chapter: safeChapter, locked };

  const commit = useCallback(() => {
    const { story: s, total: n, chapter: c, locked: isLocked } = live.current;
    if (!s || !n || isLocked || s.preview) return; // previews never record progress
    const f = fractionRef.current;
    saveProgress(s.id, {
      kind: 'chapters',
      position: c,
      fraction: f,
      total: n,
      percent: overallPercent(c, f, n),
      finished: c === n - 1 && f >= 0.97,
    });
  }, [saveProgress]);

  // Save on open / chapter change, and once more when the reader closes.
  const storyKey = story ? story.id : null;
  useEffect(() => {
    if (storyKey) commit();
  }, [storyKey, safeChapter, commit]);
  useEffect(() => () => commit(), [commit]);

  const goTo = useCallback(
    (index) => {
      if (index < 0 || index >= total) return;
      commit();
      fractionRef.current = 0;
      restoreRef.current = null;
      setFraction(0);
      setChapter(index);
      setShowChapters(false);
    },
    [commit, total]
  );

  const maybeRestore = () => {
    if (restoreRef.current === null || !scrollRef.current) return;
    if (!(contentHeight.current > 0 && viewHeight.current > 0)) return;
    const max = contentHeight.current - viewHeight.current;
    if (max > 0) scrollRef.current.scrollTo({ y: restoreRef.current * max, animated: false });
    restoreRef.current = null;
  };

  const onScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const f = scrollFraction(contentOffset.y, contentSize.height, layoutMeasurement.height);
    fractionRef.current = f;
    setFraction(f);
  };

  const onContentSizeChange = (w, h) => {
    contentHeight.current = h;
    maybeRestore();
    // A chapter that fits on one screen counts as read as soon as it is shown.
    if (viewHeight.current > 0 && h <= viewHeight.current && restoreRef.current === null) {
      fractionRef.current = 1;
      setFraction(1);
      commit();
    }
  };

  const percent = total > 0 && !locked ? overallPercent(safeChapter, fraction, total) : overallPercent(safeChapter, 0, total);

  const openUnlock = () => navigation.openUnlock(storyId);

  // ------------------------------------------------------------------ body
  let body;
  if (detail.loading && !data) {
    body = (
      <View style={styles.centered}>
        <LoadingState label={'Opening story…'} />
      </View>
    );
  } else if (detail.error && !data) {
    body = (
      <View style={styles.centered}>
        <ErrorState message={detail.error.message} onRetry={detail.reload} />
      </View>
    );
  } else if (!story || total === 0) {
    body = (
      <View style={styles.centered}>
        <EmptyState
          icon="book-outline"
          title={story ? 'No written chapters' : 'Story not found'}
          message={
            story
              ? 'This story isn’t told in written chapters. Open it in the right viewer instead.'
              : 'This story may have been removed or the link is out of date.'
          }
          actionLabel={story ? 'Open story' : 'Go back'}
          onAction={() => (story ? navigation.openContent(story) : navigation.goBack())}
        />
      </View>
    );
  } else {
    const isLast = safeChapter === total - 1;
    body = (
      <>
        <ProgressBar
          value={percent}
          height={4}
          color={t.barFill}
          trackColor={t.bar}
          style={styles.topProgress}
        />
        {showSettings ? (
          <View style={styles.settingsWrap}>
            <ReaderSettings
              theme={theme}
              onTheme={setTheme}
              fontSize={fontSize}
              onIncrease={increaseFont}
              onDecrease={decreaseFont}
              canIncrease={canIncreaseFont}
              canDecrease={canDecreaseFont}
            />
          </View>
        ) : null}

        <ScrollView
          key={`${story.id}-${safeChapter}`}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={onScroll}
          onScrollEndDrag={commit}
          onMomentumScrollEnd={commit}
          onLayout={(e) => {
            viewHeight.current = e.nativeEvent.layout.height;
            maybeRestore();
          }}
          onContentSizeChange={onContentSizeChange}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.column}>
            <Text style={[styles.kicker, { color: t.accent }]}>
              CHAPTER {safeChapter + 1} OF {total}
            </Text>
            <Text style={[styles.chapterTitle, { color: t.text, fontSize: fontSize + 8, lineHeight: Math.round((fontSize + 8) * 1.25) }]}>
              {current.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: t.muted }]}>{current.minutes !== undefined ? current.minutes : readMinutes(current.body)} min read</Text>
              {premiumPreview && !locked ? (
                <View style={[styles.previewPill, { borderColor: t.accent }]}>
                  <Text style={[styles.previewText, { color: t.accent }]}>FREE PREVIEW</Text>
                </View>
              ) : null}
            </View>

            {locked ? (
              <LockedCard
                dark={theme === 'night'}
                title={`Chapter ${safeChapter + 1} is Premium`}
                message={`You’ve finished the free preview. Unlock the full story${price ? ` for ${price}` : ''} to keep reading. (Demo purchase: no real money.)`}
                actionLabel={price ? `Unlock · ${price}` : 'Unlock full story'}
                onAction={openUnlock}
                secondaryLabel={safeChapter > 0 ? 'Back to previous chapter' : undefined}
                onSecondary={safeChapter > 0 ? () => goTo(safeChapter - 1) : undefined}
                style={styles.lockedCard}
              />
            ) : (
              <View style={styles.body}>
                {current.blocks && current.blocks.length > 0 ? (
                  <MediaBlocks blocks={current.blocks} fontSize={fontSize} themeColors={t} />
                ) : (
                  <ChapterBody paragraphs={current.body} fontSize={fontSize} color={t.text} />
                )}
              </View>
            )}

            {!locked ? (
              <View style={[styles.endRule, { borderColor: t.border }]}>
                <Text style={[styles.endRuleText, { color: t.muted }]}>
                  {isLast ? (story.isUserStory ? 'THE END' : 'THE END OF THE SAMPLE') : `END OF CHAPTER ${safeChapter + 1}`}
                </Text>
              </View>
            ) : null}

            {!locked && story ? (
              <Pressable
                onPress={() => navigation.openComments(storyId, safeChapter)}
                accessibilityRole="button"
                accessibilityLabel={`Discuss chapter ${safeChapter + 1}`}
                style={[styles.discuss, { borderColor: t.border }]}
              >
                <Ionicons name="chatbubbles-outline" size={18} color={t.accent} />
                <Text style={[styles.discussText, { color: t.text }]}>
                  Discuss this chapter ({commentCountFor(story, safeChapter)})
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.navRow}>
              <Button
                title="Previous"
                icon="chevron-back"
                variant="secondary"
                disabled={safeChapter === 0}
                onPress={() => goTo(safeChapter - 1)}
                style={styles.navButton}
              />
              {!isLast ? (
                <Button
                  title={locked ? 'Next' : 'Next chapter'}
                  icon="chevron-forward"
                  onPress={() => goTo(safeChapter + 1)}
                  style={styles.navButton}
                />
              ) : (
                <Button
                  title="Story page"
                  icon="book-outline"
                  onPress={navigation.goBack}
                  style={styles.navButton}
                />
              )}
            </View>
          </View>

          {isLast && !locked ? (
            <View style={styles.endPanel}>
              <Text style={styles.endTitle}>You reached the end</Text>
              <Text style={styles.endSubtitle}>Thanks for reading {story.title}.</Text>
              <ActionBar
                style={styles.endActions}
                saved={isSaved(story.id)}
                favorite={isFavorite(story.id)}
                onSave={() => toggleSaved(story.id)}
                onFavorite={() => toggleFavorite(story.id)}
                onShare={() => share(story)}
              />
              {gallery.length > 0 ? (
                <Button
                  title="View illustrations"
                  icon="images-outline"
                  variant="secondary"
                  fullWidth
                  style={styles.endButton}
                  onPress={() => navigation.openGallery(story.id)}
                />
              ) : null}
              {story.creator ? (
                <CreatorLink
                  creator={story.creator}
                  caption="WRITTEN BY"
                  onPress={() => navigation.openCreator(story.creator.id)}
                  style={styles.endCreator}
                />
              ) : null}
              <RelatedStories
                title="Read next"
                stories={data.related}
                onOpen={(item) => navigation.openStory(item.id)}
              />
            </View>
          ) : null}
        </ScrollView>

        <Modal
          transparent
          visible={showChapters}
          animationType="slide"
          onRequestClose={() => setShowChapters(false)}
        >
          <Pressable style={[styles.backdrop, sheetInsets]} onPress={() => setShowChapters(false)} accessibilityLabel="Close chapters">
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Chapters</Text>
                <IconButton name="close" label="Close chapters" onPress={() => setShowChapters(false)} />
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
                <ChapterList
                  chapters={chapters}
                  currentIndex={safeChapter}
                  readCount={safeChapter}
                  isLocked={(index) => isUnitLocked(story, index, 'chapters', unlocked)}
                  showPreviewTag={premiumPreview}
                  onSelect={goTo}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <ScreenContainer style={{ backgroundColor: t.bg }}>
      <StatusBar style={theme === 'night' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <IconButton
          name="arrow-back"
          label="Close reader"
          onPress={navigation.goBack}
          background={t.surface}
          color={t.text}
        />
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1} accessibilityRole="header">
            {story ? story.title : 'Reader'}
          </Text>
          {story && total > 0 ? (
            <Text style={[styles.headerSub, { color: t.muted }]} numberOfLines={1}>
              Chapter {safeChapter + 1} of {total} {'·'} {story.preview ? 'PREVIEW' : percentLabel(percent)}
            </Text>
          ) : null}
        </View>
        {story && total > 0 ? (
          <View style={styles.headerActions}>
            <IconButton
              name="list"
              label="Chapters"
              onPress={() => setShowChapters(true)}
              background={t.surface}
              color={t.text}
              style={styles.headerButton}
            />
            <IconButton
              name="text"
              label="Text settings"
              onPress={() => setShowSettings((v) => !v)}
              background={showSettings ? t.accent : t.surface}
              color={showSettings ? (theme === 'night' ? colors.indigo950 : colors.white) : t.text}
              style={styles.headerButton}
            />
          </View>
        ) : null}
      </View>
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerText: { flex: 1, marginHorizontal: spacing.md },
  headerTitle: { ...typography.heading, fontSize: 16 },
  headerSub: { ...typography.caption, fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row' },
  headerButton: { marginLeft: spacing.sm },
  topProgress: { marginBottom: spacing.sm },
  settingsWrap: { marginTop: spacing.xs },
  centered: { flex: 1, justifyContent: 'center' },
  scrollContent: { paddingBottom: spacing.xxl },
  column: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: spacing.xl },
  kicker: { ...typography.micro, marginTop: spacing.md },
  chapterTitle: { fontFamily: READER_FONT, fontWeight: '700', marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  metaText: { ...typography.caption },
  previewPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: spacing.md,
  },
  previewText: { ...typography.micro, fontSize: 11 },
  body: { marginTop: spacing.xs },
  lockedCard: { marginHorizontal: 0 },
  endRule: {
    borderTopWidth: 1,
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  endRuleText: { ...typography.micro, fontSize: 11 },
  discuss: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radius.pill, paddingVertical: 12, marginTop: spacing.lg },
  discussText: { ...typography.caption, fontWeight: '700', marginLeft: 8 },
  navRow: { flexDirection: 'row', marginTop: spacing.lg },
  navButton: { flex: 1, alignSelf: 'stretch', marginHorizontal: spacing.xs },
  endPanel: {
    backgroundColor: colors.cream100,
    borderRadius: radius.xl,
    marginTop: spacing.xl,
    marginHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  endTitle: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  endSubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  endActions: { paddingHorizontal: spacing.xl, marginTop: spacing.lg, paddingRight: spacing.xl - spacing.sm },
  endButton: { marginTop: spacing.md, width: undefined, alignSelf: 'stretch', marginHorizontal: spacing.xl },
  endCreator: { marginTop: spacing.md, marginHorizontal: spacing.xl },
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 15, 46, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.cream100,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '75%',
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sheetTitle: { ...typography.title, color: colors.textPrimary },
  sheetContent: { paddingBottom: spacing.lg },
});
