# Backend

Node.js and Express REST API. It includes environment validation, JSON request logging, CORS/security middleware, request validation, central error handling, `/api/v1` routing, opaque database-backed sessions, Argon2id password hashing, and role-protected student/admin endpoints.

## Setup and Operations

Copy `backend/.env.example` to `backend/.env`, configure PostgreSQL and a generated `SESSION_SECRET`, then run commands from the repository root. See the [environment guide](../docs/environment.md), [database guide](../database/README.md), and [deployment guide](../docs/deployment.md) for complete procedures.

Run `npm run dev:backend` for local watch mode, `npm start --workspace backend` for the production process, and `npm test --workspace backend` for tests. Production startup requires explicit HTTPS origin, PostgreSQL, and session-secret configuration.

## API

Versioned paths under `/api/v1` are canonical. `/api` compatibility aliases remain mounted. `GET /api/v1/health` is the health check.

- `GET /api/v1/auth/csrf` issues a double-submit CSRF token.
- `POST /api/v1/auth/register` creates a student account and session.
- `POST /api/v1/auth/login` and `POST /api/v1/auth/admin/login` sign in the matching role.
- `POST /api/v1/auth/logout` revokes the current session; `GET /api/v1/auth/me` returns a safe user projection.
- `GET /api/v1/students/me` returns the signed-in student's profile.
- `GET /api/v1/applications` and `GET /api/v1/applications/:id` are student-only and scope queries to the signed-in student.
- `GET /api/v1/applications/:id/status` returns the current status and student-visible history. `GET /api/v1/applications/search?referenceNumber=...` searches only the signed-in student's applications; authentication is the required identity verification.
- `PATCH /api/v1/admin/applications/:id/status` changes status for admins only. Allowed transitions are defined in `src/config/application-status.js`; status and a student-facing remark are saved atomically with one history record. Student responses omit actor identities and internal history reasons.
- `GET /api/v1/admin/stats` returns dashboard totals. `GET /api/v1/admin/applications` supports search, status/admission-year filters, sorting, and pagination; `GET /api/v1/admin/applications/:id` returns review details and documents. `GET /api/v1/admin/students` and `GET /api/v1/admin/documents` provide searchable paginated registers. All `/admin` endpoints require the admin role. Document bytes remain available only through the protected application document-content route.
- `GET /api/v1/hostels`, `/facilities`, `/fees`, `/notices`, `/rules`, and `/important-dates` return active/current/published content from PostgreSQL. `GET /api/v1/content/pages/:slug` returns explicitly public page settings.
- Admins manage the seven content resources at `/api/v1/admin/content/:resource` with paginated/searchable list, detail, create, update, and delete endpoints. Hostels are deactivated instead of hard-deleted. Mutations require CSRF and write before/after snapshots to `audit_logs`. New records are demo data by default; Settings can publish JSON page content by using keys such as `public_page:hostel-details` and enabling public visibility.
- `POST /api/v1/applications` creates an authenticated student's application, returns a unique acknowledgement reference, and writes the initial status-history row in the same transaction. A student may have only one active application per admission year; duplicates return 409.
- `POST /api/v1/applications/:id/documents` accepts one multipart `document` and a `documentType` field. `GET /api/v1/applications/:id/documents` lists metadata and current requirements; `GET /api/v1/applications/:id/documents/:documentId/content` streams an authorized attachment without exposing a storage URL. Students can access only their own application documents; admins can read documents by their role.
- `GET /api/v1/admin` and `GET /api/v1/admin/applications` require the admin role.

Session cookies are HttpOnly, SameSite=Lax, and Secure in production. Only HMAC digests of opaque session tokens are stored. Mutating auth requests require the CSRF cookie/header pair. Admins cannot self-register; accounts must be provisioned through a trusted operational process.

Application request bodies and uploaded file contents are validated server-side. Documents are limited to 10 MB and signature-checked PDF, JPEG, and PNG. Browser MIME types and extensions are not trusted. Uploaded bytes are stored by a private filesystem adapter (default `backend/private-uploads/`, configurable with `DOCUMENT_STORAGE_PATH`); PostgreSQL stores metadata and opaque storage keys only. The storage adapter can be replaced without changing routes or metadata persistence. Document categories and required/optional flags are configured in `src/config/documents.js`; no document is mandatory by default because official requirements were not supplied. The local adapter is not a shared or cloud production store: production deployments should configure durable private storage or replace the adapter, and should add malware scanning before enabling inline previews. Downloads are always attachments with `no-store` and `nosniff` headers.

Managed hostel, facility, fee, notice, rule, and date records retain their `is_demo` label in public responses. Settings are private by default; only entries explicitly marked public can override public-page fallback content. Demo labels read `DEMO DATA — NOT OFFICIAL GOVERNMENT DATA` and should only be removed after the information has been verified and approved.

Successful reads use HTTP 200, student registration uses 201, invalid requests use 400, unauthenticated/forbidden requests use 401/403, duplicates use 409, missing routes use 404, rate limits use 429, and unexpected failures use 500. Errors include a stable code and request ID; database internals are not returned.

## Structure

- `src/config/`: validated environment and CORS configuration.
- `src/controllers/` and `src/services/`: response orchestration, Argon2id auth, and PostgreSQL repository boundary.
- `src/middleware/`: request logging, validation, and centralized errors.
- `src/routes/`: versioned health and feature route modules.
- `src/models/`: reserved for future persistence models.
- `src/utils/`: API errors and structured logging.
- `src/database/`: lazy database auth repository utilities.

## PostgreSQL

The database URL is backend-only and is loaded from `backend/.env` when workspace commands run. Apply schema with `npm run db:migrate --workspace backend`; migrations are not run automatically by the API. Demo seed data requires explicit development-only opt-in. Admins must be provisioned through the trusted database procedure, not the API. See `database/README.md` for migration order, backup/restore guidance, admin setup, and the guarded Argon2-only migration.
