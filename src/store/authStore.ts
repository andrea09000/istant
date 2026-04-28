import { type User } from 'firebase/auth';
import { create } from 'zustand';

import type { UserProfile } from '../types';

type AuthState = {
  user: User | null;
  profile: UserProfile | null | undefined;
  authReady: boolean;
  setUser: (u: User | null) => void;
  setProfile: (p: UserProfile | null | undefined) => void;
  setAuthReady: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: undefined,
  authReady: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthReady: (authReady) => set({ authReady }),
}));
