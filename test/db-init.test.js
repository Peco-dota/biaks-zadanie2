const assert = require('node:assert');
const { createDatabase } = require('../db/init');

const db = createDatabase();
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
const robotCount = db.prepare('SELECT COUNT(*) AS c FROM robots').get().c;

assert.strictEqual(userCount, 5, `expected 5 users, got ${userCount}`);
assert.strictEqual(robotCount, 8, `expected 8 robots, got ${robotCount}`);
db.close();
console.log('db-init: OK');
