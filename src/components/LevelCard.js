import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ProgressBar from './ProgressBar';
import { colors, radius, spacing, typography } from '../theme/theme';

// Level number, name, XP and progress toward the next level.
export default function LevelCard({ progress, compact = false, onPress, title }) {
  const { level, xp } = progress;
  const body = (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.row}>
        <View style={styles.ring} accessibilityLabel={`Level ${level.level}`}>
          <Text style={styles.ringLabel}>LVL</Text>
          <Text style={styles.ringValue}>{level.level}</Text>
        </View>
        <View style={styles.text}>
          {title ? <Text style={styles.kicker}>{title}</Text> : null}
          <Text style={styles.name}>{level.name}</Text>
          <Text style={styles.xp}>{xp.toLocaleString('en-US')} XP</Text>
        </View>
      </View>
      <ProgressBar value={level.progress} height={8} color={colors.coral} trackColor="rgba(251,246,236,0.2)" style={styles.bar} />
      <Text style={styles.next}>
        {level.next ? `${level.xpToNext.toLocaleString('en-US')} XP to level ${level.next.level}: ${level.next.name}` : 'Top level reached'}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Level ${level.level} ${level.name}, ${xp} XP. View achievements`} style={({ pressed }) => pressed && { opacity: 0.9 }}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.indigo900, borderRadius: radius.xl, padding: spacing.xl },
  compact: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  ring: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  ringLabel: { ...typography.micro, color: colors.textOnDarkMuted, letterSpacing: 1 },
  ringValue: { fontSize: 26, fontWeight: '800', color: colors.textOnDark, lineHeight: 28 },
  text: { flex: 1 },
  kicker: { ...typography.micro, color: colors.textOnDarkMuted },
  name: { ...typography.title, color: colors.textOnDark },
  xp: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: 2 },
  bar: { marginTop: spacing.lg },
  next: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: spacing.sm },
});
