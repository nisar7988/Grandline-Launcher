import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  ImageBackground,
  Image,
  Text,
  View,
  Animated,
} from 'react-native';
import { openApp } from '../services/appService';

interface AppIconProps {
  app: any;
  onLongPress?: () => void;
  onPress?: () => void;
  isEditing?: boolean;
}

export default function AppIcon({
  app,
  onLongPress,
  onPress,
  isEditing,
}: AppIconProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEditing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(wiggleAnim, {
            toValue: 2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(wiggleAnim, {
            toValue: -2,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      wiggleAnim.setValue(0);
    }
  }, [isEditing, wiggleAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.1,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      openApp(app.package);
    }
  };

  return (
    <Animated.View
      style={{
        transform: [
          { scale: scaleAnim },
          {
            rotate: wiggleAnim.interpolate({
              inputRange: [-2, 2],
              outputRange: ['-1deg', '1deg'],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={300}
        activeOpacity={0.8}
      >
        <ImageBackground
          source={require('../assets/images/wanted-bg.png')}
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
                marginBottom: 10,
              }}
            />
            <Text
              style={{
                fontWeight: '800',
                textAlign: 'center',
                fontSize: 10,
                width: '100%',
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {app.name}
            </Text>
          </View>

          {/* Edit Badge */}
          {isEditing && (
            <View
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                backgroundColor: '#FFD700', // Gold color for One Piece feel
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
              <Text style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }}>
                +
              </Text>
            </View>
          )}
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}
