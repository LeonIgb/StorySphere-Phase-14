import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingState from './src/components/LoadingState';
import ScreenContainer from './src/components/ScreenContainer';
import AuthScreen from './src/screens/AuthScreen';
import RootNavigator from './src/navigation/RootNavigator';
import { AccountProvider, useAccount } from './src/context/AccountContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { ReadingProvider } from './src/context/ReadingContext';
import { AccessProvider } from './src/context/AccessContext';
import { CommunityProvider } from './src/context/CommunityContext';
import { MessagingProvider } from './src/context/MessagingContext';
import { NoticeProvider } from './src/context/NoticeContext';
import { CreatorProvider } from './src/context/CreatorContext';
import { LevelsProvider } from './src/context/LevelsContext';

// Signed out -> sign-in screen. Signed in -> the app, wrapped in per-account providers.
// `key={user.id}` remounts them when the account changes, so one account's library, history
// and stories can never show up in another's.
function AppGate() {
  const { ready, user } = useAccount();
  if (!ready) {
    return (
      <ScreenContainer>
        <LoadingState label="Opening StorySphere…" />
      </ScreenContainer>
    );
  }
  if (!user) return <AuthScreen />;
  return (
    <AccessProvider key={user.id}>
      <MessagingProvider>
        <CommunityProvider>
          <LibraryProvider>
            <ReadingProvider>
              <CreatorProvider>
                <LevelsProvider>
                  <RootNavigator />
                </LevelsProvider>
              </CreatorProvider>
            </ReadingProvider>
          </LibraryProvider>
        </CommunityProvider>
      </MessagingProvider>
    </AccessProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
    <ErrorBoundary>
      <NoticeProvider>
        <AccountProvider>
          <StatusBar style="dark" />
          <AppGate />
        </AccountProvider>
      </NoticeProvider>
    </ErrorBoundary>
    </SafeAreaProvider>
  );
}
