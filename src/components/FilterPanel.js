import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Chip from './Chip';
import Button from './Button';
import { ACCESS_OPTIONS, MEDIA_TYPES, SORT_OPTIONS } from '../data/discoveryOptions';
import { colors, mediaIcons, radius, spacing, typography } from '../theme/theme';

const ACCESS_ICONS = { Free: 'lock-open-outline', Premium: 'lock-closed-outline' };
const SORT_ICONS = { Newest: 'time-outline', Popular: 'flame-outline', 'Top rated': 'star-outline' };

function Group({ label, children }) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

// Format, access and sort controls. Fully controlled by the parent.
export default function FilterPanel({
  mediaType,
  access,
  sort,
  onMediaType,
  onAccess,
  onSort,
  onReset,
  canReset,
}) {
  return (
    <View style={styles.panel}>
      <Group label="Format">
        {MEDIA_TYPES.map((m) => (
          <Chip
            key={m}
            label={m === 'All' ? 'All formats' : m}
            icon={mediaIcons[m]}
            selected={m === mediaType}
            onPress={() => onMediaType(m)}
            style={styles.chip}
          />
        ))}
      </Group>

      <Group label="Access">
        {ACCESS_OPTIONS.map((a) => (
          <Chip
            key={a}
            label={a === 'All' ? 'Free & premium' : a}
            icon={ACCESS_ICONS[a]}
            selected={a === access}
            onPress={() => onAccess(a)}
            style={styles.chip}
          />
        ))}
      </Group>

      <Group label="Sort by">
        {SORT_OPTIONS.map((s) => (
          <Chip
            key={s}
            label={s}
            icon={SORT_ICONS[s]}
            selected={s === sort}
            onPress={() => onSort(s)}
            style={styles.chip}
          />
        ))}
      </Group>

      <Button
        title="Reset filters"
        size="sm"
        variant="ghost"
        icon="refresh"
        onPress={onReset}
        disabled={!canReset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.cream50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cream300,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  group: { marginBottom: spacing.md },
  label: { ...typography.micro, fontSize: 11, color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { marginBottom: spacing.sm },
});
