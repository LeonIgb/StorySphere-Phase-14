import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { getBackendStatus, subscribeBackendStatus, verifyConnection } from '../services/backend/backendStatus';
import { colors, radius, spacing, typography } from '../theme/theme';

const ICONS = {
  local: ['phone-portrait-outline', colors.indigo700],
  invalid_config: ['alert-circle-outline', colors.coralDark],
  unverified: ['help-circle-outline', colors.indigo700],
  checking: ['sync-outline', colors.indigo700],
  connected: ['checkmark-circle-outline', colors.success || colors.indigo700],
  schema_missing: ['construct-outline', colors.coralDark],
  unreachable: ['cloud-offline-outline', colors.coralDark],
};

// Shows what the app is really connected to. "Connected" appears only after a real check passed.
export default function BackendStatusCard({ sync }) {
  const [status, setStatus] = useState(getBackendStatus());
  useEffect(() => subscribeBackendStatus(setStatus), []);
  const [icon, tint] = ICONS[status.state] || ICONS.local;
  const canCheck = status.state !== 'local' && status.state !== 'invalid_config';

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.top}>
        <Ionicons name={icon} size={24} color={tint} />
        <View style={styles.text}>
          <Text style={styles.title}>{status.title}</Text>
          <Text style={styles.detail}>{status.detail}</Text>
          {status.checkedAt ? <Text style={styles.when}>Checked {new Date(status.checkedAt).toLocaleTimeString()}</Text> : null}
        </View>
      </View>
      {sync && sync.state === 'syncing' ? <Text style={styles.sync}>Saving your profile online…</Text> : null}
      {sync && sync.state === 'synced' ? <Text style={styles.sync}>Profile saved online.</Text> : null}
      {sync && sync.state === 'error' ? (
        <Text style={[styles.sync, { color: colors.coralText }]}>Couldn’t save online: {sync.message} Your changes are kept on this device.</Text>
      ) : null}
      {canCheck ? (
        <View style={styles.actions}>
          <Button title="Check connection" size="sm" variant="secondary" loading={status.state === 'checking'} onPress={() => verifyConnection()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, marginHorizontal: spacing.xl, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  text: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.heading, color: colors.textPrimary },
  detail: { ...typography.caption, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  when: { ...typography.micro, color: colors.textSecondary, marginTop: 4 },
  sync: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
  actions: { flexDirection: 'row', marginTop: spacing.md },
});
