export function up(pgm) {
  pgm.sql(
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM users WHERE password_hash NOT LIKE '$argon2id$%'
       ) THEN
         RAISE EXCEPTION
           'Rehash or reset legacy non-Argon2id credentials before applying this migration';
       END IF;
     END;
     $$`,
  );
  pgm.sql(
    `ALTER TABLE users
       DROP CONSTRAINT users_password_hash_format_check,
       ADD CONSTRAINT users_argon2id_password_hash_check
         CHECK (password_hash LIKE '$argon2id$%')`,
  );
}

export function down(pgm) {
  pgm.sql(
    `ALTER TABLE users
       DROP CONSTRAINT IF EXISTS users_argon2id_password_hash_check,
       ADD CONSTRAINT users_password_hash_format_check CHECK (
         password_hash LIKE '$argon2id$%'
         OR password_hash LIKE '$2a$%'
         OR password_hash LIKE '$2b$%'
         OR password_hash LIKE '$2y$%'
       )`,
  );
}
