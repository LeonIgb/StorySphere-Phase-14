import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import IconButton from '../components/IconButton';
import Button from '../components/Button';
import Chip from '../components/Chip';
import Field from '../components/Field';
import TagInput from '../components/TagInput';
import SectionHeader from '../components/SectionHeader';
import SegmentedControl from '../components/SegmentedControl';
import StatusPill from '../components/StatusPill';
import RowActions from '../components/RowActions';
import MediaThumb from '../components/MediaThumb';
import MediaSheet from '../components/MediaSheet';
import { visibilityFor } from '../utils/mediaVisibility';
import PublishSheet from '../components/PublishSheet';
import ConfirmSheet from '../components/ConfirmSheet';
import EmptyState from '../components/EmptyState';
import AnnounceCard from '../components/AnnounceCard';
import LoadingState from '../components/LoadingState';
import { useCreator } from '../context/CreatorContext';
import { colors, genreIcons, radius, spacing, typography } from '../theme/theme';
import { COVER_COLORS, LIMITS, WORK_GENRES } from '../data/creatorOptions';
import {
  addChapter,
  addImages,
  chapterIsEmpty,
  chapterName,
  moveChapter,
  moveImage,
  previewOf,
  removeChapter,
  removeImage,
  setVideo,
  updateImage,
  updateVideo,
  workCounts,
} from '../utils/creator';
import VideoUploader from '../components/VideoUploader';
import ActionLink from '../components/ActionLink';
import { describeCountdown, formatDateTime } from '../utils/schedule';
import { formatPublishedDate } from '../utils/format';
import { formatPrice } from '../utils/pricing';
import { PRICE_TIERS } from '../data/pricing';
import { MAX_PREVIEW } from '../utils/access';

function SaveLine({ saveState, storageMode }) {
  let icon = 'checkmark-circle-outline';
  let text = 'All changes are saved on this device.';
  let color = colors.textSecondary;
  if (storageMode === 'memory') {
    icon = 'warning-outline';
    text = 'Saved for this session only. This runtime has no device storage.';
    color = colors.coralText;
  } else if (saveState === 'saving') {
    icon = 'sync-outline';
    text = 'Saving…';
  }
  return (
    <View style={styles.saveLine}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.saveText, { color }]}>{text}</Text>
    </View>
  );
}

