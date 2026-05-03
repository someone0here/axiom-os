import { ipcMain } from "electron";
import { getDB } from "../db/index";
import { encrypt, decrypt } from "../crypto/aes";
import { store } from "../store";

export function registerPasswordHandlers(dataDir: string) {
  const db = getDB(dataDir);

  ipcMain.handle("vault:list", async () => {
    if (!store.isAuthenticated()) return [];
    const rows = db
      .prepare("SELECT * FROM passwords WHERE profile=? ORDER BY updated DESC")
      .all(String(store.profileId)) as any[];
    return rows.map((r) => ({
      id: r.id,
      tags: r.tags || "",
      site: decrypt(r.site_enc, store.key!),
      username: decrypt(r.user_enc, store.key!),
      password: decrypt(r.pass_enc, store.key!),
      notes: r.notes_enc ? decrypt(r.notes_enc, store.key!) : "",
    }));
  });

  ipcMain.handle("vault:save", async (_e, entry: any) => {
    if (!store.isAuthenticated()) return { error: "Not authenticated" };
    const now = Math.floor(Date.now() / 1000);
    const s = encrypt(entry.site || "", store.key!);
    const u = encrypt(entry.username || "", store.key!);
    const p = encrypt(entry.password || "", store.key!);
    const n = encrypt(entry.notes || "", store.key!);
    if (entry.id) {
      db.prepare(
        "UPDATE passwords SET site_enc=?,user_enc=?,pass_enc=?,notes_enc=?,tags=?,updated=? WHERE id=? AND profile=?",
      ).run(
        s,
        u,
        p,
        n,
        entry.tags || "",
        now,
        entry.id,
        String(store.profileId),
      );
      return { success: true, id: entry.id };
    }
    const res = db
      .prepare(
        "INSERT INTO passwords (site_enc,user_enc,pass_enc,notes_enc,tags,profile,created,updated) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(s, u, p, n, entry.tags || "", String(store.profileId), now, now);
    return { success: true, id: Number(res.lastInsertRowid) };
  });

  ipcMain.handle("vault:delete", async (_e, id: number) => {
    if (!store.isAuthenticated()) return { error: "Not authenticated" };
    db.prepare("DELETE FROM passwords WHERE id=? AND profile=?").run(
      id,
      String(store.profileId),
    );
    return { success: true };
  });
}
