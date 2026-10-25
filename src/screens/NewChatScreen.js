import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import SearchBar from '../components/SearchBar';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import CreatorAvatar from '../components/CreatorAvatar';
import { useAccount } from '../context/AccountContext';
import { useMessaging } from '../context/MessagingContext';
import { PEOPLE } from '../data/messaging';
import { colors, spacing, typography } from '../theme/theme';

// Pick someone to message. A person whose own setting blocks the chat is listed but disabled, with the reason.
export default function NewChatScreen({ navigation }) {
  const { social } = useAccount();
  const m = useMessaging();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    const following = social ? social.following : [];
    const followers = social ? social.followers : [];
    const all = PEOPLE.filter((p) => p.id !== 'me' && (!q || p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q)));
    const a = all.filter((p) => following.includes(p.id));
    const b = all.filter((p) => !following.includes(p.id) && followers.includes(p.id));
    const c = all.filter((p) => !following.includes(p.id) && !followers.includes(p.id));
    return [
      { title: 'People you follow', items: a },
      { title: 'Your followers', items: b },
      { title: 'Everyone else', items: c },
    ].filter((s) => s.items.length > 0);
  }, [social, q]);

  const open = (p) => {
    const res = m.startConversation(p.id);
    if (!res.ok) return;
    navigation.openChat(p.id);
  };

  return (
    <ScreenContainer>
      <BackHeader title="New message" onBack={navigation.goBack} />
      <View style={styles.search}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search people" />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {sections.length === 0 ? <EmptyState icon="search-outline" title="No one found" message="Try a different name or handle." /> : null}
        {sections.map((s) => (
          <View key={s.title}>
            <SectionHeader title={s.title} />
            {s.items.map((p) => {
              const blocked = m.isBlocked(p.id);
              const policy = m.policyFor(p.id);
              const reason = blocked ? 'You blocked this person' : policy.ok ? '' : policy.message;
              const disabled = Boolean(reason);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => open(p)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name}${reason ? `, unavailable: ${reason}` : ''}`}
                  accessibilityState={{ disabled }}
                  style={({ pressed }) => [styles.row, disabled && { opacity: 0.55 }, pressed && { opacity: 0.85 }]}
                >
                  <CreatorAvatar creator={p} size={44} />
                  <View style={styles.text}>
                    <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.meta} numberOfLines={2}>{reason || p.handle}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  content: { paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  text: { flex: 1, marginHorizontal: spacing.md },
  name: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
