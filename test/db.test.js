import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../src/db.js';

function tempDbFile() {
  const dir = mkdtempSync(join(tmpdir(), 'boardgo-'));
  return join(dir, 'test.db');
}

test('openDb is idempotent — creating the schema twice does not throw', () => {
  const file = tempDbFile();
  openDb(file);
  assert.doesNotThrow(() => openDb(file));
});

test('inserting a transaction with all required fields round-trips', () => {
  const db = openDb();
  db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)').run(1, 'Food');
  db.prepare(
    'INSERT INTO transactions (user_id, date, category_id, vendor, amount) VALUES (?, ?, ?, ?, ?)'
  ).run(1, '2026-09-03', 1, 'Panera Bread', -12.5);

  const row = db.prepare('SELECT * FROM transactions WHERE vendor = ?').get('Panera Bread');
  assert.equal(row.user_id, 1);
  assert.equal(row.date, '2026-09-03');
  assert.equal(row.category_id, 1);
  assert.equal(row.amount, -12.5);
});

test('transactions.user_id is required', () => {
  const db = openDb();
  assert.throws(() =>
    db
      .prepare('INSERT INTO transactions (date, vendor, amount) VALUES (?, ?, ?)')
      .run('2026-09-03', 'Kroger', -10)
  );
});

test('transactions.date is required', () => {
  const db = openDb();
  assert.throws(() =>
    db
      .prepare('INSERT INTO transactions (user_id, vendor, amount) VALUES (?, ?, ?)')
      .run(1, 'Kroger', -10)
  );
});

test('transactions.vendor is required', () => {
  const db = openDb();
  assert.throws(() =>
    db
      .prepare('INSERT INTO transactions (user_id, date, amount) VALUES (?, ?, ?)')
      .run(1, '2026-09-03', -10)
  );
});

test('transactions.amount is required', () => {
  const db = openDb();
  assert.throws(() =>
    db
      .prepare('INSERT INTO transactions (user_id, date, vendor) VALUES (?, ?, ?)')
      .run(1, '2026-09-03', 'Kroger')
  );
});

test('transactions.category_id is nullable — uncategorized transactions are allowed', () => {
  const db = openDb();
  assert.doesNotThrow(() =>
    db
      .prepare('INSERT INTO transactions (user_id, date, vendor, amount) VALUES (?, ?, ?, ?)')
      .run(1, '2026-09-25', 'Venmo', 40.53)
  );
});

test('transactions.category_id enforces a foreign key to categories', () => {
  const db = openDb();
  assert.throws(() =>
    db
      .prepare(
        'INSERT INTO transactions (user_id, date, category_id, vendor, amount) VALUES (?, ?, ?, ?, ?)'
      )
      .run(1, '2026-09-03', 999, 'Kroger', -10)
  );
});

test('categories.user_id and name are required', () => {
  const db = openDb();
  assert.throws(() => db.prepare('INSERT INTO categories (name) VALUES (?)').run('Food'));
  assert.throws(() => db.prepare('INSERT INTO categories (user_id) VALUES (?)').run(1));
});

test('amount stores signed floats exactly, negative and positive', () => {
  const db = openDb();
  db.prepare('INSERT INTO transactions (user_id, date, vendor, amount) VALUES (?, ?, ?, ?)').run(
    1,
    '2026-09-01',
    'Rent Co',
    -1200.5
  );
  db.prepare('INSERT INTO transactions (user_id, date, vendor, amount) VALUES (?, ?, ?, ?)').run(
    1,
    '2026-09-02',
    'Refund',
    40.53
  );

  const rows = db.prepare('SELECT amount FROM transactions ORDER BY id').all();
  assert.equal(rows[0].amount, -1200.5);
  assert.equal(rows[1].amount, 40.53);
});
