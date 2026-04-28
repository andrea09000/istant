import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View, Linking } from 'react-native';
import { Camera } from 'expo-camera';

import { Button } from '../../src/components/Button';
import { setOnboardingCameraDone } from '../../src/lib/users';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body, title } from '../../src/theme/typography';

export default function OnboardingCamera() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  async function allow() {
    if (!user?.uid) {
      return;
    }
    setSaving(true);
    try {
      const r = await Camera.requestCameraPermissionsAsync();
      if (r.status !== 'granted') {
        // still continue — user can enable later in settings
      }
    } catch {
      // ignore
    } finally {
      await setOnboardingCameraDone(user.uid!);
      setSaving(false);
      router.replace('/');
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        padding: spacing.lg,
        justifyContent: 'center',
      }}
    >
      <Text style={title}>Fotocamera</Text>
      <Text style={[body, { color: colors.muted, marginTop: spacing.md }]}>
        Scatta e condividi con gli amici. L’app ha bisogno del permesso camera.
        Puoi anche andare a Impostazioni di sistema se hai negato in precedenza.
      </Text>
      <View style={{ marginTop: spacing.lg }} />
      <Button title="Apri Impostazioni" variant="secondary" onPress={() => Linking.openSettings()} />
      <View style={{ marginTop: spacing.md }} />
      <Button title={saving ? '…' : 'Continua'} onPress={allow} disabled={saving} />
    </View>
  );
}
