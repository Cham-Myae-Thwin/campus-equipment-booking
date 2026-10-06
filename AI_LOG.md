# AI Log

AI assistance was used to scaffold the Hono/TypeScript project from the supplied exam brief and rubric, migrate the storage layer to Cloudflare D1, propose a SQLite schema, implement the route handlers, and draft command-line evidence.

I verified the initial result by reading the brief and rubric first, checking the local Node/npm toolchain, compiling with `npm run build`, starting the server, and running `npm run test:evidence`. After the D1 migration, I reviewed the Worker binding and migration configuration and verified it with Wrangler's local D1 runtime. I reviewed the SQL to confirm request values are passed as bound parameters and checked the overlap rule manually against adjacent and intersecting intervals.

Key decisions I own and can explain: half-open time intervals allow a booking ending at 11:00 to be followed by one starting at 11:00; updates exclude their own booking ID from conflict checks; unknown equipment is a `400` validation error while unknown bookings are `404` resources.