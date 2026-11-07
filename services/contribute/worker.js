import { createRemoteJWKSet, jwtVerify } from 'jose';
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
function sessionToken(req) {
  return req.headers
    .get('Cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(COOKIE + '='))
    ?.slice(COOKIE.length + 1);
}
async function user(req, env) {
  const token = sessionToken(req);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) fail(401, 'Please sign in.');
  const u = await env.DB.prepare(
    'SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.hash=? AND s.expires_at>? AND u.disabled=0',
  )
    .bind(await digest(token), now())
    .first();
  if (!u) fail(401, 'Session expired. Please sign in.');
  return u;
}
const jwks = new Map();
function adminEligible(env, u) {
  const allow = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(
    allow.includes(u.email) &&
      env.ACCESS_AUD &&
      /^[-a-z0-9]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN || ''),
  );
}
async function admin(req, env, u) {
  if (!adminEligible(env, u)) fail(403, 'Administrator access required.');
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) fail(403, 'Cloudflare Access authentication required.');
  try {
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    if (!jwks.has(issuer)) jwks.set(issuer, createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs')));
    const { payload } = await jwtVerify(token, jwks.get(issuer), {
      issuer,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
      requiredClaims: ['exp', 'iat', 'sub', 'email'],
    });
    if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== u.email)
      throw Error('identity mismatch');
  } catch {
    fail(403, 'Invalid administrator identity.');
  }
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
const userResponse = (env, u) => ({ user: u, admin_eligible: adminEligible(env, u) });
const editableStates = ['draft', 'changes_requested'];

async function route(req, env) {
  const url = new URL(req.url),
    p = url.pathname.slice(PREFIX.length),
    method = req.method;
  if (!url.pathname.startsWith(PREFIX + '/')) fail(404, 'Not found.');
  if (url.origin !== env.SITE_ORIGIN) fail(403, 'Invalid host.');
  if (!['GET', 'HEAD'].includes(method) && req.headers.get('Origin') !== env.SITE_ORIGIN)
    fail(403, 'Invalid request origin.');
  if (method === 'GET' && p === '/config') return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || '' });
  if (method === 'POST' && p === '/auth/request') {
    const b = await body(req),
      email = text(b.email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email.');
    const name = text(b.name ?? '', 120, false),
      organization = text(b.organization ?? '', 200, false);
    await rate(env, 'login-ip:' + req.headers.get('CF-Connecting-IP'), 20);
    await rate(env, 'login-email:' + email, 5);
    if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.TURNSTILE_SECRET)
      fail(503, 'Email login is not configured.');
    const challenge = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: text(b.turnstile, 4096),
        remoteip: req.headers.get('CF-Connecting-IP') || '',
      }),
    }).then((r) => r.json());
    if (
      !challenge.success ||
      challenge.hostname !== new URL(env.SITE_ORIGIN).hostname ||
      challenge.action !== 'contribute-login'
    )
      fail(400, 'Verification failed. Please try again.');
    const existing = await env.DB.prepare('SELECT id,disabled FROM users WHERE email=?').bind(email).first();
    const generic = () => json({ message: 'If eligible, a sign-in link has been sent. Check your inbox.' });
    if (existing?.disabled || (!existing && (!name || !organization))) return generic();
    const token = random(),
      hash = await digest(token);
    await env.DB.prepare('INSERT INTO login_tokens VALUES (?,?,?,?,?)')
      .bind(hash, email, name, organization, now() + 900)
      .run();
    const track = ['dry', 'wet'].includes(b.kind) ? `?kind=${b.kind}` : '';
    const link = `${env.SITE_ORIGIN}/contributor.html${track}#token=${token}`;
    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [email],
        subject: 'Sign in to AISLE',
        text: `Use this single-use link within 15 minutes to sign in to AISLE:\n${link}\n\nIf you did not request this, ignore this email.`,
      }),
    });
    if (!sent.ok) {
      await env.DB.prepare('DELETE FROM login_tokens WHERE hash=?').bind(hash).run();
      fail(503, 'Email delivery unavailable. Please try later.');
    }
    return generic();
  }
  if (method === 'POST' && p === '/auth/verify') {
    await rate(env, 'verify:' + req.headers.get('CF-Connecting-IP'), 30);
    const b = await body(req);
    if (typeof b.token !== 'string' || !/^[a-f0-9]{64}$/.test(b.token)) fail(400, 'Invalid login link.');
    const record = await env.DB.prepare('DELETE FROM login_tokens WHERE hash=? AND expires_at>? RETURNING *')
      .bind(await digest(b.token), now())
      .first();
    if (!record) fail(401, 'Link expired or already used.');
    await env.DB.prepare('INSERT OR IGNORE INTO users VALUES (?,?,?,?,0,?)')
      .bind(crypto.randomUUID(), record.email, record.name, record.organization, now())
      .run();
    const u = await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(record.email).first();
    const token = random();
    const session = await env.DB.prepare(
      'INSERT INTO sessions (hash,user_id,expires_at) SELECT ?,id,? FROM users WHERE id=? AND disabled=0',
    )
      .bind(await digest(token), now() + 28800, u.id)
      .run();
    if (!session.meta.changes) fail(403, 'Account unavailable.');
    return json(userResponse(env, u), 200, {
      'Set-Cookie': `${COOKIE}=${token}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`,
    });
  }
  const u = await user(req, env);
  if (method === 'GET' && p === '/me') return json(userResponse(env, u));
  if (method === 'POST' && p === '/auth/logout') {
    const token = sessionToken(req);
    await env.DB.prepare('DELETE FROM sessions WHERE hash=?')
      .bind(await digest(token))
      .run();
    return json({ ok: true }, 200, {
      'Set-Cookie': `${COOKIE}=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
    });
  }
  if (method !== 'GET') await rate(env, 'write:' + u.id, 60);
  if (p.startsWith('/admin/')) {
    await admin(req, env, u);
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
    // Track incomplete uploads before writing to R2, whose writes are separate from D1.
    await env.DB.prepare('INSERT INTO package_gc VALUES (?,?)')
      .bind(key, now() + 86400)
      .run();
    await env.PACKAGES.put(key, data, {
      httpMetadata: { contentType: 'application/zip' },
      customMetadata: { taskId: task.id, userId: u.id, sha256: await digestBytes(data) },
    });
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
const digestBytes = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
async function download(env, t) {
  if (!t.package_key) fail(404, 'No package.');
  const object = await env.PACKAGES.get(t.package_key);
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
      ['login_tokens', 'sessions', 'rate_limits'].map((t) =>
        env.DB.prepare(`DELETE FROM ${t} WHERE expires_at<?`).bind(now()),
      ),
    );
    const { results } = await env.DB.prepare(
      'SELECT key FROM package_gc WHERE delete_after<? AND NOT EXISTS(SELECT 1 FROM tasks WHERE package_key=package_gc.key) ORDER BY delete_after LIMIT 100',
    )
      .bind(now())
      .all();
    if (results.length) {
      await env.PACKAGES.delete(results.map(({ key }) => key));
      await env.DB.batch(
        results.map(({ key }) => env.DB.prepare('DELETE FROM package_gc WHERE key=?').bind(key)),
      );
    }
  },
};
