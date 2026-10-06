# Quality Gate Review

## Finding 1: Reliability / Accuracy

**Found:** An update could accidentally conflict with the booking it was replacing if the conflict query did not exclude its own ID.

**Fixed:** The update path passes the current booking ID to the parameterized overlap query, which uses `id <> ?`.

**Evidence:** The update case in `npm run test:evidence` returns `200`, and the SQL in `src/index.ts` binds the ignored ID.

## Improvement 1: Reliability

**Finding:** An update could falsely conflict with the booking it was replacing if the overlap query included the current booking.

**Action taken:** The update path passes the current booking ID to `hasConflict()`. The query excludes that ID with `id <> ?` while still checking all other bookings for the same equipment.

**Evidence:** The update request in `npm run test:evidence` returned `200`. The relevant D1 query in `src/index.ts` uses bound parameters for the equipment ID, end time, start time, and ignored booking ID.

## Improvement 2: Accuracy and Validation

**Finding:** Invalid JSON, missing fields, invalid dates, and reversed time ranges must not crash the API or return inconsistent error formats.

**Action taken:** Request parsing catches invalid JSON and validation checks all required fields, valid date-times, and the rule that `startAt` must be before `endAt`. These cases return JSON with the required `{ "error": "..." }` shape.

**Evidence:** The curl evidence suite returned `400` with `{"error":"startAt must be before endAt"}` for an invalid time range and `400` with `{"error":"Equipment does not exist"}` for an unknown equipment ID.

## Improvement 3: Reasoning and You Own It

**Finding:** The implementation needed explicit, explainable reasons for its status codes and overlap behaviour.

**Action taken:** The API contract documents these decisions: `400` means invalid input or an unknown equipment ID, `404` means a requested booking/resource does not exist, and `409` means a valid booking conflicts with an existing booking. The overlap rule is `existing.startAt < new.endAt AND existing.endAt > new.startAt`, so adjacent bookings are allowed.

**Evidence:** `API_CONTRACT.md` and `SCHEMA_ERD.md` document the decisions. The curl tests returned `409` for an overlapping booking, while an adjacent booking ending/starting at the same time returned `201`. These decisions and tests are also recorded in `AI_LOG.md`.

## Improvement 4: D1 Security and Delivery

**Finding:** The original local SQLite implementation did not run against the required Cloudflare D1 database.

**Action taken:** The API was migrated to a Cloudflare Worker with a `DB` D1 binding configured in `wrangler.jsonc`. The schema and seed data are in `schema.sql`, and all request values use D1 `.prepare().bind()` calls rather than SQL string concatenation.

**Evidence:** `npm run build` passed, `npm run db:local` applied all schema statements successfully, and `npx wrangler deploy --dry-run` confirmed the Worker upload and `env.DB` binding. The local Wrangler HTTP test suite passed all required status codes: `200`, `201`, `204`, `400`, `404`, and `409`.

## Quality Gate Checklist Summary

- The equipment and booking routes match the API contract.
- Equipment and booking records are stored and retrieved through D1.
- Create and update operations check equipment existence and time overlap.
- Invalid requests return JSON errors without crashing the Worker.
- The README contains local run, D1 setup, test, and deployment commands.
- The API contract and schema/ERD are included.
- Curl evidence covers successful requests and error cases.
- AI assistance and verification steps are recorded in `AI_LOG.md`.

## Submission Decision

**READY:** The required source code, D1 schema, API contract, schema/ERD, AI log, quality-gate review, run instructions, and curl test evidence are present. The implementation has been compiled and tested locally with Wrangler's D1 runtime. Remote schema application and deployment require the student's authenticated Cloudflare account and should be run with `npm run db:remote` followed by `npm run deploy`.