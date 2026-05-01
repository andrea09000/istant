import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { TopBar } from '../src/components/TopBar';
import { useAuth } from '../src/hooks/useAuth';
import { createFriendInvite } from '../src/lib/friendInvites';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../src/theme/typography';

function openOrFallback(primary: string, fallback: string) {
  void (async () => {
    try {
      const can = await Linking.canOpenURL(primary);
      await Linking.openURL(can ? primary : fallback);
    } catch {
      try {
        await Linking.openURL(fallback);
      } catch {
        Alert.alert('App', 'Impossibile aprire l’app. Installala e riprova.');
      }
    }
  })();
}

export default function InviteFriends() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    void (async () => {
      setBusy(true);
      try {
        const { url } = await createFriendInvite(user.uid);
        setInviteUrl(url);
      } catch (e) {
        Alert.alert('Invito', e instanceof Error ? e.message : 'Errore');
      } finally {
        setBusy(false);
      }
    })();
  }, [user?.uid]);

  const shareText = useMemo(() => {
    const u = inviteUrl ?? '';
    const who = profile?.username ? `@${profile.username}` : 'me';
    return `Aggiungi ${who} su Istant\n${u}`;
  }, [inviteUrl, profile?.username]);

  async function shareSystem() {
    try {
      await Share.share({ message: shareText });
    } catch {
      Alert.alert('Condividi', 'Impossibile aprire la condivisione di sistema.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Invita amico"
        right={
          <IconButton onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.fg} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: Math.max(insets.bottom, 12) + 120,
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
          <Text style={titleSm}>Il tuo invito</Text>
          <Text style={[bodyMuted, { marginTop: 8 }]}>
            Condividi il link: chi lo apre può aggiungerti su Istant.
          </Text>

          <View style={{ marginTop: spacing.md }}>
            <Text
              selectable
              style={{
                color: colors.fg,
                fontSize: 14,
                fontWeight: '800',
                lineHeight: 18,
              }}
            >
              {inviteUrl ?? (busy ? 'Creo il link…' : '—')}
            </Text>
          </View>

          <View style={{ marginTop: spacing.lg, gap: spacing.md as any }}>
            <Button title="Condividi" onPress={() => void shareSystem()} disabled={!inviteUrl || busy} />
          </View>
        </View>

        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 26,
            overflow: 'hidden',
          }}
        >
          <View style={{ padding: spacing.lg }}>
            <Text style={titleSm}>Apri le app</Text>
            <Text style={[bodyMuted, { marginTop: 8 }]}>
              Apri l’app e incolla il link dove preferisci (DM, bio, nota vocale… dipende dall’app).
            </Text>
          </View>

          <SocialRow
            icon="logo-instagram"
            title="Instagram"
            subtitle="Apri l’app"
            onPress={() => openOrFallback('instagram://app', 'https://www.instagram.com/')}
          />
          <Divider />
          <SocialRow
            icon="logo-tiktok"
            title="TikTok"
            subtitle="Apri l’app"
            onPress={() => openOrFallback('tiktok://', 'https://www.tiktok.com/')}
          />
          <Divider />
          <SocialRow
            icon="chatbubble-ellipses-outline"
            title="Snapchat"
            subtitle="Apri l’app"
            onPress={() => openOrFallback('snapchat://', 'https://www.snapchat.com/')}
          />
        </View>

        <Text style={[body, { color: colors.muted, textAlign: 'center' }]}>
          Suggerimento: condividi il link anche via Messaggi / WhatsApp: è il modo più veloce.
        </Text>
      </ScrollView>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />;
}

function SocialRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '900' }}>{title}</Text>
        <Text style={[bodyMuted, { marginTop: 4 }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" />
    </Pressable>
  );
}
