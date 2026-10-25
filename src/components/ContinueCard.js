import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import ProgressBar from './ProgressBar';
import CoverImage from './CoverImage';
import { colors, mediaIcons, radius, spacing, typography } from '../theme/theme';

const VERB = { Written: 'Continue reading', Mixed: 'Continue reading', Image: 'Continue viewing', Video: 'Continue watching' };

// "Pick up where you left off": the most recent unfinished story, with a button that jumps
// straight to the saved place in the reader, gallery or video.
export default function ContinueCard({ item, onContinue }) {
  const { story, progress, status } = item;
  const verb = VERB[story.mediaType] || 'Continue';
  return (
    <View style={styles.card}>
      <View style={[styles.cover, { backgroundColor: story.coverColor || colors.indigo700 }]}>
        <Ionicons name={mediaIcons[story.mediaType] || 'book'} size={26} color="rgba(251,246,236,0.9)" />
        <CoverImage uri={story.coverUri} />
      </View>
      <View style={styles.text}>
        <Text style={styles.eyebrow}>PICK UP WHERE YOU LEFT OFF</Text>
        <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
        <Text style={styles.status} numberOfLines={1}>{status}</Text>
        <ProgressBar value={progress ? progress.percent : 0} height={5} color={colors.coral} trackColor={colors.indigo700} style={styles.bar} />
        <Button title={verb} icon="play" variant="accent" size="sm" onPress={() => onContinue(item)} accessibilityLabel={`${verb}: ${story.title}`} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.indigo900,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  cover: { width: 84, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, marginLeft: spacing.lg },
  eyebrow: { ...typography.micro, fontSize: 11, color: colors.coral },
  title: { ...typography.heading, color: colors.textOnDark, marginTop: 4 },
  status: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: 2 },
  bar: { marginTop: spacing.sm },
  button: { marginTop: spacing.md, alignSelf: 'flex-start' },
});
