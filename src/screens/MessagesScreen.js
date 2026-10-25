import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import IconButton from '../components/IconButton';
import FilterTabs from '../components/FilterTabs';
import EmptyState from '../components/EmptyState';
import ConversationRow from '../components/ConversationRow';
import { useMessaging } from '../context/MessagingContext';
import { LOCAL_MESSAGE_NOTICE } from '../utils/messaging';
import { colors, radius, spacing, typography } from '../theme/theme';

// Conversation list. PROTOTYPE: conversations live on this device and nobody receives what you send.
export default function MessagesScreen({ navigation }) {
  const m = useMessaging();
  const [tab, setTab] = useState('inbox');
  const list = tab === 'inbox' ? m.inbox : m.requests;

  return (
    <ScreenContainer>
      <BackHeader
        title="Messages"
        onBack={navigation.goBack}
        right={<IconButton name="create-outline" label="New message" onPress={() => navigation.openNewChat()} />}
      />
      <View style={styles.banner} accessibilityRole="alert">
        <Ionicons name="flask-outline" size={16} color={colors.coralDark} />
        <Text style={styles.bannerText}>{LOCAL_MESSAGE_NOTICE}</Text>
      </View>
      <FilterTabs
        tabs={[
          { key: 'inbox', label: 'Inbox', count: m.inbox.length },
          { key: 'requests', label: 'Requests', count: m.requests.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'requests' && m.requests.length > 0 ? (
          <View style={styles.hintCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.indigo500} />
            <Text style={styles.hint}>These people don’t match your “Who can message me” setting. Replying moves a chat to your inbox.</Text>
          </View>
        ) : null}
        {list.length === 0 ? (
          tab === 'inbox' ? (
            <EmptyState icon="chatbubbles-outline" title="No conversations yet" message="Start a local demo conversation with a storyteller or reader." actionLabel="New message" onAction={() => navigation.openNewChat()} />
          ) : (
            <EmptyState icon="mail-unread-outline" title="No message requests" message="Messages from people you don’t follow appear here when “Who can message me” is set to People I follow." />
          )
        ) : (
          list.map((c) => <ConversationRow key={c.id} conversation={c} onPress={() => navigation.openChat(c.personId)} />)
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl, paddingTop: spacing.md, flexGrow: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coralSoft, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.md },
  bannerText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo900, lineHeight: 17 },
  hintCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.violetSoft, borderRadius: radius.md, padding: spacing.md, marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  hint: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.textPrimary, lineHeight: 17 },
});
