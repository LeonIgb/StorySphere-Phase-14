import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme/theme';
import { initials } from '../utils/format';
import { readableOn } from '../utils/contrast';

// Avatar: a profile photo when `creator.avatarUri` is set (and loads), otherwise initials on the
// creator's colour, so it always renders. `creator` needs: name, color; optional verified, avatarUri.
function Photo({ uri, size }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [uri]);
  if (!uri || failed) return null;
  return (
    <Image
      source={{ uri }}
      onError={() => setFailed(true)}
      style={[StyleSheet.absoluteFill, { width: size, height: size }]}
      accessibilityLabel="Profile photo"
    />
  );
}

export default function CreatorAvatar({ creator, size = 56, showName = false, onPress, style }) {
  const name = creator && creator.name ? creator.name : 'Unknown creator';
  const color = creator && creator.color ? creator.color : colors.indigo500;
  const radiusValue = size / 2;

  const avatar = (
    <View
      style={[
        styles.ring,
        { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 },
      ]}
    >
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: radiusValue, backgroundColor: color },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.36, color: readableOn(color) }]}>{initials(name)}</Text>
        <Photo uri={creator && creator.avatarUri} size={size} />
      </View>
      {creator && creator.verified ? (
        <View style={styles.badge}>
          <Ionicons name="checkmark" size={10} color={colors.white} />
        </View>
      ) : null}
    </View>
  );

  const content = (
    <View style={[styles.wrap, showName && { width: size + 28 }, style]}>
      {avatar}
      {showName ? (
        <Text style={styles.name} numberOfLines={1}>
          {name.split(' ')[0]}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${name}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  ring: {
    borderWidth: 2,
    borderColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { color: colors.textOnDark, fontWeight: '800' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.violet,
    borderWidth: 2,
    borderColor: colors.cream100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.caption, color: colors.textPrimary, marginTop: spacing.sm },
  pressed: { opacity: 0.8 },
});
