import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/theme';
import { addTags } from '../utils/creator';
import { LIMITS } from '../data/creatorOptions';

// Tag editor: type a tag and press return or a comma. Tap a tag to remove it.
export default function TagInput({ tags, onChange }) {
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');

  const commit = (text) => {
    if (!text.trim()) return;
    const result = addTags(tags, text);
    if (result.tags.length !== tags.length) onChange(result.tags);
    setNote(result.rejected.length ? `You can add up to ${LIMITS.tags} tags.` : '');
    setDraft('');
  };

  const onChangeText = (text) => {
    if (/[,;\n]/.test(text)) commit(text);
    else setDraft(text);
  };

  const remove = (tag) => {
    setNote('');
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>TAGS</Text>
        <Text style={styles.count}>
          {tags.length}/{LIMITS.tags}
        </Text>
      </View>
      <TextInput
        value={draft}
        onChangeText={onChangeText}
        onSubmitEditing={() => commit(draft)}
        onBlur={() => commit(draft)}
        placeholder="Add a tag, then press return"
        placeholderTextColor={colors.indigo300}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        blurOnSubmit={false}
        accessibilityLabel="Add a tag"
        style={styles.input}
      />
      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => remove(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${tag}`}
              style={({ pressed }) => [styles.tag, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.tagText}>#{tag}</Text>
              <Ionicons name="close" size={14} color={colors.indigo700} style={styles.tagIcon} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <Text style={styles.hint}>{note || 'Tags help readers find your story in search.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  label: { ...typography.micro, color: colors.textSecondary },
  count: { ...typography.caption, fontSize: 11, color: colors.textSecondary },
  input: {
    ...typography.body,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.cream300,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.violetSoft,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagText: { ...typography.caption, fontWeight: '700', color: colors.indigo700 },
  tagIcon: { marginLeft: 4 },
  hint: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
