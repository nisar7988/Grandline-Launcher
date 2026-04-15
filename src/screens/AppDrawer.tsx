import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  TextInput,
  Text,
  Keyboard,
  BackHandler,
  Platform,
  useWindowDimensions,
} from 'react-native';
import AppIcon from '../components/AppIconComponent';
import ContextMenu from '../components/ContextMenu';
import Animated, {
  useAnimatedStyle,
  SharedValue,
  interpolate,
  Extrapolate,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from '@react-native-community/blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppDrawerProps {
  apps: any[];
  showDrawer: boolean;
  progress: SharedValue<number>;
  onClose: () => void;
  onSelectApp?: (app: any) => void;
  title?: string;
}

export default function AppDrawer({
  apps,
  showDrawer,
  progress,
  onClose,
  onSelectApp,
  title,
}: AppDrawerProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuApp, setContextMenuApp] = useState<any>(null);
  const [contextMenuAnchor, setContextMenuAnchor] = useState<{ x: number, y: number } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const horizontalListRef = useRef<FlatList<any[]>>(null);
  const touchStartYRef = useRef<number | null>(null);
  const swipeCloseTriggeredRef = useRef(false);
  const APPS_PER_PAGE = 20;

  useEffect(() => {
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      inputRef.current?.blur();
      setIsFocused(false);
    });
    return () => keyboardHideListener.remove();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 100);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const sortedApps = useMemo(
    () => [...apps].sort((a, b) => a.name.localeCompare(b.name)),
    [apps],
  );

  const filteredApps = useMemo(() => {
    if (!debouncedQuery) {
      return sortedApps;
    }
    return sortedApps.filter(app =>
      app.name.toLowerCase().includes(debouncedQuery),
    );
  }, [sortedApps, debouncedQuery]);

  const pagedApps = useMemo(() => {
    const pages: any[][] = [];
    for (let i = 0; i < filteredApps.length; i += APPS_PER_PAGE) {
      pages.push(filteredApps.slice(i, i + APPS_PER_PAGE));
    }
    return pages;
  }, [filteredApps]);

  useEffect(() => {
    if (!showDrawer) {
      setSearchQuery('');
      setDebouncedQuery('');
      inputRef.current?.blur();
      Keyboard.dismiss();
      setActivePage(0);
    }
  }, [showDrawer]);

  useEffect(() => {
    if (!showDrawer) {
      return;
    }
    setActivePage(0);
    horizontalListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [showDrawer]);

  useEffect(() => {
    if (!pagedApps.length) {
      setActivePage(0);
      return;
    }

    const clampedPage = Math.min(activePage, pagedApps.length - 1);
    if (clampedPage !== activePage) {
      setActivePage(clampedPage);
      horizontalListRef.current?.scrollToOffset({
        offset: clampedPage * screenWidth,
        animated: false,
      });
    }
  }, [pagedApps, activePage, screenWidth]);

  useEffect(() => {
    if (!showDrawer) return;

    const backAction = () => {
      if (searchQuery !== '' || isFocused) {
        setSearchQuery('');
        inputRef.current?.blur();
        Keyboard.dismiss();
        setIsFocused(false);
        return true;
      }
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [showDrawer, searchQuery, isFocused, onClose]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [40, 0], Extrapolate.CLAMP) }
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      display: progress.value === 0 ? 'none' : 'flex',
    };
  });

  const searchBarStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0.4, 1], [0, 1], Extrapolate.CLAMP),
      transform: [
        { translateY: interpolate(progress.value, [0.4, 1], [15, 0], Extrapolate.CLAMP) }
      ],
    };
  });

  const handlePageScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / screenWidth);
    setActivePage(Math.max(0, page));
  }, [screenWidth]);

  const closeGesture = Gesture.Pan()
    .enabled(showDrawer)
    .activeOffsetY([5, 999])
    .failOffsetX([-20, 20])
    .onUpdate(event => {
      if (event.translationY > 0) {
        progress.value = Math.max(0, 1 - event.translationY / 200);
      }
    })
    .onEnd(event => {
      if (event.translationY > 30 || event.velocityY > 400) {
        runOnJS(onClose)();
      } else {
        progress.value = withSpring(1);
      }
    });

  const onLongPressIcon = useCallback((e: any, app: any) => {
    const { pageX, pageY } = e.nativeEvent;
    setContextMenuAnchor({ x: pageX, y: pageY });
    setContextMenuApp(app);
    setContextMenuVisible(true);
  }, []);

  const renderItem = useCallback(({ item }: { item: any }) => (
   <View style={{ marginVertical: 10, marginHorizontal: 3 }}>  
    <AppIcon
      app={item}
      onPress={() => onSelectApp && onSelectApp(item)}
      onLongPress={(e) => onLongPressIcon(e, item)}
    />
   </View>
  ), [onSelectApp, onLongPressIcon]);

  const keyExtractor = useCallback((item: any) => item.package, []);

  const renderPage = useCallback(({ item }: { item: any[] }) => (
    <View style={[styles.page, { width: screenWidth }]}>
      <FlatList
        data={item}
        numColumns={4}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.pageGrid}
        scrollEnabled={false}
        keyboardShouldPersistTaps="always"
        removeClippedSubviews={false}
      />
    </View>
  ), [screenWidth, keyExtractor, renderItem]);

  const pageKeyExtractor = useCallback((_: any[], index: number) => `page-${index}`, []);

  const resetSwipeFallbackState = useCallback(() => {
    touchStartYRef.current = null;
    swipeCloseTriggeredRef.current = false;
  }, []);

  const handleSwipeFallbackMove = useCallback(
    (pageY: number) => {
      if (touchStartYRef.current == null) {
        touchStartYRef.current = pageY;
        return;
      }

      if (swipeCloseTriggeredRef.current) {
        return;
      }

      const deltaY = pageY - touchStartYRef.current;
      if (deltaY > 24) {
        swipeCloseTriggeredRef.current = true;
        onClose();
      }
    },
    [onClose],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        pointerEvents={showDrawer ? 'auto' : 'none'}
        style={[styles.container, { paddingTop: insets.top }, animatedStyle]}
      >
        <GestureDetector gesture={closeGesture}>
          <View style={styles.drawerContent}>
            {Platform.OS === 'ios' ? (
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={18}
                reducedTransparencyFallbackColor="rgba(20,20,20,0.55)"
              />
            ) : (
              <View style={styles.androidFrostedFallback} />
            )}
            <View style={styles.gestureArea}>
              <View style={styles.handle}>
                <View style={styles.handlePill} />
              </View>
              {title && (
                <Text style={styles.titleText}>
                  {title}
                </Text>
              )}

              <Animated.View style={[styles.searchBar, searchBarStyle]}>
                <TextInput
                  ref={inputRef}
                  placeholder="Search Grand Line..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  style={styles.searchBarInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  clearButtonMode="while-editing"
                />
              </Animated.View>

              <View
                style={styles.horizontalPager}
                onTouchStart={event => {
                  touchStartYRef.current = event.nativeEvent.pageY;
                  swipeCloseTriggeredRef.current = false;
                }}
                onTouchMove={event => {
                  handleSwipeFallbackMove(event.nativeEvent.pageY);
                }}
                onTouchEnd={resetSwipeFallbackState}
                onTouchCancel={resetSwipeFallbackState}
              >
                <FlatList
                  ref={horizontalListRef}
                  data={pagedApps}
                  keyExtractor={pageKeyExtractor}
                  renderItem={renderPage}
                  style={styles.horizontalPager}
                  horizontal
                  pagingEnabled
                  onScroll={handlePageScroll}
                  onScrollBeginDrag={() => Keyboard.dismiss()}
                  scrollEventThrottle={16}
                  nestedScrollEnabled={true}
                  bounces={false}
                  keyboardShouldPersistTaps="always"
                  initialNumToRender={1}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  removeClippedSubviews={true}
                  showsHorizontalScrollIndicator={false}
                  getItemLayout={(_, index) => ({
                    length: screenWidth,
                    offset: screenWidth * index,
                    index,
                  })}
                />
              </View>

              {pagedApps.length > 1 && (
                <View style={[styles.pageIndicatorContainer, { paddingBottom: insets.bottom + 16 }]}>
                  {pagedApps.map((_, index) => (
                    <View
                      key={`indicator-${index}`}
                      style={[
                        styles.pageDot,
                        index === activePage && styles.pageDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </GestureDetector>
      </Animated.View>

      <ContextMenu
        visible={contextMenuVisible}
        app={contextMenuApp}
        anchor={contextMenuAnchor}
        onClose={() => setContextMenuVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  drawerContent: {
    flex: 1,

    paddingTop: 8,
  },
  gestureArea: {
    flex: 1,
  },
  androidFrostedFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20,20,24,0.35)',
  },
  handle: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handlePill: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  titleText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.9,
  },
  searchBar: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  searchBarInput: {
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 20,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  page: {
    flex: 1,
  },
  horizontalPager: {
    flex: 1,
  },
  pageGrid: {
    paddingBottom: 40,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  pageDotActive: {
    width: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
