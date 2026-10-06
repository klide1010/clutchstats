import { it, expect } from 'vitest';
import { computeSecondsPlayed, onCourtAfter } from '../src/minutes';
import { makeGame, ev } from './fixtures';

const fullPeriods = (n: number) =>
  Array.from({ length: n }, (_, i) => i + 1).flatMap((p) => [
    ev({ type: 'PERIOD_START', seq: p * 2 - 1, period: p }),
    ev({ type: 'PERIOD_END', seq: p * 2, period: p }),
  ]);

it('starter who plays whole 4 periods gets 2400 s', () => {
  expect(computeSecondsPlayed(makeGame(), fullPeriods(4)).p1).toBe(2400);
});

it('substitution at 4:00 remaining in P1 splits time', () => {
  const evs = [
    ev({ type: 'PERIOD_START', seq: 1 }),
    ev({ type: 'SUBSTITUTION', seq: 2, clockSec: 240, subOutPlayerId: 'p1', subInPlayerId: 'p6' }),
    ev({ type: 'PERIOD_END', seq: 3 }),
  ];
  const s = computeSecondsPlayed(makeGame(), evs);
  expect(s.p1).toBe(360);
  expect(s.p6).toBe(240);
});

it('substitution without clock uses half period', () => {
  const evs = [
    ev({ type: 'PERIOD_START', seq: 1 }),
    ev({ type: 'SUBSTITUTION', seq: 2, subOutPlayerId: 'p1', subInPlayerId: 'p6' }),
    ev({ type: 'PERIOD_END', seq: 3 }),
  ];
  expect(computeSecondsPlayed(makeGame(), evs).p1).toBe(300);
});

it('overtime period is 300 s', () => {
  expect(computeSecondsPlayed(makeGame(), fullPeriods(5)).p1).toBe(2700);
});

it('live period closes open intervals at nowElapsedSec', () => {
  expect(computeSecondsPlayed(makeGame(), [ev({ type: 'PERIOD_START', seq: 1 })], 120).p1).toBe(120);
});

it('deleted substitution is ignored', () => {
  const evs = [
    ev({ type: 'PERIOD_START', seq: 1 }),
    ev({ type: 'SUBSTITUTION', seq: 2, clockSec: 240, subOutPlayerId: 'p1', subInPlayerId: 'p6', deleted: true }),
    ev({ type: 'PERIOD_END', seq: 3 }),
  ];
  expect(computeSecondsPlayed(makeGame(), evs).p6).toBeUndefined();
});

it('onCourtAfter reflects substitution', () => {
  const evs = [
    ev({ type: 'PERIOD_START', seq: 1 }),
    ev({ type: 'SUBSTITUTION', seq: 2, clockSec: 240, subOutPlayerId: 'p1', subInPlayerId: 'p6' }),
  ];
  expect(onCourtAfter(makeGame(), evs, 2).sort()).toEqual(['p2', 'p3', 'p4', 'p5', 'p6']);
});
