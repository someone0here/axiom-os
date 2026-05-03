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

  registerAuthHandlers(DATA_DIR);
  registerNotesHandlers(DATA_DIR);
  registerPasswordHandlers(DATA_DIR);
  registerVaultHandlers(DATA_DIR);
  registerSettingsHandlers(DATA_DIR);
  registerProfileHandlers(DATA_DIR);
  registerSnapshotHandlers(DATA_DIR, () => store.key);
  registerSyncHandlers(DATA_DIR, () => store.key);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: -100, y: -100 },
    fullscreenable: true,
    transparent: false,
    backgroundColor: "#040409",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
  }

  mainWindow.webContents.on("dom-ready", () => {
    mainWindow!.webContents.openDevTools({ mode: "detach" });
  });

  ipcMain.on("win:minimize", () => mainWindow?.minimize());
  ipcMain.on("win:maximize", () =>
    mainWindow?.isMaximized()
      ? mainWindow.unmaximize()
      : mainWindow?.maximize(),
  );
  ipcMain.on("win:close", () => mainWindow?.close());

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
  if (process.platform !== "darwin") app.quit();
});
