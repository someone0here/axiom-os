// electron/src/db/migrate.ts
import Database from "better-sqlite3";

// Each migration runs ONCE ever, tracked by version number in the db itself
const MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS auth (
        id       INTEGER PRIMARY KEY,
        hash     TEXT NOT NULL,
        salt     TEXT NOT NULL,
        created  INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS notes (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        title_enc TEXT NOT NULL,
        body_enc  TEXT NOT NULL,
        folder    TEXT DEFAULT 'default',
        profile   TEXT DEFAULT 'main',
        pinned    INTEGER DEFAULT 0,
        created   INTEGER DEFAULT (unixepoch()),
        updated   INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS passwords (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        site_enc  TEXT NOT NULL,
        user_enc  TEXT NOT NULL,
        pass_enc  TEXT NOT NULL,
        notes_enc TEXT,
        tags      TEXT,
        profile   TEXT DEFAULT 'main',
        created   INTEGER DEFAULT (unixepoch()),
        updated   INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS vault_files (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name_enc  TEXT NOT NULL,
        mime      TEXT,
        size      INTEGER,
        blob_path TEXT NOT NULL,
        folder    TEXT DEFAULT '/',
        profile   TEXT DEFAULT 'main',
        created   INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS profiles (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name_enc  TEXT NOT NULL,
        hash      TEXT NOT NULL,
        salt      TEXT NOT NULL,
        is_decoy  INTEGER DEFAULT 0,
        created   INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS settings (
        key       TEXT NOT NULL,
        profile   TEXT DEFAULT 'main',
        value_enc TEXT NOT NULL,
        PRIMARY KEY (key, profile)
      );
      CREATE TABLE IF NOT EXISTS snapshots (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        label_enc TEXT NOT NULL,
        path      TEXT NOT NULL,
        size      INTEGER,
        created   INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        name    TEXT,
        applied INTEGER DEFAULT (unixepoch())
      );
    `,
  },
  {
    version: 2,
    name: "add_note_tags",
    sql: `ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT '';`,
  },
  {
    version: 3,
    name: "add_file_thumbnails",
    sql: `ALTER TABLE vault_files ADD COLUMN thumb_enc TEXT;`,
  },
  // Add future migrations here — never edit old ones
];

export function runMigrations(db: Database.Database): void {
  // Create version tracker if it doesn't exist yet
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name    TEXT,
      applied INTEGER DEFAULT (unixepoch())
    );
  `);

  const applied = db
    .prepare("SELECT version FROM schema_version")
    .all()
    .map((r: any) => r.version as number);

  for (const migration of MIGRATIONS) {
    if (applied.includes(migration.version)) continue; // already done, skip

    console.log(
      `[DB] Running migration ${migration.version}: ${migration.name}`,
    );
    db.exec(migration.sql);
    db.prepare("INSERT INTO schema_version (version, name) VALUES (?, ?)").run(
      migration.version,
      migration.name,
    );
    console.log(`[DB] Migration ${migration.version} complete`);
  }
}
