import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import FilterTabs from '../components/FilterTabs';
import EmptyState from '../components/EmptyState';
import ActionLink from '../components/ActionLink';
import { useCommunity } from '../context/CommunityContext';
import { NOTIFICATION_TABS, filterNotifications, timeAgoFrom } from '../utils/community';
import { colors, radius, spacing, typography } from '../theme/theme';

const ICONS = { chapter: 'book-outline', reply: 'chatbubble-ellipses-outline', follower: 'person-add-outline', news: 'megaphone-outline', sent: 'paper-plane-outline', message: 'chatbubble-outline', purchase: 'receipt-outline' };

const EMPTY = {
  all: ['No activity yet', 'Follow storytellers to hear about new chapters, and join a discussion to get replies.'],
  unread: ['You’re all caught up', 'Nothing new right now.'],
  chapter: ['No new chapters', 'When storytellers you follow post a chapter or a story, it shows up here. Turn this on under Settings > Notifications.'],
  reply: ['No replies yet', 'Replies to your comments appear here.'],
  follower: ['No new followers', 'People who follow you appear here.'],
  message: ['No message notifications', 'New private messages appear here. Open Messages to start a local demo chat.'],
  purchase: ['No purchase updates', 'Demo purchase status updates appear here. No real payments are made.'],
};

// Community activity: new chapters from people you follow, replies to your comments, new
// followers and announcements you sent. Derived from the same data as the rest of the app.
// PROTOTYPE: nothing is pushed to your phone; this list is built when you open the app.
export default function NotificationsScreen({ navigation }) {
  const { notifications, unread, markRead, markAllRead, dismiss } = useCommunity();
  const [tab, setTab] = useState('all');
  const tabs = NOTIFICATION_TABS.map((t) => ({ ...t, count: t.key === 'unread' ? unread : undefined }));
  const shown = filterNotifications(notifications, tab);

  const open = (n) => {
    markRead(n.id);
    if (n.type === 'chapter') {
      if (n.chapter !== null && n.chapter !== undefined) navigation.openReader(n.storyId, n.chapter);
      else navigation.openStory(n.storyId);
    } else if (n.type === 'reply') navigation.openComments(n.storyId, n.chapter === null ? undefined : n.chapter);
    else if (n.type === 'follower') navigation.openCreator(n.actorId);
    else if (n.type === 'sent') navigation.openStory(n.storyId);
    else if (n.type === 'message') navigation.openChat(n.personId);
    else if (n.type === 'purchase') navigation.openReceipt(n.txId);
  };

  return (
    <ScreenContainer>
      <BackHeader
        title="Notifications"
        onBack={navigation.goBack}
        right={unread > 0 ? <ActionLink label="Mark all read" onPress={markAllRead} accessibilityLabel="Mark all notifications read" /> : null}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="flask-outline" size={18} color={colors.indigo900} />
          <Text style={styles.bannerText}>Prototype: these notifications are simulated on your device from sample data (people you follow, comments, local demo messages and demo purchases). Push notifications are not active and no emails are sent.</Text>
        </View>
        <FilterTabs tabs={tabs} value={tab} onChange={setTab} />
        <View style={styles.spacer} />
        {shown.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title={EMPTY[tab][0]}
            message={EMPTY[tab][1]}
            actionLabel={tab === 'chapter' ? 'Notification settings' : tab === 'message' ? 'Open messages' : tab === 'purchase' ? 'Purchases' : 'Find storytellers'}
            onAction={() => (tab === 'chapter' ? navigation.openSettings() : tab === 'message' ? navigation.openMessages() : tab === 'purchase' ? navigation.openPurchases() : navigation.navigate('Discover'))}
          />
        ) : (
          shown.map((n) => (
            <View key={n.id} style={[styles.card, !n.read && styles.unread]}>
              <Pressable
                onPress={() => open(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}`}
                style={styles.main}
              >
                <View style={[styles.icon, !n.read && { backgroundColor: colors.coralSoft }]}>
                  <Ionicons name={ICONS[n.type] || 'notifications-outline'} size={20} color={n.read ? colors.indigo500 : colors.coralDark} />
                </View>
                <View style={styles.text}>
                  <Text style={styles.title}>{n.title}</Text>
                  {n.body ? <Text style={styles.body} numberOfLines={3}>{n.body}</Text> : null}
                  {n.subtitle ? <Text style={styles.meta}>on {n.subtitle}</Text> : null}
                  <View style={styles.footer}>
                    <Text style={styles.meta}>{timeAgoFrom(n.at)}{n.label ? ` · ${n.label}` : ''}</Text>
                    {n.actionLabel ? <Text style={styles.action}>{n.actionLabel}</Text> : null}
                  </View>
                </View>
                {!n.read ? <View style={styles.dot} /> : null}
              </Pressable>
              <Pressable onPress={() => dismiss(n.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Dismiss notification: ${n.title}`} style={styles.close}>
                <Ionicons name="close" size={18} color={colors.indigo300} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  spacer: { height: spacing.md },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coral, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  bannerText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo950, lineHeight: 17 },
  card: { flexDirection: 'row', backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  unread: { borderColor: colors.coral },
  main: { flex: 1, flexDirection: 'row', padding: spacing.md },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.violetSoft, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  body: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  meta: { ...typography.caption, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  action: { ...typography.caption, fontWeight: '700', color: colors.coralText },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.coral, marginLeft: spacing.sm, marginTop: 4 },
  close: { padding: spacing.md },
});
