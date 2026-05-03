// electron/src/ipc/sync.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import AdmZip from "adm-zip";
import archiver from "archiver";
import { encrypt, decrypt } from "../crypto/aes";
import type { IpcMainInvokeEvent } from "electron";
// Export: pack everything into a single encrypted .axiom file
export function registerSyncHandlers(
  dataDir: string,
  getMasterKey: () => Buffer | null,
) {
  const { ipcMain, dialog, app } = require("electron");

  ipcMain.handle("sync:export", async () => {
    const key = getMasterKey();
    if (!key) return { error: "Not authenticated" };

    // Ask user where to save
    const { filePath } = await dialog.showSaveDialog({
      title: "Export AXIOM Vault",
      defaultPath: `axiom-backup-${Date.now()}.axiom`,
      filters: [{ name: "AXIOM Vault", extensions: ["axiom"] }],
    });
    if (!filePath) return { cancelled: true };

    // Create a zip in memory
    const tmpZip = path.join(
      app.getPath("temp"),
      `axiom-export-${Date.now()}.zip`,
    );

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(tmpZip);
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.pipe(output);
      archive.file(path.join(dataDir, "vault.db"), { name: "vault.db" });
      if (fs.existsSync(path.join(dataDir, "vault"))) {
        archive.directory(path.join(dataDir, "vault"), "vault");
      }
      archive.finalize();
      output.on("close", resolve);
      archive.on("error", reject);
    });

    // Encrypt the zip with AES-256-GCM, wrapped in AXIOM header
    const zipData = fs.readFileSync(tmpZip);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(zipData), cipher.final()]);
    const tag = cipher.getAuthTag();

    // .axiom file format:
    // [4 bytes magic: 0x4158494F] [16 bytes IV] [16 bytes auth tag] [N bytes encrypted zip]
    const magic = Buffer.from([0x41, 0x58, 0x49, 0x4f]); // "AXIO"
    const final = Buffer.concat([magic, iv, tag, encrypted]);
    fs.writeFileSync(filePath, final);

    // Clean up temp file
    fs.unlinkSync(tmpZip);

    return { success: true, size: final.length, path: filePath };
  });

  ipcMain.handle("sync:import", async () => {
    const key = getMasterKey();
    if (!key) return { error: "Not authenticated" };

    const { filePaths } = await dialog.showOpenDialog({
      title: "Import AXIOM Vault",
      filters: [{ name: "AXIOM Vault", extensions: ["axiom"] }],
      properties: ["openFile"],
    });
    if (!filePaths.length) return { cancelled: true };

    const raw = fs.readFileSync(filePaths[0]);

    // Validate magic header
    const magic = raw.subarray(0, 4);
    if (!magic.equals(Buffer.from([0x41, 0x58, 0x49, 0x4f]))) {
      return { error: "Invalid .axiom file" };
    }

    // Decrypt
    const iv = raw.subarray(4, 20);
    const tag = raw.subarray(20, 36);
    const encData = raw.subarray(36);

    let zipData: Buffer;
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      zipData = Buffer.concat([decipher.update(encData), decipher.final()]);
    } catch {
      return { error: "Decryption failed — wrong password or corrupted file" };
    }

    // Backup current data before overwriting
    const backupPath = path.join(
      dataDir,
      "snapshots",
      `pre-import-${Date.now()}.zip`,
    );
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    if (fs.existsSync(path.join(dataDir, "vault.db"))) {
      fs.copyFileSync(path.join(dataDir, "vault.db"), backupPath + ".db.bak");
    }

    // Extract
    const tmpZip = path.join(
      app.getPath("temp"),
      `axiom-import-${Date.now()}.zip`,
    );
    fs.writeFileSync(tmpZip, zipData);
    const zip = new AdmZip(tmpZip);
    zip.extractAllTo(dataDir, true);
    fs.unlinkSync(tmpZip);

    return { success: true };
  });

  // Quick diff: compare local vs imported (non-destructive preview)
  ipcMain.handle(
    "sync:preview",
    async (_event: IpcMainInvokeEvent, axiomFilePath: string) => {
      const key = getMasterKey();
      if (!key) return { error: "Not authenticated" };

      // Read .axiom file, decrypt, peek at note/file counts without merging
      const raw = fs.readFileSync(axiomFilePath);
      const iv = raw.subarray(4, 20);
      const tag = raw.subarray(20, 36);
      const encData = raw.subarray(36);

      let zipData: Buffer;
      try {
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        zipData = Buffer.concat([decipher.update(encData), decipher.final()]);
      } catch {
        return { error: "Cannot decrypt — wrong password" };
      }

      const tmpDir = path.join(
        app.getPath("temp"),
        `axiom-preview-${Date.now()}`,
      );
      fs.mkdirSync(tmpDir);
      const tmpZip = path.join(tmpDir, "preview.zip");
      fs.writeFileSync(tmpZip, zipData);
      const zip = new AdmZip(tmpZip);
      zip.extractAllTo(tmpDir, true);

      // Open the extracted db and count records
      const Database = require("better-sqlite3");
      const previewDb = new Database(path.join(tmpDir, "vault.db"), {
        readonly: true,
      });
      const noteCount = (
        previewDb.prepare("SELECT COUNT(*) as c FROM notes").get() as any
      ).c;
      const passCount = (
        previewDb.prepare("SELECT COUNT(*) as c FROM passwords").get() as any
      ).c;
      const fileCount = (
        previewDb.prepare("SELECT COUNT(*) as c FROM vault_files").get() as any
      ).c;
      previewDb.close();

      // Clean up
      fs.rmSync(tmpDir, { recursive: true });

      return { noteCount, passCount, fileCount };
    },
  );
}
