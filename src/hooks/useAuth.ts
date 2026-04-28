import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

import { auth, firebaseConfigured } from '../lib/firebase';
import { subscribeUser } from '../lib/users';
import { useAuthStore } from '../store/authStore';

/**
 * Binds Firebase auth + Firestore user document to the global store
 * and to derived routing flags.
 */
export function useAuth() {
  const { user, authReady, setUser, setProfile, setAuthReady } = useAuthStore();
  const p = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      setProfile(null);
      setAuthReady(true);
      return;
    }
    setAuthReady(false);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setAuthReady(true);
      }
    });
    return () => {
      unsub();
    };
  }, [setUser, setProfile, setAuthReady]);

  useEffect(() => {
    if (!user?.uid) {
      if (user === null) {
        setProfile(null);
      }
      return;
    }
    setProfile(undefined);
    setAuthReady(false);
    const u = user.uid;
    return subscribeUser(u, (p) => {
      setProfile(p);
      setAuthReady(true);
    });
  }, [user, setProfile, setAuthReady]);

  const notifOk = p
    ? p.onboardingNotifDone === true
    : false;
  const cameraOk = p
    ? p.onboardingCameraDone === true
    : false;
  const onboardingComplete = Boolean(p) && notifOk && cameraOk;
  const profileLoading = Boolean(user) && p === undefined;

  return {
    user,
    profile: p,
    profileLoading,
    loading: !authReady,
    firebaseConfigured,
    notifOk,
    cameraOk,
    onboardingComplete,
  };
}
