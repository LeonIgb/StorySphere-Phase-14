import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, MAX_CONTENT_WIDTH, shadows, spacing, typography } from '../theme/theme';

const ICONS = {
  Home: { active: 'home', idle: 'home-outline' },
  Discover: { active: 'compass', idle: 'compass-outline' },
  Create: { active: 'add', idle: 'add' },
  Library: { active: 'library', idle: 'library-outline' },
  Profile: { active: 'person', idle: 'person-outline' },
};

// Custom bottom navigation: indigo bar, cream/violet states, raised coral Create button.
// Controlled component: parent passes `tabs`, `active` and `onChange`.
export default function TabBar({ tabs, active, onChange }) {
  const insets = useSafeAreaInsets();
  // The bar's own padding plus the system navigation inset, so labels never sit under the gesture
  // bar or the three buttons. A small floor keeps spacing on devices that report 0.
  return (
    <View style={[styles.safe, { paddingBottom: Math.max(insets.bottom, spacing.sm), paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.bar}>
        {tabs.map((name) => {
          const focused = active === name;
          const icon = ICONS[name] || ICONS.Home;
          const isCreate = name === 'Create';

          return (
            <Pressable
              key={name}
              onPress={() => onChange(name)}
              accessibilityRole="tab"
              accessibilityLabel={name}
              accessibilityState={{ selected: focused }}
              style={styles.item}
            >
              {isCreate ? (
                <View style={[styles.createButton, shadows.floating, focused && styles.createFocused]}>
                  <Ionicons name={icon.active} size={30} color={colors.indigo950} />
                </View>
              ) : (
                <Ionicons
                  name={focused ? icon.active : icon.idle}
                  size={24}
                  color={focused ? colors.cream100 : colors.indigo300}
                />
              )}
              <Text
                style={[
                  styles.label,
                  { color: focused ? colors.cream100 : colors.indigo300 },
                  isCreate && styles.createLabel,
                ]}
              >
                {name}
              </Text>
              {focused && !isCreate ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.indigo900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 54 },
  label: { ...typography.micro, fontSize: 11, letterSpacing: 0.3, marginTop: 3 },
  dot: {
    position: 'absolute',
    top: -4,
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.coral,
  },
  createButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.cream100,
  },
  createFocused: { backgroundColor: colors.coralDark },
  createLabel: { marginTop: 2 },
});
