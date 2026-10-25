import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Field from './Field';
import IconButton from './IconButton';
import useAsync from '../hooks/useAsync';
import { fetchAllStories } from '../services/storyService';
import { PICKER_SUPPORTED, pickImages } from '../utils/media';
import { ATTACHMENT_OPTIONS, storyAttachment, validateImageAsset } from '../utils/messaging';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { useSheetInsets } from '../utils/insets';

// Choose what to attach to a message. Supported: a photo from the library and a shared story.
// Video, voice messages and files are listed as "not supported" so it is clear why they are missing.
// onPick receives an attachment object ({ kind: 'image' | 'story', ... }).
export default function AttachmentSheet({ visible, onClose, onPick }) {
  const sheetInsets = useSheetInsets();
  const [mode, setMode] = useState('menu'); // 'menu' | 'story'
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const stories = useAsync(fetchAllStories, []);

  const close = () => {
    setMode('menu');
    setQuery('');
    setMessage('');
    onClose();
  };

  const choosePhoto = async () => {
    setBusy(true);
    setMessage('');
    const result = await pickImages({});
    setBusy(false);
    if (result.status === 'picked') {
      const checked = validateImageAsset(result.items[0]);
      if (!checked.ok) {
        setMessage(checked.error);
        return;
      }
      onPick(checked.attachment);
      close();
    } else if (result.message) setMessage(result.message);
  };

  const list = (stories.data || []).filter((s) => !query.trim() || `${s.title} ${s.creator ? s.creator.name : ''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30);

  return (
    <Modal transparent visible={Boolean(visible)} animationType="slide" onRequestClose={close}>
      <Pressable style={[styles.backdrop, sheetInsets]} onPress={close} accessibilityLabel="Dismiss attachments">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title}>{mode === 'story' ? 'Share a story' : 'Attach'}</Text>
            <IconButton name="close" label="Close attachments" onPress={close} />
          </View>
          {mode === 'menu' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {ATTACHMENT_OPTIONS.map((o) => (
                <Pressable
                  key={o.kind}
                  disabled={!o.supported || (o.kind === 'image' && busy)}
                  onPress={o.kind === 'image' ? choosePhoto : () => setMode('story')}
                  accessibilityRole="button"
                  accessibilityLabel={o.supported ? `Attach ${o.label}` : `${o.label}, not supported`}
                  accessibilityState={{ disabled: !o.supported }}
                  style={[styles.option, !o.supported && styles.disabled]}
                >
                  <View style={[styles.optionIcon, !o.supported && { backgroundColor: colors.cream200 }]}>
                    <Ionicons name={o.icon} size={22} color={o.supported ? colors.violet : colors.indigo300} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{o.label}{o.supported ? '' : ' · not supported'}</Text>
                    <Text style={styles.optionHint}>{o.kind === 'image' && !PICKER_SUPPORTED ? 'The library picker isn’t available in this runtime.' : o.hint}</Text>
                  </View>
                </Pressable>
              ))}
              {message ? <Text style={styles.error} accessibilityRole="alert">{message}</Text> : null}
              <Text style={styles.note}>Attachments stay on this device in the prototype. A real service uploads them to secure storage and scans them first.</Text>
            </ScrollView>
          ) : (
            <View style={{ flexShrink: 1 }}>
              <Field label="SEARCH" value={query} onChangeText={setQuery} placeholder="Title or storyteller" style={{ marginBottom: spacing.sm }} />
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {list.length === 0 ? <Text style={styles.note}>{stories.loading ? 'Loading stories…' : 'No stories match.'}</Text> : null}
                {list.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      onPick(storyAttachment(s));
                      close();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Share story ${s.title}`}
                    style={styles.storyRow}
                  >
                    <Ionicons name="book-outline" size={20} color={colors.indigo500} />
                    <View style={styles.optionText}>
                      <Text style={styles.optionLabel} numberOfLines={1}>{s.title}</Text>
                      <Text style={styles.optionHint}>{s.creator ? s.creator.name : ''}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable onPress={() => setMode('menu')} accessibilityRole="button" accessibilityLabel="Back to attachment options" style={{ paddingVertical: spacing.md }}>
                <Text style={styles.back}>Back</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18,15,46,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream50, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: '85%', ...shadows.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { ...typography.heading, color: colors.textPrimary },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  disabled: { opacity: 0.6 },
  optionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.violetSoft, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, marginLeft: spacing.md },
  optionLabel: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  optionHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  error: { ...typography.caption, color: colors.dangerText, marginTop: spacing.md },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md, lineHeight: 18 },
  storyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  back: { ...typography.body, fontWeight: '700', color: colors.indigo700 },
});
