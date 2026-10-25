import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import IconButton from '../components/IconButton';
import Button from '../components/Button';
import ActionBar from '../components/ActionBar';
import CreatorLink from '../components/CreatorLink';
import LockedCard from '../components/LockedCard';
import ProgressBar from '../components/ProgressBar';
import RelatedStories from '../components/RelatedStories';
import SectionHeader from '../components/SectionHeader';
import VideoPlayer from '../components/VideoPlayer';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { fetchStory } from '../services/storyService';
import { useLibrary } from '../context/LibraryContext';
import { useReading } from '../context/ReadingContext';
import { useCreator } from '../context/CreatorContext';
import VideoUploader from '../components/VideoUploader';
import ActionLink from '../components/ActionLink';
import { setVideo, updateVideo } from '../utils/creator';
import { colors, radius, spacing, typography } from '../theme/theme';
import { percentLabel } from '../utils/reading';
import { videoSource } from '../utils/access';
import { formatPrice } from '../utils/pricing';
import useShare from '../hooks/useShare';

// Video-story page: player, free preview for premium videos, actions, creator and related stories.
export default function VideoScreen({ storyId, navigation }) {
  const share = useShare();
  const { isSaved, toggleSaved, isFavorite, toggleFavorite } = useLibrary();
  const { getProgress, saveProgress } = useReading();
  const { works, editWork, commitLiveEdits } = useCreator();
  // Edits to a published story reach readers when this page closes.
  useEffect(() => () => commitLiveEdits(), [commitLiveEdits]);

  const detail = useAsync(() => fetchStory(storyId), [storyId]);
  const data = detail.data;
  const story = data ? data.story : null;
  const video = data ? data.content.video : null;
  // The owner of an uploaded video story manages the video right here, with the same uploader the editor uses.
  const ownerWork = story && story.isUserStory ? works.find((w) => w.id === story.id && w.mediaType === 'Video') || null : null;
  const manage = ownerWork ? (
    <View style={styles.manage}>
      <SectionHeader title="Your video" />
      <View style={styles.manageBody}>
      <VideoUploader
        value={ownerWork.video}
        onChange={(file) => {
          editWork(ownerWork.id, (w) => setVideo(w, file));
          commitLiveEdits();
        }}
        caption={ownerWork.video ? ownerWork.video.caption : ''}
        onCaption={(caption) => editWork(ownerWork.id, (w) => updateVideo(w, { caption }))}
        onCaptionCommit={commitLiveEdits}
        label="video story"
      />
      <View style={styles.manageLink}>
        <ActionLink icon="expand-outline" label="Open full upload page" onPress={() => navigation.openVideoUpload(ownerWork.id)} accessibilityLabel="Open full upload page" />
      </View>
      </View>
    </View>
  ) : null;

  const lastSaved = useRef(-1);
  const onProgress = useCallback(
    (fraction) => {
      if (!story || story.preview) return;
      if (Math.abs(fraction - lastSaved.current) < 0.05) return;
      lastSaved.current = fraction;
      saveProgress(story.id, {
        kind: 'video',
        position: 0,
        fraction,
        total: 1,
        percent: fraction,
        finished: fraction >= 0.97,
      });
    },
    [story, saveProgress]
  );
  const onEnded = useCallback(() => {
    if (!story || story.preview) return;
    lastSaved.current = 1;
    saveProgress(story.id, { kind: 'video', position: 0, fraction: 1, total: 1, percent: 1, finished: true });
  }, [story, saveProgress]);

  const openUnlock = () => navigation.openUnlock(storyId);

  let body;
  if (detail.loading && !data) {
    body = <LoadingState label={'Loading video…'} />;
  } else if (detail.error && !data) {
    body = <ErrorState message={detail.error.message} onRetry={detail.reload} />;
  } else if (ownerWork && !video) {
    body = (
      <>
        <EmptyState icon="videocam-outline" title="No video yet" message="Upload a video below. Readers can watch it once the story is published." />
        {manage}
      </>
    );
  } else if (!story || !video) {
    body = (
      <EmptyState
        icon="videocam-outline"
        title={story ? 'No video available' : 'Story not found'}
        message={story ? 'This story doesn’t have a video.' : 'This story may have been removed.'}
        actionLabel="Go back"
        onAction={navigation.goBack}
      />
    );
  } else {
    // Whether this account may watch the full video is decided by the service (story.entitled).
    const unlocked = Boolean(story.entitled);
    const price = story.priceCents ? formatPrice(story.priceCents) : '';
    const source = videoSource(story, video, unlocked);
    const premiumLocked = story.access === 'Premium' && !unlocked;
    const noPlayable = !source.uri;
    const progress = getProgress(story.id);
    const watched = progress && progress.kind === 'video' ? progress.percent : 0;

    body = (
      <>
        <View style={styles.playerWrap}>
          {noPlayable ? (
            <LockedCard
              title="Premium video"
              message={`This video is Premium and has no free preview.${price ? ` Unlock it for ${price}.` : ''} (Demo purchase: no real money.)`}
              actionLabel={price ? `Unlock · ${price}` : 'Unlock full video'}
              onAction={openUnlock}
              style={styles.fullLock}
            />
          ) : (
            <VideoPlayer
              uri={source.uri}
              color={story.coverColor}
              icon={story.icon}
              onProgress={onProgress}
              onEnded={onEnded}
            />
          )}
        </View>

        <View style={styles.flagRow}>
          <View style={styles.flag}>
            <Ionicons name="information-circle-outline" size={14} color={colors.indigo700} />
            <Text style={styles.flagText}>{video.userUpload ? 'Uploaded video' : 'Sample clip'}</Text>
          </View>
          {source.isPreview ? (
            <View style={[styles.flag, styles.flagPreview]}>
              <Ionicons name="lock-closed" size={12} color={colors.coralDark} />
              <Text style={[styles.flagText, { color: colors.coralText }]}>Free preview</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.genre}>{story.genre.toUpperCase()}</Text>
          <Text style={styles.title}>{story.title}</Text>
        </View>

        {watched > 0 ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>
              {progress.finished ? 'Watched' : `${percentLabel(watched)} watched`}
            </Text>
            <ProgressBar value={watched} style={styles.progressBar} />
          </View>
        ) : null}

        <ActionBar
          style={styles.actionBar}
          saved={isSaved(story.id)}
          favorite={isFavorite(story.id)}
          onSave={() => toggleSaved(story.id)}
          onFavorite={() => toggleFavorite(story.id)}
          onShare={() => share(story)}
        />

        {premiumLocked && !noPlayable ? (
          <View style={styles.premiumNote}>
            <Ionicons name="lock-closed" size={18} color={colors.coralDark} />
            <Text style={styles.premiumText}>
              You’re watching the free preview. The full video is Premium.
            </Text>
          </View>
        ) : null}
        {premiumLocked ? (
          <View style={styles.unlock}>
            <Button title={price ? `Unlock full video · ${price}` : 'Unlock full video'} icon="lock-closed" variant="accent" fullWidth onPress={openUnlock} />
          </View>
        ) : null}

        <SectionHeader title="About this video" />
        <Text style={styles.about}>{story.blurb}</Text>
        {video.about ? <Text style={styles.about}>{video.about}</Text> : null}
        {video.caption ? <Text style={styles.about}>{video.caption}</Text> : null}
        {manage}

        {story.creator ? (
          <CreatorLink
            creator={story.creator}
            caption="CREATED BY"
            onPress={() => navigation.openCreator(story.creator.id)}
            style={styles.creatorLink}
          />
        ) : null}

        <RelatedStories
          title={`More from ${story.creator ? story.creator.name.split(' ')[0] : 'this creator'}`}
          stories={data.moreFromCreator}
          onOpen={(item) => navigation.openStory(item.id)}
        />
        <RelatedStories
          title={`More ${story.genre}`}
          stories={data.related}
          onOpen={(item) => navigation.openStory(item.id)}
          actionLabel="See all"
          onAction={() => navigation.navigate('Discover', { genre: story.genre })}
        />
      </>
    );
  }

  return (
    <ScreenContainer>
      <BackHeader
        title={story ? 'Video' : ''}
        onBack={navigation.goBack}
        right={
          story ? (
            <IconButton
              name={isSaved(story.id) ? 'bookmark' : 'bookmark-outline'}
              label={isSaved(story.id) ? 'Remove from library' : 'Save to library'}
              color={isSaved(story.id) ? colors.coral : colors.indigo900}
              onPress={() => toggleSaved(story.id)}
            />
          ) : null
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {body}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  playerWrap: { paddingHorizontal: spacing.xl },
  fullLock: { marginHorizontal: 0 },
  flagRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, marginTop: spacing.md },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.violetSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: spacing.sm,
  },
  flagPreview: { backgroundColor: colors.coralSoft },
  flagText: { ...typography.caption, fontSize: 12, fontWeight: '700', color: colors.indigo700, marginLeft: 4 },
  titleBlock: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  genre: { ...typography.micro, color: colors.coralText },
  title: { ...typography.display, fontSize: 26, color: colors.textPrimary, marginTop: spacing.xs },
  progressCard: {
    backgroundColor: colors.violetSoft,
    borderRadius: radius.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  progressText: { ...typography.caption, fontWeight: '700', color: colors.indigo700 },
  progressBar: { marginTop: spacing.sm },
  actionBar: { paddingHorizontal: spacing.xl, marginTop: spacing.lg, paddingRight: spacing.xl - spacing.sm },
  premiumNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  premiumText: { ...typography.caption, flex: 1, color: colors.textPrimary, marginLeft: spacing.md, lineHeight: 18 },
  unlock: { paddingHorizontal: spacing.xl, marginTop: spacing.md },
  about: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  creatorLink: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  manage: { marginTop: spacing.lg },
  manageBody: { paddingHorizontal: spacing.xl },
  manageLink: { marginTop: spacing.sm, alignItems: 'flex-start' },
});
