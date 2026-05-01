import { create } from 'zustand';

type OnboardingDraft = {
  avatarUri: string | null;
  displayName: string;
  username: string;
  birthDate: string; // DD/MM/YY
  setAvatarUri: (uri: string | null) => void;
  setDisplayName: (name: string) => void;
  setUsername: (u: string) => void;
  setBirthDate: (d: string) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingDraft>((set) => ({
  avatarUri: null,
  displayName: '',
  username: '',
  birthDate: '',
  setAvatarUri: (avatarUri) => set({ avatarUri }),
  setDisplayName: (displayName) => set({ displayName }),
  setUsername: (username) => set({ username }),
  setBirthDate: (birthDate) => set({ birthDate }),
  reset: () =>
    set({
      avatarUri: null,
      displayName: '',
      username: '',
      birthDate: '',
    }),
}));

