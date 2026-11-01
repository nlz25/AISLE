import { DurableObject } from 'cloudflare:workers';

// One durable instance owns the total. Request IDs identify attempts, not people.
export class PortalCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL)');
    this.sql.exec('INSERT OR IGNORE INTO counter VALUES (1, 0)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS attempts_expiry ON attempts (expires)');
  }

  read() {
    return this.sql.exec('SELECT total FROM counter WHERE id = 1').one().total;
  }

  increment(id) {
    return this.ctx.storage.transactionSync(() => {
      const now = Date.now();
      this.sql.exec('DELETE FROM attempts WHERE expires < ?', now);
      const exists = this.sql.exec('SELECT id FROM attempts WHERE id = ?', id).toArray().length;
      if (!exists) {
        this.sql.exec('UPDATE counter SET total = total + 1 WHERE id = 1');
        this.sql.exec('INSERT INTO attempts VALUES (?, ?)', id, now + 86400000);
      }
      return this.read();
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',');
    const headers = { 'Cache-Control': 'no-store', 'Vary': 'Origin' };
    if (origin && allowed.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
      headers['Access-Control-Max-Age'] = '86400';
    }
    const json = (body, status = 200) => Response.json(body, { status, headers });
    if (url.pathname !== '/count') return json({ error: 'Not found' }, 404);
    if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
    // Public reads are allowed; browser writes must come from our site.
    if (request.method === 'POST' && !origin) return json({ error: 'Origin required' }, 403);
    try {
      const counter = env.COUNTER.get(env.COUNTER.idFromName('portal'));
      if (request.method === 'GET') return json({ total: await counter.read() });
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON required' }, 415);
      const body = await request.text();
      if (body.length > 128) return json({ error: 'Request too large' }, 413);
      let id;
      try { ({ id } = JSON.parse(body)); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return json({ error: 'Invalid request ID' }, 400);
      }
      return json({ total: await counter.increment(id) });
    } catch {
      return json({ error: 'Counter temporarily unavailable' }, 503);
    }
  }
};
