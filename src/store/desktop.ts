import { create } from "zustand";
import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import { getApp } from "../apps/registry";

// Lazy cache — lives at module level, never recreated
const _lazyCache = new Map<string, LazyExoticComponent<ComponentType<any>>>();
function getOrCreateLazy(
  appId: string,
): LazyExoticComponent<ComponentType<any>> | null {
  if (!_lazyCache.has(appId)) {
    const manifest = getApp(appId);
    if (!manifest) return null;
    _lazyCache.set(appId, lazy(manifest.component));
  }
  return _lazyCache.get(appId) ?? null;
}
export interface AppWindow {
  id: number;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  LazyComponent: LazyExoticComponent<ComponentType<any>> | null;
}

interface DesktopStore {
  windows: AppWindow[];
  activeId: number | null;
  zCounter: number;
  open: (appId: string) => void;
  close: (id: number) => void;
  minimize: (id: number) => void;
  maximize: (id: number) => void;
  focus: (id: number) => void;
  move: (id: number, x: number, y: number) => void;
  resize: (id: number, w: number, h: number) => void;
}

const APP_DEFAULTS: Record<string, Partial<AppWindow>> = {
  notes: { title: "Notes", width: 640, height: 420 },
  files: { title: "Files", width: 700, height: 480 },
  vault: { title: "Vault", width: 480, height: 400 },
  chat: { title: "Chat", width: 700, height: 480 },
  social: { title: "Social", width: 720, height: 520 },
  gallery: { title: "Gallery", width: 700, height: 500 },
  terminal: { title: "Terminal", width: 560, height: 360 },
  settings: { title: "Settings", width: 560, height: 420 },
};

let _id = 1;

export const useDesktop = create<DesktopStore>((set, get) => ({
  windows: [],
  activeId: null,
  zCounter: 10,

  open: (appId) => {
    const minimized = get().windows.find(
      (w) => w.appId === appId && w.minimized,
    );
    if (minimized) {
      const z = get().zCounter + 1;
      set((s) => ({
        activeId: minimized.id,
        zCounter: z,
        windows: s.windows.map((w) =>
          w.id === minimized.id ? { ...w, minimized: false, zIndex: z } : w,
        ),
      }));
      return;
    }

    const existing = get().windows.find(
      (w) => w.appId === appId && !w.minimized,
    );
    if (existing) {
      get().focus(existing.id);
      return;
    }

    const z = get().zCounter + 1;
    const offset = get().windows.length * 24;
    const def = APP_DEFAULTS[appId] || {};
    const vw =
      typeof window !== "undefined" ? window.innerWidth : 1920;
    const vh =
      typeof window !== "undefined" ? window.innerHeight : 1080;
    const pad = 12;
    const reservedChrome = 96;
    const baseW = def.width || 500;
    const baseH = def.height || 380;
    const width = Math.max(
      280,
      Math.min(baseW, vw - pad * 2),
    );
    const height = Math.max(
      200,
      Math.min(baseH, vh - reservedChrome),
    );
    const maxX = Math.max(pad, vw - width - pad);
    const maxY = Math.max(pad, vh - height - pad);
    const x = Math.min(60 + offset, maxX);
    const y = Math.min(40 + offset, maxY);
    const win: AppWindow = {
      id: _id++,
      appId,
      title: def.title || appId,
      x,
      y,
      width,
      height,
      zIndex: z,
      minimized: false,
      maximized: false,
      LazyComponent: getOrCreateLazy(appId),
    };
    set((s) => ({
      windows: [...s.windows, win],
      activeId: win.id,
      zCounter: z,
    }));
  },

  close: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focus: (id) =>
    set((s) => {
      const z = s.zCounter + 1;
      return {
        activeId: id,
        zCounter: z,
        windows: s.windows.map((w) => (w.id === id ? { ...w, zIndex: z } : w)),
      };
    }),

  minimize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, minimized: true } : w,
      ),
    })),
  maximize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized } : w,
      ),
    })),
  move: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),
  resize: (id, width, height) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, width, height } : w,
      ),
    })),
}));
