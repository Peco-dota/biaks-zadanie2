const assert = require('node:assert');
const { createDatabase } = require('../db/init');
const { findUserForLogin } = require('../queries/users');

const db = createDatabase();

const bypassed = findUserForLogin(db, "' OR '1'='1' --", 'whatever', 'vulnerable');
assert.ok(bypassed, 'vulnerable mode should be bypassed by classic payload');

const blocked = findUserForLogin(db, "' OR '1'='1' --", 'whatever', 'secure');
assert.strictEqual(blocked, undefined, 'secure mode must not be bypassed');

const ok = findUserForLogin(db, 'alice', 'alice2024', 'secure');
assert.ok(ok && ok.username === 'alice', 'secure mode should allow correct login');

db.close();
console.log('users-query: OK');
