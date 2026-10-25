import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { readableOn } from '../utils/contrast';
import CreatorAvatar from './CreatorAvatar';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatCount } from '../utils/format';

const MEDALS = { 1: colors.gold, 2: '#9AA3B2', 3: '#C58A5A' };

function Movement({ movement }) {
  if (!movement) return null;
  if (movement.isNew) {
    return <Text style={[styles.move, { color: colors.violetText }]} accessibilityLabel="New on this board">NEW</Text>;
  }
  if (movement.delta === 0) {
    return <Text style={[styles.move, { color: colors.textSecondary }]} accessibilityLabel="No change in rank">–</Text>;
  }
  const up = movement.delta > 0;
  return (
    <Text
      style={[styles.move, { color: up ? colors.success : colors.danger }]}
      accessibilityLabel={`${up ? 'Up' : 'Down'} ${Math.abs(movement.delta)} places`}
    >
      {up ? '▲' : '▼'} {Math.abs(movement.delta)}
    </Text>
  );
}

const pct = (n) => `${Math.round(n * 100)}%`;

// One ranked storyteller. Tap the name area to open the profile; the chevron expands the
// score breakdown (component points, multipliers, held reads).
export default function LeaderboardRow({ entry, onOpenCreator, showMovement = true }) {
  const [open, setOpen] = useState(false);
  const { creator, rank, score, scored, metrics, movement } = entry;
  const medal = MEDALS[rank];
  return (
    <View style={[styles.card, rank <= 3 && styles.cardTop]}>
      <View style={styles.main}>
        <View style={[styles.rankBadge, medal && { backgroundColor: medal }]} accessibilityLabel={`Rank ${rank}`}>
          <Text style={[styles.rankText, medal && { color: readableOn(medal) }]}>{rank}</Text>
        </View>
        <Pressable
          onPress={() => onOpenCreator(creator.id)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${creator.name}'s profile, rank ${rank}`}
          style={({ pressed }) => [styles.who, pressed && { opacity: 0.85 }]}
        >
          <CreatorAvatar creator={creator} size={44} />
          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={1}>{creator.name}</Text>
            <Text style={styles.handle} numberOfLines={1}>{creator.handle}</Text>
          </View>
        </Pressable>
        <View style={styles.scoreBlock}>
          <Text style={styles.score} accessibilityLabel={`Illustrative score ${score.toFixed(1)}`}>{score.toFixed(1)}</Text>
          {showMovement ? <Movement movement={movement} /> : null}
        </View>
      </View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Hide' : 'Show'} score breakdown for ${creator.name}`}
        style={styles.metricsRow}
      >
        <Text style={styles.metrics} numberOfLines={2}>
          {formatCount(metrics.validReads)} reads · {formatCount(metrics.uniqueReaders)} readers · {pct(scored.completionRate)} finish
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.indigo500} />
      </Pressable>
      {open ? (
        <View style={styles.breakdown}>
          {scored.breakdown.map((b) => (
            <View key={b.key} style={styles.bRow}>
              <Text style={[styles.bLabel, !b.applies && { color: colors.textSecondary }]}>{b.label}</Text>
              <Text style={styles.bValue}>
                {b.applies ? `${b.points.toFixed(1)} / ${b.effectiveWeight.toFixed(1)}` : 'n/a'}
              </Text>
            </View>
          ))}
          <Text style={styles.note}>
            Compliance ×{scored.complianceMultiplier.toFixed(2)} · Integrity ×{scored.integrityMultiplier.toFixed(2)}
          </Text>
          {scored.complianceApplied.length > 0 ? (
            <Text style={styles.note}>
              Rule violation on record ({scored.complianceApplied.map((c) => c.severity).join(', ')}); the reduction fades over 90 days.
            </Text>
          ) : null}
          {metrics.heldReads > 0 ? (
            <Text style={styles.note}>{formatCount(metrics.heldReads)} reads held back as an unusual spike without matching completions.</Text>
          ) : null}
          {metrics.invalidShare > 0.1 ? (
            <Text style={styles.note}>{pct(metrics.invalidShare)} of this creator's reads failed validation and were not counted.</Text>
          ) : null}
          <Text style={styles.note}>Sample score, not a measure of story quality.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cream300,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTop: { borderColor: colors.indigo300 },
  main: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: { ...typography.caption, fontWeight: '800', color: colors.indigo700 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  nameBlock: { flex: 1, marginLeft: spacing.sm },
  name: { ...typography.heading, color: colors.textPrimary },
  handle: { ...typography.caption, color: colors.textSecondary },
  scoreBlock: { alignItems: 'flex-end', marginLeft: spacing.sm, minWidth: 52 },
  score: { ...typography.title, color: colors.indigo700 },
  move: { ...typography.micro, letterSpacing: 0.2 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm },
  metrics: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  breakdown: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.cream300 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  bLabel: { ...typography.caption, color: colors.textPrimary },
  bValue: { ...typography.caption, color: colors.indigo700, fontWeight: '700' },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
