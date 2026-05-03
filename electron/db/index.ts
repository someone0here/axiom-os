import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrate";

let _db: Database.Database | null = null;

export function getDB(dataDir: string): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(dataDir, { recursive: true });

  // better-sqlite3 binary needs to come from unpacked asar
  const dbPath = path.join(dataDir, "vault.db");

  try {
    _db = new Database(dbPath);
  } catch (err) {
    // If native module fails, log clearly
    console.error("[DB] Failed to open database:", err);
    throw err;
  }

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.pragma("synchronous = NORMAL");

  runMigrations(_db);
  return _db;
}
