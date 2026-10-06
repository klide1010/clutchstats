import { it, expect } from 'vitest';
import { computeBoxScore } from '../src/boxscore';
import { makeGame, makePlayers, ev } from './fixtures';

const base = [ev({ type: 'PERIOD_START', seq: 1 })];
const line = (bs: ReturnType<typeof computeBoxScore>, id: string) => bs.players.find((p) => p.playerId === id)!;

it('counts a made 3 with assist', () => {
  const bs = computeBoxScore(makeGame(), [...base, ev({ type: 'SHOT_3', seq: 2, playerId: 'p1', made: true, assistPlayerId: 'p2', x: 0.5, y: 0.7 })], makePlayers());
  expect(line(bs, 'p1').pts).toBe(3);
  expect(line(bs, 'p1').fg3m).toBe(1);
  expect(line(bs, 'p1').fg3a).toBe(1);
  expect(line(bs, 'p2').ast).toBe(1);
  expect(bs.score.us).toBe(3);
});

it('missed shot counts attempt only and no assist', () => {
  const bs = computeBoxScore(makeGame(), [...base, ev({ type: 'SHOT_2', seq: 2, playerId: 'p1', made: false, assistPlayerId: 'p2' })], makePlayers());
  expect(line(bs, 'p1').fg2a).toBe(1);
  expect(line(bs, 'p1').fg2m).toBe(0);
  expect(line(bs, 'p2').ast).toBe(0);
});

it('deleted event is ignored', () => {
  const bs = computeBoxScore(makeGame(), [...base, ev({ type: 'SHOT_2', seq: 2, playerId: 'p1', made: true, deleted: true })], makePlayers());
  expect(bs.score.us).toBe(0);
});

it('opponent points and fouls by jersey', () => {
  const evs = [
    ...base,
    ev({ type: 'SHOT_2', seq: 2, side: 'THEM', made: true, jerseyNumber: 7 }),
    ev({ type: 'FOUL', seq: 3, side: 'THEM', jerseyNumber: 7, foulKind: 'PERSONAL' }),
    ev({ type: 'FOUL', seq: 4, side: 'THEM', foulKind: 'PERSONAL' }),
  ];
  const bs = computeBoxScore(makeGame(), evs, makePlayers());
  expect(bs.score.them).toBe(2);
  expect(bs.opponent.pointsByJersey[7]).toBe(2);
  expect(bs.opponent.foulsByJersey[7]).toBe(1);
  expect(bs.opponent.foulsByPeriod[1]).toBe(2);
});

it('team fouls by period and player pf', () => {
  const evs = [
    ...base,
    ev({ type: 'FOUL', seq: 2, playerId: 'p3', foulKind: 'PERSONAL' }),
    ev({ type: 'PERIOD_END', seq: 3 }),
    ev({ type: 'PERIOD_START', seq: 4, period: 2 }),
    ev({ type: 'FOUL', seq: 5, period: 2, playerId: 'p3', foulKind: 'TECHNICAL' }),
  ];
  const bs = computeBoxScore(makeGame(), evs, makePlayers());
  expect(bs.team.foulsByPeriod).toEqual({ 1: 1, 2: 1 });
  expect(line(bs, 'p3').pf).toBe(2);
});

it('plus/minus for players on court', () => {
  const evs = [
    ...base,
    ev({ type: 'SUBSTITUTION', seq: 2, clockSec: 300, subOutPlayerId: 'p1', subInPlayerId: 'p6' }),
    ev({ type: 'SHOT_2', seq: 3, side: 'THEM', made: true }),
  ];
  const bs = computeBoxScore(makeGame(), evs, makePlayers());
  expect(line(bs, 'p1').plusMinus).toBe(0);
  expect(line(bs, 'p6').plusMinus).toBe(-2);
});

it('rebounds, steals, blocks, screens, fouls drawn, free throws', () => {
  const evs = [
    ...base,
    ev({ type: 'REBOUND_OFF', seq: 2, playerId: 'p4' }),
    ev({ type: 'REBOUND_DEF', seq: 3, playerId: 'p4' }),
    ev({ type: 'STEAL', seq: 4, playerId: 'p4' }),
    ev({ type: 'BLOCK', seq: 5, playerId: 'p4' }),
    ev({ type: 'BLOCK_RECEIVED', seq: 6, playerId: 'p4' }),
    ev({ type: 'SCREEN', seq: 7, playerId: 'p4' }),
    ev({ type: 'FOUL_DRAWN', seq: 8, playerId: 'p4' }),
    ev({ type: 'FREE_THROW', seq: 9, playerId: 'p4', made: true }),
    ev({ type: 'FREE_THROW', seq: 10, playerId: 'p4', made: false }),
    ev({ type: 'TURNOVER', seq: 11, playerId: 'p4' }),
  ];
  expect(line(computeBoxScore(makeGame(), evs, makePlayers()), 'p4')).toMatchObject({
    oreb: 1, dreb: 1, reb: 2, stl: 1, blk: 1, blkR: 1, screens: 1, pfd: 1, ftm: 1, fta: 2, pts: 1, tov: 1,
  });
});

it('score by period', () => {
  const evs = [
    ...base,
    ev({ type: 'SHOT_2', seq: 2, playerId: 'p1', made: true }),
    ev({ type: 'PERIOD_END', seq: 3 }),
    ev({ type: 'PERIOD_START', seq: 4, period: 2 }),
    ev({ type: 'SHOT_3', seq: 5, period: 2, side: 'THEM', made: true }),
  ];
  expect(computeBoxScore(makeGame(), evs, makePlayers()).scoreByPeriod).toEqual([
    { period: 1, us: 2, them: 0 },
    { period: 2, us: 0, them: 3 },
  ]);
});

it('team line aggregates players and counts timeouts', () => {
  const evs = [...base, ev({ type: 'SHOT_2', seq: 2, playerId: 'p1', made: true }), ev({ type: 'TIMEOUT', seq: 3 }), ev({ type: 'TIMEOUT', seq: 4, side: 'THEM' })];
  const bs = computeBoxScore(makeGame(), evs, makePlayers());
  expect(bs.team.pts).toBe(2);
  expect(bs.team.timeouts).toBe(1);
  expect(bs.opponent.timeouts).toBe(1);
});
