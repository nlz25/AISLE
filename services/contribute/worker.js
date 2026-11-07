import {
  authConfigured,
  authRequest,
  verifiedClaims,
  openToken,
  sealToken,
  uuid,
  putPackage,
  getPackage,
  deletePackages,
} from './supabase.js';
const PREFIX = '/api/contribute',
  COOKIE = '__Host-aisle_session',
  MAX_ZIP = 25 * 1024 * 1024;
const now = () => Math.floor(Date.now() / 1000);
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, '0')).join('');
export const digest = async (text) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
class Failure extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (code, message) => {
  throw new Failure(code, message);
};
const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...headers,
    },
  });
function text(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    fail(400, 'Invalid or missing field.');
  return value.trim();
}
export function validPR(value) {
  try {
    const u = new URL(value);
    return (
      u.origin === 'https://github.com' &&
      !u.username &&
      !u.password &&
      !u.search &&
      !u.hash &&
      /^\/[^/]+\/[^/]+\/pull\/[1-9]\d*\/?$/.test(u.pathname)
    );
  } catch {
    return false;
  }
}
export function lab(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Invalid lab settings.');
  const days = value.days;
  if (
    !Array.isArray(days) ||
    days.some((d) => !['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(d))
  )
    fail(400, 'Invalid operating days.');
  if (!['Open for experiments', 'By appointment', 'Temporarily unavailable'].includes(value.status))
    fail(400, 'Invalid lab status.');
  try {
    Intl.DateTimeFormat('en', { timeZone: value.timezone });
  } catch {
    fail(400, 'Invalid time zone.');
  }
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.end) ||
    value.start >= value.end
  )
    fail(400, 'Invalid operating hours.');
  if (value.status === 'Open for experiments' && !days.length) fail(400, 'Choose operating days.');
  return {
    name: text(value.name, 120),
    status: value.status,
    days: [...new Set(days)],
    start: value.start,
    end: value.end,
    timezone: text(value.timezone, 80),
    note: text(value.note ?? '', 2000, false),
  };
}
async function bytes(req, limit) {
  const declared = Number(req.headers.get('Content-Length'));
  if (declared > limit) fail(413, 'File or request is too large.');
  if (!req.body) fail(400, 'Empty body.');
  const reader = req.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        fail(413, 'File or request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
async function body(req) {
  if (req.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json')
    fail(415, 'Expected JSON.');
  try {
    const data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await bytes(req, 65536)));
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, 'Expected a JSON object.');
    return data;
  } catch (e) {
    if (e instanceof Failure) throw e;
    fail(400, 'Invalid JSON.');
  }
}
async function rate(env, key, limit) {
  const slot = Math.floor(now() / 3600);
  const row = await env.DB.prepare(
    'INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
  )
    .bind(await digest(`${key}:${slot}`), now() + 7200)
    .first();
  if (row.count > limit) fail(429, 'Too many requests. Please try again later.');
}
const oauthCookie = '__Host-aisle_oauth';
const secureCookie = (name, value, seconds) =>
  name + '=' + value + '; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=' + seconds;

