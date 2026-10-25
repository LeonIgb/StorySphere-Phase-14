import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

// Shown wherever a purchase is made or listed, so a simulated transaction is never mistaken for a real one.
export default function DemoPurchaseBanner({ compact = false, style }) {
  return (
    <View style={[styles.box, style]} accessibilityRole="alert">
      <Ionicons name="flask-outline" size={20} color={colors.indigo900} />
      <View style={styles.body}>
        <Text style={styles.title}>DEMO PURCHASE · NOT A REAL PAYMENT</Text>
        {compact ? null : (
          <Text style={styles.text}>
            No real money moves and no card or payment details are asked for. This simulates the flow a real store would run on a server.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coral, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  body: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.micro, fontSize: 11, color: colors.indigo950 },
  text: { ...typography.caption, color: colors.indigo950, marginTop: 2, lineHeight: 17 },
});
