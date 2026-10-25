import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

// Marks the demo account wherever the signed-in user is shown.
export default function DemoBadge({ style }) {
  return (
    <View style={[styles.pill, style]} accessibilityLabel="Demo account">
      <Ionicons name="flask-outline" size={12} color={colors.indigo900} />
      <Text style={styles.text}>DEMO ACCOUNT</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  text: { ...typography.micro, fontSize: 11, color: colors.indigo900, marginLeft: 5 },
});
