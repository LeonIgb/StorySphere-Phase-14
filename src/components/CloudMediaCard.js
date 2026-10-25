import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { mediaProvider } from '../services/mediaService';
import { MEDIA_LIMITS, formatBytes, formatList } from '../utils/mediaFiles';
import { mediaConfig } from '../config/mediaConfig';
import { colors, radius, spacing, typography } from '../theme/theme';

// What media storage the app is REALLY using. "Cloud storage" appears only after the media table was
// read successfully with this person's own session; otherwise the card says why files stay local.
export default function CloudMediaCard({ onOpenLibrary }) {
  const [mode, setMode] = useState(null);
  const [checking, setChecking] = useState(false);
  const check = useCallback(async (force) => {
    setChecking(true);
    const m = await mediaProvider.getMediaMode({ force });
    setMode(m);
    setChecking(false);
  }, []);
  useEffect(() => {
    check(false);
  }, [check]);

  const cloud = mode && mode.mode === 'cloud';
  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.top}>
        <Ionicons name={cloud ? 'cloud-done-outline' : 'phone-portrait-outline'} size={24} color={cloud ? colors.successText : colors.indigo700} />
        <View style={styles.text}>
          <Text style={styles.title}>{!mode ? 'Checking media storage…' : cloud ? 'Cloud media storage is on' : 'Media stays on this device'}</Text>
          <Text style={styles.detail}>
            {!mode
              ? 'One moment.'
              : cloud
                ? 'Images, videos and audio you upload are saved online and work on every device. Premium media is private and only opens for people with access.'
                : mode.reason}
          </Text>
        </View>
      </View>
      <Text style={styles.limits}>
        Images: {formatList('image')} up to {formatBytes(MEDIA_LIMITS.imageMaxBytes)} (shrunk on your device first; HEIC photos are converted to JPEG).{'\n'}
        Video: {formatList('video')} up to {formatBytes(MEDIA_LIMITS.videoMaxBytes)}, {MEDIA_LIMITS.videoMaxMinutes} min.{'\n'}
        Audio: {formatList('audio')} up to {formatBytes(MEDIA_LIMITS.audioMaxBytes)}, {MEDIA_LIMITS.audioMaxMinutes} min.{'\n'}
        {mediaConfig.videoProcessing === 'external' ? 'Videos are processed by an external service after upload.' : 'Videos play exactly as uploaded: they are not converted to streaming formats.'}
      </Text>
      <View style={styles.actions}>
        <Button title="Check again" size="sm" variant="secondary" loading={checking} onPress={() => check(true)} />
        {cloud && onOpenLibrary ? <Button title="Media library" icon="albums-outline" size="sm" variant="secondary" onPress={onOpenLibrary} style={{ marginLeft: spacing.sm }} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, marginHorizontal: spacing.xl, marginTop: spacing.md, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.heading, color: colors.textPrimary },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  limits: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 18 },
  actions: { flexDirection: 'row', marginTop: spacing.md },
});
