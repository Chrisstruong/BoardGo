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
  date        TEXT    NOT NULL, -- ISO YYYY-MM-DD, compared as text
  amount      REAL    NOT NULL,
  description TEXT    NOT NULL,
  category_id INTEGER REFERENCES categories(id)
);

-- Indexes for the filter queries (issue #4)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date     ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
`;

export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

export function seed(db) {
  const cat = db.prepare('INSERT INTO categories (id, user_id, name) VALUES (?, ?, ?)');
  [
    [1, 1, 'Food'],
    [2, 1, 'Rent'],
    [3, 1, 'Transport'],
    [4, 2, 'Food'],
  ].forEach((row) => cat.run(...row));

  const tx = db.prepare(
    'INSERT INTO transactions (user_id, date, amount, description, category_id) VALUES (?, ?, ?, ?, ?)'
  );
  [
    [1, '2026-09-01', -1200, 'September rent', 2],
    [1, '2026-09-03', -12.5, 'Coffee and bagel', 1],
    [1, '2026-09-10', -45.2, 'Grocery store', 1],
    [1, '2026-09-15', -2.75, 'Bus fare', 3],
    [1, '2026-09-20', -60, 'Dinner with friends', 1],
    [1, '2026-10-01', -1200, 'October rent', 2],
    [2, '2026-09-05', -30, 'Coffee beans', 4],
  ].forEach((row) => tx.run(...row));
}
