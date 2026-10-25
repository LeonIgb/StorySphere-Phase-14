import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import IconButton from '../components/IconButton';
import AccessBadge from '../components/AccessBadge';
import Button from '../components/Button';
import Chip from '../components/Chip';
import CommunityPanel from '../components/CommunityPanel';
import FollowButton from '../components/FollowButton';
import ReportSheet from '../components/ReportSheet';
import { useCommunity } from '../context/CommunityContext';
import ActionBar from '../components/ActionBar';
import ChapterList from '../components/ChapterList';
import CoverImage from '../components/CoverImage';
import CreatorLink from '../components/CreatorLink';
import ProgressBar from '../components/ProgressBar';
import RelatedStories from '../components/RelatedStories';
import SectionHeader from '../components/SectionHeader';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { fetchStory } from '../services/storyService';
import { useLibrary } from '../context/LibraryContext';
import { useReading } from '../context/ReadingContext';
import { colors, genreIcons, mediaIcons, radius, spacing, typography } from '../theme/theme';
import { formatCount, formatPublishedDate, formatRating, timeAgo } from '../utils/format';
import { percentLabel } from '../utils/reading';
import { FREE_PREVIEW_PANELS, FREE_PREVIEW_CHAPTERS, isUnitLocked } from '../utils/access';
import { formatPrice } from '../utils/pricing';
import useShare from '../hooks/useShare';

function Stat({ icon, iconColor, value, label }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValueRow}>
        <Ionicons name={icon} size={15} color={iconColor || colors.indigo500} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value, last }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function progressLabel(progress) {
  if (!progress) return '';
  if (progress.finished) return 'Finished';
  if (progress.kind === 'chapters') return `Chapter ${(progress.position || 0) + 1} of ${progress.total} · ${percentLabel(progress.percent)}`;
  if (progress.kind === 'gallery') return `Panel ${(progress.position || 0) + 1} of ${progress.total} · ${percentLabel(progress.percent)}`;
  return `${percentLabel(progress.percent)} watched`;
}

