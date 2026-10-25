import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import BackHeader from '../components/BackHeader';
import SectionHeader from '../components/SectionHeader';
import ReaderSettings from '../components/ReaderSettings';
import Chip from '../components/Chip';
import ToggleRow from '../components/ToggleRow';
import { useAccount } from '../context/AccountContext';
import { useReading } from '../context/ReadingContext';
import { WORK_GENRES } from '../data/creatorOptions';
import { FORMATS, toggleId } from '../utils/account';
import { colors, genreIcons, radius, spacing, typography } from '../theme/theme';

// Personal reading preferences. Reader theme and text size apply to the reader straight away;
// genres, formats and the two switches shape "Picked for you" on Home.
export default function PreferencesScreen({ navigation }) {
  const { profile, prefs, updateProfile, setPref } = useAccount();
  const reading = useReading();

  return (
    <ScreenContainer>
      <BackHeader title="Reading preferences" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title="Reader" />
        <View style={styles.pad}>
          <ReaderSettings
            theme={reading.theme}
            onTheme={reading.setTheme}
            fontSize={reading.fontSize}
            onIncrease={reading.increaseFont}
            onDecrease={reading.decreaseFont}
            canIncrease={reading.canIncreaseFont}
            canDecrease={reading.canDecreaseFont}
          />
          <Text style={styles.hint}>Used in the story reader. Saved for this account on this device.</Text>
        </View>

        <SectionHeader title="Genres you like" />
        <Text style={[styles.hint, styles.pad]}>Also used for recommended storytellers. Same list as in Edit profile.</Text>
        <View style={styles.chips}>
          {WORK_GENRES.map((g) => (
            <Chip
              key={g}
              label={g}
              icon={genreIcons[g]}
              selected={profile.preferredGenres.includes(g)}
              onPress={() => updateProfile({ preferredGenres: toggleId(profile.preferredGenres, g) })}
              style={styles.chip}
            />
          ))}
        </View>

        <SectionHeader title="Formats you prefer" />
        <View style={styles.chips}>
          {FORMATS.map((f) => (
            <Chip
              key={f}
              label={f}
              selected={prefs.preferredFormats.includes(f)}
              onPress={() => setPref('preferredFormats', toggleId(prefs.preferredFormats, f))}
              style={styles.chip}
            />
          ))}
        </View>

        <SectionHeader title="Picked for you" />
        <View style={styles.list}>
          <ToggleRow icon="pricetag-outline" label="Free stories only" hint="Skip premium stories you don’t own" value={prefs.freeOnly} onValueChange={(v) => setPref('freeOnly', v)} />
          <ToggleRow icon="eye-off-outline" label="Hide finished stories" hint="Don’t suggest stories you’ve already finished" value={prefs.hideFinished} onValueChange={(v) => setPref('hideFinished', v)} last />
        </View>
        <Text style={[styles.hint, styles.pad]}>
          Home shows “Picked for you” once you choose at least one genre, format, or turn on Free stories only. Stories you have started are never suggested.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  pad: { paddingHorizontal: spacing.xl },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl },
  chip: { marginBottom: spacing.sm },
  list: { backgroundColor: colors.cream50, borderRadius: radius.lg, marginHorizontal: spacing.xl, borderWidth: 1, borderColor: colors.cream300 },
});
