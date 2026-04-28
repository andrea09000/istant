import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  ScrollView,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '../../src/components/Avatar';
import { IconButton } from '../../src/components/IconButton';
import { TopBar } from '../../src/components/TopBar';
import { useAuth } from '../../src/hooks/useAuth';
import {
  deletePost,
  formatPostTime,
  subscribeMyPosts,
  subscribeReactions,
  subscribeViews,
  updatePostProfileVisibility,
} from '../../src/lib/posts';
import type { EmojiReaction, PostDoc, UserProfile } from '../../src/types';
import { useFriendUids } from '../../src/hooks/useFriends';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body, bodyMuted, titleSm } from '../../src/theme/typography';
import { getUser } from '../../src/lib/users';
import { Modal } from 'react-native';

export default function ProfileTab() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const uids = useFriendUids(user?.uid);
  const [mine, setMine] = useState<(PostDoc & { id: string })[]>([]);
  const [postTab, setPostTab] = useState<'onProfile' | 'archived'>('onProfile');
  const [selected, setSelected] = useState<(PostDoc & { id: string }) | null>(null);
  const [viewerUids, setViewerUids] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Map<string, EmojiReaction>>(new Map());
  const [usersByUid, setUsersByUid] = useState<Map<string, UserProfile | null>>(new Map());

  // Bigger profile photo (hero)
  const avatarSize = Math.min(220, Math.max(170, width * 0.46));

  const onProfilePosts = useMemo(
    () => mine.filter((p) => p.profileVisibility !== 'archived'),
    [mine],
  );
  const archivedPosts = useMemo(
    () => mine.filter((p) => p.profileVisibility === 'archived'),
    [mine],
  );
  const visiblePosts = postTab === 'onProfile' ? onProfilePosts : archivedPosts;

  const tabSwipe = useMemo(() => {
    // Must not break vertical scroll: only grab very clear horizontal swipes
    const threshold = 26;
    const minDxToStart = 18;
    const maxDyToStart = 10;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > minDxToStart &&
        Math.abs(g.dy) < maxDyToStart &&
        Math.abs(g.dx) > Math.abs(g.dy) * 2.0,
      onPanResponderRelease: (_evt, g) => {
        if (g.dx > threshold) {
          setPostTab('onProfile');
        } else if (g.dx < -threshold) {
          setPostTab('archived');
        }
      },
      // Let ScrollView take over if needed
      onPanResponderTerminationRequest: () => true,
    });
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }
    return subscribeMyPosts(user.uid, (p) => setMine(p));
  }, [user?.uid]);

  useEffect(() => {
    if (!selected?.id) {
      setViewerUids([]);
      setReactions(new Map());
      return;
    }
    const unsubViews = subscribeViews(selected.id, (v) => setViewerUids(v));
    const unsubReactions = subscribeReactions(selected.id, (m) => setReactions(m));
    return () => {
      unsubViews();
      unsubReactions();
    };
  }, [selected?.id]);

  useEffect(() => {
    const uidsToLoad = Array.from(
      new Set<string>([
        ...viewerUids.filter((uid) => uid !== user?.uid),
        ...Array.from(reactions.keys()).filter((uid) => uid !== user?.uid),
      ]),
    );
    if (uidsToLoad.length === 0) {
      return;
    }
    let cancelled = false;
    (async () => {
      const next = new Map(usersByUid);
      await Promise.all(
        uidsToLoad.map(async (uid) => {
          if (next.has(uid)) {
            return;
          }
          try {
            const u = await getUser(uid);
            next.set(uid, u);
          } catch {
            next.set(uid, null);
          }
        }),
      );
      if (!cancelled) {
        setUsersByUid(next);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerUids.join(','), Array.from(reactions.keys()).join(',')]);

  if (!profile) {
    return (
      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          backgroundColor: colors.bg,
          justifyContent: 'center',
        }}
      >
        <StatusBar style="light" />
        <ActivityIndicator color={colors.fg} />
      </View>
    );
  }

  async function onDelete(postId: string) {
    Alert.alert('Elimina post', 'Vuoi eliminare questo post?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(postId);
          } catch (e) {
            Alert.alert('Errore', e instanceof Error ? e.message : 'Impossibile eliminare il post');
          }
        },
      },
    ]);
  }

  async function setPostArchive(postId: string, archived: boolean) {
    try {
      await updatePostProfileVisibility(postId, archived ? 'archived' : 'profile');
    } catch (e) {
      Alert.alert('Errore', e instanceof Error ? e.message : 'Impossibile aggiornare');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        {/** don't show my own view/reaction */}
        {/** computed inline to keep state simple */}
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setSelected(null)} />
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.10)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[titleSm, { marginBottom: 0 }]}>Dettagli post</Text>
              <IconButton onPress={() => setSelected(null)}>
                <Ionicons name="close-outline" size={22} color={colors.fg} />
              </IconButton>
            </View>

            <Text style={[body, { marginTop: spacing.md, color: colors.muted }]}>
              {viewerUids.filter((uid) => uid !== user?.uid).length} visto •{' '}
              {Array.from(reactions.keys()).filter((uid) => uid !== user?.uid).length} reazioni
            </Text>

            <View style={{ marginTop: spacing.lg }}>
              <Text style={[titleSm, { fontSize: 16, marginBottom: spacing.sm }]}>Visto da</Text>
              {viewerUids.filter((uid) => uid !== user?.uid).length === 0 ? (
                <Text style={[bodyMuted, { color: colors.muted }]}>Nessuna view ancora.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {viewerUids
                    .filter((uid) => uid !== user?.uid)
                    .map((uid) => {
                    const u = usersByUid.get(uid);
                    return (
                      <View key={uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Avatar size={34} uri={u?.avatarUrl} />
                        <Text style={{ color: colors.fg, fontWeight: '800' }}>@{u?.username ?? uid.slice(0, 6)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Text style={[titleSm, { fontSize: 16, marginBottom: spacing.sm }]}>Reazioni</Text>
              {Array.from(reactions.keys()).filter((uid) => uid !== user?.uid).length === 0 ? (
                <Text style={[bodyMuted, { color: colors.muted }]}>Nessuna reazione.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {Array.from(reactions.entries())
                    .filter(([uid]) => uid !== user?.uid)
                    .map(([uid, emoji]) => {
                      const u = usersByUid.get(uid);
                      return (
                        <View
                          key={uid}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Avatar size={34} uri={u?.avatarUrl} />
                            <Text style={{ color: colors.fg, fontWeight: '800' }}>
                              @{u?.username ?? uid.slice(0, 6)}
                            </Text>
                          </View>
                          <Text style={{ color: colors.fg, fontSize: 18, fontWeight: '900' }}>{emoji}</Text>
                        </View>
                      );
                    })}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <TopBar
        title="Profilo"
        right={
          <IconButton onPress={() => router.push('/settings' as any)}>
            <Ionicons name="settings-outline" size={20} color={colors.fg} />
          </IconButton>
        }
      />

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
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
          <View style={{ alignItems: 'center' }}>
            <Avatar
              size={avatarSize}
              uri={profile.avatarUrl}
              style={{
                borderColor: 'rgba(255,255,255,0.16)',
                backgroundColor: 'rgba(255,255,255,0.06)',
              }}
            />
            <Text style={{ color: colors.fg, fontSize: 28, fontWeight: '900', marginTop: spacing.md, letterSpacing: -0.6 }}>
              {profile.displayName}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '700', marginTop: 6 }}>
              @{profile.username}
            </Text>
            {!!profile.bio && (
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 15,
                  fontWeight: '700',
                  marginTop: 10,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {profile.bio}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md as any, marginTop: spacing.lg }}>
            <Pressable
              onPress={() => router.push('/friends' as any)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <Ionicons name="people-outline" size={18} color={colors.accent} />
              <Text style={{ color: colors.fg, fontSize: 15, fontWeight: '800' }}>
                {uids.length} amici
              </Text>
            </Pressable>

            <View
              style={{
                width: 88,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>anno</Text>
              <Text style={{ color: colors.fg, fontSize: 15, fontWeight: '900', marginTop: 2 }}>
                {profile.birthYear}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[titleSm, { marginTop: spacing.xl, marginBottom: spacing.md }]}>I tuoi ISTANT</Text>

        <View {...tabSwipe.panHandlers}>
          {mine.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                borderRadius: 18,
                padding: 4,
                marginBottom: spacing.md,
              }}
            >
              {(
                [
                  { key: 'onProfile' as const, label: `Nel profilo (${onProfilePosts.length})` },
                  { key: 'archived' as const, label: `Archivio (${archivedPosts.length})` },
                ] as const
              ).map((t) => (
                <Pressable
                  key={t.key}
                  onPress={() => setPostTab(t.key)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: postTab === t.key ? 'rgba(255,255,255,0.10)' : 'transparent',
                    opacity: pressed ? 0.85 : 1,
                    alignItems: 'center',
                  })}
                >
                  <Text
                    style={{
                      color: postTab === t.key ? colors.fg : colors.muted,
                      fontSize: 13,
                      fontWeight: '800',
                      textAlign: 'center',
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {mine.length === 0 ? (
            <Text style={[bodyMuted, { color: colors.muted, textAlign: 'center', marginTop: 32 }]}>
              Non hai ancora pubblicato un ISTANT.
            </Text>
          ) : visiblePosts.length === 0 ? (
            <Text style={[bodyMuted, { color: colors.muted, textAlign: 'center', marginTop: 32 }]}>
              {postTab === 'archived'
                ? 'Nessun post in archivio. Archivia dal menu nel profilo.'
                : 'Tutti i post sono in archivio. Passa a “Archivio” o ripristina un post.'}
            </Text>
          ) : (
            <View style={{ gap: spacing.lg as any }}>
              {visiblePosts.map((p) => (
              <View
                key={p.id}
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.10)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 22,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingTop: spacing.md,
                    paddingBottom: spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm as any,
                  }}
                >
                  <Avatar
                    size={40}
                    uri={profile.avatarUrl}
                    style={{ borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.06)' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.fg, fontSize: 15, fontWeight: '900' }}>
                      @{profile.username}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {formatPostTime(p.createdAt as any)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Pressable
                      onPress={() =>
                        setPostArchive(p.id, p.profileVisibility !== 'archived')
                      }
                      hitSlop={10}
                      style={{ padding: 6 }}
                    >
                      <Ionicons
                        name={p.profileVisibility === 'archived' ? 'arrow-undo-outline' : 'archive-outline'}
                        size={20}
                        color={colors.accent}
                      />
                    </Pressable>
                    <Pressable onPress={() => onDelete(p.id)} hitSlop={10} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>

                <Pressable onPress={() => setSelected(p)}>
                  <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surface }}>
                    <Image
                      source={{ uri: p.photoUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                </Pressable>
              </View>
            ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
