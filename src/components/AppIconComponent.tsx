import {
  TouchableOpacity,
  ImageBackground,
  Image,
  Text,
  View,
} from 'react-native';
import { openApp } from '../services/appService';

export default function AppIcon({ app }: { app: any }) {
  return (
    <TouchableOpacity onPress={() => openApp(app.package)}>
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
          <Text style={{ fontWeight: 800, textAlign: 'center', fontSize: 10 }}>
            {app.name}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}
