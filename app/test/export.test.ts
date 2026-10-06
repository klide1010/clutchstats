import { it, expect } from 'vitest';
import { computeBoxScore, type Game, type GameEvent, type Player } from '@bkstats/shared';
import { boxScoreToCsv, gameToJson } from '../src/model/export';

const game: Game = { id: 'g1', updatedAt: 1, deleted: false, teamId: 't1', opponentId: 'o1', date: '2026-10-18T18:30:00.000Z', home: true, status: 'CLOSED', useClock: false, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 4, source: 'MANUAL', starters: ['p1', 'p2', 'p3', 'p4', 'p5'] };
const players: Player[] = Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, teamId: 't1', firstName: 'Mario', lastName: `Rossi${i + 1}`, number: 4 + i, role: 'ALA', active: true, updatedAt: 1, deleted: false }));
const ev = (o: Partial<GameEvent> & Pick<GameEvent, 'type' | 'seq'>): GameEvent => ({ id: `e${o.seq}`, gameId: 'g1', period: 1, side: 'US', createdAt: 1, updatedAt: 1, deleted: false, ...o });
const events: GameEvent[] = [
  ev({ type: 'PERIOD_START', seq: 1 }),
  ev({ type: 'SHOT_3', seq: 2, playerId: 'p1', made: true }),
  ev({ type: 'SHOT_3', seq: 3, playerId: 'p1', made: true }),
  ev({ type: 'SHOT_3', seq: 4, playerId: 'p1', made: true }),
  ev({ type: 'SHOT_3', seq: 5, playerId: 'p1', made: false }),
  ev({ type: 'SHOT_3', seq: 6, playerId: 'p1', made: false }),
  ev({ type: 'SHOT_2', seq: 7, side: 'THEM', made: true, jerseyNumber: 7 }),
  ev({ type: 'PERIOD_END', seq: 8 }),
];
const bs = computeBoxScore(game, events, players);

it('csv has the exact header, fatti/tentati shots, mm:ss minutes, team and opponent rows', () => {
  const lines = boxScoreToCsv(bs, players).split('\n');
  expect(lines[0]).toBe('N;Giocatore;Min;PT;T2;T3;TL;RO;RD;RT;AS;PP;PR;ST;SS;FF;FS;BL;+/-;Val');
  const p1 = lines[1].split(';');
  expect(p1[0]).toBe('4');
  expect(p1[1]).toBe('Rossi1 Mario');
  expect(p1[2]).toBe('10:00');
  expect(p1[3]).toBe('9');
  expect(p1[5]).toBe('3/5');
  expect(lines[lines.length - 2].startsWith('Squadra;')).toBe(true);
  expect(lines[lines.length - 1].startsWith('Avversari;')).toBe(true);
  expect(lines[lines.length - 1].split(';')[3]).toBe('2');
});

it('json export contains game, opponent, players, events and boxScore', () => {
  const json = JSON.parse(gameToJson(game, events, players, { id: 'o1', name: 'Verdi', shortName: 'VER', roster: [], updatedAt: 1, deleted: false }, bs));
  expect(json.game.id).toBe('g1');
  expect(json.opponent.name).toBe('Verdi');
  expect(json.players).toHaveLength(5);
  expect(json.events).toHaveLength(8);
  expect(json.boxScore.score).toEqual({ us: 9, them: 2 });
  expect(json.exportedAt).toBeTruthy();
});
