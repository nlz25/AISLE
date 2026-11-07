import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { Miniflare } from 'miniflare';
import worker, { digest } from './worker.js';

const site = 'https://aisle.science';
const project = 'https://testaisle.supabase.co';
const zip = Buffer.from(
  'UEsDBBQAAAAAAM2qZ11lxQx4EgAAABIAAAAKAAAAcmVzdWx0LmNzdnNhbXBsZSx2YWx1ZQoxLDQyClBLAQIUABQAAAAAAM2qZ11lxQx4EgAAABIAAAAKAAAAAAAAAAAAAACAAQAAAAByZXN1bHQuY3N2UEsFBgAAAAABAAEAOAAAADoAAAAAAA==',
  'base64',
);

test('GitHub OAuth, owner-scoped tasks and ZIPs, and administrator MFA', { timeout: 30000 }, async (t) => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response(null); } };',
    compatibilityDate: '2026-08-01',
    cf: false,
    d1Databases: ['DB'],
  });
  t.after(() => mf.dispose());
  const DB = await mf.getD1Database('DB');
  const accounts = ['owner', 'other', 'admin', 'legacy'].map((name) => ({
    id: crypto.randomUUID(),
    email: name + '@example.test',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    session: crypto.randomUUID(),
    factors: [],
  }));
  const env = {
    DB,
    SITE_ORIGIN: site,
    ADMIN_USER_IDS: accounts[2].id,
    SUPABASE_URL: project,
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SUPABASE_STORAGE_SECRET: 'sb_secret_test',
    SESSION_ENCRYPTION_KEY: 'b'.repeat(64),
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

  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'ES256', use: 'sig' };
  const authorized = new Map();
  const tokens = new Map();
  const objects = new Map();
  let rejectNextProof = false;

  const issue = async (account, aal, issuer = project + '/auth/v1') => {
    const token = await new SignJWT({
      aal,
      role: 'authenticated',
      session_id: account.session,
      app_metadata: { provider: 'github' },
    })
      .setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setIssuer(issuer)
      .setAudience('authenticated')
      .setSubject(account.id)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(privateKey);
    tokens.set(token, account);
    return token;
  };

  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const target = new URL(url);
    assert.equal(target.origin, project);
    const path = target.pathname;
    if (path.endsWith('/.well-known/jwks.json')) return Response.json({ keys: [jwk] });
    if (path.startsWith('/storage/v1/object')) {
      assert.equal(options.headers.apikey, env.SUPABASE_STORAGE_SECRET);
      const bucket = '/aisle-contribute-private';
      if (options.method === 'DELETE') {
        assert.equal(path, '/storage/v1/object' + bucket);
        for (const key of JSON.parse(options.body).prefixes) objects.delete(key);
        return Response.json([]);
      }
      const prefix =
        '/storage/v1/object' + (options.method === 'POST' ? '' : '/authenticated') + bucket + '/';
      assert.ok(path.startsWith(prefix));
      const key = path.slice(prefix.length);
      if (options.method === 'POST') {
        assert.equal(options.headers['x-upsert'], 'false');
        objects.set(key, Buffer.from(options.body));
        return Response.json({ Key: key });
      }
      return new Response(objects.get(key), { status: objects.has(key) ? 200 : 404 });
    }
    assert.equal(options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
    if (path === '/auth/v1/token') {
      assert.equal(target.searchParams.get('grant_type'), 'pkce');
      const { auth_code: code, code_verifier: verifier } = JSON.parse(options.body);
      const flow = authorized.get(code);
      authorized.delete(code);
      if (!flow || flow.challenge !== createHash('sha256').update(verifier).digest('base64url')) {
        return Response.json({}, { status: 400 });
      }
      return Response.json({
        user: flow.account,
        access_token: await issue(flow.account, 'aal1', flow.issuer),
      });
    }
    const account = tokens.get(options.headers.Authorization?.slice(7));
    assert.ok(account);
    if (path === '/auth/v1/user') return Response.json(account);
    if (path === '/auth/v1/factors') {
      const { factor_type } = JSON.parse(options.body);
      assert.equal(factor_type, 'totp');
      const factor = { id: crypto.randomUUID(), factor_type, status: 'unverified' };
      account.factors.push(factor);
      return Response.json({ id: factor.id, totp: { secret: 'ABCDEFGHIJKLMNOP' } });
    }
    const factor = account.factors.find((item) => path.startsWith('/auth/v1/factors/' + item.id));
    assert.ok(factor);
    if (path.endsWith('/challenge')) {
      factor.challenge = crypto.randomUUID();
      return Response.json({ id: factor.challenge });
    }
    if (path.endsWith('/verify')) {
      const data = JSON.parse(options.body);
      if (data.challenge_id !== factor.challenge || data.code !== '123456')
        return Response.json({}, { status: 400 });
      if (rejectNextProof) {
        rejectNextProof = false;
        return Response.json({ access_token: await issue(account, 'aal1') });
      }
      factor.status = 'verified';
      return Response.json({ access_token: await issue(account, 'aal2') });
    }
    if (options.method === 'DELETE') {
      account.factors = account.factors.filter((item) => item.id !== factor.id);
      return Response.json({ id: factor.id });
    }
    throw new Error('Unexpected provider request: ' + path);
  });

  async function request(path, options = {}) {
    const { method = 'GET', data, archive, cookie, origin = site } = options;
    const headers = new Headers({ 'CF-Connecting-IP': '192.0.2.1' });
    if (method !== 'GET') headers.set('Origin', origin);
    if (cookie) headers.set('Cookie', cookie);
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

  const cookiePair = (response, name) =>
    response.headers
      .getSetCookie()
      .find((value) => value.startsWith(name + '='))
      .split(';')[0];

  async function login(account, { issuer, expectedError } = {}) {
    const started = await expect(request('/auth/start', { method: 'POST', data: { kind: 'wet' } }), 200);
    const state = cookiePair(started, '__Host-aisle_oauth');
    const authorization = new URL((await started.json()).url);
    assert.equal(authorization.origin, project);
    assert.equal(authorization.searchParams.get('provider'), 'github');
    assert.equal(authorization.searchParams.get('redirect_to'), site + '/api/contribute/auth/callback');
    assert.equal(authorization.searchParams.get('code_challenge_method'), 's256');
    const code = crypto.randomUUID();
    authorized.set(code, { account, issuer, challenge: authorization.searchParams.get('code_challenge') });
    const callback = '/auth/callback?code=' + code;
    const withoutState = await expect(request(callback), 303);
    assert.equal(new URL(withoutState.headers.get('Location')).searchParams.get('auth'), 'failed');
    const response = await expect(request(callback, { cookie: state }), 303);
    const location = new URL(response.headers.get('Location'));
    assert.equal(location.pathname, '/contributor.html');
    assert.equal(location.searchParams.get('kind'), 'wet');
    assert.equal(location.searchParams.get('auth'), expectedError || null);
    const replayed = await expect(request(callback, { cookie: state }), 303);
    assert.equal(new URL(replayed.headers.get('Location')).searchParams.get('auth'), 'failed');
    if (expectedError) return;
    const cookie = cookiePair(response, '__Host-aisle_session');
    assert.match(response.headers.get('Set-Cookie'), /Secure; HttpOnly; SameSite=Lax; Path=\//);
    return cookie;
  }

  async function register(account) {
    const cookie = await login(account);
    const before = await (await expect(request('/me', { cookie }), 200)).json();
    assert.equal(before.profile_complete, false);
    assert.equal(before.user.email, account.email);
    assert.equal(before.user.provider_token, undefined);
    await expect(request('/tasks', { cookie }), 403);
    const saved = await expect(
      request('/me/profile', {
        cookie,
        method: 'PATCH',
        data: { name: account.email.split('@')[0], organization: 'Test lab', email: 'wrong' },
      }),
      200,
    );
    const { user, profile_complete: complete } = await saved.json();
    assert.equal(complete, true);
    assert.equal(user.email, account.email);
    assert.equal(user.organization, 'Test lab');
    return { cookie, user };
  }

  await expect(request('/tasks'), 401);
  await expect(request('/auth/start', { method: 'POST', data: {}, origin: 'https://evil.example' }), 403);
  await login(accounts[0], { issuer: 'https://other.supabase.co/auth/v1', expectedError: 'failed' });
  await DB.prepare(
    "INSERT INTO users (id,email,name,organization,created_at) VALUES ('legacy',?,'Old','Lab',0)",
  )
    .bind(accounts[3].email)
    .run();
  await login(accounts[3], { expectedError: 'account' });
  await DB.prepare("DELETE FROM users WHERE id='legacy'").run();
  const owner = await register(accounts[0]);
  const other = await register(accounts[1]);
  const reviewer = await register(accounts[2]);
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
  assert.equal(objects.size, 1);
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

  await expect(request('/admin/users'), 401);
  await expect(request('/admin/users', { cookie: owner.cookie }), 403);
  await expect(request('/auth/mfa/enroll', { cookie: owner.cookie, method: 'POST' }), 403);
  await expect(request('/admin/users', { cookie: reviewer.cookie }), 403);
  const setup = await expect(request('/auth/mfa/enroll', { cookie: reviewer.cookie, method: 'POST' }), 200);
  assert.equal((await setup.json()).secret, 'ABCDEFGHIJKLMNOP');
  await expect(request('/admin/users', { cookie: reviewer.cookie }), 403);
  const verify = (code) =>
    request('/auth/mfa/verify', {
      cookie: reviewer.cookie,
      method: 'POST',
      data: { code },
    });
  await expect(verify('654321'), 400);
  rejectNextProof = true;
  await expect(verify('123456'), 403);
  await expect(request('/admin/users', { cookie: reviewer.cookie }), 403);
  const admin = { cookie: cookiePair(await expect(verify('123456'), 200), '__Host-aisle_session') };
  await expect(request('/admin/users', { cookie: reviewer.cookie }), 401);
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
  await login(accounts[0], { expectedError: 'disabled' });
  await DB.prepare('UPDATE sessions SET mfa_until=0 WHERE hash=?')
    .bind(await digest(admin.cookie.split('=')[1]))
    .run();
  await expect(request('/admin/users', admin), 403);
});
