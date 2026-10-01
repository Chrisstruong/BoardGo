import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, seed } from '../src/db.js';
import { getTransactions, parseTransactionFilters } from '../src/api/transactions.js';

function setup() {
  const db = openDb();
  seed(db);
  return db;
}

const vendors = (rows) => rows.map((r) => r.vendor);

test('no params returns all of the user\'s transactions, newest first', () => {
  const { status, body } = getTransactions(setup(), 1, {});
  assert.equal(status, 200);
  assert.equal(body.total, 7);
  assert.equal(body.transactions[0].vendor, 'Oak Street Apartments');
});

test('startDate alone', () => {
  const { body } = getTransactions(setup(), 1, { startDate: '2026-09-20' });
  assert.equal(body.total, 3);
});

test('endDate alone', () => {
  const { body } = getTransactions(setup(), 1, { endDate: '2026-09-01' });
  assert.equal(body.total, 1);
});

test('startDate and endDate combined is inclusive on both ends', () => {
  const { body } = getTransactions(setup(), 1, { startDate: '2026-09-03', endDate: '2026-09-15' });
  assert.deepEqual(vendors(body.transactions), ['UTS Transit', 'Kroger', 'Panera Bread']);
});

test('category alone', () => {
  const { body } = getTransactions(setup(), 1, { category: '1' });
  assert.equal(body.total, 3);
});

test('q alone', () => {
  const { body } = getTransactions(setup(), 1, { q: 'panera' });
  assert.equal(body.total, 1);
});

test('all filters combine with AND', () => {
  const { body } = getTransactions(setup(), 1, {
    startDate: '2026-09-05',
    endDate: '2026-09-30',
    category: '1',
    q: 'dinner',
  });
  assert.deepEqual(vendors(body.transactions), ['Mellow Mushroom']);
});

test('no params means current behavior — all transactions', () => {
  const { body } = getTransactions(setup(), 1, {});
  assert.equal(body.total, 7);
});

test('invalid date format returns 400', () => {
  const { status, body } = getTransactions(setup(), 1, { startDate: '09/01/2026' });
  assert.equal(status, 400);
  assert.match(body.error, /startDate/);
});

test('startDate after endDate returns 400', () => {
  const { status, body } = getTransactions(setup(), 1, {
    startDate: '2026-09-20',
    endDate: '2026-09-01',
  });
  assert.equal(status, 400);
});

test('empty q is treated as no keyword', () => {
  const { body } = getTransactions(setup(), 1, { q: '   ' });
  assert.equal(body.total, 7);
});

test('unknown or another user\'s category id returns an empty list, not an error', () => {
  const db = setup();
  assert.equal(getTransactions(db, 1, { category: '999' }).body.total, 0);
  assert.equal(getTransactions(db, 1, { category: '4' }).body.total, 0);
});

test('user A cannot see user B\'s transactions through any filter', () => {
  const db = setup();
  assert.ok(!vendors(getTransactions(db, 1, { q: 'starbucks' }).body.transactions).includes('Starbucks'));
  assert.equal(getTransactions(db, 2, {}).body.total, 1);
});

test('pagination works alongside filters', () => {
  const db = setup();
  const page1 = getTransactions(db, 1, { limit: '2', page: '1' });
  const page2 = getTransactions(db, 1, { limit: '2', page: '2' });
  assert.equal(page1.body.transactions.length, 2);
  assert.equal(page1.body.total, 7);
  assert.notDeepEqual(page1.body.transactions, page2.body.transactions);
});

test('invalid page/limit returns 400', () => {
  assert.equal(getTransactions(setup(), 1, { page: '0' }).status, 400);
  assert.equal(getTransactions(setup(), 1, { limit: 'abc' }).status, 400);
});

test('parseTransactionFilters rejects reversed ranges independently of the handler', () => {
  const result = parseTransactionFilters({ startDate: '2026-09-20', endDate: '2026-09-01' });
  assert.ok(result.error);
});
