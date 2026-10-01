# Project Documentation

Start with the [repository README](../README.md). Detailed operator guides:

- [Environment variables](environment.md)
- [API reference](api.md)
- [Production deployment](deployment.md)
- [Database, migrations, admin provisioning, and backups](../database/README.md)
- [Security controls and remaining risks](../SECURITY.md)

## Local Development

Requirements: Node.js 20.19 or newer, npm 10 or newer, and PostgreSQL 13 or newer for persistent workflows.

Install dependencies from the repository root:

```sh
npm install
```

Copy `backend/.env.example` to `backend/.env`. Set `DATABASE_URL` to a disposable local PostgreSQL database and generate `SESSION_SECRET` privately. Apply migrations before testing database-backed workflows:

```sh
npm run db:migrate --workspace backend
```

Start frontend and backend in separate terminals:

```sh
npm run dev:frontend
npm run dev:backend
```

The Vite frontend defaults to <http://localhost:5173/> and API health is <http://localhost:3000/api/v1/health>. To change the frontend API address, create `frontend/.env` from `frontend/.env.example` and set `VITE_API_BASE_URL` before starting/building the frontend.

## Seed and Tests

Development seed data is opt-in and explicitly marked demo. From the repository root:

```sh
npm run db:seed --workspace backend
npm run db:verify --workspace backend
npm test --workspace backend
npm run build --workspace frontend
```

`db:seed` refuses unless `NODE_ENV=development` and `SEED_DEMO_DATA=true`. The verifier runs in a transaction and rolls back. No production seed data should be created from the development seed script.

## Troubleshooting

- **API returns `503 DATABASE_NOT_CONFIGURED`:** check that `backend/.env` exists, `DATABASE_URL` points to PostgreSQL, and migrations have run. Do not put `DATABASE_URL` in a frontend env file.
- **Authentication returns unavailable:** configure a `SESSION_SECRET` of at least 32 characters in development; production requires at least 43 random characters.
- **CORS or cookies fail:** use the exact `CLIENT_ORIGIN`, including scheme/host/port. In production use HTTPS and keep the frontend/API same-site where possible.
- **Public content shows demo fallback:** verify PostgreSQL is reachable, migrations are applied, content is published/current, and demo labels are intentional.
- **Database migration refuses Argon2-only password migration:** inventory legacy bcrypt hashes, reset/rehash them through an approved process, then retry migration `20261001000007`.
- **Uploads fail:** check the configured private storage directory, available disk space, 10 MiB limit, allowed signature-checked types, and upload rate limit. Never expose the storage directory as a static web root.
- **Production frontend calls the wrong API:** `VITE_API_BASE_URL` is embedded at build time; set it before rebuilding and redeploying `frontend/dist/`.
- **Port is occupied:** stop the existing process or configure another API `PORT`/Vite port and update `CLIENT_ORIGIN` and `VITE_API_BASE_URL` consistently.
