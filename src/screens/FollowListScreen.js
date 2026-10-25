import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import PersonRow from '../components/PersonRow';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import useAsync from '../hooks/useAsync';
import { useAccount } from '../context/AccountContext';
import { fetchFollowList } from '../services/profileService';
import { colors, spacing, typography } from '../theme/theme';

// Followers or following of a person. kind: 'followers' | 'following'. personId: 'me' or a directory id.
export default function FollowListScreen({ personId, kind, name, navigation }) {
  const { social, me } = useAccount();
  const isMe = personId === 'me';
  // Your own lists change as you follow and unfollow; refetch when they do.
  const sig = isMe ? `${social.following.join(',')}|${social.followers.join(',')}` : social.following.includes(personId) ? 'f' : '';
  const list = useAsync(() => fetchFollowList(personId, kind, { social, me }), [personId, kind, sig]);
  const data = list.data;
  const title = isMe ? (kind === 'followers' ? 'Your followers' : 'You follow') : `${kind === 'followers' ? 'Followers of' : 'Followed by'} ${name}`;

  let body;
  if (list.loading && !data) body = <LoadingState label="Loading…" />;
  else if (list.error && !data) body = <ErrorState message={list.error.message} onRetry={list.reload} />;
  else if (!data || data.people.length === 0) {
    body = (
      <EmptyState
        icon="people-outline"
        title={kind === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
        message={kind === 'followers' ? 'When people follow this profile they will appear here.' : 'Follow storytellers and readers to build your circle.'}
        actionLabel={isMe && kind === 'following' ? 'Discover storytellers' : undefined}
        onAction={isMe && kind === 'following' ? () => navigation.navigate('Discover') : undefined}
      />
    );
  } else {
    body = (
      <>
        <Text style={styles.count}>
          {data.people.length} {kind === 'followers' ? (data.people.length === 1 ? 'follower' : 'followers') : 'following'}
        </Text>
        {data.people.map((p) => (
          <PersonRow key={p.id} person={p} onPress={(person) => navigation.openCreator(person.id)} />
        ))}
        {!isMe ? (
          <Text style={styles.note}>
            Prototype data: StorySphere has no real social graph yet, so this shows a sample of people from the demo directory.
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <ScreenContainer>
      <BackHeader title={title} onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {body}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  count: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  note: { ...typography.caption, color: colors.textSecondary, padding: spacing.xl },
});
