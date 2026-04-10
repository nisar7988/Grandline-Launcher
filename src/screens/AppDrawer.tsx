import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import AppIcon from '../components/AppIconComponent';
import Animated, {
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppDrawerProps {
  apps: any[];
  showDrawer: boolean;
  translateY: SharedValue<number>;
  onClose: () => void;
  setIsAtTop: (atTop: boolean) => void;
  panHandlers: any;
}

export default function AppDrawer({
  apps,
  showDrawer,
  translateY,
  onClose,
  setIsAtTop,
  panHandlers,
}: AppDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = useMemo(() => {
    if (!searchQuery) return apps;
    return apps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [apps, searchQuery]);

  useEffect(() => {
    if (!showDrawer) {
      setSearchQuery('');
    }
  }, [showDrawer]);

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
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Background overlay to close the drawer */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <View style={styles.drawerContent} {...panHandlers}>
        <View style={styles.handle} />
        <View style={styles.searchBar}>
          <TextInput
            placeholder="Search apps"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            style={styles.searchBarInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
        <FlatList
          data={filteredApps}
          numColumns={4}
          keyExtractor={item => item.package}
          renderItem={({ item }) => <AppIcon app={item} />}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingBottom: 100,
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
    paddingTop: 50,
    zIndex: 1000,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 15,
  },
  searchBarInput: {
    height: 48,
    backgroundColor: 'rgba(155, 153, 153, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 15,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  drawerContent: {
    flex: 1,
    backgroundColor: 'rgba(77, 71, 71, 0.46)',
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
