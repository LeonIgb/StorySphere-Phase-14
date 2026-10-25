import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import SegmentedControl from '../components/SegmentedControl';
import FilterTabs from '../components/FilterTabs';
import Chip from '../components/Chip';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import DemoMoneyBanner from '../components/DemoMoneyBanner';
import StatTile from '../components/StatTile';
import RevenueBarRow from '../components/RevenueBarRow';
import StatementRow from '../components/StatementRow';
import PayoutRow from '../components/PayoutRow';
import EarningsInfoSheet from '../components/EarningsInfoSheet';
import useAsync from '../hooks/useAsync';
import { useCreator } from '../context/CreatorContext';
import { useAccount } from '../context/AccountContext';
import { earningsProvider, fetchDashboard, fetchStatement, sampleStorytellers } from '../services/earningsService';
import { DASHBOARD_PERIODS, PERIOD_LABELS, periodOf } from '../utils/analytics';
import { STATEMENT_FILTERS, formatMoney } from '../utils/earnings';
import { formatCount } from '../utils/format';
import { colors, radius, spacing, typography } from '../theme/theme';

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'payouts', label: 'Payouts' },
];
const MEDIA_NAMES = { Written: 'Written', Image: 'Image', Video: 'Video', Mixed: 'Mixed media' };
const pct = (n) => `${Math.round(n * 1000) / 10}%`;

