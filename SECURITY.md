# Security Overview

This document describes controls implemented in the current application. It is not a certification or a claim that the system is completely secure. The production database was not configured during this audit, so database migrations and live PostgreSQL behavior still require deployment verification.

## Implemented Controls

- Passwords are hashed with Argon2id (19 MiB memory cost, two iterations). Passwords are never returned by API projections. Login responses are generic, and unknown or unsupported hashes are checked against a dummy Argon2id hash to reduce account-enumeration timing differences.
- Sessions use random 256-bit opaque tokens; only HMAC-SHA-256 digests are stored. Cookies are HttpOnly, SameSite=Lax, scoped to `/`, and Secure in production with the `__Host-` prefix. Sessions expire after 12 hours and logout revokes the server-side session.
- Production startup requires a PostgreSQL URL, an explicitly configured canonical HTTPS client origin, and a 43-character-or-longer session secret. PostgreSQL TLS certificate verification is enabled; production connection strings containing SSL overrides are rejected.
- Authentication and admin routes enforce server-side roles. Student application and document queries scope by authenticated user ID. Admin content APIs require the ADMIN role; public content queries apply each resource's active/effective/published rules, and Settings content is returned only when explicitly public.
- Mutating cookie-authenticated endpoints require a double-submit CSRF token and reject mismatched Origin headers. Credentialed CORS is restricted to the configured client origin.
- Request bodies and query parameters are validated with Zod. SQL values are parameterized; content table names, columns, ordering, and filters come from fixed server-side allowlists. Validation errors expose field/message/code only, not rejected input values.
- Uploads are limited to 10 MiB per file and 12 attempts per IP per 15 minutes in addition to the general API limiter. Type is determined from file signatures, filenames are reduced to safe display names, storage keys are generated UUIDs, and lexical path traversal is rejected. Files are stored outside PostgreSQL in a private directory and served only through owner/admin-authorized attachment responses with `no-store`, `nosniff`, and sandbox headers.
- Content writes run with audit-log inserts in the same database transaction. Application status changes create status-history rows. New content is marked `is_demo` by default; clearing the marker requires confirmation in the admin UI.
- API request logs exclude query strings, request bodies, cookies, and credentials. Unexpected API errors return generic messages; operational CLI/server logs record error names rather than raw error messages.
- Helmet security headers are enabled. Authentication endpoints have a 10-request-per-IP/15-minute limiter; the API has a 300-request-per-IP/15-minute limiter.
- `.env` files and private upload storage are gitignored. The frontend reads only `VITE_API_BASE_URL`; database credentials and session secrets are backend-only.

## Verification Performed

- `npm test --workspace backend`: 44 passing tests, including role denial, ownership checks, validation redaction, malicious/oversized uploads, traversal rejection, upload rate limiting, production configuration checks, and CRUD coverage.
- `npm run build --workspace frontend`: passed.
- `npm audit --all`: no known dependency advisories at audit time.
- Workspace scanning found only `.env.example` files, not populated `.env` files. This checkout has no `.git` metadata, so tracked-file history and prior commits could not be audited.

## Remaining Risks

- No malware scanner or content-disarm/reconstruction step is configured. Signature checks do not make a valid PDF inherently safe; keep downloads as attachments and add scanning before handling untrusted production documents.
- The default document adapter is local filesystem storage. Production needs a durable private volume/object-storage adapter, appropriate operating-system ACLs, backup/retention controls, and operational monitoring.
- Rate limits use the in-process memory store. They do not coordinate across multiple server instances and can be bypassed by distributed sources; use a shared store and upstream controls for multi-instance deployments. Reverse-proxy deployments also need carefully configured client-IP handling.
- Admin accounts have no MFA or password-reset workflow in this codebase and must be provisioned through a trusted process. There is no account-level lockout policy.
- Migration `20261001000007_argon2_only_passwords` refuses to apply while non-Argon2id hashes exist. Inventory and rehash/reset legacy bcrypt accounts before deployment; this migration was not applied because no database was configured.
- Migrations, PostgreSQL query plans/permissions, database backups, and production infrastructure configuration were not exercised because no database was configured. Apply migrations and verify least-privilege database roles, TLS, filesystem isolation, and backups in a staging environment.
- This was a source/configuration review plus automated tests, not a penetration test, dependency provenance review, or external security assessment.
