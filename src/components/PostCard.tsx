import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';

import { getUser } from '../lib/users';
import {
  setReaction,
  subscribeMyReaction,
  subscribeReactions,
  setViewed,
} from '../lib/posts';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { titleSm, caption, body } from '../theme/typography';
import type { EmojiReaction, PostDoc, UserProfile } from '../types';
import { EMOJIS } from '../types';
import { reportPost, type ReportReason } from '../lib/reports';

import { Avatar } from './Avatar';
import { EmojiBar } from './EmojiBar';

type Props = {
  post: PostDoc & { id: string };
  myUid: string;
  onUserPress: (uid: string) => void;
};

export function PostCard({ post, myUid, onUserPress }: Props) {
  const [author, setAuthor] = useState<UserProfile | null | undefined>(undefined);
  const [mine, setMine] = useState<EmojiReaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<EmojiReaction, number>>>({});
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!myUid) {
      return;
    }
    if (post.authorUid === myUid) {
      return;
    }
    setViewed(post.id, myUid).catch(() => {
      // ignore
    });
  }, [myUid, post.id, post.authorUid]);

  useEffect(() => {
    (async () => {
      setAuthor(await getUser(post.authorUid));
    })();
  }, [post.authorUid]);

  const onReact = useCallback(
    async (e: EmojiReaction) => {
      if (saving) {
        return;
      }
      setSaving(true);
      try {
        await setReaction(post.id, myUid, e);
      } finally {
        setSaving(false);
      }
    },
    [post.id, myUid, saving],
  );

  useEffect(() => {
    if (!myUid) {
      return;
    }
    return subscribeMyReaction(post.id, myUid, (em) => setMine(em));
  }, [post.id, myUid]);

  useEffect(() => {
    return subscribeReactions(post.id, (m) => {
      const c: Partial<Record<EmojiReaction, number>> = {};
      for (const e of EMOJIS) {
        c[e] = 0;
      }
      for (const [, emoji] of m) {
        c[emoji] = (c[emoji] ?? 0) + 1;
      }
      setCounts(c);
    });
  }, [post.id]);

  function onReport() {
    if (reporting || !myUid) {
      return;
    }
    if (post.authorUid === myUid) {
      Alert.alert('Segnala', 'Non puoi segnalare un tuo post.');
      return;
    }
    const go = async (reason: ReportReason) => {
      setReporting(true);
      try {
        await reportPost({
          postId: post.id,
          postAuthorUid: post.authorUid,
          reporterUid: myUid,
          reason,
        });
        Alert.alert('Grazie', 'Segnalazione inviata.');
      } catch (e) {
        Alert.alert('Errore', e instanceof Error ? e.message : 'Impossibile segnalare');
      } finally {
        setReporting(false);
      }
    };

    Alert.alert('Segnala post', 'Scegli un motivo', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Spam', onPress: () => void go('spam') },
      { text: 'Nudità', onPress: () => void go('nudity') },
      { text: 'Violenza', onPress: () => void go('violence') },
      { text: 'Odio', onPress: () => void go('hate') },
      { text: 'Molestie', onPress: () => void go('harassment') },
      { text: 'Altro', onPress: () => void go('other') },
    ]);
  }

  return (
    <View
      style={{
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.10)',
        backgroundColor: '#FFFFFF',
        borderRadius: 26,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          gap: spacing.sm as unknown as number,
        }}
      >
        <Pressable
          onPress={() => onUserPress(post.authorUid)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm as unknown as number,
            flex: 1,
          }}
        >
          <Avatar size={40} uri={author?.avatarUrl} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                titleSm,
                { fontSize: 16, fontWeight: '800', color: '#000000' },
              ]}
            >
              @{author?.username ?? '…'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onReport}
          hitSlop={10}
          style={({ pressed }) => ({
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: pressed ? 'rgba(0,0,0,0.06)' : 'transparent',
            borderWidth: 1,
            borderColor: pressed ? 'rgba(0,0,0,0.10)' : 'transparent',
            opacity: reporting ? 0.5 : 1,
          })}
          disabled={reporting}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="flag-outline" size={18} color="rgba(0,0,0,0.55)" />
            <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 12, fontWeight: '800' }}>
              Segnala
            </Text>
          </View>
        </Pressable>
      </View>
      {post.photoUrl ? (
        <View style={{ paddingHorizontal: spacing.md }}>
          <View
            style={{
              aspectRatio: 1,
              backgroundColor: '#F2F2F2',
              width: '100%',
              borderRadius: 18,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.08)',
            }}
          >
            <Image
              source={{ uri: post.photoUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </View>
        </View>
      ) : null}
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
        }}
      >
        {saving ? (
          <ActivityIndicator
            color={Platform.OS === 'ios' ? '#000000' : '#000000'}
            style={{ marginBottom: spacing.xs }}
          />
        ) : null}
        <EmojiBar
          tone="light"
          selected={mine}
          onSelect={onReact}
          counts={counts}
          showCounts={false}
          disabled={saving}
        />
      </View>
    </View>
  );
}
