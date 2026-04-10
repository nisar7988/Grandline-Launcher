import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  TextInput,
  Text,
  Keyboard,
  BackHandler,
} from 'react-native';
import AppIcon from '../components/AppIconComponent';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppDrawerProps {
  apps: any[];
  showDrawer: boolean;
  translateY: SharedValue<number>;
  onClose: () => void;
  setIsAtTop: (atTop: boolean) => void;
  panHandlers: any;
  onSelectApp?: (app: any) => void;
  title?: string;
}

export default function AppDrawer({
  apps,
  showDrawer,
  translateY,
  onClose,
  setIsAtTop,
  panHandlers,
  onSelectApp,
  title,
}: AppDrawerProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      inputRef.current?.blur();
      setIsFocused(false);
    });
    return () => keyboardHideListener.remove();
  }, []);

  const filteredApps = useMemo(() => {
    if (!searchQuery) return apps;
    return apps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [apps, searchQuery]);

  useEffect(() => {
    if (!showDrawer) {
      setSearchQuery('');
      inputRef.current?.blur();
      Keyboard.dismiss();
    }
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
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [showDrawer, searchQuery]);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // We consider it "at top" if the user has scrolled to 0 or even slightly overscrolled
    setIsAtTop(offsetY <= 0);
  };

  return (
    <Animated.View
      style={[styles.container, { paddingTop: insets.top }, animatedStyle]}
    >
      {/* Background overlay to close the drawer */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={styles.drawerContent} {...panHandlers}>
        <View style={styles.handle} />
        {title && (
          <Text
            style={{
              color: 'white',
              fontSize: 20,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 10,
              fontFamily: 'Roboto', // Or any custom font if available
            }}
          >
            {title}
          </Text>
        )}
        <View style={styles.searchBar}>
          <TextInput
            ref={inputRef}
            placeholder="Search apps"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            style={styles.searchBarInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            clearButtonMode="while-editing"
          />
        </View>
        <FlatList
          data={filteredApps}
          numColumns={4}
          keyExtractor={item => item.package}
          renderItem={({ item }) => (
            <AppIcon
              app={item}
              onPress={() => onSelectApp && onSelectApp(item)}
            />
          )}
          onScroll={handleScroll}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 10,
          }}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 15,
  },
  searchBarInput: {
    height: 48,
    backgroundColor: 'rgba(95, 91, 91, 0.64)',
    borderRadius: 14,
    paddingHorizontal: 15,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerContent: {
    flex: 1,
    backgroundColor: 'rgba(77, 71, 71, 0.83)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },
});
