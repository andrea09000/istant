import { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  _usernameKey?: string;
  username: string;
  displayName: string;
  birthYear: number;
  avatarUrl?: string;
  bio?: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
  createdAt?: Timestamp;
  fcmToken?: string;
  /** First-run onboarding: after profile, permissions screens */
  onboardingNotifDone?: boolean;
  onboardingCameraDone?: boolean;
};

export type PostAudience = 'all' | 'close';

export type PostProfileVisibility = 'profile' | 'archived';

export type PostDoc = {
  authorUid: string;
  photoUrl: string;
  audience: PostAudience;
  audienceUids: string[];
  createdAt: Timestamp | string;
  /** ISO: post disappears from feed after this time (24h from creation by default). */
  expiresAt?: string;
  /** After feed expiry, where the post shows on the author's profile. Default "profile". */
  profileVisibility?: PostProfileVisibility;
};

export type FriendshipStatus = 'pending' | 'accepted';

export type FriendshipDoc = {
  users: [string, string];
  status: FriendshipStatus;
  requestedBy: string;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
};

export type FriendInviteDoc = {
  ownerUid: string;
  createdAt: string;
};

export type EmojiReaction = '❤️' | '😂' | '😮' | '🔥' | '👀' | '💀';

export const EMOJIS: EmojiReaction[] = ['❤️', '😂', '😮', '🔥', '👀', '💀'];
