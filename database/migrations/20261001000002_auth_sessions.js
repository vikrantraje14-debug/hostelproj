const upStatements = [
  `ALTER TABLE students
    ADD COLUMN full_name text NOT NULL DEFAULT 'Profile name not provided'`,
  `ALTER TABLE students
    ALTER COLUMN full_name DROP DEFAULT`,
  `CREATE TABLE user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash char(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    user_agent text,
    ip_address inet,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_sessions_token_hash_check CHECK (
      token_hash ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT user_sessions_expiry_check CHECK (expires_at > created_at)
  )`,
  `CREATE INDEX user_sessions_active_user_idx
    ON user_sessions (user_id, expires_at)
    WHERE revoked_at IS NULL`,
  `CREATE INDEX user_sessions_expiry_idx ON user_sessions (expires_at)`,
  `COMMENT ON TABLE user_sessions IS 'Stores only HMAC digests of opaque session tokens; raw cookie tokens are never persisted.'`,
];

export function up(pgm) {
  upStatements.forEach((statement) => pgm.sql(statement));
}

export function down(pgm) {
  pgm.sql("DROP TABLE IF EXISTS user_sessions CASCADE");
  pgm.sql("ALTER TABLE students DROP COLUMN IF EXISTS full_name");
}
