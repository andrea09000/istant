import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { Header } from '../../src/components/Header';
import { Avatar } from '../../src/components/Avatar';
import type { FriendState } from '../../src/lib/friends';
import { isFriend, sendFriendRequest, removeFriend } from '../../src/lib/friends';
import { getUser } from '../../src/lib/users';
import { subscribeUserPosts } from '../../src/lib/posts';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../../src/theme/typography';
import type { PostDoc, UserProfile } from '../../src/types';

export default function UserProfileScreen() {
  const { uid: uidParam } = useLocalSearchParams<{ uid: string }>();
  const uid = (Array.isArray(uidParam) ? uidParam[0] : uidParam) ?? '';
  const { user: me } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cell = (width - spacing.lg * 2 - 2) / 3;
  const [p, setP] = useState<UserProfile | null | undefined>(undefined);
  const [st, setSt] = useState<FriendState | null>(null);
  const [mine, setMine] = useState<(PostDoc & { id: string })[]>([]);

  useEffect(() => {
    if (!uid) {
      return;
    }
    (async () => {
      setP(await getUser(uid));
    })();
  }, [uid]);

  useEffect(() => {
    if (!me || !uid) {
      return;
    }
    (async () => {
      setSt(await isFriend(me.uid, uid));
    })();
  }, [me, uid]);

  useEffect(() => {
    if (!uid) {
      return;
    }
    if (me?.uid !== uid) {
      setMine([]);
      return;
    }
    return subscribeUserPosts(uid, setMine);
  }, [me?.uid, uid]);

  if (p === undefined) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          backgroundColor: colors.bg,
          alignItems: 'center',
        }}
      >
        <Header back title="Profilo" />
        <ActivityIndicator color={colors.fg} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (p === null) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          backgroundColor: colors.bg,
        }}
      >
        <Header back title="Profilo" />
        <Text style={[body, { textAlign: 'center', marginTop: 40 }]}>Utente non trovato</Text>
      </View>
    );
  }

  const isSelf = me?.uid === uid;
  const canSee = isSelf || st === 'accepted';

  const socials = [
    { key: 'instagram', label: 'Instagram', icon: 'logo-instagram' as const, v: p.instagram },
    { key: 'tiktok', label: 'TikTok', icon: 'musical-notes-outline' as const, v: p.tiktok },
    { key: 'snapchat', label: 'Snapchat', icon: 'logo-snapchat' as const, v: p.snapchat },
  ].filter((x) => !!x.v);

  const bio = p.bio?.trim();

  if (me && !isSelf && st === null) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          backgroundColor: colors.bg,
          alignItems: 'center',
        }}
      >
        <Header back title="…" />
        <ActivityIndicator color={colors.fg} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!canSee) {
    const s = st ?? (me ? null : 'none');
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          backgroundColor: colors.bg,
          padding: spacing.lg,
        }}
      >
        <Header back title="Profilo" />
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 16 }}>
          <Avatar size={64} uri={p.avatarUrl} />
          <Text style={[titleSm, { marginTop: 12 }]}>@{p.username}</Text>
        </View>

        {!!bio && (
          <Text style={[body, { textAlign: 'center', color: colors.muted, marginBottom: spacing.lg }]}>
            {bio}
          </Text>
        )}

        {socials.length > 0 && (
          <View
            style={{
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.10)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 20,
              padding: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <Text style={[titleSm, { marginBottom: 10 }]}>Social</Text>
            {socials.map((s) => (
              <View
                key={s.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 8,
                }}
              >
                <Ionicons name={s.icon} size={18} color={colors.fg} />
                <Text style={[bodyMuted, { width: 88 }]}>{s.label}</Text>
                <Text style={[body, { flex: 1 }]} numberOfLines={1}>
                  @{String(s.v)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[body, { textAlign: 'center' }]}>
          I profili completi e gli ISTANT si vedono solo tra amici. Invia una richiesta: diventerete
          amici quando l’altra persona accetta.
        </Text>
        <View style={{ marginTop: 24 }} />
        {s === 'none' && me && (
          <Button
            title="Manda richiesta d’amicizia"
            onPress={async () => {
              await sendFriendRequest(me.uid, uid);
              setSt('pending_sent');
            }}
          />
        )}
        {s === 'pending_in' && me && (
          <Text style={[bodyMuted, { textAlign: 'center' }]}>Apri Amici &gt; Richieste per accettare</Text>
        )}
        {s === 'pending_sent' && <Text style={[bodyMuted, { textAlign: 'center' }]}>Richiesta inviata</Text>}
        {!me && <Text style={[bodyMuted, { textAlign: 'center', marginTop: 12 }]}>Accedi per aggiungere amici</Text>}
      </View>
    );
  }

  // Social-only profile for other users (no posts grid)
  if (!isSelf) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          paddingTop: insets.top,
        }}
      >
        <Header back title={p.displayName} />
        <View style={{ padding: spacing.lg, gap: spacing.lg as any }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.10)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 26,
              padding: spacing.lg,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md as any,
              }}
            >
              <Avatar size={80} uri={p.avatarUrl} />
              <View style={{ flex: 1 }}>
                <Text style={titleSm}>{p.displayName}</Text>
                <Text style={bodyMuted}>@{p.username}</Text>
                <Text style={bodyMuted}>{p.birthYear}</Text>
              </View>
            </View>

            {!!bio && (
              <Text style={[body, { marginTop: spacing.md, color: colors.muted }]}>
                {bio}
              </Text>
            )}

            {me && me.uid !== uid && st === 'accepted' && (
              <View style={{ marginTop: 16 }}>
                <Button
                  title="Rimuovi amicizia"
                  variant="secondary"
                  onPress={() => {
                    Alert.alert('Rimuovi', 'Sicuro?', [
                      { text: 'Annulla', style: 'cancel' as const },
                      {
                        text: 'Rimuovi',
                        style: 'destructive' as const,
                        onPress: () => {
                          void (async () => {
                            await removeFriend(me.uid, uid);
                            setSt('none');
                          })();
                        },
                      },
                    ]);
                  }}
                />
              </View>
            )}
          </View>

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
            {socials.length === 0 ? (
              <Text style={bodyMuted}>Nessun social impostato</Text>
            ) : (
              socials.map((s) => (
                <View
                  key={s.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                  }}
                >
                  <Ionicons name={s.icon} size={18} color={colors.fg} />
                  <Text style={[bodyMuted, { width: 88 }]}>{s.label}</Text>
                  <Text style={[body, { flex: 1 }]} numberOfLines={1}>
                    @{String(s.v)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <Text style={[bodyMuted, { textAlign: 'center' }]}>
            Gli ISTANT di @{p.username} non sono visibili qui.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
      }}
    >
      <Header back title={p.displayName} />
      <View
        style={{
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md as any,
          }}
        >
          <Avatar size={80} uri={p.avatarUrl} />
          <View style={{ flex: 1 }}>
            <Text style={titleSm}>{p.displayName}</Text>
            <Text style={bodyMuted}>@{p.username}</Text>
            <Text style={bodyMuted}>{p.birthYear}</Text>
          </View>
        </View>
        {me && me.uid !== uid && st === 'accepted' && (
          <View style={{ marginTop: 16 }}>
            <Button
              title="Rimuovi amicizia"
              variant="secondary"
              onPress={() => {
                Alert.alert('Rimuovi', 'Sicuro?', [
                  { text: 'Annulla', style: 'cancel' as const },
                  {
                    text: 'Rimuovi',
                    style: 'destructive' as const,
                    onPress: () => {
                      void (async () => {
                        await removeFriend(me.uid, uid);
                        setSt('none');
                      })();
                    },
                  },
                ]);
              }}
            />
          </View>
        )}
      </View>
      <View
        style={{
          flex: 1,
          padding: spacing.lg,
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        {mine.map((m) => (
          <View
            key={m.id}
            style={{ width: cell, height: cell, margin: 0.5, backgroundColor: colors.surface }}
          >
            <Image
              source={{ uri: m.photoUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
        ))}
        {mine.length === 0 && (
          <Text style={[bodyMuted, { textAlign: 'center', width: '100%' }]}>Ancora nessun ISTANT</Text>
        )}
      </View>
    </View>
  );
}
