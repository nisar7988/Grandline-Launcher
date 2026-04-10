import { NativeModules } from 'react-native';

const { AppModule } = NativeModules;

export const getApps = async () => {
  return await AppModule.getInstalledApps();
};

export const openApp = (pkg: any) => {
  AppModule.openApp(pkg);
};
