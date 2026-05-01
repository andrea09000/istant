import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  Pressable,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../src/components/Button';
import { TextField } from '../src/components/TextField';
import { signOutUser } from '../src/lib/auth';
import { useAuth } from '../src/hooks/useAuth';
import { updateProfile } from '../src/lib/users';
import { uploadImage } from '../src/lib/storage';
import { registerForPushNotificationsAsync } from '../src/lib/push';
import { deleteMyAccount } from '../src/lib/account';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../src/theme/typography';
import { Avatar } from '../src/components/Avatar';
import { TopBar } from '../src/components/TopBar';
import { IconButton } from '../src/components/IconButton';

const ANDROID_PACKAGE = 'app.istant';
// TODO: replace with real App Store numeric id (e.g. "1234567890") once published.
const IOS_APP_STORE_ID: string | undefined = undefined;
const FOLLOW_IG_URL = 'https://instagram.com/istant.app';
const PRIVACY_URL = 'https://istantapp.it/privacypolicy';
const TERMS_URL = 'https://istantapp.it/termini-condizioni';
const COMMUNITY_URL = 'https://istantapp.it/standard-community';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [instagram, setInstagram] = useState(profile?.instagram ?? '');
  const [tiktok, setTiktok] = useState(profile?.tiktok ?? '');
  const [snapchat, setSnapchat] = useState(profile?.snapchat ?? '');
  const [saving, setSaving] = useState(false);
  const [savingSocials, setSavingSocials] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setBio(profile.bio ?? '');
      setInstagram(profile.instagram ?? '');
      setTiktok(profile.tiktok ?? '');
      setSnapchat(profile.snapchat ?? '');
    }
  }, [profile]);

  function normalizeHandle(s: string) {
    const t = s.trim().replace(/^@+/, '').replace(/\s+/g, '');
    return t.length ? t : undefined;
  }

  async function pick() {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) {
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (r.canceled || !r.assets[0] || !user) {
      return;
    }
    setSaving(true);
    try {
      const url = await uploadImage(
        `avatars/${user.uid}/profile.webp`,
        r.assets[0]!.uri,
      );
      await updateProfile(user.uid, { avatarUrl: url });
    } catch (e) {
      Alert.alert('Foto', e instanceof Error ? e.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!user) {
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.uid, {
        displayName: displayName.trim(),
        bio: bio.trim() ? bio.trim() : undefined,
      });
      Alert.alert('OK', 'Profilo aggiornato');
    } catch (e) {
      Alert.alert('Errore', e instanceof Error ? e.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }

  async function saveSocials() {
    if (!user) {
      return;
    }
    setSavingSocials(true);
    try {
      await updateProfile(user.uid, {
        instagram: normalizeHandle(instagram),
        tiktok: normalizeHandle(tiktok),
        snapchat: normalizeHandle(snapchat),
      });
      Alert.alert('OK', 'Social aggiornati');
    } catch (e) {
      Alert.alert('Errore', e instanceof Error ? e.message : 'Errore');
    } finally {
      setSavingSocials(false);
    }
  }

  async function logout() {
    await signOutUser();
    router.replace('/');
  }

  async function deleteAccount() {
    if (!user?.uid) {
      return;
    }
    Alert.alert(
      'Elimina account',
      'Questa azione elimina account e contenuti. Non si può annullare.',
      [
        { text: 'Annulla', style: 'cancel' as const },
        {
          text: 'Elimina',
          style: 'destructive' as const,
          onPress: () => {
            Alert.alert('Conferma', 'Sicuro al 100%?', [
              { text: 'No', style: 'cancel' as const },
              {
                text: 'Sì, elimina',
                style: 'destructive' as const,
                onPress: () => {
                  void (async () => {
                    try {
                      await deleteMyAccount();
                      router.replace('/');
                    } catch (e) {
                      Alert.alert(
                        'Errore',
                        e instanceof Error
                          ? e.message
                          : 'Impossibile eliminare. Potrebbe servire rifare login e riprovare.',
                      );
                    }
                  })();
                },
              },
            ]);
          },
        },
      ],
    );
  }

  async function leaveReview() {
    try {
      if (Platform.OS === 'android') {
        const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
        const httpsUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
        const can = await Linking.canOpenURL(marketUrl);
        await Linking.openURL(can ? marketUrl : httpsUrl);
        return;
      }
      if (Platform.OS === 'ios') {
        if (!IOS_APP_STORE_ID) {
          Alert.alert('Recensione', 'Manca App Store ID. Lo aggiungiamo quando pubblichiamo.');
          return;
        }
        const url = `itms-apps://itunes.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`;
        await Linking.openURL(url);
        return;
      }
      Alert.alert('Recensione', 'Non supportato su questo dispositivo');
    } catch {
      Alert.alert('Recensione', 'Impossibile aprire lo store');
    }
  }

  async function followInstagram() {
    try {
      await Linking.openURL(FOLLOW_IG_URL);
    } catch {
      Alert.alert('Instagram', 'Impossibile aprire Instagram');
    }
  }

  async function openExternal(url: string) {
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('Link', 'Impossibile aprire il link');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link', 'Impossibile aprire il link');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Impostazioni"
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
          paddingBottom: Math.max(insets.bottom, 12) + 120,
          gap: spacing.lg as any,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 26,
            padding: spacing.lg,
          }}
        >
          <Pressable onPress={pick} style={{ alignItems: 'center' }} hitSlop={10}>
            <Avatar
              size={110}
              uri={profile?.avatarUrl}
              style={{
                borderColor: 'rgba(255,255,255,0.16)',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <Ionicons name="image-outline" size={16} color={colors.accent} />
              <Text style={{ color: colors.fg, fontSize: 14, fontWeight: '800' }}>
                Cambia foto profilo
              </Text>
            </View>
          </Pressable>

          <View style={{ height: spacing.lg }} />

          <TextField label="nome" value={displayName} onChangeText={setDisplayName} />
          <TextField
            label="bio"
            value={bio}
            onChangeText={setBio}
          />

          <Button title={saving ? '…' : 'Salva'} onPress={save} disabled={saving} />
        </View>

        {/* Social card */}
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 26,
            padding: spacing.lg,
          }}
        >
          <Text style={[titleSm, { marginBottom: 10 }]}>Social</Text>
          <Text style={[bodyMuted, { marginBottom: spacing.md }]}>
            Questi username li vedono gli altri sul tuo profilo. Tu non li vedi nel tuo profilo.
          </Text>
          <TextField label="instagram" value={instagram} onChangeText={setInstagram} />
          <TextField label="tiktok" value={tiktok} onChangeText={setTiktok} />
          <TextField label="snapchat" value={snapchat} onChangeText={setSnapchat} />
          <Button
            title={savingSocials ? '…' : 'Salva social'}
            onPress={saveSocials}
            disabled={savingSocials || saving}
          />
        </View>

        {/* Shortcuts card */}
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 26,
            overflow: 'hidden',
          }}
        >
          <SettingsRow
            icon="people-outline"
            title="Amici stretti"
            subtitle="Gestisci la lista"
            onPress={() => router.push('/close-friends' as any)}
          />
          <Divider />
          <SettingsRow
            icon="notifications-outline"
            title="Notifiche"
            subtitle="Permessi & sistema"
            onPress={async () => {
              if (Platform.OS === 'web') {
                return;
              }
              try {
                await registerForPushNotificationsAsync();
              } catch {
                // ignore
              }
              Linking.openSettings();
            }}
          />
        </View>

        {/* Info & legal card */}
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 26,
            overflow: 'hidden',
          }}
        >
          <SettingsRow
            icon="star-outline"
            title="Lascia una recensione"
            subtitle={Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Play Store' : 'Store'}
            onPress={leaveReview}
          />
          <Divider />
          <SettingsRow
            icon="logo-instagram"
            title="Seguici su Instagram"
            subtitle="@istant.app"
            onPress={followInstagram}
          />
          <Divider />
          <SettingsRow
            icon="lock-closed-outline"
            title="Privacy Policy"
            onPress={() => void openExternal(PRIVACY_URL)}
          />
          <Divider />
          <SettingsRow
            icon="document-text-outline"
            title="Termini e condizioni"
            onPress={() => void openExternal(TERMS_URL)}
          />
          <Divider />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Standard della community"
            onPress={() => void openExternal(COMMUNITY_URL)}
          />
          <Divider />
          <SettingsRow
            icon="help-circle-outline"
            title="Assistenza"
            subtitle="Moderazione • Problemi • Offensivo"
            onPress={() => router.push('/help' as any)}
          />
        </View>

        {/* Danger card */}
        <View
          style={{
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 26,
            padding: spacing.lg,
          }}
        >
          <Text style={[titleSm, { marginBottom: 10 }]}>Account</Text>
          <Text style={[bodyMuted, { marginBottom: spacing.md }]}>
            {profile?.displayName ? `${profile.displayName} • ` : ''}
            {profile?.username ? `@${profile.username}` : '—'}
          </Text>
          <Button
            title="Esci"
            variant="secondary"
            onPress={() => {
              Alert.alert('Esci', 'Sicuro?', [
                { text: 'Annulla', style: 'cancel' as const },
                { text: 'Esci', onPress: () => void logout(), style: 'destructive' as const },
              ]);
            }}
          />

          <View style={{ height: spacing.md }} />

          <Button
            title="Elimina account"
            variant="secondary"
            onPress={deleteAccount}
            textStyle={{ color: '#FF3B30' }}
            style={{ borderColor: 'rgba(255,59,48,0.35)' }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />;
}

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      onPress={() => void onPress()}
      style={({ pressed }) => [
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
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
        {subtitle ? (
          <Text style={[body, { color: colors.muted, fontSize: 13, marginTop: 4 }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" />
    </Pressable>
  );
}
