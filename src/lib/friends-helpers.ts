import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from './firebase';

const FRIENDSHIPS = 'friendships';

function assertDb() {
  if (!db) {
    throw new Error('Firestore not available');
  }
  return db;
}

export async function getAcceptedFriendUids(authorUid: string): Promise<string[]> {
  const firestore = assertDb();
  const snap = await getDocs(
    query(
      collection(firestore, FRIENDSHIPS),
      where('status', '==', 'accepted'),
      where('users', 'array-contains', authorUid),
    ),
  );
  return snap.docs.map((d) => {
    const f = d.data() as { users: [string, string] };
    return f.users[0] === authorUid ? f.users[1]! : f.users[0]!;
  });
}
