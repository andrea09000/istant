import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import type { FriendInviteDoc } from '../types';
import { db } from './firebase';

const FRIEND_INVITES = 'friendInvites';

const APP_ORIGIN = process.env.EXPO_PUBLIC_APP_ORIGIN; // e.g. https://istant.app

function assertDb() {
  if (!db) {
    throw new Error('Firestore not available');
  }
  return db;
}

function base64Url(bytes: Uint8Array) {
  // We avoid platform-dependent base64 helpers; hex token is fine here.
  // Token length is 32 chars (16 bytes hex) by default, good enough for guessing resistance.
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createFriendInvite(ownerUid: string) {
  const firestore = assertDb();
  const bytes = await Crypto.getRandomBytesAsync(16);
  const token = base64Url(bytes);
  const ref = doc(firestore, FRIEND_INVITES, token);
  const data: FriendInviteDoc = {
    ownerUid,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, data);
  const url =
    typeof APP_ORIGIN === 'string' && APP_ORIGIN.startsWith('https://')
      ? `${APP_ORIGIN.replace(/\/+$/, '')}/invite/${token}`
      : Linking.createURL(`/invite/${token}`);
  return { token, url };
}

export async function getFriendInvite(token: string) {
  const firestore = assertDb();
  const snap = await getDoc(doc(firestore, FRIEND_INVITES, token));
  if (!snap.exists()) {
    return null;
  }
  return snap.data() as FriendInviteDoc;
}

