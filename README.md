# NeuroForge Robotics — SQL Injection Demo

Localhost demo app (BIKS Zadanie 2) with 3 SQL-injection-vulnerable features,
each switchable to a secure, parameterized equivalent via the "Mode" button
in the nav.

## Run

```bash
npm install
npm start
```

Open http://localhost:3000. The database is reseeded from scratch on every
start.

## Test

```bash
npm test
```

## Demo cases

1. **Login** (`/login`) — try username `' OR '1'='1' --` with any password
   in VULNERABLE mode.
2. **Search** (`/models`) — try `zzz' UNION SELECT id, username, password,
   is_admin, secret_note FROM users --` in the search box.
3. **Detail lookup** (`/models/view?id=...`) — try `id=1 OR 1=1` in the URL.

Flip to SECURE mode and repeat any of the above to see them fail.
