import React from 'react';
import LevelCard from './LevelCard';
import { useLevels } from '../context/LevelsContext';
import { sampleProgress } from '../services/levelsService';

// Compact level card for profile pages. For the signed-in storyteller ('me') it reads the live,
// persisted progress; for a sample storyteller it reads the sample ledger. Tapping opens the
// full levels screen. Levels are long-term progress and are separate from leaderboard ranks.
export default function LevelSummary({ subjectId, onPress, title = 'STORYTELLER LEVEL' }) {
  const levels = useLevels();
  const progress = subjectId === 'me' ? levels.progress : sampleProgress(subjectId).result;
  return <LevelCard compact progress={progress} onPress={onPress} title={title} />;
}