function cookie(req, name) {
  const match = req.headers
    .get('Cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + '='));
  const value = match?.slice(name.length + 1);
  return /^[a-f0-9]{64}$/.test(value || '') ? value : null;
}

async function user(req, env) {
  const token = cookie(req, COOKIE);
  if (!token) fail(401, 'Please sign in.');
  const u = await env.DB.prepare(
    'SELECT u.*, s.hash AS session_hash, s.expires_at AS session_expiry, s.mfa_until, s.provider_token, s.mfa_enrollment ' +
      'FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.hash=? AND s.expires_at>? AND u.disabled=0 ' +
      'AND u.auth_subject IS NOT NULL AND s.provider_token IS NOT NULL',
  )
    .bind(await digest(token), now())
    .first();
  if (!u) fail(401, 'Session expired. Please sign in.');
  return u;
}

function adminEligible(env, u) {
  return (env.ADMIN_USER_IDS || '')
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .includes(u.auth_subject.toLowerCase());
}

function userResponse(env, u) {
  return {
    user: { id: u.id, email: u.email, name: u.name, organization: u.organization },
    profile_complete: Boolean(u.name && u.organization),
    admin_eligible: adminEligible(env, u),
    admin_verified: adminEligible(env, u) && u.mfa_until > now(),
  };
}

function workspaceRedirect(env, track, error, sessionCookie) {
  const target = new URL('/contributor.html', env.SITE_ORIGIN);
  if (track) target.searchParams.set('kind', track);
  if (error) target.searchParams.set('auth', error);
  const headers = new Headers({
    Location: target.href,
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
  });
  headers.append('Set-Cookie', secureCookie(oauthCookie, '', 0));
  if (sessionCookie) headers.append('Set-Cookie', sessionCookie);
  return new Response(null, { status: 303, headers });
}

async function startLogin(req, env) {
  if (!authConfigured(env)) fail(503, 'GitHub sign-in is not configured yet.');
  await rate(env, 'oauth-start:' + req.headers.get('CF-Connecting-IP'), 20);
  const { kind } = await body(req);
  const track = ['dry', 'wet'].includes(kind) ? kind : '';
  const state = random(),
    verifier = random();
  const hashed = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const challenge = btoa(String.fromCharCode(...hashed))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  const authorize = new URL('/auth/v1/authorize', env.SUPABASE_URL);
  authorize.search = new URLSearchParams({
    provider: 'github',
    redirect_to: new URL(PREFIX + '/auth/callback', env.SITE_ORIGIN).href,
    code_challenge: challenge,
    code_challenge_method: 's256',
  });
  await env.DB.prepare('INSERT INTO oauth_attempts VALUES (?,?,?,?)')
    .bind(await digest(state), verifier, track, now() + 600)
    .run();
  return json({ url: authorize.href }, 200, { 'Set-Cookie': secureCookie(oauthCookie, state, 600) });
}

async function completeLogin(req, env, url) {
  const state = cookie(req, oauthCookie);
  if (!state || !authConfigured(env)) return workspaceRedirect(env, '', 'failed');
  const attempt = await env.DB.prepare('DELETE FROM oauth_attempts WHERE hash=? AND expires_at>? RETURNING *')
    .bind(await digest(state), now())
    .first();
  if (!attempt) return workspaceRedirect(env, '', 'failed');
  const code = url.searchParams.get('code');
  if (url.searchParams.has('error') || !code || code.length > 512) {
    return workspaceRedirect(env, attempt.track, 'failed');
  }
  try {
    const exchange = await authRequest(env, '/token?grant_type=pkce', {
      method: 'POST',
      data: { auth_code: code, code_verifier: attempt.verifier },
    });
    if (!exchange.ok) return workspaceRedirect(env, attempt.track, 'failed');
    const { access_token: token, user: account } = await exchange.json();
    const claims = await verifiedClaims(env, token);
    const email = typeof account?.email === 'string' ? account.email.trim().toLowerCase() : '';
    if (
      account?.id !== claims.sub ||
      !account.email_confirmed_at ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return workspaceRedirect(env, attempt.track, 'failed');
    }
    await env.DB.prepare(
      "INSERT OR IGNORE INTO users (id,email,name,organization,created_at,auth_subject) VALUES (?,?,'','',?,?)",
    )
      .bind(crypto.randomUUID(), email, now(), claims.sub)
      .run();
    const u = await env.DB.prepare('SELECT id,disabled FROM users WHERE auth_subject=?')
      .bind(claims.sub)
      .first();
    // Existing email-based accounts need an explicit identity mapping, never automatic linking.
    if (!u) return workspaceRedirect(env, attempt.track, 'account');
    if (u.disabled) return workspaceRedirect(env, attempt.track, 'disabled');
    const session = random();
    const expires = Math.min(claims.exp, now() + 3600);
    const old = cookie(req, COOKIE);
    const statements = [
      env.DB.prepare(
        'INSERT INTO sessions (hash,user_id,expires_at,provider_token) SELECT ?,id,?,? FROM users WHERE id=? AND disabled=0',
      ).bind(await digest(session), expires, await sealToken(env, token), u.id),
    ];
    if (old) statements.push(env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(await digest(old)));
    const [inserted] = await env.DB.batch(statements);
    if (!inserted.meta.changes) return workspaceRedirect(env, attempt.track, 'disabled');
    return workspaceRedirect(env, attempt.track, null, secureCookie(COOKIE, session, expires - now()));
  } catch {
    return workspaceRedirect(env, attempt.track, 'failed');
  }
}

async function factorsFor(env, u) {
  const token = await openToken(env, u.provider_token);
  const response = await authRequest(env, '/user', { token });
  if (!response.ok) fail(401, 'Your GitHub session expired. Sign in again.');
  const account = await response.json();
  if (account.id !== u.auth_subject) fail(403, 'Unexpected account.');
  const factors = (account.factors || []).filter((f) => f.factor_type === 'totp' && uuid.test(f.id));
  return { token, factors, verified: factors.find((f) => f.status === 'verified') };
}

async function adminMfa(req, env, u, path) {
  if (!adminEligible(env, u)) fail(403, 'Administrator access required.');
  if (!u.name || !u.organization) fail(403, 'Complete your contributor profile first.');
  if (req.method === 'GET' && path === '/auth/mfa') {
    const { verified } = await factorsFor(env, u);
    return json({ enrolled: Boolean(verified) });
  }
  if (req.method !== 'POST') fail(405, 'Method not allowed.');
  await rate(env, 'mfa:' + u.id, 12);
  const { token, factors, verified } = await factorsFor(env, u);
  if (path === '/auth/mfa/enroll') {
    if (verified) fail(409, 'An authenticator is already set up.');
    // Discard pending setup for this account. Verified factors are managed by the project owner.
    for (const factor of factors.filter((f) => f.status === 'unverified')) {
      const removed = await authRequest(env, '/factors/' + factor.id, { method: 'DELETE', token });
      if (!removed.ok) fail(409, 'Authenticator setup changed. Reload and try again.');
    }
    const result = await authRequest(env, '/factors', {
      method: 'POST',
      token,
      data: { factor_type: 'totp', issuer: 'AISLE' },
    });
    if (!result.ok) fail(503, 'Could not start authenticator setup.');
    const factor = await result.json();
    if (!uuid.test(factor.id) || !/^[A-Z2-7]+=*$/i.test(factor.totp?.secret || ''))
      fail(503, 'Unexpected authenticator setup response.');
    const updated = await env.DB.prepare('UPDATE sessions SET mfa_enrollment=? WHERE hash=? AND expires_at>?')
      .bind(factor.id, u.session_hash, now())
      .run();
    if (!updated.meta.changes) fail(401, 'Session expired. Please sign in.');
    return json({ secret: factor.totp.secret });
  }
  if (path !== '/auth/mfa/verify') fail(404, 'Not found.');
  const { code } = await body(req);
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) fail(400, 'Enter your six-digit code.');
  const factor = verified || factors.find((f) => f.id === u.mfa_enrollment && f.status === 'unverified');
  if (!factor) fail(409, 'Set up your authenticator first.');
  const factorPath = '/factors/' + factor.id;
  const challenged = await authRequest(env, factorPath + '/challenge', { method: 'POST', token, data: {} });
  if (!challenged.ok) fail(400, 'Could not verify your code. Try again.');
  const challenge = await challenged.json();
  if (!uuid.test(challenge.id)) fail(503, 'Unexpected authenticator challenge.');
  const result = await authRequest(env, factorPath + '/verify', {
    method: 'POST',
    token,
    data: { challenge_id: challenge.id, code },
  });
  if (!result.ok) fail(400, 'Incorrect or expired authenticator code.');
  const { access_token: elevated } = await result.json();
  const before = await verifiedClaims(env, token);
  const after = await verifiedClaims(env, elevated);
  if (after.sub !== u.auth_subject || after.session_id !== before.session_id || after.aal !== 'aal2') {
    fail(403, 'Authenticator verification could not be confirmed.');
  }
  const session = random();
  const expires = Math.min(u.session_expiry, after.exp);
  const [updated] = await env.DB.batch([
    env.DB.prepare(
      'UPDATE sessions SET hash=?, provider_token=?, mfa_until=?, expires_at=?, mfa_enrollment=NULL ' +
        'WHERE hash=? AND expires_at>? AND EXISTS(SELECT 1 FROM users WHERE id=? AND disabled=0)',
    ).bind(
      await digest(session),
      await sealToken(env, elevated),
      Math.min(expires, now() + 900),
      expires,
      u.session_hash,
      now(),
      u.id,
    ),
    env.DB.prepare('INSERT INTO audit_log SELECT ?,?,?,?,? WHERE changes()=1').bind(
      crypto.randomUUID(),
      u.id,
      'admin.mfa',
      u.id,
      now(),
    ),
  ]);
  if (!updated.meta.changes) fail(401, 'Session expired. Please sign in.');
  return json({ ok: true }, 200, { 'Set-Cookie': secureCookie(COOKIE, session, expires - now()) });
}

