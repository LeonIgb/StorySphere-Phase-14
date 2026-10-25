import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

// A cover photo laid over a cover's colour + icon. If the image is missing or fails to load it
// renders nothing, so the colour and icon underneath still show. Put it BEFORE any badges.
export default function CoverImage({ uri }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (!uri || failed) return null;
  return (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}
