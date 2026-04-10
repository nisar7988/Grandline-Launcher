import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DeviceInfo from 'react-native-device-info';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../constant/colors';

export default function TopHeader() {
  const insets = useSafeAreaInsets();

  // Synchronous battery check (returns 0 to 1)
  const batteryLevel = DeviceInfo.getBatteryLevelSync();
  const batteryPercentage = Math.round(batteryLevel * 100);

  // Check if the bar is practically full to color the right tip
  const isFull = batteryPercentage >= 99;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;

  return (
    <View style={[styles.container, { top: insets.top + 15 }]}>
      {/* LEFT - Compass */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Image
          source={require('../assets/images/header.png')}
          style={styles.compass}
        />

        {/* CENTER - Time */}
        <View style={styles.timeContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={styles.time}>
              {displayHour}:{minutes}
            </Text>
            <Text style={styles.ampm}>{ampm}</Text>
          </View>

          <Text style={styles.subText}>GRAND LINE TIME</Text>
        </View>
      </View>

      {/* RIGHT - Energy */}
      <View style={styles.energyContainer}>
        {/* Top Text Row */}
        <View style={styles.energyTopRow}>
          <Text style={styles.energyTitle}>HAKI / ENERGY</Text>
        </View>

        {/* The Hexagon Bar */}
        <View style={styles.energyBarWrapper}>
          <View style={[styles.leftPoint, { backgroundColor: '#892dfd' }]} />

          <View style={styles.barCenter}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.max(5, batteryPercentage)}%` },
              ]}
            >
              <LinearGradient
                colors={['#892dfd', '#7b6fff', '#68aefc', '#58d3fb', '#4bf4ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ flex: 1 }}
              />
            </View>

            {/* Percentage Text Inside Bar */}
            <View style={StyleSheet.absoluteFill}>
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 10,
                    fontWeight: '900',
                    textShadowColor: 'rgba(0, 0, 0, 0.75)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {batteryPercentage}%
                </Text>
              </View>
            </View>
          </View>

          {/* DYNAMIC RIGHT POINT: Turns cyan when full, stays dark otherwise */}
          <View
            style={[
              styles.rightPoint,
              { backgroundColor: isFull ? '#4bf4ff' : '#1b2c36' },
            ]}
          />
        </View>

        {/* Bottom Text Row */}
        <Text style={styles.energySub}>A HAKI AURA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  compass: {
    width: 100,
    height: 100,
  },
  timeContainer: {
    alignItems: 'center',
  },
  time: {
    fontSize: 35,
    fontWeight: '800',
    color: COLORS.PRIMARY,
  },
  ampm: {
    fontSize: 22,
    marginLeft: 8,
    fontWeight: '700',
  },
  subText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  energyContainer: {
    marginTop: 10,
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  energyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  energyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1a1d1e',
    letterSpacing: -0.2,
  },
  energyValue: {
    fontSize: 14, // Larger percentage
    fontWeight: '900',
    color: '#222', // Darker for clarity
  },
  energyBarWrapper: {
    width: '100%',
    height: 20,
    justifyContent: 'center',
    shadowColor: '#4bf4ff',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    marginVertical: 4,
  },
  barCenter: {
    position: 'absolute',
    left: 9,
    right: 9,
    height: 18,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#737a72',
    backgroundColor: '#1b2c36',
    zIndex: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    flexDirection: 'row',
  },
  leftPoint: {
    position: 'absolute',
    left: 2.6,
    width: 12.7,
    height: 12.7,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#737a72',
    transform: [{ rotate: '45deg' }],
    zIndex: 4,
  },
  rightPoint: {
    position: 'absolute',
    right: 2.6,
    width: 12.7,
    height: 12.7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#737a72',
    transform: [{ rotate: '45deg' }],
    zIndex: 4,
  },
  energySub: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1a1d1e',
    alignSelf: 'flex-end',
    marginTop: 2,
    paddingRight: 4,
  },
});
