// electron/db/schema.ts
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS auth (
    id       INTEGER PRIMARY KEY,
    hash     TEXT NOT NULL,
    salt     TEXT NOT NULL,
    created  INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS notes (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    title_enc TEXT NOT NULL,         -- AES encrypted
    body_enc  TEXT NOT NULL,         -- AES encrypted
    folder    TEXT DEFAULT 'default',
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
    created   INTEGER DEFAULT (unixepoch()),
    updated   INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS files (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name_enc  TEXT NOT NULL,         -- original filename, encrypted
    mime      TEXT,
    size      INTEGER,
    path      TEXT NOT NULL,         -- path to .blob file in vault/
    folder    TEXT DEFAULT '/',
    created   INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS settings (
    key       TEXT PRIMARY KEY,
    value_enc TEXT NOT NULL
  );
`;
