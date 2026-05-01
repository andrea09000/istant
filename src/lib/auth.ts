import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
// NOTE: Google Sign-In is not available in Expo Go (requires dev build).
// To avoid crashing in Expo Go, we load the native module dynamically.
let GoogleSignin: any = null;
let statusCodes: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
} catch {
  // Running in Expo Go or module not linked.
}
import {
  OAuthProvider,
  signInWithCredential,
  signOut,
  type User,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { auth, firebaseApp } from './firebase';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export function configureGoogleSignIn() {
  if (!webClientId) {
    return;
  }
  if (!GoogleSignin) {
    return;
  }
  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
  });
}

function randomNonceString(length: number) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function sha256HexWithDigestApi(input: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
}

// Apple wants SHA-256 of raw nonce, hex 64 chars per Expo/Firebase samples
export async function signInWithApple(): Promise<User> {
  if (Platform.OS !== 'ios' || !auth) {
    throw new Error('Apple sign-in is only available on iOS with Firebase configured');
  }
  const rawNonce = randomNonceString(20);
  const hash = await sha256HexWithDigestApi(rawNonce);
  const apple = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    ],
    nonce: hash,
  });
  if (!apple.identityToken) {
    throw new Error('No identity token from Apple');
  }
  const provider = new OAuthProvider('apple.com');
  const cred = provider.credential({
    idToken: apple.identityToken,
    rawNonce: rawNonce,
  });
  const result = await signInWithCredential(auth, cred);
  return result.user;
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth || !firebaseApp) {
    throw new Error('Firebase not configured');
  }
  if (!webClientId) {
    throw new Error('Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env');
  }
  if (!GoogleSignin) {
    throw new Error('Google Sign-In richiede una development build (non Expo Go). Premi "s" nel terminale Expo e installa la dev build.');
  }
  configureGoogleSignIn();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const r = await GoogleSignin.signIn();
  const idToken =
    (r as { data?: { idToken: string } }).data?.idToken ?? (r as { idToken?: string }).idToken;
  if (!idToken) {
    throw new Error('No idToken from Google');
  }
  const cred = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, cred);
  return result.user;
}

export { signOut, statusCodes, GoogleSignin };
export { auth };

export async function signOutUser() {
  if (auth) {
    await signOut(auth);
  }
  try {
    if (webClientId) {
      if (GoogleSignin) {
        await GoogleSignin.signOut();
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Re-authenticate the current user for sensitive actions (delete account, etc).
 * Uses an interactive provider flow (Apple on iOS, Google otherwise) based on the
 * user's linked provider. Falls back to trying Apple then Google.
 */
export async function reauthenticateCurrentUser(): Promise<FirebaseUser> {
  if (!auth?.currentUser) {
    throw new Error('Auth non disponibile');
  }
  const providerIds = auth.currentUser.providerData.map((p) => p.providerId);

  const tryAppleFirst = providerIds.includes('apple.com');
  const tryGoogleFirst = providerIds.includes('google.com');

  const attempts: Array<() => Promise<User>> = [];
  if (tryAppleFirst) attempts.push(() => signInWithApple());
  if (tryGoogleFirst) attempts.push(() => signInWithGoogle());
  // Fallback order
  if (!tryAppleFirst) attempts.push(() => signInWithApple());
  if (!tryGoogleFirst) attempts.push(() => signInWithGoogle());

  let lastErr: unknown = null;
  for (const a of attempts) {
    try {
      const u = await a();
      return u;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Impossibile fare re-login');
}