// Creator dashboard. This screen only DISPLAYS: every number comes from the service, and money is
// formatted from integer cents with formatMoney. All calculation lives in src/utils/earnings.js,
// analytics.js and creatorDashboard.js. DEMONSTRATION data, not real money; no payout exists.
export default function CreatorDashboardScreen({ navigation, subjectId = 'me' }) {
  const { works } = useCreator();
  const { social, profile } = useAccount();
  const [subject, setSubject] = useState(subjectId);
  const [periodKey, setPeriodKey] = useState('30d');
  const [section, setSection] = useState('overview');
  const [info, setInfo] = useState(false);
  const isMe = subject === 'me';
  const samples = sampleStorytellers();
  const meRef = useRef(null);
  meRef.current = { works, followers: social.followers.length };
  const dash = useAsync(() => fetchDashboard({ subjectId: subject, period: periodKey, me: meRef.current }), [subject, periodKey, isMe ? works : null]);
  const period = periodOf(periodKey);
  const name = isMe ? profile.displayName : (samples.find((s) => s.id === subject) || {}).name;

  // ---- transactions (paged)
  const [filter, setFilter] = useState('all');
  const [stmt, setStmt] = useState({ rows: [], total: 0, hasMore: false, loading: false, error: null });
  const loadPage = useCallback(
    async (offset) => {
      setStmt((s) => ({ ...s, loading: true, error: null, rows: offset === 0 ? [] : s.rows }));
      try {
        const page = await fetchStatement({ subjectId: subject, filter, offset, limit: 15, me: meRef.current });
        setStmt((s) => ({ rows: offset === 0 ? page.rows : [...s.rows, ...page.rows], total: page.total, hasMore: page.hasMore, loading: false, error: null }));
      } catch (e) {
        setStmt((s) => ({ ...s, loading: false, error: e }));
      }
    },
    [subject, filter]
  );
  useEffect(() => {
    if (section === 'transactions') loadPage(0);
  }, [section, subject, filter, loadPage]);

  const d = dash.data;
  const lifetimeGross = d ? d.earnings.lifetime.gross : 0;
  const noEarningsMessage = isMe
    ? 'Stories you publish here have no readers or buyers in this demo, and there is no way for anyone to purchase them, so there are no earnings. Sample storytellers show how the dashboard looks with data.'
    : `${name} has no priced stories in the sample data, so there are no sales, fees or payouts to show.`;

  let body;
  if (dash.error) body = <ErrorState message={dash.error.message} onRetry={dash.reload} />;
  else if (dash.loading || !d) body = <LoadingState label="Loading your dashboard…" />;
  else if (section === 'overview') {
    const a = d.audience;
    const t = d.earnings.totals;
    body = (
      <>
        <Text style={styles.heading} accessibilityRole="header">Stories</Text>
        <View style={styles.card}>
          <Text style={styles.big}>{d.counts.published} published</Text>
          <Text style={styles.small}>
            {d.counts.free} free · {d.counts.premium} premium
            {isMe ? ` · ${d.drafts} draft${d.drafts === 1 ? '' : 's'} · ${d.scheduled} scheduled` : ''}
          </Text>
          <View style={styles.mediaRow}>
            {Object.keys(MEDIA_NAMES).map((m) => (
              <View key={m} style={styles.mediaCell}>
                <Text style={styles.mediaValue}>{d.counts.byMedia[m]}</Text>
                <Text style={styles.mediaLabel}>{MEDIA_NAMES[m]}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.heading} accessibilityRole="header">Audience · {period.label}</Text>
        {!d.hasData ? <Text style={styles.note}>Your stories have no readers in this demo, so reader numbers stay at zero. Follower growth history is not tracked in the prototype.</Text> : null}
        <View style={styles.tiles}>
          <StatTile label="VALID READS" value={formatCount(a.validReads)} change={d.audienceChange.validReads} sub={a.excludedReads > 0 ? `${formatCount(a.excludedReads)} excluded (invalid or held)` : undefined} />
          <StatTile label="UNIQUE READERS" value={formatCount(a.uniqueReaders)} change={d.audienceChange.uniqueReaders} sub={`${pct(a.completionRate)} finish`} />
          <StatTile label="FOLLOWER GROWTH" value={d.hasData ? `${a.netFollows >= 0 ? '+' : ''}${formatCount(a.netFollows)}` : '–'} change={d.audienceChange.netFollows} sub={`${d.followersNow.toLocaleString('en-US')} followers now`} />
          <StatTile label="ENGAGEMENT" value={formatCount(a.engagementActions)} change={d.audienceChange.engagementActions} sub={`${a.reviews.toLocaleString('en-US')} reviews · ${a.comments.toLocaleString('en-US')} comments · ${a.bookmarks.toLocaleString('en-US')} bookmarks · ${a.shares.toLocaleString('en-US')} shares`} />
        </View>

        <Text style={styles.heading} accessibilityRole="header">Earnings · {period.label} (demo)</Text>
        {lifetimeGross === 0 ? <Text style={styles.note}>{noEarningsMessage}</Text> : null}
        <View style={styles.tiles}>
          <StatTile label="GROSS SALES" value={formatMoney(t.gross)} sub={`${t.units.toLocaleString('en-US')} premium sale${t.units === 1 ? '' : 's'}`} />
          <StatTile label="ESTIMATED FEES" value={formatMoney(t.fees)} sub={`platform ${formatMoney(t.platformFee)} · processing ${formatMoney(t.processingFee)}`} />
          <StatTile label="REFUNDS" value={formatMoney(t.refunds)} sub={`${t.refundedUnits.toLocaleString('en-US')} refunded`} />
          <StatTile label="NET EARNINGS" value={formatMoney(t.net)} change={d.earnings.netChange} tone="net" sub="after refunds and fees" />
        </View>
      </>
    );
  } else if (section === 'revenue') {
    const t = d.earnings.totals;
    body =
      lifetimeGross === 0 ? (
        <EmptyState icon="cash-outline" title={isMe ? 'No earnings yet' : 'No premium stories'} message={noEarningsMessage} />
      ) : (
        <>
          <Text style={styles.heading} accessibilityRole="header">Earnings summary · {period.label}</Text>
          <View style={styles.card}>
            {[
              ['Gross sales', formatMoney(t.gross)],
              ['Refunds', `-${formatMoney(t.refunds)}`],
              ['Estimated platform fee', `-${formatMoney(t.platformFee)}`],
              ['Estimated processing fee', `-${formatMoney(t.processingFee)}`],
            ].map(([label, value]) => (
              <View key={label} style={styles.line}>
                <Text style={styles.lineLabel}>{label}</Text>
                <Text style={styles.lineValue}>{value}</Text>
              </View>
            ))}
            <View style={[styles.line, styles.lineTotal]}>
              <Text style={[styles.lineLabel, { fontWeight: '800' }]}>Net earnings</Text>
              <Text style={[styles.lineValue, { color: colors.successText }]}>{formatMoney(t.net)}</Text>
            </View>
          </View>

          <Text style={styles.heading} accessibilityRole="header">By media type</Text>
          <View style={styles.card}>
            {d.byMedia.map((r) => (
              <RevenueBarRow key={r.mediaType} label={MEDIA_NAMES[r.mediaType]} share={r.share} netText={formatMoney(r.net)} detail={`${r.units.toLocaleString('en-US')} sales · ${formatMoney(r.gross)} gross`} muted={r.net === 0} />
            ))}
          </View>

          <Text style={styles.heading} accessibilityRole="header">By story</Text>
          <View style={styles.card}>
            {d.byStory.map((r) => (
              <RevenueBarRow
                key={r.workId}
                label={r.title}
                meta={`${MEDIA_NAMES[r.mediaType]} · ${r.access === 'Premium' ? formatMoney(r.priceCents) : 'Free story'}`}
                share={r.share}
                netText={formatMoney(r.net)}
                detail={r.access === 'Premium' ? `${r.units.toLocaleString('en-US')} sales · ${formatMoney(r.gross)} gross · ${formatMoney(r.fees)} fees` : 'no sales'}
                muted={r.net === 0}
              />
            ))}
          </View>
        </>
      );
  } else if (section === 'transactions') {
    body = (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          {STATEMENT_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} style={styles.chip} />
          ))}
        </ScrollView>
        {stmt.error ? (
          <ErrorState message={stmt.error.message} onRetry={() => loadPage(0)} />
        ) : stmt.loading && stmt.rows.length === 0 ? (
          <LoadingState label="Loading transactions…" />
        ) : stmt.total === 0 ? (
          <EmptyState icon="receipt-outline" title="No transactions" message={lifetimeGross === 0 ? noEarningsMessage : 'Nothing matches this filter.'} actionLabel={filter !== 'all' ? 'Show all' : undefined} onAction={filter !== 'all' ? () => setFilter('all') : undefined} />
        ) : (
          <>
            <Text style={styles.summary} accessibilityLiveRegion="polite">Showing {stmt.rows.length} of {stmt.total.toLocaleString('en-US')}</Text>
            {stmt.rows.map((r) => <StatementRow key={r.id} row={r} />)}
            {stmt.hasMore ? (
              <Button title={stmt.loading ? 'Loading…' : 'Load more'} variant="secondary" disabled={stmt.loading} onPress={() => loadPage(stmt.rows.length)} style={styles.more} />
            ) : null}
          </>
        )}
      </>
    );
  } else {
    const b = d.balances;
    body = (
      <>
        <Text style={styles.heading} accessibilityRole="header">Balance (demo)</Text>
        <View style={styles.card}>
          {[
            ['Clearing', b.clearing, `held for ${d.schedule.holdDays} days after a sale`],
            ['Cleared, awaiting next run', b.cleared, 'included in the next demo run'],
            ['Held for review', b.held, 'paused by a confirmed rule violation'],
            ['Paid out (demo)', b.paidOut, 'label only, no money moved'],
          ].map(([label, cents, hint]) => (
            <View key={label} style={styles.balanceRow} accessible accessibilityLabel={`${label}, ${formatMoney(cents)}, ${hint}`}>
              <View style={styles.names}>
                <Text style={styles.lineLabel}>{label}</Text>
                <Text style={styles.small}>{hint}</Text>
              </View>
              <Text style={styles.lineValue}>{formatMoney(cents)}</Text>
            </View>
          ))}
          <View style={[styles.line, styles.lineTotal]}>
            <Text style={[styles.lineLabel, { fontWeight: '800' }]}>Total net earnings</Text>
            <Text style={[styles.lineValue, { color: colors.successText }]}>{formatMoney(d.balanceTotal)}</Text>
          </View>
        </View>
        <Text style={styles.note}>No payout is available. This is a prototype: nothing can be withdrawn, no payout method can be added, and no money is ever sent.</Text>

        {d.payouts.length === 0 && !d.upcoming ? (
          <EmptyState icon="swap-vertical-outline" title="No payout runs" message={lifetimeGross === 0 ? noEarningsMessage : 'There are no demo payout runs yet.'} />
        ) : (
          <>
            {d.upcoming ? (
              <>
                <Text style={styles.heading} accessibilityRole="header">Upcoming</Text>
                <PayoutRow payout={d.upcoming} />
              </>
            ) : null}
            <Text style={styles.heading} accessibilityRole="header">Past demo runs</Text>
            {d.payouts.length === 0 ? <Text style={styles.note}>None yet.</Text> : d.payouts.map((p) => <PayoutRow key={p.id} payout={p} />)}
            {d.carriedCents > 0 ? <Text style={styles.note}>{formatMoney(d.carriedCents)} was below the demo minimum and carried to the next run.</Text> : null}
          </>
        )}
      </>
    );
  }

  return (
    <ScreenContainer>
      <BackHeader title="Creator dashboard" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DemoMoneyBanner />
        <Text style={styles.label}>Viewing</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          <Chip label="You" selected={isMe} onPress={() => setSubject('me')} />
          {samples.map((s) => (
            <Chip key={s.id} label={s.name} selected={subject === s.id} onPress={() => setSubject(s.id)} style={styles.chip} />
          ))}
        </ScrollView>
        {!isMe ? <Text style={styles.sample}>Sample storyteller data. Not real reader activity or money.</Text> : null}
        <Pressable onPress={() => setInfo(true)} accessibilityRole="button" accessibilityLabel="How earnings are calculated" style={styles.link}>
          <Ionicons name="information-circle-outline" size={18} color={colors.violet} />
          <Text style={styles.linkText}>How earnings are calculated</Text>
        </Pressable>
        <FilterTabs tabs={SECTIONS} value={section} onChange={setSection} />
        {section === 'overview' || section === 'revenue' ? (
          <View style={styles.periodWrap}>
            <SegmentedControl options={PERIOD_LABELS} value={period.label} onChange={(l) => setPeriodKey(DASHBOARD_PERIODS.find((p) => p.label === l).key)} />
          </View>
        ) : null}
        {body}
      </ScrollView>
      <EarningsInfoSheet visible={info} onClose={() => setInfo(false)} schedule={earningsProvider.schedule} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xxl * 2 },
  label: { ...typography.micro, color: colors.textSecondary, marginTop: spacing.md },
  chipScroll: { flexGrow: 0, minHeight: 48 },
  chips: { paddingVertical: spacing.sm, alignItems: 'center' },
  chip: { marginLeft: spacing.sm },
  sample: { ...typography.caption, color: colors.coralText, marginBottom: spacing.xs },
  link: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginVertical: spacing.xs },
  linkText: { ...typography.caption, fontWeight: '700', color: colors.violetText, marginLeft: spacing.xs },
  periodWrap: { marginTop: spacing.md },
  heading: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.md },
  big: { ...typography.title, color: colors.textPrimary },
  small: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  mediaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  mediaCell: { alignItems: 'center', flex: 1 },
  mediaValue: { ...typography.heading, color: colors.indigo700 },
  mediaLabel: { ...typography.caption, fontSize: 12, color: colors.textSecondary },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lineLabel: { ...typography.body, color: colors.textPrimary },
  lineValue: { ...typography.body, fontWeight: '700', color: colors.indigo700 },
  lineTotal: { borderTopWidth: 1, borderTopColor: colors.cream300, marginTop: spacing.xs, paddingTop: spacing.md },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  names: { flex: 1, marginRight: spacing.sm },
  summary: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  more: { marginTop: spacing.sm },
});
