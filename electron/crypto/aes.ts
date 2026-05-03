// electron/crypto/aes.ts
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGO = "aes-256-gcm";

export function encrypt(plaintext: string, masterKey: Buffer): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, masterKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // authentication tag — prevents tampering

  // iv + tag + ciphertext, base64-encoded
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string, masterKey: Buffer): string {
  const buf = Buffer.from(ciphertext, "base64");
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const data = buf.subarray(32);

  const decipher = createDecipheriv(ALGO, masterKey, iv);
  decipher.setAuthTag(tag); // verify integrity before decrypting
  return decipher.update(data) + decipher.final("utf8");
}
