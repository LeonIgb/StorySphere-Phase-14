import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import SegmentedControl from '../components/SegmentedControl';
import Field from '../components/Field';
import Button from '../components/Button';
import StarRating from '../components/StarRating';
import RatingSummary from '../components/RatingSummary';
import ReviewCard from '../components/ReviewCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ConfirmSheet from '../components/ConfirmSheet';
import ReportSheet from '../components/ReportSheet';
import useAsync from '../hooks/useAsync';
import { useCommunity } from '../context/CommunityContext';
import { fetchStory } from '../services/storyService';
import { LIMITS, authorOf } from '../utils/community';
import { colors, radius, spacing, typography } from '../theme/theme';

const SORTS = { Helpful: 'helpful', Newest: 'newest', Highest: 'highest', Lowest: 'lowest' };

// Ratings summary, your own review (write, edit, delete) and everyone else's.
export default function ReviewsScreen({ storyId, navigation }) {
  const c = useCommunity();
  const detail = useAsync(() => fetchStory(storyId), [storyId]);
  const story = detail.data ? detail.data.story : null;
  const [sort, setSort] = useState('Helpful');
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(null); // null until touched: falls back to your saved rating
  const [text, setText] = useState(null);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (detail.loading && !detail.data) {
    return (
      <ScreenContainer>
        <BackHeader title="Reviews" onBack={navigation.goBack} />
        <LoadingState label="Loading reviews…" />
      </ScreenContainer>
    );
  }
  if ((detail.error && !detail.data) || !story) {
    return (
      <ScreenContainer>
        <BackHeader title="Reviews" onBack={navigation.goBack} />
        {detail.error ? <ErrorState message={detail.error.message} onRetry={detail.reload} /> : <EmptyState icon="star-outline" title="Story not found" message="This story may have been removed." actionLabel="Go back" onAction={navigation.goBack} />}
      </ScreenContainer>
    );
  }

  const own = story.creatorId === 'me';
  const summary = c.ratingSummaryFor(story);
  const mine = c.myReview(story);
  const myRating = c.myRating(story);
  const showComposer = !own && (!mine || editing);
  const draftRating = rating === null ? myRating : rating;
  const draftText = text === null ? (mine ? mine.text : '') : text;
  const reviews = c.reviewsFor(story, SORTS[sort]);

  const save = () => {
    const result = c.saveReview(story, { rating: draftRating, text: draftText });
    if (!result.ok) {
      setErrors(result.errors || {});
      return;
    }
    setErrors({});
    setEditing(false);
    setRating(null);
    setText(null);
    setSaved(true);
  };

  return (
    <ScreenContainer>
      <BackHeader title="Reviews" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.storyTitle} numberOfLines={2}>{story.title}</Text>
        <View style={styles.card}>
          <RatingSummary summary={summary} />
        </View>

        {own ? (
          <View style={styles.card}>
            <Text style={styles.hint}>You can’t rate or review your own story. Readers’ reviews will appear below.</Text>
          </View>
        ) : showComposer ? (
          <View style={styles.card}>
            <Text style={styles.label}>{mine ? 'EDIT YOUR REVIEW' : 'WRITE A REVIEW'}</Text>
            <StarRating value={draftRating} size={32} onChange={(v) => { setRating(v); setErrors((e) => ({ ...e, rating: undefined })); setSaved(false); }} />
            {errors.rating ? <Text style={styles.error} accessibilityRole="alert">{errors.rating}</Text> : null}
            <Field
              label="YOUR REVIEW"
              value={draftText}
              onChangeText={(v) => { setText(v); setErrors((e) => ({ ...e, text: undefined })); setSaved(false); }}
              placeholder="What did you think? Keep it kind and spoiler-free."
              multiline
              maxLength={LIMITS.reviewMax}
              minHeight={110}
              error={errors.text}
              style={{ marginTop: spacing.md }}
            />
            <Button title={mine ? 'Save changes' : 'Post review'} icon="checkmark" onPress={save} fullWidth />
            {mine ? <Button title="Cancel" variant="ghost" fullWidth onPress={() => { setEditing(false); setRating(null); setText(null); setErrors({}); }} style={{ marginTop: spacing.sm }} /> : null}
          </View>
        ) : saved ? (
          <Text style={styles.saved} accessibilityRole="alert">Your review is posted.</Text>
        ) : null}

        <View style={styles.sortRow}>
          <SegmentedControl options={Object.keys(SORTS)} value={sort} onChange={setSort} />
        </View>

        <View style={styles.list}>
          {reviews.length === 0 ? (
            <EmptyState icon="star-outline" title="No reviews yet" message={own ? 'Reviews from readers will appear here.' : 'Be the first to review this story.'} />
          ) : (
            reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                me={c.me}
                hidden={c.isHidden(r.id)}
                onToggleHidden={() => c.toggleHidden(r.id)}
                onOpenAuthor={(a) => navigation.openCreator(a.id)}
                onHelpful={() => c.toggleHelpful(r.id)}
                onEdit={() => { setEditing(true); setSaved(false); }}
                onDelete={() => setConfirmDelete(true)}
                onReport={() => setReportTarget({ type: 'review', id: r.id, label: `Review by ${authorOf(r.authorId, c.me).name}`, ownerId: r.authorId })}
              />
            ))
          )}
        </View>
        <Text style={styles.footnote}>Reviews are saved on this device only. Reporting is a prototype and does not reach a moderator.</Text>
      </ScrollView>

      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
      <ConfirmSheet
        visible={confirmDelete}
        title="Delete your review?"
        message="Your star rating stays. You can clear it separately on the story page."
        confirmLabel="Delete"
        destructive
        icon="trash-outline"
        onConfirm={() => { c.deleteReview(story); setConfirmDelete(false); setEditing(false); setRating(null); setText(null); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  storyTitle: { ...typography.heading, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  label: { ...typography.micro, color: colors.textSecondary, marginBottom: spacing.sm },
  hint: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.dangerText, marginTop: 6 },
  saved: { ...typography.body, fontWeight: '700', color: colors.successText, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  sortRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.xl },
  footnote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.md },
});
