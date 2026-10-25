import React, { createContext, useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, MAX_CONTENT_WIDTH } from '../theme/theme';

// Shared screen shell: cream background plus safe-area padding on every side the system covers
// (status bar and notch on top, rounded corners and landscape cutouts on the sides).
//
// The bottom inset (gesture bar or three-button navigation bar) is added here only when no tab bar
// is shown, because the tab bar adds it itself. RootNavigator provides `false` while the tab bar is
// visible. Outside the navigator (sign-in, loading) the default `true` applies.
export const BottomInsetContext = createContext(true);

export default function ScreenContainer({ children, style }) {
  const insets = useSafeAreaInsets();
  const padBottom = useContext(BottomInsetContext);
  return (
    <View
      style={[
        styles.base,
        { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, paddingBottom: padBottom ? insets.bottom : 0 },
        style,
      ]}
    >
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: colors.cream100 },
  // On tablets and wide windows the content stays a comfortable reading width, centred.
  inner: { flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
});
