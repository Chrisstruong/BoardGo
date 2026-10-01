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
