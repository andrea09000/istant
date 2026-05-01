import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { spacing } from '../../src/theme/spacing';
import { useOnboardingStore } from '../../src/store/onboardingStore';

const neon = '#FFFFFF';

export default function NameOnboarding() {
  const router = useRouter();
  const { displayName, setDisplayName } = useOnboardingStore();
  const [v, setV] = useState(displayName);

  const can = useMemo(() => v.trim().length >= 1, [v]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 44, fontWeight: '900', textAlign: 'center' }}>
          Qual è il tuo <Text style={{ color: neon }}>nome</Text>?
        </Text>

        <View style={{ height: 22 }} />

        <TextInput
          value={v}
          onChangeText={setV}
          placeholder="Nome"
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

        <View style={{ height: 16 }} />

        <Pressable
          disabled={!can}
          onPress={() => {
            setDisplayName(v.trim());
            router.push('/(onboarding)/username');
          }}
          style={({ pressed }) => [
            {
              backgroundColor: neon,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: !can ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: '#000', fontSize: 18, fontWeight: '900' }}>Continua</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

