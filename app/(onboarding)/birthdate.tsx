import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, Alert } from 'react-native';

import { spacing } from '../../src/theme/spacing';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { useAuth } from '../../src/hooks/useAuth';
import { createOrUpdateProfile } from '../../src/lib/users';
import { uploadImage } from '../../src/lib/storage';

const neon = '#FFFFFF';

function parseDDMMYYYY(s: string) {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (yyyy < 1900 || yyyy > 2100) return null;
  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;
  return { dd, mm, yyyy };
}

export default function BirthdateOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const { avatarUri, displayName, username, birthDate, setBirthDate, reset } = useOnboardingStore();
  const [v, setV] = useState(birthDate);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => parseDDMMYYYY(v), [v]);
  const can = useMemo(() => !!parsed, [parsed]);

  async function finish() {
    if (!user?.uid) {
      return;
    }
    const p = parseDDMMYYYY(v);
    if (!p) {
      Alert.alert('Data', 'Formato valido: GG/MM/AAAA');
      return;
    }
    if (!displayName.trim() || username.trim().length < 3) {
      Alert.alert('Profilo', 'Completa nome e username');
      return;
    }
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarUri) {
        avatarUrl = await uploadImage(`avatars/${user.uid}/profile.webp`, avatarUri);
      }
      await createOrUpdateProfile(user.uid, {
        username,
        displayName: displayName.trim(),
        birthYear: p.yyyy,
        avatarUrl,
      });
      setBirthDate(v);
      reset();
      router.replace('/');
    } catch (e) {
      Alert.alert('Profilo', e instanceof Error ? e.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 44, fontWeight: '900', textAlign: 'center' }}>
          data di <Text style={{ color: neon }}>nascita</Text>
        </Text>

        <View style={{ height: 22 }} />

        <TextInput
          value={v}
          onChangeText={(t) => {
            // auto-insert slashes
            const digits = t.replace(/[^\d]/g, '').slice(0, 8);
            const dd = digits.slice(0, 2);
            const mm = digits.slice(2, 4);
            const yy = digits.slice(4, 8);
            const out = [dd, mm, yy].filter(Boolean).join('/');
            setV(out);
          }}
          keyboardType="number-pad"
          placeholder="GG/MM/AAAA"
          placeholderTextColor="#7A7A7A"
          style={{
            backgroundColor: '#1A1A1A',
            borderRadius: 14,
            paddingVertical: 16,
            paddingHorizontal: 18,
            color: '#FFF',
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'center',
          }}
        />
        <Text style={{ color: '#7A7A7A', marginTop: 10, textAlign: 'center' }}>
          es. 14/02/2001
        </Text>

        <View style={{ height: 16 }} />

        <Pressable
          disabled={!can || saving}
          onPress={finish}
          style={({ pressed }) => [
            {
              backgroundColor: neon,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: !can || saving ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: '#000', fontSize: 18, fontWeight: '900' }}>
            {saving ? '…' : 'continua'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

