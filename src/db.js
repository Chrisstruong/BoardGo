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
  vendor      TEXT    NOT NULL, -- e.g. Panera Bread
  amount      REAL    NOT NULL, -- negative = spent, positive = added
  description TEXT              -- optional free-text note; searched by findTransactions
);

-- Indexes for the filter queries (issue #4)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date     ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category_id);
`;

export function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
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
    'INSERT INTO transactions (user_id, date, vendor, amount, description, category_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  [
    [1, '2026-09-01', 'Oak Street Apartments', -1200, 'September rent', 2],
    [1, '2026-09-03', 'Panera Bread', -12.5, 'Coffee and bagel', 1],
    [1, '2026-09-10', 'Kroger', -45.2, 'Grocery store', 1],
    [1, '2026-09-15', 'UTS Transit', -2.75, 'Bus fare', 3],
    [1, '2026-09-20', 'Mellow Mushroom', -60, 'Dinner with friends', 1],
    [1, '2026-09-25', 'Venmo', 40.53, 'Refund from roommate', null],
    [1, '2026-10-01', 'Oak Street Apartments', -1200, 'October rent', 2],
    [2, '2026-09-05', 'Starbucks', -30, 'Coffee beans', 4],
  ].forEach((row) => tx.run(...row));
}
