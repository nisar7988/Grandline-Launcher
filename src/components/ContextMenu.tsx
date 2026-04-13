import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Share,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { openApp, openAppInfo, uninstallApp } from '../services/appService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppData {
  package: string;
  name: string;
  icon?: string;
}

interface ContextMenuProps {
  visible: boolean;
  app: AppData | null;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ✅ Responsive sizes
const MENU_WIDTH = SCREEN_WIDTH * 0.7;
const MENU_MAX_HEIGHT = SCREEN_HEIGHT * 0.6;

export default function ContextMenu({
  visible,
  app,
  anchor,
  onClose,
}: ContextMenuProps) {
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (visible && app) {
      checkFavorite(app.package);
    }
  }, [visible, app]);

  const checkFavorite = async (pkg: string) => {
    try {
      const favsStr = await AsyncStorage.getItem('favorite_apps');
      const favs = favsStr ? JSON.parse(favsStr) : [];
      setFavorite(favs.some((f: any) => f.package === pkg));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleFavorite = async () => {
    if (!app) return;
    try {
      const favsStr = await AsyncStorage.getItem('favorite_apps');
      let favs = favsStr ? JSON.parse(favsStr) : [];

      if (favorite) {
        favs = favs.filter((f: any) => f.package !== app.package);
      } else {
        favs.push(app);
      }

      await AsyncStorage.setItem('favorite_apps', JSON.stringify(favs));
      setFavorite(!favorite);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (!app) return;
    try {
      const url = `https://play.google.com/store/apps/details?id=${app.package}`;
      await Share.share({
        message: `Check out ${app.name} on the Play Store: ${url}`,
        url,
        title: `Share ${app.name}`,
      });
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  if (!app || !anchor) return null;

  // ✅ Smart positioning
  let menuLeft = anchor.x;
  let menuTop = anchor.y;

  if (menuLeft + MENU_WIDTH > SCREEN_WIDTH - 20) {
    menuLeft = SCREEN_WIDTH - MENU_WIDTH - 20;
  }

  if (menuTop + MENU_MAX_HEIGHT > SCREEN_HEIGHT - 60) {
    menuTop = SCREEN_HEIGHT - MENU_MAX_HEIGHT - 60;
  }

  menuLeft = Math.max(20, menuLeft);
  menuTop = Math.max(40, menuTop);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <ImageBackground
              source={require('../assets/images/menu-bg.webp')}
              style={[
                {
                  top: menuTop,
                  width: '80%',
                  height: '77%',
                  left: 20,
                  right: 20,
                },
              ]}
            >
              <View style={{ padding: 5, position: 'absolute', top: 90 }}>
                {/* HEADER */}
                <View
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {app.icon && (
                    <Image
                      source={{ uri: app.icon }}
                      style={{ width: 30, height: 30, marginTop: 10 }}
                    />
                  )}

                  <Text style={styles.headerTitle} numberOfLines={2}>
                    {app.name}
                  </Text>
                </View>

                <View style={styles.divider} />

                {/* MENU ITEMS */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    openApp(app.package);
                    onClose();
                  }}
                >
                  <Text style={styles.menuText}>⚓ Set Sail</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    openAppInfo(app.package);
                    onClose();
                  }}
                >
                  <Text style={styles.menuText}>📜 Inspect Cargo</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                  <Text style={styles.menuText}>🐌 Send Transponder Snail</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={toggleFavorite}
                >
                  <Text style={styles.menuText}>
                    {favorite ? '❌ Remove from Crew' : '🏴‍☠️ Add to Nakama'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    uninstallApp(app.package);
                    onClose();
                  }}
                >
                  <Text style={[styles.menuText, styles.destructiveText]}>
                    ⚔️ Walk the Plank
                  </Text>
                </TouchableOpacity>
              </View>
            </ImageBackground>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  iconWrapper: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 16,
    elevation: 4,
    marginVertical: 4,
  },

  headerIcon: {
    marginTop: 2,
    width: SCREEN_WIDTH * 0.11,
    height: SCREEN_WIDTH * 0.11,
    borderRadius: 10,
  },

  headerTitle: {
    color: '#3E2723',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },

  divider: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#795548',
    marginHorizontal: 12,
  },

  menuItem: {
    paddingVertical: SCREEN_HEIGHT * 0.015,
    paddingHorizontal: 16,
  },

  menuText: {
    color: '#3E2723',
    fontSize: SCREEN_WIDTH * 0.045,
    fontWeight: 'bold',
  },

  destructiveText: {
    color: '#B71C1C',
  },
});
