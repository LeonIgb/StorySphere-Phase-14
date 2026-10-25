import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import TabBar from '../components/TabBar';
import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import CreateScreen from '../screens/CreateScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StoryDetailScreen from '../screens/StoryDetailScreen';
import CreatorScreen from '../screens/CreatorScreen';
import ReaderScreen from '../screens/ReaderScreen';
import GalleryScreen from '../screens/GalleryScreen';
import VideoScreen from '../screens/VideoScreen';
import StoryEditorScreen from '../screens/StoryEditorScreen';
import ChapterEditorScreen from '../screens/ChapterEditorScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import HistoryScreen from '../screens/HistoryScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import LevelsScreen from '../screens/LevelsScreen';
import CreatorDashboardScreen from '../screens/CreatorDashboardScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import UnlockScreen from '../screens/UnlockScreen';
import PurchasesScreen from '../screens/PurchasesScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import CommentsScreen from '../screens/CommentsScreen';
import ReviewsScreen from '../screens/ReviewsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import VideoUploadScreen from '../screens/VideoUploadScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import BlockedScreen from '../screens/BlockedScreen';
import MediaLibraryScreen from '../screens/MediaLibraryScreen';
import { BottomInsetContext } from '../components/ScreenContainer';
import { colors } from '../theme/theme';

// Dependency-free navigation (no React Navigation), so the app runs on any Snack SDK.
//
//  - Five tabs, mounted lazily and kept alive so scroll position and filters survive.
//  - A page stack rendered on top of the tabs: story, creator, reader, gallery, video.
//    Every page in the stack stays mounted (hidden under the top one), so going back
//    returns to the same scroll position without reloading.
//  - The reader, gallery, video, editor and chat pages are immersive: the tab bar hides while they are open.
//
// Screens get a small `navigation` object:
//   navigate(tab, params?)      switch tab (clears the page stack); params are handed to that tab
//   openStory(id)               story page
//   openCreator(id)             creator page
//   openReader(id, chapter?)    written reader (resumes where you left off when chapter is omitted)
//   openGallery(id, index?)     image gallery
//   openVideo(id)               video page
//   openContent(story)          the right viewer for the story's media type
//   openEditor(workId)          story editor (Create tab)
//   openChapterEditor(workId, chapterId)   chapter editor
//   openEditProfile()           edit profile page
//   openFollowList(personId, kind, name)   followers / following list ('me' or a person id)
//   openHistory()               reading and viewing history
//   openDashboard(subjectId?)   creator analytics and earnings dashboard ('me' or a sample storyteller id)
//   openLevels(subjectId?)      storyteller levels and achievements ('me' or a sample storyteller id)
//   openLeaderboards(params?)   storyteller leaderboards ({ period, media, genre } optional)
//   openSettings()              account, notification and privacy settings
//   openMediaLibrary()          your uploaded cloud media (list, details, delete)
//   openPreferences()           personal reading preferences
//   openUnlock(storyId)         unlock confirmation for a premium story (demo purchase)
//   openPurchases()             purchase history
//   openReceipt(txId)           one transaction's receipt and status
//   openComments(storyId, chapter?)   story discussion, or one chapter's thread
//   openReviews(storyId)        ratings summary and written reviews
//   openNotifications()         community notification center
//   openReports()               reports you filed (prototype)
//   openVideoUpload(workId, { chapterId?, blockId? })   dedicated video upload page (Video and Mixed-media stories)
//   openMessages()              conversation list (inbox and requests)
//   openChat(personId)          one-to-one chat (local demo messages)
//   openNewChat()               pick someone to message
//   openBlocked()               people you blocked
//   goBack()                    pop the top page
export const TABS = [
  { name: 'Home', component: HomeScreen },
  { name: 'Discover', component: DiscoverScreen },
  { name: 'Create', component: CreateScreen },
  { name: 'Library', component: LibraryScreen },
  { name: 'Profile', component: ProfileScreen },
];

const IMMERSIVE = ['reader', 'gallery', 'video', 'editor', 'chapter', 'editprofile', 'chat'];

