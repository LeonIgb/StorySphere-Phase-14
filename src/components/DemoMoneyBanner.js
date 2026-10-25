import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

// Shown on every money screen. Amounts in the prototype are never real and no payout exists.
export default function DemoMoneyBanner({ style }) {
  return (
    <View style={[styles.box, style]} accessibilityRole="alert">
      <Ionicons name="flask-outline" size={18} color={colors.coralDark} />
      <Text style={styles.text}>
        Demonstration data. Amounts are illustrative and are not real money. No payout is available, and this prototype never sends one.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: spacing.md },
  text: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, lineHeight: 17 },
});
