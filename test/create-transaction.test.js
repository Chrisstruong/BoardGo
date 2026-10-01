import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, seed } from '../src/db.js';
import { createTransaction, getTransactions } from '../src/api/transactions.js';

function setup() {
  const db = openDb();
  seed(db);
  return db;
}

test('adding a valid transaction succeeds and round-trips via a subsequent read', () => {
  const db = setup();
  const { status, body } = createTransaction(db, 1, {
    date: '2026-10-01',
    vendor: "Trader Joe's",
    amount: -34.12,
    categoryId: 1,
    description: 'Groceries',
  });

  assert.equal(status, 201);
  assert.equal(body.vendor, "Trader Joe's");
  assert.equal(body.amount, -34.12);
  assert.equal(body.categoryId, 1);
  assert.equal(body.description, 'Groceries');

  const { body: listing } = getTransactions(db, 1, {});
  assert.ok(listing.transactions.some((t) => t.id === body.id && t.vendor === "Trader Joe's"));
});

test('amount can be positive (money added)', () => {
  const { status, body } = createTransaction(setup(), 1, {
    date: '2026-10-02',
    vendor: 'Venmo',
    amount: 25.5,
  });
  assert.equal(status, 201);
  assert.equal(body.amount, 25.5);
});

test('categoryId and description are optional — omitting them leaves the transaction uncategorized', () => {
  const { status, body } = createTransaction(setup(), 1, {
    date: '2026-10-01',
    vendor: 'Corner Store',
    amount: -5,
  });
  assert.equal(status, 201);
  assert.equal(body.categoryId, null);
  assert.equal(body.description, null);
});

test('categoryId: null is equivalent to omitting it', () => {
  const { status, body } = createTransaction(setup(), 1, {
    date: '2026-10-01',
    vendor: 'Corner Store',
    amount: -5,
    categoryId: null,
  });
  assert.equal(status, 201);
  assert.equal(body.categoryId, null);
});

test('missing date returns 400', () => {
  const { status, body } = createTransaction(setup(), 1, { vendor: 'Kroger', amount: -10 });
  assert.equal(status, 400);
  assert.match(body.error, /date/);
});

test('invalid date format returns 400', () => {
  const { status } = createTransaction(setup(), 1, {
    date: '10/01/2026',
    vendor: 'Kroger',
    amount: -10,
  });
  assert.equal(status, 400);
});

test('missing vendor returns 400', () => {
  const { status, body } = createTransaction(setup(), 1, { date: '2026-10-01', amount: -10 });
  assert.equal(status, 400);
  assert.match(body.error, /vendor/);
});

test('blank vendor returns 400', () => {
  const { status } = createTransaction(setup(), 1, {
    date: '2026-10-01',
    vendor: '   ',
    amount: -10,
  });
  assert.equal(status, 400);
});

test('missing amount returns 400', () => {
  const { status, body } = createTransaction(setup(), 1, { date: '2026-10-01', vendor: 'Kroger' });
  assert.equal(status, 400);
  assert.match(body.error, /amount/);
});

test('non-numeric amount returns 400', () => {
  const { status } = createTransaction(setup(), 1, {
    date: '2026-10-01',
    vendor: 'Kroger',
    amount: 'ten dollars',
  });
  assert.equal(status, 400);
});

test('non-integer categoryId returns 400', () => {
  const { status, body } = createTransaction(setup(), 1, {
    date: '2026-10-01',
    vendor: 'Kroger',
    amount: -10,
    categoryId: 1.5,
  });
  assert.equal(status, 400);
  assert.match(body.error, /categoryId/);
});

test('non-existent categoryId returns 400', () => {
  const { status } = createTransaction(setup(), 1, {
    date: '2026-10-01',
    vendor: 'Kroger',
    amount: -10,
    categoryId: 999,
  });
  assert.equal(status, 400);
});

test('another user\'s categoryId returns 400, never silently assigned', () => {
  const db = setup();
  // category 4 belongs to user 2, not user 1
  const { status } = createTransaction(db, 1, {
    date: '2026-10-01',
    vendor: 'Kroger',
    amount: -10,
    categoryId: 4,
  });
  assert.equal(status, 400);
});

test('invalid description type returns 400', () => {
  const { status } = createTransaction(setup(), 1, {
    date: '2026-10-01',
    vendor: 'Kroger',
    amount: -10,
    description: 12345,
  });
  assert.equal(status, 400);
});

test('missing or invalid user returns 400', () => {
  const db = setup();
  assert.equal(
    createTransaction(db, NaN, { date: '2026-10-01', vendor: 'Kroger', amount: -10 }).status,
    400,
  );
});
