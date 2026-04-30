import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  Modal,
  Pressable,
  FlatList,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components/Button';
import { Header } from '../../src/components/Header';
import { Avatar } from '../../src/components/Avatar';
import { PostCard } from '../../src/components/PostCard';
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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cell = (width - spacing.lg * 2 - 2) / 3;
  const [p, setP] = useState<UserProfile | null | undefined>(undefined);
  const [st, setSt] = useState<FriendState | null>(null);
  const [mine, setMine] = useState<(PostDoc & { id: string })[]>([]);
  const [theirPosts, setTheirPosts] = useState<(PostDoc & { id: string })[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

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

  useEffect(() => {
    if (!uid) {
      return;
    }
    if (!me?.uid || me.uid === uid || st !== 'accepted') {
      setTheirPosts([]);
      return;
    }
    return subscribeUserPosts(uid, setTheirPosts);
  }, [me?.uid, uid, st]);

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

  const viewerUid = me?.uid ?? '';
  const visibleTheirPosts = theirPosts
    .filter((post) => post.profileVisibility !== 'archived')
    .filter((post) => {
      const aud = (post as any).audienceUids as string[] | undefined;
      return Array.isArray(aud) && aud.includes(viewerUid);
    });

  const onUserPress = (u: string) => {
    if (!me?.uid) {
      return;
    }
    if (u === me.uid) {
      router.push('/(tabs)/profile' as any);
      return;
    }
    router.push(`/user/${u}` as any);
  };

  const socials = [
    { key: 'instagram', label: 'Instagram', icon: 'logo-instagram' as const, v: p.instagram },
    { key: 'tiktok', label: 'TikTok', icon: 'musical-notes-outline' as const, v: p.tiktok },
    { key: 'snapchat', label: 'Snapchat', icon: 'logo-snapchat' as const, v: p.snapchat },
  ].filter((x) => !!x.v);

  function normalizeHandle(s: unknown) {
    return String(s ?? '').trim().replace(/^@+/, '').replace(/\s+/g, '');
  }

  async function openSocialApp(kind: 'instagram' | 'tiktok' | 'snapchat', handleRaw: string) {
    const handle = normalizeHandle(handleRaw);
    if (!handle) {
      return;
    }
    try {
      const { appUrl, webUrl } =
        kind === 'instagram'
          ? {
              appUrl: `instagram://user?username=${encodeURIComponent(handle)}`,
              webUrl: `https://instagram.com/${encodeURIComponent(handle)}`,
            }
          : kind === 'tiktok'
            ? {
                appUrl: `tiktok://user/@${encodeURIComponent(handle)}`,
                webUrl: `https://www.tiktok.com/@${encodeURIComponent(handle)}`,
              }
            : {
                appUrl: `snapchat://add/${encodeURIComponent(handle)}`,
                webUrl: `https://www.snapchat.com/add/${encodeURIComponent(handle)}`,
              };

      const can = await Linking.canOpenURL(appUrl);
      await Linking.openURL(can ? appUrl : webUrl);
    } catch {
      // fallback to web
      const webUrl =
        kind === 'instagram'
          ? `https://instagram.com/${encodeURIComponent(handle)}`
          : kind === 'tiktok'
            ? `https://www.tiktok.com/@${encodeURIComponent(handle)}`
            : `https://www.snapchat.com/add/${encodeURIComponent(handle)}`;
      try {
        await Linking.openURL(webUrl);
      } catch {
        Alert.alert('Social', 'Impossibile aprire il link');
      }
    }
  }

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
              <Pressable
                key={s.key}
                onPress={() => void openSocialApp(s.key as any, String(s.v))}
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
                <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.45)" />
              </Pressable>
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
        <Modal
          visible={viewerIndex !== null}
          animationType="slide"
          transparent
          onRequestClose={() => setViewerIndex(null)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <Pressable style={{ flex: 1 }} onPress={() => setViewerIndex(null)} />
            <View
              style={{
                backgroundColor: colors.bg,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                padding: spacing.lg,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                height: '80%',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[titleSm, { marginBottom: 0 }]}>ISTANT</Text>
                <Pressable
                  onPress={() => setViewerIndex(null)}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    padding: 8,
                    borderRadius: 999,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Ionicons name="close-outline" size={22} color={colors.fg} />
                </Pressable>
              </View>
              <View style={{ flex: 1, marginTop: spacing.md }}>
                <FlatList
                  data={visibleTheirPosts}
                  keyExtractor={(it) => it.id}
                  pagingEnabled
                  showsVerticalScrollIndicator={false}
                  decelerationRate="fast"
                  initialScrollIndex={viewerIndex ?? 0}
                  getItemLayout={(_, index) => {
                    const h = (width * 0.8) as unknown as number; // rough fallback
                    return { length: h, offset: h * index, index };
                  }}
                  onScrollToIndexFailed={() => {
                    // ignore
                  }}
                  renderItem={({ item }) =>
                    me?.uid ? (
                      <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
                        <PostCard post={item} myUid={me.uid} onUserPress={onUserPress} />
                      </View>
                    ) : null
                  }
                />
              </View>
            </View>
          </View>
        </Modal>

        <View style={{ padding: spacing.lg, gap: spacing.lg as any, flex: 1 }}>
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
                <Pressable
                  key={s.key}
                  onPress={() => void openSocialApp(s.key as any, String(s.v))}
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
                  <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.45)" />
                </Pressable>
              ))
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[titleSm, { marginBottom: spacing.md }]}>ISTANT</Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              {visibleTheirPosts.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setViewerIndex(visibleTheirPosts.findIndex((x) => x.id === m.id))}
                  style={({ pressed }) => ({
                    width: cell,
                    height: cell,
                    margin: 0.5,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  <Image source={{ uri: m.photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </Pressable>
              ))}
              {visibleTheirPosts.length === 0 && (
                <Text style={[bodyMuted, { textAlign: 'center', width: '100%' }]}>
                  Nessun ISTANT visibile sul profilo.
                </Text>
              )}
            </View>
          </View>
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
