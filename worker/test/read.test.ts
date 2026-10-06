import { it, expect, beforeAll, beforeEach } from 'vitest';
import type { Game, GameEvent, Opponent, Player, Team } from '@bkstats/shared';
import { post, get, loginToken, bearer, coach, clearDb } from './helpers';

let auth: Record<string, string>;
beforeAll(async () => { auth = bearer(await loginToken()); });
beforeEach(async () => { await clearDb(); await seed(); });

const team: Team = { id: 't1', name: 'Rossi', shortName: 'ROS', color: '#000', updatedAt: 2000, deleted: false };
const players: Player[] = [
  { id: 'p1', teamId: 't1', firstName: 'Mario', lastName: 'Bianchi', number: 4, role: 'PLAY', active: true, updatedAt: 2000, deleted: false },
  { id: 'p2', teamId: 't1', firstName: 'Luca', lastName: 'Verdi', number: 5, role: 'ALA', active: true, updatedAt: 2000, deleted: false },
  { id: 'p3', teamId: 't1', firstName: 'Gino', lastName: 'Neri', number: 6, role: 'CENTRO', active: true, updatedAt: 2000, deleted: true },
];
const opponent: Opponent = { id: 'o1', name: 'Basket Verdi', shortName: 'VER', roster: [{ number: 7 }], updatedAt: 2000, deleted: false };
const game: Game = { id: 'g1', teamId: 't1', opponentId: 'o1', date: '2026-10-18T18:30:00.000Z', home: true, status: 'CLOSED', useClock: false, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 4, source: 'MANUAL', starters: ['p1', 'p2'], updatedAt: 2000, deleted: false };
const ev = (o: Partial<GameEvent> & Pick<GameEvent, 'id' | 'seq' | 'type'>): GameEvent => ({ gameId: 'g1', period: 1, side: 'US', createdAt: 1, updatedAt: 2000, deleted: false, ...o });
const events: GameEvent[] = [
  ev({ id: 'e1', seq: 1, type: 'PERIOD_START' }),
  ev({ id: 'e2', seq: 2, type: 'SHOT_3', playerId: 'p1', made: true }),
  ev({ id: 'e3', seq: 3, type: 'SHOT_2', playerId: 'p2', made: true }),
  ev({ id: 'e4', seq: 4, type: 'SHOT_2', side: 'THEM', made: true, jerseyNumber: 7 }),
  ev({ id: 'e5', seq: 5, type: 'SHOT_2', playerId: 'p2', made: true, deleted: true }),
  ev({ id: 'e6', seq: 6, type: 'PERIOD_END' }),
];

async function seed() {
  const r = await post('/api/sync/push', { teams: [team], players, opponents: [opponent], games: [game], events }, auth);
  if (r.status !== 200) throw new Error('seed failed');
}

it('games list has opponent name and score, deleted events excluded', async () => {
  const r = await get('/api/v1/read/games', coach);
  expect(r.status).toBe(200);
  const { games } = (await r.json()) as { games: (Game & { opponentName: string; score: { us: number; them: number } })[] };
  expect(games).toHaveLength(1);
  expect(games[0]).toMatchObject({ id: 'g1', opponentName: 'Basket Verdi', score: { us: 5, them: 2 } });
});

it('boxscore returns game, opponent, players and the shared BoxScore', async () => {
  const r = await get('/api/v1/read/games/g1/boxscore', coach);
  expect(r.status).toBe(200);
  const body = (await r.json()) as { game: Game; opponent: Opponent; players: Player[]; boxScore: { score: { us: number; them: number }; players: { playerId: string; pts: number }[] } };
  expect(body.game.id).toBe('g1');
  expect(body.opponent.name).toBe('Basket Verdi');
  expect(body.players.map((p) => p.id)).toEqual(['p1', 'p2']);
  expect(body.boxScore.score).toEqual({ us: 5, them: 2 });
  expect(body.boxScore.players.find((p) => p.playerId === 'p1')!.pts).toBe(3);
});

it('events are ordered by seq without deleted; 404 for unknown game', async () => {
  const r = await get('/api/v1/read/games/g1/events', coach);
  const { events: list } = (await r.json()) as { events: GameEvent[] };
  expect(list.map((e) => e.seq)).toEqual([1, 2, 3, 4, 6]);
  expect((await get('/api/v1/read/games/nope/events', coach)).status).toBe(404);
  expect((await get('/api/v1/read/games/nope/boxscore', coach)).status).toBe(404);
});

it('players lists non-deleted players', async () => {
  const { players: list } = (await (await get('/api/v1/read/players', coach)).json()) as { players: Player[] };
  expect(list.map((p) => p.number)).toEqual([4, 5]);
});

it('roster import upserts by number and reports created/updated', async () => {
  const r = await post('/api/v1/roster/import', { players: [
    { number: 4, lastName: 'Bianchi', firstName: 'Mario Jr', role: 'GUARDIA' },
    { number: 9, lastName: 'Rosa', firstName: 'Aldo', role: 'ALA_GRANDE' },
    { number: 10, lastName: 'Blu', firstName: 'Ugo', role: 'Centro' },
  ] }, coach);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({ created: 2, updated: 1 });
  const { players: list } = (await (await get('/api/v1/read/players', coach)).json()) as { players: Player[] };
  expect(list.map((p) => p.number)).toEqual([4, 5, 9, 10]);
  const p4 = list.find((p) => p.number === 4)!;
  expect(p4).toMatchObject({ id: 'p1', firstName: 'Mario Jr', role: 'GUARDIA' });
  expect(list.find((p) => p.number === 10)!.role).toBe('CENTRO');
  expect(list.find((p) => p.number === 9)!.id).toMatch(/^[0-9a-f-]{36}$/);
});

it('roster import rejects unknown role and requires auth', async () => {
  const bad = await post('/api/v1/roster/import', { players: [{ number: 4, lastName: 'X', firstName: 'Y', role: 'PIVOT' }] }, coach);
  expect(bad.status).toBe(400);
  expect((await post('/api/v1/roster/import', { players: [] })).status).toBe(401);
  expect((await get('/api/v1/read/games')).status).toBe(401);
});
