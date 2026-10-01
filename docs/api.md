# API Reference

The canonical prefix is `/api/v1`; `/api` is retained as a compatibility alias. Successful JSON responses use a `data` envelope. Errors include a stable code and request ID. Binary document content is returned as an attachment.

Cookie authentication uses opaque HttpOnly session cookies. Obtain a CSRF token from `GET /auth/csrf` before state-changing requests and send the returned token in `X-CSRF-Token`; the CSRF cookie must accompany it.

## Public Routes

| Method | Route                                      | Behavior                                         |
| ------ | ------------------------------------------ | ------------------------------------------------ |
| `GET`  | `/health`                                  | API health response.                             |
| `GET`  | `/hostels`, `/hostels/:id`                 | Active hostel content.                           |
| `GET`  | `/facilities`, `/facilities/:id`           | Public facility content.                         |
| `GET`  | `/fees`, `/fees/:id`                       | Active fees whose effective dates include today. |
| `GET`  | `/notices`, `/notices/:id`                 | Published, non-expired notices.                  |
| `GET`  | `/rules`, `/rules/:id`                     | Published rules within their effective dates.    |
| `GET`  | `/important-dates`, `/important-dates/:id` | Published dates.                                 |
| `GET`  | `/content/pages/:slug`                     | Page setting only when explicitly marked public. |

Responses carry demo metadata where applicable. `DEMO DATA — NOT OFFICIAL GOVERNMENT DATA` must be preserved for unverified content.

## Authentication and Students

| Method | Route                                      | Access                                                       |
| ------ | ------------------------------------------ | ------------------------------------------------------------ |
| `GET`  | `/auth/csrf`                               | Issues CSRF token.                                           |
| `POST` | `/auth/register`                           | Creates student; strict input validation.                    |
| `POST` | `/auth/login`                              | Student login.                                               |
| `POST` | `/auth/admin/login`                        | Provisioned admin login; no public admin registration.       |
| `POST` | `/auth/logout`                             | Revokes current session; CSRF required.                      |
| `GET`  | `/auth/me`                                 | Current user-safe projection.                                |
| `GET`  | `/students/me`                             | Current student profile.                                     |
| `GET`  | `/applications`, `/applications/mine`      | Own applications only.                                       |
| `GET`  | `/applications/search?referenceNumber=...` | Searches own application only.                               |
| `GET`  | `/applications/:id`                        | Own application detail only.                                 |
| `GET`  | `/applications/:id/status`                 | Own status, public remarks, history.                         |
| `POST` | `/applications`                            | Submit application; active duplicate for year returns `409`. |

## Documents

| Method | Route                                             | Access / behavior                                                             |
| ------ | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| `POST` | `/applications/:id/documents`                     | Student owner only; multipart `document` plus `documentType`; CSRF required.  |
| `GET`  | `/applications/:id/documents`                     | Owner student or admin; metadata only.                                        |
| `GET`  | `/applications/:id/documents/:documentId/content` | Owner student or admin; authenticated attachment, never a public storage URL. |

Uploads are limited to 10 MiB, rate-limited, and signature-checked as PDF/JPEG/PNG. The browser extension and declared MIME type are not trusted. PostgreSQL stores metadata and opaque keys, not file bytes.

## Admin

All `/admin` routes require the `ADMIN` role. Mutations require CSRF.

| Method   | Route                                 | Behavior                                                |
| -------- | ------------------------------------- | ------------------------------------------------------- |
| `GET`    | `/admin`                              | Current admin projection.                               |
| `GET`    | `/admin/stats`                        | Dashboard statistics.                                   |
| `GET`    | `/admin/applications`                 | Search, status/year filters, sort, page/pageSize.       |
| `GET`    | `/admin/applications/:id`             | Application review detail and safe document metadata.   |
| `PATCH`  | `/admin/applications/:id/status`      | Validated status transition and student-facing remarks. |
| `GET`    | `/admin/students`, `/admin/documents` | Searchable paginated registers.                         |
| `GET`    | `/admin/content/:resource`            | Searchable paginated content records.                   |
| `GET`    | `/admin/content/:resource/:id`        | Content record detail.                                  |
| `POST`   | `/admin/content/:resource`            | Create content.                                         |
| `PUT`    | `/admin/content/:resource/:id`        | Replace content.                                        |
| `DELETE` | `/admin/content/:resource/:id`        | Delete content; hostels are deactivated.                |

Content resource values: `hostels`, `facilities`, `fees`, `notices`, `rules`, `important-dates`, `settings`. Writes are validated and audited transactionally.

## Responses and Errors

- `200` read/update/delete; `201` create; `204` logout.
- `400` malformed/invalid input; `401` unauthenticated; `403` forbidden/CSRF; `404` missing or not owned; `409` conflict; `413` too large; `415` unsupported file; `429` rate limit; `500` unexpected error; `503` required service unavailable.
- Error messages do not include stack traces, SQL, rejected input values, or credential values.
