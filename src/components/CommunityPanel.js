import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import ReactionBar from './ReactionBar';
import RatingSummary from './RatingSummary';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import ActionLink from './ActionLink';
import SectionHeader from './SectionHeader';
import { useCommunity } from '../context/CommunityContext';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatCount } from '../utils/format';

// The Community block on a story page: reactions, ratings, top reviews, discussion and shares.
// Everything here reads and writes CommunityContext, so it always agrees with the cards and
// the reviews and comments pages.
export default function CommunityPanel({ story, navigation, onReportStory }) {
  const c = useCommunity();
  const own = story.creatorId === 'me';
  const stats = c.reactionStatsFor(story);
  const summary = c.ratingSummaryFor(story);
  const mine = c.myRating(story);
  const myReview = c.myReview(story);
  const reviews = c.reviewsFor(story, 'helpful');
  const preview = reviews.filter((r) => !c.isHidden(r.id)).slice(0, 2);
  const comments = c.commentCountFor(story, 'all');
  const reported = c.isReported('story', story.id);

  return (
    <View>
      <SectionHeader title="Community" />
      <View style={styles.card}>
        <Text style={styles.label}>REACTIONS · {formatCount(stats.total)}</Text>
        <ReactionBar stats={stats} onReact={(key) => c.react(story, key)} />
        <Text style={styles.hint}>Reactions are public. Favorite (above) is private and only saves the story to your library.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>RATINGS</Text>
        <RatingSummary summary={summary} />
        <View style={styles.divider} />
        {own ? (
          <Text style={styles.hint}>You can’t rate or review your own story.</Text>
        ) : (
          <>
            <View style={styles.myRow}>
              <Text style={styles.myLabel}>{mine ? `Your rating: ${mine}/5` : 'Rate this story'}</Text>
              {mine ? <ActionLink label="Clear" onPress={() => c.rate(story, 0)} accessibilityLabel="Clear my rating" /> : null}
            </View>
            <StarRating value={mine} size={30} onChange={(v) => c.rate(story, v)} />
          </>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>REVIEWS · {reviews.length}</Text>
          {reviews.length > 0 ? <ActionLink label="See all" onPress={() => navigation.openReviews(story.id)} accessibilityLabel="See all reviews" /> : null}
        </View>
        {preview.length === 0 ? (
          <Text style={styles.hint}>No reviews yet. Share what you thought.</Text>
        ) : (
          preview.map((r) => <ReviewCard key={r.id} review={r} me={c.me} compact onOpenAuthor={(a) => navigation.openCreator(a.id)} />)
        )}
        {own ? null : (
          <Button
            title={myReview ? 'Edit your review' : 'Write a review'}
            icon="create-outline"
            variant="secondary"
            fullWidth
            onPress={() => navigation.openReviews(story.id)}
          />
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>DISCUSSION · {comments}</Text>
        </View>
        <Text style={styles.hint}>
          {comments === 0 ? 'No comments yet. Start the conversation.' : 'Comments on the whole story, and a separate thread for each chapter.'}
        </Text>
        <Button title={`Open discussion (${comments})`} icon="chatbubbles-outline" variant="primary" fullWidth onPress={() => navigation.openComments(story.id)} style={{ marginTop: spacing.sm }} />
      </View>

      <View style={styles.footer}>
        <View style={styles.shares}>
          <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.sharesText}>Shared {formatCount(c.shareCountFor(story))} times</Text>
        </View>
        {own ? null : reported ? (
          <Text style={styles.reported}>You reported this story</Text>
        ) : (
          <ActionLink icon="flag-outline" label="Report story" danger onPress={onReportStory} accessibilityLabel="Report story" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  label: { ...typography.micro, color: colors.textSecondary, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.cream200, marginVertical: spacing.md },
  myRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  myLabel: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.xl, marginBottom: spacing.lg },
  shares: { flexDirection: 'row', alignItems: 'center' },
  sharesText: { ...typography.caption, color: colors.textSecondary, marginLeft: 6 },
  reported: { ...typography.caption, color: colors.textSecondary },
});
