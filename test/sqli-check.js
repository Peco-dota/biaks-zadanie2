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
