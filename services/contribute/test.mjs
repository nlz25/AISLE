import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Miniflare } from 'miniflare';
import worker, { digest } from './worker.js';

const site = 'https://aisle.science';
const team = 'https://test-aisle.cloudflareaccess.com';
const audience = 'contribute-admin-test';
const zip = Buffer.from(
  'UEsDBBQAAAAAAM2qZ11lxQx4EgAAABIAAAAKAAAAcmVzdWx0LmNzdnNhbXBsZSx2YWx1ZQoxLDQyClBLAQIUABQAAAAAAM2qZ11lxQx4EgAAABIAAAAKAAAAAAAAAAAAAACAAQAAAAByZXN1bHQuY3N2UEsFBgAAAAABAAEAOAAAADoAAAAAAA==',
  'base64',
);

test('registration, owner-scoped tasks and ZIPs, and administrator access', { timeout: 30000 }, async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response(null); } };',
    compatibilityDate: '2026-08-01',
    cf: false,
    d1Databases: ['DB'],
    r2Buckets: ['PACKAGES'],
  });
  t.after(() => mf.dispose());
  const DB = await mf.getD1Database('DB');
  const PACKAGES = await mf.getR2Bucket('PACKAGES');
  const env = {
    DB,
    PACKAGES,
    SITE_ORIGIN: site,
    ADMIN_EMAILS: 'admin@example.test',
    ACCESS_TEAM_DOMAIN: new URL(team).hostname,
    ACCESS_AUD: audience,
    RESEND_API_KEY: 'test-secret',
    MAIL_FROM: 'AISLE <test@example.test>',
    TURNSTILE_SECRET: 'test-secret',
  };
  const migrations = new URL('./migrations/', import.meta.url);
  for (const file of (await readdir(migrations)).sort()) {
    const sql = await readFile(new URL(file, migrations), 'utf8');
    const statements = sql
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean);
    await DB.batch(statements.map((statement) => DB.prepare(statement)));
  }

  const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256', use: 'sig' };
  const access = (email, aud = audience, exp = '5m') =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(team)
      .setAudience(aud)
      .setSubject('test-admin')
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(privateKey);

  const sent = new Map();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url) === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      return Response.json({
        success: options.body.get('response') === 'valid-captcha',
        hostname: 'aisle.science',
        action: 'contribute-login',
      });
    }
    if (String(url) === 'https://api.resend.com/emails') {
      const mail = JSON.parse(options.body);
      const link = mail.text.match(/https:\/\/\S+/)?.[0];
      sent.set(mail.to[0], new URL(link));
      return Response.json({ id: 'test-mail' });
    }
    if (String(url) === team + '/cdn-cgi/access/certs') return Response.json({ keys: [jwk] });
    throw new Error('Unexpected external request: ' + url);
  });

  async function request(path, options = {}) {
    const { method = 'GET', data, archive, cookie, assertion, origin = site } = options;
    const headers = new Headers({ 'CF-Connecting-IP': '192.0.2.1' });
    if (method !== 'GET') headers.set('Origin', origin);
    if (cookie) headers.set('Cookie', cookie);
    if (assertion) headers.set('Cf-Access-Jwt-Assertion', assertion);
    if (data !== undefined) headers.set('Content-Type', 'application/json');
    if (archive) headers.set('Content-Type', 'application/zip');
    return worker.fetch(
      new Request(site + '/api/contribute' + path, {
        method,
        headers,
        body: archive ?? (data === undefined ? undefined : JSON.stringify(data)),
      }),
      env,
    );
  }

  async function expect(response, status) {
    const result = await response;
    assert.equal(result.status, status, result.status !== status ? await result.clone().text() : undefined);
    return result;
  }

  async function register(email) {
    const data = {
      email,
      name: email.split('@')[0],
      organization: 'Test lab',
      turnstile: 'valid-captcha',
      kind: 'wet',
    };
    await expect(request('/auth/request', { method: 'POST', data }), 200);
    assert.equal(sent.get(email).searchParams.get('kind'), 'wet');
    const token = new URLSearchParams(sent.get(email).hash.slice(1)).get('token');
    const stored = await DB.prepare('SELECT hash FROM login_tokens WHERE email=?').bind(email).first();
    assert.equal(stored.hash, await digest(token));
    const verify = () => request('/auth/verify', { method: 'POST', data: { token } });
    const [response, duplicate] = (await Promise.all([verify(), verify()])).sort(
      (a, b) => a.status - b.status,
    );
    await expect(response, 200);
    await expect(duplicate, 401);
    const header = response.headers.get('Set-Cookie');
    assert.match(header, /Secure; HttpOnly; SameSite=Lax; Path=\//);
    const { user } = await response.json();
    assert.equal(user.organization, 'Test lab');
    return { user, cookie: header.split(';')[0] };
  }

  await expect(request('/tasks'), 401);
  await expect(
    request('/auth/request', {
      method: 'POST',
      data: { email: 'spam@example.test', turnstile: 'invalid' },
    }),
    400,
  );
  assert.equal(sent.size, 0);
  const owner = await register('owner@example.test');
  const other = await register('other@example.test');
  const reviewer = await register('admin@example.test');
  const data = { kind: 'wet', title: '<img src=x>', description: 'Full experiment package' };
  await expect(
    request('/tasks', { method: 'POST', data, cookie: owner.cookie, origin: 'https://evil.example' }),
    403,
  );
  const created = await expect(request('/tasks', { method: 'POST', data, cookie: owner.cookie }), 201);
  const { id } = await created.json();
  const path = '/tasks/' + id;
  await expect(request(path + '/submit', { method: 'POST', cookie: owner.cookie }), 400);
  await expect(
    request(path + '/package', { method: 'PUT', cookie: owner.cookie, archive: zip.subarray(0, 25) }),
    400,
  );
  await expect(request(path + '/package', { method: 'PUT', cookie: other.cookie, archive: zip }), 404);
  await expect(request(path + '/package', { method: 'PUT', cookie: owner.cookie, archive: zip }), 200);
  await expect(request(path + '/package', { method: 'PUT', cookie: owner.cookie, archive: zip }), 200);
  await DB.prepare('UPDATE package_gc SET delete_after=0').run();
  await worker.scheduled({}, env);
  assert.equal((await PACKAGES.list()).objects.length, 1);
  await expect(request(path + '/package', { cookie: other.cookie }), 404);
  const download = await expect(request(path + '/package', { cookie: owner.cookie }), 200);
  assert.match(download.headers.get('Content-Disposition'), /^attachment;/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), zip);
  await expect(request(path + '/submit', { method: 'POST', cookie: owner.cookie }), 200);
  await expect(request(path + '/package', { method: 'PUT', cookie: owner.cookie, archive: zip }), 409);
  await expect(
    request(path, { method: 'PATCH', cookie: owner.cookie, data: { title: 'Changed title' } }),
    409,
  );
  const listed = await (await request('/tasks', { cookie: owner.cookie })).json();
  assert.equal(listed.tasks[0].package_key, undefined);
  assert.equal(listed.tasks[0].status, 'submitted');

  const assertion = await access(reviewer.user.email);
  const admin = { cookie: reviewer.cookie, assertion };
  await expect(request('/admin/users', { assertion }), 401);
  await expect(request('/admin/users', { cookie: owner.cookie, assertion }), 403);
  await expect(request('/admin/users', { cookie: reviewer.cookie }), 403);
  await expect(
    request('/admin/users', { ...admin, assertion: assertion.replace(/\.[^.]+$/, '.invalid') }),
    403,
  );
  await expect(request('/admin/users', { ...admin, assertion: await access(owner.user.email) }), 403);
  await expect(
    request('/admin/users', { ...admin, assertion: await access(reviewer.user.email, 'wrong') }),
    403,
  );
  await expect(
    request('/admin/users', { ...admin, assertion: await access(reviewer.user.email, audience, '0s') }),
    403,
  );
  const users = await (await expect(request('/admin/users', admin), 200)).json();
  assert.equal(users.users.length, 3);
  const adminPackage = await expect(request('/admin' + path + '/package', admin), 200);
  assert.deepEqual(Buffer.from(await adminPackage.arrayBuffer()), zip);
  await expect(
    request('/admin' + path, {
      ...admin,
      method: 'PATCH',
      data: { status: 'accepted', revision: listed.tasks[0].revision - 1 },
    }),
    409,
  );
  await expect(
    request('/admin' + path, {
      ...admin,
      method: 'PATCH',
      data: { status: 'accepted', revision: listed.tasks[0].revision },
    }),
    200,
  );
  await expect(
    request(path, {
      cookie: owner.cookie,
      method: 'PATCH',
      data: { notice: 'Access by appointment' },
    }),
    200,
  );
  await expect(
    request('/admin/users/' + owner.user.id, {
      ...admin,
      method: 'PATCH',
      data: { disabled: true },
    }),
    200,
  );
  await expect(request('/me', { cookie: owner.cookie }), 401);

  const dry = await expect(
    request('/tasks', {
      cookie: other.cookie,
      method: 'POST',
      data: { ...data, kind: 'dry', title: 'Computational task' },
    }),
    201,
  );
  const dryPath = '/tasks/' + (await dry.json()).id;
  await expect(request(dryPath + '/submit', { cookie: other.cookie, method: 'POST' }), 400);
  await expect(
    request(dryPath, {
      cookie: other.cookie,
      method: 'PATCH',
      data: { pr_url: 'https://github.com.evil.example/aisle/tasks/pull/1' },
    }),
    400,
  );
  await expect(
    request(dryPath, {
      cookie: other.cookie,
      method: 'PATCH',
      data: { pr_url: 'https://github.com/aisle/tasks/pull/1' },
    }),
    200,
  );
  await expect(request(dryPath + '/submit', { cookie: other.cookie, method: 'POST' }), 200);
  await expect(request('/auth/logout', { method: 'POST', cookie: other.cookie }), 200);
  await expect(request('/me', { cookie: other.cookie }), 401);
  const audit = await DB.prepare(
    "SELECT COUNT(*) AS count FROM audit_log WHERE action IN ('task.accepted','user.disable','package.download')",
  ).first();
  assert.equal(audit.count, 3);
});
