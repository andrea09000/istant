import { addDoc, collection } from 'firebase/firestore';

import { db } from './firebase';

function assertDb() {
  if (!db) {
    throw new Error('Firebase non inizializzato');
  }
  return db;
}

export type ReportReason = 'spam' | 'nudity' | 'violence' | 'hate' | 'harassment' | 'other';

export async function reportPost(args: {
  postId: string;
  postAuthorUid: string;
  reporterUid: string;
  reason: ReportReason;
}) {
  const firestore = assertDb();
  await addDoc(collection(firestore, 'reports'), {
    type: 'post',
    postId: args.postId,
    postAuthorUid: args.postAuthorUid,
    reporterUid: args.reporterUid,
    reason: args.reason,
    createdAt: new Date().toISOString(),
  });
}