const audit = (env, u, action, id) =>
  env.DB.prepare('INSERT INTO audit_log VALUES (?,?,?,?,?)')
    .bind(crypto.randomUUID(), u.id, action, id, now())
    .run();
const safeTask = (t) => ({
  ...t,
  package_key: undefined,
  has_package: !!t.package_key,
  lab: JSON.parse(t.lab_json),
  lab_json: undefined,
});
const editableStates = ['draft', 'changes_requested'];

async function route(req, env) {
  const url = new URL(req.url),
    p = url.pathname.slice(PREFIX.length),
    method = req.method;
  if (!url.pathname.startsWith(PREFIX + '/')) fail(404, 'Not found.');
  if (url.origin !== env.SITE_ORIGIN) fail(403, 'Invalid host.');
  if (!['GET', 'HEAD'].includes(method) && req.headers.get('Origin') !== env.SITE_ORIGIN)
    fail(403, 'Invalid request origin.');
  if (method === 'GET' && p === '/config') return json({ github_sign_in: authConfigured(env) });
  if (method === 'POST' && p === '/auth/start') return startLogin(req, env);
  if (method === 'GET' && p === '/auth/callback') return completeLogin(req, env, url);
  const u = await user(req, env);
  if (method === 'GET' && p === '/me') return json(userResponse(env, u));
  if (method === 'POST' && p === '/auth/logout') {
    await env.DB.prepare('DELETE FROM sessions WHERE hash=?').bind(u.session_hash).run();
    return json({ ok: true }, 200, { 'Set-Cookie': secureCookie(COOKIE, '', 0) });
  }
  if (method === 'PATCH' && p === '/me/profile') {
    await rate(env, 'write:' + u.id, 60);
    const b = await body(req);
    const name = text(b.name, 120),
      organization = text(b.organization, 200);
    await env.DB.prepare('UPDATE users SET name=?,organization=? WHERE id=?')
      .bind(name, organization, u.id)
      .run();
    return json(userResponse(env, { ...u, name, organization }));
  }
  if (p === '/auth/mfa' || p === '/auth/mfa/enroll' || p === '/auth/mfa/verify')
    return adminMfa(req, env, u, p);
  if (!u.name || !u.organization) fail(403, 'Complete your contributor profile first.');
  if (method !== 'GET') await rate(env, 'write:' + u.id, 60);
  if (p.startsWith('/admin/')) {
    if (!adminEligible(env, u) || u.mfa_until <= now()) fail(403, 'Administrator verification required.');
    const page = Math.floor(Math.max(0, Math.min(10000, Number(url.searchParams.get('page')) || 0)));
    if (method === 'GET' && p === '/admin/users') {
      await audit(env, u, 'users.list', '');
      const { results } = await env.DB.prepare(
        'SELECT * FROM users ORDER BY created_at DESC,id LIMIT 51 OFFSET ?',
      )
        .bind(page * 50)
        .all();
      return json({ users: results.slice(0, 50), has_more: results.length > 50, viewer_id: u.id });
    }
    if (method === 'GET' && p === '/admin/tasks') {
      await audit(env, u, 'tasks.list', '');
      const { results } = await env.DB.prepare(
        'SELECT t.*,u.email,u.organization FROM tasks t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC,t.id LIMIT 51 OFFSET ?',
      )
        .bind(page * 50)
        .all();
      return json({ tasks: results.slice(0, 50).map(safeTask), has_more: results.length > 50 });
    }
    let m = p.match(/^\/admin\/users\/([\w-]+)$/);
    if (method === 'PATCH' && m) {
      const b = await body(req);
      if (typeof b.disabled !== 'boolean' || m[1] === u.id) fail(400, 'Invalid account change.');
      const [updated] = await env.DB.batch([
        env.DB.prepare('UPDATE users SET disabled=? WHERE id=?').bind(+b.disabled, m[1]),
        env.DB.prepare('INSERT INTO audit_log SELECT ?,?,?,?,? WHERE changes()=1').bind(
          crypto.randomUUID(),
          u.id,
          b.disabled ? 'user.disable' : 'user.enable',
          m[1],
          now(),
        ),
        env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(m[1]),
        env.DB.prepare('DELETE FROM login_tokens WHERE email=(SELECT email FROM users WHERE id=?)').bind(
          m[1],
        ),
      ]);
      if (!updated.meta.changes) fail(404, 'Account not found.');
      return json({ ok: true });
    }
    m = p.match(/^\/admin\/tasks\/([\w-]+)(\/package)?$/);
    if (m) {
      const t = await env.DB.prepare('SELECT * FROM tasks WHERE id=?').bind(m[1]).first();
      if (!t) fail(404, 'Task not found.');
      if (method === 'GET' && m[2]) {
        await audit(env, u, 'package.download', t.id);
        return download(env, t);
      }
      if (method === 'PATCH' && !m[2]) {
        const b = await body(req);
        if (
          !['in_review', 'changes_requested', 'accepted', 'rejected'].includes(b.status) ||
          !['submitted', 'in_review', 'accepted', 'rejected'].includes(t.status)
        )
          fail(400, 'Invalid review transition.');
        if (b.revision !== t.revision) fail(409, 'Task changed. Reload and try again.');
        const [updated] = await env.DB.batch([
          env.DB.prepare(
            'UPDATE tasks SET status=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?',
          ).bind(b.status, now(), t.id, t.revision),
          env.DB.prepare('INSERT INTO audit_log SELECT ?,?,?,?,? WHERE changes()=1').bind(
            crypto.randomUUID(),
            u.id,
            'task.' + b.status,
            t.id,
            now(),
          ),
        ]);
        if (!updated.meta.changes) fail(409, 'Task changed. Reload and try again.');
        return json({ ok: true });
      }
    }
    fail(404, 'Not found.');
  }
  if (p === '/tasks' && method === 'GET')
    return json({
      tasks: (
        await env.DB.prepare('SELECT * FROM tasks WHERE user_id=? ORDER BY created_at DESC,id')
          .bind(u.id)
          .all()
      ).results.map(safeTask),
    });
  if (p === '/tasks' && method === 'POST') {
    const b = await body(req);
    if (!['dry', 'wet'].includes(b.kind)) fail(400, 'Invalid task type.');
    const id = `AISLE-${b.kind === 'dry' ? 'DL' : 'WL'}-${crypto.randomUUID()}`;
    const inserted = await env.DB.prepare(
      'INSERT INTO tasks(id,user_id,kind,title,description,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM tasks WHERE user_id=?)<100',
    )
      .bind(id, u.id, b.kind, text(b.title, 160), text(b.description, 5000), now(), now(), u.id)
      .run();
    if (!inserted.meta.changes) fail(409, 'Task limit reached. Contact AISLE.');
    return json({ id }, 201);
  }
  const match = p.match(/^\/tasks\/([\w-]+)(\/(package|submit))?$/);
  if (!match) fail(404, 'Not found.');
  const task = await env.DB.prepare('SELECT * FROM tasks WHERE id=? AND user_id=?')
    .bind(match[1], u.id)
    .first();
  if (!task) fail(404, 'Task not found.');
  if (method === 'GET' && match[3] === 'package') return download(env, task);
  if (method === 'PUT' && match[3] === 'package') {
    if (task.kind !== 'wet' || !editableStates.includes(task.status))
      fail(409, 'This task is not accepting a package.');
    if (req.headers.get('Content-Type') !== 'application/zip') fail(415, 'Upload a ZIP file.');
    const data = await bytes(req, MAX_ZIP);
    if (!hasZipDirectory(data)) fail(400, 'Expected a non-empty ZIP archive.');
    const key = `quarantine/${u.id}/${task.id}/${crypto.randomUUID()}.zip`;
    // Track incomplete uploads before writing to object storage, whose writes are separate from D1.
    await env.DB.prepare('INSERT INTO package_gc VALUES (?,?)')
      .bind(key, now() + 86400)
      .run();
    await putPackage(env, key, data);
    const statements = [
      env.DB.prepare(
        "UPDATE tasks SET package_key=?,package_size=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=? AND status IN ('draft','changes_requested')",
      ).bind(key, data.length, now(), task.id, u.id, task.revision),
      env.DB.prepare(
        'DELETE FROM package_gc WHERE key=? AND EXISTS(SELECT 1 FROM tasks WHERE package_key=?)',
      ).bind(key, key),
    ];
    if (task.package_key)
      statements.push(
        env.DB.prepare(
          'INSERT OR IGNORE INTO package_gc SELECT ?,? WHERE EXISTS(SELECT 1 FROM tasks WHERE package_key=?)',
        ).bind(task.package_key, now() + 3600, key),
      );
    const [result] = await env.DB.batch(statements);
    if (!result.meta.changes) fail(409, 'Task changed. Reload and try again.');
    return json({ ok: true });
  }
  if (method === 'PATCH' && !match[3]) {
    const b = await body(req);
    if (
      (b.title !== undefined || b.description !== undefined || b.pr_url !== undefined) &&
      !editableStates.includes(task.status)
    )
      fail(409, 'Submission details are locked during and after review.');
    if (task.kind !== 'wet' && (b.lab !== undefined || b.notice !== undefined))
      fail(400, 'Lab availability belongs to Wet Lab tasks.');
    if (task.kind !== 'dry' && b.pr_url !== undefined) fail(400, 'Pull requests belong to Dry Lab tasks.');
    const title = b.title === undefined ? task.title : text(b.title, 160),
      description = b.description === undefined ? task.description : text(b.description, 5000);
    const pr = b.pr_url === undefined ? task.pr_url : text(b.pr_url, 500, false);
    if (pr && !validPR(pr)) fail(400, 'Enter a GitHub pull request URL.');
    const l = b.lab === undefined ? task.lab_json : JSON.stringify(lab(b.lab));
    const result = await env.DB.prepare(
      'UPDATE tasks SET title=?,description=?,pr_url=?,lab_json=?,notice=?,updated_at=?,revision=revision+1 WHERE id=? AND user_id=? AND revision=?',
    )
      .bind(
        title,
        description,
        pr,
        l,
        b.notice === undefined ? task.notice : text(b.notice, 2000, false),
        now(),
        task.id,
        u.id,
        task.revision,
      )
      .run();
    if (!result.meta.changes) fail(409, 'Task changed. Reload and try again.');
    return json({ ok: true });
  }
  if (method === 'POST' && match[3] === 'submit') {
    if (!editableStates.includes(task.status)) fail(409, 'Task is already submitted.');
    if ((task.kind === 'wet' && !task.package_key) || (task.kind === 'dry' && !validPR(task.pr_url)))
      fail(400, 'Attach your ZIP package or GitHub PR before submitting.');
    const result = await env.DB.prepare(
      "UPDATE tasks SET status='submitted',updated_at=?,revision=revision+1 WHERE id=? AND user_id=? AND revision=?",
    )
      .bind(now(), task.id, u.id, task.revision)
      .run();
    if (!result.meta.changes) fail(409, 'Task changed. Reload and try again.');
    return json({ ok: true });
  }
  fail(405, 'Method not allowed.');
}

