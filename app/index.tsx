import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useRef } from 'react';

import { useAuth } from '../src/hooks/useAuth';
import { useLocalOnboarding } from '../src/hooks/useLocalOnboarding';
import { colors } from '../src/theme/colors';
import { useOnboardingStore } from '../src/store/onboardingStore';

/**
 * Central gate: Firebase env, auth, profile, onboarding, then app tabs.
 */
export default function Gate() {
  const {
    user,
    profile,
    profileLoading,
    loading,
  } = useAuth();
  const { notifPromptDone, loading: localLoading } = useLocalOnboarding();
  const resetOnboardingDraft = useOnboardingStore((s) => s.reset);
  const lastResetUid = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      lastResetUid.current = null;
      return;
    }
    if (profile !== null) {
      return;
    }
    // New account / missing Firestore profile: never reuse a stale onboarding draft
    // (it can look like "Google/Apple filled my name" but it's just leftover Zustand state).
    if (lastResetUid.current !== user.uid) {
      resetOnboardingDraft();
      lastResetUid.current = user.uid;
    }
  }, [user?.uid, profile, resetOnboardingDraft]);

  if (localLoading || loading || (user && profileLoading)) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}
      >
        <ActivityIndicator size="large" color={colors.fg} />
      </View>
    );
  }

  if (!user) {
    if (!notifPromptDone) {
      return <Redirect href="/(onboarding)/notifications" />;
    }
    return <Redirect href="/(onboarding)/welcome" />;
  }

  if (profile === null) {
    return <Redirect href="/(onboarding)/avatar" />;
  }

  return <Redirect href="/(tabs)" />;
}
