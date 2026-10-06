import type { Context } from 'hono';
import type { AppVariables, Env } from './env';
import { COLLECTIONS, COLLECTION_NAMES, type CollectionName, type Mapper } from './mappers';

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const BATCH_SIZE = 100;

function upsertSql<T>(m: Mapper<T>): string {
  const cols = m.columns;
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
  return `INSERT INTO ${m.table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT(id) DO UPDATE SET ${updates} WHERE excluded.updated_at > ${m.table}.updated_at`;
}

/** Upsert last-write-wins di una lista di record; ritorna il numero di righe scritte. */
export async function upsertMany<T>(db: D1Database, m: Mapper<T>, records: T[]): Promise<number> {
  if (records.length === 0) return 0;
  const stmt = db.prepare(upsertSql(m));
  let accepted = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE).map((r) => stmt.bind(...m.toRow(r)));
    const results = await db.batch(chunk);
    for (const r of results) accepted += r.meta.changes ?? 0;
  }
  return accepted;
}

export async function pushHandler(c: AppContext): Promise<Response> {
  const len = Number(c.req.header('Content-Length') ?? 0);
  if (len > MAX_BODY_BYTES) return c.json({ error: 'payload_too_large' }, 413);
  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: 'invalid_body' }, 400);
  }
  if (!body || typeof body !== 'object') return c.json({ error: 'invalid_body' }, 400);

  for (const name of COLLECTION_NAMES) {
    const list = body[name];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return c.json({ error: 'invalid_record', collection: name, index: -1 }, 400);
    const m = COLLECTIONS[name] as Mapper<unknown>;
    const bad = list.findIndex((x) => !m.validate(x));
    if (bad >= 0) return c.json({ error: 'invalid_record', collection: name, index: bad }, 400);
  }

  let accepted = 0;
  for (const name of COLLECTION_NAMES) {
    const list = body[name] as unknown[] | undefined;
    if (!list || list.length === 0) continue;
    accepted += await upsertMany(c.env.DB, COLLECTIONS[name] as Mapper<unknown>, list);
  }
  return c.json({ accepted, serverTime: Date.now() });
}

export async function pullCollection<T>(db: D1Database, m: Mapper<T>, since: number): Promise<T[]> {
  const { results } = await db.prepare(`SELECT * FROM ${m.table} WHERE updated_at > ? ORDER BY updated_at ASC`).bind(since).all<Record<string, unknown>>();
  return results.map((r) => m.fromRow(r));
}

export async function pullHandler(c: AppContext): Promise<Response> {
  const since = Number(c.req.query('since') ?? 0);
  if (!Number.isFinite(since) || since < 0) return c.json({ error: 'invalid_since' }, 400);
  const out: Record<string, unknown> = {};
  for (const name of COLLECTION_NAMES as CollectionName[]) {
    out[name] = await pullCollection(c.env.DB, COLLECTIONS[name] as Mapper<unknown>, since);
  }
  out.serverTime = Date.now();
  return c.json(out);
}
