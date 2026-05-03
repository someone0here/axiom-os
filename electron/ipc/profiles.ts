// electron/src/ipc/profiles.ts
import { getDB } from "../db/index";
import { hashPassword, verifyPassword, deriveKey } from "../crypto/keyderive";
import { encrypt, decrypt } from "../crypto/aes";
import type { IpcMainInvokeEvent } from "electron";
import { store } from "../store";
interface Profile {
  id: number;
  name: string;
  isDecoy: boolean;
  masterKey?: Buffer; // only in memory after unlock, never stored
}

// In-memory session
let activeProfile: Profile | null = null;
let masterKey: Buffer | null = null;

export function registerProfileHandlers(dataDir: string) {
  const { ipcMain } = require("electron");
  const db = getDB(dataDir);

  // Create a new profile
  ipcMain.handle(
    "profiles:create",
    async (
      _event: IpcMainInvokeEvent,
      name: string,
      password: string,
      isDecoy = false,
    ) => {
      const { hash, salt } = hashPassword(password);
      const mk = deriveKey(password, Buffer.from(salt, "hex"));
      const nameEnc = encrypt(name, mk);

      const result = db
        .prepare(
          `
      INSERT INTO profiles (name_enc, hash, salt, is_decoy) VALUES (?, ?, ?, ?)
    `,
        )
        .run(nameEnc, hash, salt, isDecoy ? 1 : 0);

      // Create default settings for this profile
      db.prepare(
        `
      INSERT OR IGNORE INTO settings (key, profile, value_enc) VALUES (?, ?, ?)
    `,
      ).run("wallpaper", String(result.lastInsertRowid), encrypt("0", mk));

      return { id: result.lastInsertRowid, name, isDecoy };
    },
  );

  // Login to a profile
  ipcMain.handle(
    "profiles:login",
    async (_event: IpcMainInvokeEvent, profileId: number, password: string) => {
      const profile = db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .get(profileId) as any;
      if (!profile) return { success: false, error: "Profile not found" };

      const key = verifyPassword(password, profile.hash, profile.salt);
      if (!key) return { success: false, error: "Incorrect password" };

      // Decrypt name
      const name = decrypt(profile.name_enc, key);

      masterKey = key;
      activeProfile = { id: profileId, name, isDecoy: profile.is_decoy === 1 };

      store.setSession(key, Number(profileId));

      return {
        success: true,
        profile: { id: profileId, name, isDecoy: activeProfile.isDecoy },
      };
    },
  );

  // List all profiles (names are encrypted — decrypt with each profile's key during login)
  // We show profile names publicly so user can pick which to log into
  // BUT: we store an unencrypted display label separately for the profile picker
  ipcMain.handle("profiles:list", async () => {
    // We return minimal info — just id and a placeholder, real name revealed after login
    const rows = db.prepare("SELECT id, is_decoy FROM profiles").all() as any[];
    return rows.map((r, i) => ({
      id: r.id,
      label: `Profile ${i + 1}`, // generic label before auth
      isDecoy: r.is_decoy === 1,
    }));
  });

  // Get active profile info
  ipcMain.handle("profiles:active", async () => {
    if (!activeProfile) return null;
    return {
      id: activeProfile.id,
      name: activeProfile.name,
      isDecoy: activeProfile.isDecoy,
    };
  });

  // Switch profile (lock current, show profile selector)
  ipcMain.handle("profiles:lock", async () => {
    masterKey = null;
    activeProfile = null;
    return { success: true };
  });

  // Delete a profile and ALL its data
  ipcMain.handle(
    "profiles:delete",
    async (_event: IpcMainInvokeEvent, profileId: number, password: string) => {
      const profile = db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .get(profileId) as any;
      if (!verifyPassword(password, profile.hash, profile.salt)) {
        return { success: false, error: "Wrong password" };
      }

      // Delete all data for this profile
      db.prepare("DELETE FROM notes WHERE profile = ?").run(String(profileId));
      db.prepare("DELETE FROM passwords WHERE profile = ?").run(
        String(profileId),
      );
      db.prepare("DELETE FROM vault_files WHERE profile = ?").run(
        String(profileId),
      );
      db.prepare("DELETE FROM settings WHERE profile = ?").run(
        String(profileId),
      );
      db.prepare("DELETE FROM profiles WHERE id = ?").run(profileId);

      return { success: true };
    },
  );

  // Expose masterKey getter for other IPC handlers
  return {
    getMasterKey: () => masterKey,
    getActiveProfile: () => activeProfile,
  };
}
