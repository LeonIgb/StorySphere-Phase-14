import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { useSheetInsets } from '../utils/insets';

// Cross-platform confirmation dialog (Alert.alert does nothing on web previews).
export default function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  icon = 'help-circle-outline',
  onConfirm,
  onCancel,
}) {
  const sheetInsets = useSheetInsets();
  return (
    <Modal transparent visible={Boolean(visible)} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, sheetInsets]} onPress={onCancel} accessibilityLabel="Dismiss">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={[styles.iconWrap, destructive && { backgroundColor: colors.coralSoft }]}>
            <Ionicons name={icon} size={26} color={destructive ? colors.coralDark : colors.violet} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.buttons}>
            <Button title={cancelLabel} variant="secondary" onPress={onCancel} style={styles.button} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'accent' : 'primary'}
              onPress={onConfirm}
              style={styles.button}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 15, 46, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.cream50,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  buttons: { flexDirection: 'row', marginTop: spacing.xl, alignSelf: 'stretch' },
  button: { flex: 1, alignSelf: 'stretch', marginHorizontal: spacing.xs },
});
