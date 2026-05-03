// electron/src/ipc/snapshots.ts
import fs from "fs";
import path from "path";
import { getDB } from "../db/index";
import { encrypt, decrypt } from "../crypto/aes";
import archiver from "archiver"; // npm install archiver
import AdmZip from "adm-zip"; // npm install adm-zip
import type { IpcMainInvokeEvent } from "electron";
export function registerSnapshotHandlers(
  dataDir: string,
  getMasterKey: () => Buffer | null,
) {
  const { ipcMain } = require("electron");
  const db = getDB(dataDir);
  const snapshotsDir = path.join(dataDir, "snapshots");
  fs.mkdirSync(snapshotsDir, { recursive: true });

  // Create snapshot
  ipcMain.handle(
    "snapshots:create",
    async (_event: IpcMainInvokeEvent, label: string) => {
      const key = getMasterKey();
      if (!key) return { error: "Not authenticated" };

      const timestamp = Date.now();
      const filename = `snapshot-${timestamp}.zip`;
      const snapPath = path.join(snapshotsDir, filename);

      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(snapPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.file(path.join(dataDir, "vault.db"), { name: "vault.db" });
        archive.directory(path.join(dataDir, "vault"), "vault"); // encrypted blobs
        archive.finalize();

        output.on("close", resolve);
        archive.on("error", reject);
      });

      const stats = fs.statSync(snapPath);
      const labelEnc = encrypt(
        label || `Snapshot ${new Date().toLocaleString()}`,
        key,
      );

      db.prepare(
        "INSERT INTO snapshots (label_enc, path, size) VALUES (?, ?, ?)",
      ).run(labelEnc, filename, stats.size);

      return { success: true, size: stats.size };
    },
  );

  // List snapshots
  ipcMain.handle("snapshots:list", async () => {
    const key = getMasterKey();
    if (!key) return { error: "Not authenticated" };

    const rows = db
      .prepare("SELECT * FROM snapshots ORDER BY created DESC")
      .all() as any[];
    return rows.map((r) => ({
      id: r.id,
      label: decrypt(r.label_enc, key),
      size: r.size,
      created: r.created,
      path: r.path,
    }));
  });

  // Restore snapshot
  ipcMain.handle(
    "snapshots:restore",
    async (_event: IpcMainInvokeEvent, snapshotId: number) => {
      const key = getMasterKey();
      if (!key) return { error: "Not authenticated" };

      const snap = db
        .prepare("SELECT * FROM snapshots WHERE id = ?")
        .get(snapshotId) as any;
      if (!snap) return { error: "Snapshot not found" };

      const snapPath = path.join(snapshotsDir, snap.path);
      if (!fs.existsSync(snapPath)) return { error: "Snapshot file missing" };

      // Backup current state before restoring
      const backupPath = path.join(
        snapshotsDir,
        `pre-restore-${Date.now()}.zip`,
      );
      fs.copyFileSync(path.join(dataDir, "vault.db"), backupPath);

      // Extract snapshot
      const zip = new AdmZip(snapPath);
      zip.extractAllTo(dataDir, true); // overwrites current data

      return { success: true };
    },
  );

  // Delete snapshot
  ipcMain.handle(
    "snapshots:delete",
    async (_event: IpcMainInvokeEvent, snapshotId: number) => {
      const snap = db
        .prepare("SELECT * FROM snapshots WHERE id = ?")
        .get(snapshotId) as any;
      if (snap) {
        const fullPath = path.join(snapshotsDir, snap.path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        db.prepare("DELETE FROM snapshots WHERE id = ?").run(snapshotId);
      }
      return { success: true };
    },
  );

  // Auto-snapshot on startup (keep last 7)
  ipcMain.handle("snapshots:auto", async () => {
    const key = getMasterKey();
    if (!key) return;

    const labelEnc = encrypt(`Auto - ${new Date().toLocaleString()}`, key);
    const filename = `auto-${Date.now()}.zip`;
    const snapPath = path.join(snapshotsDir, filename);

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(snapPath);
      const archive = archiver("zip", { zlib: { level: 6 } });
      archive.pipe(output);
      archive.file(path.join(dataDir, "vault.db"), { name: "vault.db" });
      archive.directory(path.join(dataDir, "vault"), "vault");
      archive.finalize();
      output.on("close", resolve);
      archive.on("error", reject);
    });

    const stats = fs.statSync(snapPath);
    db.prepare(
      "INSERT INTO snapshots (label_enc, path, size) VALUES (?, ?, ?)",
    ).run(labelEnc, filename, stats.size);

    // Prune: keep only 7 auto snapshots
    const autos = db
      .prepare(
        `SELECT id, path FROM snapshots WHERE label_enc LIKE 'auto-%' ORDER BY created DESC`,
      )
      .all() as any[];
    autos.slice(7).forEach((s: any) => {
      const fp = path.join(snapshotsDir, s.path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      db.prepare("DELETE FROM snapshots WHERE id = ?").run(s.id);
    });
  });
}
