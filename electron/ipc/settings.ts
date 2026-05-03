import { ipcMain } from "electron";
import { getDB } from "../db/index";
import { encrypt, decrypt } from "../crypto/aes";
import { store } from "../store";

export function registerSettingsHandlers(dataDir: string) {
  const db = getDB(dataDir);

  ipcMain.handle("settings:get", async (_e, key: string) => {
    if (!store.isAuthenticated()) return null;
    const row = db
      .prepare("SELECT value_enc FROM settings WHERE key=? AND profile=?")
      .get(key, String(store.profileId)) as any;
    if (!row) return null;
    try {
      return decrypt(row.value_enc, store.key!);
    } catch {
      return null;
    }
  });

  ipcMain.handle("settings:set", async (_e, key: string, value: any) => {
    if (!store.isAuthenticated()) return { error: "Not authenticated" };
    const enc = encrypt(String(value), store.key!);
    db.prepare(
      "INSERT OR REPLACE INTO settings (key,profile,value_enc) VALUES (?,?,?)",
    ).run(key, String(store.profileId), enc);
    return { success: true };
  });
}