// Check the ZIP envelope without opening or extracting untrusted entries.
function hasZipDirectory(data) {
  if (data.length < 22) return false;
  const zip = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (zip.getUint32(0, true) !== 0x04034b50) return false;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 22 - 65535); i--) {
    if (zip.getUint32(i, true) !== 0x06054b50 || i + 22 + zip.getUint16(i + 20, true) !== data.length)
      continue;
    const directory = zip.getUint32(i + 16, true);
    return (
      zip.getUint16(i + 10, true) > 0 &&
      directory + 46 <= i &&
      directory + zip.getUint32(i + 12, true) <= i &&
      zip.getUint32(directory, true) === 0x02014b50
    );
  }
  return false;
}
async function download(env, t) {
  if (!t.package_key) fail(404, 'No package.');
  const object = await getPackage(env, t.package_key);
  if (!object) fail(404, 'Package unavailable.');
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${t.id}.zip"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  });
}
export default {
  async fetch(req, env) {
    try {
      return await route(req, env);
    } catch (e) {
      return json(
        { error: e instanceof Failure ? e.message : 'Service unavailable. Please try again.' },
        e instanceof Failure ? e.status : 500,
      );
    }
  },
  async scheduled(event, env) {
    await env.DB.batch(
      ['login_tokens', 'sessions', 'rate_limits', 'oauth_attempts'].map((t) =>
        env.DB.prepare(`DELETE FROM ${t} WHERE expires_at<?`).bind(now()),
      ),
    );
    const { results } = await env.DB.prepare(
      'SELECT key FROM package_gc WHERE delete_after<? AND NOT EXISTS(SELECT 1 FROM tasks WHERE package_key=package_gc.key) ORDER BY delete_after LIMIT 100',
    )
      .bind(now())
      .all();
    if (results.length) {
      await deletePackages(
        env,
        results.map(({ key }) => key),
      );
      await env.DB.batch(
        results.map(({ key }) => env.DB.prepare('DELETE FROM package_gc WHERE key=?').bind(key)),
      );
    }
  },
};
