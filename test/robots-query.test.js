const assert = require('node:assert');
const { createDatabase } = require('../db/init');
const { searchRobots, getRobotById } = require('../queries/robots');

const db = createDatabase();

const unionPayload = "zzz' UNION SELECT id, username, password, is_admin, secret_note FROM users --";
const leaked = searchRobots(db, unionPayload, 'vulnerable');
const leakedNames = leaked.map((r) => r.name); // username lands in the "name" column slot via UNION
assert.ok(leakedNames.includes('admin'), 'vulnerable search should leak usernames via UNION');

const safeSearch = searchRobots(db, unionPayload, 'secure');
assert.strictEqual(safeSearch.length, 0, 'secure search must not be exploitable by the same payload');

const injectedRows = getRobotById(db, '1 OR 1=1', 'vulnerable');
assert.ok(injectedRows.length > 1, 'vulnerable detail lookup should return all rows for "1 OR 1=1"');

const safeDetail = getRobotById(db, '1 OR 1=1', 'secure');
assert.strictEqual(safeDetail.length, 0, 'secure detail lookup must treat the payload as a literal id');

db.close();
console.log('robots-query: OK');
