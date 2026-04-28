import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  query,
  where,
  limit,
  type DocumentData,
} from 'firebase/firestore';
import {
  deleteObject,
  listAll,
  ref as storageRef,
} from 'firebase/storage';
import { deleteUser } from 'firebase/auth';

import { auth, db, storage } from './firebase';
import { USERS, USERNAMES, CLOSE_FRIENDS, getUser } from './users';

const POSTS = 'posts';
const FRIENDSHIPS = 'friendships';
const REPORTS = 'reports';

function assertDb() {
  if (!db) throw new Error('Firestore not available');
  return db;
}
function assertAuth() {
  if (!auth?.currentUser) throw new Error('Auth non disponibile');
  return auth;
}
function assertStorage() {
  if (!storage) throw new Error('Storage not available');
  return storage;
}

async function tryDeleteDoc(path: { collection: string; id: string }) {
  try {
    await deleteDoc(doc(assertDb(), path.collection, path.id));
  } catch {
    // ignore
  }
}

async function deleteAllInCollection(colPath: string[]) {
  const fire = assertDb();
  // TS can't type a dynamic path for collection(); build via doc() when needed.
  let col: ReturnType<typeof collection>;
  if (colPath.length === 1) {
    col = collection(fire, colPath[0]!);
  } else {
    const parentDocPath = colPath.slice(0, -1);
    const last = colPath[colPath.length - 1]!;
    const parentRef = doc(fire as any, ...(parentDocPath as any));
    col = collection(parentRef, last);
  }
  const sn = await getDocs(col);
  await Promise.all(sn.docs.map((d) => deleteDoc(d.ref)));
}

async function deleteStorageFolder(prefix: string) {
  const s = assertStorage();
  try {
    const root = storageRef(s, prefix);
    const listed = await listAll(root);
    await Promise.all(listed.items.map((it) => deleteObject(it)));
    await Promise.all(listed.prefixes.map((p) => deleteStorageFolder(p.fullPath)));
  } catch {
    // ignore
  }
}

export async function deleteMyAccount() {
  const a = assertAuth();
  const me = a.currentUser!;
  const uid = me.uid;
  const fire = assertDb();

  // 0) Delete my own reactions + views anywhere (best-effort)
  try {
    const myReactions = await getDocs(
      query(collectionGroup(fire, 'reactions'), where(documentId(), '==', uid), limit(500)),
    );
    await Promise.all(myReactions.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // ignore
  }
  try {
    const myViews = await getDocs(
      query(collectionGroup(fire, 'views'), where(documentId(), '==', uid), limit(500)),
    );
    await Promise.all(myViews.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // ignore
  }

  // 1) Delete my posts (+ subcollections)
  try {
    const postsSnap = await getDocs(
      query(
        collection(fire, POSTS),
        where('authorUid', '==', uid),
        limit(500),
      ),
    );
    for (const p of postsSnap.docs) {
      const postId = p.id;
      try {
        await deleteAllInCollection([POSTS, postId, 'reactions']);
      } catch {
        // ignore
      }
      try {
        await deleteAllInCollection([POSTS, postId, 'views']);
      } catch {
        // ignore
      }
      try {
        await deleteDoc(p.ref);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  // 2) Delete friendships (where my uid is in users[])
  try {
    const frSnap = await getDocs(
      query(
        collection(fire, FRIENDSHIPS),
        where('users', 'array-contains', uid),
        limit(500),
      ),
    );
    await Promise.all(frSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // ignore
  }

  // 3) Delete my close friends list
  try {
    await deleteAllInCollection([USERS, uid, CLOSE_FRIENDS]);
  } catch {
    // ignore
  }

  // 3.5) Delete my reports
  try {
    const rep = await getDocs(
      query(collection(fire, REPORTS), where('reporterUid', '==', uid), limit(500)),
    );
    await Promise.all(rep.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // ignore
  }

  // 4) Delete username mapping
  try {
    const profile = await getUser(uid);
    const key = (profile as (DocumentData & { _usernameKey?: string }) | null)?._usernameKey ?? profile?.username;
    if (key) {
      await tryDeleteDoc({ collection: USERNAMES, id: String(key) });
    }
  } catch {
    // ignore
  }

  // 5) Delete user profile doc
  try {
    await tryDeleteDoc({ collection: USERS, id: uid });
  } catch {
    // ignore
  }

  // 6) Delete storage files
  await deleteStorageFolder(`avatars/${uid}`);
  await deleteStorageFolder(`posts/${uid}`);

  // 7) Finally delete auth user (may require recent login)
  await deleteUser(me);
}

