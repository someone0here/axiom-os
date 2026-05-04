import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import path from "path";
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

app.whenReady().then(() => {
  const DATA_DIR =
    process.env.NODE_ENV === "development"
      ? path.join(app.getAppPath(), "..", "data")
      : path.join(app.getPath("userData"), "data");

  getDB(DATA_DIR);

  // Set dock/taskbar icon (macOS needs this separately in dev mode)
  const iconPath = path.join(app.getAppPath(), "assets", "icons", "icon.png");
  console.log("[icon] looking for icon at:", iconPath);
  try {
    if (process.platform === "darwin" && app.dock) {
      app.dock.setIcon(iconPath);
    }
  } catch (e) {
    console.warn("Could not set dock icon:", e);
  }

  registerAuthHandlers(DATA_DIR);
  registerNotesHandlers(DATA_DIR);
  registerPasswordHandlers(DATA_DIR);
  registerVaultHandlers(DATA_DIR);
  registerSettingsHandlers(DATA_DIR);
  registerProfileHandlers(DATA_DIR);
  registerSnapshotHandlers(DATA_DIR, () => store.key);
  registerSyncHandlers(DATA_DIR, () => store.key);

  // Escape exits kiosk mode
  globalShortcut.register("Escape", () => {
    if (mainWindow?.isKiosk()) {
      mainWindow.setKiosk(false);
      mainWindow.webContents.send("fullscreen-change", false);
    }
  });

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: "hidden",
    icon: iconPath,
    trafficLightPosition: { x: -100, y: -100 },
    fullscreenable: true,
    transparent: false,
    backgroundColor: "#040409",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: process.env.NODE_ENV === "development", // ← fixed
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
    mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
  }

  // ← REMOVED dom-ready DevTools opener

  ipcMain.on("win:minimize", () => mainWindow?.minimize());
  ipcMain.on("win:maximize", () => {
    if (!mainWindow) return;
    const isKiosk = mainWindow.isKiosk();
    mainWindow.setKiosk(!isKiosk);
    mainWindow.webContents.send("fullscreen-change", !isKiosk);
  });
  ipcMain.on("win:close", () => {
    app.quit();
  });

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
  app.quit(); // quit on all platforms including mac
});