// Story page: synopsis, creator, publication details, contents and the way into the reader,
// gallery or video player for this story.
export default function StoryDetailScreen({ storyId, navigation }) {
  const { isSaved, toggleSaved, isFavorite, toggleFavorite, addRecent } = useLibrary();
  const { getProgress } = useReading();
  const share = useShare();
  const { metricsFor } = useCommunity();
  const [reportTarget, setReportTarget] = useState(null);
  const detail = useAsync(() => fetchStory(storyId), [storyId]);

  const data = detail.data;
  const story = data ? data.story : null;
  const saved = story ? isSaved(story.id) : false;
  const favorite = story ? isFavorite(story.id) : false;

  // Opening a story page puts it in Recently viewed (previews of your own drafts don't count).
  const viewedId = story && !story.preview ? story.id : null;
  useEffect(() => {
    if (viewedId) addRecent(viewedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedId]);

  const openUnlock = () => navigation.openUnlock(storyId);

  let body;
  if (detail.loading && !data) {
    body = <LoadingState label={'Loading story…'} />;
  } else if (detail.error && !data) {
    body = <ErrorState message={detail.error.message} onRetry={detail.reload} />;
  } else if (!story) {
    body = (
      <EmptyState
        icon="book-outline"
        title="Story not found"
        message="This story may have been removed or the link is out of date."
        actionLabel="Go back"
        onAction={navigation.goBack}
      />
    );
  } else {
    const { chapters, gallery, video } = data.content;
    const media = story.mediaType || 'Written';
    const premium = story.access === 'Premium';
    // Access comes from the service (story.entitled), never from a flag kept on this screen.
    const unlocked = Boolean(story.entitled);
    const locked = premium && !unlocked;
    const price = story.priceCents ? formatPrice(story.priceCents) : '';
    const owned = premium && unlocked && story.entitlementReason === 'purchase';
    const creator = story.creator;
    const metrics = metricsFor(story);
    const progress = getProgress(story.id);
    const hasProgress = Boolean(progress) && (progress.percent > 0 || progress.finished);

    const hasChapters = chapters.length > 0;
    const hasGallery = gallery.length > 0;
    const hasVideo = Boolean(video);

    const freeChapters = Math.min(chapters.length, FREE_PREVIEW_CHAPTERS);
    const freePanels = Math.min(gallery.length, FREE_PREVIEW_PANELS);

    // Primary action, by media type.
    let primary = null;
    if (hasChapters) {
      const continuing = hasProgress && !progress.finished && progress.kind === 'chapters';
      primary = {
        title: continuing
          ? `Continue reading · Ch. ${(progress.position || 0) + 1}`
          : progress && progress.finished && progress.kind === 'chapters'
          ? 'Read again'
          : locked
          ? 'Read free preview'
          : 'Start reading',
        icon: 'book-outline',
        onPress: () =>
          navigation.openReader(
            story.id,
            progress && progress.finished && progress.kind === 'chapters' ? 0 : undefined
          ),
      };
    } else if (hasGallery) {
      primary = {
        title: locked ? 'View free preview' : hasProgress && !progress.finished ? 'Continue viewing' : 'View gallery',
        icon: 'images-outline',
        onPress: () => navigation.openGallery(story.id),
      };
    } else if (hasVideo) {
      primary = {
        title: locked && video.previewUri ? 'Watch free preview' : 'Watch video',
        icon: 'play-circle-outline',
        onPress: () => navigation.openVideo(story.id),
      };
    }

    const lengthLabel = media === 'Video' ? 'Runtime' : 'Read time';
    const unitValue = story.chapterCount || story.panelCount || 1;
    const unitLabel = story.chapterCount ? 'Chapters' : story.panelCount ? 'Panels' : 'Episode';

    const previewText = hasChapters
      ? `Free preview: chapter 1 of ${chapters.length}. The rest is Premium.`
      : hasGallery
      ? `Free preview: ${freePanels} of ${gallery.length} panels. The rest is Premium.`
      : 'Free preview clip available. The full video is Premium.';

    body = (
      <>
        {story.preview ? (
          <View style={styles.previewBanner}>
            <Ionicons name="eye-outline" size={20} color={colors.indigo700} />
            <Text style={styles.previewBannerText}>
              <Text style={styles.previewBannerStrong}>Preview. </Text>
              Only you can see this {story.workStatus === 'scheduled' ? 'scheduled story' : 'draft'}. Readers will see it
              like this once it is published. Use the back arrow to return to editing.
            </Text>
          </View>
        ) : null}
        <View style={[styles.cover, { backgroundColor: story.coverColor || colors.indigo700 }]}>
          <Ionicons name={story.icon || 'book'} size={72} color="rgba(251, 246, 236, 0.92)" />
          <CoverImage uri={story.coverUri} />
          <View style={styles.coverMedia}>
            <Ionicons name={mediaIcons[media] || 'document-text'} size={13} color={colors.textOnDark} />
            <Text style={styles.coverMediaText}>{media.toUpperCase()}</Text>
          </View>
          <AccessBadge access={story.access} onCover style={styles.coverAccess} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{story.title}</Text>
          <View style={styles.genreRow}>
            <Chip
              label={story.genre}
              icon={genreIcons[story.genre]}
              onPress={() => navigation.navigate('Discover', { genre: story.genre })}
              style={styles.chip}
            />
            {(story.subgenres || []).map((sub) => (
              <Chip key={sub} label={sub} style={styles.chip} />
            ))}
            <Chip label={media} icon={mediaIcons[media]} style={styles.chip} />
          </View>
          {creator ? (
            <View style={styles.creatorRow}>
              <CreatorLink creator={creator} onPress={() => navigation.openCreator(creator.id)} style={styles.creatorLink} />
              <FollowButton person={creator} />
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <Stat icon="star" iconColor={colors.gold} value={formatRating(metrics.rating)} label={`${formatCount(metrics.ratingCount)} ratings`} />
          <View style={styles.divider} />
          <Stat icon="heart" iconColor={colors.coral} value={formatCount(metrics.likes)} label="Likes" />
          <View style={styles.divider} />
          <Stat icon="time-outline" value={`${story.readMinutes}m`} label={lengthLabel} />
          <View style={styles.divider} />
          <Stat icon="albums-outline" value={String(unitValue)} label={unitLabel} />
        </View>

        {hasProgress ? (
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>{progressLabel(progress)}</Text>
            <ProgressBar value={progress.percent} style={styles.progressBar} />
          </View>
        ) : null}

        <View style={styles.actions}>
          {primary ? (
            <Button title={primary.title} icon={primary.icon} fullWidth onPress={primary.onPress} />
          ) : (
            <EmptyState
              icon="alert-circle-outline"
              title="Nothing to open yet"
              message={story.isUserStory ? 'Add some content in the editor to preview it here.' : 'This story has no content in the sample data.'}
            />
          )}
          {hasChapters && hasGallery ? (
            <Button
              title="View illustrations"
              icon="images-outline"
              variant="secondary"
              fullWidth
              style={styles.secondaryAction}
              onPress={() => navigation.openGallery(story.id)}
            />
          ) : null}
          {locked ? (
            <Button
              title={price ? `Unlock full story · ${price}` : 'Unlock full story'}
              icon="lock-closed"
              variant="accent"
              fullWidth
              style={styles.secondaryAction}
              onPress={openUnlock}
            />
          ) : null}
        </View>

        <ActionBar
          style={styles.actionBar}
          saved={saved}
          favorite={favorite}
          onSave={() => toggleSaved(story.id)}
          onFavorite={() => toggleFavorite(story.id)}
          onShare={() => share(story)}
        />

        {premium ? (
          <View style={styles.premiumNote}>
            <Ionicons name={locked ? 'lock-closed' : 'checkmark-circle'} size={18} color={locked ? colors.coralDark : colors.success} />
            <View style={styles.premiumBody}>
              <Text style={styles.premiumTitle}>
                {locked
                  ? `Premium · ${price || 'priced'} one-time purchase`
                  : owned
                  ? 'Premium · you own this story'
                  : story.entitlementReason === 'owner'
                  ? 'Premium · your own story'
                  : 'Premium · unlocked (developer override)'}
              </Text>
              <Text style={styles.premiumText}>
                {locked
                  ? `${previewText} Demo purchase: no real payment is taken.`
                  : 'Everything in this story is available to you.'}
              </Text>
            </View>
          </View>
        ) : null}

        <SectionHeader title="Synopsis" />
        <Text style={styles.blurb}>{story.blurb}</Text>

        {hasChapters ? (
          <>
            <SectionHeader title={`Chapters (${chapters.length})`} />
            <ChapterList
              chapters={chapters}
              currentIndex={progress && !progress.finished && progress.kind === 'chapters' ? progress.position : -1}
              readCount={
                progress && progress.kind === 'chapters'
                  ? progress.finished
                    ? chapters.length
                    : progress.position || 0
                  : 0
              }
              isLocked={(index) => isUnitLocked(story, index, 'chapters', unlocked)}
              price={price}
              showPreviewTag={locked}
              onSelect={(index) =>
                isUnitLocked(story, index, 'chapters', unlocked)
                  ? openUnlock()
                  : navigation.openReader(story.id, index)
              }
            />
          </>
        ) : null}

        {hasGallery ? (
          <>
            <SectionHeader title={hasChapters ? 'Illustrations' : 'Gallery'} />
            <View style={styles.infoCard}>
              <Ionicons name="images-outline" size={22} color={colors.violet} />
              <Text style={styles.infoText}>
                {gallery.length} captioned panels
                {locked ? ` · first ${freePanels} are free to view` : ''}
              </Text>
            </View>
          </>
        ) : null}

        {hasVideo ? (
          <>
            <SectionHeader title="Video" />
            <View style={styles.infoCard}>
              <Ionicons name="videocam-outline" size={22} color={colors.violet} />
              <Text style={styles.infoText}>{video.about}</Text>
            </View>
          </>
        ) : null}

        <SectionHeader title="Publication details" />
        <View style={styles.detailsCard}>
          <DetailRow
            label="Published"
            value={story.publishLabel || `${formatPublishedDate(story.daysAgo)} (${timeAgo(story.daysAgo)})`}
          />
          <DetailRow label="Genre" value={[story.genre, ...(story.subgenres || [])].join(', ')} />
          {story.status ? <DetailRow label="Status" value={story.status} /> : null}
          <DetailRow label="Format" value={media} />
          <DetailRow label="Access" value={premium ? 'Premium, with free preview' : 'Free'} />
          <DetailRow
            label="Contents"
            value={
              story.chapterCount
                ? `${story.chapterCount} ${story.isUserStory ? '' : 'sample '}chapter${story.chapterCount === 1 ? '' : 's'}${
                    story.panelCount ? ` + ${story.panelCount} panels` : ''
                  }`
                : story.panelCount
                ? `${story.panelCount} panels`
                : 'Video'
            }
          />
          <DetailRow label="Language" value="English" last />
        </View>

        {story.tags && story.tags.length > 0 ? (
          <>
            <SectionHeader title="Tags" />
            <View style={styles.tagRow}>
              {story.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={`#${tag}`}
                  onPress={() => navigation.navigate('Discover', { query: tag })}
                  style={styles.chip}
                />
              ))}
            </View>
          </>
        ) : null}

        <CommunityPanel
          story={story}
          navigation={navigation}
          onReportStory={() => setReportTarget({ type: 'story', id: story.id, label: story.title, ownerId: story.creatorId })}
        />

        <RelatedStories
          title={creator ? `More from ${creator.name.split(' ')[0]}` : 'More from this creator'}
          stories={data.moreFromCreator}
          onOpen={(item) => navigation.openStory(item.id)}
          actionLabel={creator ? 'Profile' : undefined}
          onAction={creator ? () => navigation.openCreator(creator.id) : undefined}
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
        title={story ? story.genre : ''}
        onBack={navigation.goBack}
        right={
          story ? (
            <IconButton
              name={saved ? 'bookmark' : 'bookmark-outline'}
              label={saved ? 'Remove from library' : 'Save to library'}
              color={saved ? colors.coral : colors.indigo900}
              onPress={() => toggleSaved(story.id)}
            />
          ) : null
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {body}
      </ScrollView>
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  cover: {
    height: 210,
    overflow: 'hidden',
    borderRadius: radius.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.indigo100,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  previewBannerText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo800, lineHeight: 18 },
  previewBannerStrong: { fontWeight: '800' },
  coverMedia: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 15, 46, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  coverMediaText: { ...typography.micro, fontSize: 11, color: colors.textOnDark, marginLeft: 5 },
  coverAccess: { position: 'absolute', right: spacing.md, top: spacing.md },
  titleBlock: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  title: { ...typography.display, fontSize: 26, color: colors.textPrimary },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  chip: { marginBottom: spacing.sm },
  creatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorLink: { marginTop: spacing.sm, flex: 1 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.indigo900,
    borderRadius: radius.lg,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  statValue: { ...typography.heading, fontSize: 16, color: colors.textOnDark, marginLeft: 4 },
  statLabel: { ...typography.caption, fontSize: 11, color: colors.textOnDarkMuted, marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: colors.indigo700 },
  progressCard: {
    backgroundColor: colors.violetSoft,
    borderRadius: radius.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  progressText: { ...typography.caption, fontWeight: '700', color: colors.indigo700 },
  progressBar: { marginTop: spacing.sm },
  actions: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  secondaryAction: { marginTop: spacing.md },
  actionBar: { paddingHorizontal: spacing.xl, marginTop: spacing.md, paddingRight: spacing.xl - spacing.sm },
  premiumNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  premiumBody: { flex: 1, marginLeft: spacing.md },
  premiumTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  premiumText: { ...typography.caption, color: colors.textPrimary, lineHeight: 18 },
  blurb: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
  },
  infoText: { ...typography.body, flex: 1, color: colors.textPrimary, marginLeft: spacing.md },
  detailsCard: {
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.lg,
    marginHorizontal: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  detailLabel: { ...typography.caption, color: colors.textSecondary },
  detailValue: { ...typography.caption, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'right', marginLeft: spacing.lg },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl },
});
