# Production Deployment

This guide describes a deployment process; it does not mean a deployment has occurred. No production environment or live database is configured by this repository.

## Suggested Topology

- Serve `frontend/dist/` as static files over HTTPS.
- Run the Express API as a supervised service behind a TLS reverse proxy.
- Prefer same-site frontend/API routing, for example one portal host with `/api/` proxied to the backend, to keep cookie authentication first-party.
- Use managed PostgreSQL with TLS, least-privilege credentials, network restrictions, and monitored backups.
- Mount private persistent document storage or replace the local adapter with private object storage. Never serve the storage directory as static content.

## Release Procedure

1. Provision PostgreSQL and an application database role. Configure the backend variables described in [environment.md](environment.md) in a secret manager. Production requires `NODE_ENV=production`, `DATABASE_URL`, an HTTPS canonical `CLIENT_ORIGIN`, and a random `SESSION_SECRET` of at least 43 characters.
2. Review the password-hash inventory before migration `20261001000007_argon2_only_passwords`. It intentionally refuses to apply if legacy non-Argon2id hashes remain; rehash/reset those accounts via an approved process first.
3. Apply migrations as a separate release operation, not at API startup:

   ```sh
   npm run db:migrate --workspace backend
   ```

4. Provision an initial admin through the trusted procedure in the [database guide](../database/README.md). Verify admin/student RBAC in staging.
5. Set `VITE_API_BASE_URL` to the production API prefix, then build:

   ```sh
   npm run build --workspace frontend
   ```

   Publish `frontend/dist/`. Vite variables are compiled into the bundle; rebuild after changing them.

6. Start the backend under a process manager/container orchestrator:

   ```sh
   npm start --workspace backend
   ```

7. Configure the proxy for HTTPS, body limits consistent with 10 MiB uploads, and correct Host/forwarding headers. The app does not currently set Express `trust proxy`; rate limiting therefore sees the direct socket peer. If proxy trust is configured later, restrict it to known proxy hops and prevent client spoofing of forwarded-IP headers.
8. Smoke-test `/api/v1/health`, public content, login/logout, owner boundaries, admin access, upload/download, and error/empty states. Review service and proxy logs.

## Rollback and Completion

Keep a previous frontend bundle and backend artifact available. Before database rollback, take a backup and inspect the relevant migration's `down` function for data loss or compatibility issues. Roll back through controlled maintenance, not an automatic deployment hook.

Deployment is complete only after the actual target environment is provisioned, migrations and smoke tests succeed, backups are verified, and an operator records the release. No such deployment was performed during this documentation task.
