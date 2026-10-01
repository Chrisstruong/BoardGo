// Escape LIKE wildcards so user input is matched literally.
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (ch) => '\\' + ch);
}

/**
 * Returns the user's transactions, newest first.
 * Every filter is optional; undefined filters are skipped. Filters combine with AND.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {number} userId
 * @param {{ startDate?: string, endDate?: string, category?: number, q?: string }} filters
 */
export function findTransactions(db, userId, { startDate, endDate, category, q } = {}) {
  const where = ['t.user_id = ?'];
  const params = [userId];

  if (startDate !== undefined) {
    where.push('t.date >= ?');
    params.push(startDate);
  }
  if (endDate !== undefined) {
    where.push('t.date <= ?');
    params.push(endDate);
  }
  if (category !== undefined) {
    where.push('t.category_id = ?');
    params.push(category);
  }
  if (q !== undefined && q.trim() !== '') {
    // SQLite LIKE is case-insensitive for ASCII
    where.push("(t.description LIKE ? ESCAPE '\\' OR t.vendor LIKE ? ESCAPE '\\')");
    const pattern = '%' + escapeLike(q.trim()) + '%';
    params.push(pattern, pattern);
  }

  const sql = `
    SELECT t.id, t.date, t.vendor, t.amount, t.description, t.category_id AS categoryId, c.name AS categoryName
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE ${where.join(' AND ')}
    ORDER BY t.date DESC, t.id DESC`;

  return db.prepare(sql).all(...params);
}
