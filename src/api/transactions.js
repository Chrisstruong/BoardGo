import { findTransactions } from '../transactions.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Validates and normalizes raw query-string params for GET /api/transactions.
 * Returns either { error } (caller should respond 400) or the parsed filters/pagination.
 *
 * @param {{ startDate?: string, endDate?: string, category?: string, q?: string, page?: string, limit?: string }} query
 */
export function parseTransactionFilters(query = {}) {
  const { startDate, endDate, category, q, page, limit } = query;

  if (startDate !== undefined && !DATE_RE.test(startDate)) {
    return { error: `Invalid startDate: ${startDate}` };
  }
  if (endDate !== undefined && !DATE_RE.test(endDate)) {
    return { error: `Invalid endDate: ${endDate}` };
  }
  if (startDate !== undefined && endDate !== undefined && startDate > endDate) {
    return { error: 'startDate must not be after endDate' };
  }

  const filters = {};
  if (startDate !== undefined) filters.startDate = startDate;
  if (endDate !== undefined) filters.endDate = endDate;

  if (category !== undefined && category !== '') {
    const categoryId = Number(category);
    if (!Number.isInteger(categoryId)) {
      return { error: `Invalid category: ${category}` };
    }
    filters.category = categoryId;
  }

  if (q !== undefined && q.trim() !== '') {
    filters.q = q;
  }

  let pageNum = 1;
  if (page !== undefined && page !== '') {
    pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return { error: `Invalid page: ${page}` };
    }
  }

  let limitNum = DEFAULT_LIMIT;
  if (limit !== undefined && limit !== '') {
    limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1) {
      return { error: `Invalid limit: ${limit}` };
    }
    limitNum = Math.min(limitNum, MAX_LIMIT);
  }

  return { filters, page: pageNum, limit: limitNum };
}

/**
 * Handles GET /api/transactions. `userId` identifies the caller — this
 * project has no auth layer yet, so callers are trusted to pass the
 * already-authenticated user's id.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {number} userId
 * @param {object} query
 */
export function getTransactions(db, userId, query) {
  if (!Number.isInteger(userId)) {
    return { status: 400, body: { error: 'Missing or invalid user' } };
  }

  const parsed = parseTransactionFilters(query);
  if (parsed.error) {
    return { status: 400, body: { error: parsed.error } };
  }

  const { filters, page, limit } = parsed;
  const all = findTransactions(db, userId, filters);
  const start = (page - 1) * limit;

  return {
    status: 200,
    body: { transactions: all.slice(start, start + limit), page, limit, total: all.length },
  };
}

/**
 * Validates and normalizes the JSON body for POST /api/transactions.
 * Returns either { error } or the normalized { transaction }.
 *
 * @param {{ date?: string, vendor?: string, amount?: number, categoryId?: number|null, description?: string|null }} body
 */
export function parseNewTransaction(body = {}) {
  const { date, vendor, amount, categoryId, description } = body;

  if (typeof date !== 'string' || !DATE_RE.test(date)) {
    return { error: `Invalid or missing date: ${date}` };
  }
  if (typeof vendor !== 'string' || vendor.trim() === '') {
    return { error: 'vendor is required' };
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return { error: `Invalid or missing amount: ${amount}` };
  }

  const transaction = { date, vendor: vendor.trim(), amount, categoryId: null, description: null };

  if (categoryId !== undefined && categoryId !== null) {
    if (!Number.isInteger(categoryId)) {
      return { error: `Invalid categoryId: ${categoryId}` };
    }
    transaction.categoryId = categoryId;
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return { error: `Invalid description: ${description}` };
    }
    transaction.description = description;
  }

  return { transaction };
}

/**
 * Handles POST /api/transactions. `userId` is the same x-user-id stand-in
 * used by getTransactions()/getCategories().
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {number} userId
 * @param {object} body
 */
export function createTransaction(db, userId, body) {
  if (!Number.isInteger(userId)) {
    return { status: 400, body: { error: 'Missing or invalid user' } };
  }

  const parsed = parseNewTransaction(body);
  if (parsed.error) {
    return { status: 400, body: { error: parsed.error } };
  }

  const { transaction } = parsed;

  if (transaction.categoryId !== null) {
    const category = db
      .prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?')
      .get(transaction.categoryId, userId);
    if (!category) {
      return { status: 400, body: { error: `Unknown categoryId: ${transaction.categoryId}` } };
    }
  }

  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO transactions (user_id, date, category_id, vendor, amount, description) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(
      userId,
      transaction.date,
      transaction.categoryId,
      transaction.vendor,
      transaction.amount,
      transaction.description,
    );

  const row = db
    .prepare(
      'SELECT id, date, vendor, amount, description, category_id AS categoryId FROM transactions WHERE id = ?',
    )
    .get(lastInsertRowid);

  return { status: 201, body: row };
}
