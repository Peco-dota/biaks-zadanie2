# SQLi Demo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a localhost Express app, themed as an AI-robotics company site, with three SQL-injection-vulnerable features that each have a secure counterpart, switchable live via a session-scoped toggle button — plus a decorative Three.js scroll animation on the landing page.

**Architecture:** Express + EJS server-rendered pages, SQLite (`better-sqlite3`) reset and reseeded on every boot, a `queries/` layer where every vulnerable endpoint has a sibling `vulnerable`/`secure` query function selected by `req.session.mode`. No client-side framework; the only client JS is the decorative hero animation.

**Tech Stack:** Node.js (≥18, global `fetch`), Express, EJS, `better-sqlite3`, `express-session`, Three.js via CDN (ESM import, no bundler).

**Spec:** `docs/superpowers/specs/2026-11-08-sqli-demo-app-design.md`

## Global Constraints

- No comments anywhere in the code EXCEPT directly on the lines that implement or switch between vulnerable/secure SQL queries — those must have clear comments explaining the mechanism.
- DB is dropped and reseeded every time the server starts (deterministic demo state).
- No new dependency beyond: `express`, `ejs`, `express-session`, `better-sqlite3`. Testing uses Node's built-in `assert` and global `fetch` — no test framework.
- `mode` is stored per-session (cookie), default `"secure"`.
- Passwords are stored in plaintext — explicitly out of scope per the spec (SQLi assignment, not an auth-hardening one).

---

## File Structure

```
package.json
server.js                    - app factory (createApp), session + mode middleware, route mounting
db/
  init.js                    - createDatabase(): schema + seed, called fresh every boot
queries/
  users.js                   - findUserForLogin (vuln/secure), findUserById
  robots.js                  - searchRobots (vuln/secure), getRobotById (vuln/secure)
routes/
  pages.js                   - GET /
  auth.js                    - GET/POST /login, GET /dashboard, POST /logout
  robots.js                  - GET /models, GET /models/view  (mounted at /models)
  mode.js                    - POST /toggle-mode
views/
  partials/head.ejs, nav.ejs, footer.ejs
  index.ejs, login.ejs, dashboard.ejs, models.ejs, model-detail.ejs
public/
  css/style.css
  js/hero3d.js                - procedural Three.js hand, scroll-driven explode
test/
  db-init.test.js
  users-query.test.js
  robots-query.test.js
  sqli-check.js               - end-to-end: boots app, hits all 3 cases in both modes
.gitignore
README.md
```

---

### Task 1: Project scaffold & dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: `npm start` runs `node server.js`; `npm test` runs all `test/*.test.js` plus `test/sqli-check.js`.

- [ ] **Step 1: Init and install dependencies**

```bash
npm init -y
npm install express ejs express-session better-sqlite3
```

