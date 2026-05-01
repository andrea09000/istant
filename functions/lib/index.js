"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDueIstantMoments = exports.scheduleIstantMomentsDaily = exports.onPostCreatedSendPush = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const expoPush_1 = require("./expoPush");
admin.initializeApp();
async function getUser(uid) {
    const snap = await admin.firestore().doc(`users/${uid}`).get();
    if (!snap.exists)
        return null;
    return snap.data();
}
function dayKeyUTC(d) {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
function hashToUnitInterval(s) {
    // Simple deterministic hash (FNV-1a-ish) → [0,1)
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    const u = (h >>> 0) / 2 ** 32;
    return u;
}
async function getAcceptedFriendUids(uid) {
    const snap = await admin
        .firestore()
        .collection('friendships')
        .where('status', '==', 'accepted')
        .where('users', 'array-contains', uid)
        .get();
    const out = [];
    for (const d of snap.docs) {
        const f = d.data();
        const other = (f.users ?? []).find((x) => x !== uid);
        if (other)
            out.push(other);
    }
    return Array.from(new Set(out));
}
exports.onPostCreatedSendPush = (0, firestore_1.onDocumentCreated)('posts/{postId}', async (event) => {
    const data = event.data?.data();
    if (!data?.authorUid || !Array.isArray(data.audienceUids))
        return;
    const postId = event.params.postId;
    const authorUid = data.authorUid;
    const audienceUids = Array.from(new Set(data.audienceUids)).filter((u) => u && u !== authorUid);
    if (audienceUids.length === 0)
        return;
    const author = await getUser(authorUid);
    const authorTag = author?.username ? `@${author.username}` : 'Un amico';
    const recipients = await Promise.all(audienceUids.map(async (uid) => {
        const u = await getUser(uid);
        return { uid, u };
    }));
    const messages = recipients
        .filter(({ u }) => Boolean(u?.fcmToken))
        .filter(({ u }) => u?.notif_postFromFriends !== false) // default true when missing
        .map(({ u }) => ({
        to: u.fcmToken,
        title: 'Istant',
        body: `${authorTag} ha pubblicato un Istant`,
        sound: 'default',
        priority: 'high',
        data: { type: 'friend_post', postId, authorUid },
    }));
    if (messages.length === 0)
        return;
    try {
        await (0, expoPush_1.sendExpoPush)(messages);
    }
    catch (e) {
        firebase_functions_1.logger.error('push on post failed', { postId, authorUid, err: String(e) });
    }
});
/**
 * Daily scheduler: create one moment per user (and their friend circle) for the day.
 * Note: this can cause a user to be included in multiple friend circles; we handle
 * that on the "send" side by de-duping pushes per moment.
 */
exports.scheduleIstantMomentsDaily = (0, scheduler_1.onSchedule)('every day 00:10', async () => {
    const fire = admin.firestore();
    const dayKey = dayKeyUTC(new Date());
    // Only consider users who have a push token stored.
    const usersSnap = await fire.collection('users').where('fcmToken', '>', '').get();
    const writes = [];
    for (const u of usersSnap.docs) {
        const uid = u.id;
        const data = u.data();
        if (!data.fcmToken)
            continue;
        const momentId = `${dayKey}_${uid}`;
        const ref = fire.collection('istantMoments').doc(momentId);
        const friends = await getAcceptedFriendUids(uid);
        const audienceUids = Array.from(new Set([uid, ...friends]));
        // Random time between 09:00 and 22:00 UTC (inclusive start, exclusive end).
        const r = hashToUnitInterval(`${dayKey}:${uid}`);
        const startMin = 9 * 60;
        const endMin = 22 * 60;
        const minuteOfDay = Math.floor(startMin + r * (endMin - startMin));
        const scheduled = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 0, 0, 0));
        scheduled.setUTCMinutes(minuteOfDay);
        writes.push(ref.set({
            ownerUid: uid,
            audienceUids,
            dayKey,
            scheduledFor: scheduled.toISOString(),
            createdAt: new Date().toISOString(),
        }, { merge: true }));
    }
    await Promise.all(writes);
});
exports.sendDueIstantMoments = (0, scheduler_1.onSchedule)('every 1 minutes', async () => {
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
    if (due.empty)
        return;
    for (const doc of due.docs) {
        const m = doc.data();
        const audience = Array.from(new Set(m.audienceUids ?? [])).filter(Boolean);
        if (audience.length === 0) {
            await doc.ref.set({ notifiedAt: new Date().toISOString() }, { merge: true });
            continue;
        }
        const recipients = await Promise.all(audience.map(async (uid) => ({ uid, u: await getUser(uid) })));
        const messages = recipients
            .filter(({ u }) => Boolean(u?.fcmToken))
            .filter(({ u }) => u?.notif_istantMoment !== false) // default true
            .map(({ uid, u }) => ({
            to: u.fcmToken,
            title: 'È ora di Istant',
            body: 'Scatta e pubblica insieme ai tuoi amici.',
            sound: 'default',
            priority: 'high',
            data: { type: 'istant_moment', momentId: doc.id, ownerUid: m.ownerUid, uid },
        }));
        try {
            if (messages.length > 0) {
                await (0, expoPush_1.sendExpoPush)(messages);
            }
        }
        catch (e) {
            firebase_functions_1.logger.error('push moment failed', { momentId: doc.id, err: String(e) });
        }
        finally {
            await doc.ref.set({ notifiedAt: new Date().toISOString() }, { merge: true });
        }
    }
});
