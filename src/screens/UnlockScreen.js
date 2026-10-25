import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import DemoPurchaseBanner from '../components/DemoPurchaseBanner';
import TxStatusPill from '../components/TxStatusPill';
import { useAccess } from '../context/AccessContext';
import { DEMO_METHOD } from '../services/accessService';
import { formatPrice, STATUS_HELP } from '../utils/pricing';
import { freePreviewCount } from '../utils/access';
import { newId } from '../utils/creator';
import { colors, radius, spacing, typography } from '../theme/theme';

function includesList(q) {
  const items = [];
  if (q.chapterCount) items.push(`All ${q.chapterCount} chapters`);
  if (q.panelCount) items.push(`All ${q.panelCount} illustrated panels`);
  if (q.hasVideo) items.push('The full video');
  if (items.length === 0) items.push('The full story');
  items.push('Yours to keep on this account (one-time purchase)');
  return items;
}

// Unlock confirmation for a premium story. Shows what you get, the price and the access
// requirement, then runs a SIMULATED purchase. The price comes from the access service's quote;
// this screen never sends or decides a price.
export default function UnlockScreen({ storyId, navigation }) {
  const { quote, buy, outcome } = useAccess();
  const [state, setState] = useState({ loading: true, error: null, result: null });
  const [phase, setPhase] = useState('review'); // review | processing | done
  const [tx, setTx] = useState(null);
  const [failure, setFailure] = useState('');
  // One key per open page: a double tap or a retry of the same confirmation can't charge twice.
  const key = useRef(newId('idem'));
  const alive = useRef(true);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    quote(storyId).then(
      (result) => alive.current && setState({ loading: false, error: null, result }),
      (error) => alive.current && setState({ loading: false, error, result: null })
    );
  };
  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  const confirm = async () => {
    if (phase === 'processing') return;
    setPhase('processing');
    setFailure('');
    try {
      const r = await buy(storyId, key.current);
      if (!alive.current) return;
      if (!r.ok) {
        setFailure(r.message || 'The purchase could not be completed.');
        setPhase('review');
        return;
      }
      setTx(r.transaction);
      setPhase('done');
      // A failed attempt may be retried with a fresh key (a new, separate attempt).
      if (r.transaction.status === 'failed') key.current = newId('idem');
    } catch (e) {
      if (!alive.current) return;
      setFailure(e && e.message ? e.message : 'Something went wrong. You were not charged.');
      setPhase('review');
    }
  };

  const { result } = state;
  let body;
  if (state.loading && !result) body = <LoadingState label="Loading price…" />;
  else if (state.error && !result) body = <ErrorState message={state.error.message} onRetry={load} />;
  else if (!result.ok) {
    body = (
      <EmptyState
        icon={result.code === 'free' ? 'checkmark-circle-outline' : result.code === 'owner' ? 'create-outline' : 'alert-circle-outline'}
        title={result.code === 'free' ? 'This story is free' : result.code === 'owner' ? 'This is your story' : 'Not available'}
        message={result.message}
        actionLabel="Open story"
        onAction={() => {
          navigation.goBack();
        }}
      />
    );
  } else if (phase === 'done' && tx) {
    const ok = tx.status === 'completed';
    const pending = tx.status === 'pending';
    body = (
      <View style={styles.pad}>
        <View style={[styles.resultIcon, { backgroundColor: ok ? '#E3F4EC' : pending ? colors.violetSoft : colors.coralSoft }]}>
          <Ionicons name={ok ? 'checkmark-circle' : pending ? 'time-outline' : 'close-circle'} size={44} color={ok ? colors.success : pending ? colors.violet : colors.coralDark} />
        </View>
        <Text style={styles.resultTitle}>{ok ? 'Unlocked (demo)' : pending ? 'Payment pending' : 'Payment failed'}</Text>
        <Text style={styles.resultText}>
          {ok
            ? `“${result.quote.title}” is now unlocked on this account. This was a simulated purchase; nothing was charged.`
            : STATUS_HELP[tx.status]}
        </Text>
        <View style={styles.card}>
          <Row label="Status" value={<TxStatusPill status={tx.status} />} />
          <Row label="Amount" value={formatPrice(tx.amountCents, tx.currency)} />
          <Row label="Method" value={tx.method} />
          <Row label="Reference" value={tx.id} last />
        </View>
        {ok ? (
          <Button title="Start reading" icon="book-outline" fullWidth style={styles.gap} onPress={() => navigation.goBack()} />
        ) : null}
        {tx.status === 'failed' ? (
          <Button title="Try again" icon="refresh" variant="accent" fullWidth style={styles.gap} onPress={() => { setPhase('review'); setTx(null); load(); }} />
        ) : null}
        <Button title="View receipt" icon="receipt-outline" variant="secondary" fullWidth style={styles.gap} onPress={() => navigation.openReceipt(tx.id)} />
        <Button title="Back to story" variant="ghost" fullWidth style={styles.gap} onPress={() => navigation.goBack()} />
      </View>
    );
  } else if (result.alreadyOwned) {
    body = (
      <EmptyState
        icon="checkmark-circle-outline"
        title="You already own this story"
        message="It is unlocked on this account. Nothing more to buy."
        actionLabel="Back to story"
        onAction={navigation.goBack}
      />
    );
  } else {
    const q = result.quote;
    const preview =
      q.mediaType === 'Video'
        ? 0
        : freePreviewCount({ access: 'Premium', mediaType: q.mediaType, previewCount: q.previewCount }, q.mediaType === 'Image' ? 'gallery' : 'chapters');
    const busy = phase === 'processing';
    body = (
      <>
        <DemoPurchaseBanner />
        <View style={styles.pad}>
          <View style={styles.summary}>
            <View style={[styles.cover, { backgroundColor: q.coverColor || colors.indigo700 }]}>
              <Ionicons name="lock-open-outline" size={26} color="rgba(251,246,236,0.9)" />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.title} numberOfLines={2}>{q.title}</Text>
              <Text style={styles.meta}>{q.creatorName ? `by ${q.creatorName} · ` : ''}{q.mediaType}</Text>
            </View>
          </View>

          <Text style={styles.section}>What you get</Text>
          <View style={styles.card}>
            {includesList(q).map((item, i, arr) => (
              <View key={item} style={[styles.line, i < arr.length - 1 && styles.lineBorder]}>
                <Ionicons name="checkmark" size={16} color={colors.success} />
                <Text style={styles.lineText}>{item}</Text>
              </View>
            ))}
          </View>
          {preview > 0 ? (
            <Text style={styles.note}>
              The free preview ({preview} {q.mediaType === 'Image' ? 'panels' : 'chapters'}) stays free whether or not you buy.
            </Text>
          ) : null}

          <Text style={styles.section}>Price and access</Text>
          <View style={styles.card}>
            <Row label="Access" value="Premium · one-time purchase" />
            <Row label="Price" value={formatPrice(q.priceCents, q.currency)} strong />
            <Row label="Payment method" value={DEMO_METHOD} />
            <Row label="Stays on" value="This account only" last />
          </View>

          {failure ? (
            <View style={styles.error} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={18} color={colors.coralDark} />
              <Text style={styles.errorText}>{failure}</Text>
            </View>
          ) : null}

          <Button
            title={busy ? 'Processing demo payment…' : `Confirm demo purchase · ${formatPrice(q.priceCents, q.currency)}`}
            icon="lock-open-outline"
            variant="accent"
            fullWidth
            loading={busy}
            style={styles.gap}
            onPress={confirm}
          />
          <Button title="Not now" variant="ghost" fullWidth disabled={busy} style={styles.gap} onPress={navigation.goBack} />
          <Text style={styles.fine}>
            Demo outcome for the next purchase: {outcome === 'success' ? 'succeeds' : outcome === 'fail' ? 'fails' : 'stays pending'}. Change it under Profile &gt; Developer tools.
          </Text>
        </View>
      </>
    );
  }

  return (
    <ScreenContainer>
      <BackHeader title="Unlock story" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>
    </ScreenContainer>
  );
}

function Row({ label, value, strong, last }) {
  return (
    <View style={[styles.row, !last && styles.lineBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {typeof value === 'string' ? <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text> : value}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  pad: { paddingHorizontal: spacing.xl },
  summary: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  cover: { width: 56, height: 72, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.heading, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  section: { ...typography.heading, fontSize: 15, color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300 },
  line: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  lineBorder: { borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  lineText: { ...typography.body, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  rowLabel: { ...typography.caption, color: colors.textSecondary },
  rowValue: { ...typography.body, color: colors.textPrimary, flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  strong: { fontWeight: '800', fontSize: 18 },
  gap: { marginTop: spacing.md },
  error: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coralSoft, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  errorText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary },
  fine: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  resultIcon: { alignSelf: 'center', width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  resultTitle: { ...typography.title, textAlign: 'center', color: colors.textPrimary, marginTop: spacing.md },
  resultText: { ...typography.body, textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.md },
});
