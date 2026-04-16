import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
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
import {
  Gesture,
  GestureDetector,
  FlatList,
} from 'react-native-gesture-handler';
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
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuApp, setContextMenuApp] = useState<any>(null);
  const [contextMenuAnchor, setContextMenuAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

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

  const filteredApps = useMemo(() => {
    const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
    if (!debouncedQuery) {
      return sorted;
    }
    return sorted.filter(app =>
      app.name.toLowerCase().includes(debouncedQuery),
    );
  }, [apps, debouncedQuery]);

  useEffect(() => {
    if (!showDrawer) {
      setSearchQuery('');
      setDebouncedQuery('');
      inputRef.current?.blur();
      Keyboard.dismiss();
    }
  }, [showDrawer]);

  useEffect(() => {
    if (!showDrawer) {
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [showDrawer]);

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
        {
          translateY: interpolate(
            progress.value,
            [0, 1],
            [40, 0],
            Extrapolate.CLAMP,
          ),
        },
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
        {
          translateY: interpolate(
            progress.value,
            [0.4, 1],
            [15, 0],
            Extrapolate.CLAMP,
          ),
        },
      ],
    };
  });

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
      if (event.translationY > 40 || event.velocityY > 500) {
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

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <AppIcon
        app={item}
        onPress={() => onSelectApp && onSelectApp(item)}
        onLongPress={e => onLongPressIcon(e, item)}
      />
    ),
    [onSelectApp, onLongPressIcon],
  );

  const keyExtractor = useCallback((item: any) => item.package, []);

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
        <View style={styles.drawerContent}>
          <View style={styles.androidFrostedFallback} />

          <View style={styles.gestureArea}>
            <GestureDetector gesture={closeGesture}>
              <View style={styles.headerArea}>
                <View style={styles.handle}>
                  <View style={styles.handlePill} />
                </View>
                {title && <Text style={styles.titleText}>{title}</Text>}

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
              </View>
            </GestureDetector>

            <FlatList
              style={styles.verticalList}
              numColumns={4}
              data={filteredApps}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              onScrollBeginDrag={() => Keyboard.dismiss()}
              scrollEventThrottle={16}
              nestedScrollEnabled={true}
              bounces={false}
              keyboardShouldPersistTaps="always"
              removeClippedSubviews={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
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

    alignItems: 'center',
    marginBottom: 20,
  },
  headerArea: {
    width: '100%',
    paddingBottom: 10,
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
    marginVertical: 10,
    marginHorizontal: 24,
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
  verticalList: {
    flex: 1,
  },
});
