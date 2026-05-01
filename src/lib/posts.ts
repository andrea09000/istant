import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';

import type { EmojiReaction, PostDoc, PostAudience, PostProfileVisibility } from '../types';
import { EMOJIS } from '../types';
import { getAcceptedFriendUids } from './friends-helpers';
import { db } from './firebase';
import { CLOSE_FRIENDS, USERS } from './users';

const POSTS = 'posts';
const REACTIONS = 'reactions';
const VIEWS = 'views';

/** Feed visibility window (matches default expiresAt for new posts). */
export const FEED_TTL_MS = 24 * 60 * 60 * 1000;

function assertDb() {
  if (!db) {
    throw new Error('Firestore not available');
  }
  return db;
}

function toIso(createdAt: PostDoc['createdAt'] | undefined): string {
  if (typeof createdAt === 'string') {
    return createdAt;
  }
  if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
    return (createdAt as { toDate: () => Date }).toDate().toISOString();
  }
  if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
    return new Date((createdAt as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Expiry time for feed filtering. Old posts without `expiresAt` assume 24h from createdAt.
 */
export function getEffectiveExpiresAt(p: PostDoc & { createdAt?: string }): string {
  if (p.expiresAt) {
    return p.expiresAt;
  }
  const c = toIso(p.createdAt);
  return new Date(new Date(c).getTime() + FEED_TTL_MS).toISOString();
}

export async function getCloseFriendUids(authorUid: string): Promise<string[]> {
  const firestore = assertDb();
  const sn = await getDocs(
    collection(firestore, USERS, authorUid, CLOSE_FRIENDS),
  );
  return sn.docs.map((d) => d.id);
}

export async function createPost(
  authorUid: string,
  data: { photoUrl: string; audience: PostAudience; link?: string; isAd?: boolean },
) {
  const close = data.audience === 'close' ? await getCloseFriendUids(authorUid) : [];
  const allFriends =
    data.audience === 'all' ? await getAcceptedFriendUids(authorUid) : [];
  const audienceUids = data.audience === 'close' ? close : allFriends;
  if (!audienceUids.includes(authorUid)) {
    audienceUids.push(authorUid);
  }
  if (data.audience === 'all' && audienceUids.length === 1) {
    // no friends: still include self
  }
  if (data.audience === 'close' && audienceUids.length === 1) {
    // no close friends: self only
  }
  const firestore = assertDb();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(new Date(createdAt).getTime() + FEED_TTL_MS).toISOString();
  const docRef = await addDoc(collection(firestore, POSTS), {
    authorUid,
    photoUrl: data.photoUrl,
    ...(data.link ? { link: data.link } : {}),
    ...(data.isAd ? { isAd: true } : {}),
    audience: data.audience,
    audienceUids,
    createdAt,
    expiresAt,
    profileVisibility: 'profile' as const,
  } as PostDoc & { createdAt: string; expiresAt: string; profileVisibility: 'profile' });
  return docRef.id;
}

export function subscribeFeed(
  myUid: string,
  onData: (posts: (PostDoc & { id: string })[]) => void,
  pageSize: number = 50,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    query(
      collection(firestore, POSTS),
      where('audienceUids', 'array-contains', myUid),
      limit(pageSize),
    ),
    (sn) => {
      const now = new Date().toISOString();
      const items = sn.docs
        .map((d) => {
          const data = d.data() as PostDoc & { createdAt?: string };
          return { id: d.id, ...data };
        })
        .filter((p) => getEffectiveExpiresAt(p) > now);
      // Sort client-side to avoid composite index requirement during development
      items.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      onData(items);
    },
    (e) => {
      console.error('feed', e);
      onData([]);
    },
  );
}

export function subscribeAllPosts(
  onData: (posts: (PostDoc & { id: string })[]) => void,
  pageSize: number = 500,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    query(collection(firestore, POSTS), limit(pageSize)),
    (sn) => {
      const items = sn.docs.map((d) => {
        const data = d.data() as PostDoc & { createdAt?: string };
        return { id: d.id, ...data };
      });
      items.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      onData(items);
    },
    (e) => {
      console.error('all posts', e);
      onData([]);
    },
  );
}

export function subscribeAds(
  onData: (posts: (PostDoc & { id: string })[]) => void,
  pageSize: number = 50,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    query(
      collection(firestore, POSTS),
      where('isAd', '==', true),
      limit(pageSize),
    ),
    (sn) => {
      const now = new Date().toISOString();
      const items = sn.docs
        .map((d) => ({ id: d.id, ...(d.data() as PostDoc) }))
        .filter((p) => getEffectiveExpiresAt(p as PostDoc & { createdAt?: string }) > now);
      items.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      onData(items);
    },
    (e) => {
      console.error('ads', e);
      onData([]);
    },
  );
}

