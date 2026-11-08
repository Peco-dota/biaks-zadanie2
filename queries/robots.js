function searchRobots(db, q, mode) {
  if (mode === 'vulnerable') {
    // VULNERABLE: `q` is spliced into the LIKE pattern and the surrounding
    // SQL text, so closing the quote lets an attacker append a UNION
    // SELECT that returns rows from an unrelated table (e.g. users).
    const sql = `SELECT * FROM robots WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`;
    return db.prepare(sql).all();
  }
  // SECURE: the pattern is built with parameters; `q` can never break out
  // of the string literal.
  const pattern = `%${q}%`;
  return db
    .prepare('SELECT * FROM robots WHERE name LIKE ? OR description LIKE ?')
    .all(pattern, pattern);
}

function getRobotById(db, id, mode) {
  if (mode === 'vulnerable') {
    // VULNERABLE: `id` is spliced in unquoted, so `1 OR 1=1` or a UNION
    // SELECT changes the query without needing to close any quote.
    const sql = `SELECT * FROM robots WHERE id = ${id}`;
    return db.prepare(sql).all();
  }
  // SECURE: parameter binding handles `id` as data only, regardless of
  // what it contains.
  return db.prepare('SELECT * FROM robots WHERE id = ?').all(id);
}

module.exports = { searchRobots, getRobotById };
