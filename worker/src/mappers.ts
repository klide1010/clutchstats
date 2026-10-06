import type { Game, GameEvent, Opponent, Player, Team } from '@bkstats/shared';

type Row = Record<string, unknown>;

const bool = (v: unknown): boolean => v === 1 || v === true;
const opt = <T>(v: unknown): T | undefined => (v === null || v === undefined ? undefined : (v as T));
const toDb = (v: unknown): unknown => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

export interface Mapper<T> {
  table: string;
  columns: string[];
  toRow(x: T): unknown[];
  fromRow(r: Row): T;
  validate(x: unknown): x is T;
}

function baseValid(x: unknown): x is { id: string; updatedAt: number } {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === 'string' && o.id.length > 0 && o.id.length <= 64 && typeof o.updatedAt === 'number' && Number.isFinite(o.updatedAt);
}

export const teamMapper: Mapper<Team> = {
  table: 'teams',
  columns: ['id', 'name', 'short_name', 'color', 'logo_url', 'updated_at', 'deleted'],
  toRow: (t) => [t.id, t.name, t.shortName, t.color, toDb(t.logoUrl), t.updatedAt, toDb(!!t.deleted)],
  fromRow: (r) => {
    const t: Team = { id: r.id as string, name: r.name as string, shortName: r.short_name as string, color: r.color as string, updatedAt: r.updated_at as number, deleted: bool(r.deleted) };
    const logo = opt<string>(r.logo_url);
    if (logo !== undefined) t.logoUrl = logo;
    return t;
  },
  validate: (x): x is Team => baseValid(x) && typeof (x as Team).name === 'string',
};

export const playerMapper: Mapper<Player> = {
  table: 'players',
  columns: ['id', 'team_id', 'first_name', 'last_name', 'number', 'role', 'active', 'photo_url', 'updated_at', 'deleted'],
  toRow: (p) => [p.id, p.teamId, p.firstName, p.lastName, p.number, p.role, toDb(!!p.active), toDb(p.photoUrl), p.updatedAt, toDb(!!p.deleted)],
  fromRow: (r) => {
    const p: Player = { id: r.id as string, teamId: r.team_id as string, firstName: r.first_name as string, lastName: r.last_name as string, number: r.number as number, role: r.role as Player['role'], active: bool(r.active), updatedAt: r.updated_at as number, deleted: bool(r.deleted) };
    const photo = opt<string>(r.photo_url);
    if (photo !== undefined) p.photoUrl = photo;
    return p;
  },
  validate: (x): x is Player => baseValid(x) && typeof (x as Player).teamId === 'string' && typeof (x as Player).number === 'number' && typeof (x as Player).role === 'string',
};

export const opponentMapper: Mapper<Opponent> = {
  table: 'opponents',
  columns: ['id', 'name', 'short_name', 'roster', 'updated_at', 'deleted'],
  toRow: (o) => [o.id, o.name, o.shortName, JSON.stringify(o.roster ?? []), o.updatedAt, toDb(!!o.deleted)],
  fromRow: (r) => ({ id: r.id as string, name: r.name as string, shortName: r.short_name as string, roster: JSON.parse((r.roster as string) || '[]'), updatedAt: r.updated_at as number, deleted: bool(r.deleted) }),
  validate: (x): x is Opponent => baseValid(x) && typeof (x as Opponent).name === 'string' && Array.isArray((x as Opponent).roster),
};

