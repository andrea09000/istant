import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '../src/components/Avatar';
import { getUser } from '../src/lib/users';
import { createFriendInvite } from '../src/lib/friendInvites';
import {
  acceptRequest,
  rejectRequest,
  removeFriend,
} from '../src/lib/friends';
import { useAuth } from '../src/hooks/useAuth';
import {
  usePendingIncoming,
  useFriendUids,
} from '../src/hooks/useFriends';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { body, titleSm, bodyMuted } from '../src/theme/typography';
import { Button } from '../src/components/Button';
import { TopBar } from '../src/components/TopBar';
import { IconButton } from '../src/components/IconButton';

type Tab = 'requests' | 'friends';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const uid = user?.uid;
  const pending = usePendingIncoming(uid);
  const friendUids = useFriendUids(uid);
  // Default to friends list when opened from profile
  const [tab, setTab] = useState<Tab>('friends');
  const [profiles, setProfiles] = useState<Record<string, { username: string; displayName: string; avatarUrl?: string }>>(
    {},
  );
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const map: typeof profiles = {};
      const uids = [...new Set([...friendUids, ...pending.map((p) => p.fromUid)])];
      for (const u of uids) {
        const p = await getUser(u);
        if (p) {
          map[u] = p;
        }
      }
      setProfiles(map);
    })();
  }, [friendUids, pending]);

  if (!user) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="Amici"
        right={
          <IconButton onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.fg} />
          </IconButton>
        }
      />

      <View style={{ paddingHorizontal: spacing.lg }}>
        <Segment
          left={{
            label: `Amici (${friendUids.length})`,
            active: tab === 'friends',
            onPress: () => setTab('friends'),
          }}
          right={{
            label: `Richieste (${pending.length})`,
            active: tab === 'requests',
            onPress: () => setTab('requests'),
          }}
        />

        <Button
          title="Condividi link invito"
          variant="secondary"
          onPress={async () => {
            try {
              const { url } = await createFriendInvite(user.uid);
              await Share.share({
                message: `Aggiungimi su Istant: ${url}`,
              });
            } catch (e) {
              Alert.alert('Errore', e instanceof Error ? e.message : 'Errore');
            }
          }}
        />
      </View>

      {tab === 'friends' ? (
        <FlatList
          data={friendUids}
          keyExtractor={(id) => id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(insets.bottom, 12) + 120 }}
          ListEmptyComponent={
            <Text style={[bodyMuted, { textAlign: 'center', marginTop: 40 }]}>
              Non hai ancora amici. Usa la ricerca nella Home.
            </Text>
          }
          renderItem={({ item: fid }) => {
            const p = profiles[fid];
            return (
              <Pressable
                onPress={() => router.push(`/user/${fid}` as any)}
                style={({ pressed }) => [
                  {
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.10)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderRadius: 20,
                    padding: spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: spacing.md,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Avatar
                  size={54}
                  uri={p?.avatarUrl}
                  style={{
                    borderColor: 'rgba(255,255,255,0.16)',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '900' }}>
                    {p?.displayName ?? '—'}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                    @{p?.username ?? '…'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.45)" />
              </Pressable>
            );
          }}
        />
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: Math.max(insets.bottom, 12) + 120 }}
          ListEmptyComponent={
            <Text style={[bodyMuted, { textAlign: 'center', marginTop: 40 }]}>
              Nessuna richiesta in sospeso
            </Text>
          }
          renderItem={({ item }) => {
            const p = profiles[item.fromUid];
            return (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.10)',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: 20,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar
                    size={54}
                    uri={p?.avatarUrl}
                    style={{
                      borderColor: 'rgba(255,255,255,0.16)',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.fg, fontSize: 16, fontWeight: '900' }}>
                      {p?.displayName ?? 'Richiesta'}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                      @{p?.username ?? '…'}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.md as any, marginTop: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Accetta"
                      onPress={async () => {
                        try {
                          await acceptRequest(user.uid, item.fromUid);
                        } catch (e) {
                          Alert.alert('Errore', e instanceof Error ? e.message : 'Errore');
                        }
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Rifiuta"
                      variant="secondary"
                      onPress={async () => {
                        try {
                          await rejectRequest(user.uid, item.fromUid);
                        } catch (e) {
                          Alert.alert('Errore', e instanceof Error ? e.message : 'Errore');
                        }
                      }}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function Segment({
  left,
  right,
}: {
  left: { label: string; active: boolean; onPress: () => void };
  right: { label: string; active: boolean; onPress: () => void };
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        borderRadius: 18,
        padding: 4,
        marginBottom: spacing.lg,
      }}
    >
      {[left, right].map((it) => (
        <Pressable
          key={it.label}
          onPress={it.onPress}
          style={({ pressed }) => [
            {
              flex: 1,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: it.active ? 'rgba(255,255,255,0.10)' : 'transparent',
              opacity: pressed ? 0.85 : 1,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={{ color: it.active ? colors.fg : colors.muted, fontSize: 13, fontWeight: '900' }}>
            {it.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
