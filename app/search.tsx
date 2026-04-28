import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/components/Button';
import { Header } from '../src/components/Header';
import { TextField } from '../src/components/TextField';
import { isFriend, sendFriendRequest } from '../src/lib/friends';
import { searchUsernames } from '../src/lib/users';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { bodyMuted, titleSm } from '../src/theme/typography';

type Row = { username: string; uid: string; state: string; loading: boolean };

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(
    async (s: string) => {
      if (s.length < 2) {
        setList([]);
        return;
      }
      setLoading(true);
      try {
        const r = await searchUsernames(s, 30, me?.uid);
        const withState = await Promise.all(
          r.map(async (u) => {
            const st = me ? await isFriend(me.uid, u.uid) : 'none';
            const label =
              st === 'accepted'
                ? 'Amicizia attiva'
                : st === 'pending_sent'
                  ? 'Inviata'
                  : st === 'pending_in'
                    ? 'Richiesta'
                    : 'Aggiungi';
            return { ...u, state: label, loading: false };
          }),
        );
        setList(withState);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    },
    [me],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch(q);
    }, 300);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  async function act(row: Row) {
    if (!me) {
      return;
    }
    if (row.uid === me.uid) {
      return;
    }
    const st = await isFriend(me.uid, row.uid);
    if (st !== 'none') {
      return;
    }
    setList((L) => L.map((l) => (l.uid === row.uid ? { ...l, loading: true } : l)));
    try {
      await sendFriendRequest(me.uid, row.uid);
      setList((L) =>
        L.map((l) =>
          l.uid === row.uid
            ? { ...l, loading: false, state: 'Inviata' }
            : l,
        ),
      );
    } catch (e) {
      Alert.alert('Amici', e instanceof Error ? e.message : 'Errore');
      setList((L) => L.map((l) => (l.uid === row.uid ? { ...l, loading: false } : l)));
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
      }}
    >
      <Header back title="Cerca" />
      <View style={{ padding: spacing.lg }}>
        <TextField
          label="username"
          value={q}
          onChangeText={setQ}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Cerca @username"
        />
        {loading ? (
          <ActivityIndicator color={colors.fg} style={{ marginTop: 8 }} />
        ) : null}
      </View>
      <FlatList
        data={list}
        keyExtractor={(it) => it.uid}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          q.length >= 2 && !loading ? (
            <Text style={[bodyMuted, { textAlign: 'center' }]}>Nessun utente</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/user/${item.uid}` as any)}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingVertical: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={titleSm}>@{item.username}</Text>
            </View>
            {item.uid === me?.uid ? (
              <Text style={bodyMuted}>Tu</Text>
            ) : (
              <Button
                title={item.state}
                variant="secondary"
                onPress={() => act(item)}
                disabled={item.loading || item.state === 'Inviata' || item.state === 'Amicizia attiva' || item.state === 'Richiesta'}
                textStyle={{ fontSize: 13 }}
                style={{ paddingVertical: 6, paddingHorizontal: 12 }}
              />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}
