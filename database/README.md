# Database Architecture

PostgreSQL schema managed by `node-pg-migrate`. PostgreSQL 13 or newer is required for `gen_random_uuid()`.

## Relationships

- `users` stores the shared account identity, normalized email, password hash, role, and account status. After migration `20261001000007`, hashes must use Argon2id; plaintext is never accepted.
- `students` and `admins` are one-to-one profile extensions keyed by `users.id`. Database triggers require the matching `users.role`.
- `user_sessions` references a user and stores an HMAC digest of a random opaque cookie token, expiry, revocation, and request metadata. The raw session token is only sent in an HttpOnly cookie and is never stored in PostgreSQL.
- `applications` belongs to a student and optionally references a verified hostel. It stores a unique public `reference_number`, a hostel-preference text snapshot for unverified/demo labels, and personal, academic, and guardian answers so later profile changes do not rewrite a submitted/reviewed record.
- `facilities` and `hostels` have a many-to-many relationship through `hostel_facilities`.
- `application_documents` references an application and stores object-storage provider/key and file metadata only. File bytes and signed download URLs do not belong in PostgreSQL.
- `application_status_history` records each status transition and optional acting user. `audit_logs` is a separate append-only operational audit stream with JSONB change snapshots.
- `fees` may be hostel-specific or apply generally. Notices, rules, and important dates are separate publishable content entities.
- `site_settings` stores private portal settings and JSON page content; public reads require the setting's `is_public` flag. Content-management create/update/delete operations write audit snapshots in the same transaction.

## Statuses and Constraints

Application workflow values are stored lowercase and exposed by the API as `SUBMITTED`, `UNDER_REVIEW`, `DOCUMENT_VERIFICATION`, `APPROVED`, `REJECTED`, and `ADDITIONAL_INFORMATION_REQUIRED`; transition rules are enforced in the application service/repository. Legacy `draft` and `withdrawn` values remain accepted for existing records. Content states are `draft`, `published`, or `archived`; they do not assert government process.

UUID primary keys, foreign keys, uniqueness, checks, timestamp defaults, update timestamps, and lookup indexes are defined in the migrations. The student/account role triggers prevent a student profile from belonging to an admin account and vice versa.

An active application is unique per `(student_user_id, admission_year)`; withdrawn applications do not block a later submission. Reference numbers have a separate unique constraint. Application insertion and the initial `application_status_history` row are written in one transaction.

Auth session signing uses `SESSION_SECRET` from `backend/.env` (minimum 32 characters in development, at least 43 random characters in production). Admin accounts are not registered through the public API; provision them through a trusted operations process.

## Migrations

Set a private `DATABASE_URL` in `backend/.env`. Example format: `postgresql://USER:PASSWORD@HOST:5432/hostel_portal_dev`. Do not commit the populated `.env` file.

From the repository root, run `npm run db:migrate --workspace backend`. Migration `20261001000006_site_settings` adds the portal settings store used for managed public pages. Migration `20261001000007_argon2_only_passwords` rejects legacy non-Argon2id hashes and then constrains new stored hashes to Argon2id; inventory and rehash/reset any legacy bcrypt accounts before applying it. Use `npm run db:rollback --workspace backend` to roll back the latest migration. The migration tool tracks applied migrations in its own migration table and runs each migration transactionally.

After applying migrations to a disposable development database, run `npm run db:verify --workspace backend`. The verifier inserts related records inside a transaction, probes key check/foreign-key constraints, and rolls back all verification rows.

Migration `20261001000007_argon2_only_passwords` intentionally aborts if any stored user hash is not Argon2id. Before applying it to an existing installation, count/inventory legacy hashes using a controlled DBA session, then rehash via a trusted one-time process or require affected users to reset passwords. Do not weaken the migration or print password hashes into logs/tickets.

## Development Seed

`database/seed/dev.sql` inserts only reference/content examples (hostels, facilities, a draft notice/rule/date) and their relationships. It creates no users, applications, credentials, fees, or documents. Every seeded row is `is_demo = true` and carries the exact `DEMO DATA — NOT OFFICIAL GOVERNMENT DATA` marker. The runner refuses to execute unless `NODE_ENV=development` and `SEED_DEMO_DATA=true`.

Run only against a disposable development database:

```sh
npm run db:seed --workspace backend
```

## Initial Admin Provisioning

There is no public admin-registration route. Provision the first account through an audited DBA/operations process, use a unique email, and transmit only an Argon2id hash to SQL. Generate the hash using the backend dependency with the initial password supplied through a protected ephemeral environment variable (do not put the password in shell history):

```sh
node --input-type=module -e "import argon2 from 'argon2'; console.log(await argon2.hash(process.env.ADMIN_INITIAL_PASSWORD, { type: argon2.argon2id }))"
```

Use the resulting hash in a transaction. Replace all placeholders privately; do not commit this SQL or the generated hash:

```sql
BEGIN;
WITH new_admin AS (
	INSERT INTO users (email, password_hash, role)
	VALUES (lower('ADMIN_EMAIL'), 'ARGON2ID_HASH', 'admin')
	RETURNING id
)
INSERT INTO admins (user_id, display_name)
SELECT id, 'ADMIN_DISPLAY_NAME' FROM new_admin;
COMMIT;
```

The profile-role trigger validates the association. Verify access through the admin login route and rotate/reset the initial password according to the organization's policy. Admin MFA is not implemented in this application.

## Backup and Restore Strategy

No backup job or retention policy is configured by this repository. Before production, select a managed PostgreSQL backup/PITR service or schedule encrypted `pg_dump` artifacts to access-controlled storage. Define RPO/RTO, retention, encryption/key ownership, alerting, and periodic restore drills with the service owner. A reasonable starting policy is daily backups plus provider-supported point-in-time recovery and tested weekly restore samples; set retention to organizational/legal requirements.

For a manual logical backup, run from a protected operations environment. The command creates an unencrypted dump file: write it only to an encrypted, access-controlled volume, encrypt it immediately with the organization's approved key management, and remove temporary plaintext copies according to policy.

```sh
pg_dump --format=custom --no-owner --file=hostel-portal.dump "$DATABASE_URL"
```

Restore into a new empty database first, verify migrations/application checks, and only then plan cutover:

```sh
createdb hostel_portal_restore
pg_restore --no-owner --dbname="$RESTORE_DATABASE_URL" hostel-portal.dump
```

PostgreSQL backups do not contain uploaded document bytes. Back up the private document volume/object store with matching retention and recovery points; test restoring metadata and files together. Never expose backups or document storage through the public web server.

## Verification

The application workspace has no configured PostgreSQL connection by default. After configuring a disposable development database, apply migrations, run the seed, and verify the constraints against PostgreSQL before using this schema. The API itself does not connect to PostgreSQL at startup.
