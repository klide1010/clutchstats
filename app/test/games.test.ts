import { it, expect, beforeEach } from 'vitest';
import { resetDb, meta } from '../src/db';
import { createGame, games, importProposals, loadGames, updateGame, removeGame } from '../src/state/games';
import { ensureTeam } from '../src/state/team';

beforeEach(async () => { await resetDb(); games.value = []; await ensureTeam(); });

it('createGame applies defaults and the team id', async () => {
  const g = await createGame({ opponentId: 'o1', date: '2026-10-18T18:30:00.000Z', home: true, useClock: false });
  expect(g).toMatchObject({ periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 0, status: 'SCHEDULED', starters: [], source: 'MANUAL', opponentId: 'o1' });
  expect(g.teamId).toBeTruthy();
  expect(games.value).toHaveLength(1);
});

it('createGame reads the default period length from meta', async () => {
  await meta.set('defaultPeriodLengthMin', 8);
  const g = await createGame({ opponentId: 'o1', date: '2026-10-18T18:30:00.000Z', home: true, useClock: true });
  expect(g.periodLengthMin).toBe(8);
});

it('importProposals updates same icsUid instead of duplicating', async () => {
  const props = [{ icsUid: 'u1', date: '2026-10-18T18:30:00.000Z', opponentName: 'Verdi', home: true, venue: 'Pala', summary: 's' }];
  const first = await importProposals(props, { u1: 'o1' }, false);
  expect(first).toEqual({ created: 1, updated: 0 });
  const second = await importProposals([{ ...props[0], date: '2026-10-19T18:30:00.000Z', venue: 'Altro' }], { u1: 'o2' }, false);
  expect(second).toEqual({ created: 0, updated: 1 });
  await loadGames();
  expect(games.value).toHaveLength(1);
  expect(games.value[0]).toMatchObject({ date: '2026-10-19T18:30:00.000Z', venue: 'Altro', opponentId: 'o2', source: 'ICS', icsUid: 'u1' });
});

it('games are sorted by date, updateGame patches, removeGame hides', async () => {
  const b = await createGame({ opponentId: 'o1', date: '2026-11-01T18:30:00.000Z', home: true, useClock: false });
  const a = await createGame({ opponentId: 'o1', date: '2026-10-01T18:30:00.000Z', home: true, useClock: false });
  expect(games.value.map((g) => g.id)).toEqual([a.id, b.id]);
  await updateGame(a.id, { status: 'LIVE' });
  expect(games.value[0].status).toBe('LIVE');
  await removeGame(b.id);
  expect(games.value).toHaveLength(1);
});
