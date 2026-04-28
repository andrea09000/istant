import { useRouter } from 'expo-router';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { TopBar } from '../../src/components/TopBar';
import { IconButton } from '../../src/components/IconButton';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { bodyMuted, titleSm } from '../../src/theme/typography';

function Item({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 22,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
        }}
      >
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '900' }}>{title}</Text>
        <Text style={[bodyMuted, { marginTop: 4 }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" />
    </Pressable>
  );
}

export default function HelpIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Assistenza"
        right={
          <IconButton onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.fg} />
          </IconButton>
        }
      />

      <View style={{ padding: spacing.lg, paddingBottom: Math.max(insets.bottom, 12) + 24, gap: spacing.md as any }}>
        <Text style={[titleSm, { marginBottom: 6 }]}>Scegli una categoria</Text>

        <Item
          icon="shield-outline"
          title="Moderazione"
          subtitle="Richieste, ban, contenuti rimossi"
          onPress={() => router.push('/help/moderation' as any)}
        />
        <Item
          icon="bug-outline"
          title="Segnalazione problema"
          subtitle="Crash, bug, login, camera"
          onPress={() => router.push('/help/problem' as any)}
        />
        <Item
          icon="alert-circle-outline"
          title="Contenuti offensivi"
          subtitle="Segnala contenuti o utenti"
          onPress={() => router.push('/help/offensive' as any)}
        />
      </View>
    </View>
  );
}

