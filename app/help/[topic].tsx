import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ScrollView, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { TopBar } from '../../src/components/TopBar';
import { IconButton } from '../../src/components/IconButton';
import { Button } from '../../src/components/Button';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../../src/theme/typography';

const SUPPORT_EMAIL = 'support@istant.app';

function topicCopy(topic: string | undefined) {
  switch (topic) {
    case 'moderation':
      return {
        title: 'Moderazione',
        subtitle: 'Per richieste e decisioni di moderazione.',
        subject: 'ISTANT • Moderazione',
        bodyText:
          'Scrivici indicando:\n- Username tuo e dell’utente (se serve)\n- Cosa è successo\n- Screenshot (se possibile)\n',
      };
    case 'problem':
      return {
        title: 'Segnalazione problema',
        subtitle: 'Aiutaci a risolvere bug e crash.',
        subject: 'ISTANT • Problema / Bug',
        bodyText:
          'Scrivici indicando:\n- Modello telefono + versione OS\n- Cosa stavi facendo\n- Cosa ti aspettavi\n- Screenshot/Video\n',
      };
    case 'offensive':
      return {
        title: 'Contenuti offensivi',
        subtitle: 'Segnala contenuti o utenti.',
        subject: 'ISTANT • Contenuti offensivi',
        bodyText:
          'Scrivici indicando:\n- Username dell’utente\n- Link/descrizione del contenuto\n- Perché è offensivo\n- Screenshot (se possibile)\n',
      };
    default:
      return {
        title: 'Assistenza',
        subtitle: 'Contattaci.',
        subject: 'ISTANT • Assistenza',
        bodyText: 'Scrivici cosa ti serve e ti rispondiamo appena possibile.\n',
      };
  }
}

export default function HelpTopic() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const copy = topicCopy(Array.isArray(topic) ? topic[0] : topic);

  async function email() {
    try {
      const subject = encodeURIComponent(copy.subject);
      const bodyText = encodeURIComponent(copy.bodyText);
      const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${bodyText}`;
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('Assistenza', `Scrivi a ${SUPPORT_EMAIL}`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Assistenza', `Scrivi a ${SUPPORT_EMAIL}`);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title={copy.title}
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
          <Text style={[titleSm, { marginBottom: 8 }]}>{copy.subtitle}</Text>
          <Text style={[body, { color: colors.muted, lineHeight: 20 }]}>{copy.bodyText}</Text>
        </View>

        <Button title="Contatta assistenza" onPress={email} />
        <Text style={[bodyMuted, { textAlign: 'center' }]}>Rispondiamo appena possibile.</Text>
      </ScrollView>
    </View>
  );
}

