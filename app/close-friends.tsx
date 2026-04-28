import { useState, useEffect } from 'react';
import { View, Text, FlatList, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '../src/components/Header';
import { Avatar } from '../src/components/Avatar';
import { getUser } from '../src/lib/users';
import { toggleCloseFriend, subscribeCloseFriends, subscribeAcceptedFriends } from '../src/lib/friends';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { bodyMuted, titleSm } from '../src/theme/typography';
export default function CloseFriends() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [friendUids, setFriendUids] = useState<string[]>([]);
  const [closeSet, setCloseSet] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Record<string, { displayName: string; username: string; avatarUrl?: string }>>(
    {},
  );

  useEffect(() => {
    if (!user?.uid) {
      return;
    }
    const a = subscribeAcceptedFriends(user.uid, (uids) => setFriendUids(uids));
    const c = subscribeCloseFriends(user.uid, (uids) => {
      setCloseSet(new Set(uids));
    });
    return () => {
      a();
      c();
    };
  }, [user?.uid]);

  useEffect(() => {
    (async () => {
      const m: typeof profiles = {};
      for (const f of friendUids) {
        const p = await getUser(f);
        if (p) {
          m[f] = p;
        }
      }
      setProfiles(m);
    })();
  }, [friendUids]);

  if (!user) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
      }}
    >
      <Header
        back
        title="Amici stretti"
        right={undefined}
      />
      <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={[bodyMuted, { lineHeight: 20 }]}>
          Scegli chi vede gli ISTANT condivisi solo con stretti. Gli amici in lista devono
          esserti amici.
        </Text>
      </View>
      <FlatList
        data={friendUids}
        keyExtractor={(id) => id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        ListEmptyComponent={
          <Text style={[bodyMuted, { textAlign: 'center', marginTop: 32 }]}>
            Aggiungi prima un amico dalla ricerca.
          </Text>
        }
        renderItem={({ item: uid }) => {
          const p = profiles[uid];
          const isClose = closeSet.has(uid);
          return (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingVertical: spacing.md,
                gap: spacing.md as any,
              }}
            >
              <Avatar size={44} uri={p?.avatarUrl} />
              <View style={{ flex: 1 }}>
                <Text style={titleSm}>{p?.displayName}</Text>
                <Text style={bodyMuted}>@{p?.username}</Text>
              </View>
              <Switch
                value={isClose}
                onValueChange={async (v) => {
                  try {
                    await toggleCloseFriend(user.uid, uid, v);
                  } catch (e) {
                    Alert.alert('Amici stretti', e instanceof Error ? e.message : 'Errore');
                  }
                }}
                trackColor={{ true: colors.fg, false: colors.border }}
                thumbColor={colors.bg}
              />
            </View>
          );
        }}
      />
    </View>
  );
}
