import { Share } from 'react-native';

// Native sharing. There is no public StorySphere link yet, so the shared text describes the
// story instead of linking to it. Screens call this through the useShare hook (src/hooks/useShare.js),
// which shows a copyable notice when the runtime has no share sheet (for example the web preview).

export function buildShareMessage(story) {
  const creator = story && story.creator ? ` by ${story.creator.name}` : '';
  const rating = story && Number.isFinite(story.rating) ? ` \u2605 ${story.rating.toFixed(1)}` : '';
  const genre = story && story.genre ? `${story.genre} \u00B7 ` : '';
  return `\u201C${story.title}\u201D${creator} on StorySphere. ${genre}${story.mediaType || 'Written'}${rating}`;
}

// Resolves to { status: 'shared' | 'dismissed' | 'unsupported', message }. Never throws.
export async function shareStory(story) {
  const message = buildShareMessage(story);
  try {
    if (!Share || typeof Share.share !== 'function') return { status: 'unsupported', message };
    const result = await Share.share({ message, title: story.title });
    if (result && result.action === Share.dismissedAction) return { status: 'dismissed', message };
    return { status: 'shared', message };
  } catch (error) {
    return { status: 'unsupported', message, error: error && error.message };
  }
}
