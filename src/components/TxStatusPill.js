import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, typography } from '../theme/theme';
import { STATUS_LABEL } from '../utils/pricing';

const TONES = {
  completed: { bg: '#E3F4EC', fg: '#1F6B4B' },
  pending: { bg: colors.violetSoft, fg: colors.violetText },
  failed: { bg: colors.coralSoft, fg: colors.coralText },
  refunded: { bg: colors.cream200, fg: colors.textSecondary },
};

// Transaction status pill (Pending / Completed / Failed / Refunded).
export default function TxStatusPill({ status, style }) {
  const tone = TONES[status] || TONES.pending;
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }, style]} accessibilityLabel={`Status ${STATUS_LABEL[status] || status}`}>
      <Text style={[styles.text, { color: tone.fg }]}>{(STATUS_LABEL[status] || String(status)).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  text: { ...typography.micro, fontSize: 11 },
});
