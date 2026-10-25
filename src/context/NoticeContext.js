import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import Button from '../components/Button';
import { useSheetInsets } from '../utils/insets';

// A simple cross-platform notice sheet (Alert.alert does nothing on web previews).
// Used for "coming in a later phase" messages and lightweight confirmations.
const NoticeContext = createContext({ showNotice: () => {} });

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null);
  // Notices wait their turn: one that arrives while another is open is shown after it is closed,
  // so a confirmation (for example "Your story is live") is never replaced by a later message.
  const openRef = useRef(false);
  const queueRef = useRef([]);

  const showNotice = useCallback((title, message, icon = 'sparkles') => {
    const next = { title, message, icon };
    if (openRef.current) {
      queueRef.current.push(next);
      return;
    }
    openRef.current = true;
    setNotice(next);
  }, []);

  const close = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      setNotice(next);
    } else {
      openRef.current = false;
      setNotice(null);
    }
  }, []);
  const sheetInsets = useSheetInsets();
  const value = useMemo(() => ({ showNotice }), [showNotice]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <Modal transparent visible={Boolean(notice)} animationType="fade" onRequestClose={close}>
        <Pressable style={[styles.backdrop, sheetInsets]} onPress={close} accessibilityLabel="Dismiss">
          <Pressable style={styles.sheet} onPress={() => {}}>
            {notice ? (
              <>
                <View style={styles.iconWrap}>
                  <Ionicons name={notice.icon} size={26} color={colors.violet} />
                </View>
                <Text style={styles.title}>{notice.title}</Text>
                <Text style={styles.message} selectable>
                  {notice.message}
                </Text>
                <Button title="Got it" onPress={close} fullWidth style={styles.button} />
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  return useContext(NoticeContext);
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
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  button: { marginTop: spacing.xl },
});
