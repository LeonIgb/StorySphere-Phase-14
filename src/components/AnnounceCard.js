import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import Chip from './Chip';
import Field from './Field';
import { useAccount } from '../context/AccountContext';
import { useCommunity } from '../context/CommunityContext';
import { chapterName } from '../utils/creator';
import { LIMITS } from '../utils/community';
import { colors, radius, spacing, typography } from '../theme/theme';

// Creator-side "new chapter" announcement for a live story. SIMULATED: it records the
// announcement on this device and lists it in your notification center. Nobody is notified.
// A real service fans an announcement out as push notifications and email to followers.
export default function AnnounceCard({ work }) {
  const { social } = useAccount();
  const { sendAnnouncement, announcementFor } = useCommunity();
  const chapters = work.chapters || [];
  const targets = chapters.length ? chapters.map((c, i) => ({ value: i, label: chapterName(c, i) })) : [{ value: -1, label: 'Whole story' }];
  const [chapter, setChapter] = useState(targets[targets.length - 1].value);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState({ ok: true, text: '' });
  const followers = social ? social.followers.length : 0;
  const story = { id: work.id, title: work.title || 'Untitled story', creatorId: 'me' };
  const sent = announcementFor(work.id, chapter);

  const send = () => {
    const r = sendAnnouncement({ story, chapter, note });
    if (!r.ok) setMessage({ ok: false, text: r.error });
    else {
      setMessage({ ok: true, text: `Announcement saved for ${r.audience.toLocaleString('en-US')} follower${r.audience === 1 ? '' : 's'} (simulated: nobody was notified).` });
      setNote('');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="megaphone-outline" size={20} color={colors.indigo700} />
        <Text style={styles.title}>Announce a new chapter</Text>
      </View>
      <Text style={styles.hint}>
        Tell your {followers.toLocaleString('en-US')} follower{followers === 1 ? '' : 's'} about an update. Simulated in this prototype: it is saved on this device and shown in your notification center only.
      </Text>
      <View style={styles.chips}>
        {targets.map((t) => (
          <Chip key={t.value} label={t.label} selected={chapter === t.value} onPress={() => { setChapter(t.value); setMessage({ ok: true, text: '' }); }} style={styles.chip} />
        ))}
      </View>
      <Field label="NOTE (OPTIONAL)" value={note} onChangeText={setNote} placeholder="A line for your followers" maxLength={LIMITS.announceNoteMax} style={{ marginBottom: spacing.sm }} />
      {message.text ? <Text style={[styles.msg, !message.ok && { color: colors.dangerText }]} accessibilityRole="alert">{message.text}</Text> : null}
      <Button title={sent ? 'Already announced' : 'Send announcement (simulated)'} icon="paper-plane-outline" size="sm" variant="accent" disabled={Boolean(sent)} onPress={send} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.cream50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.cream300, padding: spacing.lg, marginTop: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { ...typography.heading, fontSize: 15, color: colors.textPrimary, marginLeft: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, marginVertical: spacing.sm, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  chip: { marginBottom: 6 },
  msg: { ...typography.caption, fontWeight: '700', color: colors.successText, marginBottom: spacing.sm },
});
