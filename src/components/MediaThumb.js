import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme/theme';
import useMediaUri from '../hooks/useMediaUri';

// Small preview of a picked image, video or cover. Always renders something: a colour block with
// an icon sits underneath, so a missing file or a bad link never leaves a hole.
export default function MediaThumb({ uri, kind = 'image', width = 64, height = 64, color, icon, style }) {
  const [failed, setFailed] = useState(false);
  const media = useMediaUri(uri, { width: Math.max(200, width * 2) });
  useEffect(() => setFailed(false), [uri, media.uri]);

  const isVideo = kind === 'video';
  const bg = color || (isVideo ? colors.indigo800 : colors.indigo700);
  const iconName = icon || (isVideo ? 'play-circle' : 'image');

  return (
    <View style={[styles.box, { width, height, backgroundColor: bg }, style]}>
      <Ionicons name={iconName} size={Math.max(18, Math.min(width, height) * 0.4)} color="rgba(251, 246, 236, 0.9)" />
      {!isVideo && uri && media.status === 'ready' && !failed ? (
        <Image
          source={{ uri: media.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.md },
});