- [ ] **Step 2: Edit `package.json` scripts**

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "node test/db-init.test.js && node test/users-query.test.js && node test/robots-query.test.js && node test/sqli-check.js"
  }
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
db/*.sqlite
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "Scaffold project: express, ejs, better-sqlite3, express-session"
```

---

### Task 2: Database schema + seed

**Files:**
- Create: `db/init.js`
- Test: `test/db-init.test.js`

**Interfaces:**
- Produces: `createDatabase(): Database` — a `better-sqlite3` instance with `users` and `robots` tables, dropped and reseeded on every call. Consumed by `server.js` and by the query-layer tests.

- [ ] **Step 1: Write the test first**

```js
// test/db-init.test.js
const assert = require('node:assert');
const { createDatabase } = require('../db/init');

const db = createDatabase();
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
const robotCount = db.prepare('SELECT COUNT(*) AS c FROM robots').get().c;

assert.strictEqual(userCount, 5, `expected 5 users, got ${userCount}`);
assert.strictEqual(robotCount, 8, `expected 8 robots, got ${robotCount}`);
db.close();
console.log('db-init: OK');
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node test/db-init.test.js`
Expected: `Cannot find module '../db/init'`

- [ ] **Step 3: Implement `db/init.js`**

```js
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data.sqlite');

function createDatabase() {
  const db = new Database(DB_PATH);

  db.exec(`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS robots;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      secret_note TEXT NOT NULL
    );

    CREATE TABLE robots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  const insertUser = db.prepare(
    'INSERT INTO users (username, password, is_admin, secret_note) VALUES (?, ?, ?, ?)'
  );
  const users = [
    ['admin', 'sup3rS3cret!', 1, 'Root API key: sk-live-7f3a9c2e-prod'],
    ['alice', 'alice2024', 0, 'Favorite lab: Boston Dynamics intern program'],
    ['bob', 'bobpass', 0, 'Payroll grade: L4'],
    ['carol', 'carolpw', 0, 'Pending patent: soft-gripper actuator'],
    ['dave', 'davepw', 0, 'Access badge code: 48213'],
  ];
  for (const u of users) insertUser.run(...u);

  const insertRobot = db.prepare(
    'INSERT INTO robots (name, category, description, status) VALUES (?, ?, ?, ?)'
  );
  const robots = [
    ['Atlas-9', 'Humanoid', 'Bipedal humanoid for warehouse logistics.', 'Active'],
    ['HexCrawler', 'Hexapod', 'Six-legged terrain inspection robot.', 'Active'],
    ['SwarmBee v2', 'Swarm', 'Micro-drone swarm for crop monitoring.', 'Prototype'],
    ['DeepDiver', 'Underwater', 'Autonomous underwater survey unit.', 'Active'],
    ['GripMaster', 'Manipulator', 'Soft-robotic gripping arm for assembly lines.', 'Active'],
    ['PathFinder RL', 'Research', 'Reinforcement-learning navigation testbed.', 'Research'],
    ['VisionScout', 'Computer Vision', 'Edge-deployed object detection rover.', 'Active'],
    ['SimTwin', 'Sim-to-Real', 'Digital-twin platform for policy transfer.', 'Research'],
  ];
  for (const r of robots) insertRobot.run(...r);

  return db;
}

module.exports = { createDatabase, DB_PATH };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/db-init.test.js`
Expected: `db-init: OK`

- [ ] **Step 5: Commit**

```bash
git add db/init.js test/db-init.test.js
git commit -m "Add DB schema + seed, reset on every boot"
```

---

### Task 3: User query layer (SQLi case 1 — login)

**Files:**
- Create: `queries/users.js`
- Test: `test/users-query.test.js`

**Interfaces:**
- Consumes: `createDatabase()` from Task 2.
- Produces: `findUserForLogin(db, username, password, mode): UserRow | undefined`, `findUserById(db, id): UserRow | undefined`. Consumed by `routes/auth.js` (Task 6).

- [ ] **Step 1: Write the failing test**

```js
// test/users-query.test.js
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node test/users-query.test.js`
Expected: `Cannot find module '../queries/users'`

- [ ] **Step 3: Implement `queries/users.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/users-query.test.js`
Expected: `users-query: OK`

- [ ] **Step 5: Commit**

```bash
git add queries/users.js test/users-query.test.js
git commit -m "Add login query layer with vulnerable/secure modes (SQLi case 1)"
```

---

### Task 4: Robot query layer (SQLi cases 2 & 3 — search, detail)

**Files:**
- Create: `queries/robots.js`
- Test: `test/robots-query.test.js`

**Interfaces:**
- Consumes: `createDatabase()` from Task 2.
- Produces: `searchRobots(db, q, mode): RobotRow[]`, `getRobotById(db, id, mode): RobotRow[]`. Consumed by `routes/robots.js` (Task 7).

- [ ] **Step 1: Write the failing test**

```js
// test/robots-query.test.js
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
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node test/robots-query.test.js`
Expected: `Cannot find module '../queries/robots'`

- [ ] **Step 3: Implement `queries/robots.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test/robots-query.test.js`
Expected: `robots-query: OK`

- [ ] **Step 5: Commit**

```bash
git add queries/robots.js test/robots-query.test.js
git commit -m "Add search/detail query layer with vulnerable/secure modes (SQLi cases 2-3)"
```

---

### Task 5: Express app shell + mode toggle

**Files:**
- Create: `server.js`
- Create: `routes/mode.js`
- Create: `routes/pages.js` (stub home route; filled in Task 8)

**Interfaces:**
- Consumes: `createDatabase()` (Task 2).
- Produces: `createApp(): ExpressApp` — exported for reuse by `test/sqli-check.js` and by direct `node server.js` execution. Sets `req.session.mode` (default `"secure"`) and exposes `res.locals.mode` / `res.locals.user` to all views.

- [ ] **Step 1: Create `routes/pages.js` (stub)**

```js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index');
});

module.exports = router;
```

- [ ] **Step 2: Create `routes/mode.js`**

```js
const express = require('express');
const router = express.Router();

router.post('/toggle-mode', (req, res) => {
  // This flip is what the demo's "VULNERABLE / SECURE" button does —
  // every vulnerable-mode query function checks this session value.
  req.session.mode = req.session.mode === 'vulnerable' ? 'secure' : 'vulnerable';
  res.redirect(req.get('Referer') || '/');
});

module.exports = router;
```

- [ ] **Step 3: Create `server.js`**

```js
const path = require('path');
const express = require('express');
const session = require('express-session');
const { createDatabase } = require('./db/init');
const pagesRouter = require('./routes/pages');
const modeRouter = require('./routes/mode');

function createApp() {
  const db = createDatabase();
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(
    session({
      secret: 'biaks-zadanie2-local-demo',
      resave: false,
      saveUninitialized: true,
    })
  );

  app.use((req, res, next) => {
    if (!req.session.mode) req.session.mode = 'secure';
    res.locals.mode = req.session.mode;
    res.locals.user = req.session.user || null;
    next();
  });

  app.locals.db = db;

  app.use('/', pagesRouter);
  app.use('/', modeRouter);

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
}
```

- [ ] **Step 4: Create a minimal `views/index.ejs` placeholder so the server boots**

```html
<!DOCTYPE html>
<html>
<body><h1>Placeholder — replaced in Task 8</h1></body>
</html>
```

- [ ] **Step 5: Verify the server boots**

Run: `node server.js` then `curl -i http://localhost:3000/` in another terminal; expect `200` and the placeholder HTML. Stop the server with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add server.js routes/mode.js routes/pages.js views/index.ejs
git commit -m "Add Express app shell with session-based mode toggle"
```

---

### Task 6: Auth routes + views (SQLi case 1 wired up)

**Files:**
- Create: `routes/auth.js`
- Create: `views/login.ejs`, `views/dashboard.ejs`
- Modify: `server.js:1-25` (mount `authRouter`)

**Interfaces:**
- Consumes: `findUserForLogin(db, username, password, mode)` (Task 3).
- Produces: `GET/POST /login`, `GET /dashboard`, `POST /logout`. Sets `req.session.user = { id, username, is_admin, secret_note }` on successful login.

- [ ] **Step 1: Create `routes/auth.js`**

```js
const express = require('express');
const router = express.Router();
const { findUserForLogin } = require('../queries/users');

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = req.app.locals.db;
  const user = findUserForLogin(db, username, password, req.session.mode);
  if (!user) {
    return res.render('login', { error: 'Invalid username or password.' });
  }
  req.session.user = {
    id: user.id,
    username: user.username,
    is_admin: !!user.is_admin,
    secret_note: user.secret_note,
  };
  res.redirect('/dashboard');
});

router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('dashboard', { user: req.session.user });
});

router.post('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/');
});

module.exports = router;
```

- [ ] **Step 2: Create `views/login.ejs`**

```html
<%- include('partials/head', { title: 'Login — NeuroForge Robotics' }) %>
<body>
  <%- include('partials/nav') %>
  <main class="narrow">
    <h1>Sign in</h1>
    <% if (error) { %><p class="error"><%= error %></p><% } %>
    <form action="/login" method="post" class="form">
      <label>Username<input type="text" name="username" autocomplete="off" /></label>
      <label>Password<input type="password" name="password" autocomplete="off" /></label>
      <button type="submit">Sign in</button>
    </form>
  </main>
  <%- include('partials/footer') %>
</body>
</html>
```

- [ ] **Step 3: Create `views/dashboard.ejs`**

```html
<%- include('partials/head', { title: 'Dashboard — NeuroForge Robotics' }) %>
<body>
  <%- include('partials/nav') %>
  <main class="narrow">
    <h1>Welcome, <%= user.username %></h1>
    <p>Role: <%= user.is_admin ? 'Administrator' : 'Researcher' %></p>
    <p>Internal note: <%= user.secret_note %></p>
  </main>
  <%- include('partials/footer') %>
</body>
</html>
```

Note: `views/partials/head.ejs`, `nav.ejs`, `footer.ejs` don't exist yet — they're created in Task 8, which must land before this task is manually verified end-to-end. Implement this task's files now; defer the `curl`/browser check to after Task 8.

- [ ] **Step 4: Mount the router in `server.js`**

Add near the top:
```js
const authRouter = require('./routes/auth');
```
Add alongside the existing `app.use('/', pagesRouter);`:
```js
app.use('/', authRouter);
```

- [ ] **Step 5: Commit**

```bash
git add routes/auth.js views/login.ejs views/dashboard.ejs server.js
git commit -m "Add auth routes and views, wired to login query layer"
```

---

### Task 7: Robots routes + views (SQLi cases 2 & 3 wired up)

**Files:**
- Create: `routes/robots.js`
- Create: `views/models.ejs`, `views/model-detail.ejs`
- Modify: `server.js:1-25` (mount `robotsRouter` at `/models`)

**Interfaces:**
- Consumes: `searchRobots(db, q, mode)`, `getRobotById(db, id, mode)` (Task 4).
- Produces: `GET /models?q=`, `GET /models/view?id=`.

- [ ] **Step 1: Create `routes/robots.js`**

```js
const express = require('express');
const router = express.Router();
const { searchRobots, getRobotById } = require('../queries/robots');

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const q = req.query.q || '';
  const results = q ? searchRobots(db, q, req.session.mode) : [];
  res.render('models', { q, results });
});

router.get('/view', (req, res) => {
  const db = req.app.locals.db;
  const id = req.query.id || '';
  const rows = id ? getRobotById(db, id, req.session.mode) : [];
  res.render('model-detail', { id, rows });
});

module.exports = router;
```

- [ ] **Step 2: Create `views/models.ejs`**

```html
<%- include('partials/head', { title: 'Models — NeuroForge Robotics' }) %>
<body>
  <%- include('partials/nav') %>
  <main class="wide">
    <h1>Robot models</h1>
    <form action="/models" method="get" class="form-inline">
      <input type="text" name="q" value="<%= q %>" placeholder="Search by name or description…" />
      <button type="submit">Search</button>
    </form>
    <table class="data-table">
      <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Description</th><th>Status</th></tr></thead>
      <tbody>
        <% results.forEach(function(r) { %>
          <tr>
            <td><a href="/models/view?id=<%= r.id %>"><%= r.id %></a></td>
            <td><%= r.name %></td>
            <td><%= r.category %></td>
            <td><%= r.description %></td>
            <td><%= r.status %></td>
          </tr>
        <% }) %>
      </tbody>
    </table>
  </main>
  <%- include('partials/footer') %>
</body>
</html>
```

- [ ] **Step 3: Create `views/model-detail.ejs`**

```html
<%- include('partials/head', { title: 'Model detail — NeuroForge Robotics' }) %>
<body>
  <%- include('partials/nav') %>
  <main class="wide">
    <h1>Model detail</h1>
    <form action="/models/view" method="get" class="form-inline">
      <input type="text" name="id" value="<%= id %>" placeholder="Model ID…" />
      <button type="submit">Look up</button>
    </form>
    <table class="data-table">
      <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Description</th><th>Status</th></tr></thead>
      <tbody>
        <% rows.forEach(function(r) { %>
          <tr><td><%= r.id %></td><td><%= r.name %></td><td><%= r.category %></td><td><%= r.description %></td><td><%= r.status %></td></tr>
        <% }) %>
      </tbody>
    </table>
  </main>
  <%- include('partials/footer') %>
</body>
</html>
```

- [ ] **Step 4: Mount the router in `server.js`**

Add near the top:
```js
const robotsRouter = require('./routes/robots');
```
Add alongside the other `app.use`:
```js
app.use('/models', robotsRouter);
```

- [ ] **Step 5: Commit**

```bash
git add routes/robots.js views/models.ejs views/model-detail.ejs server.js
git commit -m "Add robot search/detail routes and views, wired to query layer"
```

---

### Task 8: Home page, nav partial, CSS, and 3D hero animation

**Files:**
- Create: `views/partials/head.ejs`, `views/partials/nav.ejs`, `views/partials/footer.ejs`
- Modify: `views/index.ejs` (replace Task 5's placeholder)
- Create: `public/css/style.css`
- Create: `public/js/hero3d.js`

**Interfaces:**
- Consumes: `res.locals.mode`, `res.locals.user` (set in `server.js`, Task 5).
- Produces: the shared nav used by every page (mode badge + toggle button + login/logout).

Use the **frontend-pro** skill while writing the CSS/markup in this task for visual polish (dark, technical, AI-robotics aesthetic) — the code below is a functional baseline to refine, not a final pass.

- [ ] **Step 1: Create `views/partials/head.ejs`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
```

- [ ] **Step 2: Create `views/partials/footer.ejs`**

```html
<footer class="site-footer">
  <p>NeuroForge Robotics — internal research demo.</p>
</footer>
```

- [ ] **Step 3: Create `views/partials/nav.ejs`**

```html
<nav class="nav">
  <div class="nav-brand"><a href="/">NeuroForge Robotics</a></div>
  <div class="nav-links">
    <a href="/">Home</a>
    <a href="/models">Models</a>
    <% if (user) { %>
      <a href="/dashboard">Dashboard</a>
      <form action="/logout" method="post" class="inline-form">
        <button type="submit" class="link-button">Logout (<%= user.username %>)</button>
      </form>
    <% } else { %>
      <a href="/login">Login</a>
    <% } %>
  </div>
  <form action="/toggle-mode" method="post" class="mode-toggle">
    <button type="submit" class="mode-badge mode-<%= mode %>">
      Mode: <%= mode.toUpperCase() %>
    </button>
  </form>
</nav>
```

- [ ] **Step 4: Replace `views/index.ejs`**

```html
<%- include('partials/head', { title: 'NeuroForge Robotics' }) %>
<body>
  <%- include('partials/nav') %>

  <section class="hero" id="hero">
    <canvas id="hero-canvas"></canvas>
    <div class="hero-text">
      <h1>Engineering the next generation of autonomous machines</h1>
      <p>Scroll to see it come apart.</p>
    </div>
  </section>

  <section class="content">
    <h2>Our approaches</h2>
    <div class="cards">
      <article class="card">
        <h3>Reinforcement Learning</h3>
        <p>Policies trained in simulation and transferred to physical actuators via domain randomization.</p>
      </article>
      <article class="card">
        <h3>Computer Vision</h3>
        <p>Edge-deployed perception stacks for object detection, pose estimation, and SLAM.</p>
      </article>
      <article class="card">
        <h3>Sim-to-Real Transfer</h3>
        <p>Digital twins that close the gap between simulated training and real-world deployment.</p>
      </article>
      <article class="card">
        <h3>Humanoid Platforms</h3>
        <p>Bipedal locomotion and manipulation research for general-purpose labor robots.</p>
      </article>
    </div>
  </section>

  <%- include('partials/footer') %>
  <script type="module" src="/js/hero3d.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create `public/css/style.css`**

```css
:root {
  --bg: #0b0e14;
  --bg-panel: #11151f;
  --fg: #e7ecf3;
  --muted: #8a93a6;
  --accent: #3fa9f5;
  --danger: #f55a5a;
  --ok: #3ad17a;
}

* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
a { color: var(--accent); text-decoration: none; }

.nav {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 2rem;
  background: var(--bg-panel);
  border-bottom: 1px solid #1d2330;
}
.nav-brand a { font-weight: 700; font-size: 1.1rem; color: var(--fg); }
.nav-links { display: flex; gap: 1.25rem; align-items: center; }
.inline-form { display: inline; }
.link-button { background: none; border: none; color: var(--accent); cursor: pointer; font: inherit; padding: 0; }

.mode-toggle { margin: 0; }
.mode-badge { border: none; border-radius: 999px; padding: 0.4rem 1rem; font-weight: 700; cursor: pointer; letter-spacing: 0.03em; }
.mode-badge.mode-secure { background: var(--ok); color: #06210f; }
.mode-badge.mode-vulnerable { background: var(--danger); color: #2a0606; }

.hero { position: relative; height: 220vh; pointer-events: none; }
#hero-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: 0; pointer-events: none; }
.hero-text { position: sticky; top: 30vh; z-index: 1; text-align: center; color: var(--fg); padding: 0 1.5rem; }
.hero-text h1 { font-size: 2.4rem; margin-bottom: 0.5rem; }
.hero-text p { color: var(--muted); }

.content { position: relative; background: var(--bg); padding: 3rem 2rem 5rem; z-index: 1; }
.content h2 { margin-bottom: 1.5rem; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; }
.card { background: var(--bg-panel); border: 1px solid #1d2330; border-radius: 10px; padding: 1.25rem; }
.card h3 { margin-top: 0; color: var(--accent); }
.card p { color: var(--muted); margin-bottom: 0; }

main.narrow { max-width: 420px; margin: 3rem auto; padding: 0 1.5rem; }
main.wide { max-width: 900px; margin: 3rem auto; padding: 0 1.5rem; }

.form label { display: block; margin-bottom: 1rem; color: var(--muted); }
.form input, .form-inline input { width: 100%; margin-top: 0.3rem; padding: 0.6rem; border-radius: 6px; border: 1px solid #1d2330; background: var(--bg); color: var(--fg); }
.form button, .form-inline button { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; background: var(--accent); color: #06121f; font-weight: 700; cursor: pointer; }
.form-inline { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.form-inline input { width: auto; flex: 1; margin-top: 0; }

.error { color: var(--danger); }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #1d2330; }
.data-table th { color: var(--muted); font-weight: 600; }

.site-footer { position: relative; z-index: 1; text-align: center; padding: 2rem; color: var(--muted); font-size: 0.85rem; }
```

- [ ] **Step 6: Create `public/js/hero3d.js`**

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const canvas = document.getElementById('hero-canvas');
const heroSection = document.getElementById('hero');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(3, 5, 5);
scene.add(dirLight);

const metal = new THREE.MeshStandardMaterial({ color: 0x8892a6, metalness: 0.7, roughness: 0.35 });
const joint = new THREE.MeshStandardMaterial({ color: 0x3fa9f5, metalness: 0.4, roughness: 0.4 });

const hand = new THREE.Group();
scene.add(hand);
hand.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.8, 0.6), metal));

function buildDigit(baseX, baseY, segmentCount, segmentLength, rotationZ = 0) {
  const group = new THREE.Group();
  group.position.set(baseX, baseY, 0);
  group.rotation.z = rotationZ;
  const segments = [];
  let cursor = 0;
  for (let i = 0; i < segmentCount; i++) {
    const segGroup = new THREE.Group();
    segGroup.position.y = cursor;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, segmentLength, 0.35), i % 2 === 0 ? metal : joint);
    mesh.position.y = segmentLength / 2;
    segGroup.add(mesh);
    group.add(segGroup);
    segments.push(segGroup);
    cursor += segmentLength;
  }
  hand.add(group);
  return { group, segments, baseX };
}

const fingers = [
  buildDigit(-1.0, 1.4, 3, 0.7),
  buildDigit(-0.4, 1.4, 3, 0.9),
  buildDigit(0.2, 1.4, 3, 0.95),
  buildDigit(0.8, 1.4, 3, 0.85),
  buildDigit(-1.5, -0.4, 2, 0.65, Math.PI / 4),
];

function getScrollProgress() {
  const heroHeight = heroSection.offsetHeight;
  const scrollable = Math.max(1, heroHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}

function render() {
  const progress = getScrollProgress();

  hand.rotation.y = progress * Math.PI * 1.2;
  hand.rotation.x = progress * 0.3;

  fingers.forEach((finger, idx) => {
    const spread = progress * (1.2 + idx * 0.3);
    const direction = finger.baseX < 0 ? -1 : 1;
    finger.group.position.x = finger.baseX + direction * spread * 0.6;
    finger.segments.forEach((seg, segIdx) => {
      seg.rotation.z = progress * (segIdx + 1) * 0.5 * (idx % 2 === 0 ? 1 : -1);
      seg.position.z = progress * segIdx * 0.8;
    });
  });

  const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
  const fade = Math.min(1, Math.max(0, (window.scrollY + window.innerHeight - heroBottom) / 300));
  canvas.style.opacity = String(1 - fade);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

render();
```

- [ ] **Step 7: Manual verification**

Run: `node server.js`, open `http://localhost:3000/` in a browser. Confirm: the nav shows a green "Mode: SECURE" badge; clicking it flips to red "Mode: VULNERABLE" and back; scrolling the home page visibly rotates/explodes the procedural hand and fades it out before the content cards; `/login`, `/models`, `/models/view?id=1` all render without errors. Stop the server with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add views/partials views/index.ejs public/css/style.css public/js/hero3d.js
git commit -m "Add landing page, nav partial, styling, and 3D scroll hero animation"
```

---

### Task 9: End-to-end smoke test

**Files:**
- Create: `test/sqli-check.js`

**Interfaces:**
- Consumes: `createApp()` from `server.js` (Task 5).

- [ ] **Step 1: Write `test/sqli-check.js`**

```js
const assert = require('node:assert');
const { createApp } = require('../server');

async function main() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  async function request(path, options = {}, cookie) {
    const headers = { ...(options.headers || {}) };
    if (cookie) headers['Cookie'] = cookie;
    const res = await fetch(base + path, { ...options, headers, redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    const newCookie = setCookie ? setCookie.split(';')[0] : cookie;
    return { res, cookie: newCookie };
  }

  async function setVulnerable(cookie) {
    const { cookie: c } = await request(
      '/toggle-mode',
      { method: 'POST', headers: { Referer: base + '/' } },
      cookie
    );
    return c;
  }

  const { cookie: freshCookie } = await request('/', {});
  const vulnCookie = await setVulnerable(freshCookie);

  const { cookie: secureCookie } = await request('/', {});

  // --- Case 1: login bypass ---
  const bypassBody = new URLSearchParams({ username: "' OR '1'='1' --", password: 'anything' });
  const { res: loginVuln } = await request(
    '/login',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: bypassBody },
    vulnCookie
  );
  assert.strictEqual(loginVuln.status, 302, 'vulnerable login should redirect (bypass succeeded)');
  assert.strictEqual(loginVuln.headers.get('location'), '/dashboard', 'vulnerable login should redirect to /dashboard');

  const { res: loginSecure } = await request(
    '/login',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: bypassBody },
    secureCookie
  );
  assert.strictEqual(loginSecure.status, 200, 'secure login should NOT redirect for the same payload');

  // --- Case 2: search UNION leak ---
  const unionPayload = encodeURIComponent("zzz' UNION SELECT id, username, password, is_admin, secret_note FROM users --");
  const { res: searchVuln } = await request(`/models?q=${unionPayload}`, {}, vulnCookie);
  const searchVulnBody = await searchVuln.text();
  assert.ok(searchVulnBody.includes('admin'), 'vulnerable search should leak the admin username');

  const { res: searchSecure } = await request(`/models?q=${unionPayload}`, {}, secureCookie);
  const searchSecureBody = await searchSecure.text();
  assert.ok(!searchSecureBody.includes('sk-live'), 'secure search must not leak secret_note values');

  // --- Case 3: numeric injection on detail lookup ---
  const { res: detailVuln } = await request('/models/view?id=1%20OR%201=1', {}, vulnCookie);
  const detailVulnBody = await detailVuln.text();
  const vulnRowCount = (detailVulnBody.match(/<tr>/g) || []).length - 1;
  assert.ok(vulnRowCount >= 8, 'vulnerable detail lookup should return all robots for "1 OR 1=1"');

  const { res: detailSecure } = await request('/models/view?id=1%20OR%201=1', {}, secureCookie);
  const detailSecureBody = await detailSecure.text();
  const secureRowCount = (detailSecureBody.match(/<tr>/g) || []).length - 1;
  assert.strictEqual(secureRowCount, 0, 'secure detail lookup must reject the non-numeric payload');

  server.close();
  console.log('sqli-check: ALL OK');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Run it**

Run: `node test/sqli-check.js`
Expected: `sqli-check: ALL OK`. If a step fails, the `AssertionError` message says exactly which case/mode broke — fix the relevant route or query function, not the test.

- [ ] **Step 3: Commit**

```bash
git add test/sqli-check.js
git commit -m "Add end-to-end smoke test covering all 3 SQLi cases in both modes"
```

---

### Task 10: README + final check

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# NeuroForge Robotics — SQL Injection Demo

Localhost demo app (BIKS Zadanie 2) with 3 SQL-injection-vulnerable features,
each switchable to a secure, parameterized equivalent via the "Mode" button
in the nav.

## Run

\`\`\`bash
npm install
npm start
\`\`\`

Open http://localhost:3000. The database is reseeded from scratch on every
start.

## Test

\`\`\`bash
npm test
\`\`\`

## Demo cases

1. **Login** (`/login`) — try username `' OR '1'='1' --` with any password
   in VULNERABLE mode.
2. **Search** (`/models`) — try `zzz' UNION SELECT id, username, password,
   is_admin, secret_note FROM users --` in the search box.
3. **Detail lookup** (`/models/view?id=...`) — try `id=1 OR 1=1` in the URL.

Flip to SECURE mode and repeat any of the above to see them fail.
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all four scripts print their `OK` line, process exits 0.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Add README with run instructions and demo payloads"
```
