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

export default function HomeScreen() {
  const [apps, setApps] = useState([]);

  useEffect(() => {
    loadApps();
  }, []);
  //ust four app
  // phone Message photos camera
  const loadApps = async () => {
    const apps = await NativeModules.AppModule.getDefaultApps();
    setApps(apps);
  };
  return (
    <ImageBackground
      source={require('../assets/images/bg-image.png')}
      style={styles.container}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
});
