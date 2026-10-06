import type { Context } from 'hono';
import { computeBoxScore, newId, parseRole, type Game, type GameEvent, type Opponent, type Player, type Team } from '@bkstats/shared';
import type { AppVariables, Env } from './env';
import { eventMapper, gameMapper, opponentMapper, playerMapper, teamMapper } from './mappers';
import { upsertMany } from './sync';

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;
type Row = Record<string, unknown>;

async function allRows<T>(db: D1Database, sql: string, map: (r: Row) => T, ...binds: unknown[]): Promise<T[]> {
  const { results } = await db.prepare(sql).bind(...binds).all<Row>();
  return results.map(map);
}

async function loadGame(db: D1Database, id: string): Promise<Game | null> {
  const row = await db.prepare('SELECT * FROM games WHERE id = ? AND deleted = 0').bind(id).first<Row>();
  return row ? gameMapper.fromRow(row) : null;
}

const liveEvents = (db: D1Database, gameId: string) =>
  allRows<GameEvent>(db, 'SELECT * FROM events WHERE game_id = ? AND deleted = 0 ORDER BY seq ASC', eventMapper.fromRow, gameId);

/** Convocati della partita; senza roster tutti i giocatori della squadra. */
function gamePlayers(game: Game, players: Player[]): Player[] {
  return game.roster && game.roster.length ? players.filter((p) => game.roster!.includes(p.id)) : players;
}

const teamPlayers = (db: D1Database, teamId: string) =>
  allRows<Player>(db, 'SELECT * FROM players WHERE team_id = ? AND deleted = 0 ORDER BY number ASC', playerMapper.fromRow, teamId);

export async function listGames(c: AppContext): Promise<Response> {
  const db = c.env.DB;
  const games = await allRows<Game>(db, 'SELECT * FROM games WHERE deleted = 0 ORDER BY date ASC', gameMapper.fromRow);
  const opponents = new Map((await allRows<Opponent>(db, 'SELECT * FROM opponents', opponentMapper.fromRow)).map((o) => [o.id, o]));
  const playersByTeam = new Map<string, Player[]>();
  const out = [];
  for (const g of games) {
    if (!playersByTeam.has(g.teamId)) playersByTeam.set(g.teamId, await teamPlayers(db, g.teamId));
    const bs = computeBoxScore(g, await liveEvents(db, g.id), gamePlayers(g, playersByTeam.get(g.teamId)!));
    out.push({ ...g, opponentName: opponents.get(g.opponentId)?.name ?? 'Avversario', score: bs.score });
  }
  return c.json({ games: out });
}

export async function gameBoxScore(c: AppContext): Promise<Response> {
  const db = c.env.DB;
  const game = await loadGame(db, c.req.param('id') ?? '');
  if (!game) return c.json({ error: 'not_found' }, 404);
  const [events, players, oppRow] = await Promise.all([
    liveEvents(db, game.id),
    teamPlayers(db, game.teamId),
    db.prepare('SELECT * FROM opponents WHERE id = ?').bind(game.opponentId).first<Row>(),
  ]);
  const opponent = oppRow ? opponentMapper.fromRow(oppRow) : null;
  const called = gamePlayers(game, players);
  return c.json({ game, opponent, players: called, boxScore: computeBoxScore(game, events, called) });
}

export async function gameEvents(c: AppContext): Promise<Response> {
  const game = await loadGame(c.env.DB, c.req.param('id') ?? '');
  if (!game) return c.json({ error: 'not_found' }, 404);
  return c.json({ events: await liveEvents(c.env.DB, game.id) });
}

export async function listPlayers(c: AppContext): Promise<Response> {
  return c.json({ players: await allRows<Player>(c.env.DB, 'SELECT * FROM players WHERE deleted = 0 ORDER BY number ASC', playerMapper.fromRow) });
}

interface ImportRow { number: number; lastName: string; firstName: string; role: string }

export async function rosterImport(c: AppContext): Promise<Response> {
  let body: { teamId?: unknown; players?: unknown };
  try {
    body = (await c.req.json()) as { teamId?: unknown; players?: unknown };
  } catch {
    return c.json({ error: 'invalid_body' }, 400);
  }
  if (!Array.isArray(body.players)) return c.json({ error: 'invalid_body' }, 400);

  const rows: { number: number; lastName: string; firstName: string; role: Player['role'] }[] = [];
  for (let i = 0; i < body.players.length; i++) {
    const r = body.players[i] as ImportRow;
    const role = typeof r?.role === 'string' ? parseRole(r.role) : null;
    if (!r || typeof r.number !== 'number' || !Number.isInteger(r.number) || typeof r.lastName !== 'string' || !role) {
      return c.json({ error: 'invalid_record', index: i }, 400);
    }
    rows.push({ number: r.number, lastName: r.lastName, firstName: typeof r.firstName === 'string' ? r.firstName : '', role });
  }

  const db = c.env.DB;
  let teamId: string;
  if (typeof body.teamId === 'string' && body.teamId) {
    teamId = body.teamId;
  } else {
    const teams = await allRows<Team>(db, 'SELECT * FROM teams WHERE deleted = 0', teamMapper.fromRow);
    if (teams.length !== 1) return c.json({ error: 'team_ambiguous', teams: teams.map((t) => ({ id: t.id, name: t.name })) }, 400);
    teamId = teams[0].id;
  }

  const existing = await teamPlayers(db, teamId);
  const byNumber = new Map(existing.map((p) => [p.number, p]));
  const now = Date.now();
  let created = 0;
  let updated = 0;
  const toWrite: Player[] = rows.map((r) => {
    const prev = byNumber.get(r.number);
    if (prev) { updated++; return { ...prev, firstName: r.firstName, lastName: r.lastName, role: r.role, active: true, updatedAt: now, deleted: false }; }
    created++;
    return { id: newId(), teamId, firstName: r.firstName, lastName: r.lastName, number: r.number, role: r.role, active: true, updatedAt: now, deleted: false };
  });
  await upsertMany(db, playerMapper, toWrite);
  return c.json({ created, updated });
}