export default function RootNavigator() {
  const [active, setActive] = useState('Home');
  const [visited, setVisited] = useState({ Home: true });
  const [stack, setStack] = useState([]);
  const [tabParams, setTabParams] = useState({});
  const nonce = useRef(0);

  const navigate = useCallback((name, params) => {
    if (!TABS.some((t) => t.name === name)) return;
    setStack([]);
    setVisited((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
    if (params) {
      nonce.current += 1;
      const stamped = { ...params, nonce: nonce.current };
      setTabParams((prev) => ({ ...prev, [name]: stamped }));
    }
    setActive(name);
  }, []);

  const push = useCallback((type, id, extra) => {
    if (!id) return;
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.type === type && top.id === id) return prev;
      return [...prev, { type, id, ...extra }];
    });
  }, []);

  const openStory = useCallback((id) => push('story', id), [push]);
  const openCreator = useCallback((id) => push('creator', id), [push]);
  const openReader = useCallback((id, chapter) => push('reader', id, { chapter }), [push]);
  const openGallery = useCallback((id, index) => push('gallery', id, { index }), [push]);
  const openVideo = useCallback((id) => push('video', id), [push]);
  const openContent = useCallback(
    (story) => {
      if (!story) return;
      if (story.mediaType === 'Video') openVideo(story.id);
      else if (story.mediaType === 'Image') openGallery(story.id);
      else openReader(story.id);
    },
    [openVideo, openGallery, openReader]
  );
  const openEditor = useCallback((id) => push('editor', id), [push]);
  const openChapterEditor = useCallback((workId, chapterId) => push('chapter', chapterId, { workId }), [push]);
  const openEditProfile = useCallback(() => push('editprofile', 'me'), [push]);
  const openFollowList = useCallback((personId, kind, name) => push(`follows-${kind}`, personId, { kind, name }), [push]);
  const openHistory = useCallback(() => push('history', 'me'), [push]);
  const openDashboard = useCallback((subjectId) => push('dashboard', subjectId || 'me'), [push]);
  const openLevels = useCallback((subjectId) => push('levels', subjectId || 'me'), [push]);
  const openLeaderboards = useCallback((params) => push('leaderboards', 'all', { params }), [push]);
  const openSettings = useCallback(() => push('settings', 'me'), [push]);
  const openMediaLibrary = useCallback(() => push('medialibrary', 'me'), [push]);
  const openPreferences = useCallback(() => push('preferences', 'me'), [push]);
  const openUnlock = useCallback((id) => push('unlock', id), [push]);
  const openPurchases = useCallback(() => push('purchases', 'me'), [push]);
  const openReceipt = useCallback((id) => push('receipt', id), [push]);
  const openComments = useCallback((id, chapter) => push('comments', id, { chapter }), [push]);
  const openReviews = useCallback((id) => push('reviews', id), [push]);
  const openNotifications = useCallback(() => push('notifications', 'me'), [push]);
  const openReports = useCallback(() => push('reports', 'me'), [push]);
  const openVideoUpload = useCallback((workId, extra) => push('videoupload', workId, extra), [push]);
  const openMessages = useCallback(() => push('messages', 'me'), [push]);
  const openChat = useCallback((personId) => push('chat', personId), [push]);
  const openNewChat = useCallback(() => push('newchat', 'me'), [push]);
  const openBlocked = useCallback(() => push('blocked', 'me'), [push]);
  const goBack = useCallback(() => setStack((prev) => prev.slice(0, -1)), []);

  const navigation = useMemo(
    () => ({
      navigate,
      openStory,
      openCreator,
      openReader,
      openGallery,
      openVideo,
      openContent,
      openEditor,
      openChapterEditor,
      openEditProfile,
      openFollowList,
      openHistory,
      openLeaderboards,
      openLevels,
      openDashboard,
      openSettings,
      openMediaLibrary,
      openPreferences,
      openUnlock,
      openPurchases,
      openReceipt,
      openComments,
      openReviews,
      openNotifications,
      openReports,
      openVideoUpload,
      openMessages,
      openChat,
      openNewChat,
      openBlocked,
      goBack,
    }),
    [navigate, openStory, openCreator, openReader, openGallery, openVideo, openContent, openEditor, openChapterEditor, openEditProfile, openFollowList, openHistory, openLeaderboards, openLevels, openDashboard, openSettings, openMediaLibrary, openPreferences, openUnlock, openPurchases, openReceipt, openComments, openReviews, openNotifications, openReports, openVideoUpload, openMessages, openChat, openNewChat, openBlocked, goBack]
  );

  // Android hardware back: close the top page first, then return to Home, then exit.
  const backState = useRef({ depth: 0, active: 'Home' });
  backState.current = { depth: stack.length, active };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (backState.current.depth > 0) {
        goBack();
        return true;
      }
      if (backState.current.active !== 'Home') {
        navigate('Home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goBack, navigate]);

  const top = stack[stack.length - 1];
  const immersive = Boolean(top) && IMMERSIVE.includes(top.type);

  const renderPage = (entry) => {
    switch (entry.type) {
      case 'story':
        return <StoryDetailScreen storyId={entry.id} navigation={navigation} />;
      case 'creator':
        return <CreatorScreen creatorId={entry.id} navigation={navigation} />;
      case 'reader':
        return <ReaderScreen storyId={entry.id} initialChapter={entry.chapter} navigation={navigation} />;
      case 'gallery':
        return <GalleryScreen storyId={entry.id} initialIndex={entry.index} navigation={navigation} />;
      case 'video':
        return <VideoScreen storyId={entry.id} navigation={navigation} />;
      case 'editor':
        return <StoryEditorScreen workId={entry.id} navigation={navigation} />;
      case 'chapter':
        return <ChapterEditorScreen workId={entry.workId} chapterId={entry.id} navigation={navigation} />;
      case 'editprofile':
        return <EditProfileScreen navigation={navigation} />;
      case 'follows-followers':
      case 'follows-following':
        return <FollowListScreen personId={entry.id} kind={entry.kind} name={entry.name} navigation={navigation} />;
      case 'history':
        return <HistoryScreen navigation={navigation} />;
      case 'dashboard':
        return <CreatorDashboardScreen navigation={navigation} subjectId={entry.id} />;
      case 'levels':
        return <LevelsScreen navigation={navigation} subjectId={entry.id} />;
      case 'leaderboards':
        return <LeaderboardScreen navigation={navigation} initial={entry.params} />;
      case 'preferences':
        return <PreferencesScreen navigation={navigation} />;
      case 'unlock':
        return <UnlockScreen storyId={entry.id} navigation={navigation} />;
      case 'purchases':
        return <PurchasesScreen navigation={navigation} />;
      case 'receipt':
        return <ReceiptScreen txId={entry.id} navigation={navigation} />;
      case 'comments':
        return <CommentsScreen storyId={entry.id} chapter={entry.chapter} navigation={navigation} />;
      case 'reviews':
        return <ReviewsScreen storyId={entry.id} navigation={navigation} />;
      case 'notifications':
        return <NotificationsScreen navigation={navigation} />;
      case 'reports':
        return <ReportsScreen navigation={navigation} />;
      case 'videoupload':
        return <VideoUploadScreen workId={entry.id} chapterId={entry.chapterId} blockId={entry.blockId} navigation={navigation} />;
      case 'messages':
        return <MessagesScreen navigation={navigation} />;
      case 'chat':
        return <ChatScreen personId={entry.id} navigation={navigation} />;
      case 'newchat':
        return <NewChatScreen navigation={navigation} />;
      case 'blocked':
        return <BlockedScreen navigation={navigation} />;
      case 'settings':
        return <SettingsScreen navigation={navigation} />;
      case 'medialibrary':
        return <MediaLibraryScreen navigation={navigation} />;
      default:
        return null;
    }
  };

  return (
    <BottomInsetContext.Provider value={immersive}>
    <View style={styles.root}>
      <View style={styles.screens}>
        {TABS.map(({ name, component: Screen }) =>
          visited[name] ? (
            <View
              key={name}
              style={[styles.screen, active !== name && styles.hidden]}
              pointerEvents={active === name ? 'auto' : 'none'}
            >
              <Screen navigation={navigation} params={tabParams[name]} />
            </View>
          ) : null
        )}

        {stack.map((entry, i) => {
          const isTop = i === stack.length - 1;
          return (
            <View
              key={`${i}-${entry.type}-${entry.id}`}
              style={[styles.overlay, !isTop && styles.hidden]}
              pointerEvents={isTop ? 'auto' : 'none'}
            >
              {renderPage(entry)}
            </View>
          );
        })}
      </View>
      {immersive ? null : <TabBar tabs={TABS.map((t) => t.name)} active={active} onChange={navigate} />}
    </View>
    </BottomInsetContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream100 },
  screens: { flex: 1 },
  screen: { ...StyleSheet.absoluteFillObject },
  hidden: { display: 'none' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.cream100 },
});
