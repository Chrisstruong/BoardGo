import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, seed } from '../src/db.js';
import { getCategories } from '../src/api/categories.js';

function setup() {
  const db = openDb();
  seed(db);
  return db;
}

test('returns only the user\'s own categories, sorted by name', () => {
  const { status, body } = getCategories(setup(), 1);
  assert.equal(status, 200);
  assert.deepEqual(
    body.categories.map((c) => c.name),
    ['Food', 'Rent', 'Transport'],
  );
});

test('never returns another user\'s categories', () => {
  const { body } = getCategories(setup(), 1);
  assert.ok(!body.categories.some((c) => c.name === 'Food' && c.id === 4));
});

test('a user with no categories gets an empty list', () => {
  const { status, body } = getCategories(setup(), 999);
  assert.equal(status, 200);
  assert.deepEqual(body.categories, []);
});
