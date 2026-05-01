import { useRouter } from 'expo-router';
import { Text, View, Platform, Alert, ScrollView, Pressable, Linking } from 'react-native';
import { useState } from 'react';

import { signInWithApple, signInWithGoogle, configureGoogleSignIn } from '../../src/lib/auth';
import { auth, firebaseConfigured } from '../../src/lib/firebase';
import { spacing } from '../../src/theme/spacing';
import { body } from '../../src/theme/typography';
import { useOnboardingStore } from '../../src/store/onboardingStore';

const TERMS_URL = 'https://istantapp.it/termini-condizioni';
const PRIVACY_URL = 'https://istantapp.it/privacypolicy';

async function openLegal(url: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert('Link', 'Impossibile aprire il link.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Link', 'Impossibile aprire il link.');
  }
}

export default function Welcome() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const resetOnboardingDraft = useOnboardingStore((s) => s.reset);

  async function onGoogle() {
    if (!auth || !firebaseConfigured) {
      Alert.alert('Firebase', 'Imposta le variabili EXPO_PUBLIC_FIREBASE_* in .env');
      return;
    }
    setLoading(true);
    try {
      configureGoogleSignIn();
      await signInWithGoogle();
      resetOnboardingDraft();
      router.replace('/');
    } catch (e) {
      Alert.alert('Accesso', e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  async function onApple() {
    if (!auth || !firebaseConfigured) {
      Alert.alert('Firebase', 'Imposta le variabili EXPO_PUBLIC_FIREBASE_* in .env');
      return;
    }
    if (Platform.OS !== 'ios') {
      return;
    }
    setLoading(true);
    try {
      await signInWithApple();
      resetOnboardingDraft();
      router.replace('/');
    } catch (e) {
      Alert.alert('Accesso', e instanceof Error ? e.message : 'Errore');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        padding: spacing.lg,
        backgroundColor: '#000000',
        justifyContent: 'center',
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
        <Text style={{ color: '#FFFFFF', fontSize: 40, fontWeight: '800', letterSpacing: -1 }}>
          Istant
        </Text>
      </View>

      <View style={{ gap: spacing.md as any }}>
        {Platform.OS === 'ios' && (
          <AuthButton
            label="Accedi con Apple"
            icon=""
            onPress={onApple}
            disabled={loading}
          />
        )}
        <AuthButton
          label="Accedi con Google"
          icon="G"
          onPress={onGoogle}
          disabled={loading}
        />
      </View>

      <Text style={[body, { color: '#B3B3B3', textAlign: 'center', marginTop: spacing.xl, lineHeight: 22 }]}>
        Continuando accetti i{' '}
        <Text
          onPress={() => void openLegal(TERMS_URL)}
          style={{ color: '#FFFFFF', textDecorationLine: 'underline', fontWeight: '700' }}
        >
          Termini e Condizioni
        </Text>{' '}
        e la{' '}
        <Text
          onPress={() => void openLegal(PRIVACY_URL)}
          style={{ color: '#FFFFFF', textDecorationLine: 'underline', fontWeight: '700' }}
        >
          Privacy Policy
        </Text>
        .
      </Text>

      {!firebaseConfigured ? (
        <Text style={[body, { color: '#666', textAlign: 'center', marginTop: 10, fontSize: 13 }]}>
          Firebase non configurato: controlla `.env`.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function AuthButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', marginRight: 10, color: '#000' }}>{icon}</Text>
      <Text style={{ fontSize: 17, fontWeight: '700', color: '#000' }}>{label}</Text>
    </Pressable>
  );
}
