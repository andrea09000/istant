import { Timestamp } from 'firebase/firestore';

export type UserProfile = {
  _usernameKey?: string;
  _displayNameKey?: string;
  username: string;
  displayName: string;
  birthYear: number;
  /** Shareable invite token for /friendInvites/{token} (optional). */
  friendInviteToken?: string;
  /** ISO timestamp when the current invite token was created. */
  friendInviteCreatedAt?: string;
  /** Denormalized accepted friends (uids). */
  friendUids?: string[];
  avatarUrl?: string;
  bio?: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
  /** Special profile: posts are treated as ads (Inserzione). */
  isAdvertiser?: boolean;
  createdAt?: Timestamp;
  fcmToken?: string;
  /** Notifications preferences (server-side push). Defaults to true when missing. */
  notif_postFromFriends?: boolean;
  /** Notifications preferences (server-side push). Defaults to true when missing. */
  notif_istantMoment?: boolean;
  /** First-run onboarding: after profile, permissions screens */
  onboardingNotifDone?: boolean;
  onboardingCameraDone?: boolean;
};

export type PostAudience = 'all' | 'close';

export type PostProfileVisibility = 'profile' | 'archived';

export type PostDoc = {
  authorUid: string;
  photoUrl: string;
  /** Optional outbound link (used for Inserzione posts). */
  link?: string;
  /** Ad post: shows as "Inserzione" and disables emoji reactions. */
  isAd?: boolean;
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
