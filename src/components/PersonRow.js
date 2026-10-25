import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CreatorAvatar from './CreatorAvatar';
import FollowButton from './FollowButton';
import { colors, spacing, typography } from '../theme/theme';

// A person in a list (followers, following). Tap the row to open their profile.
export default function PersonRow({ person, onPress }) {
  const role = person.role === 'reader' ? 'Reader' : 'Storyteller';
  return (
    <Pressable
      onPress={() => onPress && onPress(person)}
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, ${role}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <CreatorAvatar creator={person} size={44} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
          {person.id === 'me' ? ' (you)' : ''}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {person.handle} · {role}
        </Text>
      </View>
      <FollowButton person={person} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream200,
  },
  text: { flex: 1, marginHorizontal: spacing.md },
  name: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
