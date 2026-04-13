import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  ImageBackground,
  StyleSheet,
  NativeModules,
  BackHandler,
  Alert,
  Keyboard,
  AppState,
  AppStateStatus,
} from 'react-native';
import { getApps, setWallpaper, openApp } from '../services/appService';
import AppIcon from '../components/AppIconComponent';
import { PanResponder, Dimensions } from 'react-native';
import AppDrawer from './AppDrawer';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBootSplash from 'react-native-bootsplash';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [apps, setApps] = useState<any[]>([]);
  const [allApps, setAllApps] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isDrawerAtTop, setIsDrawerAtTop] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    const init = async () => {
      // Run tasks independently so one failure doesn't block others
      try {
        await loadApps();
      } catch (e) {
        console.error('Failed to load apps:', e);
      }

      try {
        await setWallpaper();
      } catch (e) {
        console.error('Failed to set wallpaper:', e);
      }

      try {
        await checkDefaultLauncher();
      } catch (e) {
        console.error('Failed to check default launcher:', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // Refresh the app list when returning to the launcher
        getApps().then(installedApps => {
          setAllApps(installedApps);
        });
      }
    });
    return () => subscription.remove();
  }, []);

  const checkDefaultLauncher = async () => {
    try {
      const isDefault = await NativeModules.AppModule.isDefaultLauncher();
      if (!isDefault) {
        Alert.alert(
          'Set Default Launcher',
          'To use GrandLine Launcher properly, please set it as your default home app.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Set as Default',
              onPress: () => NativeModules.AppModule.requestDefaultLauncher(),
            },
          ],
        );
      }
    } catch (e) {
      console.error('Failed to check default launcher:', e);
    }
  };

  useEffect(() => {
    // Sync state changes to animation (programmatic open/close)
    translateY.value = withSpring(showDrawer ? 0 : SCREEN_HEIGHT, {
      damping: 20,
      stiffness: 90,
      mass: 0.5,
    });

    if (showDrawer) {
      setIsDrawerAtTop(true); // Reset when opening
    }
  }, [showDrawer, translateY]);

  useEffect(() => {
    const backAction = () => {
      if (showDrawer) {
        handleClose();
        return true;
      }
      // On home screen, back button should do nothing to avoid navigation loops
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [showDrawer]);

  const handleClose = useCallback(() => {
    setShowDrawer(false);
    setSelectedSlot(null);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          // Steal responder from FlatList when pulling down at the top
          if (showDrawer) {
            return isDrawerAtTop && gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
          }
          return false;
        },
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (showDrawer) {
            // Only capture swipe down if the drawer list is at very top
            return isDrawerAtTop && gesture.dy > 10;
          }
          // Sensitive enough for swipes up when closed
          return !showDrawer && gesture.dy < -10;
        },
        onPanResponderMove: (_, gesture) => {
          if (!showDrawer && gesture.dy < 0) {
            translateY.value = Math.max(0, SCREEN_HEIGHT + gesture.dy);
          } else if (showDrawer && gesture.dy > 0) {
            Keyboard.dismiss();
            translateY.value = Math.max(0, gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldOpen = gesture.dy < -100 || gesture.vy < -0.5;
          const shouldClose = gesture.dy > 100 || gesture.vy > 0.5;

          if (!showDrawer && shouldOpen) {
            setShowDrawer(true);
          } else if (showDrawer && shouldClose) {
            handleClose();
          } else {
            // Snap back
            translateY.value = withSpring(showDrawer ? 0 : SCREEN_HEIGHT, {
              velocity: gesture.vy,
              damping: 20,
              stiffness: 90,
            });
          }
        },
      }),
    [showDrawer, translateY, isDrawerAtTop, handleClose],
  );

  const loadApps = async () => {
    // 1. Try to load saved dock apps first
    const saved = await AsyncStorage.getItem('dock_apps');
    if (saved) {
      setApps(JSON.parse(saved));
    } else {
      // Fallback to default apps if nothing saved
      const defaultApps = await NativeModules.AppModule.getDefaultApps();
      const sortedDefault = defaultApps.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setApps(sortedDefault);
      // Save them initially so they stick
      await AsyncStorage.setItem('dock_apps', JSON.stringify(sortedDefault));
    }

    const installedApps = await getApps();
    setAllApps(installedApps);

    // Hide splash screen once initial apps are loaded
    RNBootSplash.hide({ fade: true });
  };

  const handleReplace = useCallback((index: number) => {
    setSelectedSlot(index);
    setShowDrawer(true);
  }, []);

  const handleSelectApp = useCallback(async (newApp: any) => {
    if (selectedSlot === null) {
      openApp(newApp.package);
      handleClose();
      return;
    }

    const updated = [...apps];
    updated[selectedSlot] = newApp;

    setApps(updated);
    await AsyncStorage.setItem('dock_apps', JSON.stringify(updated));

    handleClose();
  }, [apps, selectedSlot, handleClose]);

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/images/bg-image.webp')}
        style={styles.container}
        {...panResponder.panHandlers}
      >
        <TopHeader />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            position: 'absolute',
            bottom: insets.bottom + 20,
            width: '100%',
          }}
        >
          {apps.map((app: any, index: number) => (
            <AppIcon
              key={`${app.package}-${index}`}
              app={app}
              onLongPress={() => handleReplace(index)}
              isEditing={selectedSlot === index}
            />
          ))}
        </View>
      </ImageBackground>

      <AppDrawer
        apps={allApps}
        showDrawer={showDrawer}
        translateY={translateY}
        onClose={handleClose}
        setIsAtTop={setIsDrawerAtTop}
        panHandlers={panResponder.panHandlers}
        onSelectApp={handleSelectApp}
        title={
          selectedSlot !== null
            ? `Select Replacement for ${apps[selectedSlot]?.name}`
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
