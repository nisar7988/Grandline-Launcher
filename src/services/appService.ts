import { NativeModules } from 'react-native';

const { AppModule } = NativeModules;

export const getApps = async () => {
  const apps = await AppModule.getInstalledApps();
  return apps.sort((a: any, b: any) => a.name.localeCompare(b.name));
};

export const openApp = (pkg: any) => {
  AppModule.openApp(pkg);
};

export const openAppInfo = async (pkg: any) => {
  try {
    await AppModule.openAppInfo(pkg);
  } catch (e) {
    console.log('Failed to open app info:', e);
  }
};

export const uninstallApp = async (pkg: any) => {
  try {
    await AppModule.uninstallApp(pkg);
  } catch (e) {
    console.log('Failed to uninstall app:', e);
  }
};


export const setWallpaper = async () => {
  try {
    return await AppModule.setLockWallpaper('wallpaper'); // image name
  } catch (e) {
    console.log('Failed to set wallpaper:', e);
  }
};
