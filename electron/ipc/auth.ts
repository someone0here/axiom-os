import { ipcMain } from "electron";
import { getDB } from "../db/index";
import { hashPassword, verifyPassword, deriveKey } from "../crypto/keyderive";
import { encrypt } from "../crypto/aes";
import { store } from "../store";

export function registerAuthHandlers(dataDir: string) {
  const db = getDB(dataDir);

  ipcMain.handle("auth:needs-setup", async () => {
    const row = db.prepare("SELECT COUNT(*) as c FROM profiles").get() as any;
    return { needsSetup: row.c === 0 };
  });

  ipcMain.handle("auth:setup", async (_e, password: string) => {
    const { hash, salt } = hashPassword(password);
    const key = deriveKey(password, Buffer.from(salt, "hex"));
    const nameEnc = encrypt("Main Profile", key);
    db.prepare(
      "INSERT INTO profiles (name_enc, hash, salt, is_decoy) VALUES (?,?,?,0)",
    ).run(nameEnc, hash, salt);
    return { success: true };
  });

  ipcMain.handle(
    "auth:login",
    async (_e, profileId: number, password: string) => {
      const profile = db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .get(profileId) as any;
      if (!profile) return { success: false, error: "Profile not found" };
      const key = verifyPassword(password, profile.hash, profile.salt);
      if (!key) return { success: false, error: "Incorrect password" };
      store.setSession(key, Number(profile.id));
      console.log("[auth:login] success, profileId:", store.profileId);
      return { success: true };
    },
  );

  ipcMain.handle("auth:logout", async () => {
    store.clearSession();
    return { success: true };
  });
}
