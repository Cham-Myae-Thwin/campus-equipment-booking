import { Hono } from 'hono';

type Env = {
  Bindings: {
    DB: D1Database;
  };
};

type BookingInput = {
  equipmentId?: unknown;
  borrowerName?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  purpose?: unknown;
};

type Booking = {
  id: string;
  equipmentId: string;
  borrowerName: string;
  startAt: string;
  endAt: string;
  purpose: string;
};

type BookingRow = {
  id: string;
  equipment_id: string;
  borrower_name: string;
  start_at: string;
  end_at: string;
  purpose: string;
};

const app = new Hono<Env>();

const jsonError = (message: string, status: 400 | 404 | 409) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const rowToBooking = (row: BookingRow): Booking => ({
  id: row.id,
  equipmentId: row.equipment_id,
  borrowerName: row.borrower_name,
  startAt: row.start_at,
  endAt: row.end_at,
  purpose: row.purpose,
});

function validateBooking(input: BookingInput):
  | { valid: true; value: Omit<Booking, 'id'> }
  | { valid: false; message: string } {
  const requiredFields = ['equipmentId', 'borrowerName', 'startAt', 'endAt', 'purpose'] as const;
  for (const field of requiredFields) {
    if (typeof input[field] !== 'string' || input[field].trim() === '') {
      return { valid: false, message: `${field} is required` };
    }
  }

  const startAt = new Date(input.startAt as string);
  const endAt = new Date(input.endAt as string);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { valid: false, message: 'startAt and endAt must be valid ISO date-times' };
  }
  if (startAt >= endAt) {
    return { valid: false, message: 'startAt must be before endAt' };
  }

  return {
    valid: true,
    value: {
      equipmentId: input.equipmentId as string,
      borrowerName: input.borrowerName as string,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      purpose: input.purpose as string,
    },
  };
}

async function readBookingBody(request: Request): Promise<BookingInput> {
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === 'object' ? body as BookingInput : {};
  } catch {
    return {};
  }
}

async function hasConflict(db: D1Database, booking: Omit<Booking, 'id'>, ignoredId?: string): Promise<boolean> {
  const query = ignoredId
    ? `SELECT 1 FROM bookings
       WHERE equipment_id = ? AND start_at < ? AND end_at > ? AND id <> ? LIMIT 1`
    : `SELECT 1 FROM bookings
       WHERE equipment_id = ? AND start_at < ? AND end_at > ? LIMIT 1`;
  const statement = ignoredId
    ? db.prepare(query).bind(booking.equipmentId, booking.endAt, booking.startAt, ignoredId)
    : db.prepare(query).bind(booking.equipmentId, booking.endAt, booking.startAt);
  return (await statement.first()) !== null;
}

app.get('/equipment', async (context) => {
  const result = await context.env.DB
    .prepare('SELECT id, name, location FROM equipment ORDER BY id')
    .all();
  return context.json(result.results);
});

const listBookings = async (context: { env: Env['Bindings']; req: { raw: Request }; json: (data: unknown) => Response }) => {
  const result = await context.env.DB
    .prepare('SELECT * FROM bookings ORDER BY start_at, id')
    .all<BookingRow>();
  return context.json(result.results.map(rowToBooking));
};
app.get('/bookings', listBookings);
app.get('/bookings/', listBookings);

const createBooking = async (context: { env: Env['Bindings']; req: { raw: Request }; json: (data: unknown, status?: number) => Response }) => {
  const validation = validateBooking(await readBookingBody(context.req.raw));
  if (!validation.valid) return jsonError(validation.message, 400);

  const equipment = await context.env.DB
    .prepare('SELECT id FROM equipment WHERE id = ?')
    .bind(validation.value.equipmentId)
    .first();
  if (!equipment) return jsonError('Equipment does not exist', 400);
  if (await hasConflict(context.env.DB, validation.value)) {
    return jsonError('Booking time conflicts with an existing booking', 409);
  }

  const id = crypto.randomUUID();
  await context.env.DB.prepare(`
    INSERT INTO bookings (id, equipment_id, borrower_name, start_at, end_at, purpose)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, validation.value.equipmentId, validation.value.borrowerName, validation.value.startAt, validation.value.endAt, validation.value.purpose).run();
  return context.json({ id, ...validation.value }, 201);
};
app.post('/bookings', createBooking);
app.post('/bookings/', createBooking);

app.get('/bookings/:id', async (context) => {
  const row = await context.env.DB
    .prepare('SELECT * FROM bookings WHERE id = ?')
    .bind(context.req.param('id'))
    .first<BookingRow>();
  return row ? context.json(rowToBooking(row)) : jsonError('Booking does not exist', 404);
});

app.patch('/bookings/:id', async (context) => {
  const id = context.req.param('id');
  const validation = validateBooking(await readBookingBody(context.req.raw));
  if (!validation.valid) return jsonError(validation.message, 400);
  const existing = await context.env.DB.prepare('SELECT id FROM bookings WHERE id = ?').bind(id).first();
  if (!existing) return jsonError('Booking does not exist', 404);
  const equipment = await context.env.DB.prepare('SELECT id FROM equipment WHERE id = ?').bind(validation.value.equipmentId).first();
  if (!equipment) return jsonError('Equipment does not exist', 400);
  if (await hasConflict(context.env.DB, validation.value, id)) {
    return jsonError('Booking time conflicts with an existing booking', 409);
  }

  await context.env.DB.prepare(`
    UPDATE bookings
    SET equipment_id = ?, borrower_name = ?, start_at = ?, end_at = ?, purpose = ?
    WHERE id = ?
  `).bind(validation.value.equipmentId, validation.value.borrowerName, validation.value.startAt, validation.value.endAt, validation.value.purpose, id).run();
  return context.json({ id, ...validation.value });
});

app.delete('/bookings/:id', async (context) => {
  const result = await context.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(context.req.param('id')).run();
  return result.meta.changes === 0 ? jsonError('Booking does not exist', 404) : new Response(null, { status: 204 });
});

app.notFound(() => jsonError('Resource not found', 404));

export default app;
