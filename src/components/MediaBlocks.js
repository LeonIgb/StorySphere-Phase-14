import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GalleryImage from './GalleryImage';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';
import { colors, radius, spacing, typography } from '../theme/theme';
import { READER_FONT } from '../utils/reading';

// A video block in a mixed-media chapter: a poster first, so scrolling stays light and nothing
// loads until the reader taps play.
function VideoBlock({ block, themeColors }) {
  const [playing, setPlaying] = useState(false);
  return (
    <View style={styles.media}>
      {playing ? (
        <VideoPlayer uri={block.uri} color={colors.indigo800} icon="videocam" />
      ) : (
        <Pressable
          onPress={() => setPlaying(true)}
          accessibilityRole="button"
          accessibilityLabel={block.caption ? `Play video: ${block.caption}` : 'Play video'}
          style={({ pressed }) => [styles.poster, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="play-circle" size={56} color="rgba(251, 246, 236, 0.95)" />
          <Text style={styles.posterText}>Tap to play</Text>
        </Pressable>
      )}
      {block.caption ? <Text style={[styles.caption, { color: themeColors.muted }]}>{block.caption}</Text> : null}
    </View>
  );
}

// An audio block: the player sits in the narrative exactly where the creator placed it.
function AudioBlock({ block, themeColors }) {
  return (
    <View style={styles.media}>
      <AudioPlayer uri={block.uri} title={block.caption || block.name || 'Audio'} durationMs={block.durationMs} />
      {block.caption ? <Text style={[styles.caption, { color: themeColors.muted }]}>{block.caption}</Text> : null}
    </View>
  );
}

function ImageBlock({ block, themeColors }) {
  return (
    <View style={styles.media}>
      <GalleryImage
        panel={{ uri: block.uri, caption: block.caption, color: colors.indigo700, icon: 'image' }}
        resizeMode="cover"
        style={styles.image}
      />
      {block.caption ? <Text style={[styles.caption, { color: themeColors.muted }]}>{block.caption}</Text> : null}
    </View>
  );
}

// The body of a mixed-media chapter: text, image, video and audio blocks in the order the creator set.
// Memoized like the plain text body, so scrolling never re-lays-out the chapter.
const MediaBlocks = React.memo(function MediaBlocks({ blocks, fontSize, themeColors }) {
  const lineHeight = Math.round(fontSize * 1.65);
  const gap = Math.round(fontSize * 0.95);
  return (
    <>
      {blocks.map((block) => {
        if (block.type === 'text') {
          return block.paragraphs.map((text, i) => (
            <Text
              key={`${block.id}-${i}`}
              style={{ fontFamily: READER_FONT, fontSize, lineHeight, color: themeColors.text, marginBottom: gap }}
            >
              {text}
            </Text>
          ));
        }
        if (block.type === 'image') return <ImageBlock key={block.id} block={block} themeColors={themeColors} />;
        if (block.type === 'video') return <VideoBlock key={block.id} block={block} themeColors={themeColors} />;
        if (block.type === 'audio') return <AudioBlock key={block.id} block={block} themeColors={themeColors} />;
        return null;
      })}
    </>
  );
});

export default MediaBlocks;

const styles = StyleSheet.create({
  media: { marginBottom: spacing.xl },
  image: { height: 260, borderRadius: radius.lg },
  poster: {
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.indigo800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterText: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: spacing.sm },
  caption: { ...typography.caption, fontStyle: 'italic', marginTop: spacing.sm, lineHeight: 18 },
});
