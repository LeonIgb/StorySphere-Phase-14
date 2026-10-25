import { useCallback } from 'react';
import { useNotice } from '../context/NoticeContext';
import { shareStory } from '../utils/share';
import { useCommunity } from '../context/CommunityContext';

// Returns share(story). Opens the native share sheet, or shows the text when sharing isn't supported.
export default function useShare() {
  const { showNotice } = useNotice();
  const { recordShare } = useCommunity();
  return useCallback(
    async (story) => {
      if (!story) return;
      const result = await shareStory(story);
      // Only a completed share counts (not a dismissed sheet or an unsupported preview).
      if (result.status === 'shared') recordShare(story.id);
      if (result.status === 'unsupported') {
        showNotice(
          'Sharing isn’t available here',
          `This device or preview can’t open a share sheet. You can copy this instead:\n\n${result.message}`,
          'share-social-outline'
        );
      }
    },
    [showNotice, recordShare]
  );
}
