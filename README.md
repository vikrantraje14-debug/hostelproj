<<<<<<< HEAD
# Government Hostel Admission Portal

A React/Vite frontend and Express/PostgreSQL API for a hostel admissions portal. The application includes public information pages, student accounts and applications, private document uploads, application status history, admin review, and admin-managed public content.

> Some sample records and fallback copy are demonstrations, not government policy. Keep the exact label `DEMO DATA — NOT OFFICIAL GOVERNMENT DATA` on unverified content.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- PostgreSQL 13 or newer for persistent application use

## Quick Start

Install dependencies once from the repository root:

```sh
npm install
```

Copy `backend/.env.example` to `backend/.env`, set `DATABASE_URL` and a generated `SESSION_SECRET`, and optionally copy `frontend/.env.example` to `frontend/.env`. Apply the schema:

```sh
npm run db:migrate --workspace backend
```

In separate terminals, start the backend and frontend:

```sh
npm run dev:backend
npm run dev:frontend
```

Frontend: <http://localhost:5173/>  
API health: <http://localhost:3000/api/v1/health>

The backend starts without a database for health checks, but database-backed authentication, applications, content, and documents return an unavailable response until PostgreSQL is configured and migrations are applied. Frontend API requests default to `http://localhost:3000/api/v1`; configure `VITE_API_BASE_URL` in `frontend/.env` or the build environment to change it.

## Common Commands

```sh
npm test --workspace backend
npm run build --workspace frontend
npm run db:migrate --workspace backend
npm run db:rollback --workspace backend
npm run db:seed --workspace backend
npm run db:verify --workspace backend
```

Seed data is disabled by default. The seed command requires `NODE_ENV=development` and `SEED_DEMO_DATA=true`.

## Documentation

- [Local development and troubleshooting](docs/README.md)
- [Environment variables](docs/environment.md)
- [API reference](docs/api.md)
- [Database setup, migrations, admin provisioning, and backups](database/README.md)
- [Production deployment guide](docs/deployment.md)
- [Security controls and remaining risks](SECURITY.md)

## Deployment Status

This repository contains deployment guidance only. No production deployment, live database migration, backup job, or production storage service has been performed or configured here.
=======
# hostelproj
>>>>>>> ceb1ff7652fe1a3be4081ec7a0e951b58f20ab77
