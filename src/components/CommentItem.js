import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthorRow from './AuthorRow';
import ActionLink from './ActionLink';
import { colors, radius, spacing, typography } from '../theme/theme';
import { authorOf } from '../utils/community';
import { formatCount } from '../utils/format';

// One comment or reply. Others' comments can be liked, replied to and reported; yours can be deleted.
// A comment you reported collapses into a one-line note (still yours to show again).
export default function CommentItem({ comment, me, isReply, hidden, onToggleHidden, onOpenAuthor, onLike, onReply, onDelete, onReport }) {
  const author = authorOf(comment.authorId, me);
  const replyingTo = comment.replyTo ? authorOf(comment.replyTo, me) : null;
  if (hidden) {
    return (
      <View style={[styles.wrap, isReply && styles.reply, styles.hiddenRow]}>
        <Text style={styles.hiddenText}>You reported this comment. It is hidden for you.</Text>
        <ActionLink label="Show" onPress={onToggleHidden} accessibilityLabel="Show reported comment" />
      </View>
    );
  }
  return (
    <View style={[styles.wrap, isReply && styles.reply]}>
      <View style={styles.head}>
        <AuthorRow author={author} at={comment.at} small={isReply} onPress={() => onOpenAuthor(author)} />
      </View>
      {replyingTo ? <Text style={styles.replyTo}>Replying to {replyingTo.name}</Text> : null}
      <Text style={styles.text} selectable>
        {comment.text}
      </Text>
      <View style={styles.actions}>
        {author.isMe ? null : (
          <ActionLink
            icon={comment.liked ? 'heart' : 'heart-outline'}
            label={comment.likes ? formatCount(comment.likes) : 'Like'}
            active={comment.liked}
            onPress={onLike}
            accessibilityLabel={`${comment.liked ? 'Unlike' : 'Like'} comment by ${author.name}`}
          />
        )}
        {author.isMe && comment.likes ? <Text style={styles.plain}>{formatCount(comment.likes)} likes</Text> : null}
        <ActionLink icon="chatbubble-outline" label="Reply" onPress={onReply} accessibilityLabel={`Reply to ${author.name}`} />
        {author.isMe ? (
          <ActionLink icon="trash-outline" label="Delete" danger onPress={onDelete} accessibilityLabel="Delete my comment" />
        ) : (
          <ActionLink icon="flag-outline" label="Report" onPress={onReport} accessibilityLabel={`Report comment by ${author.name}`} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  reply: { marginLeft: spacing.xl, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.violetSoft, borderBottomWidth: 0, paddingVertical: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center' },
  replyTo: { ...typography.caption, fontSize: 11, color: colors.violetText, marginTop: 6, fontWeight: '700' },
  text: { ...typography.body, color: colors.textPrimary, marginTop: 6, lineHeight: 21 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  plain: { ...typography.caption, color: colors.textSecondary, marginRight: spacing.lg },
  hiddenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream200, borderRadius: radius.md, paddingHorizontal: spacing.md, marginVertical: 4 },
  hiddenText: { ...typography.caption, flex: 1, color: colors.textSecondary },
});
