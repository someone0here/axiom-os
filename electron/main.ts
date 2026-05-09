import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import path from "path";
import fs from "fs";
import { getDB } from "./db/index";
import { store } from "./store";
import { registerAuthHandlers } from "./ipc/auth";
import { registerNotesHandlers } from "./ipc/notes";
import { registerPasswordHandlers } from "./ipc/passwords";
import { registerVaultHandlers } from "./ipc/vault";
import { registerSettingsHandlers } from "./ipc/settings";
import { registerProfileHandlers } from "./ipc/profiles";
import { registerSnapshotHandlers } from "./ipc/snapshots";
import { registerSyncHandlers } from "./ipc/sync";

let mainWindow: BrowserWindow | null = null;

// Allow WebSocket connections to Nostr relays — some relay SSL certs
// can fail verification which silently kills the wss:// connection
app.on(
  "certificate-error",
  (event, _webContents, url, _error, _cert, callback) => {
    if (url.startsWith("wss://") || url.startsWith("ws://")) {
      event.preventDefault();
      callback(true); // trust relay certs
    } else {
      callback(false);
    }
  },
);

// Find the correct path to index.html regardless of platform
function getIndexPath(): string {
  // In production, __dirname = .../resources/app.asar/electron/dist
  // index.html = .../resources/app.asar/dist/index.html
  const candidates = [
    path.join(__dirname, "..", "..", "dist", "index.html"),
    path.join(__dirname, "..", "dist", "index.html"),
    path.join(app.getAppPath(), "dist", "index.html"),
    path.join(process.resourcesPath, "app.asar", "dist", "index.html"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log("[AXIOM] Found index.html at:", p);
      return p;
    }
  }

  // Log all tried paths for debugging
  console.error("[AXIOM] Could not find index.html. Tried:", candidates);
  return candidates[0]; // fallback
}

app.whenReady().then(() => {
  const DATA_DIR =
    process.env.NODE_ENV === "development"
      ? path.join(app.getAppPath(), "..", "data")
      : path.join(app.getPath("userData"), "data");

  console.log("[AXIOM] DATA_DIR:", DATA_DIR);

  getDB(DATA_DIR);

  registerAuthHandlers(DATA_DIR);
  registerNotesHandlers(DATA_DIR);
  registerPasswordHandlers(DATA_DIR);
  registerVaultHandlers(DATA_DIR);
  registerSettingsHandlers(DATA_DIR);
  registerProfileHandlers(DATA_DIR);
  registerSnapshotHandlers(DATA_DIR, () => store.key);
  registerSyncHandlers(DATA_DIR, () => store.key);

  globalShortcut.register("Escape", () => false);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: -100, y: -100 },
    minimizable: true,
    closable: true,
    fullscreenable: true,
    transparent: false,
    backgroundColor: "#040409",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // allows wss:// connections from file:// context
      allowRunningInsecureContent: false,
      devTools: true, // always on so you can debug network issues
    },
  });

  mainWindow.on("enter-full-screen", () => {
    mainWindow?.webContents.send("fullscreen-change", true);
  });
  mainWindow.on("leave-full-screen", () => {
    mainWindow?.webContents.send("fullscreen-change", false);
  });
  mainWindow.on("enter-html-full-screen", () => {
    mainWindow?.webContents.send("fullscreen-change", true);
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    const indexPath = getIndexPath();
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error("[AXIOM] Failed to load:", indexPath, err);
    });
  }

  ipcMain.on("win:minimize", () => mainWindow?.minimize());
  ipcMain.on("win:maximize", () => {
    if (!mainWindow) return;
    const isKiosk = mainWindow.isKiosk();
    mainWindow.setKiosk(!isKiosk);
    mainWindow.webContents.send("fullscreen-change", !isKiosk);
  });
  ipcMain.on("win:close", () => app.quit());

  globalShortcut.register("CommandOrControl+Shift+L", () => {
    store.clearSession();
    mainWindow?.webContents.send("force-lock");
  });
});

app.on("before-quit", () => {
  store.clearSession();
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  app.quit();
});
