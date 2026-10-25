import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, readerThemes, spacing, typography } from '../theme/theme';

// Font size and theme controls for the reader. Styled with the active reader theme.
export default function ReaderSettings({
  theme,
  onTheme,
  fontSize,
  onIncrease,
  onDecrease,
  canIncrease,
  canDecrease,
}) {
  const t = readerThemes[theme] || readerThemes.cream;

  const StepButton = ({ label, onPress, disabled, small }) => (
    <Pressable
      hitSlop={6}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.step,
        { backgroundColor: t.bg, borderColor: t.border },
        disabled && { opacity: 0.35 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.stepText, { color: t.text, fontSize: small ? 14 : 22 }]}>{small ? 'A' : 'A'}</Text>
      <Ionicons name={small ? 'remove' : 'add'} size={12} color={t.muted} style={styles.stepIcon} />
    </Pressable>
  );

  return (
    <View style={[styles.panel, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: t.muted }]}>TEXT SIZE</Text>
        <View style={styles.stepRow}>
          <StepButton label="Decrease text size" onPress={onDecrease} disabled={!canDecrease} small />
          <Text style={[styles.value, { color: t.text }]} accessibilityLabel={`Text size ${fontSize}`}>
            {fontSize}
          </Text>
          <StepButton label="Increase text size" onPress={onIncrease} disabled={!canIncrease} />
        </View>
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: t.muted }]}>THEME</Text>
        <View style={styles.stepRow}>
          {Object.keys(readerThemes).map((key) => {
            const option = readerThemes[key];
            const selected = key === theme;
            return (
              <Pressable
                key={key}
                onPress={() => onTheme(key)}
                accessibilityRole="button"
                accessibilityLabel={`${key === 'night' ? 'Night' : 'Cream'} theme`}
                accessibilityState={{ selected }}
                style={[
                  styles.themeChip,
                  { backgroundColor: option.bg, borderColor: selected ? t.accent : option.border },
                  selected && styles.themeSelected,
                ]}
              >
                <Text style={[styles.themeText, { color: option.text }]}>{key === 'night' ? 'Night' : 'Cream'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  label: { ...typography.micro, fontSize: 11 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    minWidth: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  stepText: { fontWeight: '700' },
  stepIcon: { marginLeft: 1 },
  value: { ...typography.heading, minWidth: 40, textAlign: 'center' },
  themeChip: {
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  themeSelected: { borderWidth: 2 },
  themeText: { ...typography.caption, fontWeight: '700' },
});
