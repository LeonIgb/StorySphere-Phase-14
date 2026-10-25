import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import useMediaUri from '../hooks/useMediaUri';

// Image with a graceful fallback: a colored illustration panel sits underneath, so a slow or
// failed network never leaves a blank space. `panel` = { uri, caption, color, icon }.
export default function GalleryImage({ panel, resizeMode = 'contain', style }) {
  const media = useMediaUri(panel && panel.uri, { width: 1600 });
  const src = media.uri;
  const [state, setState] = useState(panel && panel.uri ? 'loading' : 'failed');
  const failed = state === 'failed' || media.status === 'locked' || media.status === 'error';
  const waiting = media.status === 'loading';

  return (
    <View
      style={[styles.box, { backgroundColor: (panel && panel.color) || colors.indigo700 }, style]}
      accessible
      accessibilityLabel={panel && panel.caption ? panel.caption : 'Story illustration'}
      accessibilityRole="image"
    >
      <Ionicons name={(panel && panel.icon) || 'image'} size={56} color="rgba(251, 246, 236, 0.85)" />
      {waiting ? (
        <View style={styles.spinner}>
          <ActivityIndicator color={colors.cream100} />
        </View>
      ) : failed ? (
        <Text style={styles.note}>{media.status === 'locked' ? 'This image is locked. Unlock the story to see it.' : 'Image unavailable. Showing a placeholder.'}</Text>
      ) : (
        <>
          <Image
            source={{ uri: src }}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            onLoad={() => setState('loaded')}
            onError={() => setState('failed')}
          />
          {state === 'loading' ? (
            <View style={styles.spinner}>
              <ActivityIndicator color={colors.cream100} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  note: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textOnDarkMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  spinner: { position: 'absolute', bottom: spacing.lg },
});
