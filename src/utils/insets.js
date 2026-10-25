import { useSafeAreaInsets } from 'react-native-safe-area-context';

// System insets (status bar, notch, gesture bar / three-button navigation bar, rounded corners).
// Android draws edge to edge on current Expo SDKs, so content must add these itself; on devices
// where the system bars already reserve space the insets are 0, so nothing is double counted.
export { useSafeAreaInsets };

// Padding to put on a full-screen modal backdrop so a sheet or dialog never sits under a system bar.
export function useSheetInsets() {
  const i = useSafeAreaInsets();
  return { paddingTop: i.top, paddingBottom: i.bottom, paddingLeft: i.left, paddingRight: i.right };
}
