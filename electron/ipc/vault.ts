import { ipcMain } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDB } from "../db/index";
import { encrypt, decrypt } from "../crypto/aes";
import { secureDelete } from "../crypto/secureDelete";
import { store } from "../store";

function getMime(name: string): string {
  const e = name.split(".").pop()?.toLowerCase() || "";
  const m: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };
  return m[e] || "application/octet-stream";
}

export function registerVaultHandlers(dataDir: string) {
  const db = getDB(dataDir);
  const vaultDir = path.join(dataDir, "vault");
  fs.mkdirSync(vaultDir, { recursive: true });

  ipcMain.handle("files:list", async (_e, folder: string = "/") => {
    if (!store.isAuthenticated()) return [];
    const rows = db
      .prepare(
        "SELECT * FROM vault_files WHERE profile=? AND folder=? ORDER BY created DESC",
      )
      .all(String(store.profileId), folder) as any[];
    return rows.map((r) => ({
      id: r.id,
      mime: r.mime,
      size: r.size,
      folder: r.folder,
      created: r.created,
      name: decrypt(r.name_enc, store.key!),
    }));
  });

  ipcMain.handle(
    "files:upload",
    async (_e, fileBuffer: ArrayBuffer, name: string, folder = "/") => {
      if (!store.isAuthenticated()) return { error: "Not authenticated" };
      const buf = Buffer.from(fileBuffer);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-gcm", store.key!, iv);
      const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
      const tag = cipher.getAuthTag();
      const blob = Buffer.concat([iv, tag, enc]);
      const blobName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.blob`;
      fs.writeFileSync(path.join(vaultDir, blobName), blob);
      const nameEnc = encrypt(name, store.key!);
      const res = db
        .prepare(
          "INSERT INTO vault_files (name_enc,mime,size,blob_path,folder,profile) VALUES (?,?,?,?,?,?)",
        )
        .run(
          nameEnc,
          getMime(name),
          buf.length,
          blobName,
          folder,
          String(store.profileId),
        );
      return { success: true, id: Number(res.lastInsertRowid) };
    },
  );

  ipcMain.handle("files:read", async (_e, id: number) => {
    if (!store.isAuthenticated()) return { error: "Not authenticated" };
    const row = db
      .prepare("SELECT * FROM vault_files WHERE id=? AND profile=?")
      .get(id, String(store.profileId)) as any;
    if (!row) return { error: "File not found" };
    const blobPath = path.join(vaultDir, row.blob_path);
    if (!fs.existsSync(blobPath)) return { error: "File missing" };
    const blob = fs.readFileSync(blobPath);
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      store.key!,
      blob.subarray(0, 16),
    );
    decipher.setAuthTag(blob.subarray(16, 32));
    const dec = Buffer.concat([
      decipher.update(blob.subarray(32)),
      decipher.final(),
    ]);
    return {
      success: true,
      data: dec.toString("base64"),
      mime: row.mime,
      name: decrypt(row.name_enc, store.key!),
    };
  });

  ipcMain.handle("files:delete", async (_e, id: number) => {
    if (!store.isAuthenticated()) return { error: "Not authenticated" };
    const row = db
      .prepare("SELECT * FROM vault_files WHERE id=? AND profile=?")
      .get(id, String(store.profileId)) as any;
    if (row) {
      const fp = path.join(vaultDir, row.blob_path);
      if (fs.existsSync(fp)) secureDelete(fp);
      db.prepare("DELETE FROM vault_files WHERE id=?").run(id);
    }
    return { success: true };
  });
}
