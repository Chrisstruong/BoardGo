import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  date        TEXT    NOT NULL, -- ISO YYYY-MM-DD so ranges compare correctly as text; display layer formats as MM/DD/YYYY
  category_id INTEGER REFERENCES categories(id),
  vendor      TEXT    NOT NULL,
  amount      REAL    NOT NULL -- negative = spent, positive = added
);
`;

export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
