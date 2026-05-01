import {
  collection,
  documentId,
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
  runTransaction,
  type Unsubscribe,
  type DocumentData,
} from 'firebase/firestore';

import type { UserProfile } from '../types';
import { db } from './firebase';

export const USERS = 'users';
export const USERNAMES = 'usernames';
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

export async function isUsernameAvailable(username: string) {
  const firestore = assertDb();
  const u = normalizeUsername(username);
  if (u.length < 3) {
    return false;
  }
  const snap = await getDoc(doc(firestore, USERNAMES, u));
  return !snap.exists();
}

/**
 * Create profile: users/{uid} and usernames/{lowercase} -> { uid }
 * Uses transaction to enforce unique username.
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
  const unameRef = doc(firestore, USERNAMES, usernameKey);

  await runTransaction(firestore, async (t) => {
    const uSnap = await t.get(userRef);
    const existingUname = (uSnap.data() as UserProfile & { _usernameKey?: string })
      ?._usernameKey;
    if (uSnap.exists() && existingUname && existingUname !== usernameKey) {
      const oldRef = doc(firestore, USERNAMES, existingUname);
      t.delete(oldRef);
    }

    const nameSnap = await t.get(unameRef);
    if (nameSnap.exists() && (nameSnap.data() as { uid: string }).uid !== uid) {
      throw new Error('Username is already taken');
    }
    t.set(
      unameRef,
      { uid },
      { merge: true },
    );
    const isNew = !uSnap.exists();
    const prev = (uSnap.data() as UserProfile & { createdAt?: unknown } | undefined) || {};
    t.set(
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
            }
          : {}),
        createdAt: isNew
          ? new Date().toISOString()
          : (prev as { createdAt?: unknown }).createdAt ?? new Date().toISOString(),
      } as UserProfile & DocumentData,
      { merge: true },
    );
  });
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
      collection(firestore, USERNAMES),
      where(documentId(), '>=', p),
      where(documentId(), '<=', p + '\uf8ff'),
      orderBy(documentId()),
      limit(max + 2),
    ),
  );
  return res.docs
    .map((d) => ({ username: d.id, uid: (d.data() as { uid: string }).uid }))
    .filter((r) => r.username.startsWith(p))
    .filter((r) => (excludeUid ? r.uid !== excludeUid : true))
    .slice(0, max);
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
