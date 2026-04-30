import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '../../src/hooks/useAuth';
import { getFriendInvite } from '../../src/lib/friendInvites';
import { sendFriendRequest } from '../../src/lib/friends';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';

type State =
  | { kind: 'loading' }
  | { kind: 'need_auth' }
  | { kind: 'invalid' }
  | { kind: 'done'; ownerUid: string };

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (state.kind !== 'done') {
      return;
    }
    const t = setTimeout(() => {
      router.replace(`/user/${state.ownerUid}` as any);
    }, 650);
    return () => clearTimeout(t);
  }, [state, router]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      setState({ kind: 'need_auth' });
      return;
    }
    const t = typeof token === 'string' ? token : '';
    if (!t) {
      setState({ kind: 'invalid' });
      return;
    }
    (async () => {
      try {
        const inv = await getFriendInvite(t);
        if (!inv?.ownerUid) {
          setState({ kind: 'invalid' });
          return;
        }
        if (inv.ownerUid === user.uid) {
          setState({ kind: 'done', ownerUid: inv.ownerUid });
          return;
        }
        await sendFriendRequest(user.uid, inv.ownerUid);
        setState({ kind: 'done', ownerUid: inv.ownerUid });
      } catch (e) {
        console.error(e);
        Alert.alert('Errore', e instanceof Error ? e.message : 'Errore');
        setState({ kind: 'invalid' });
      }
    })();
  }, [token, user, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'center' }}>
      {state.kind === 'loading' ? (
        <ActivityIndicator size="large" color={colors.fg} />
      ) : state.kind === 'need_auth' ? (
        <>
          <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
            Accedi per accettare l’invito
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 10 }}>
            Dopo l’accesso riapri questo link.
          </Text>
        </>
      ) : state.kind === 'invalid' ? (
        <>
          <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
            Invito non valido
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 10 }}>
            Il link potrebbe essere scaduto o copiato male.
          </Text>
        </>
      ) : (
        <>
          <Text style={{ color: colors.fg, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
            Richiesta inviata
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 10 }}>
            Ti porto al profilo…
          </Text>
          <Text
            onPress={() => router.replace(`/user/${state.ownerUid}` as any)}
            style={{
              color: colors.fg,
              fontSize: 14,
              fontWeight: '900',
              textAlign: 'center',
              marginTop: 18,
              textDecorationLine: 'underline',
            }}
          >
            Vai al profilo
          </Text>
        </>
      )}
    </View>
  );
}

