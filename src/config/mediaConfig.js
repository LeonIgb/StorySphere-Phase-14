// Settings for cloud media. Nothing here is secret.
//
// Cloud media works only when the backend (config/backendConfig.js) is configured AND the media
// migration (supabase/migrations/20261024000004_media.sql) has been applied. Otherwise the app
// keeps its local prototype behaviour and says so.

let env = {};
try {
  // eslint-disable-next-line no-undef
  env = typeof process !== 'undefined' && process && process.env ? process.env : {};
} catch (e) {
  env = {};
}
const flag = (name) => {
  try {
    // Written out per name so Expo's build-time inlining of EXPO_PUBLIC_* variables works.
    const map = {
      EXPO_PUBLIC_IMAGE_TRANSFORMS: process.env.EXPO_PUBLIC_IMAGE_TRANSFORMS,
      EXPO_PUBLIC_VIDEO_PROCESSING: process.env.EXPO_PUBLIC_VIDEO_PROCESSING,
    };
    return String(map[name] || env[name] || '').trim().toLowerCase();
  } catch (e) {
    return '';
  }
};

export const MEDIA_BUCKETS = ['image-public', 'image-premium', 'video-public', 'video-premium', 'audio-public', 'audio-premium'];

export const mediaConfig = {
  // Supabase Image Transformations (resize on the server). A PAID feature (Pro plan and above).
  // Off by default: images are still shrunk on the device before upload either way.
  imageTransforms: flag('EXPO_PUBLIC_IMAGE_TRANSFORMS') === 'true',
  // 'none' = videos are delivered exactly as uploaded (progressive MP4/MOV/WebM from storage).
  // 'external' = you run a transcoding service that calls set_media_processing(); the app then
  // waits for processing = 'ready' before showing "Ready". Supabase itself does NOT transcode.
  videoProcessing: flag('EXPO_PUBLIC_VIDEO_PROCESSING') === 'external' ? 'external' : 'none',
  signedUrlSeconds: 3600, // premium links last one hour, then are requested again
  upload: {
    maxAttempts: 3, // tries per file for network / server errors (4xx are never retried)
    retryDelaysMs: [1200, 3500],
    stallTimeoutMs: 45000, // abort when no byte has moved for this long
    maxParallel: 2,
  },
};

// Image optimization presets: longest edge in pixels and JPEG quality (0-1).
export const IMAGE_PRESETS = {
  cover: { maxEdge: 1400, quality: 0.82 },
  avatar: { maxEdge: 640, quality: 0.82 },
  page: { maxEdge: 2048, quality: 0.82 }, // gallery panels and images inside chapters
  chat: { maxEdge: 1280, quality: 0.78 },
};
