/**
 * Handles GET /api/categories. `userId` identifies the caller — see the
 * same x-user-id stand-in assumption documented in src/api/transactions.js.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {number} userId
 */
export function getCategories(db, userId) {
  const categories = db
    .prepare('SELECT id, name FROM categories WHERE user_id = ? ORDER BY name')
    .all(userId);

  return { status: 200, body: { categories } };
}
