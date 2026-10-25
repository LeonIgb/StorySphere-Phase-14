import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AuthorRow from './AuthorRow';
import ActionLink from './ActionLink';
import StarRating from './StarRating';
import { colors, radius, spacing, typography } from '../theme/theme';
import { authorOf } from '../utils/community';

// A written review: stars, text, "Helpful" for others' reviews, Edit/Delete for yours, Report otherwise.
export default function ReviewCard({ review, me, hidden, onToggleHidden, onOpenAuthor, onHelpful, onEdit, onDelete, onReport, compact = false, style }) {
  const author = authorOf(review.authorId, me);
  if (hidden) {
    return (
      <View style={[styles.card, styles.hiddenRow, style]}>
        <Text style={styles.hiddenText}>You reported this review. It is hidden for you.</Text>
        <ActionLink label="Show" onPress={onToggleHidden} accessibilityLabel="Show reported review" />
      </View>
    );
  }
  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <AuthorRow author={author} at={review.at} edited={Boolean(review.editedAt)} onPress={() => onOpenAuthor(author)} />
        {review.rating ? <StarRating value={review.rating} size={13} /> : null}
      </View>
      <Text style={styles.text} numberOfLines={compact ? 4 : undefined} selectable>
        {review.text}
      </Text>
      {compact ? null : (
        <View style={styles.actions}>
          {review.isMine ? (
            <>
              <ActionLink icon="create-outline" label="Edit" onPress={onEdit} accessibilityLabel="Edit my review" />
              <ActionLink icon="trash-outline" label="Delete" danger onPress={onDelete} accessibilityLabel="Delete my review" />
            </>
          ) : (
            <>
              <ActionLink
                icon={review.markedHelpful ? 'thumbs-up' : 'thumbs-up-outline'}
                label={`Helpful (${review.helpful})`}
                active={review.markedHelpful}
                onPress={onHelpful}
                accessibilityLabel={`${review.markedHelpful ? 'Remove helpful mark from' : 'Mark helpful:'} review by ${author.name}`}
              />
              <ActionLink icon="flag-outline" label="Report" onPress={onReport} accessibilityLabel={`Report review by ${author.name}`} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg, marginBottom: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { ...typography.body, color: colors.textPrimary, marginTop: spacing.sm, lineHeight: 21 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  hiddenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cream200, borderColor: colors.cream200 },
  hiddenText: { ...typography.caption, flex: 1, color: colors.textSecondary },
});
