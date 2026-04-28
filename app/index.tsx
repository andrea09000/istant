import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../src/hooks/useAuth';
import { useLocalOnboarding } from '../src/hooks/useLocalOnboarding';
import { colors } from '../src/theme/colors';

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
