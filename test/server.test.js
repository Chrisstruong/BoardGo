import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, seed } from '../src/db.js';
import { createApp } from '../src/server.js';

function listen() {
  const db = openDb();
  seed(db);
  const server = createApp(db);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://localhost:${port}` });
    });
  });
}

test('POST /api/transactions creates a transaction over real HTTP', async () => {
  const { server, baseUrl } = await listen();
  try {
    const response = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
      body: JSON.stringify({ date: '2026-10-01', vendor: 'Costco', amount: -80 }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.vendor, 'Costco');
  } finally {
    server.close();
  }
});

test('POST /api/transactions with a missing field returns 400 over real HTTP', async () => {
  const { server, baseUrl } = await listen();
  try {
    const response = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
      body: JSON.stringify({ date: '2026-10-01', amount: -80 }),
    });
    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});

test('POST /api/transactions with malformed JSON returns 400 over real HTTP', async () => {
  const { server, baseUrl } = await listen();
  try {
    const response = await fetch(`${baseUrl}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': '1' },
      body: '{not valid json',
    });
    assert.equal(response.status, 400);
  } finally {
    server.close();
  }
});
