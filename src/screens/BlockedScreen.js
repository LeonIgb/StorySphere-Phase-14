import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
import CreatorAvatar from '../components/CreatorAvatar';
import Button from '../components/Button';
import ConfirmSheet from '../components/ConfirmSheet';
import { useMessaging } from '../context/MessagingContext';
import { colors, spacing, typography } from '../theme/theme';

// People you blocked. Blocked people can’t start or continue a chat with you (enforced locally here;
// a backend must enforce it on the server).
export default function BlockedScreen({ navigation }) {
  const { blockedPeople, unblock } = useMessaging();
  const [confirm, setConfirm] = useState(null);
  return (
    <ScreenContainer>
      <BackHeader title="Blocked people" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {blockedPeople.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" title="No one is blocked" message="People you block from a chat appear here. You can unblock them any time." />
        ) : (
          blockedPeople.map((p) => (
            <View key={p.id} style={styles.row}>
              <CreatorAvatar creator={p} size={44} />
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.meta}>{p.handle}</Text>
              </View>
              <Button title="Unblock" size="sm" variant="secondary" onPress={() => setConfirm(p)} accessibilityLabel={`Unblock ${p.name}`} />
            </View>
          ))
        )}
      </ScrollView>
      <ConfirmSheet
        visible={Boolean(confirm)}
        title={confirm ? `Unblock ${confirm.name}?` : ''}
        message="They will be able to message you again, subject to your privacy setting."
        confirmLabel="Unblock"
        icon="shield-outline"
        onConfirm={() => {
          unblock(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.cream200 },
  text: { flex: 1, marginHorizontal: spacing.md },
  name: { ...typography.heading, fontSize: 15, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
