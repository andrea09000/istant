import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  type Unsubscribe,
  where,
} from 'firebase/firestore';

import type { FriendshipDoc } from '../types';
import { db } from './firebase';
import { CLOSE_FRIENDS, USERS } from './users';

const FRIENDSHIPS = 'friendships';

function assertDb() {
  if (!db) {
    throw new Error('Firestore not available');
  }
  return db;
}

export function pairId(a: string, b: string) {
  return [a, b].sort().join('_');
}

export async function getFriendship(
  a: string,
  b: string,
): Promise<(FriendshipDoc & { id: string }) | null> {
  const firestore = assertDb();
  const id = pairId(a, b);
  const snap = await getDoc(doc(firestore, FRIENDSHIPS, id));
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as FriendshipDoc) };
}

export async function sendFriendRequest(currentUid: string, targetUid: string) {
  if (currentUid === targetUid) {
    return;
  }
  const firestore = assertDb();
  const id = pairId(currentUid, targetUid);
  const ref = doc(firestore, FRIENDSHIPS, id);
  const ex = await getDoc(ref);
  if (ex.exists()) {
    const s = (ex.data() as FriendshipDoc).status;
    if (s === 'accepted' || s === 'pending') {
      return;
    }
  }
  await setDoc(ref, {
    users: [currentUid, targetUid].sort((x, y) => x.localeCompare(y)) as [string, string],
    status: 'pending' as const,
    requestedBy: currentUid,
    createdAt: new Date().toISOString(),
  });
}

export async function acceptRequest(currentUid: string, otherUid: string) {
  const firestore = assertDb();
  const id = pairId(currentUid, otherUid);
  const ref = doc(firestore, FRIENDSHIPS, id);
  const ex = await getDoc(ref);
  if (!ex.exists()) {
    return;
  }
  const data = ex.data() as FriendshipDoc;
  if (data.status !== 'pending' || data.requestedBy === currentUid) {
    return;
  }
  if (!data.users?.includes(currentUid) || !data.users?.includes(data.requestedBy!)) {
    return;
  }
  await setDoc(
    ref,
    {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    } as unknown as Partial<FriendshipDoc>,
    { merge: true },
  );
  // Denormalize accepted friendships onto *my* users/{uid}.
  // Note: client rules only allow writing your own user doc.
  await setDoc(
    doc(firestore, USERS, currentUid),
    { friendUids: arrayUnion(otherUid) },
    { merge: true },
  );
}

export async function rejectRequest(currentUid: string, otherUid: string) {
  const firestore = assertDb();
  const id = pairId(currentUid, otherUid);
  const ref = doc(firestore, FRIENDSHIPS, id);
  const ex = await getDoc(ref);
  if (!ex.exists()) {
    return;
  }
  const data = ex.data() as FriendshipDoc;
  if (data.status !== 'pending' || data.requestedBy === currentUid) {
    return;
  }
  await deleteDoc(ref);
}

export async function removeFriend(a: string, b: string) {
  const firestore = assertDb();
  await deleteDoc(doc(firestore, FRIENDSHIPS, pairId(a, b)));
  // Best-effort: keep denormalized friend lists in sync.
  try {
    await setDoc(doc(firestore, USERS, a), { friendUids: arrayRemove(b) }, { merge: true });
  } catch {
    // ignore
  }
  const closeA = doc(firestore, USERS, a, CLOSE_FRIENDS, b);
  const closeB = doc(firestore, USERS, b, CLOSE_FRIENDS, a);
  try {
    await deleteDoc(closeA);
  } catch {
    // ignore
  }
  try {
    await deleteDoc(closeB);
  } catch {
    // ignore
  }
}

export function subscribePendingIncoming(
  myUid: string,
  onData: (items: { id: string; fromUid: string }[]) => void,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    query(
      collection(firestore, FRIENDSHIPS),
      where('status', '==', 'pending'),
      where('users', 'array-contains', myUid),
    ),
    (snap) => {
      const out: { id: string; fromUid: string }[] = [];
      for (const d of snap.docs) {
        const f = d.data() as FriendshipDoc;
        if (f.status !== 'pending' || f.requestedBy === myUid) {
          continue;
        }
        out.push({ id: d.id, fromUid: f.requestedBy! });
      }
      onData(out);
    },
    (err) => {
      console.error(err);
      onData([]);
    },
  );
}

export function subscribeAcceptedFriends(
  myUid: string,
  onUids: (friendUids: string[]) => void,
): Unsubscribe {
  const firestore = assertDb();
  return onSnapshot(
    query(
      collection(firestore, FRIENDSHIPS),
      where('status', '==', 'accepted'),
      where('users', 'array-contains', myUid),
    ),
    (snap) => {
      const uids: string[] = [];
      for (const d of snap.docs) {
        const f = d.data() as FriendshipDoc;
        if (f.users[0] === myUid) {
          uids.push(f.users[1]!);
        } else {
          uids.push(f.users[0]!);
        }
      }
      onUids(uids);
    },
    (err) => {
      console.error(err);
      onUids([]);
    },
  );
}

export function subscribeCloseFriends(
  myUid: string,
  onData: (uids: string[]) => void,
): Unsubscribe {
  return onSnapshot(
    collection(assertDb(), USERS, myUid, CLOSE_FRIENDS),
    (sn) => onData(sn.docs.map((d) => d.id)),
  );
}

export async function toggleCloseFriend(
  me: string,
  friendUid: string,
  isClose: boolean,
) {
  if (me === friendUid) {
    return;
  }
  const fire = assertDb();
  const c = doc(fire, USERS, me, CLOSE_FRIENDS, friendUid);
  if (isClose) {
    const fr = await getFriendship(me, friendUid);
    if (fr?.status !== 'accepted') {
      return;
    }
    await setDoc(c, { addedAt: new Date().toISOString() });
  } else {
    await deleteDoc(c);
  }
}

export async function isCloseFriend(me: string, friendUid: string) {
  const snap = await getDoc(
    doc(assertDb(), USERS, me, CLOSE_FRIENDS, friendUid),
  );
  return snap.exists();
}

export type FriendState = 'none' | 'pending_sent' | 'pending_in' | 'accepted';

export async function isFriend(
  a: string,
  b: string,
): Promise<FriendState> {
  const f = await getFriendship(a, b);
  if (!f) {
    return 'none';
  }
  if (f.status === 'pending') {
    if (f.requestedBy === a) {
      return 'pending_sent';
    }
    return 'pending_in';
  }
  return 'accepted';
}

export async function getPendingOutgoingFor(
  fromUid: string,
  toUid: string,
): Promise<boolean> {
  const f = await getFriendship(fromUid, toUid);
  return f?.status === 'pending' && f.requestedBy === fromUid;
}
