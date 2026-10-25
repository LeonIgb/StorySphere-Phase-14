import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { colors, radius, spacing, typography } from '../theme/theme';

// Clear "this is premium" panel used for locked chapters, panels and videos.
// `dark` styles it for the night reader and the gallery.
export default function LockedCard({
  title = 'Premium content',
  message,
  actionLabel = 'Unlock with Premium',
  onAction,
  secondaryLabel,
  onSecondary,
  dark = false,
  style,
}) {
  return (
    <View
      style={[styles.card, dark ? styles.cardDark : styles.cardLight, style]}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message || ''}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: dark ? colors.indigo700 : colors.coralSoft }]}>
        <Ionicons name="lock-closed" size={26} color={dark ? colors.coral : colors.coralDark} />
      </View>
      <Text style={[styles.title, { color: dark ? colors.textOnDark : colors.textPrimary }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: dark ? colors.textOnDarkMuted : colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}
      {onAction ? (
        <Button title={actionLabel} icon="lock-closed" variant="accent" onPress={onAction} style={styles.action} />
      ) : null}
      {onSecondary ? (
        <Button
          title={secondaryLabel}
          variant={dark ? 'ghost' : 'secondary'}
          onPress={onSecondary}
          style={styles.secondary}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    borderWidth: 1,
  },
  cardLight: { backgroundColor: colors.cream50, borderColor: colors.cream300 },
  cardDark: { backgroundColor: colors.indigo800, borderColor: colors.indigo700 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, fontSize: 20, textAlign: 'center' },
  message: { ...typography.body, textAlign: 'center', marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
  secondary: { marginTop: spacing.sm },
});
