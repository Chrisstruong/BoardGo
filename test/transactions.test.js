import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, seed } from '../src/db.js';
import { findTransactions } from '../src/transactions.js';

function setup() {
  const db = openDb();
  seed(db);
  return db;
}

const descriptions = (rows) => rows.map((r) => r.description);

test('no filters returns all of the user\'s transactions, newest first', () => {
  const rows = findTransactions(setup(), 1);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].description, 'October rent');
  assert.equal(rows.at(-1).description, 'September rent');
});

test('date range is inclusive on both ends', () => {
  const rows = findTransactions(setup(), 1, { startDate: '2026-09-03', endDate: '2026-09-15' });
  assert.deepEqual(descriptions(rows), ['Bus fare', 'Grocery store', 'Coffee and bagel']);
});

test('open-ended ranges work', () => {
  const db = setup();
  assert.equal(findTransactions(db, 1, { startDate: '2026-09-20' }).length, 3);
  assert.equal(findTransactions(db, 1, { endDate: '2026-09-01' }).length, 1);
});

test('category filter', () => {
  const rows = findTransactions(setup(), 1, { category: 1 });
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.categoryName === 'Food'));
});

test('keyword search is case-insensitive substring match', () => {
  assert.deepEqual(descriptions(findTransactions(setup(), 1, { q: 'RENT' })), ['October rent', 'September rent']);
});

test('keyword with typo or no match returns nothing', () => {
  assert.equal(findTransactions(setup(), 1, { q: 'rnet' }).length, 0);
});

test('blank keyword is ignored', () => {
  assert.equal(findTransactions(setup(), 1, { q: '   ' }).length, 7);
});

test('all filters combine with AND', () => {
  const rows = findTransactions(setup(), 1, {
    startDate: '2026-09-05',
    endDate: '2026-09-30',
    category: 1,
    q: 'dinner',
  });
  assert.deepEqual(descriptions(rows), ['Dinner with friends']);
});

test('never returns another user\'s transactions', () => {
  const db = setup();
  assert.ok(!descriptions(findTransactions(db, 1, { q: 'coffee' })).includes('Coffee beans'));
  assert.equal(findTransactions(db, 1, { category: 4 }).length, 0);
});

test('LIKE wildcards and injection-style input are matched literally', () => {
  const db = setup();
  assert.equal(findTransactions(db, 1, { q: '%' }).length, 0);
  assert.equal(findTransactions(db, 1, { q: '_' }).length, 0);
  assert.equal(findTransactions(db, 1, { q: "' OR 1=1 --" }).length, 0);
});

test('keyword also matches vendor name', () => {
  assert.deepEqual(descriptions(findTransactions(setup(), 1, { q: 'panera' })), ['Coffee and bagel']);
});

test('rows include vendor and signed amount', () => {
  const refund = findTransactions(setup(), 1, { q: 'refund' })[0];
  assert.equal(refund.vendor, 'Venmo');
  assert.equal(refund.amount, 40.53);
  assert.equal(refund.categoryName, null);
});
