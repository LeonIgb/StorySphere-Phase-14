import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import IconButton from '../components/IconButton';
import CreatorAvatar from '../components/CreatorAvatar';
import MessageBubble from '../components/MessageBubble';
import AttachmentSheet from '../components/AttachmentSheet';
import ConfirmSheet from '../components/ConfirmSheet';
import ReportSheet from '../components/ReportSheet';
import ActionLink from '../components/ActionLink';
import MediaThumb from '../components/MediaThumb';
import { useMessaging } from '../context/MessagingContext';
import { useCommunity } from '../context/CommunityContext';
import { LOCAL_MESSAGE_NOTICE, MESSAGE_LIMITS, groupByDay, validateMessage } from '../utils/messaging';
import { PEOPLE_BY_ID } from '../data/messaging';
import { newId } from '../utils/creator';
import { colors, radius, spacing, typography } from '../theme/theme';

// One-to-one chat. PROTOTYPE: messages are stored on this device. "Saved on this device" is the most
// a message ever reports; replies marked "Simulated" are scripted by the app, not written by that person.
export default function ChatScreen({ personId, navigation }) {
  const m = useMessaging();
  const community = useCommunity();
  const person = PEOPLE_BY_ID[personId];
  const scrollRef = useRef(null);
  const clientRef = useRef(newId('cid'));
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'block' | 'unblock' | 'clear'
  const [reportTarget, setReportTarget] = useState(null);
  const [sending, setSending] = useState(false);

  const { startConversation, setActive, markRead } = m;
  useEffect(() => {
    startConversation(personId);
    setActive(personId);
    markRead(personId);
    return () => setActive(null);
  }, [personId, startConversation, setActive, markRead]);

  const messages = m.messagesFor(personId);
  const conversation = m.conversationFor(personId);
  const blocked = m.isBlocked(personId);
  const policy = m.policyFor(personId);
  const typing = m.isTyping(personId);
  const groups = useMemo(() => groupByDay(messages), [messages]);
  const isRequest = conversation && conversation.state === 'request';

  // Keep the newest message in view, and clear unread while this chat is open.
  useEffect(() => {
    if (conversation && conversation.unread > 0) markRead(personId);
    const t = setTimeout(() => scrollRef.current && scrollRef.current.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length, typing, conversation && conversation.unread, personId, markRead]);

  const send = useCallback(async () => {
    if (sending) return;
    const problem = validateMessage({ text, attachment });
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setSending(true);
    const res = await m.sendMessage({ personId, text, attachment, clientId: clientRef.current });
    setSending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setText('');
    setAttachment(null);
    clientRef.current = newId('cid');
  }, [sending, text, attachment, m, personId]);

  if (!person) {
    return (
      <ScreenContainer>
        <BackHeader title="Chat" onBack={navigation.goBack} />
        <Text style={styles.unavailable}>This person isn’t available.</Text>
      </ScreenContainer>
    );
  }

  const composerBlockedReason = blocked ? 'You blocked this person. Unblock them to send a message.' : !policy.ok ? policy.message : '';
  const menuItems = [
    { key: 'profile', icon: 'person-outline', label: 'View profile', run: () => navigation.openCreator(personId) },
    { key: 'report', icon: 'flag-outline', label: 'Report user', run: () => setReportTarget({ type: 'user', id: personId, label: `${person.name} (${person.handle})`, ownerId: personId }) },
    blocked
      ? { key: 'unblock', icon: 'shield-outline', label: 'Unblock', run: () => setConfirm('unblock') }
      : { key: 'block', icon: 'ban-outline', label: 'Block', run: () => setConfirm('block'), danger: true },
    { key: 'clear', icon: 'trash-outline', label: 'Delete conversation', run: () => setConfirm('clear'), danger: true },
  ];
  const confirmCopy = {
    block: { title: `Block ${person.name}?`, message: 'They won’t be able to start or continue a chat with you, and the conversation moves out of your inbox. You can unblock them in Settings.', label: 'Block', icon: 'ban-outline', destructive: true },
    unblock: { title: `Unblock ${person.name}?`, message: 'They will be able to message you again, subject to your privacy setting.', label: 'Unblock', icon: 'shield-outline' },
    clear: { title: 'Delete this conversation?', message: 'The messages are removed from this device. This can’t be undone.', label: 'Delete', icon: 'trash-outline', destructive: true },
  }[confirm || 'clear'];

  const runConfirm = () => {
    if (confirm === 'block') {
      m.block(personId);
    } else if (confirm === 'unblock') {
      m.unblock(personId);
    } else if (confirm === 'clear') {
      m.clearConversation(personId);
      setConfirm(null);
      navigation.goBack();
      return;
    }
    setConfirm(null);
  };

  const canSend = !composerBlockedReason && !sending && (text.trim().length > 0 || attachment);

  return (
    <ScreenContainer>
      <BackHeader
        title={person.name}
        onBack={navigation.goBack}
        right={<IconButton name="ellipsis-horizontal" label="Conversation options" onPress={() => setMenuOpen((v) => !v)} />}
      />
      {menuOpen ? (
        <View style={styles.menu} accessibilityRole="menu">
          {menuItems.map((it) => (
            <Pressable
              key={it.key}
              accessibilityRole="menuitem"
              accessibilityLabel={it.label}
              onPress={() => {
                setMenuOpen(false);
                it.run();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name={it.icon} size={18} color={it.danger ? colors.coralDark : colors.indigo900} />
              <Text style={[styles.menuText, it.danger && { color: colors.coralText }]}>{it.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.banner} accessibilityRole="alert">
            <Ionicons name="flask-outline" size={15} color={colors.indigo900} />
            <Text style={styles.bannerText}>{LOCAL_MESSAGE_NOTICE}</Text>
          </View>
          {isRequest ? (
            <View style={styles.request}>
              <Text style={styles.requestText}>{person.name} isn’t someone you follow, so this is a message request. Replying moves it to your inbox.</Text>
            </View>
          ) : null}
          <View style={styles.intro}>
            <CreatorAvatar creator={person} size={56} />
            <Text style={styles.introName}>{person.name}</Text>
            <Text style={styles.introHandle}>{person.handle}</Text>
          </View>
          {messages.length === 0 ? <Text style={styles.empty}>No messages yet. Say hello below.</Text> : null}
          {groups.map((g) => (
            <View key={g.key}>
              <Text style={styles.day}>{g.label}</Text>
              {g.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  hidden={msg.senderId !== 'me' && community.isHidden(`message:${msg.id}`)}
                  onToggleHidden={() => community.toggleHidden(`message:${msg.id}`)}
                  onRetry={() => Promise.resolve(m.retryMessage(personId, msg.id)).then((r) => !r.ok && setError(r.message))}
                  onReport={() => setReportTarget({ type: 'message', id: `message:${msg.id}`, label: `Message from ${person.name}`, ownerId: msg.senderId })}
                  onOpenStory={(id) => navigation.openStory(id)}
                />
              ))}
            </View>
          ))}
          {typing ? <Text style={styles.typing} accessibilityLiveRegion="polite">{person.name.split(' ')[0]} is typing… (simulated)</Text> : null}
        </ScrollView>

        {composerBlockedReason ? (
          <View style={styles.blockedBar}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.blockedText}>{composerBlockedReason}</Text>
            {blocked ? <ActionLink label="Unblock" onPress={() => setConfirm('unblock')} accessibilityLabel="Unblock this person" /> : null}
          </View>
        ) : (
          <View style={styles.composer}>
            {attachment ? (
              <View style={styles.pending}>
                {attachment.kind === 'image' ? <MediaThumb uri={attachment.uri} width={44} height={44} style={styles.pendingThumb} /> : <Ionicons name="book-outline" size={22} color={colors.indigo700} />}
                <Text style={styles.pendingText} numberOfLines={1}>{attachment.kind === 'image' ? `Photo: ${attachment.name}` : `Story: ${attachment.title}`}</Text>
                <IconButton name="close" label="Remove attachment" size={16} onPress={() => setAttachment(null)} style={styles.pendingClose} />
              </View>
            ) : null}
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <View style={styles.inputRow}>
              <IconButton name="attach" label="Attach" onPress={() => setAttachOpen(true)} style={styles.sideBtn} />
              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  if (error) setError('');
                }}
                placeholder="Write a message"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={MESSAGE_LIMITS.textMax}
                accessibilityLabel="Message"
                style={styles.input}
              />
              <Pressable
                onPress={send}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                hitSlop={4}
                accessibilityState={{ disabled: !canSend }}
                style={[styles.send, !canSend && { opacity: 0.4 }]}
              >
                <Ionicons name="send" size={18} color={colors.textOnDark} />
              </Pressable>
            </View>
            {text.length > MESSAGE_LIMITS.textMax * 0.8 ? <Text style={styles.count}>{text.length}/{MESSAGE_LIMITS.textMax}</Text> : null}
          </View>
        )}
      </KeyboardAvoidingView>

      <AttachmentSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onPick={(a) => {
          setAttachment(a);
          setError('');
          setAttachOpen(false);
        }}
      />
      <ConfirmSheet
        visible={Boolean(confirm)}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.label}
        icon={confirmCopy.icon}
        destructive={Boolean(confirmCopy.destructive)}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  unavailable: { ...typography.body, textAlign: 'center', marginTop: spacing.xxl, color: colors.textSecondary },
  thread: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.coral, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md },
  bannerText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, fontSize: 11, color: colors.indigo950, lineHeight: 15 },
  request: { backgroundColor: colors.cream200, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  requestText: { ...typography.caption, color: colors.textPrimary },
  intro: { alignItems: 'center', marginVertical: spacing.lg },
  introName: { ...typography.heading, marginTop: spacing.sm, color: colors.textPrimary },
  introHandle: { ...typography.caption, color: colors.textSecondary },
  empty: { ...typography.caption, textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.lg },
  day: { ...typography.micro, textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.md },
  typing: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.sm },
  menu: { position: 'absolute', top: 58, right: spacing.xl, zIndex: 20, backgroundColor: colors.cream50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cream300, paddingVertical: 4, minWidth: 190, elevation: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: spacing.lg },
  menuText: { ...typography.body, marginLeft: spacing.md, color: colors.textPrimary },
  composer: { borderTopWidth: 1, borderTopColor: colors.cream200, backgroundColor: colors.cream50, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  sideBtn: { marginRight: spacing.sm },
  input: { flex: 1, maxHeight: 110, minHeight: 40, backgroundColor: colors.cream200, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10, color: colors.textPrimary, ...typography.body },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.indigo900, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  count: { ...typography.caption, fontSize: 11, textAlign: 'right', color: colors.textSecondary, marginTop: 2 },
  error: { ...typography.caption, color: colors.coralText, marginBottom: spacing.xs, marginLeft: spacing.sm },
  pending: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cream200, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
  pendingThumb: { borderRadius: radius.sm },
  pendingText: { ...typography.caption, flex: 1, marginHorizontal: spacing.sm, color: colors.textPrimary },
  pendingClose: { width: 28, height: 28 },
  blockedBar: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.cream200, backgroundColor: colors.cream50 },
  blockedText: { ...typography.caption, flex: 1, marginHorizontal: spacing.sm, color: colors.textSecondary },
});
