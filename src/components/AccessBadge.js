import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/theme';

// Free / Premium status pill. `onCover` switches to a style that reads on top of cover art.
export default function AccessBadge({ access = 'Free', onCover = false, price = '', owned = false, style }) {
  const premium = access === 'Premium';
  const bg = premium
    ? onCover
      ? colors.coral
      : colors.coralSoft
    : onCover
    ? 'rgba(18, 15, 46, 0.6)'
    : colors.violetSoft;
  const fg = premium
    ? onCover
      ? colors.indigo950
      : colors.coralText
    : onCover
    ? colors.textOnDark
    : colors.violetText;

  return (
    <View
      style={[styles.pill, { backgroundColor: bg }, style]}
      accessibilityLabel={premium ? `Premium story${price ? `, ${price}` : ''}${owned ? ', owned' : ''}` : 'Free story'}
    >
      {premium ? <Ionicons name="lock-closed" size={9} color={fg} style={styles.icon} /> : null}
      <Text style={[styles.text, { color: fg }]}>{premium ? (owned ? 'OWNED' : price ? `PREMIUM · ${price}` : 'PREMIUM') : 'FREE'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  icon: { marginRight: 3 },
  text: { ...typography.micro, fontSize: 11 },
});
