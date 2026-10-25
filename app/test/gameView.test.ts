import { it, expect } from 'vitest';
import type { Game, GameEvent } from '@bkstats/shared';
import { groupGames, historyByPeriod, opponentByJersey, venueLabel } from '../src/model/gameView';

const g = (id: string, date: string, status: Game['status']): Game => ({
  id, teamId: 't', opponentId: 'o', date, home: true, status, useClock: false, periodLengthMin: 10, periodsRegulation: 4,
  currentPeriod: 0, source: 'MANUAL', starters: [], updatedAt: 0, deleted: false,
});
let seq = 0;
const ev = (p: Partial<GameEvent>): GameEvent => ({ id: `e${++seq}`, gameId: 'g', seq, period: 1, side: 'US', type: 'TIMEOUT', createdAt: 0, updatedAt: 0, deleted: false, ...p } as GameEvent);

it('groupGames: in corso, prossime dalla più vicina, giocate dalla più recente', () => {
  const list = [g('a', '2026-10-01T18:00:00Z', 'CLOSED'), g('b', '2026-10-08T18:00:00Z', 'CLOSED'), g('c', '2026-10-22T18:00:00Z', 'LIVE'),
    g('d', '2026-11-05T18:00:00Z', 'SCHEDULED'), g('e', '2026-10-29T18:00:00Z', 'SCHEDULED')];
  const r = groupGames(list);
  expect(r.live.map((x) => x.id)).toEqual(['c']);
  expect(r.upcoming.map((x) => x.id)).toEqual(['e', 'd']);
  expect(r.played.map((x) => x.id)).toEqual(['b', 'a']);
});

it('venueLabel toglie il prefisso "Campo: N -" del calendario federale', () => {
  expect(venueLabel('Campo: 12 - Palestra comunale di Albino')).toBe('Palestra comunale di Albino');
  expect(venueLabel('PalaFiore')).toBe('PalaFiore');
  expect(venueLabel(undefined)).toBe('');
});

it('historyByPeriod: periodi dal più recente, eventi dal più recente, punteggio progressivo sui canestri', () => {
  const events = [
    ev({ type: 'PERIOD_START', period: 1 }),
    ev({ type: 'SHOT_2', made: true, playerId: 'a', period: 1 }),
    ev({ type: 'SHOT_3', made: false, playerId: 'a', period: 1 }),
    ev({ type: 'SHOT_3', made: true, side: 'THEM', jerseyNumber: 9, period: 1 }),
    ev({ type: 'FREE_THROW', made: true, playerId: 'b', period: 1, deleted: true }),
    ev({ type: 'PERIOD_END', period: 1 }),
    ev({ type: 'PERIOD_START', period: 2 }),
    ev({ type: 'FREE_THROW', made: true, playerId: 'b', period: 2 }),
  ];
  const r = historyByPeriod(events);
  expect(r.map((p) => p.period)).toEqual([2, 1]);
  expect(r[0]).toMatchObject({ us: 3, them: 3 });
  expect(r[1]).toMatchObject({ us: 2, them: 3 });
  expect(r[0].rows.map((x) => x.e.type)).toEqual(['FREE_THROW', 'PERIOD_START']);
  expect(r[0].rows[0].score).toEqual({ us: 3, them: 3 });
  expect(r[0].rows[1].score).toBeUndefined();
  const p1 = r[1].rows;
  expect(p1.map((x) => x.e.type)).toEqual(['PERIOD_END', 'SHOT_3', 'SHOT_3', 'SHOT_2', 'PERIOD_START']);
  expect(p1[1].score).toEqual({ us: 2, them: 3 });
  expect(p1[2].score).toBeUndefined();
  expect(p1[3].score).toEqual({ us: 2, them: 0 });
});

it('opponentByJersey unisce punti e falli per numero di maglia, in ordine', () => {
  expect(opponentByJersey({ 10: 4, 4: 2 }, { 4: 1, 15: 2 })).toEqual([
    { number: 4, pts: 2, fouls: 1 }, { number: 10, pts: 4, fouls: 0 }, { number: 15, pts: 0, fouls: 2 },
  ]);
});
