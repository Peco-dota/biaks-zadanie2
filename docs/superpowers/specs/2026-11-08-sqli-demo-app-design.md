# SQLi Demo App — Design

School assignment (BIKS Zadanie 2): a web app vulnerable to SQL injection, with a
switchable secure mode, themed as an AI-robotics site. Runs on localhost only.

## Stack

- Node.js + Express, server-rendered views (EJS) — no bundler/build step.
- SQLite via `better-sqlite3` — single file DB, no server process to manage.
- Vanilla JS + Three.js (CDN) for a decorative 3D hero animation.
- `express-session` with a cookie-based `mode` flag (`"vulnerable" | "secure"`),
  per-browser-session so flipping it doesn't affect other viewers.
- DB is dropped and reseeded on every server start → deterministic demo state,
  reset by restarting the server.

## Pages & SQL injection cases

Three cases, chosen to cover three different injection contexts:

1. **Login** (`GET/POST /login`) — quoted string in `WHERE username='...' AND
   password='...'`. Bypass: `' OR '1'='1' --`.
2. **Search** (`GET /models?q=...`) — `LIKE '%...%'` context. UNION-based
   injection to dump the `users` table from a public search box.
3. **Detail lookup** (`GET /models/view?id=...`) — numeric, unquoted context.
   Injection needs no quotes at all (`1 OR 1=1`, boolean-blind).

Each case has a vulnerable (string-concatenated SQL) and secure (parameterized)
query implementation, selected at request time by the session's `mode` flag.
Comments are added ONLY on the lines implementing/switching vulnerable vs.
secure queries, explaining the mechanism — everything else is uncommented.

Other pages: landing/home (AI-robotics content + 3D hero, no DB interaction),
dashboard (shown after login, displays the logged-in user's row including a
fake sensitive field, to make the login bypass demonstrably valuable).

## Toggle

One button in the nav: "Mode: VULNERABLE / SECURE". `POST /toggle-mode` flips
`req.session.mode` and redirects back to the referring page. All three
vulnerable endpoints branch on this flag.

## Data model

- `users`: id, username, password (plaintext — demo only, no hashing; out of
  scope for an SQLi assignment), is_admin, secret_note (fake sensitive field).
- `robots`: id, name, category, description, status.

Seeded with ~5 users (incl. one admin) and ~8 robot models on every boot.

## File layout

```
server.js                 - app setup, session middleware, route mounting
db/init.js                 - schema + seed, re-run on every boot
queries/users.js            - vulnerable + secure login/lookup query fns
queries/robots.js           - vulnerable + secure search/detail query fns
routes/pages.js              - home
routes/auth.js                - login, logout, dashboard
routes/robots.js               - search, detail
routes/mode.js                  - toggle-mode
views/*.ejs                      - pages (shared nav partial shows mode + toggle)
public/css/style.css
public/js/hero3d.js               - procedural Three.js hand + scroll explode
test/sqli-check.js                 - smoke test: boots app, hits both modes
                                      with injection payloads, asserts
                                      vulnerable bypasses/leaks and secure
                                      doesn't.
```

## Testing

`test/sqli-check.js`: starts the Express app on an ephemeral port, uses global
`fetch` (no new dependency) to POST/GET the three vulnerable endpoints with
injection payloads in both modes, asserts vulnerable-mode behavior (login
bypass succeeds, search UNION leaks a username, numeric injection returns
unintended rows) and secure-mode behavior (all three payloads are rejected or
treated as literal input). Run with `node test/sqli-check.js`.

## Out of scope

Documentation/write-up for the assignment defense (deferred by user), password
hashing, CSRF protection, production deployment concerns — this is a localhost
teaching demo.
