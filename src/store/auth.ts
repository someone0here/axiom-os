import { create } from "zustand";

interface AuthStore {
  isLoggedIn: boolean;
  profileId: number | null;
  needsSetup: boolean;
  setLoggedIn: (profileId: number) => void;
  setLoggedOut: () => void;
  setNeedsSetup: (v: boolean) => void;
}

export const useAuth = create<AuthStore>((set) => ({
  isLoggedIn: false,
  profileId: null,
  needsSetup: false,
  setLoggedIn: (profileId) => set({ isLoggedIn: true, profileId }),
  setLoggedOut: () => set({ isLoggedIn: false, profileId: null }),
  setNeedsSetup: (v) => set({ needsSetup: v }),
}));
