import { it, expect } from 'vitest';
import { isResultOnly, manualScore, type Game } from '../src';

const g = (o: Partial<Game>): Game => ({ id: 'g', teamId: 't', opponentId: 'o', date: '2026-10-01T18:00:00Z', home: true, status: 'SCHEDULED', useClock: false, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 0, source: 'MANUAL', starters: [], updatedAt: 0, deleted: false, ...o });

it('manualScore solo con entrambi i punteggi', () => {
  expect(manualScore(g({ scoreUs: 60, scoreThem: 55 }))).toEqual({ us: 60, them: 55 });
  expect(manualScore(g({ scoreUs: 0, scoreThem: 0 }))).toEqual({ us: 0, them: 0 });
  expect(manualScore(g({ scoreUs: 60 }))).toBeUndefined();
  expect(manualScore(g({}))).toBeUndefined();
});

it('isResultOnly: chiusa con punteggio a mano', () => {
  expect(isResultOnly(g({ status: 'CLOSED', scoreUs: 60, scoreThem: 55 }))).toBe(true);
  expect(isResultOnly(g({ status: 'CLOSED' }))).toBe(false);
  expect(isResultOnly(g({ status: 'SCHEDULED', scoreUs: 1, scoreThem: 2 }))).toBe(false);
});
