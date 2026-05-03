// src/apps/registry.ts  ← central app registry
import type { ComponentType } from "react";

export interface AppManifest {
  id: string;
  label: string;
  icon: string;
  iconBg: string;
  defaultWidth: number;
  defaultHeight: number;
  component: () => Promise<{ default: ComponentType<any> }>;
  keywords?: string[]; // for spotlight search
  canHaveMultiple?: boolean; // allow multiple windows of same app
}

// Built-in apps
const BUILTIN_APPS: AppManifest[] = [
  {
    id: "notes",
    label: "Notes",
    icon: "📝",
    iconBg: "rgba(245,158,11,0.18)",
    defaultWidth: 640,
    defaultHeight: 420,
    component: () => import("./Notes/Notes"),
    keywords: ["write", "text", "journal", "memo"],
  },
  {
    id: "files",
    label: "Files",
    icon: "📁",
    iconBg: "rgba(59,130,246,0.18)",
    defaultWidth: 700,
    defaultHeight: 480,
    component: () => import("./Files/Files"),
    keywords: ["storage", "documents", "upload"],
  },
  {
    id: "vault",
    label: "Vault",
    icon: "🔐",
    iconBg: "rgba(139,92,246,0.18)",
    defaultWidth: 480,
    defaultHeight: 400,
    component: () => import("./Vault/Vault"),
    keywords: ["passwords", "credentials", "secrets", "keys"],
  },
  {
    id: "chat",
    label: "Chat",
    icon: "💬",
    iconBg: "rgba(6,182,212,0.18)",
    defaultWidth: 700,
    defaultHeight: 480,
    component: () => import("./Chat/Chat"),
    keywords: ["message", "chat", "nostr", "encrypted", "dm"],
  },
  {
    id: "gallery",
    label: "Gallery",
    icon: "🖼",
    iconBg: "rgba(236,72,153,0.18)",
    defaultWidth: 700,
    defaultHeight: 500,
    component: () => import("./Gallery/Gallery"),
    keywords: ["images", "photos", "pictures"],
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: "⬛",
    iconBg: "rgba(16,185,129,0.18)",
    defaultWidth: 560,
    defaultHeight: 360,
    component: () => import("./Terminal/Terminal"),
    keywords: ["console", "shell", "commands"],
    canHaveMultiple: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙️",
    iconBg: "rgba(107,114,128,0.18)",
    defaultWidth: 560,
    defaultHeight: 420,
    component: () => import("./Settings/Settings"),
    keywords: ["preferences", "theme", "wallpaper", "security"],
  },
];

// Extension registry — loaded at startup
const _extensions: AppManifest[] = [];

export function registerExtension(app: AppManifest): void {
  if (_extensions.find((e) => e.id === app.id)) {
    console.warn(`Extension ${app.id} already registered`);
    return;
  }
  _extensions.push(app);
  console.log(`[Extensions] Registered: ${app.label}`);
}

export function getAllApps(): AppManifest[] {
  return [...BUILTIN_APPS, ..._extensions];
}

export function getApp(id: string): AppManifest | undefined {
  return getAllApps().find((a) => a.id === id);
}

export function searchApps(query: string): AppManifest[] {
  const q = query.toLowerCase();
  return getAllApps().filter(
    (a) =>
      a.label.toLowerCase().includes(q) ||
      a.keywords?.some((k) => k.includes(q)),
  );
}
