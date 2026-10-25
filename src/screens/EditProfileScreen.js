import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import Field from '../components/Field';
import Chip from '../components/Chip';
import CreatorAvatar from '../components/CreatorAvatar';
import SegmentedControl from '../components/SegmentedControl';
import MediaSheet from '../components/MediaSheet';
import ConfirmSheet from '../components/ConfirmSheet';
import { useAccount } from '../context/AccountContext';
import { useNotice } from '../context/NoticeContext';
import { WORK_GENRES } from '../data/creatorOptions';
import { AVATAR_COLORS, LIMITS_ACCOUNT, toggleId } from '../utils/account';
import { colors, genreIcons, spacing, typography } from '../theme/theme';

const ROLE_LABEL = { reader: 'Reader', storyteller: 'Storyteller' };

// Edit display name, bio, avatar (photo or colour), role and preferred genres.
// Nothing is saved until "Save changes"; going back with edits asks first.
export default function EditProfileScreen({ navigation }) {
  const { profile, updateProfile } = useAccount();
  const { showNotice } = useNotice();
  const [draft, setDraft] = useState(profile);
  const [errors, setErrors] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const patch = (p) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors({});
  };

  const back = () => (dirty ? setConfirmLeave(true) : navigation.goBack());

  const save = () => {
    const result = updateProfile({ ...draft });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    showNotice('Profile saved', 'Your changes now show everywhere in StorySphere.', 'checkmark-circle-outline');
    navigation.goBack();
  };

  const previewName = draft.displayName.trim() || 'Your name';

  return (
    <ScreenContainer>
      <BackHeader title="Edit profile" onBack={back} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarBlock}>
            <CreatorAvatar creator={{ name: previewName, color: draft.avatarColor, avatarUri: draft.avatarUri }} size={92} />
            <View style={styles.avatarButtons}>
              <Button title={draft.avatarUri ? 'Change photo' : 'Add photo'} icon="camera-outline" size="sm" variant="secondary" onPress={() => setPickerOpen(true)} />
              {draft.avatarUri ? (
                <Button title="Remove photo" size="sm" variant="ghost" onPress={() => patch({ avatarUri: null })} />
              ) : null}
            </View>
            <Text style={styles.label}>AVATAR COLOUR</Text>
            <View style={styles.swatches}>
              {AVATAR_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => patch({ avatarColor: c })}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Avatar colour ${c}`}
                  accessibilityState={{ selected: draft.avatarColor === c }}
                  style={[styles.swatch, { backgroundColor: c }, draft.avatarColor === c && styles.swatchOn]}
                />
              ))}
            </View>
          </View>

          <Field
            label="Display name"
            value={draft.displayName}
            onChangeText={(t) => patch({ displayName: t })}
            maxLength={LIMITS_ACCOUNT.nameMax}
            error={errors.displayName}
            autoCapitalize="words"
          />
          <Field
            label="Bio"
            value={draft.bio}
            onChangeText={(t) => patch({ bio: t })}
            maxLength={LIMITS_ACCOUNT.bioMax}
            multiline
            minHeight={96}
            placeholder="A line or two about what you read or write."
            error={errors.bio}
          />
          <Text style={styles.handleLine}>Your handle: {draft.handle}</Text>

          <Text style={styles.label}>I MOSTLY…</Text>
          <View style={styles.bleed}>
            <SegmentedControl
              options={['Reader', 'Storyteller']}
              value={ROLE_LABEL[draft.role]}
              onChange={(o) => patch({ role: o === 'Reader' ? 'reader' : 'storyteller' })}
            />
          </View>

          <Text style={[styles.label, styles.gap]}>PREFERRED GENRES</Text>
          <Text style={styles.hint}>Used for Home recommendations. Choose up to {LIMITS_ACCOUNT.maxGenres}.</Text>
          <View style={styles.chips}>
            {WORK_GENRES.map((g) => (
              <Chip
                key={g}
                label={g}
                icon={genreIcons[g]}
                selected={draft.preferredGenres.includes(g)}
                onPress={() => patch({ preferredGenres: toggleId(draft.preferredGenres, g) })}
                style={styles.chip}
              />
            ))}
          </View>

          <Button title="Save changes" fullWidth disabled={!dirty} onPress={save} style={styles.save} />
        </ScrollView>
      </KeyboardAvoidingView>

      <MediaSheet
        visible={pickerOpen}
        kind="image"
        avatar
        onClose={() => setPickerOpen(false)}
        preset="avatar"
        onPicked={(items) => items[0] && patch({ avatarUri: items[0].uri })}
      />
      <ConfirmSheet
        visible={confirmLeave}
        title="Discard your changes?"
        message="You have edits that haven’t been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setConfirmLeave(false);
          navigation.goBack();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  avatarBlock: { alignItems: 'center', marginBottom: spacing.xl },
  avatarButtons: { flexDirection: 'row', marginTop: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: spacing.sm },
  swatch: { width: 32, height: 32, borderRadius: 16, margin: 5, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.indigo900 },
  label: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6 },
  gap: { marginTop: spacing.xl },
  hint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  handleLine: { ...typography.caption, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.sm },
  bleed: { marginHorizontal: -spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { marginBottom: spacing.sm },
  save: { marginTop: spacing.xl },
});
