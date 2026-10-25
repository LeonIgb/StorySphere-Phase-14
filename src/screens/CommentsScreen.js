import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import FilterTabs from '../components/FilterTabs';
import SegmentedControl from '../components/SegmentedControl';
import Field from '../components/Field';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ConfirmSheet from '../components/ConfirmSheet';
import ReportSheet from '../components/ReportSheet';
import CommentItem from '../components/CommentItem';
import ActionLink from '../components/ActionLink';
import useAsync from '../hooks/useAsync';
import { useCommunity } from '../context/CommunityContext';
import { fetchStory } from '../services/storyService';
import { LIMITS, authorOf } from '../utils/community';
import { colors, radius, spacing, typography } from '../theme/theme';

// Story discussion and one thread per chapter. Replies are one level deep. Opens on a chapter's
// thread when launched from the reader.
export default function CommentsScreen({ storyId, chapter, navigation }) {
  const c = useCommunity();
  const detail = useAsync(() => fetchStory(storyId), [storyId]);
  const story = detail.data ? detail.data.story : null;
  const chapters = detail.data ? detail.data.content.chapters : [];
  const [scope, setScope] = useState(Number.isInteger(chapter) ? `c${chapter}` : 'all');
  const [sort, setSort] = useState('Top');
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [error, setError] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (detail.loading && !detail.data) {
    return (
      <ScreenContainer>
        <BackHeader title="Discussion" onBack={navigation.goBack} />
        <LoadingState label="Loading discussion…" />
      </ScreenContainer>
    );
  }
  if ((detail.error && !detail.data) || !story) {
    return (
      <ScreenContainer>
        <BackHeader title="Discussion" onBack={navigation.goBack} />
        {detail.error ? <ErrorState message={detail.error.message} onRetry={detail.reload} /> : <EmptyState icon="chatbubbles-outline" title="Story not found" message="This story may have been removed." actionLabel="Go back" onAction={navigation.goBack} />}
      </ScreenContainer>
    );
  }

  const chapterCount = Math.max(story.chapterCount || 0, chapters.length);
  const scopeValue = scope === 'all' ? 'all' : scope === 'story' ? null : Number(scope.slice(1));
  const postChapter = scope === 'all' || scope === 'story' ? null : scopeValue;
  const tabs = [
    { key: 'all', label: 'All', count: c.commentCountFor(story, 'all') },
    { key: 'story', label: 'Story', count: c.commentCountFor(story, null) },
    ...Array.from({ length: chapterCount }, (_, i) => ({ key: `c${i}`, label: `Ch. ${i + 1}`, count: c.commentCountFor(story, i) })),
  ];
  const threads = c.threadsFor(story, scopeValue, sort === 'Top' ? 'top' : 'newest');
  const target = replyTo ? null : postChapter === null ? 'the story discussion' : `the chapter ${postChapter + 1} discussion`;

  const post = () => {
    const result = c.postComment({ story, chapter: postChapter, parentId: replyTo ? replyTo.id : null, text });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError('');
    setText('');
    setReplyTo(null);
  };

  const openAuthor = (a) => navigation.openCreator(a.id);
  const chapterName = (n) => (chapters[n] && chapters[n].title ? `Ch. ${n + 1} · ${chapters[n].title}` : `Chapter ${n + 1}`);

  const renderComment = (comment, isReply) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      me={c.me}
      isReply={isReply}
      hidden={c.isHidden(comment.id)}
      onToggleHidden={() => c.toggleHidden(comment.id)}
      onOpenAuthor={openAuthor}
      onLike={() => c.toggleCommentLike(comment.id)}
      onReply={() => {
        setReplyTo(comment);
        setError('');
      }}
      onDelete={() => setConfirmDelete(comment)}
      onReport={() => setReportTarget({ type: 'comment', id: comment.id, label: `Comment by ${authorOf(comment.authorId, c.me).name}: “${comment.text.slice(0, 60)}”`, ownerId: comment.authorId })}
    />
  );

  return (
    <ScreenContainer>
      <BackHeader title="Discussion" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.storyTitle} numberOfLines={2}>{story.title}</Text>
        <FilterTabs tabs={tabs} value={scope} onChange={(k) => { setScope(k); setReplyTo(null); setError(''); }} />

        <View style={styles.composer}>
          {replyTo ? (
            <View style={styles.replying}>
              <Text style={styles.replyingText} numberOfLines={1}>Replying to {authorOf(replyTo.authorId, c.me).name}</Text>
              <ActionLink icon="close" label="Cancel" onPress={() => setReplyTo(null)} accessibilityLabel="Cancel reply" />
            </View>
          ) : (
            <Text style={styles.postingTo}>Posting to {target}</Text>
          )}
          <Field
            label={replyTo ? 'YOUR REPLY' : 'YOUR COMMENT'}
            value={text}
            onChangeText={(v) => {
              setText(v);
              if (error) setError('');
            }}
            placeholder="Be kind. Avoid spoilers for unread chapters."
            multiline
            maxLength={LIMITS.commentMax}
            minHeight={80}
            error={error}
            style={{ marginBottom: spacing.sm }}
          />
          <Button title={replyTo ? 'Post reply' : 'Post comment'} icon="send" disabled={!text.trim()} onPress={post} fullWidth />
        </View>

        <View style={styles.sortRow}>
          <SegmentedControl options={['Top', 'Newest']} value={sort} onChange={setSort} />
        </View>

        {threads.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No comments here yet"
            message={scopeValue === 'all' || scopeValue === null ? 'Be the first to start the conversation.' : 'Nobody has discussed this chapter yet. Start the thread.'}
          />
        ) : (
          <View style={styles.list}>
            {threads.map(({ comment, replies }) => (
              <View key={comment.id}>
                {scope === 'all' && comment.chapter !== null ? (
                  <View style={styles.chapterPill}>
                    <Ionicons name="bookmark-outline" size={12} color={colors.violet} />
                    <Text style={styles.chapterPillText}>{chapterName(comment.chapter)}</Text>
                  </View>
                ) : null}
                {renderComment(comment, false)}
                {replies.map((r) => renderComment(r, true))}
              </View>
            ))}
          </View>
        )}
        <Text style={styles.footnote}>Comments are saved on this device only. Reporting is a prototype and does not reach a moderator.</Text>
      </ScrollView>

      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
      <ConfirmSheet
        visible={Boolean(confirmDelete)}
        title="Delete your comment?"
        message="Replies to it are deleted too."
        confirmLabel="Delete"
        destructive
        icon="trash-outline"
        onConfirm={() => {
          c.deleteComment(confirmDelete.id);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  storyTitle: { ...typography.heading, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  composer: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg, margin: spacing.xl },
  postingTo: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  replying: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.violetSoft, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  replyingText: { ...typography.caption, fontWeight: '700', color: colors.indigo700, flex: 1 },
  sortRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.xl },
  chapterPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.violetSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, marginTop: spacing.sm },
  chapterPillText: { ...typography.caption, fontSize: 11, fontWeight: '700', color: colors.violetText, marginLeft: 4 },
  footnote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
});
