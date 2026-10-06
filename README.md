# Campus Equipment Booking API

TypeScript + Hono API backed by Cloudflare D1. The SQL uses D1 prepared statements with parameter binding throughout.

## Run

```bash
npm install
npm run db:local
npm run build
npm run dev
```

The API listens at `http://localhost:8788`. Local D1 data is created by `npm run db:local` and seeded with `eq-1` and `eq-2`.

## Deploy to Cloudflare

Authenticate Wrangler with `npx wrangler login`, apply the schema to the configured D1 database, then deploy:

```bash
npm run db:remote
npm run deploy
```

The D1 binding is configured in [wrangler.jsonc](wrangler.jsonc) with database `campus-booking-db` and the supplied database ID. Never put a Cloudflare API token in the repository.

## Contract

See [API_CONTRACT.md](API_CONTRACT.md) and the detailed [SCHEMA_ERD.md](SCHEMA_ERD.md). `PATCH` and `DELETE` use `/bookings/:id`; the trailing slash list/create forms are also accepted.

## Evidence

With the server running in another terminal:

```bash
npm run test:evidence
```

The script prints status codes and response bodies for equipment, create, list, conflict, invalid time, update, get-one, delete, and not-found cases. The review record is in [QUALITY_GATE_REVIEW.md](QUALITY_GATE_REVIEW.md), and AI-use disclosure is in [AI_LOG.md](AI_LOG.md).