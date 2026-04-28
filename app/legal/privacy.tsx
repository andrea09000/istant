import { useRouter } from 'expo-router';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { TopBar } from '../../src/components/TopBar';
import { IconButton } from '../../src/components/IconButton';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../../src/theme/typography';

export default function PrivacyPolicy() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Privacy"
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
          <Text style={[titleSm, { marginBottom: 10 }]}>Privacy Policy</Text>
          <Text style={[bodyMuted, { marginBottom: 12 }]}>Ultimo aggiornamento: 27/04/2026</Text>
          <Text style={[body, { color: colors.muted, lineHeight: 20 }]}>
            Questa è una bozza in-app. Prima di pubblicare ISTANT dobbiamo inserire il testo legale completo.
            {'\n\n'}
            In generale, ISTANT tratta dati necessari al funzionamento dell’app: account, profilo, amicizie e contenuti
            condivisi. Puoi contattarci dall’area Assistenza per richieste privacy (accesso/cancellazione).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

