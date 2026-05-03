import { create } from "zustand";

const WPS = [
  // 1. Deep Space — blue nebula
  "radial-gradient(ellipse at 20% 50%, #0d1b4b 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, #1a0533 0%, transparent 50%), radial-gradient(ellipse at 60% 80%, #001233 0%, transparent 40%), #000510",

  // 2. Aurora Borealis — green/teal
  "radial-gradient(ellipse at 0% 0%, #003d1f 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, #004d40 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, #001a0d 0%, transparent 60%), #000d07",

  // 3. Neon Cyber — purple/pink
  "radial-gradient(ellipse at 30% 40%, #2d0060 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, #60003a 0%, transparent 55%), radial-gradient(ellipse at 50% 0%, #000428 0%, transparent 40%), #08000f",

  // 4. Sunset Dusk — orange/red
  "radial-gradient(ellipse at 50% 0%, #3d1200 0%, transparent 60%), radial-gradient(ellipse at 100% 50%, #2d0800 0%, transparent 50%), radial-gradient(ellipse at 0% 100%, #1a0020 0%, transparent 50%), #0a0004",

  // 5. Ocean Deep — cyan
  "radial-gradient(ellipse at 30% 30%, #00303d 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, #002233 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, #001020 0%, transparent 40%), #000810",

  // 6. Forest Night — dark green
  "radial-gradient(ellipse at 0% 100%, #0a2000 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, #102800 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #051000 0%, transparent 60%), #010400",

  // 7. Arctic Ice — blue white
  "radial-gradient(ellipse at 30% 20%, #001440 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, #000d30 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, #00082a 0%, transparent 40%), #000418",

  // 8. Volcanic — dark red/orange
  "radial-gradient(ellipse at 50% 100%, #3d0800 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, #2a0500 0%, transparent 40%), radial-gradient(ellipse at 80% 20%, #1a0010 0%, transparent 50%), #050000",

  // 9. Galaxy Core — multi color
  "radial-gradient(ellipse at 40% 40%, #1a0040 0%, transparent 40%), radial-gradient(ellipse at 60% 60%, #002040 0%, transparent 40%), radial-gradient(ellipse at 20% 80%, #200020 0%, transparent 40%), radial-gradient(ellipse at 80% 20%, #002010 0%, transparent 40%), #000008",

  // 10. Pure Black — minimal
  "linear-gradient(135deg, #0a0a0a 0%, #050505 100%)",
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
