import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("axiom", {
  authNeedsSetup: () => ipcRenderer.invoke("auth:needs-setup"),
  authSetup: (password: string) => ipcRenderer.invoke("auth:setup", password),
  authRecover: (phrase: string, newPassword: string) =>
    ipcRenderer.invoke("auth:recover", phrase, newPassword),
  authLogin: (profileId: number, password: string) =>
    ipcRenderer.invoke("auth:login", profileId, password),
  authLogout: () => ipcRenderer.invoke("auth:logout"),

  profilesList: () => ipcRenderer.invoke("profiles:list"),
  profilesCreate: (name: string, password: string, isDecoy?: boolean) =>
    ipcRenderer.invoke("profiles:create", name, password, isDecoy),
  profilesLock: () => ipcRenderer.invoke("profiles:lock"),
  profilesDelete: (id: number, password: string) =>
    ipcRenderer.invoke("profiles:delete", id, password),

  notesList: () => ipcRenderer.invoke("notes:list"),
  notesSave: (note: any) => ipcRenderer.invoke("notes:save", note),
  notesDelete: (id: number) => ipcRenderer.invoke("notes:delete", id),

  vaultList: () => ipcRenderer.invoke("vault:list"),
  vaultSave: (entry: any) => ipcRenderer.invoke("vault:save", entry),
  vaultDelete: (id: number) => ipcRenderer.invoke("vault:delete", id),

  filesList: (folder: string) => ipcRenderer.invoke("files:list", folder),
  filesUpload: (buffer: ArrayBuffer, name: string, folder: string) =>
    ipcRenderer.invoke("files:upload", buffer, name, folder),
  filesRead: (id: number) => ipcRenderer.invoke("files:read", id),
  filesDelete: (id: number) => ipcRenderer.invoke("files:delete", id),

  settingsGet: (key: string) => ipcRenderer.invoke("settings:get", key),
  settingsSet: (key: string, value: any) =>
    ipcRenderer.invoke("settings:set", key, value),

  snapshotsCreate: (label: string) =>
    ipcRenderer.invoke("snapshots:create", label),
  snapshotsList: () => ipcRenderer.invoke("snapshots:list"),
  snapshotsRestore: (id: number) => ipcRenderer.invoke("snapshots:restore", id),
  snapshotsDelete: (id: number) => ipcRenderer.invoke("snapshots:delete", id),

  syncExport: () => ipcRenderer.invoke("sync:export"),
  syncImport: () => ipcRenderer.invoke("sync:import"),

  winMinimize: () => ipcRenderer.send("win:minimize"),
  winMaximize: () => ipcRenderer.send("win:maximize"),
  winClose: () => ipcRenderer.send("win:close"),

  onForceLock: (cb: () => void) => ipcRenderer.on("force-lock", cb),
});
