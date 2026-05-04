import { ipcMain } from "electron";
import crypto from "crypto";
import { getDB } from "../db/index";
import { hashPassword, verifyPassword, deriveKey } from "../crypto/keyderive";
import { encrypt } from "../crypto/aes";
import { store } from "../store";
import * as bip39 from "bip39";

export function registerAuthHandlers(dataDir: string) {
  const db = getDB(dataDir);

  ipcMain.handle("auth:needs-setup", async () => {
    const row = db.prepare("SELECT COUNT(*) as c FROM profiles").get() as any;
    return { needsSetup: row.c === 0 };
  });

  // FIX: single auth:setup handler — generates & stores recovery phrase,
  // also stores a SHA-256 hash of the phrase for lookup during recovery
  ipcMain.handle("auth:setup", async (_e, password: string) => {
    const { hash, salt } = hashPassword(password);
    const key = deriveKey(password, Buffer.from(salt, "hex"));

    // Generate 12-word recovery phrase
    const phrase = bip39.generateMnemonic(128);

    // Store phrase ENCRYPTED with the password key
    const phraseEnc = encrypt(phrase, key);

    const nameEnc = encrypt("Main Profile", key);
    db.prepare(
      "INSERT INTO profiles (name_enc, hash, salt, is_decoy) VALUES (?,?,?,0)",
    ).run(nameEnc, hash, salt);

    const profileId = (
      db.prepare("SELECT last_insert_rowid() as id").get() as any
    ).id;

    // Store encrypted phrase (for potential future decryption)
    db.prepare(
      "INSERT INTO settings (key, profile, value_enc) VALUES (?,?,?)",
    ).run("recovery_phrase", String(profileId), phraseEnc);

    // FIX: also store a plain SHA-256 hash of the phrase so auth:recover
    // can find the right profile without needing to decrypt anything
    const phraseHash = crypto
      .createHash("sha256")
      .update(phrase.trim().toLowerCase())
      .digest("hex");
    db.prepare(
      "INSERT INTO settings (key, profile, value_enc) VALUES (?,?,?)",
    ).run("recovery_phrase_hash", String(profileId), phraseHash);

    // Return phrase ONCE — never again
    return { success: true, recoveryPhrase: phrase };
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

  // FIX: crypto is now imported — createHash will no longer throw ReferenceError
  ipcMain.handle(
    "auth:recover",
    async (_e, phrase: string, newPassword: string) => {
      const profiles = db.prepare("SELECT * FROM profiles").all() as any[];

      const phraseHash = crypto
        .createHash("sha256")
        .update(phrase.trim().toLowerCase())
        .digest("hex");

      for (const profile of profiles) {
        const stored = db
          .prepare("SELECT value_enc FROM settings WHERE key=? AND profile=?")
          .get("recovery_phrase_hash", String(profile.id)) as any;

        if (stored && stored.value_enc === phraseHash) {
          const { hash, salt } = hashPassword(newPassword);
          db.prepare("UPDATE profiles SET hash=?, salt=? WHERE id=?").run(
            hash,
            salt,
            profile.id,
          );
          return { success: true };
        }
      }
      return { success: false, error: "Recovery phrase not recognized" };
    },
  );

  ipcMain.handle("auth:logout", async () => {
    store.clearSession();
    return { success: true };
  });
}
