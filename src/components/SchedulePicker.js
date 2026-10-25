import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Chip from './Chip';
import { colors, radius, spacing, typography } from '../theme/theme';
import {
  describeCountdown,
  formatDate,
  formatTime,
  hour12,
  meridiem,
  monthName,
  quickOptions,
  stepDate,
  validateSchedule,
} from '../utils/schedule';

function Stepper({ label, value, onMinus, onPlus, wide }) {
  return (
    <View style={[styles.stepper, wide && styles.stepperWide]}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepRow}>
        <Pressable
          onPress={onMinus}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Previous ${label.toLowerCase()}`}
          style={({ pressed }) => [styles.stepButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="remove" size={16} color={colors.indigo700} />
        </Pressable>
        <Text style={styles.stepValue} accessibilityLabel={`${label} ${value}`}>
          {value}
        </Text>
        <Pressable
          onPress={onPlus}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Next ${label.toLowerCase()}`}
          style={({ pressed }) => [styles.stepButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add" size={16} color={colors.indigo700} />
        </Pressable>
      </View>
    </View>
  );
}

// Date and time chooser built from plain buttons (no native date-picker dependency).
// SIMULATED: it only records when the app should release the story. See PublishSheet.
export default function SchedulePicker({ value, onChange, now = new Date() }) {
  const step = (field, delta) => onChange(stepDate(value, field, delta));
  const check = validateSchedule(value, now);

  return (
    <View>
      <View style={styles.quickRow}>
        {quickOptions(now).map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            selected={Math.abs(option.date.getTime() - value.getTime()) < 60000}
            onPress={() => onChange(option.date)}
            style={styles.quick}
          />
        ))}
      </View>

      <View style={styles.summary} accessibilityLiveRegion="polite">
        <Ionicons name="calendar-outline" size={22} color={colors.violet} />
        <View style={styles.summaryText}>
          <Text style={styles.summaryDate}>{formatDate(value)}</Text>
          <Text style={styles.summaryTime}>
            {formatTime(value)}
            {check.ok ? ` · ${describeCountdown(value, now)}` : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.groupLabel}>DATE</Text>
      <View style={styles.group}>
        <Stepper label="Month" value={monthName(value)} onMinus={() => step('month', -1)} onPlus={() => step('month', 1)} />
        <Stepper label="Day" value={String(value.getDate())} onMinus={() => step('day', -1)} onPlus={() => step('day', 1)} />
        <Stepper label="Year" value={String(value.getFullYear())} onMinus={() => step('year', -1)} onPlus={() => step('year', 1)} />
      </View>

      <Text style={styles.groupLabel}>TIME</Text>
      <View style={styles.group}>
        <Stepper label="Hour" value={String(hour12(value))} onMinus={() => step('hour', -1)} onPlus={() => step('hour', 1)} />
        <Stepper
          label="Minute"
          value={value.getMinutes() < 10 ? `0${value.getMinutes()}` : String(value.getMinutes())}
          onMinus={() => step('minute', -1)}
          onPlus={() => step('minute', 1)}
        />
        <Stepper label="AM / PM" value={meridiem(value)} onMinus={() => step('meridiem', 1)} onPlus={() => step('meridiem', 1)} />
      </View>

      {!check.ok ? <Text style={styles.error}>{check.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  quickRow: { flexDirection: 'row', flexWrap: 'wrap' },
  quick: { marginBottom: spacing.sm },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.violetSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  summaryText: { marginLeft: spacing.md, flex: 1 },
  summaryDate: { ...typography.heading, color: colors.textPrimary },
  summaryTime: { ...typography.caption, color: colors.indigo700, marginTop: 2 },
  groupLabel: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm },
  group: { flexDirection: 'row' },
  stepper: {
    flex: 1,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  stepperWide: { flex: 1.3 },
  stepLabel: { ...typography.micro, fontSize: 11, color: colors.textSecondary },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stepButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.cream200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { ...typography.heading, fontSize: 15, minWidth: 34, textAlign: 'center', color: colors.textPrimary },
  error: { ...typography.caption, color: colors.dangerText, marginTop: spacing.md },
});
