import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';
import Button from './Button';

// Last-resort safety net: a render crash shows a friendly screen instead of a blank app.
export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Hook for a crash-reporting service in a later phase.
    console.warn('StorySphere render error:', error, info && info.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went sideways</Text>
        <Text style={styles.message}>
          StorySphere hit an unexpected problem. Your stories are safe. Give it another try.
        </Text>
        <Button title="Reload app" variant="accent" onPress={this.reset} style={styles.button} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.indigo900,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  title: { ...typography.title, color: colors.textOnDark, textAlign: 'center' },
  message: {
    ...typography.body,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  button: { marginTop: spacing.xl },
});
