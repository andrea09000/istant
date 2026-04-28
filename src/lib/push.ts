import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import Constants from 'expo-constants';
import { auth } from './firebase';
import { updateProfile } from './users';

/**
 * Re-request push and attempt to store token on user profile
 */
export async function registerForPushNotificationsAsync() {
  await Notifications.requestPermissionsAsync();
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return;
  }
  if (Platform.OS === 'web') {
    return;
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  if (token.data && auth?.currentUser) {
    await updateProfile(auth.currentUser.uid, { fcmToken: token.data });
  }
}
