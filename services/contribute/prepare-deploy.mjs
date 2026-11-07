import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { uuid } from './supabase.js';

function requireSetting(name, pattern = /\S/) {
  const value = process.env[name]?.trim();
  if (!value || !pattern.test(value)) throw new Error(`Missing or invalid deployment setting: ${name}`);
  return value;
}

const config = JSON.parse(await readFile(new URL('./wrangler.jsonc', import.meta.url), 'utf8'));
config.account_id = requireSetting('CLOUDFLARE_ACCOUNT_ID', /^[a-f0-9]{32}$/);
config.main = '../worker.js';
delete config.$schema;
const workspaceOrigin = process.env.CONTRIBUTE_WORKSPACE_ORIGIN?.trim();
if (workspaceOrigin) {
  config.vars.SITE_ORIGIN = requireSetting(
    'CONTRIBUTE_WORKSPACE_ORIGIN',
    /^https:\/\/aisle-contribute\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.workers\.dev$/,
  );
  await access(new URL('./.wrangler/workspace/contributor.html', import.meta.url));
  delete config.routes;
  config.workers_dev = true;
  config.assets = {
    directory: './workspace',
    html_handling: 'none',
    run_worker_first: ['/api/contribute/*'],
  };
}
const [database] = config.d1_databases;
database.database_id = requireSetting(
  'CLOUDFLARE_D1_DATABASE_ID',
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/,
);
database.migrations_dir = '../migrations';

Object.assign(config.vars, {
  SUPABASE_URL: requireSetting('SUPABASE_URL', /^https:\/\/[a-z0-9]+\.supabase\.co$/),
  SUPABASE_PUBLISHABLE_KEY: requireSetting('SUPABASE_PUBLISHABLE_KEY', /^sb_publishable_[-\w]+$/),
});

const admins = process.env.ADMIN_USER_IDS?.trim();
if (admins && admins.split(',').some((value) => !uuid.test(value.trim()))) {
  throw new Error('ADMIN_USER_IDS must contain comma-separated Supabase user IDs');
}
config.vars.ADMIN_USER_IDS = admins || '';

const secrets = {
  SUPABASE_STORAGE_SECRET: requireSetting('SUPABASE_STORAGE_SECRET', /^sb_secret_[-\w]+$/),
  SESSION_ENCRYPTION_KEY: requireSetting('SESSION_ENCRYPTION_KEY', /^[a-f0-9]{64}$/),
};

const directory = new URL('./.wrangler/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL('production.json', directory), JSON.stringify(config, null, 2));
await writeFile(new URL('production-secrets.json', directory), JSON.stringify(secrets), { mode: 0o600 });
