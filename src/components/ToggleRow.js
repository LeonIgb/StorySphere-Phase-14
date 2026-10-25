import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';

// A settings row with a switch. `last` removes the bottom border.
export default function ToggleRow({ icon, label, hint, value, onValueChange, last = false, disabled = false }) {
  return (
    <View style={[styles.row, !last && styles.border]}>
      <Ionicons name={icon} size={22} color={colors.indigo500} />
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.cream300, true: colors.coral }}
        thumbColor={colors.white}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  border: { borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  text: { flex: 1, marginHorizontal: spacing.md },
  label: { ...typography.body, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
