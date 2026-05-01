import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { sendExpoPush } from './expoPush';

admin.initializeApp();

type UserDoc = {
  username?: string;
  fcmToken?: string; // actually Expo push token in this app
  notif_postFromFriends?: boolean;
  notif_istantMoment?: boolean;
};

type PostDoc = {
  authorUid: string;
  audienceUids: string[];
  audience: 'all' | 'close';
};

async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists) return null;
  return snap.data() as UserDoc;
}

function dayKeyUTC(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hashToUnitInterval(s: string) {
  // Simple deterministic hash (FNV-1a-ish) → [0,1)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 2 ** 32;
  return u;
}

async function getAcceptedFriendUids(uid: string): Promise<string[]> {
  const snap = await admin
    .firestore()
    .collection('friendships')
    .where('status', '==', 'accepted')
    .where('users', 'array-contains', uid)
    .get();

  const out: string[] = [];
  for (const d of snap.docs) {
    const f = d.data() as { users?: string[] };
    const other = (f.users ?? []).find((x) => x !== uid);
    if (other) out.push(other);
  }
  return Array.from(new Set(out));
}

export const onPostCreatedSendPush = onDocumentCreated('posts/{postId}', async (event) => {
  const data = event.data?.data() as PostDoc | undefined;
  if (!data?.authorUid || !Array.isArray(data.audienceUids)) return;

  const postId = event.params.postId as string;
  const authorUid = data.authorUid;
  const audienceUids = Array.from(new Set(data.audienceUids)).filter((u) => u && u !== authorUid);
  if (audienceUids.length === 0) return;

  const author = await getUser(authorUid);
  const authorTag = author?.username ? `@${author.username}` : 'Un amico';

  const recipients = await Promise.all(
    audienceUids.map(async (uid) => {
      const u = await getUser(uid);
      return { uid, u };
    }),
  );

  const messages = recipients
    .filter(({ u }) => Boolean(u?.fcmToken))
    .filter(({ u }) => u?.notif_postFromFriends !== false) // default true when missing
    .map(({ u }) => ({
      to: u!.fcmToken!,
      title: 'Istant',
      body: `${authorTag} ha pubblicato un Istant`,
      sound: 'default' as const,
      priority: 'high' as const,
      data: { type: 'friend_post', postId, authorUid },
    }));

  if (messages.length === 0) return;

  try {
    await sendExpoPush(messages);
  } catch (e) {
    logger.error('push on post failed', { postId, authorUid, err: String(e) });
  }
});

/**
 * Daily scheduler: create one moment per user (and their friend circle) for the day.
 * Note: this can cause a user to be included in multiple friend circles; we handle
 * that on the "send" side by de-duping pushes per moment.
 */
export const scheduleIstantMomentsDaily = onSchedule('every day 00:10', async () => {
  const fire = admin.firestore();
  const dayKey = dayKeyUTC(new Date());

  // Only consider users who have a push token stored.
  const usersSnap = await fire.collection('users').where('fcmToken', '>', '').get();

  const writes: Promise<unknown>[] = [];
  for (const u of usersSnap.docs) {
    const uid = u.id;
    const data = u.data() as UserDoc;
    if (!data.fcmToken) continue;

    const momentId = `${dayKey}_${uid}`;
    const ref = fire.collection('istantMoments').doc(momentId);

    const friends = await getAcceptedFriendUids(uid);
    const audienceUids = Array.from(new Set([uid, ...friends]));

    // Random time between 09:00 and 22:00 UTC (inclusive start, exclusive end).
    const r = hashToUnitInterval(`${dayKey}:${uid}`);
    const startMin = 9 * 60;
    const endMin = 22 * 60;
    const minuteOfDay = Math.floor(startMin + r * (endMin - startMin));
    const scheduled = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      0,
      0,
      0,
    ));
    scheduled.setUTCMinutes(minuteOfDay);

    writes.push(
      ref.set(
        {
          ownerUid: uid,
          audienceUids,
          dayKey,
          scheduledFor: scheduled.toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      ),
    );
  }

  await Promise.all(writes);
});

export const sendDueIstantMoments = onSchedule('every 1 minutes', async () => {
  const fire = admin.firestore();
  const now = new Date();
  const dayKey = dayKeyUTC(now);

  // Find moments for today that are due and not yet notified.
  const due = await fire
    .collection('istantMoments')
    .where('dayKey', '==', dayKey)
    .where('scheduledFor', '<=', now.toISOString())
    .where('notifiedAt', '==', null)
    .limit(50)
    .get();

  if (due.empty) return;

  for (const doc of due.docs) {
    const m = doc.data() as {
      ownerUid: string;
      audienceUids: string[];
      scheduledFor: string;
    };
    const audience = Array.from(new Set(m.audienceUids ?? [])).filter(Boolean);
    if (audience.length === 0) {
      await doc.ref.set({ notifiedAt: new Date().toISOString() }, { merge: true });
      continue;
    }

    const recipients = await Promise.all(
      audience.map(async (uid) => ({ uid, u: await getUser(uid) })),
    );

    const messages = recipients
      .filter(({ u }) => Boolean(u?.fcmToken))
      .filter(({ u }) => u?.notif_istantMoment !== false) // default true
      .map(({ uid, u }) => ({
        to: u!.fcmToken!,
        title: 'È ora di Istant',
        body: 'Scatta e pubblica insieme ai tuoi amici.',
        sound: 'default' as const,
        priority: 'high' as const,
        data: { type: 'istant_moment', momentId: doc.id, ownerUid: m.ownerUid, uid },
      }));

    try {
      if (messages.length > 0) {
        await sendExpoPush(messages);
      }
    } catch (e) {
      logger.error('push moment failed', { momentId: doc.id, err: String(e) });
    } finally {
      await doc.ref.set({ notifiedAt: new Date().toISOString() }, { merge: true });
    }
  }
});

