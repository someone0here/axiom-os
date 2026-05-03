import { ipcMain } from "electron";
import { getDB } from "../db/index";
import { encrypt, decrypt } from "../crypto/aes";
import { store } from "../store";

export function registerNotesHandlers(dataDir: string) {
  const db = getDB(dataDir);

  ipcMain.handle("notes:list", async () => {
    console.log("[notes:list] auth:", store.isAuthenticated(), store.profileId);
    if (!store.isAuthenticated()) return [];
    const rows = db
      .prepare("SELECT * FROM notes WHERE profile=? ORDER BY updated DESC")
      .all(String(store.profileId)) as any[];
    return rows.map((r) => ({
      id: r.id,
      folder: r.folder,
      pinned: r.pinned === 1,
      tags: r.tags || "",
      updated: r.updated,
      created: r.created,
      title: decrypt(r.title_enc, store.key!),
      body: decrypt(r.body_enc, store.key!),
    }));
  });

  ipcMain.handle("notes:save", async (_e, note: any) => {
    console.log("[notes:save] auth:", store.isAuthenticated());
    if (!store.isAuthenticated()) return { error: "Not authenticated" };
    const titleEnc = encrypt(note.title || "Untitled", store.key!);
    const bodyEnc = encrypt(note.body || "", store.key!);
    const now = Math.floor(Date.now() / 1000);
    if (note.id) {
      db.prepare(
        "UPDATE notes SET title_enc=?,body_enc=?,folder=?,pinned=?,tags=?,updated=? WHERE id=? AND profile=?",
      ).run(
        titleEnc,
        bodyEnc,
        note.folder || "default",
        note.pinned ? 1 : 0,
        note.tags || "",
        now,
        note.id,
        String(store.profileId),
      );
      return { success: true, id: note.id };
    }
    const res = db
      .prepare(
        "INSERT INTO notes (title_enc,body_enc,folder,profile,pinned,tags,created,updated) VALUES (?,?,?,?,?,?,?,?)",
      )
      .run(
        titleEnc,
        bodyEnc,
        note.folder || "default",
        String(store.profileId),
        0,
        "",
        now,
        now,
      );
    return { success: true, id: Number(res.lastInsertRowid) };
  });

  ipcMain.handle("notes:delete", async (_e, id: number) => {
    if (!store.isAuthenticated()) return { error: "Not authenticated" };
    db.prepare("DELETE FROM notes WHERE id=? AND profile=?").run(
      id,
      String(store.profileId),
    );
    return { success: true };
  });
}
