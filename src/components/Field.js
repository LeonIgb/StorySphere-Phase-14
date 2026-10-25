import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

// Labelled text input used across the studio. Shows a live character count when `maxLength` is set.
export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  hint,
  error,
  minHeight,
  style,
  inputStyle,
  ...rest
}) {
  return (
    <View style={[styles.wrap, style]}>
      {label || maxLength ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {maxLength ? (
            <Text style={styles.count}>
              {(value || '').length}/{maxLength}
            </Text>
          ) : null}
        </View>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.indigo300}
        multiline={multiline}
        maxLength={maxLength}
        accessibilityLabel={label}
        style={[
          styles.input,
          multiline && styles.multiline,
          multiline && minHeight ? { minHeight } : null,
          error ? styles.inputError : null,
          inputStyle,
        ]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  label: { ...typography.micro, color: colors.textSecondary },
  count: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
  input: {
    ...typography.body,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  hint: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 6 },
  error: { ...typography.caption, fontSize: 12, color: colors.dangerText, marginTop: 6 },
});
