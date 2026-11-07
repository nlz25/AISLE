ALTER TABLE users ADD COLUMN auth_subject TEXT;
CREATE UNIQUE INDEX users_auth_subject ON users(auth_subject);
ALTER TABLE sessions ADD COLUMN provider_token TEXT;
ALTER TABLE sessions ADD COLUMN mfa_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN mfa_enrollment TEXT;
CREATE TABLE oauth_attempts (
  hash TEXT PRIMARY KEY,
  verifier TEXT NOT NULL,
  track TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX oauth_attempts_expires ON oauth_attempts(expires_at);
