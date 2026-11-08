function findUserForLogin(db, username, password, mode) {
  if (mode === 'vulnerable') {
    // VULNERABLE: username/password are spliced directly into the SQL text,
    // so a value like `' OR '1'='1' --` changes the query's logic instead
    // of being treated as data.
    const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    return db.prepare(sql).get();
  }
  // SECURE: placeholders keep user input as data, never as SQL syntax.
  return db
    .prepare('SELECT * FROM users WHERE username = ? AND password = ?')
    .get(username, password);
}

function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

module.exports = { findUserForLogin, findUserById };
