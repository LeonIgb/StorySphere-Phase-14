import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import Button from '../components/Button';
import ConfirmSheet from '../components/ConfirmSheet';
import MediaThumb from '../components/MediaThumb';
import { useCreator } from '../context/CreatorContext';
import { useNotice } from '../context/NoticeContext';
import { mediaProvider } from '../services/mediaService';
import { listMyAssets, publicUrlFor } from '../services/media/mediaApi';
import { makeMediaRef, usageOf } from '../utils/mediaRefs';
import { formatBytes, formatDuration } from '../utils/mediaFiles';
import { colors, spacing, typography } from '../theme/theme';

const PROCESSING = { none: '', queued: 'Waiting to be processed', processing: 'Processing', ready: 'Processed', failed: 'Processing failed' };

// Everything you uploaded to cloud storage: what it is, how big, where it is used, and delete.
// Deleting is blocked while a story you own still uses the file, so a story never loses its media.
export default function MediaLibraryScreen({ navigation }) {
  const { works } = useCreator();
  const { showNotice } = useNotice();
  const [state, setState] = useState({ status: 'loading', items: [], error: '' });
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    const res = await listMyAssets();
    if (res.ok) setState({ status: 'ready', items: res.data || [], error: '' });
    else setState({ status: 'error', items: [], error: res.error });
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const uriOf = (a) => (a.visibility === 'premium' ? makeMediaRef(a.id) : publicUrlFor(a.bucket, a.path));
  const total = state.items.reduce((n, a) => n + (a.status === 'ready' ? a.size_bytes || 0 : 0), 0);

  const doDelete = async (a) => {
    setBusyId(a.id);
    const res = await mediaProvider.remove(uriOf(a));
    setBusyId(null);
    setConfirm(null);
    if (!res.ok) {
      showNotice('Couldn’t delete', res.error, 'alert-circle-outline');
      return;
    }
    showNotice('Deleted', `${a.original_name || 'The file'} was removed from cloud storage.`, 'trash-outline');
    load();
  };

  return (
    <ScreenContainer>
      <BackHeader title="Media library" onBack={navigation.goBack} />
      {state.status === 'loading' ? (
        <LoadingState label="Loading your media…" />
      ) : state.status === 'error' ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {state.items.length === 0 ? (
            <EmptyState icon="albums-outline" title="Nothing uploaded yet" message="Images, videos and audio you upload to a story appear here." />
          ) : (
            <>
              <Text style={styles.summary}>{state.items.length} file{state.items.length === 1 ? '' : 's'} · {formatBytes(total)} used of 2 GB</Text>
              {state.items.map((a) => {
                const uses = usageOf(works, a.id);
                const meta = [a.kind, a.visibility === 'premium' ? 'private (premium)' : 'public', formatBytes(a.size_bytes), a.width && a.height ? `${a.width}×${a.height}` : '', a.duration_ms ? formatDuration(a.duration_ms) : ''].filter(Boolean).join(' · ');
                return (
                  <View key={a.id} style={styles.row} accessibilityLabel={`${a.original_name || a.kind}`}>
                    <MediaThumb uri={a.kind === 'image' ? uriOf(a) : null} kind={a.kind === 'image' ? 'image' : 'video'} icon={a.kind === 'audio' ? 'musical-notes' : undefined} width={56} height={56} />
                    <View style={styles.text}>
                      <Text style={styles.name} numberOfLines={1}>{a.original_name || `${a.kind} file`}</Text>
                      <Text style={styles.meta}>{meta}</Text>
                      {a.status !== 'ready' ? <Text style={styles.meta}>Status: {a.status}</Text> : null}
                      {a.kind !== 'image' && PROCESSING[a.processing] ? <Text style={styles.meta}>{PROCESSING[a.processing]}</Text> : null}
                      <Text style={styles.meta}>{uses.length ? `Used in ${[...new Set(uses.map((u) => u.title))].join(', ')}` : 'Not used in any story'}</Text>
                    </View>
                    <Button
                      title="Delete"
                      size="sm"
                      variant="ghost"
                      loading={busyId === a.id}
                      onPress={() => setConfirm({ a, uses })}
                      accessibilityLabel={`Delete ${a.original_name || a.kind}`}
                    />
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
      <ConfirmSheet
        visible={Boolean(confirm)}
        title={confirm && confirm.uses.length ? 'This file is in use' : 'Delete this file?'}
        message={
          confirm && confirm.uses.length
            ? `It is used in ${[...new Set(confirm.uses.map((u) => u.title))].join(', ')}. Remove it from the story first, then delete it here.`
            : 'It will be removed from cloud storage. This can’t be undone.'
        }
        confirmLabel={confirm && confirm.uses.length ? 'OK' : 'Delete'}
        icon="trash-outline"
        destructive={!(confirm && confirm.uses.length)}
        onConfirm={() => (confirm && confirm.uses.length ? setConfirm(null) : doDelete(confirm.a))}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  summary: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  text: { flex: 1, marginHorizontal: spacing.md },
  name: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
