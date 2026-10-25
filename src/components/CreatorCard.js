import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CreatorAvatar from './CreatorAvatar';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatCount } from '../utils/format';
import { useAccount } from '../context/AccountContext';

// Storyteller card for horizontal lists. `reason` is an optional "why we show you this" line.
export default function CreatorCard({ creator, reason, onPress }) {
  const { followerCountFor } = useAccount();
  if (!creator) return null;
  const stories = creator.storyCount || 0;
  return (
    <Pressable
      onPress={() => onPress && onPress(creator)}
      accessibilityRole="button"
      accessibilityLabel={`${creator.name}, ${creator.specialty} storyteller`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <CreatorAvatar creator={creator} size={60} />
      <Text style={styles.name} numberOfLines={1}>
        {creator.name}
      </Text>
      <Text style={styles.specialty}>{String(creator.specialty).toUpperCase()}</Text>
      <Text style={styles.stats} numberOfLines={1}>
        {formatCount(followerCountFor(creator))} followers
      </Text>
      <Text style={styles.stats} numberOfLines={1}>
        {stories} {stories === 1 ? 'story' : 'stories'}
      </Text>
      <View style={styles.reasonWrap}>
        {reason ? (
          <Text style={styles.reason} numberOfLines={2}>
            {reason}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 164,
    alignItems: 'center',
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cream300,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  name: { ...typography.heading, fontSize: 15, color: colors.textPrimary, marginTop: spacing.md },
  specialty: { ...typography.micro, fontSize: 11, color: colors.violetText, marginTop: 2 },
  stats: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reasonWrap: { minHeight: 34, justifyContent: 'center', marginTop: spacing.sm },
  reason: { ...typography.caption, fontSize: 12, color: colors.coralText, textAlign: 'center' },
});
