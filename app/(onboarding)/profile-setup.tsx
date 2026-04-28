import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { title } from '../../src/theme/typography';

export default function ProfileSetup() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'center' }}>
      <Text style={title}>Onboarding aggiornato</Text>
      <Text style={{ color: colors.muted, marginTop: spacing.md, textAlign: 'center' }}>
        Ora l’onboarding è in pagine separate.
      </Text>
      <View style={{ marginTop: spacing.lg }}>
        <Button title="Inizia" onPress={() => router.replace('/(onboarding)/avatar')} />
      </View>
    </View>
  );
}