export const gameMapper: Mapper<Game> = {
  table: 'games',
  columns: ['id', 'team_id', 'opponent_id', 'date', 'home', 'competition', 'venue', 'status', 'use_clock', 'period_length_min', 'periods_regulation', 'current_period', 'source', 'ics_uid', 'starters', 'notes', 'updated_at', 'deleted'],
  toRow: (g) => [g.id, g.teamId, g.opponentId, g.date, toDb(!!g.home), toDb(g.competition), toDb(g.venue), g.status, toDb(!!g.useClock), g.periodLengthMin, g.periodsRegulation, g.currentPeriod, g.source, toDb(g.icsUid), JSON.stringify(g.starters ?? []), toDb(g.notes), g.updatedAt, toDb(!!g.deleted)],
  fromRow: (r) => {
    const g: Game = {
      id: r.id as string, teamId: r.team_id as string, opponentId: r.opponent_id as string, date: r.date as string, home: bool(r.home),
      status: r.status as Game['status'], useClock: bool(r.use_clock), periodLengthMin: r.period_length_min as number, periodsRegulation: r.periods_regulation as number,
      currentPeriod: r.current_period as number, source: r.source as Game['source'], starters: JSON.parse((r.starters as string) || '[]'), updatedAt: r.updated_at as number, deleted: bool(r.deleted),
    };
    for (const [k, col] of [['competition', 'competition'], ['venue', 'venue'], ['icsUid', 'ics_uid'], ['notes', 'notes']] as const) {
      const v = opt<string>(r[col]);
      if (v !== undefined) (g as unknown as Record<string, unknown>)[k] = v;
    }
    return g;
  },
  validate: (x): x is Game => baseValid(x) && typeof (x as Game).teamId === 'string' && typeof (x as Game).opponentId === 'string' && typeof (x as Game).date === 'string' && typeof (x as Game).status === 'string',
};

export const eventMapper: Mapper<GameEvent> = {
  table: 'events',
  columns: ['id', 'game_id', 'seq', 'period', 'clock_sec', 'side', 'type', 'player_id', 'jersey_number', 'x', 'y', 'made', 'assist_player_id', 'foul_kind', 'sub_in_player_id', 'sub_out_player_id', 'created_at', 'updated_at', 'deleted'],
  toRow: (e) => [e.id, e.gameId, e.seq, e.period, toDb(e.clockSec), e.side, e.type, toDb(e.playerId), toDb(e.jerseyNumber), toDb(e.x), toDb(e.y), e.made === undefined ? null : toDb(e.made), toDb(e.assistPlayerId), toDb(e.foulKind), toDb(e.subInPlayerId), toDb(e.subOutPlayerId), e.createdAt, e.updatedAt, toDb(!!e.deleted)],
  fromRow: (r) => {
    const e: GameEvent = { id: r.id as string, gameId: r.game_id as string, seq: r.seq as number, period: r.period as number, side: r.side as GameEvent['side'], type: r.type as GameEvent['type'], createdAt: r.created_at as number, updatedAt: r.updated_at as number, deleted: bool(r.deleted) };
    const set = (k: keyof GameEvent, v: unknown) => { if (v !== null && v !== undefined) (e as unknown as Record<string, unknown>)[k] = v; };
    set('clockSec', r.clock_sec); set('playerId', r.player_id); set('jerseyNumber', r.jersey_number); set('x', r.x); set('y', r.y);
    if (r.made !== null && r.made !== undefined) e.made = bool(r.made);
    set('assistPlayerId', r.assist_player_id); set('foulKind', r.foul_kind); set('subInPlayerId', r.sub_in_player_id); set('subOutPlayerId', r.sub_out_player_id);
    return e;
  },
  validate: (x): x is GameEvent => baseValid(x) && typeof (x as GameEvent).gameId === 'string' && typeof (x as GameEvent).seq === 'number' && typeof (x as GameEvent).period === 'number' && typeof (x as GameEvent).type === 'string' && ((x as GameEvent).side === 'US' || (x as GameEvent).side === 'THEM'),
};

export const COLLECTIONS = {
  teams: teamMapper,
  players: playerMapper,
  opponents: opponentMapper,
  games: gameMapper,
  events: eventMapper,
} as const;

export type CollectionName = keyof typeof COLLECTIONS;
export const COLLECTION_NAMES = Object.keys(COLLECTIONS) as CollectionName[];
