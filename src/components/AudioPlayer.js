import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import ProgressBar from './ProgressBar';
import { colors, radius, spacing, typography } from '../theme/theme';
import { formatDuration } from '../utils/mediaFiles';
import useMediaUri from '../hooks/useMediaUri';

// Audio playback with expo-audio, loaded defensively like the video player:
//  - expo-audio missing in this runtime -> a card with an "Open audio" button
//  - the file fails to load or play     -> message and Retry
//  - the player crashes while rendering -> the same card (error boundary)
let ExpoAudio = null;
try {
  // eslint-disable-next-line global-require
  ExpoAudio = require('expo-audio');
} catch (e) {
  ExpoAudio = null;
}
const AUDIO_SUPPORTED = Boolean(ExpoAudio && ExpoAudio.useAudioPlayer && ExpoAudio.useAudioPlayerStatus);

if (AUDIO_SUPPORTED && ExpoAudio.setAudioModeAsync) {
  // Let narration play with the iPhone's silent switch on, as a reader expects.
  try {
    const maybe = ExpoAudio.setAudioModeAsync({ playsInSilentMode: true });
    if (maybe && maybe.catch) maybe.catch(() => {});
  } catch (e) {
    // ignore
  }
}

function Card({ title, message, children, icon = 'musical-notes' }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={22} color={colors.textOnDark} />
      </View>
      <View style={styles.cardBody}>
        {title ? <Text style={styles.title} numberOfLines={2}>{title}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {children}
      </View>
    </View>
  );
}

function OpenButton({ uri }) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <Button
        title="Open audio"
        icon="open-outline"
        size="sm"
        variant="secondary"
        onPress={async () => {
          try {
            await Linking.openURL(uri);
            setFailed(false);
          } catch (e) {
            setFailed(true);
          }
        }}
        style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
      />
      {failed ? <Text style={styles.message}>Couldn’t open the file on this device.</Text> : null}
    </>
  );
}

class Boundary extends React.Component {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  componentDidCatch(error) {
    console.warn('AudioPlayer crashed:', error && error.message);
  }
  render() {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}

function NativeAudio({ uri, title, durationMs, onRetry }) {
  const player = ExpoAudio.useAudioPlayer(uri);
  const status = ExpoAudio.useAudioPlayerStatus(player) || {};
  const [error, setError] = useState('');

  const duration = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : durationMs ? durationMs / 1000 : 0;
  const position = Number.isFinite(status.currentTime) ? status.currentTime : 0;
  const playing = Boolean(status.playing);

  // Back to the start when the clip ends, so Play plays it again.
  useEffect(() => {
    if (status.didJustFinish) {
      try {
        player.seekTo(0);
      } catch (e) {
        // ignore
      }
    }
  }, [status.didJustFinish, player]);

  const toggle = () => {
    try {
      if (playing) player.pause();
      else player.play();
      setError('');
    } catch (e) {
      setError('This audio can’t be played.');
    }
  };
  const skip = (delta) => {
    try {
      player.seekTo(Math.max(0, Math.min(duration || 1e9, position + delta)));
    } catch (e) {
      // ignore
    }
  };

  if (error) {
    return (
      <Card title={title} message={error} icon="alert-circle-outline">
        <Button title="Retry" icon="refresh" size="sm" variant="accent" onPress={onRetry} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        <OpenButton uri={uri} />
      </Card>
    );
  }

  const fraction = duration > 0 ? position / duration : 0;
  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause audio' : 'Play audio'}
        style={({ pressed }) => [styles.play, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name={playing ? 'pause' : 'play'} size={22} color={colors.textOnDark} />
      </Pressable>
      <View style={styles.cardBody}>
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        <ProgressBar value={fraction} style={{ marginTop: 8 }} trackColor="rgba(251,246,236,0.25)" />
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatDuration(position * 1000) || '0:00'}</Text>
          <View style={styles.skips}>
            <Pressable onPress={() => skip(-15)} accessibilityRole="button" accessibilityLabel="Back 15 seconds" hitSlop={8}>
              <Ionicons name="play-back" size={16} color={colors.textOnDarkMuted} />
            </Pressable>
            <Pressable onPress={() => skip(15)} accessibilityRole="button" accessibilityLabel="Forward 15 seconds" hitSlop={8} style={{ marginLeft: spacing.lg }}>
              <Ionicons name="play-forward" size={16} color={colors.textOnDarkMuted} />
            </Pressable>
          </View>
          <Text style={styles.time}>{duration ? formatDuration(duration * 1000) : status.isLoaded ? '' : 'Loading…'}</Text>
        </View>
      </View>
    </View>
  );
}

// Props: uri, title (file name or caption), durationMs (known length, shown before the file loads).
function AudioPlayerInner({ uri, title, durationMs }) {
  const [attempt, setAttempt] = useState(0);
  if (!uri) return <Card title="No audio" message="This block doesn’t have an audio file yet." icon="volume-mute-outline" />;
  const unsupported = (
    <Card title={title} message="Audio playback isn’t available in this runtime. You can still open the file." icon="volume-mute-outline">
      <OpenButton uri={uri} />
    </Card>
  );
  if (!AUDIO_SUPPORTED) return unsupported;
  return (
    <Boundary fallback={unsupported}>
      <NativeAudio key={`${uri}-${attempt}`} uri={uri} title={title} durationMs={durationMs} onRetry={() => setAttempt((n) => n + 1)} />
    </Boundary>
  );
}

// Premium audio is stored as an ssmedia:// reference and exchanged for a short-lived signed link here.
export default function AudioPlayer(props) {
  const m = useMediaUri(props.uri);
  if (!props.uri) return <AudioPlayerInner {...props} />;
  if (m.status === 'loading') return <Card title={props.title} message="Checking your access…" icon="time-outline" />;
  if (m.status === 'locked') return <Card title={props.title} message="This audio is locked. Unlock the story to listen." icon="lock-closed" />;
  if (m.status === 'error') {
    return (
      <Card title={props.title} message={m.error || 'Couldn’t load the audio.'} icon="alert-circle-outline">
        <Button title="Try again" size="sm" variant="secondary" onPress={m.retry} />
      </Card>
    );
  }
  return <AudioPlayerInner {...props} uri={m.uri} />;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.indigo800, borderRadius: radius.lg, padding: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.indigo700, alignItems: 'center', justifyContent: 'center' },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.coralDark, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, marginLeft: spacing.md },
  title: { ...typography.body, fontWeight: '700', color: colors.textOnDark },
  message: { ...typography.caption, color: colors.textOnDarkMuted, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  time: { ...typography.caption, fontSize: 11, color: colors.textOnDarkMuted, minWidth: 36 },
  skips: { flexDirection: 'row', alignItems: 'center' },
});