export function subscribeUserPosts(
  authorUid: string,
  onData: (posts: (PostDoc & { id: string })[]) => void,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    query(
      collection(firestore, POSTS),
      where('authorUid', '==', authorUid),
      limit(200),
    ),
    (sn) => {
      const items = sn.docs.map((d) => {
        return { id: d.id, ...(d.data() as PostDoc) };
      });
      items.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      onData(items);
    },
    (e) => {
      console.error('user posts', e);
      onData([]);
    },
  );
}

/**
 * More permissive query for "my posts" when rules block authorUid queries:
 * fetch posts visible to me and filter by authorUid client-side.
 */
export function subscribeMyPosts(
  myUid: string,
  onData: (posts: (PostDoc & { id: string })[]) => void,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    query(
      collection(firestore, POSTS),
      where('audienceUids', 'array-contains', myUid),
      limit(250),
    ),
    (sn) => {
      const items = sn.docs
        .map((d) => ({ id: d.id, ...(d.data() as PostDoc) }))
        .filter((p) => p.authorUid === myUid);
      items.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
      onData(items);
    },
    (e) => {
      console.error('my posts', e);
      onData([]);
    },
  );
}

export function subscribeReactions(
  postId: string,
  onData: (m: Map<string, EmojiReaction>) => void,
): Unsubscribe {
  return onSnapshot(
    collection(assertDb(), POSTS, postId, REACTIONS),
    (sn) => {
      const m = new Map<string, EmojiReaction>();
      for (const d of sn.docs) {
        m.set(
          d.id,
          (d.data() as { emoji: string }).emoji as EmojiReaction,
        );
      }
      onData(m);
    },
    (e) => {
      console.error('reactions', e);
      onData(new Map());
    },
  );
}

export function subscribeViews(
  postId: string,
  onUids: (uids: string[]) => void,
): Unsubscribe {
  return onSnapshot(
    collection(assertDb(), POSTS, postId, VIEWS),
    (sn) => {
      onUids(sn.docs.map((d) => d.id));
    },
    (e) => {
      console.error('views', e);
      onUids([]);
    },
  );
}

export async function setViewed(postId: string, myUid: string) {
  await setDoc(doc(assertDb(), POSTS, postId, VIEWS, myUid), {
    createdAt: new Date().toISOString(),
  });
}

export function subscribeMyReaction(
  postId: string,
  myUid: string,
  onEmoji: (e: EmojiReaction | null) => void,
) {
  return onSnapshot(
    doc(assertDb(), POSTS, postId, REACTIONS, myUid),
    (sn) => {
      if (!sn.exists()) {
        onEmoji(null);
        return;
      }
      onEmoji((sn.data() as { emoji: string }).emoji as EmojiReaction);
    },
  );
}

export async function updatePostProfileVisibility(
  postId: string,
  profileVisibility: PostProfileVisibility,
) {
  const ref = doc(assertDb(), POSTS, postId);
  await updateDoc(ref, { profileVisibility } as { profileVisibility: PostProfileVisibility });
}

export async function setReaction(
  postId: string,
  myUid: string,
  emoji: EmojiReaction,
) {
  if (!EMOJIS.includes(emoji)) {
    return;
  }
  const ref = doc(assertDb(), POSTS, postId, REACTIONS, myUid);
  const cur = await getDoc(ref);
  const currentEmoji = cur.exists() ? (cur.data() as { emoji?: string }).emoji : undefined;
  if (currentEmoji === emoji) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, { emoji, createdAt: new Date().toISOString() });
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(assertDb(), POSTS, postId));
}

export async function deletePostDeep(postId: string) {
  const firestore = assertDb();

  const reactionsSn = await getDocs(collection(firestore, POSTS, postId, REACTIONS));
  const viewsSn = await getDocs(collection(firestore, POSTS, postId, VIEWS));

  await Promise.all([
    ...reactionsSn.docs.map((d) => deleteDoc(d.ref)),
    ...viewsSn.docs.map((d) => deleteDoc(d.ref)),
  ]);

  await deleteDoc(doc(firestore, POSTS, postId));
}

export function formatPostTime(createdAt: { seconds?: number; toDate?: () => Date } | string) {
  if (typeof createdAt === 'string') {
    return new Date(createdAt).toLocaleString();
  }
  if (typeof createdAt === 'object' && createdAt && 'toDate' in createdAt && createdAt.toDate) {
    return (createdAt as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof createdAt === 'object' && createdAt && 'seconds' in createdAt) {
    return new Date((createdAt as { seconds: number }).seconds * 1000).toLocaleString();
  }
  return '';
}

export { EMOJIS } from '../types';
