# API Contract

Base URL: `http://localhost:8787` locally, or the Worker URL after deployment.

## Data model

See [SCHEMA_ERD.md](SCHEMA_ERD.md) for the complete column definitions and Mermaid ERD.

```text
equipment (1) -------- (many) bookings
id PK                    id PK
name                     equipment_id FK
location                 borrower_name
                         start_at
                         end_at
                         purpose
```

Equipment is seeded with `eq-1 / Projector A / Building 1` and `eq-2 / Camera A / Building 2`.

## Endpoints

| Method | Path | Success | Response |
| --- | --- | --- | --- |
| GET | `/equipment` | 200 | Equipment array |
| GET | `/bookings` or `/bookings/` | 200 | Booking array |
| GET | `/bookings/:id` | 200 | One booking |
| POST | `/bookings` or `/bookings/` | 201 | Created booking |
| PATCH | `/bookings/:id` | 200 | Updated booking |
| DELETE | `/bookings/:id` | 204 | Empty body |

Booking input requires `equipmentId`, `borrowerName`, `startAt`, `endAt`, and `purpose`. Date-times are normalized to ISO 8601 UTC strings. `startAt` must be before `endAt`, the equipment must exist, and intervals overlap when `existing.startAt < new.endAt` and `existing.endAt > new.startAt`. Endpoints use `400` for invalid input or an unknown equipment ID, `404` for an unknown booking/resource, and `409` for an overlapping booking.

All errors are JSON: `{ "error": "Human-readable message" }`.