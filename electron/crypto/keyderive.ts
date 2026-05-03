// electron/crypto/keyderive.ts
import { scryptSync, randomBytes } from "crypto";

export function deriveKey(password: string, salt: Buffer): Buffer {
  // scrypt: memory-hard, brute-force resistant
  return scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(32);
  const key = deriveKey(password, salt);
  return { hash: key.toString("hex"), salt: salt.toString("hex") };
}

export function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): Buffer | null {
  const salt = Buffer.from(storedSalt, "hex");
  const derived = deriveKey(password, salt);
  if (derived.toString("hex") !== storedHash) return null;
  return derived; // return as master key on success — never store this, keep in memory only
}
