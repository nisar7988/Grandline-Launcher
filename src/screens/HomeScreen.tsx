import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  ImageBackground,
  StyleSheet,
  NativeModules,
} from 'react-native';
import { getApps } from '../services/appService';
import AppIcon from '../components/AppIconComponent';
import { PanResponder, Dimensions } from 'react-native';
import AppDrawer from './AppDrawer';
import { useSharedValue, withSpring } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen() {
  const [apps, setApps] = useState([]);
  const [allApps, setAllApps] = useState([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [isDrawerAtTop, setIsDrawerAtTop] = useState(true);
  const translateY = useSharedValue(SCREEN_HEIGHT);

  useEffect(() => {
    loadApps();
  }, []);

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
  }, [showDrawer]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
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
            translateY.value = Math.max(0, gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldOpen = gesture.dy < -100 || gesture.vy < -0.5;
          const shouldClose = gesture.dy > 100 || gesture.vy > 0.5;

          if (!showDrawer && shouldOpen) {
            setShowDrawer(true);
          } else if (showDrawer && shouldClose) {
            setShowDrawer(false);
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
    [showDrawer, translateY, isDrawerAtTop],
  );

  const loadApps = async () => {
    const defaultApps = await NativeModules.AppModule.getDefaultApps();
    setApps(defaultApps);

    const installedApps = await getApps();
    setAllApps(installedApps);
  };

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require('../assets/images/bg-image.png')}
        style={styles.container}
        {...panResponder.panHandlers}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            position: 'absolute',
            bottom: 20,
            width: '100%',
          }}
        >
          {apps.map((app: any) => (
            <AppIcon key={app.package} app={app} />
          ))}
        </View>
      </ImageBackground>

      <AppDrawer
        apps={allApps}
        showDrawer={showDrawer}
        translateY={translateY}
        onClose={() => setShowDrawer(false)}
        setIsAtTop={setIsDrawerAtTop}
        panHandlers={panResponder.panHandlers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
});
