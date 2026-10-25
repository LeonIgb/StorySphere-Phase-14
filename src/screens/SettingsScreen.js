import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import SectionHeader from '../components/SectionHeader';
import ToggleRow from '../components/ToggleRow';
import ConfirmSheet from '../components/ConfirmSheet';
import DemoBadge from '../components/DemoBadge';
import BackendStatusCard from '../components/BackendStatusCard';
import CloudMediaCard from '../components/CloudMediaCard';
import { useAccount } from '../context/AccountContext';
import { useReading } from '../context/ReadingContext';
import { useNotice } from '../context/NoticeContext';
import { useMessaging } from '../context/MessagingContext';
import { MESSAGE_PRIVACY } from '../utils/messaging';
import { pushProvider } from '../services/pushService';
import { colors, radius, spacing, typography } from '../theme/theme';

function LinkRow({ icon, label, hint, onPress, last, danger }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, !last && styles.border, pressed && { opacity: 0.8 }]}
    >
      <Ionicons name={icon} size={22} color={danger ? colors.coralDark : colors.indigo500} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: colors.coralText }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.indigo300} />
    </Pressable>
  );
}

// Account, notification, privacy and history settings. Everything is saved to this account on this device.
export default function SettingsScreen({ navigation }) {
  const { user, isDemo, prefs, setPref, signOut, deleteAccount, resetDemo, storageMode, sync } = useAccount();
  const { clearHistory } = useReading();
  const { showNotice } = useNotice();
  const { blockedPeople } = useMessaging();
  const [push, setPush] = useState({ title: 'Push notifications are not active', detail: 'Checking…' });
  useEffect(() => {
    let alive = true;
    pushProvider.getStatus().then((st) => alive && setPush(st));
    return () => {
      alive = false;
    };
  }, []);
  const [confirm, setConfirm] = useState(null); // 'signout' | 'delete' | 'reset' | 'history'

  const run = async () => {
    const c = confirm;
    setConfirm(null);
    if (c === 'signout') await signOut();
    if (c === 'delete') {
      const res = await deleteAccount();
      if (res && !res.ok) showNotice('Couldn’t delete the account', `${res.error || 'Something went wrong.'} Nothing was removed. Please try again.`, 'cloud-offline-outline');
    }
    if (c === 'reset') {
      resetDemo();
      showNotice('Demo profile reset', 'Profile, preferences and follows are back to the sample.', 'refresh-outline');
    }
    if (c === 'history') clearHistory();
  };

  const dialogs = {
    signout: { title: 'Sign out?', message: 'Your profile, library and stories stay saved on this device for next time.', label: 'Sign out', destructive: false, icon: 'log-out-outline' },
    delete: { title: 'Delete this account?', message: 'Your profile, preferences, follows, library, history and every story you created are permanently removed from this device.', label: 'Delete account', destructive: true, icon: 'trash-outline' },
    reset: { title: 'Reset the demo profile?', message: 'Your edits to Zara’s profile, preferences and follows are replaced with the original sample. Stories you created in demo mode are kept.', label: 'Reset profile', destructive: true, icon: 'refresh-outline' },
    history: { title: 'Clear your history?', message: 'This removes your reading and viewing history, your place in every story and your recently viewed list. Saved stories, favorites and purchases are kept.', label: 'Clear history', destructive: true, icon: 'trash-outline' },
  };
  const dialog = confirm ? dialogs[confirm] : null;

  return (
    <ScreenContainer>
      <BackHeader title="Settings & privacy" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.account}>
          {isDemo ? <DemoBadge /> : null}
          <Text style={styles.accountTitle}>{isDemo ? 'Demo mode' : user.email}</Text>
          <Text style={styles.accountNote}>
            {isDemo
              ? 'You’re using a sample profile. Changes are saved on this device only.'
              : user && user.backend
                ? 'Signed in with your online account.'
                : 'Signed in on this device only.'}
          </Text>
        </View>

        {user && user.backend ? (
          <View style={styles.security}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.indigo800} />
            <Text style={styles.securityText}>
              This is an online account. Your sign-in and profile are handled by the service. Your library, history,
              follows and stories are still saved on this device only. {storageMode === 'memory' ? 'This runtime also has no device storage, so local data is lost on reload.' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.security}>
            <Ionicons name="shield-outline" size={20} color={colors.indigo800} />
            <Text style={styles.securityText}>
              Prototype accounts are NOT secure. Sign-in is simulated on this device, passwords are not protected like a
              real service, and nothing is sent to a server. {storageMode === 'memory' ? 'This runtime also has no device storage, so everything is lost on reload.' : ''}
            </Text>
          </View>
        )}

        <SectionHeader title="Online service" />
        <BackendStatusCard sync={user && user.backend ? sync : null} />
        <CloudMediaCard onOpenLibrary={() => navigation.openMediaLibrary()} />

        <SectionHeader title="Profile" />
        <View style={styles.list}>
          <LinkRow icon="person-circle-outline" label="Edit profile" hint="Name, bio, photo, genres" onPress={() => navigation.openEditProfile()} />
          <LinkRow icon="options-outline" label="Reading preferences" hint="Reader theme, text size, genres, formats" onPress={() => navigation.openPreferences()} />
          <LinkRow icon="eye-outline" label="View my public profile" hint="See what other people see" onPress={() => navigation.openCreator('me')} last />
        </View>

        <SectionHeader title="Notifications" />
        <View style={styles.list}>
          <ToggleRow icon="book-outline" label="New chapters" hint="From storytellers you follow" value={prefs.notifyNewChapters} onValueChange={(v) => setPref('notifyNewChapters', v)} />
          <ToggleRow icon="person-add-outline" label="New followers" value={prefs.notifyFollowers} onValueChange={(v) => setPref('notifyFollowers', v)} />
          <ToggleRow icon="chatbubble-outline" label="Replies and comments" hint="On your stories and comments" value={prefs.notifyComments} onValueChange={(v) => setPref('notifyComments', v)} />
          <ToggleRow icon="chatbubble-ellipses-outline" label="Messages" hint="New private messages" value={prefs.notifyMessages} onValueChange={(v) => setPref('notifyMessages', v)} />
          <ToggleRow icon="receipt-outline" label="Purchases" hint="Demo purchase status updates" value={prefs.notifyPurchases} onValueChange={(v) => setPref('notifyPurchases', v)} />
          <ToggleRow icon="megaphone-outline" label="StorySphere news" value={prefs.notifyNews} onValueChange={(v) => setPref('notifyNews', v)} last />
        </View>
        <Text style={styles.footnote}>These choices are saved and decide what appears in your notification center. Notifications here are simulated from local data. This prototype doesn’t send push notifications or emails.</Text>
        <View style={[styles.list, styles.pushCard]} accessibilityLabel={`${push.title}. ${push.detail}`}>
          <View style={styles.row}>
            <Ionicons name="notifications-off-outline" size={22} color={colors.indigo500} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{push.title}</Text>
              <Text style={styles.rowHint}>{push.detail}</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="Messages" />
        <View style={styles.list}>
          <Text style={styles.groupLabel}>Who can message me</Text>
          {MESSAGE_PRIVACY.map((opt, i) => {
            const selected = prefs.messagesFrom === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setPref('messagesFrom', opt.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                accessibilityLabel={`${opt.label}. ${opt.hint}`}
                style={({ pressed }) => [styles.row, styles.border, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.indigo900 : colors.indigo300} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{opt.label}</Text>
                  <Text style={styles.rowHint}>{opt.hint}</Text>
                </View>
              </Pressable>
            );
          })}
          <LinkRow icon="ban-outline" label="Blocked people" hint={blockedPeople.length === 0 ? 'No one is blocked' : `${blockedPeople.length} blocked`} onPress={() => navigation.openBlocked()} />
          <LinkRow icon="chatbubble-ellipses-outline" label="Open messages" hint="Local demo conversations" onPress={() => navigation.openMessages()} last />
        </View>
        <Text style={styles.footnote}>Messages are saved on this device only. Nobody receives what you send, and this setting is applied by the app itself, not by a server.</Text>

        <SectionHeader title="Community" />
        <View style={styles.list}>
          <LinkRow icon="notifications-outline" label="Notification center" hint="New chapters, replies and followers" onPress={() => navigation.openNotifications()} />
          <LinkRow icon="flag-outline" label="My reports (prototype)" hint="Reports you filed. Not reviewed by anyone" onPress={() => navigation.openReports()} last />
        </View>

        <SectionHeader title="Privacy" />
        <View style={styles.list}>
          <ToggleRow icon="globe-outline" label="Public profile" hint="Off hides your profile page and Discover listing. Published stories stay public." value={prefs.profilePublic} onValueChange={(v) => setPref('profilePublic', v)} />
          <ToggleRow icon="people-outline" label="Show followers and following" hint="Let others open your lists" value={prefs.showFollowLists} disabled={!prefs.profilePublic} onValueChange={(v) => setPref('showFollowLists', v)} />
          <ToggleRow icon="reader-outline" label="Show what I’m reading" hint="Recent reading on your public profile" value={prefs.showReadingActivity} disabled={!prefs.profilePublic} onValueChange={(v) => setPref('showReadingActivity', v)} last />
        </View>

        <SectionHeader title="Reading history" />
        <View style={styles.list}>
          <ToggleRow icon="time-outline" label="Keep reading history" hint="Off stops recording new reading, and Continue reading with it" value={prefs.saveHistory} onValueChange={(v) => setPref('saveHistory', v)} />
          <LinkRow icon="list-outline" label="View history" onPress={() => navigation.openHistory()} />
          <LinkRow icon="trash-outline" label="Clear history" onPress={() => setConfirm('history')} last danger />
        </View>

        <SectionHeader title="Account" />
        <View style={styles.list}>
          <LinkRow icon="log-out-outline" label="Sign out" onPress={() => setConfirm('signout')} />
          {isDemo ? (
            <LinkRow icon="refresh-outline" label="Reset demo profile" hint="Restore the original sample profile" onPress={() => setConfirm('reset')} last danger />
          ) : (
            <LinkRow icon="trash-outline" label="Delete account" hint={user && user.backend ? 'Deletes your online account and this device’s data' : 'Removes everything from this device'} onPress={() => setConfirm('delete')} last danger />
          )}
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={Boolean(confirm)}
        title={dialog ? dialog.title : ''}
        message={dialog ? dialog.message : ''}
        confirmLabel={dialog ? dialog.label : 'Confirm'}
        destructive={dialog ? dialog.destructive : false}
        icon={dialog ? dialog.icon : undefined}
        onConfirm={run}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  account: { alignItems: 'center', backgroundColor: colors.indigo900, borderRadius: radius.xl, marginHorizontal: spacing.xl, padding: spacing.xl },
  accountTitle: { ...typography.heading, color: colors.textOnDark, marginTop: spacing.sm },
  accountNote: { ...typography.caption, color: colors.textOnDarkMuted, textAlign: 'center', marginTop: 4 },
  security: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.indigo100, borderRadius: radius.md, padding: spacing.md, margin: spacing.xl, marginBottom: 0 },
  securityText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo800, lineHeight: 18 },
  list: { backgroundColor: colors.cream50, borderRadius: radius.lg, marginHorizontal: spacing.xl, borderWidth: 1, borderColor: colors.cream300 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg },
  border: { borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  rowText: { flex: 1, marginHorizontal: spacing.md },
  rowLabel: { ...typography.body, color: colors.textPrimary },
  rowHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  pushCard: { marginTop: spacing.md },
  groupLabel: { ...typography.caption, fontWeight: '700', color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  footnote: { ...typography.caption, color: colors.textSecondary, marginHorizontal: spacing.xl, marginTop: spacing.sm },
});
