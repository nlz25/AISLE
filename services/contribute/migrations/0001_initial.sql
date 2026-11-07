PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, organization TEXT NOT NULL, disabled INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE login_tokens (hash TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, organization TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE tasks (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('dry','wet')), title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', pr_url TEXT NOT NULL DEFAULT '', lab_json TEXT NOT NULL DEFAULT '{}', notice TEXT NOT NULL DEFAULT '', package_key TEXT, package_size INTEGER, revision INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX tasks_user ON tasks(user_id,created_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE audit_log (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL, target_id TEXT NOT NULL, created_at INTEGER NOT NULL);
