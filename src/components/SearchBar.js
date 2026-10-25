import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function SearchBar({ value, onChangeText, placeholder = 'Search stories, genres, creators' }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search-outline" size={20} color={colors.indigo500} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="Search"
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={20} color={colors.indigo300} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cream50,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.cream300,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xl,
    height: 50,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    marginHorizontal: spacing.sm,
    paddingVertical: 0,
    alignSelf: 'stretch', // the whole bar is the touch area
  },
});
