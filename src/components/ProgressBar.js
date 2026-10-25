import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme/theme';
import { clamp01 } from '../utils/reading';

// Thin progress bar. `value` is 0..1.
export default function ProgressBar({
  value = 0,
  height = 6,
  color = colors.coral,
  trackColor = colors.cream300,
  style,
}) {
  const pct = Math.round(clamp01(value) * 100);
  return (
    <View
      style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.pill },
  fill: { height: '100%' },
});
