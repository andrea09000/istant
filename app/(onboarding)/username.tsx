import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, Alert } from 'react-native';

import { spacing } from '../../src/theme/spacing';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { isUsernameAvailable, normalizeUsername } from '../../src/lib/users';

const neon = '#FFFFFF';

export default function UsernameOnboarding() {
  const router = useRouter();
  const { username, setUsername } = useOnboardingStore();
  const [v, setV] = useState(username);
  const [checking, setChecking] = useState(false);

  const clean = useMemo(() => normalizeUsername(v), [v]);
  const can = useMemo(() => clean.length >= 3, [clean]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 44, fontWeight: '900', textAlign: 'center' }}>
          Scegli uno <Text style={{ color: neon }}>username</Text>
        </Text>

        <View style={{ height: 22 }} />

        <TextInput
          value={v}
          onChangeText={setV}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Username"
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
          User: <Text style={{ color: '#B3B3B3' }}>@{clean || '…'}</Text> (min 3, a-z 0-9 _)
        </Text>

        <View style={{ height: 16 }} />

        <Pressable
          disabled={!can || checking}
          onPress={() => {
            if (!can) {
              Alert.alert('Username', 'Minimo 3 caratteri (a-z, 0-9, _)');
              return;
            }
            void (async () => {
              setChecking(true);
              try {
                const ok = await isUsernameAvailable(clean);
                if (!ok) {
                  Alert.alert('Username', 'Esiste già. Scegline un altro.');
                  return;
                }
                setUsername(clean);
                router.push('/(onboarding)/birthdate');
              } catch (e) {
                Alert.alert('Username', e instanceof Error ? e.message : 'Errore');
              } finally {
                setChecking(false);
              }
            })();
          }}
          style={({ pressed }) => [
            {
              backgroundColor: neon,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: !can || checking ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: '#000', fontSize: 18, fontWeight: '900' }}>
            {checking ? '…' : 'Continua'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

