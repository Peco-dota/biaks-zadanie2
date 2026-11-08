# SQL Injection — Attack Guide

Reference for the defense: exact payloads to use, the SQL they produce, why
each attack works in **VULNERABLE** mode, and why the identical payload fails
in **SECURE** mode. Flip the mode with the nav button before each demo.

Seeded accounts (`db/init.js`): `admin`/`admin` (admin), `alice`/`alice2024`,
`bob`/`bobpass`, `carol`/`carolpw`, `dave`/`davepw`.

---

## Case 1 — Login bypass (`/login`)

**Code:** `queries/users.js:1-13`, `findUserForLogin()`

**Vulnerable query template:**
```sql
SELECT * FROM users WHERE username = '${username}' AND password = '${password}'
```

**Payload:**
- Username: `' OR '1'='1' --`
- Password: (anything — it's ignored)

**Resulting SQL actually executed:**
```sql
SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = 'anything'
```

**Why it works:** the `'` in the payload closes the opened `username = '`
string literal early. `OR '1'='1'` is a condition that's always true, so the
`WHERE` clause matches every row regardless of the real username/password.
`--` starts a SQL line comment, so everything after it — including the
`AND password = '...'` check — is discarded text, never evaluated. SQLite
returns the *first* matching row, which is `admin` (seeded first), and
`routes/auth.js` logs you in as whoever came back — no password ever
checked.

**Secure query:**
```sql
SELECT * FROM users WHERE username = ? AND password = ?
```
`username` and `password` are passed as **bound parameters**, not spliced
into the SQL text. The database driver sends the query and the values
separately — the value `' OR '1'='1' --` is compared literally, character
for character, against the `username` column. No row has that username, so
the query returns nothing and the login is correctly rejected.

---

## Case 2 — Search leak (`/models?q=...`)

**Code:** `queries/robots.js:1-15`, `searchRobots()`

**Vulnerable query template:**
```sql
SELECT * FROM robots WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'
```

**Payload** (paste into the search box):
```
zzz' UNION SELECT id, username, password, is_admin, secret_note FROM users --
```

**Resulting SQL actually executed:**
```sql
SELECT * FROM robots WHERE name LIKE '%zzz' UNION SELECT id, username, password, is_admin, secret_note FROM users --%' OR description LIKE '%zzz%'
```

**Why it works:** the `'` after `zzz` closes the `LIKE '%zzz` string early,
turning the rest of the payload into real SQL. `UNION SELECT` appends a
second, independent query onto the first — SQLite just requires both sides
of a `UNION` to return the **same number of columns**. The `robots` table
has 5 columns (`id, name, category, description, status`); the injected
`SELECT` also lists exactly 5 columns from `users`, so they line up:
`username` lands in the `name` column slot, `password` in `category`,
`is_admin` in `description`, `secret_note` in `status`. The trailing `--`
comments out the rest of the original query so it doesn't break. The page
renders the result table exactly as it would for a normal robot — except
every "robot" row is actually a user's credentials and secret note.

**Secure query:**
```sql
SELECT * FROM robots WHERE name LIKE ? OR description LIKE ?
```
The `%...%` wrapping happens in JavaScript *before* binding
(`` `%${q}%` ``), and the whole resulting string is bound as a single
parameter value — it can never be interpreted as SQL syntax, so there's no
way to inject a `UNION`. The payload is just a (very long, no match) search
string, and the result table comes back empty.

---

## Case 3 — Numeric lookup (`/models/view?id=...`)

**Code:** `queries/robots.js:17-27`, `getRobotById()`

**Vulnerable query template:**
```sql
SELECT * FROM robots WHERE id = ${id}
```

**Payload A — boolean injection** (put in the URL or the ID box):
```
1 OR 1=1
```
**Resulting SQL:**
```sql
SELECT * FROM robots WHERE id = 1 OR 1=1
```
`1=1` is always true, so every row in `robots` matches, regardless of `id`.

**Payload B — UNION injection** (same endpoint can leak user data too):
```
0 UNION SELECT id, username, password, is_admin, secret_note FROM users
```
**Resulting SQL:**
```sql
SELECT * FROM robots WHERE id = 0 UNION SELECT id, username, password, is_admin, secret_note FROM users
```

**Why it works:** this is a *numeric* context — `id` is never wrapped in
quotes — so the attacker doesn't even need a `'` to break out. Anything
placed after `id = ` becomes literal SQL as long as it's syntactically
valid. No quote-closing, no comment needed for Payload A since there's
nothing after it to invalidate. Payload B is the same UNION technique as
Case 2, just without needing to close a string literal first.

**Secure query:**
```sql
SELECT * FROM robots WHERE id = ?
```
`id` is bound as a parameter. SQLite applies the `id` column's `INTEGER`
type affinity: a well-formed numeric string would be coerced to a number,
but `"1 OR 1=1"` and `"0 UNION SELECT ..."` are not valid integers, so
they're compared as-is against an integer column and match nothing. The
payload is inert data, not code — the result table comes back empty.

---

## The one-line lesson

All three vulnerable queries share the same root cause: **untrusted input is
concatenated directly into the SQL string**, so the database can't tell the
difference between a value and an instruction. All three secure queries fix
it the same way: **bind input as parameters** and let the driver send it to
the database separately from the SQL text. Parameterized queries don't just
patch these three payloads — they eliminate the entire SQL injection class
for these queries, regardless of what the attacker tries.
