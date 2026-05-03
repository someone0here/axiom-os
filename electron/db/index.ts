// electron/src/db/index.ts  ← called once at startup in main.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { runMigrations } from "./migrate";

let _db: Database.Database | null = null;

export function getDB(dataDir: string): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(dataDir, { recursive: true }); // create data/ folder if missing
  _db = new Database(path.join(dataDir, "vault.db"));

  // Performance + safety settings
  _db.pragma("journal_mode = WAL"); // faster writes
  _db.pragma("foreign_keys = ON");
  _db.pragma("synchronous = NORMAL");

  runMigrations(_db); // ← runs here, on every launch, only applies what's new

  return _db;
}
