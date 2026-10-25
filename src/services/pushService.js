// Push notifications (Phase 9): the interface a backend will implement. NOT ACTIVE.
//
// Nothing in this prototype registers a device, asks for notification permission or receives a
// push. The "notification center" is a list built on the device (see utils/community.js). This
// file only reports that status honestly, so screens never imply push is on.
//
// What a real implementation needs:
//   1. expo-notifications (needs a development build / EAS, it is limited in Snack) or the
//      native FCM (Android) and APNs (iOS) SDKs.
//   2. On sign-in: ask permission, get the device push token, POST it to your backend
//      (token + platform + user id), and remove it on sign-out.
//   3. A backend that stores tokens, applies each user's notification preferences and quiet
//      hours, and sends through Expo Push / FCM / APNs when a message, follower, reply,
//      purchase or chapter event happens.
//   4. Deep links from a tapped push to the right screen (chat, receipt, story).
//   5. Token refresh, invalid-token cleanup, and rate limits per user.

export const pushProvider = {
  async getStatus() {
    return {
      active: false,
      state: 'not-configured',
      title: 'Push notifications are not active',
      detail: 'This prototype never sends push notifications or emails. Notifications are listed in the app only. A backend and a push service (APNs/FCM) are required.',
    };
  },
  async requestPermission() {
    return { ok: false, message: 'Push notifications are not available in this prototype.' };
  },
  async registerDevice() {
    return { ok: false, message: 'There is no backend to register this device with.' };
  },
  async unregisterDevice() {
    return { ok: true };
  },
};
