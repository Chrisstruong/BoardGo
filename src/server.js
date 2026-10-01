import { createServer } from 'node:http';
import { openDb } from './db.js';
import { getTransactions } from './api/transactions.js';
import { getCategories } from './api/categories.js';

/**
 * Builds the HTTP API server. `userId` would normally come from an auth
 * session; this project has no auth layer yet, so it's read from an
 * `x-user-id` header as a stand-in.
 */
export function createApp(db) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/transactions') {
      const userId = Number(req.headers['x-user-id']);
      const { status, body } = getTransactions(db, userId, Object.fromEntries(url.searchParams));
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/categories') {
      const userId = Number(req.headers['x-user-id']);
      const { status, body } = getCategories(db, userId);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

export function startServer(port = 3001, dbFile) {
  const db = openDb(dbFile);
  const server = createApp(db);
  server.listen(port);
  return server;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  startServer();
}
