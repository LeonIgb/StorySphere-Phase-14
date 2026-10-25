import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import IconButton from '../components/IconButton';
import Button from '../components/Button';
import Field from '../components/Field';
import RowActions from '../components/RowActions';
import MediaThumb from '../components/MediaThumb';
import VideoUploader from '../components/VideoUploader';
import AudioUploader from '../components/AudioUploader';
import ActionLink from '../components/ActionLink';
import MediaSheet from '../components/MediaSheet';
import { visibilityFor } from '../utils/mediaVisibility';
import ConfirmSheet from '../components/ConfirmSheet';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useCreator } from '../context/CreatorContext';
import { colors, radius, spacing, typography } from '../theme/theme';
import { LIMITS } from '../data/creatorOptions';
import { addBlock, insertBlockAt, moveBlock, removeBlock, setBlockMedia, updateBlock, updateChapter, workCounts } from '../utils/creator';
import { READER_FONT } from '../utils/reading';

const BLOCK_META = {
  text: { label: 'Text', icon: 'text' },
  image: { label: 'Image', icon: 'image-outline' },
  video: { label: 'Video', icon: 'videocam-outline' },
  audio: { label: 'Audio', icon: 'musical-notes-outline' },
};

// One block (text, image or video) of a mixed-media chapter.
function BlockEditor({ block, index, total, onChange, onMove, onDelete, onPickMedia, onInsert, onMedia, onOpenUpload, visibility = 'public' }) {
  const meta = BLOCK_META[block.type] || BLOCK_META.text;
  const [insertOpen, setInsertOpen] = useState(false);
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <View style={styles.blockTitle}>
          <Ionicons name={meta.icon} size={16} color={colors.indigo700} />
          <Text style={styles.blockLabel}>
            {meta.label.toUpperCase()} {index + 1}
          </Text>
        </View>
        <RowActions
          name={`${meta.label.toLowerCase()} block ${index + 1}`}
          canUp={index > 0}
          canDown={index < total - 1}
          onUp={() => onMove(-1)}
          onDown={() => onMove(1)}
          onDelete={onDelete}
        />
      </View>

      {block.type === 'text' ? (
        <TextInput
          value={block.text}
          onChangeText={(text) => onChange({ text })}
          placeholder="Write here. Press return to start a new paragraph."
          placeholderTextColor={colors.indigo300}
          multiline
          scrollEnabled={false}
          accessibilityLabel={`Text block ${index + 1}`}
          style={styles.textInput}
        />
      ) : block.type === 'video' || block.type === 'audio' ? (
        <>
          {block.type === 'video' ? (
            <VideoUploader
              value={block.uri ? block : null}
              onChange={onMedia}
              caption={block.caption}
              onCaption={(caption) => onChange({ caption })}
              label={`block ${index + 1}`}
              visibility={visibility}
            />
          ) : (
            <AudioUploader
              value={block.uri ? block : null}
              onChange={onMedia}
              caption={block.caption}
              onCaption={(caption) => onChange({ caption })}
              label={`block ${index + 1}`}
              visibility={visibility}
            />
          )}
          {block.type === 'video' && onOpenUpload ? (
            <View style={styles.linkRow}>
              <ActionLink icon="expand-outline" label="Open full upload page" onPress={onOpenUpload} accessibilityLabel={`Open full upload page for video block ${index + 1}`} />
            </View>
          ) : null}
        </>
      ) : (
        <>
          {block.uri ? (
            <MediaThumb uri={block.uri} kind={block.type} width={undefined} height={180} style={styles.mediaPreview} />
          ) : (
            <View style={styles.noMedia}>
              <Text style={styles.noMediaText}>No {block.type} chosen yet.</Text>
            </View>
          )}
          <Button
            title={block.uri ? `Replace ${block.type}` : `Choose ${block.type}`}
            icon="images-outline"
            size="sm"
            variant={block.uri ? 'secondary' : 'primary'}
            onPress={onPickMedia}
            style={styles.replace}
          />
          <Field
            value={block.caption}
            onChangeText={(caption) => onChange({ caption })}
            placeholder="Caption (optional)"
            maxLength={LIMITS.caption}
            style={styles.captionField}
            accessibilityLabel={`Caption for ${block.type} block ${index + 1}`}
          />
        </>
      )}

      <View style={styles.insertRow}>
        <ActionLink
          icon={insertOpen ? 'remove-circle-outline' : 'add-circle-outline'}
          label={insertOpen ? 'Close' : 'Insert below'}
          onPress={() => setInsertOpen((o) => !o)}
          accessibilityLabel={`Insert a block below block ${index + 1}`}
        />
      </View>
      {insertOpen ? (
        <View style={styles.insertBar}>
          {['text', 'image', 'video', 'audio'].map((t) => (
            <Button
              key={t}
              title={BLOCK_META[t].label}
              icon="add"
              size="sm"
              variant="secondary"
              onPress={() => {
                setInsertOpen(false);
                onInsert(t);
              }}
              accessibilityLabel={`Insert ${t} below block ${index + 1}`}
              style={styles.addButton}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Edits one chapter. Written stories get a title and a large text area; mixed-media stories get
// an ordered list of text, image and video blocks.
export default function ChapterEditorScreen({ workId, chapterId, navigation }) {
  const { works, hydrated, editWork } = useCreator();
  const work = works.find((w) => w.id === workId) || null;
  const index = work ? work.chapters.findIndex((c) => c.id === chapterId) : -1;
  const chapter = index >= 0 ? work.chapters[index] : null;

  // { mode: 'add' | 'replace', type: 'image', blockId?, at? }  (only images use the library sheet; audio and video use their uploaders)
  const [media, setMedia] = useState(null);
  const [confirmBlock, setConfirmBlock] = useState(null);

  if (!hydrated) {
    return (
      <ScreenContainer>
        <BackHeader title="Chapter" onBack={navigation.goBack} />
        <LoadingState label="Opening chapter…" />
      </ScreenContainer>
    );
  }

  if (!work || !chapter) {
    return (
      <ScreenContainer>
        <BackHeader title="Chapter" onBack={navigation.goBack} />
        <EmptyState
          icon="document-text-outline"
          title="Chapter not found"
          message="This chapter may have been deleted."
          actionLabel="Go back"
          onAction={navigation.goBack}
        />
      </ScreenContainer>
    );
  }

  const mixed = work.mediaType === 'Mixed';
  const blocks = chapter.blocks || [];
  const edit = (fn) => editWork(work.id, fn);
  const words = workCounts({ ...work, chapters: [chapter] }).words;

  const onPicked = (items) => {
    if (!media) return;
    if (media.mode === 'replace') {
      edit((w) => updateBlock(w, chapter.id, media.blockId, { uri: items[0].uri }));
    } else {
      edit((w) =>
        items.reduce(
          (acc, item, k) =>
            Number.isInteger(media.at) ? insertBlockAt(acc, chapter.id, media.at + k, media.type, { uri: item.uri }) : addBlock(acc, chapter.id, media.type, { uri: item.uri }),
          w
        )
      );
    }
  };

  return (
    <ScreenContainer>
      <BackHeader
        title={`Chapter ${index + 1} of ${work.chapters.length}`}
        onBack={navigation.goBack}
        right={
          <IconButton
            name="eye-outline"
            label="Preview this chapter"
            onPress={() => navigation.openReader(work.id, index)}
          />
        }
      />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Field
            label="CHAPTER TITLE"
            value={chapter.title}
            onChangeText={(title) => edit((w) => updateChapter(w, chapter.id, { title }))}
            placeholder={`Chapter ${index + 1}`}
            maxLength={LIMITS.chapterTitle}
          />

          {mixed ? (
            <>
              <Text style={styles.sectionLabel}>CONTENT BLOCKS</Text>
              {blocks.length === 0 ? (
                <EmptyState
                  icon="layers-outline"
                  title="No blocks yet"
                  message="Add text, an image, a video or an audio clip below."
                />
              ) : (
                blocks.map((block, i) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    index={i}
                    total={blocks.length}
                    onChange={(patch) => edit((w) => updateBlock(w, chapter.id, block.id, patch))}
                    onMove={(dir) => edit((w) => moveBlock(w, chapter.id, block.id, dir))}
                    onDelete={() => setConfirmBlock(block.id)}
                    onPickMedia={() => setMedia({ mode: 'replace', type: block.type, blockId: block.id })}
                    onMedia={(file) => edit((w) => setBlockMedia(w, chapter.id, block.id, file))}
                    visibility={visibilityFor(work, 'chapter', index)}
                    onOpenUpload={() => navigation.openVideoUpload(work.id, { chapterId: chapter.id, blockId: block.id })}
                    onInsert={(type) => {
                      if (type === 'image') setMedia({ mode: 'add', type: 'image', at: i + 1 });
                      else edit((w) => insertBlockAt(w, chapter.id, i + 1, type));
                    }}
                  />
                ))
              )}
              <View style={styles.addBar}>
                <Button
                  title="Text"
                  icon="add"
                  variant="secondary"
                  size="sm"
                  onPress={() => edit((w) => addBlock(w, chapter.id, 'text'))}
                  style={styles.addButton}
                />
                <Button
                  title="Image"
                  icon="add"
                  variant="secondary"
                  size="sm"
                  onPress={() => setMedia({ mode: 'add', type: 'image' })}
                  style={styles.addButton}
                />
                <Button
                  title="Video"
                  icon="add"
                  variant="secondary"
                  size="sm"
                  onPress={() => edit((w) => addBlock(w, chapter.id, 'video'))}
                  style={styles.addButton}
                />
                <Button
                  title="Audio"
                  icon="add"
                  variant="secondary"
                  size="sm"
                  onPress={() => edit((w) => addBlock(w, chapter.id, 'audio'))}
                  style={styles.addButton}
                />
              </View>
              <Text style={styles.hint}>Blocks appear to readers in this order: use the arrows or “Insert below” to place audio and video exactly where they belong. Empty blocks are left out when you publish.</Text>
            </>
          ) : (
            <>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>STORY TEXT</Text>
                <Text style={styles.count}>
                  {words} word{words === 1 ? '' : 's'}
                </Text>
              </View>
              <TextInput
                value={chapter.text}
                onChangeText={(text) => edit((w) => updateChapter(w, chapter.id, { text }))}
                placeholder="Start writing…"
                placeholderTextColor={colors.indigo300}
                multiline
                scrollEnabled={false}
                accessibilityLabel="Story text"
                style={styles.writing}
              />
              <Text style={styles.hint}>Press return to start a new paragraph. Your work saves automatically.</Text>
            </>
          )}

          <Button title="Done" icon="checkmark" fullWidth onPress={navigation.goBack} style={styles.done} />
        </ScrollView>
      </KeyboardAvoidingView>

      <MediaSheet
        visible={Boolean(media)}
        kind="image"
        multiple={Boolean(media) && media.mode === 'add'}
        visibility={visibilityFor(work, 'chapter', index)}
        onClose={() => setMedia(null)}
        onPicked={onPicked}
      />
      <ConfirmSheet
        visible={Boolean(confirmBlock)}
        title="Delete this block?"
        message="The block is removed from this chapter."
        confirmLabel="Delete block"
        destructive
        icon="trash-outline"
        onConfirm={() => {
          const id = confirmBlock;
          setConfirmBlock(null);
          if (id) edit((w) => removeBlock(w, chapter.id, id));
        }}
        onCancel={() => setConfirmBlock(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.micro, color: colors.textSecondary, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  count: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
  writing: {
    fontFamily: READER_FONT,
    fontSize: 17,
    lineHeight: 27,
    color: colors.textPrimary,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 360,
    textAlignVertical: 'top',
  },
  hint: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },
  block: {
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  blockTitle: { flexDirection: 'row', alignItems: 'center' },
  blockLabel: { ...typography.micro, color: colors.indigo700, marginLeft: 6 },
  textInput: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    backgroundColor: colors.cream100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  mediaPreview: { width: '100%' },
  linkRow: { marginTop: spacing.sm, alignItems: 'flex-start' },
  insertRow: { marginTop: spacing.md, alignItems: 'flex-start' },
  insertBar: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  noMedia: {
    height: 90,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cream300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMediaText: { ...typography.caption, color: colors.textSecondary },
  replace: { marginTop: spacing.md },
  captionField: { marginTop: spacing.md, marginBottom: 0 },
  addBar: { flexDirection: 'row', marginTop: spacing.xs },
  addButton: { marginRight: spacing.sm },
  done: { marginTop: spacing.xl },
});
