import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { spacing } from '../../src/theme/spacing';
import { body, title } from '../../src/theme/typography';
import { setNotifPromptDoneLocal } from '../../src/hooks/useLocalOnboarding';

export default function OnboardingNotifications() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function allow() {
    setSaving(true);
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // user denied or not available
    } finally {
      await setNotifPromptDoneLocal();
      setSaving(false);
      router.replace('/(onboarding)/welcome');
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000000',
        padding: spacing.lg,
        justifyContent: 'center',
      }}
    >
      <Text style={[title, { color: '#FFFFFF' }]}>Notifiche</Text>
      <Text style={[body, { color: '#B3B3B3', marginTop: spacing.md }]}>
        Prima di iniziare, vuoi abilitare le notifiche?
      </Text>
      <View style={{ marginTop: spacing.xl }}>
        <Button
          title={saving ? '…' : 'Consenti notifiche'}
          onPress={allow}
          disabled={saving}
          style={{ width: '100%' }}
        />
        <View style={{ marginTop: spacing.md }} />
        <Button
          title="Salta"
          variant="ghost"
          onPress={async () => {
            await setNotifPromptDoneLocal();
            router.replace('/(onboarding)/welcome');
          }}
          disabled={saving}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}
