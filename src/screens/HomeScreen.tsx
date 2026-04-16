import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ImageBackground,
  StyleSheet,
  NativeModules,
  Alert,
  AppState,
  InteractionManager,
} from 'react-native';
import { getApps, setWallpaper, openApp } from '../services/appService';
import AppIcon from '../components/AppIconComponent';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AppDrawer from './AppDrawer';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '../components/TopHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBootSplash from 'react-native-bootsplash';

// Optimized spring config for a "snappy" launcher feel
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 120,
  mass: 0.8,
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [apps, setApps] = useState<any[]>([]);
  const [allApps, setAllApps] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const lastAppRefreshTs = React.useRef(0);

  // Normalized progress: 0 = home, 1 = drawer fully open
  const progress = useSharedValue(0);

  useEffect(() => {
    const init = async () => {
      try {
        await loadApps();

        InteractionManager.runAfterInteractions(() => {
          setWallpaper().catch(e => {
            console.error('Failed to set wallpaper:', e);
          });
          checkDefaultLauncher().catch(e => {
            console.error('Failed to check default launcher:', e);
          });
        });
      } catch (e) {
        console.error('Initialization failed:', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        const now = Date.now();
        if (now - lastAppRefreshTs.current < 1500) {
          return;
        }
        lastAppRefreshTs.current = now;
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

  const handleClose = useCallback(() => {
    setShowDrawer(false);
    setSelectedSlot(null);
  }, []);

  // Sync state to animation
  useEffect(() => {
    progress.value = withSpring(showDrawer ? 1 : 0, SPRING_CONFIG);
  }, [showDrawer, progress]);

  const panGesture = Gesture.Pan()
    .enabled(!showDrawer)
    .activeOffsetY([-45, 40]) // Even stricter to ensure zero overlap with icon touches
    .onUpdate(event => {
      if (!showDrawer && event.translationY < 0) {
        // Swiping up from home: progress 0 -> 1
        progress.value = Math.min(1, Math.abs(event.translationY) / 400);
      }
    })
    .onEnd(event => {
      if (!showDrawer) {
        if (event.translationY < -100 || event.velocityY < -500) {
          runOnJS(setShowDrawer)(true);
        } else {
          progress.value = withSpring(0, SPRING_CONFIG);
        }
      }
    });

  const homeBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolate.CLAMP),
  }));

  const drawerBackgroundStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolate.CLAMP),
  }));

  const homeUiStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.82], [1, 0], Extrapolate.CLAMP),
  }));

  const loadApps = async () => {
    const saved = await AsyncStorage.getItem('dock_apps');
    if (saved) {
      setApps(JSON.parse(saved));
    } else {
      const defaultApps = await NativeModules.AppModule.getDefaultApps();
      const sortedDefault = defaultApps.sort((a: any, b: any) =>
        a.name.localeCompare(b.name),
      );
      setApps(sortedDefault);
      await AsyncStorage.setItem('dock_apps', JSON.stringify(sortedDefault));
    }

    const installedApps = await getApps();
    setAllApps(installedApps);
    RNBootSplash.hide({ fade: true });
  };

  const handleReplace = useCallback((index: number) => {
    setSelectedSlot(index);
    setShowDrawer(true);
  }, []);

  const handleSelectApp = useCallback(
    async (newApp: any) => {
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
    },
    [apps, selectedSlot, handleClose],
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, homeBackgroundStyle]}
        >
          <ImageBackground
            source={require('../assets/images/bg-image.webp')}
            style={styles.container}
          />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, drawerBackgroundStyle]}
        >
          <ImageBackground
            source={require('../assets/images/drawer-bg.webp')}
            style={styles.container}
          />
        </Animated.View>

        <Animated.View style={[styles.homeUiLayer, homeUiStyle]}>
          <TopHeader />
          <View style={[styles.dockWrapper, { bottom: insets.bottom + 20 }]}>
            <View style={styles.dockGlass}>
              <View style={styles.topHighlight} />

              <View style={styles.innerGlow} />

              {apps.map((app: any, index: number) => (
                <AppIcon
                  key={`${app.package}-${index}`}
                  app={app}
                  onLongPress={() => handleReplace(index)}
                  isEditing={selectedSlot === index}
                />
              ))}
            </View>
          </View>
        </Animated.View>

        <AppDrawer
          apps={allApps}
          showDrawer={showDrawer}
          progress={progress}
          onClose={handleClose}
          onSelectApp={handleSelectApp}
          title={
            selectedSlot !== null
              ? `Select Replacement for ${apps[selectedSlot]?.name}`
              : undefined
          }
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dockWrapper: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center', // center dock
  },

  dockBlur: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30, // pill shape

    // glass effect
    backgroundColor: 'rgba(255,255,255,0.08)',

    // border glow
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',

    // shadow (Android + iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  homeUiLayer: {
    flex: 1,
  },

  dockGlass: {
    width: '96%', // floating look
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    paddingVertical: 12,

    borderRadius: 30,

    // 🔥 main glass color
    backgroundColor: 'rgba(255,255,255,0.08)',

    // 🔥 border for glass edge
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',

    overflow: 'hidden',

    // 🔥 shadow = depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  innerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // 🔥 top light reflection (THIS makes it feel real)
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    opacity: 0.6,
  },
});
