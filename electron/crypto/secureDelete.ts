// electron/src/crypto/secureDelete.ts
import fs from "fs";

export function secureDelete(filePath: string): void {
  const stats = fs.statSync(filePath);
  const size = stats.size;
  const fd = fs.openSync(filePath, "r+");

  // Three-pass overwrite (DoD 5220.22-M standard)
  for (const pattern of [0x00, 0xff, Math.floor(Math.random() * 256)]) {
    const buf = Buffer.alloc(size, pattern);
    fs.writeSync(fd, buf, 0, size, 0);
    fs.fsyncSync(fd); // flush to disk — not just OS buffer
  }

  fs.closeSync(fd);
  fs.unlinkSync(filePath);
}
