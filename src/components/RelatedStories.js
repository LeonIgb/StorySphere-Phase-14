import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import SectionHeader from './SectionHeader';
import StoryCard from './StoryCard';
import { spacing, hscroll } from '../theme/theme';

// Horizontal row of story tiles with a section header. Renders nothing when empty.
export default function RelatedStories({ title, stories, onOpen, actionLabel, onAction }) {
  if (!stories || stories.length === 0) return null;
  return (
    <>
      <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={hscroll} contentContainerStyle={styles.row}>
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} variant="tile" onPress={() => onOpen(story)} />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.xl },
});
