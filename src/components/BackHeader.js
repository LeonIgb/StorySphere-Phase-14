import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import IconButton from './IconButton';
import { colors, spacing, typography } from '../theme/theme';

// Top bar for detail screens: back button, optional centered title, optional right-side actions.
// `dark` and `titleColor` let immersive screens (reader, gallery) restyle it.
export default function BackHeader({ title, onBack, right, dark = false, background, style }) {
  const iconBg = background || (dark ? colors.indigo800 : colors.cream200);
  return (
    <View style={[styles.bar, style]}>
      <IconButton
        name="arrow-back"
        label="Go back"
        onPress={onBack}
        background={iconBg}
        color={dark ? colors.textOnDark : colors.indigo900}
      />
      <Text
        style={[styles.title, { color: dark ? colors.textOnDark : colors.textPrimary }]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        {title || ''}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.heading,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  right: { minWidth: 42, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
});
