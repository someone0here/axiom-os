import { create } from "zustand";

const WPS = [
  "radial-gradient(ellipse at 20% 80%,#0d081e 0%,transparent 55%),radial-gradient(ellipse at 80% 20%,#060c1a 0%,transparent 55%),#040409",
  "radial-gradient(ellipse at 10% 90%,#041520 0%,transparent 60%),radial-gradient(ellipse at 90% 10%,#051622 0%,transparent 60%),#030b0e",
  "radial-gradient(ellipse at 50% 0%,#1a0a1e 0%,transparent 50%),radial-gradient(ellipse at 50% 100%,#0a051a 0%,transparent 50%),#06040a",
  "radial-gradient(ellipse at 0% 100%,#1a1000 0%,transparent 60%),radial-gradient(ellipse at 100% 0%,#001a10 0%,transparent 60%),#050502",
  "linear-gradient(135deg,#050510 0%,#080818 50%,#040409 100%)",
];

interface UiStore {
  wallpaperIndex: number;
  wallpapers: string[];
  setWallpaper: (i: number) => void;
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
  spotlightOpen: boolean;
  setSpotlight: (v: boolean) => void;
}

export const useUi = create<UiStore>((set) => ({
  wallpaperIndex: 0,
  wallpapers: WPS,
  setWallpaper: (i) => set({ wallpaperIndex: i }),
  isLocked: false,
  lock: () => set({ isLocked: true }),
  unlock: () => set({ isLocked: false }),
  spotlightOpen: false,
  setSpotlight: (v) => set({ spotlightOpen: v }),
}));
