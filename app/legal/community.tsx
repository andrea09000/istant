import { useRouter } from 'expo-router';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { TopBar } from '../../src/components/TopBar';
import { IconButton } from '../../src/components/IconButton';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../../src/theme/typography';

export default function CommunityStandards() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Community"
        right={
          <IconButton onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.fg} />
          </IconButton>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, 12) + 24,
          gap: spacing.lg as any,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 26,
            padding: spacing.lg,
          }}
        >
          <Text style={[titleSm, { marginBottom: 10 }]}>Standard della community</Text>
          <Text style={[bodyMuted, { marginBottom: 12 }]}>Ultimo aggiornamento: 27/04/2026</Text>
          <Text style={[body, { color: colors.muted, lineHeight: 20 }]}>
            Manteniamo ISTANT safe.
            {'\n\n'}
            Non sono ammessi: odio, molestie, nudità esplicita, violenza grafica, spam, minacce, doxxing.
            {'\n\n'}
            Se vedi qualcosa che viola le regole, usa “Assistenza” → “Contenuti offensivi”.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

