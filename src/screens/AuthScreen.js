import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../components/ScreenContainer';
import Button from '../components/Button';
import Field from '../components/Field';
import SegmentedControl from '../components/SegmentedControl';
import { useAccount } from '../context/AccountContext';
import { colors, radius, spacing, typography } from '../theme/theme';

// Sign in / create account / try the demo. All of it goes through AccountContext, which uses
// services/authService.js, so a real backend can replace the local prototype without touching
// this screen.
export default function AuthScreen() {
  const { signIn, signUp, signInDemo, authMode } = useAccount();
  const online = authMode === 'online';
  const [mode, setMode] = useState('Sign in');
  const [role, setRole] = useState('Reader');
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const creating = mode === 'Create account';

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setMessage('');
  };

  const submit = async () => {
    setBusy(true);
    setMessage('');
    setPending(false);
    const result = creating
      ? await signUp({ ...form, role: role === 'Storyteller' ? 'storyteller' : 'reader' })
      : await signIn({ email: form.email, password: form.password });
    if (!result.ok) {
      setBusy(false);
      setErrors(result.errors || {});
      setMessage(result.error || '');
      setPending(Boolean(result.pending));
    }
    // On success the app swaps to the signed-in screens, so there is nothing more to do here.
  };

  const demo = async () => {
    setBusy(true);
    await signInDemo();
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="book" size={28} color={colors.textOnDark} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              StorySphere
            </Text>
            <Text style={styles.tagline}>Read, watch and share stories.</Text>
          </View>

          <View style={styles.notice}>
            <Ionicons name={online ? 'shield-checkmark-outline' : 'flask-outline'} size={20} color={colors.indigo800} />
            <Text style={styles.noticeText}>
              {online
                ? 'Accounts are created and checked by the online service. Your password is never stored in the app. The demo account below stays on this device.'
                : 'Prototype sign-in. Accounts are saved only on this device and are NOT secure: don’t use a real password. A real service will replace this later.'}
            </Text>
          </View>

          <Button
            title="Try the demo account"
            icon="sparkles-outline"
            variant="accent"
            fullWidth
            loading={busy && !form.email}
            disabled={busy}
            onPress={demo}
          />
          <Text style={styles.demoNote}>Demo mode opens a pre-filled sample profile (Zara). No email or password needed.</Text>

          <Text style={styles.or}>{online ? 'OR USE YOUR ACCOUNT' : 'OR USE AN ACCOUNT ON THIS DEVICE'}</Text>
          <View style={styles.bleed}>
            <SegmentedControl
              options={['Sign in', 'Create account']}
              value={mode}
              onChange={(m) => {
                setMode(m);
                setErrors({});
                setMessage('');
              }}
            />
          </View>
          <View style={styles.form}>
            {creating ? (
              <>
                <Field
                  label="Display name"
                  value={form.displayName}
                  onChangeText={set('displayName')}
                  placeholder="How should people see you?"
                  error={errors.displayName}
                  maxLength={40}
                  autoCapitalize="words"
                />
                <Text style={styles.label}>I MOSTLY WANT TO</Text>
                <View style={styles.bleed}>
                  <SegmentedControl options={['Reader', 'Storyteller']} value={role} onChange={setRole} />
                </View>
                <Text style={styles.roleHint}>
                  {role === 'Reader'
                    ? 'Read, save and follow storytellers. You can publish later too.'
                    : 'Publish written, image and mixed-media stories. You can read too.'}
                </Text>
              </>
            ) : null}
            <Field
              label="Email"
              value={form.email}
              onChangeText={set('email')}
              placeholder="you@example.com"
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <Field
              label="Password"
              value={form.password}
              onChangeText={set('password')}
              placeholder={creating ? 'At least 8 characters' : 'Your password'}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={creating ? undefined : submit}
            />
            {creating ? (
              <Field
                label="Confirm password"
                value={form.confirm}
                onChangeText={set('confirm')}
                placeholder="Type it again"
                error={errors.confirm}
                secureTextEntry
                autoCapitalize="none"
                onSubmitEditing={submit}
              />
            ) : null}
            {message ? <Text style={pending ? styles.info : styles.error}>{message}</Text> : null}
            <Button
              title={creating ? 'Create account' : 'Sign in'}
              fullWidth
              loading={busy && Boolean(form.email)}
              disabled={busy}
              onPress={submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  brand: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.indigo900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.display, color: colors.textPrimary, marginTop: spacing.md },
  tagline: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.indigo100,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: { ...typography.caption, flex: 1, marginLeft: spacing.sm, color: colors.indigo800, lineHeight: 18 },
  demoNote: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  or: { ...typography.micro, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.xl },
  bleed: { marginHorizontal: -spacing.xl },
  form: { marginTop: spacing.lg },
  label: { ...typography.micro, color: colors.textSecondary, marginBottom: 6 },
  roleHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.lg },
  error: { ...typography.caption, color: colors.dangerText, marginBottom: spacing.md },
  info: { ...typography.caption, color: colors.indigo800, backgroundColor: colors.indigo100, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
});
