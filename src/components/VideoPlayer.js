import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { colors, radius, spacing, typography } from '../theme/theme';
import useMediaUri from '../hooks/useMediaUri';

// Video playback using expo-video, with fallbacks:
//  - expo-video missing in this runtime  -> poster with an "Open video" button
//  - the video fails to load or play     -> message, Retry and "Open video"
//  - the player crashes while rendering  -> same poster fallback (error boundary)
//
// The module is loaded defensively so the rest of the app keeps working without it.
let ExpoVideo = null;
try {
  // eslint-disable-next-line global-require
  ExpoVideo = require('expo-video');
} catch (e) {
  ExpoVideo = null;
}
const VIDEO_SUPPORTED = Boolean(ExpoVideo && ExpoVideo.VideoView && ExpoVideo.useVideoPlayer);

function Poster({ color, icon, title, message, children }) {
  return (
    <View style={[styles.frame, { backgroundColor: color || colors.indigo800 }]}>
      <View style={styles.posterBody}>
        <Ionicons name={icon || 'videocam'} size={44} color="rgba(251, 246, 236, 0.9)" />
        {title ? <Text style={styles.posterTitle}>{title}</Text> : null}
        {message ? <Text style={styles.posterMessage}>{message}</Text> : null}
        {children}
      </View>
    </View>
  );
}

function OpenLinkButton({ uri }) {
  const [failed, setFailed] = useState(false);
  const open = async () => {
    try {
      await Linking.openURL(uri);
      setFailed(false);
    } catch (e) {
      setFailed(true);
    }
  };
  return (
    <>
      <Button title="Open video" icon="open-outline" variant="secondary" size="sm" onPress={open} style={styles.button} />
      {failed ? <Text style={styles.posterMessage}>Couldn’t open the link on this device.</Text> : null}
    </>
  );
}

class PlayerBoundary extends React.Component {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(error) {
    console.warn('VideoPlayer crashed:', error && error.message);
  }
  render() {
    if (this.state.crashed) return this.props.fallback;
    return this.props.children;
  }
}

function NativePlayer({ uri, color, icon, onProgress, onEnded, onRetry }) {
  const { useVideoPlayer, VideoView } = ExpoVideo;
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [slow, setSlow] = useState(false);

  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;
  const endedRef = useRef(onEnded);
  endedRef.current = onEnded;

  useEffect(() => {
    const subs = [];
    try {
      subs.push(
        player.addListener('statusChange', (event) => {
          const next = (event && event.status) || player.status;
          setStatus(next);
          if (next === 'error') {
            setError((event && event.error && event.error.message) || 'The video could not be loaded.');
          } else if (next === 'readyToPlay') {
            setError(null);
          }
        })
      );
      subs.push(
        player.addListener('playToEnd', () => {
          if (endedRef.current) endedRef.current();
        })
      );
      if (player.status) setStatus(player.status);
    } catch (e) {
      setError('Playback is not supported in this runtime.');
    }
    return () => {
      subs.forEach((sub) => {
        try {
          if (sub && sub.remove) sub.remove();
        } catch (e) {
          // ignore
        }
      });
    };
  }, [player]);

  // Report progress about once a second and a half.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const duration = player.duration;
        const time = player.currentTime;
        if (duration > 0 && Number.isFinite(time) && progressRef.current) {
          progressRef.current(Math.min(1, time / duration));
        }
      } catch (e) {
        // ignore
      }
    }, 1500);
    return () => clearInterval(id);
  }, [player]);

  // Tell the viewer when loading is taking unusually long.
  useEffect(() => {
    if (status !== 'loading') {
      setSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, [status]);

  if (error || status === 'error') {
    return (
      <Poster color={color} icon="alert-circle-outline" title="This video can’t play right now" message={error}>
        <View style={styles.buttonRow}>
          <Button title="Retry" icon="refresh" size="sm" variant="accent" onPress={onRetry} style={styles.button} />
          <OpenLinkButton uri={uri} />
        </View>
      </Poster>
    );
  }

  return (
    <View style={[styles.frame, { backgroundColor: '#000' }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
      />
      {status === 'loading' ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.cream100} />
          {slow ? <Text style={styles.posterMessage}>Taking longer than usual. Check your connection.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

// Props: uri, color, icon, onProgress(0..1), onEnded()
function VideoPlayerInner({ uri, color, icon, onProgress, onEnded }) {
  const [attempt, setAttempt] = useState(0);

  if (!uri) {
    return <Poster color={color} icon={icon} title="No video available" message="This story doesn’t have a playable video yet." />;
  }

  const unsupported = (
    <Poster
      color={color}
      icon={icon}
      title="Video playback isn’t available here"
      message="This runtime can’t play video inside the app. You can still open it in your browser."
    >
      <OpenLinkButton uri={uri} />
    </Poster>
  );

  if (!VIDEO_SUPPORTED) return unsupported;

  return (
    <PlayerBoundary fallback={unsupported}>
      <NativePlayer
        key={`${uri}-${attempt}`}
        uri={uri}
        color={color}
        icon={icon}
        onProgress={onProgress}
        onEnded={onEnded}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    </PlayerBoundary>
  );
}

// Premium videos are stored as ssmedia:// references; they are exchanged for a short-lived signed
// link here. Ordinary links and local files pass straight through, exactly as before.
export default function VideoPlayer(props) {
  const m = useMediaUri(props.uri);
  if (!props.uri) return <VideoPlayerInner {...props} />;
  if (m.status === 'loading') return <Poster color={props.color} icon={props.icon} title="Loading video…" message="Checking your access." />;
  if (m.status === 'locked') return <Poster color={props.color} icon="lock-closed" title="This video is locked" message="Unlock the story to watch it." />;
  if (m.status === 'error') {
    return (
      <Poster color={props.color} icon={props.icon} title="Couldn’t load the video" message={m.error || 'Check your connection and try again.'}>
        <Button title="Try again" size="sm" variant="secondary" onPress={m.retry} />
      </Poster>
    );
  }
  return <VideoPlayerInner {...props} uri={m.uri} />;
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterBody: { alignItems: 'center', paddingHorizontal: spacing.lg },
  posterTitle: { ...typography.heading, color: colors.textOnDark, textAlign: 'center', marginTop: spacing.sm },
  posterMessage: {
    ...typography.caption,
    color: colors.textOnDarkMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  button: { marginHorizontal: spacing.xs, marginTop: spacing.md },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 15, 46, 0.35)',
  },
});
