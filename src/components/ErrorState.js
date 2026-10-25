import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import Button from './Button';

// Full-size error panel by default; `compact` renders a slim inline banner
// (used when a refresh fails but older content is still on screen).
export default function ErrorState({ message, onRetry, compact = false }) {
  const text = message || 'Something went wrong. Please try again.';

  if (compact) {
    return (
      <View style={styles.banner} accessibilityRole="alert">
        <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
        <Text style={styles.bannerText} numberOfLines={2}>
          {text}
        </Text>
        {onRetry ? <Button title="Retry" size="sm" variant="secondary" onPress={onRetry} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>Couldn't load this</Text>
      <Text style={styles.message}>{text}</Text>
      {onRetry ? <Button title="Try again" icon="refresh" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: colors.cream50,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.cream300,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.coralSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.heading, color: colors.textPrimary },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  action: { marginTop: spacing.lg },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.coralSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  bannerText: { ...typography.caption, flex: 1, color: colors.textPrimary, marginHorizontal: spacing.sm },
});
