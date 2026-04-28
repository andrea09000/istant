import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View, Alert } from 'react-native';

import { spacing } from '../../src/theme/spacing';
import { useOnboardingStore } from '../../src/store/onboardingStore';

const neon = '#FFFFFF';

export default function AvatarOnboarding() {
  const router = useRouter();
  const { avatarUri, setAvatarUri } = useOnboardingStore();
  const [busy, setBusy] = useState(false);

  const dots = useMemo(() => {
    const count = 28;
    // Nota: il cerchio "tappabile" era grande quanto la corona,
    // quindi copriva completamente i puntini. Qui teniamo la corona fuori.
    const radius = 148;
    const size = 5;
    return Array.from({ length: count }).map((_, i) => {
      const a = (i / count) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      return (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 160 + x - size / 2,
            top: 160 + y - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: neon,
            opacity: 0.65,
          }}
        />
      );
    });
  }, []);

  async function pickFromLibrary() {
    setBusy(true);
    try {
      const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!p.granted) {
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!r.canceled && r.assets[0]) {
        setAvatarUri(r.assets[0]!.uri);
        router.push('/(onboarding)/name');
      }
    } catch (e) {
      Alert.alert('Avatar', e instanceof Error ? e.message : 'Errore');
    } finally {
      setBusy(false);
    }
  }

  async function takeSelfie() {
    setBusy(true);
    try {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) {
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!r.canceled && r.assets[0]) {
        setAvatarUri(r.assets[0]!.uri);
        router.push('/(onboarding)/name');
      }
    } catch (e) {
      Alert.alert('Selfie', e instanceof Error ? e.message : 'Errore');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: spacing.lg }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 40, fontWeight: '900', textAlign: 'center' }}>
          scegli il tuo <Text style={{ color: neon }}>avatar</Text>
        </Text>

        <View style={{ height: 28 }} />

        <View style={{ width: 320, height: 320 }}>
          {dots}
          <Pressable
            onPress={pickFromLibrary}
            disabled={busy}
            style={{
              position: 'absolute',
              left: 40,
              top: 40,
              width: 240,
              height: 240,
              borderRadius: 120,
              backgroundColor: neon,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Text style={{ fontSize: 16, color: '#000', fontWeight: '800', letterSpacing: -0.2 }}>
              scegli
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: spacing.md as any }}>
        <DarkButton label={busy ? '…' : 'aprire il rullino'} onPress={pickFromLibrary} disabled={busy} />
        <DarkButton label={busy ? '…' : 'scatta un selfie'} onPress={takeSelfie} disabled={busy} />
      </View>
    </View>
  );
}

function DarkButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: '#1A1A1A',
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: 'center',
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

