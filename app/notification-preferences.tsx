import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TopBar } from '../src/components/TopBar';
import { IconButton } from '../src/components/IconButton';
import { useAuth } from '../src/hooks/useAuth';
import { updateProfile } from '../src/lib/users';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../src/theme/typography';

function Row({
  title,
  subtitle,
  right,
  onPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '900' }}>{title}</Text>
        {subtitle ? (
          <Text style={[body, { color: colors.muted, fontSize: 13, marginTop: 4 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" /> : null}
    </Pressable>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />;
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      style={({ pressed }) => ({
        width: 54,
        height: 34,
        borderRadius: 999,
        padding: 3,
        backgroundColor: value ? colors.accent : 'rgba(255,255,255,0.12)',
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        justifyContent: 'center',
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: '#000',
          marginLeft: value ? 20 : 0,
        }}
      />
    </Pressable>
  );
}

export default function NotificationPreferences() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [permStatus, setPermStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const [postFromFriends, setPostFromFriends] = useState<boolean>(profile?.notif_postFromFriends ?? true);
  const [istantMoment, setIstantMoment] = useState<boolean>(profile?.notif_istantMoment ?? true);

  useEffect(() => {
    if (!profile) return;
    setPostFromFriends(profile.notif_postFromFriends ?? true);
    setIstantMoment(profile.notif_istantMoment ?? true);
  }, [profile]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void (async () => {
      try {
        const p = await Notifications.getPermissionsAsync();
        setPermStatus(p.granted ? 'granted' : 'denied');
      } catch {
        setPermStatus('unknown');
      }
    })();
  }, []);

  const canUsePush = useMemo(() => Platform.OS !== 'web' && permStatus === 'granted', [permStatus]);

  async function savePrefs(next?: { postFromFriends?: boolean; istantMoment?: boolean }) {
    if (!user?.uid) return;
    if (saving) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (next?.postFromFriends !== undefined) patch.notif_postFromFriends = next.postFromFriends;
      if (next?.istantMoment !== undefined) patch.notif_istantMoment = next.istantMoment;
      await updateProfile(user.uid, patch as any);
    } catch (e) {
      Alert.alert('Notifiche', e instanceof Error ? e.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Notifiche"
        right={
          <IconButton onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.fg} />
          </IconButton>
        }
      />

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: 120,
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
            overflow: 'hidden',
          }}
        >
          <View style={{ padding: spacing.lg }}>
            <Text style={titleSm}>Preferenze</Text>
            <Text style={[bodyMuted, { marginTop: 8 }]}>
              Scegli quali notifiche ricevere. Se i permessi del sistema sono disattivati, alcune non arriveranno.
            </Text>
          </View>
          <Divider />
          <Row
            title="Amici: nuovo Istant"
            subtitle="Quando un tuo amico pubblica un Istant"
            right={
              <Toggle
                value={postFromFriends}
                disabled={saving}
                onChange={(v) => {
                  setPostFromFriends(v);
                  void savePrefs({ postFromFriends: v });
                }}
              />
            }
          />
          <Divider />
          <Row
            title="È ora di un Istant"
            subtitle="Ti avvisa quando è il momento di pubblicare un Istant insieme ai tuoi amici"
            right={
              <Toggle
                value={istantMoment}
                disabled={saving}
                onChange={(v) => {
                  setIstantMoment(v);
                  void savePrefs({ istantMoment: v });
                }}
              />
            }
          />
        </View>

        {Platform.OS !== 'web' ? (
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
              <Text style={titleSm}>Permessi</Text>
              <Text style={[bodyMuted, { marginTop: 8 }]}>
                Stato: {permStatus === 'granted' ? 'Attivi' : permStatus === 'denied' ? 'Disattivi' : '—'}
              </Text>
              {!canUsePush ? (
                <Text style={[bodyMuted, { marginTop: 8 }]}>
                  Attiva le notifiche nelle impostazioni di sistema e poi premi “Riprova”.
                </Text>
              ) : null}
            </View>
            <Divider />
            <Row
              title="Apri impostazioni di sistema"
              subtitle="Gestisci i permessi notifiche"
              onPress={() => Linking.openSettings()}
            />
          </View>
        ) : (
          <Text style={[bodyMuted, { textAlign: 'center' }]}>Notifiche non disponibili su Web.</Text>
        )}
      </ScrollView>
    </View>
  );
}

