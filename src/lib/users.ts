import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';

import type { UserProfile } from '../types';
import { db } from './firebase';

export const USERS = 'users';
export const CLOSE_FRIENDS = 'closeFriends';

function assertDb() {
  if (!db) {
    throw new Error('Firestore not available');
  }
  return db;
}

export function subscribeUser(
  uid: string,
  onData: (profile: UserProfile | null) => void,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    doc(firestore, USERS, uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(snap.data() as UserProfile);
    },
    () => onData(null),
  );
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const firestore = assertDb();
  const snap = await getDoc(doc(firestore, USERS, uid));
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as UserProfile;
}

export function normalizeUsername(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function normalizeDisplayNameKey(s: string) {
  // Prefix-search friendly: lowercase, trimmed, collapse spaces.
  return String(s ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export async function isUsernameAvailable(username: string, excludeUid?: string) {
  const firestore = assertDb();
  const u = normalizeUsername(username);
  if (u.length < 3) {
    return false;
  }
  const snap = await getDocs(
    query(collection(firestore, USERS), where('username', '==', u), limit(5)),
  );
  for (const d of snap.docs) {
    if (excludeUid && d.id === excludeUid) {
      continue;
    }
    return false;
  }
  return true;
}

/**
 * Create profile: only users/{uid}. Username uniqueness enforced via username field query.
 */
export async function createOrUpdateProfile(
  uid: string,
  data: {
    username: string;
    displayName: string;
    birthYear: number;
    avatarUrl?: string;
  },
) {
  const firestore = assertDb();
  const u = normalizeUsername(data.username);
  if (u.length < 3) {
    throw new Error('Username: min 3 characters (a-z, 0-9, _)');
  }
  const usernameKey = u;
  const displayNameKey = normalizeDisplayNameKey(data.displayName);
  const userRef = doc(firestore, USERS, uid);

  const taken = await getDocs(
    query(collection(firestore, USERS), where('username', '==', usernameKey), limit(25)),
  );
  for (const d of taken.docs) {
    if (d.id !== uid) {
      throw new Error('Username is already taken');
    }
  }

  const uSnap = await getDoc(userRef);
  const isNew = !uSnap.exists();
  const prev = (uSnap.data() as UserProfile & { createdAt?: unknown } | undefined) || {};
  await setDoc(
    userRef,
    {
      ...data,
      username: u,
      _usernameKey: usernameKey,
      _displayNameKey: displayNameKey,
      ...(isNew
        ? {
            onboardingNotifDone: false,
            onboardingCameraDone: false,
            friendUids: [],
          }
        : {}),
      createdAt: isNew
        ? new Date().toISOString()
        : (prev as { createdAt?: unknown }).createdAt ?? new Date().toISOString(),
    } as UserProfile & DocumentData,
    { merge: true },
  );
}

export async function updateProfile(
  uid: string,
  patch: Partial<
    Pick<
      UserProfile,
      | 'displayName'
      | 'avatarUrl'
      | 'fcmToken'
      | 'bio'
      | 'instagram'
      | 'tiktok'
      | 'snapchat'
    >
  >,
) {
  const firestore = assertDb();
  // Firestore rejects `undefined`. Treat it as "remove field" for optional profile props.
  const safePatch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    safePatch[k] = v === undefined ? deleteField() : v;
  }
  await setDoc(
    doc(firestore, USERS, uid),
    safePatch as DocumentData,
    { merge: true },
  );
}

export async function setOnboardingNotifDone(uid: string) {
  const firestore = assertDb();
  await setDoc(
    doc(firestore, USERS, uid),
    { onboardingNotifDone: true } as DocumentData,
    { merge: true },
  );
}

export async function setOnboardingCameraDone(uid: string) {
  const firestore = assertDb();
  await setDoc(
    doc(firestore, USERS, uid),
    { onboardingCameraDone: true } as DocumentData,
    { merge: true },
  );
}

export async function searchUsernames(
  prefix: string,
  max: number = 20,
  excludeUid?: string,
) {
  const p = normalizeUsername(prefix);
  if (p.length < 1) {
    return [] as { username: string; uid: string }[];
  }
  const firestore = assertDb();
  const res = await getDocs(
    query(
      collection(firestore, USERS),
      where('_usernameKey', '>=', p),
      where('_usernameKey', '<=', p + '\uf8ff'),
      orderBy('_usernameKey'),
      limit(max + 8),
    ),
  );
  const primary = res.docs
    .map((d) => {
      const data = d.data() as UserProfile;
      const username = data._usernameKey ?? data.username;
      return { username, uid: d.id };
    })
    .filter((r) => r.username.startsWith(p))
    .filter((r) => (excludeUid ? r.uid !== excludeUid : true));

  if (primary.length >= max) {
    return primary.slice(0, max);
  }

  // Older profiles may lack `_usernameKey`; prefix-search on `username`.
  const byUid = new Map<string, { username: string; uid: string }>();
  for (const r of primary) {
    byUid.set(r.uid, r);
  }
  const sn = await getDocs(
    query(
      collection(firestore, USERS),
      where('username', '>=', p),
      where('username', '<=', p + '\uf8ff'),
      orderBy('username'),
      limit(max + 8),
    ),
  );
  for (const d of sn.docs) {
    if (excludeUid && d.id === excludeUid) {
      continue;
    }
    const data = d.data() as UserProfile;
    const username = data.username;
    if (!username?.startsWith(p)) {
      continue;
    }
    byUid.set(d.id, { uid: d.id, username });
    if (byUid.size >= max) {
      break;
    }
  }
  return Array.from(byUid.values()).slice(0, max);
}

export async function searchDisplayNames(
  prefix: string,
  max: number = 20,
  excludeUid?: string,
) {
  const p = normalizeDisplayNameKey(prefix);
  if (p.length < 1) {
    return [] as { uid: string; username: string; displayName: string }[];
  }
  const firestore = assertDb();
  const res = await getDocs(
    query(
      collection(firestore, USERS),
      where('_displayNameKey', '>=', p),
      where('_displayNameKey', '<=', p + '\uf8ff'),
      orderBy('_displayNameKey'),
      limit(max + 4),
    ),
  );
  const hits = res.docs
    .map((d) => ({ uid: d.id, ...(d.data() as UserProfile) }))
    .filter((r) => (excludeUid ? r.uid !== excludeUid : true))
    .map((r) => ({ uid: r.uid, username: r.username, displayName: r.displayName }))
    .slice(0, max);

  if (hits.length > 0) {
    return hits;
  }

  // Backwards-compat fallback: older profiles may not have `_displayNameKey` yet.
  // Try prefix-search on `displayName` directly (case-sensitive), with a couple variants.
  const raw = String(prefix ?? '').trim();
  const variants = Array.from(
    new Set(
      [
        raw,
        raw.toLowerCase(),
        raw.toUpperCase(),
        raw.length > 0 ? raw[0].toUpperCase() + raw.slice(1) : raw,
      ].filter((x) => x.length > 0),
    ),
  ).slice(0, 3);

  const byUid = new Map<string, { uid: string; username: string; displayName: string }>();
  for (const v of variants) {
    const sn = await getDocs(
      query(
        collection(firestore, USERS),
        where('displayName', '>=', v),
        where('displayName', '<=', v + '\uf8ff'),
        orderBy('displayName'),
        limit(max + 8),
      ),
    );
    for (const d of sn.docs) {
      const data = d.data() as UserProfile;
      if (excludeUid && d.id === excludeUid) continue;
      if (!data?.username || !data?.displayName) continue;
      byUid.set(d.id, { uid: d.id, username: data.username, displayName: data.displayName });
      if (byUid.size >= max) break;
    }
    if (byUid.size >= max) break;
  }

  return Array.from(byUid.values()).slice(0, max);
}
