import { CompactEncrypt, compactDecrypt, createRemoteJWKSet, jwtVerify } from 'jose';

export const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const projectURL = /^https:\/\/[a-z0-9]+\.supabase\.co$/;
const keySets = new Map();
const encoder = new TextEncoder();

export function authConfigured(env) {
  return (
    projectURL.test(env.SUPABASE_URL || '') &&
    /^sb_publishable_[-\w]+$/.test(env.SUPABASE_PUBLISHABLE_KEY || '') &&
    /^[a-f0-9]{64}$/.test(env.SESSION_ENCRYPTION_KEY || '')
  );
}

export function authRequest(env, path, { method = 'GET', token, data } = {}) {
  const headers = { apikey: env.SUPABASE_PUBLISHABLE_KEY };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(env.SUPABASE_URL + '/auth/v1' + path, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
    redirect: 'error',
  });
}

export async function verifiedClaims(env, token) {
  const issuer = env.SUPABASE_URL + '/auth/v1';
  if (!keySets.has(issuer))
    keySets.set(issuer, createRemoteJWKSet(new URL(issuer + '/.well-known/jwks.json')));
  const { payload } = await jwtVerify(token, keySets.get(issuer), {
    issuer,
    audience: 'authenticated',
    algorithms: ['ES256', 'RS256'],
    requiredClaims: ['sub', 'exp', 'iat', 'session_id'],
  });
  if (
    !uuid.test(payload.sub) ||
    !uuid.test(payload.session_id) ||
    payload.role !== 'authenticated' ||
    payload.app_metadata?.provider !== 'github'
  ) {
    throw new Error('Unexpected account or token type');
  }
  return payload;
}

function sessionKey(env) {
  return Uint8Array.from(env.SESSION_ENCRYPTION_KEY.match(/../g), (pair) => parseInt(pair, 16));
}

export function sealToken(env, token) {
  return new CompactEncrypt(encoder.encode(token))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(sessionKey(env));
}

export async function openToken(env, value) {
  const { plaintext } = await compactDecrypt(value, sessionKey(env), {
    keyManagementAlgorithms: ['dir'],
    contentEncryptionAlgorithms: ['A256GCM'],
  });
  return new TextDecoder().decode(plaintext);
}

const bucket = 'aisle-contribute-private';
function storageRequest(env, path, init = {}) {
  if (
    !projectURL.test(env.SUPABASE_URL || '') ||
    !/^sb_secret_[-\w]+$/.test(env.SUPABASE_STORAGE_SECRET || '')
  ) {
    throw new Error('Private package storage is unavailable');
  }
  return fetch(env.SUPABASE_URL + '/storage/v1/object' + path, {
    ...init,
    headers: { apikey: env.SUPABASE_STORAGE_SECRET, ...init.headers },
    redirect: 'error',
  });
}

function objectPath(key) {
  return '/' + bucket + '/' + key.split('/').map(encodeURIComponent).join('/');
}

export async function putPackage(env, key, data) {
  const result = await storageRequest(env, objectPath(key), {
    method: 'POST',
    body: data,
    headers: { 'Content-Type': 'application/zip', 'x-upsert': 'false' },
  });
  if (!result.ok) throw new Error('Package upload failed');
}

export async function getPackage(env, key) {
  const result = await storageRequest(env, '/authenticated' + objectPath(key));
  if (result.status === 404) return null;
  if (!result.ok) throw new Error('Package download failed');
  return result;
}

export async function deletePackages(env, keys) {
  const result = await storageRequest(env, '/' + bucket, {
    method: 'DELETE',
    body: JSON.stringify({ prefixes: keys }),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!result.ok) throw new Error('Package cleanup failed');
}
