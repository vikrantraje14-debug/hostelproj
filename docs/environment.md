# Environment Variables

Workspace scripts run with the workspace directory as their working directory. The backend loads `backend/.env`; Vite loads `frontend/.env`. The root `.env.example` is a reference catalog and is not automatically loaded by either workspace.

Copy the appropriate templates:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

These commands create local files; never commit populated `.env` files. They are ignored by `.gitignore`.

## Backend

| Variable                | Required                        | Meaning                                                                                                                                               |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | Production: yes                 | `development`, `test`, or `production`. Production enables Secure session/CSRF cookies and PostgreSQL TLS validation.                                 |
| `PORT`                  | No                              | API listen port; defaults to `3000`.                                                                                                                  |
| `CLIENT_ORIGIN`         | Production: yes                 | Exact allowed browser origin. Production requires a canonical HTTPS origin without a path.                                                            |
| `LOG_LEVEL`             | No                              | `debug`, `info`, `warn`, or `error`; defaults to `info`. Request bodies and credentials are not logged.                                               |
| `DATABASE_URL`          | Persistent use; production: yes | PostgreSQL connection URL. Do not add `ssl*` or `uselibpqcompat` query parameters in production; these are rejected to preserve strict TLS.           |
| `SESSION_SECRET`        | Authentication; production: yes | HMAC secret, minimum 32 chars generally and 43 random chars in production. Keep in a deployment secret manager.                                       |
| `DOCUMENT_STORAGE_PATH` | No                              | Private document storage directory; default is `backend/private-uploads`. Configure a private persistent mount or replace the adapter for production. |
| `SEED_DEMO_DATA`        | No                              | `false` by default. Set `true` only in development to opt into clearly labeled sample content.                                                        |

Generate a secret using a cryptographically secure random generator, then transfer it directly to the secret manager or untracked env file. Example generator (prints the secret to the current terminal):

```sh
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url') + '\n')"
```

## Frontend

| Variable            | Meaning                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Public API base URL including prefix, e.g. `https://portal.example.gov/api/v1`. This is embedded in the browser bundle and must never contain credentials or secrets. |

Set `VITE_API_BASE_URL` before `npm run build --workspace frontend`; changing it after build requires a new build.

## Production Constraints

Set explicit production values: `NODE_ENV=production`, PostgreSQL `DATABASE_URL`, a canonical HTTPS `CLIENT_ORIGIN`, and a unique random `SESSION_SECRET` of at least 43 characters. Use a same-site frontend/API deployment where possible so the Secure, HttpOnly, SameSite=Lax session cookie is sent correctly. Credentialed wildcard CORS is not supported.
