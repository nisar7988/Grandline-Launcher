import React, { useEffect, useCallback } from 'react';
import { ImageBackground, Image, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { openApp } from '../services/appService';

interface AppIconProps {
  app: any;
  onLongPress?: (event: any) => void;
  onPress?: () => void;
  isEditing?: boolean;
}

const AppIcon = React.memo(
  ({ app, onLongPress, onPress, isEditing }: AppIconProps) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
      if (isEditing) {
        rotation.value = withRepeat(
          withSequence(
            withTiming(-1, { duration: 100 }),
            withTiming(1, { duration: 100 }),
          ),
          -1,
          true,
        );
      } else {
        cancelAnimation(rotation);
        rotation.value = withTiming(0, { duration: 100 });
      }
    }, [isEditing, rotation]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
      opacity: opacity.value,
    }));

    const handlePress = useCallback(() => {
      if (onPress) {
        onPress();
      } else {
        openApp(app.package);
      }
    }, [onPress, app.package]);

    const handlePressIn = useCallback(() => {
      scale.value = withSpring(1.05, { damping: 10, stiffness: 300 });
      opacity.value = withTiming(0.7, { duration: 100 });
    }, [scale, opacity]);

    const handlePressOut = useCallback(() => {
      scale.value = withSpring(1, { damping: 10, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 100 });
    }, [scale, opacity]);

    return (
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={250}
        hitSlop={15}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              width: 90,
              height: 110,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <ImageBackground
            source={require('../assets/images/wanted-bg.webp')}
            style={{ width: 90, height: 110 }}
          >
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                position: 'absolute',
                bottom: 14,
                width: '100%',
                paddingHorizontal: 6,
              }}
            >
              <Image
                source={{ uri: app.icon }}
                style={{
                  width: 40,
                  height: 40,
                  alignSelf: 'center',
                  marginBottom: 7,
                }}
              />
              <Text
                style={{
                  fontWeight: '800',
                  textAlign: 'center',
                  fontSize: 10,
                  width: '70%',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {app.name}
              </Text>
            </View>

            {isEditing && (
              <View
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  backgroundColor: '#FFD700',
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#333',
                  zIndex: 10,
                }}
              >
                <Text
                  style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}
                >
                  +
                </Text>
              </View>
            )}
          </ImageBackground>
        </Animated.View>
      </Pressable>
    );
  },
);

export default AppIcon;
