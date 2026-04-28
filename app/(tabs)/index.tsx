import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, View, Text, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PostCard } from '../../src/components/PostCard';
import { IconButton } from '../../src/components/IconButton';
import { TopBar } from '../../src/components/TopBar';
import { useAuth } from '../../src/hooks/useAuth';
import { useFeed } from '../../src/hooks/useFeed';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body } from '../../src/theme/typography';
import { useState } from 'react';

export default function FeedTab() {
  const { user } = useAuth();
  const { posts } = useFeed(user?.uid);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onUser = useCallback(
    (uid: string) => {
      if (uid === user?.uid) {
        router.push('/(tabs)/profile' as any);
        return;
      }
      router.push(`/user/${uid}` as any);
    },
    [router, user?.uid],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title="ISTANT"
        right={
          <IconButton onPress={() => router.push('/search' as any)}>
            <Ionicons name="search-outline" size={20} color={colors.fg} />
          </IconButton>
        }
      />
      <FlatList
        data={posts}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await new Promise((r) => setTimeout(r, 400));
              setRefreshing(false);
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <Text style={[body, { color: colors.muted, textAlign: 'center', marginTop: 60 }]}>
            Non c’è ancora nulla. Scatta un ISTANT o aggiungi amici.
          </Text>
        }
        renderItem={({ item }) =>
          user?.uid ? (
            <PostCard post={item} myUid={user.uid} onUserPress={onUser} />
          ) : null
        }
      />
    </View>
  );
}
