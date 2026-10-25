import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/theme';

const STATUS = {
  draft: { label: 'DRAFT', icon: 'create-outline', bg: colors.indigo100, fg: colors.indigo700 },
  scheduled: { label: 'SCHEDULED (SIMULATED)', icon: 'time-outline', bg: colors.violetSoft, fg: colors.indigo700 },
  published: { label: 'LIVE', icon: 'radio-outline', bg: '#DDF3EA', fg: '#1F6B4D' },
};

export default function StatusPill({ status, style }) {
  const s = STATUS[status] || STATUS.draft;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }, style]}>
      <Ionicons name={s.icon} size={11} color={s.fg} />
      <Text style={[styles.text, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: { ...typography.micro, fontSize: 11, marginLeft: 4 },
});
