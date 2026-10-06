import { it, expect } from 'vitest';
import type { Game, GameEvent, Player } from '@bkstats/shared';
import { computeSeason } from '../src/model/season';

const mk = (id: string, status: Game['status']): Game => ({ id, updatedAt: 1, deleted: false, teamId: 't1', opponentId: 'o1', date: '2026-10-18T18:30:00.000Z', home: true, status, useClock: false, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 4, source: 'MANUAL', starters: ['p1', 'p2', 'p3', 'p4', 'p5'] });
const players: Player[] = Array.from({ length: 6 }, (_, i) => ({ id: `p${i + 1}`, teamId: 't1', firstName: 'M', lastName: `R${i + 1}`, number: 4 + i, role: 'ALA', active: true, updatedAt: 1, deleted: false }));
const ev = (gameId: string, o: Partial<GameEvent> & Pick<GameEvent, 'type' | 'seq'>): GameEvent => ({ id: `${gameId}-${o.seq}`, gameId, period: 1, side: 'US', createdAt: 1, updatedAt: 1, deleted: false, ...o });

const g1 = [ev('g1', { type: 'PERIOD_START', seq: 1 }), ev('g1', { type: 'SHOT_2', seq: 2, playerId: 'p1', made: true }), ev('g1', { type: 'SHOT_2', seq: 3, side: 'THEM', made: true }), ev('g1', { type: 'SHOT_2', seq: 4, playerId: 'p1', made: true }), ev('g1', { type: 'PERIOD_END', seq: 5 })];
const g2 = [ev('g2', { type: 'PERIOD_START', seq: 1 }), ev('g2', { type: 'SUBSTITUTION', seq: 2, clockSec: 300, subOutPlayerId: 'p1', subInPlayerId: 'p6' }), ev('g2', { type: 'SHOT_3', seq: 3, playerId: 'p6', made: true }), ev('g2', { type: 'SHOT_2', seq: 4, side: 'THEM', made: true }), ev('g2', { type: 'SHOT_2', seq: 5, side: 'THEM', made: true }), ev('g2', { type: 'PERIOD_END', seq: 6 })];
const g3 = [ev('g3', { type: 'PERIOD_START', seq: 1 }), ev('g3', { type: 'SHOT_2', seq: 2, playerId: 'p1', made: true })];

it('aggregates only CLOSED games, counts record and games played', () => {
  const s = computeSeason([mk('g1', 'CLOSED'), mk('g2', 'CLOSED'), mk('g3', 'LIVE')], { g1, g2, g3 }, players);
  expect(s.record).toEqual({ won: 1, lost: 1 });
  const p1 = s.players.find((p) => p.playerId === 'p1')!;
  const p6 = s.players.find((p) => p.playerId === 'p6')!;
  expect(p1.pts).toBe(4);
  expect(p1.gamesPlayed).toBe(2);
  expect(p1.seconds).toBe(600 + 300);
  expect(p6.gamesPlayed).toBe(1);
  expect(p6.pts).toBe(3);
  expect(s.team.pts).toBe(7);
  expect(s.opponentPts).toBe(6);
});