// The story editor: details, cover, access, and the content list (chapters or images).
// Every change is saved automatically.
export default function StoryEditorScreen({ workId, navigation }) {
  const { works, hydrated, editWork, unpublish, deleteWork, commitLiveEdits, saveState, storageMode } = useCreator();
  const work = works.find((w) => w.id === workId) || null;

  const [publishOpen, setPublishOpen] = useState(false);
  const [uploading, setUploading] = useState(false); // a video is still being uploaded
  const [mediaSheet, setMediaSheet] = useState(null); // 'cover' | 'images'
  const [confirm, setConfirm] = useState(null); // { kind, id? }

  // Readers of a live story see edits as they are made; refresh the other screens on the way out.
  useEffect(() => () => commitLiveEdits(), [commitLiveEdits]);

  if (!hydrated) {
    return (
      <ScreenContainer>
        <BackHeader title="Edit story" onBack={navigation.goBack} />
        <LoadingState label="Opening your story…" />
      </ScreenContainer>
    );
  }

  if (!work) {
    return (
      <ScreenContainer>
        <BackHeader title="Edit story" onBack={navigation.goBack} />
        <EmptyState
          icon="document-text-outline"
          title="Story not found"
          message="This story may have been deleted."
          actionLabel="Back to studio"
          onAction={navigation.goBack}
        />
      </ScreenContainer>
    );
  }

  const set = (patch) => editWork(work.id, (w) => ({ ...w, ...patch }));
  const counts = workCounts(work);
  const isImage = work.mediaType === 'Image';
  const isVideo = work.mediaType === 'Video';
  const icon = genreIcons[work.genre] || 'book';

  const onCoverPicked = (items) => set({ coverUri: items[0].uri });
  const onImagesPicked = (items) => editWork(work.id, (w) => addImages(w, items));

  const newChapter = () => {
    const updated = editWork(work.id, (w) => addChapter(w));
    if (updated) navigation.openChapterEditor(work.id, updated.chapters[updated.chapters.length - 1].id);
  };

  const runConfirm = () => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    if (c.kind === 'chapter') editWork(work.id, (w) => removeChapter(w, c.id));
    if (c.kind === 'unpublish') unpublish(work.id);
    if (c.kind === 'delete') {
      deleteWork(work.id);
      navigation.goBack();
    }
  };

  const confirmCopy = {
    chapter: {
      title: 'Delete this chapter?',
      message: 'The chapter and everything in it will be removed from this story.',
      label: 'Delete chapter',
      destructive: true,
    },
    unpublish: {
      title: work.status === 'scheduled' ? 'Cancel the schedule?' : 'Unpublish this story?',
      message:
        work.status === 'scheduled'
          ? 'The story goes back to your drafts and will not be released.'
          : 'It disappears from Home, Discover and your profile, and goes back to your drafts. Nothing is deleted.',
      label: work.status === 'scheduled' ? 'Cancel schedule' : 'Unpublish',
      destructive: false,
    },
    delete: {
      title: 'Delete this story?',
      message: 'This permanently deletes the story and all its content from this device.',
      label: 'Delete story',
      destructive: true,
    },
  };
  const copy = confirm ? confirmCopy[confirm.kind] : null;

  // ------------------------------------------------------------------ status card
  let statusLine = 'Only you can see this draft.';
  if (work.status === 'scheduled') {
    statusLine = `Goes live ${formatDateTime(work.scheduledFor)} (${describeCountdown(work.scheduledFor)}). Simulated: it is released when the app is open at that time.`;
  } else if (work.status === 'published') {
    const days = Math.max(0, Math.floor((Date.now() - Date.parse(work.publishedAt)) / 86400000));
    statusLine = `Live since ${formatPublishedDate(days)}. Changes you make are visible to readers right away.`;
  }

  return (
    <ScreenContainer>
      <BackHeader
        title="Edit story"
        onBack={navigation.goBack}
        right={
          <IconButton
            name="eye-outline"
            label="Preview story"
            onPress={() => navigation.openStory(work.id)}
          />
        }
      />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <SaveLine saveState={saveState} storageMode={storageMode} />

          {/* ------------------------------------------------------------ status */}
          <View style={styles.card}>
            <View style={styles.statusTop}>
              <StatusPill status={work.status} />
              <Text style={styles.statusType}>
                {work.mediaType} {'·'} {work.access}
              </Text>
            </View>
            <Text style={styles.statusText}>{statusLine}</Text>
            <View style={styles.statusButtons}>
              <Button
                title="Preview"
                icon="eye-outline"
                variant="secondary"
                size="sm"
                onPress={() => navigation.openStory(work.id)}
                style={styles.statusButton}
              />
              {work.status === 'draft' ? (
                <Button
                  title="Publish…"
                  icon="rocket-outline"
                  variant="accent"
                  size="sm"
                  onPress={() => setPublishOpen(true)}
                  disabled={uploading}
                  style={styles.statusButton}
                />
              ) : (
                <Button
                  title={work.status === 'scheduled' ? 'Cancel schedule' : 'Unpublish'}
                  icon={work.status === 'scheduled' ? 'close-circle-outline' : 'eye-off-outline'}
                  variant="secondary"
                  size="sm"
                  onPress={() => setConfirm({ kind: 'unpublish' })}
                  style={styles.statusButton}
                />
              )}
            </View>
            {work.status === 'published' ? <AnnounceCard work={work} /> : null}
          </View>

          {/* ------------------------------------------------------------ details */}
          <SectionHeader title="Story details" />
          <View style={styles.section}>
            <Text style={styles.groupLabel}>COVER</Text>
            <View style={styles.coverRow}>
              <MediaThumb uri={work.coverUri} kind="cover" width={96} height={128} color={work.coverColor} icon={icon} />
              <View style={styles.coverSide}>
                <Button
                  title={work.coverUri ? 'Change image' : 'Choose cover image'}
                  icon="image-outline"
                  variant="secondary"
                  size="sm"
                  onPress={() => setMediaSheet('cover')}
                />
                {work.coverUri ? (
                  <Button
                    title="Remove image"
                    icon="close"
                    variant="ghost"
                    size="sm"
                    onPress={() => set({ coverUri: null })}
                    style={styles.coverRemove}
                  />
                ) : null}
                <Text style={styles.hint}>
                  {work.coverUri
                    ? 'Shown on cards and the story page.'
                    : 'Without an image, a coloured cover with a genre icon is used.'}
                </Text>
              </View>
            </View>
            <Text style={[styles.groupLabel, styles.swatchLabel]}>COVER COLOUR</Text>
            <View style={styles.swatches}>
              {COVER_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => set({ coverColor: c })}
                  hitSlop={5}
                  accessibilityRole="button"
                  accessibilityLabel={`Cover colour ${c}`}
                  accessibilityState={{ selected: work.coverColor === c }}
                  style={[styles.swatch, { backgroundColor: c }, work.coverColor === c && styles.swatchSelected]}
                >
                  {work.coverColor === c ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                </Pressable>
              ))}
            </View>

            <Field
              label="TITLE"
              value={work.title}
              onChangeText={(t) => set({ title: t })}
              placeholder="Give your story a title"
              maxLength={LIMITS.title}
            />
            <Field
              label="DESCRIPTION"
              value={work.description}
              onChangeText={(t) => set({ description: t })}
              placeholder="What is your story about? This is the synopsis readers see."
              multiline
              maxLength={LIMITS.description}
            />

            <Text style={styles.groupLabel}>GENRE</Text>
            <View style={styles.chipRow}>
              {WORK_GENRES.map((g) => (
                <Chip
                  key={g}
                  label={g}
                  icon={genreIcons[g]}
                  selected={work.genre === g}
                  onPress={() => set({ genre: g })}
                  style={styles.chip}
                />
              ))}
            </View>

            <TagInput tags={work.tags} onChange={(tags) => set({ tags })} />

            <Text style={styles.groupLabel}>ACCESS</Text>
            <SegmentedControl
              options={['Free', 'Premium']}
              value={work.access}
              onChange={(access) => set({ access })}
            />
            <Text style={[styles.hint, styles.accessHint]}>
              {work.access === 'Premium'
                ? work.mediaType === 'Video'
                  ? 'Premium: the video is locked until a reader buys it (demo purchase). There is no free preview clip for uploaded videos.'
                  : `Premium: readers get ${previewOf(work)} ${isImage ? 'panel' : 'chapter'}${previewOf(work) === 1 ? '' : 's'} free; the rest needs a purchase.`
                : 'Free: everyone can read the whole story.'}
            </Text>
            {work.access === 'Premium' ? (
              <>
                <Text style={styles.groupLabel}>PRICE (ONE-TIME)</Text>
                <View style={styles.chipRow}>
                  {PRICE_TIERS.map((cents) => (
                    <Chip
                      key={cents}
                      label={formatPrice(cents)}
                      selected={work.priceCents === cents}
                      onPress={() => set({ priceCents: cents })}
                      style={styles.chip}
                    />
                  ))}
                </View>
                <Text style={[styles.hint, styles.accessHint]}>
                  Readers will see {formatPrice(work.priceCents)}. Prices are demo only: no real payments exist yet, and a real store sets prices on a server.
                </Text>
                {work.mediaType !== 'Video' ? (
                  <>
                    <Text style={styles.groupLabel}>FREE PREVIEW</Text>
                    <View style={styles.chipRow}>
                      {Array.from({ length: MAX_PREVIEW + 1 }, (_, n) => (
                        <Chip
                          key={n}
                          label={`${n} ${isImage ? 'panel' : 'chapter'}${n === 1 ? '' : 's'}`}
                          selected={previewOf(work) === n}
                          onPress={() => set({ previewCount: n })}
                          style={styles.chip}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            ) : null}
          </View>

          {/* ------------------------------------------------------------ content */}
          {isVideo ? (
            <>
              <SectionHeader title="Video" />
              <View style={styles.videoWrap}>
                <VideoUploader
                  value={work.video}
                  onChange={(file) => editWork(work.id, (w) => setVideo(w, file))}
                  caption={work.video ? work.video.caption : ''}
                  onCaption={(caption) => editWork(work.id, (w) => updateVideo(w, { caption }))}
                  onBusyChange={setUploading}
                  label="video story"
                />
                <View style={styles.videoLink}>
                  <ActionLink icon="expand-outline" label="Open full upload page" onPress={() => navigation.openVideoUpload(work.id)} accessibilityLabel="Open full upload page" />
                </View>
                {uploading ? <Text style={styles.sectionNote}>Wait for the upload to finish before publishing.</Text> : null}
              </View>
            </>
          ) : isImage ? (
            <>
              <SectionHeader title={`Images (${counts.images})`} />
              <Text style={styles.sectionNote}>Panels appear in this order. Add a caption to each.</Text>
              {work.images.length === 0 ? (
                <EmptyState
                  icon="images-outline"
                  title="No images yet"
                  message="Add the images that make up your story."
                  actionLabel="Add images"
                  onAction={() => setMediaSheet('images')}
                />
              ) : (
                <>
                  {work.images.map((image, i) => (
                    <View key={image.id} style={styles.row}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowIndex}>{i + 1}</Text>
                        <MediaThumb uri={image.uri} width={72} height={96} color={work.coverColor} icon={icon} />
                        <View style={styles.rowBody}>
                          <Field
                            value={image.caption}
                            onChangeText={(t) => editWork(work.id, (w) => updateImage(w, image.id, { caption: t }))}
                            placeholder="Caption (optional)"
                            multiline
                            maxLength={LIMITS.caption}
                            minHeight={64}
                            style={styles.captionField}
                            accessibilityLabel={`Caption for image ${i + 1}`}
                          />
                        </View>
                      </View>
                      <RowActions
                        name={`image ${i + 1}`}
                        canUp={i > 0}
                        canDown={i < work.images.length - 1}
                        onUp={() => editWork(work.id, (w) => moveImage(w, image.id, -1))}
                        onDown={() => editWork(work.id, (w) => moveImage(w, image.id, 1))}
                        onDelete={() => editWork(work.id, (w) => removeImage(w, image.id))}
                        style={styles.rowActions}
                      />
                    </View>
                  ))}
                  <View style={styles.addWrap}>
                    <Button title="Add images" icon="add" variant="secondary" onPress={() => setMediaSheet('images')} />
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              <SectionHeader title={`Chapters (${counts.chapters})`} />
              <Text style={styles.sectionNote}>
                {work.mediaType === 'Mixed'
                  ? 'Each chapter is built from text, image and video blocks.'
                  : 'Tap a chapter to write it. Use the arrows to reorder.'}
              </Text>
              {work.chapters.length === 0 ? (
                <EmptyState
                  icon="document-text-outline"
                  title="No chapters yet"
                  message="Every story needs at least one chapter."
                  actionLabel="Add a chapter"
                  onAction={newChapter}
                />
              ) : (
                <>
                  {work.chapters.map((chapter, i) => {
                    const empty = chapterIsEmpty(work, chapter);
                    const detail =
                      work.mediaType === 'Mixed'
                        ? `${(chapter.blocks || []).length} block${(chapter.blocks || []).length === 1 ? '' : 's'}`
                        : `${workCountsFor(work, chapter)} words`;
                    return (
                      <View key={chapter.id} style={styles.chapterRow}>
                        <Pressable
                          onPress={() => navigation.openChapterEditor(work.id, chapter.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${chapterName(chapter, i)}`}
                          hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
                          style={({ pressed }) => [styles.chapterMain, pressed && { opacity: 0.8 }]}
                        >
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{i + 1}</Text>
                          </View>
                          <View style={styles.chapterText}>
                            <Text style={styles.chapterTitle} numberOfLines={1}>
                              {chapterName(chapter, i)}
                            </Text>
                            <Text style={[styles.chapterMeta, empty && { color: colors.coralText }]}>
                              {empty ? 'Empty' : detail}
                            </Text>
                          </View>
                        </Pressable>
                        <RowActions
                          name={`chapter ${i + 1}`}
                          canUp={i > 0}
                          canDown={i < work.chapters.length - 1}
                          onUp={() => editWork(work.id, (w) => moveChapter(w, chapter.id, -1))}
                          onDown={() => editWork(work.id, (w) => moveChapter(w, chapter.id, 1))}
                          onDelete={() => setConfirm({ kind: 'chapter', id: chapter.id })}
                        />
                      </View>
                    );
                  })}
                  <View style={styles.addWrap}>
                    <Button title="Add chapter" icon="add" variant="secondary" onPress={newChapter} />
                    {work.mediaType === 'Mixed' ? (
                      <Button title="Add video" icon="videocam-outline" variant="secondary" onPress={() => navigation.openVideoUpload(work.id)} accessibilityLabel="Add a video on the upload page" style={{ marginTop: spacing.sm }} />
                    ) : null}
                  </View>
                </>
              )}
            </>
          )}

          {/* ------------------------------------------------------------ danger */}
          <SectionHeader title="Danger zone" />
          <View style={styles.addWrap}>
            <Button
              title="Delete this story"
              icon="trash-outline"
              variant="secondary"
              onPress={() => setConfirm({ kind: 'delete' })}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MediaSheet
        visible={mediaSheet === 'cover'}
        kind="image"
        cover
        preset="cover"
        onClose={() => setMediaSheet(null)}
        onPicked={onCoverPicked}
      />
      <MediaSheet
        visible={mediaSheet === 'images'}
        kind="image"
        multiple
        visibility={(i) => visibilityFor(work, 'images', (work.images || []).length + i)}
        onClose={() => setMediaSheet(null)}
        onPicked={onImagesPicked}
      />
      <PublishSheet workId={work.id} visible={publishOpen} onClose={() => setPublishOpen(false)} />
      <ConfirmSheet
        visible={Boolean(confirm)}
        title={copy ? copy.title : ''}
        message={copy ? copy.message : ''}
        confirmLabel={copy ? copy.label : 'Confirm'}
        destructive={copy ? copy.destructive : false}
        icon={copy && copy.destructive ? 'trash-outline' : 'help-circle-outline'}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
}

function workCountsFor(work, chapter) {
  return workCounts({ ...work, chapters: [chapter] }).words;
}

const styles = StyleSheet.create({
  videoWrap: { paddingHorizontal: spacing.xl },
  videoLink: { marginTop: spacing.sm, alignItems: 'flex-start' },
  fill: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  saveLine: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  saveText: { ...typography.caption, fontSize: 12, marginLeft: 5, flex: 1 },
  card: {
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.lg,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
  },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusType: { ...typography.caption, fontSize: 12, color: colors.textSecondary },
  statusText: { ...typography.body, color: colors.textPrimary, marginTop: spacing.sm },
  statusButtons: { flexDirection: 'row', marginTop: spacing.md },
  statusButton: { marginRight: spacing.sm },
  section: { paddingHorizontal: spacing.xl },
  groupLabel: { ...typography.micro, color: colors.textSecondary, marginBottom: 6 },
  coverRow: { flexDirection: 'row', alignItems: 'flex-start' },
  coverSide: { flex: 1, marginLeft: spacing.lg },
  coverRemove: { marginTop: spacing.xs },
  swatchLabel: { marginTop: spacing.lg },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: { borderColor: colors.coral },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  chip: { marginBottom: spacing.sm },
  hint: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },
  accessHint: { marginBottom: spacing.sm },
  sectionNote: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.xl, marginTop: -spacing.xs, marginBottom: spacing.md },
  row: {
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  rowIndex: { ...typography.heading, width: 22, color: colors.textSecondary, marginTop: 4 },
  rowBody: { flex: 1, marginLeft: spacing.md },
  captionField: { marginBottom: 0 },
  rowActions: { alignSelf: 'flex-end', marginTop: spacing.sm },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  chapterMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.heading, fontSize: 15, color: colors.indigo700 },
  chapterText: { flex: 1, marginHorizontal: spacing.md },
  chapterTitle: { ...typography.heading, fontSize: 16, color: colors.textPrimary },
  chapterMeta: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addWrap: { paddingHorizontal: spacing.xl },
});
