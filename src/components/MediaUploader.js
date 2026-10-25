import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import Field from './Field';
import ProgressBar from './ProgressBar';
import ActionLink from './ActionLink';
import VideoPlayer from './VideoPlayer';
import AudioPlayer from './AudioPlayer';
import { mediaProvider } from '../services/mediaService';
import { useCreatorOptional } from '../context/CreatorContext';
import { mediaIdOf, usageOf, visibilityOfUri } from '../utils/mediaRefs';
import { AUDIO_PICKER_SUPPORTED, PICKER_SUPPORTED, fileNameOf, normalizeLink, pickAudio, pickVideo } from '../utils/media';
import { MEDIA_LIMITS, detectFormat, formatBytes, formatList, fileSummary } from '../utils/mediaFiles';
import { isLocalUri } from '../utils/creator';
import { LIMITS } from '../data/creatorOptions';
import { colors, radius, spacing, typography } from '../theme/theme';

const COPY = {
  video: { noun: 'video', icon: 'videocam-outline', chooseHint: 'From your library' },
  audio: { noun: 'audio file', icon: 'musical-notes-outline', chooseHint: 'From your files' },
};

// One uploader for audio AND video, so every page that takes media behaves the same way:
// choose a file (or paste a link), it is checked against the format and size limits, a progress bar
// runs, then the result can be previewed, captioned, replaced or removed.
//
// PROTOTYPE: the file is kept on this device; nothing is sent to a server (see services/mediaService.js).
//
// Props:
//   kind        'video' | 'audio'
//   value       the uploaded file { uri, name, size, mimeType, format, durationMs } or null
//   onChange    (file | null) => void    called when an upload finishes or the file is removed
//   caption / onCaption   optional caption field; onCaptionCommit runs when the caption field loses focus
//   onBusyChange(bool)    true while a file is being checked or uploaded (parents can block Publish)
//   label       accessibility label prefix, e.g. 'Video block 2'
export default function MediaUploader({ kind, value, onChange, caption, onCaption, onCaptionCommit, onBusyChange, label, color, style, children, visibility = 'public', storyId = null }) {
  const copy = COPY[kind];
  const [stage, setStage] = useState('idle'); // idle | uploading | saving
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(null); // the file being uploaded
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [preview, setPreview] = useState(false);
  const [cloud, setCloud] = useState(false); // true when uploads go to cloud storage
  const [retryable, setRetryable] = useState(false);
  const lastAsset = useRef(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const creator = useCreatorOptional();
  const worksRef = useRef([]);
  worksRef.current = creator ? creator.works || [] : [];
  const handle = useRef(null);
  const alive = useRef(true);
  const busy = stage !== 'idle';

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (handle.current) handle.current.cancel();
    };
  }, []);
  useEffect(() => {
    mediaProvider.getMediaMode().then((m) => alive.current && setCloud(m.mode === 'cloud'));
  }, [value]);
  useEffect(() => {
    if (onBusyChange) onBusyChange(busy);
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(
    (asset) => {
      setError('');
      setRetryable(false);
      lastAsset.current = asset;
      setNote('');
      setDone('');
      setProgress(0);
      setPending({ name: asset.name || fileNameOf(asset.uri), size: asset.size });
      setStage('uploading');
      const h = mediaProvider.upload(kind, asset, {
        visibility,
        storyId,
        onProgress: (f) => alive.current && setProgress(f),
        onStage: (s) => alive.current && setStage(s),
      });
      handle.current = h;
      h.promise.then((res) => {
        if (!alive.current || handle.current !== h) return;
        handle.current = null;
        setStage('idle');
        setPending(null);
        if (res.cancelled) return;
        if (!res.ok) {
          setError(res.error);
          setRetryable(Boolean(res.retryable) && Boolean(lastAsset.current));
          return;
        }
        setPreview(false);
        setDone(`${res.file.name} uploaded.`);
        const previous = valueRef.current;
        if (!res.persisted && isLocalUri(res.file.uri) && !/^blob:/.test(res.file.uri)) {
          setNote('Saved by reference: the system may remove this file later. Re-upload it if it stops playing.');
        }
        onChange(res.file);
        // Replacing a cloud file: once no story uses the old one any more, delete it from storage.
        if (previous && previous.uri && previous.uri !== res.file.uri && mediaIdOf(previous.uri)) {
          setTimeout(() => {
            if (usageOf(worksRef.current, mediaIdOf(previous.uri)).length === 0) mediaProvider.remove(previous.uri);
          }, 400);
        }
      });
    },
    [kind, onChange, visibility, storyId]
  );

  const choose = async () => {
    if (busy) return;
    setError('');
    const result = kind === 'video' ? await pickVideo() : await pickAudio();
    if (!alive.current) return;
    if (result.status === 'picked') start(result.items[0]);
    else if (result.status === 'unsupported' || result.status === 'error') {
      setError(result.message);
      setLinkOpen(true);
    }
  };

  const cancel = () => {
    if (handle.current) handle.current.cancel();
    handle.current = null;
    setStage('idle');
    setPending(null);
    setProgress(0);
    setNote('');
    setDone('Upload cancelled.');
  };

  const useLink = () => {
    const checked = normalizeLink(link);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    const format = detectFormat(kind, { uri: checked.uri });
    setError('');
    setDone('Link added. Links aren’t uploaded or checked for size.');
    setNote('');
    setLinkOpen(false);
    setLink('');
    onChange({ uri: checked.uri, name: fileNameOf(checked.uri), size: null, mimeType: format ? format.mime : '', format: format ? format.ext : '', durationMs: null });
  };

  const remove = () => {
    setDone('');
    setNote('');
    setPreview(false);
    onChange(null);
  };

  const limitText = `${formatList(kind)} · up to ${formatBytes(kind === 'video' ? MEDIA_LIMITS.videoMaxBytes : MEDIA_LIMITS.audioMaxBytes)}`;
  const pickerOk = kind === 'video' ? PICKER_SUPPORTED : AUDIO_PICKER_SUPPORTED;
  const pct = Math.round(progress * 100);

  return (
    <View style={[styles.wrap, style]}>
      {busy && pending ? (
        <View style={styles.card} accessibilityLiveRegion="polite">
          <View style={styles.row}>
            <Ionicons name={copy.icon} size={22} color={colors.indigo700} />
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>{pending.name}</Text>
              <Text style={styles.meta}>
                {stage === 'saving' ? 'Saving…' : stage === 'retrying' ? 'Connection problem. Trying again…' : `Uploading… ${pct}%`}
                {Number.isFinite(pending.size) ? ` · ${formatBytes(pending.size)}` : ''}
              </Text>
            </View>
            <ActionLink icon="close" label="Cancel" onPress={cancel} accessibilityLabel={`Cancel ${copy.noun} upload`} />
          </View>
          <ProgressBar value={progress} style={styles.bar} />
          <Text style={styles.small}>
            {cloud
              ? `Uploading to cloud storage${visibility === 'premium' ? ' (private: only people who unlock the story can open it)' : ''}.`
              : 'Simulated upload: the file stays on this device.'}
          </Text>
        </View>
      ) : value && value.uri ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success || colors.indigo700} />
            <View style={styles.text}>
              <Text style={styles.name} numberOfLines={1}>{value.name || fileNameOf(value.uri)}</Text>
              <Text style={styles.meta}>
                {fileSummary(value) || 'Added from a link'}
                {visibilityOfUri(value.uri) === 'premium' ? ' · Private (premium)' : visibilityOfUri(value.uri) === 'public' ? ' · Cloud' : ''}
              </Text>
            </View>
          </View>
          {preview ? (
            kind === 'video' ? (
              <View style={{ marginTop: spacing.md }}>
                <VideoPlayer uri={value.uri} color={color || colors.indigo800} icon="videocam" />
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <AudioPlayer uri={value.uri} title={caption || value.name} durationMs={value.durationMs} />
              </View>
            )
          ) : null}
          <View style={styles.actions}>
            <Button
              title={preview ? 'Hide preview' : 'Preview'}
              icon={preview ? 'eye-off-outline' : 'play-circle-outline'}
              size="sm"
              variant="secondary"
              onPress={() => setPreview((p) => !p)}
              accessibilityLabel={`${preview ? 'Hide' : 'Show'} ${copy.noun} preview${label ? ` ${label}` : ''}`}
              style={styles.action}
            />
            <Button title="Replace" icon="swap-horizontal" size="sm" variant="secondary" onPress={choose} accessibilityLabel={`Replace ${copy.noun}${label ? ` ${label}` : ''}`} style={styles.action} />
            <Button title="Remove" icon="trash-outline" size="sm" variant="ghost" onPress={remove} accessibilityLabel={`Remove ${copy.noun}${label ? ` ${label}` : ''}`} style={styles.action} />
          </View>
        </View>
      ) : (
        <View style={styles.drop}>
          <Ionicons name={copy.icon} size={30} color={colors.violet} />
          <Text style={styles.dropTitle}>Add {copy.noun === 'video' ? 'a video' : 'an audio file'}</Text>
          <Text style={styles.small}>{limitText}</Text>
          {pickerOk ? (
            <Button title={`Choose ${copy.noun}`} icon={copy.icon} size="sm" onPress={choose} accessibilityLabel={`Choose ${copy.noun}${label ? ` ${label}` : ''}`} style={{ marginTop: spacing.md }} />
          ) : null}
        </View>
      )}

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={16} color={colors.coralDark} />
          <Text style={styles.errorText}>{error}</Text>
          {retryable ? <ActionLink icon="refresh" label="Try again" onPress={() => lastAsset.current && start(lastAsset.current)} accessibilityLabel={`Try the ${copy.noun} upload again`} /> : null}
        </View>
      ) : null}
      {!error && done && !busy ? <Text style={styles.done} accessibilityLiveRegion="polite">{done}</Text> : null}
      {note ? <Text style={styles.small}>{note}</Text> : null}

      {!busy ? (
        <View style={styles.linkRow}>
          <ActionLink
            icon="link-outline"
            label={linkOpen ? 'Hide link option' : `Use a link instead`}
            onPress={() => setLinkOpen((o) => !o)}
            accessibilityLabel={`Use a ${copy.noun} link instead${label ? ` ${label}` : ''}`}
          />
        </View>
      ) : null}
      {linkOpen && !busy ? (
        <View>
          <Field
            value={link}
            onChangeText={setLink}
            placeholder={`https://… link to a ${copy.noun}`}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={`${copy.noun} link${label ? ` ${label}` : ''}`}
            style={{ marginBottom: spacing.sm }}
          />
          <Button title="Use link" size="sm" variant="secondary" onPress={useLink} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}

      {onCaption && (value && value.uri) ? (
        <Field
          value={caption || ''}
          onChangeText={onCaption}
          onBlur={onCaptionCommit}
          placeholder="Caption (optional)"
          maxLength={LIMITS.caption}
          style={{ marginTop: spacing.md, marginBottom: 0 }}
          accessibilityLabel={`Caption for ${copy.noun}${label ? ` ${label}` : ''}`}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xs },
  drop: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.cream300, borderRadius: radius.lg, padding: spacing.xl, backgroundColor: colors.cream100 },
  dropTitle: { ...typography.heading, fontSize: 16, color: colors.textPrimary, marginTop: spacing.sm },
  card: { backgroundColor: colors.cream100, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, marginHorizontal: spacing.md },
  name: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  small: { ...typography.caption, fontSize: 11, color: colors.textSecondary, marginTop: spacing.xs },
  bar: { marginTop: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  action: { marginRight: spacing.sm, marginBottom: spacing.xs },
  error: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },
  errorText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary },
  done: { ...typography.caption, color: colors.indigo700, marginTop: spacing.sm },
  linkRow: { marginTop: spacing.sm, alignItems: 'flex-start' },
});
