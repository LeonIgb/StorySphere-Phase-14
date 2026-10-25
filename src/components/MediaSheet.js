import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Button from './Button';
import IconButton from './IconButton';
import { colors, radius, spacing, typography } from '../theme/theme';
import { PICKER_SUPPORTED, normalizeLink, pickImages, pickVideo } from '../utils/media';
import { useSheetInsets } from '../utils/insets';
import { mediaProvider } from '../services/mediaService';
import ProgressBar from './ProgressBar';
import { formatBytes, MEDIA_LIMITS, formatList } from '../utils/mediaFiles';

// Bottom sheet for adding media: choose from the device library (expo-image-picker) or paste a link.
// kind: 'image' | 'video'.  avatar: square-cropped profile photo.  cover: crop to a cover.  multiple: several images at once.
// onPicked receives [{ uri, name }].
export default function MediaSheet({ visible, kind = 'image', cover = false, avatar = false, multiple = false, onClose, onPicked, visibility = 'public', preset }) {
  const sheetInsets = useSheetInsets();
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [cloud, setCloud] = useState(false);
  const [up, setUp] = useState(null); // { progress, done, total } while uploading to the cloud
  const [failed, setFailed] = useState([]); // picked items whose upload failed, kept for "Try again"
  const [okFiles, setOkFiles] = useState([]); // items already uploaded in this batch
  const handle = React.useRef(null);

  useEffect(() => {
    if (visible) {
      setLink('');
      setMessage('');
      setBusy(false);
      setUp(null);
      setFailed([]);
      setOkFiles([]);
      mediaProvider.getMediaMode().then((m) => setCloud(m.mode === 'cloud'));
    } else if (handle.current) {
      handle.current.cancel();
      handle.current = null;
    }
  }, [visible]);

  // Cloud mode: upload picked images (shrunk on the device first), then hand back durable addresses.
  const uploadItems = async (items, already = []) => {
    const thePreset = preset || (avatar ? 'avatar' : cover ? 'cover' : 'page');
    setUp({ progress: 0, done: 0, total: items.length });
    setMessage('');
    setFailed([]);
    let done = 0;
    const h = mediaProvider.uploadImages(items, {
      preset: thePreset,
      visibility,
      onProgress: (f) => setUp((u) => (u ? { ...u, progress: f } : u)),
      onItem: () => {
        done += 1;
        setUp((u) => (u ? { ...u, done } : u));
      },
    });
    handle.current = h;
    const results = await h.promise;
    handle.current = null;
    setUp(null);
    const good = [];
    const bad = [];
    results.forEach((r, i) => {
      if (r.ok) good.push({ ...r.file, uri: r.file.uri, name: r.file.name || items[i].name });
      else if (!r.cancelled) bad.push({ item: items[i], error: r.error });
    });
    const all = [...already, ...good];
    if (bad.length === 0) {
      if (all.length) onPicked(all);
      onClose();
      return;
    }
    setOkFiles(all);
    setFailed(bad.map((b) => b.item));
    setMessage(`${bad.length === 1 ? '1 image' : `${bad.length} images`} couldn’t be uploaded: ${bad[0].error}`);
  };

  const isVideo = kind === 'video';
  const noun = isVideo ? 'video' : avatar ? 'profile photo' : cover ? 'cover image' : multiple ? 'images' : 'image';

  const choose = async () => {
    setBusy(true);
    setMessage('');
    const result = isVideo ? await pickVideo() : await pickImages({ multiple, cover, avatar });
    setBusy(false);
    if (result.status === 'picked') {
      const mode = await mediaProvider.getMediaMode();
      if (mode.mode === 'cloud' && !isVideo) {
        await uploadItems(result.items);
        return;
      }
      onPicked(result.items);
      onClose();
    } else if (result.message) {
      setMessage(result.message);
    }
  };

  const useLink = () => {
    const result = normalizeLink(link);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    onPicked([{ uri: result.uri, name: result.uri }]);
    onClose();
  };

  return (
    <Modal transparent visible={Boolean(visible)} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable style={[styles.backdrop, sheetInsets]} onPress={onClose} accessibilityLabel="Dismiss">
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.title}>Add {noun}</Text>
              <IconButton name="close" label="Close" onPress={onClose} />
            </View>

            <Button
              title={isVideo ? 'Choose a video from your library' : 'Choose from your library'}
              icon={isVideo ? 'videocam-outline' : 'images-outline'}
              fullWidth
              loading={busy}
              disabled={!PICKER_SUPPORTED}
              onPress={choose}
            />
            {!PICKER_SUPPORTED ? (
              <Text style={styles.note}>The library picker isn&apos;t available in this runtime. Paste a link instead.</Text>
            ) : null}

            <Text style={styles.or}>OR PASTE A LINK</Text>
            <TextInput
              value={link}
              onChangeText={(t) => {
                setLink(t);
                setMessage('');
              }}
              placeholder={isVideo ? 'https://example.com/clip.mp4' : 'https://example.com/picture.jpg'}
              placeholderTextColor={colors.indigo300}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={useLink}
              accessibilityLabel={`${isVideo ? 'Video' : 'Image'} link`}
              style={styles.input}
            />
            <Button title="Use this link" variant="secondary" fullWidth onPress={useLink} style={styles.linkButton} />

            {up ? (
              <View accessibilityLiveRegion="polite" style={{ marginTop: spacing.md }}>
                <Text style={styles.note}>Uploading {Math.min(up.done + 1, up.total)} of {up.total} · {Math.round(up.progress * 100)}%</Text>
                <ProgressBar value={up.progress} style={{ marginTop: spacing.sm }} />
                <Button title="Cancel upload" variant="ghost" size="sm" onPress={() => handle.current && handle.current.cancel()} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} />
              </View>
            ) : null}
            {message ? <Text style={styles.error} accessibilityRole="alert">{message}</Text> : null}
            {failed.length > 0 && !up ? (
              <Button title="Try again" icon="refresh" variant="secondary" size="sm" onPress={() => uploadItems(failed, okFiles)} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }} />
            ) : null}
            <Text style={styles.note}>
              {cloud
                ? `Images are shrunk on your device, then uploaded to cloud storage so they show on every device. ${formatList('image')} up to ${formatBytes(MEDIA_LIMITS.imageMaxBytes)}.${visibility === 'premium' ? ' These are stored privately.' : ''}`
                : 'Files picked from your device are stored by reference, so they only show on this device.'}
              {isVideo ? ' Links should point straight to a video file (for example .mp4).' : ''}
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(18, 15, 46, 0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.cream100,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  title: { ...typography.title, color: colors.textPrimary },
  or: { ...typography.micro, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.lg },
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
  linkButton: { marginTop: spacing.md },
  error: { ...typography.caption, color: colors.dangerText, marginTop: spacing.md },
  note: { ...typography.caption, fontSize: 12, color: colors.textSecondary, marginTop: spacing.md },
});
