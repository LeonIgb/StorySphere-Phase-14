import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import VideoUploader from '../components/VideoUploader';
import Button from '../components/Button';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useCreator } from '../context/CreatorContext';
import { chapterName, findBlock, insertBlockAt, moveBlock, setBlockMedia, setVideo, updateBlock, updateVideo } from '../utils/creator';
import { MEDIA_LIMITS, formatBytes, formatList } from '../utils/mediaFiles';
import { mediaProvider } from '../services/mediaService';
import { visibilityFor } from '../utils/mediaVisibility';
import { colors, radius, spacing, typography } from '../theme/theme';

const blockLabel = (b) => {
  if (b.type === 'text') return `Text: “${String(b.text || '').trim().slice(0, 36) || 'empty'}”`;
  if (b.type === 'image') return 'Image';
  if (b.type === 'video') return 'Video';
  return 'Audio';
};

// The dedicated video upload page. It hosts the same VideoUploader the Create Story page and the
// Video Story page use, and adds the one thing a full page is for: choosing WHERE the video goes.
//   - Video story: the story's video (replace, caption).
//   - Mixed-media story, existing block: that block, with its position and Move up / down.
//   - Mixed-media story, new video: pick the chapter and the place in it, then upload.
// Uploaded videos are saved straight into the story (the studio saves automatically).
export default function VideoUploadScreen({ workId, chapterId, blockId, navigation }) {
  const { works, hydrated, editWork, commitLiveEdits } = useCreator();
  // Edits to a published story reach readers when this page closes.
  useEffect(() => () => commitLiveEdits(), [commitLiveEdits]);
  const work = works.find((w) => w.id === workId) || null;
  const [busy, setBusy] = useState(false);
  const [cloudOn, setCloudOn] = useState(false);
  useEffect(() => {
    mediaProvider.getMediaMode().then((m) => setCloudOn(m.mode === 'cloud'));
  }, []);
  const [placeChapter, setPlaceChapter] = useState(chapterId || null);
  const [placeAt, setPlaceAt] = useState(null); // null = end of the chapter
  const [placedId, setPlacedId] = useState(blockId || null);

  const chapters = work && work.mediaType === 'Mixed' ? work.chapters : [];
  const chosenChapter = useMemo(() => {
    if (!work) return null;
    return chapters.find((c) => c.id === placeChapter) || chapters[0] || null;
  }, [work, chapters, placeChapter]);

  if (!hydrated) {
    return (
      <ScreenContainer>
        <BackHeader title="Upload video" onBack={navigation.goBack} />
        <LoadingState label="Opening…" />
      </ScreenContainer>
    );
  }
  if (!work || (work.mediaType !== 'Video' && work.mediaType !== 'Mixed')) {
    return (
      <ScreenContainer>
        <BackHeader title="Upload video" onBack={navigation.goBack} />
        <EmptyState icon="videocam-outline" title="Nothing to upload to" message="Open a video story or a mixed-media story first." actionLabel="Go back" onAction={navigation.goBack} />
      </ScreenContainer>
    );
  }

  const isVideoStory = work.mediaType === 'Video';
  const located = placedId ? findBlock(work, placedId) : null;
  const placedChapter = located ? work.chapters.find((c) => c.id === located.chapterId) : null;
  const placedBlock = located && placedChapter ? (placedChapter.blocks || [])[located.index] : null;

  let uploader;
  if (isVideoStory) {
    uploader = (
      <VideoUploader
        value={work.video}
        onChange={(file) => editWork(work.id, (w) => setVideo(w, file))}
        caption={work.video ? work.video.caption : ''}
        onCaption={(caption) => editWork(work.id, (w) => updateVideo(w, { caption }))}
        onBusyChange={setBusy}
        label="video story"
        visibility={visibilityFor(work, 'video')}
      />
    );
  } else if (placedBlock) {
    uploader = (
      <VideoUploader
        value={placedBlock.uri ? placedBlock : null}
        onChange={(file) => editWork(work.id, (w) => setBlockMedia(w, located.chapterId, placedBlock.id, file))}
        caption={placedBlock.caption}
        onCaption={(caption) => editWork(work.id, (w) => updateBlock(w, located.chapterId, placedBlock.id, { caption }))}
        onBusyChange={setBusy}
        label="block"
        visibility={visibilityFor(work, 'chapter', Math.max(0, work.chapters.findIndex((c) => c.id === located.chapterId)))}
      />
    );
  } else {
    // A new video: it becomes a block at the chosen place once the upload finishes.
    uploader = chosenChapter ? (
      <VideoUploader
        key="new"
        value={null}
        onChange={(file) => {
          if (!file) return;
          const at = placeAt === null ? (chosenChapter.blocks || []).length : placeAt;
          const updated = editWork(work.id, (w) => insertBlockAt(w, chosenChapter.id, at, 'video', { uri: file.uri, name: file.name, size: file.size, mimeType: file.mimeType, format: file.format, durationMs: file.durationMs }));
          if (updated) {
            const ch = updated.chapters.find((c) => c.id === chosenChapter.id);
            const added = ch && (ch.blocks || [])[Math.min(at, (ch.blocks || []).length - 1)];
            if (added) setPlacedId(added.id);
          }
        }}
        onBusyChange={setBusy}
        label="new block"
        visibility={visibilityFor(work, 'chapter', Math.max(0, work.chapters.findIndex((c) => c.id === chosenChapter.id)))}
      />
    ) : (
      <EmptyState icon="document-text-outline" title="Add a chapter first" message="A mixed-media story needs a chapter to place the video in." actionLabel="Go back" onAction={navigation.goBack} />
    );
  }

  return (
    <ScreenContainer>
      <BackHeader title="Upload video" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.story} numberOfLines={1}>{work.title.trim() || 'Untitled story'}</Text>
        <Text style={styles.rules}>
          {formatList('video')} · up to {formatBytes(MEDIA_LIMITS.videoMaxBytes)} · {MEDIA_LIMITS.videoMaxMinutes} min. Your file is kept as it is, with no re-encoding.
        </Text>
        <View style={styles.notice}>
          <Ionicons name="flask-outline" size={16} color={colors.indigo900} />
          <Text style={styles.noticeText}>{cloudOn ? 'Videos are uploaded to cloud storage and play on every device. They are delivered as uploaded (not re-encoded).' : 'Prototype: the upload is simulated and the video stays on this device, so it only plays here.'}</Text>
        </View>

        {!isVideoStory && !placedBlock && chapters.length > 0 ? (
          <>
            <SectionHeader title="Where should it go?" />
            <View style={styles.chips}>
              {chapters.map((c, i) => {
                const selected = chosenChapter && chosenChapter.id === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setPlaceChapter(c.id);
                      setPlaceAt(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: Boolean(selected) }}
                    accessibilityLabel={`Place in ${chapterName(c, i)}`}
                    style={[styles.chip, selected && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextOn]} numberOfLines={1}>{chapterName(c, i)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {chosenChapter ? (
              <View style={styles.positions}>
                {[{ at: 0, label: 'At the start' }, ...(chosenChapter.blocks || []).map((b, k) => ({ at: k + 1, label: `After block ${k + 1} · ${blockLabel(b)}` }))].map((opt) => {
                  const end = (chosenChapter.blocks || []).length;
                  const selected = placeAt === null ? opt.at === end : placeAt === opt.at;
                  return (
                    <Pressable
                      key={opt.at}
                      onPress={() => setPlaceAt(opt.at)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={opt.label}
                      style={styles.positionRow}
                    >
                      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.indigo900 : colors.indigo300} />
                      <Text style={styles.positionText} numberOfLines={1}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : null}

        <SectionHeader title={isVideoStory ? 'Your video' : 'Video'} />
        <View style={styles.pad}>{uploader}</View>

        {placedBlock && placedChapter ? (
          <View style={styles.placed}>
            <Text style={styles.placedText}>
              Placed in {chapterName(placedChapter, work.chapters.indexOf(placedChapter))}, block {located.index + 1} of {(placedChapter.blocks || []).length}.
            </Text>
            <View style={styles.moveRow}>
              <Button title="Move up" icon="arrow-up" size="sm" variant="secondary" disabled={located.index === 0} onPress={() => editWork(work.id, (w) => moveBlock(w, located.chapterId, placedBlock.id, -1))} style={styles.move} />
              <Button title="Move down" icon="arrow-down" size="sm" variant="secondary" disabled={located.index >= (placedChapter.blocks || []).length - 1} onPress={() => editWork(work.id, (w) => moveBlock(w, located.chapterId, placedBlock.id, 1))} style={styles.move} />
            </View>
          </View>
        ) : null}

        <View style={styles.pad}>
          <Button title="Done" icon="checkmark" fullWidth disabled={busy} onPress={navigation.goBack} style={{ marginTop: spacing.xl }} accessibilityLabel={busy ? 'Done, available when the upload finishes' : 'Done'} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  pad: { paddingHorizontal: spacing.xl },
  story: { ...typography.heading, color: colors.textPrimary, paddingHorizontal: spacing.xl },
  rules: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.xl, marginTop: 4 },
  notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coral, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.xl, marginTop: spacing.md },
  noticeText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo950 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl },
  chip: { backgroundColor: colors.cream200, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: spacing.md, marginRight: spacing.sm, marginBottom: spacing.sm, maxWidth: '100%' },
  chipOn: { backgroundColor: colors.indigo900 },
  chipText: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  chipTextOn: { color: colors.textOnDark },
  positions: { paddingHorizontal: spacing.xl },
  positionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  positionText: { ...typography.body, flex: 1, marginLeft: spacing.md, color: colors.textPrimary },
  placed: { marginHorizontal: spacing.xl, marginTop: spacing.lg, backgroundColor: colors.violetSoft, borderRadius: radius.md, padding: spacing.md },
  placedText: { ...typography.caption, color: colors.indigo800 },
  moveRow: { flexDirection: 'row', marginTop: spacing.sm },
  move: { marginRight: spacing.sm },
});
