import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

import { colors } from '../src/theme/colors';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    function handleResponse(r: Notifications.NotificationResponse) {
      const data = (r.notification.request.content.data ?? {}) as any;
      const type = data?.type as string | undefined;
      if (type === 'istant_moment') {
        router.push('/(tabs)/camera' as any);
        return;
      }
      if (type === 'friend_post') {
        router.push('/(tabs)/index' as any);
        return;
      }
    }

    let sub: Notifications.Subscription | null = null;
    void (async () => {
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        if (last) handleResponse(last);
      } catch {
        // ignore
      }
      sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    })();

    return () => {
      sub?.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
