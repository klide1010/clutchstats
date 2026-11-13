import { it, expect } from 'vitest';
import { coachStatus, computeBoxScore, playerFoulStatus, teamFoulPeriod, isCoachFoul } from '../src';
import { makeGame, makePlayers, ev } from './fixtures';

const foul = (seq: number, foulKind: string, o: object = {}) => ev({ type: 'FOUL', seq, playerId: 'p1', foulKind: foulKind as never, ...o });

it('5 falli di qualunque tipo da giocatore (personali, disruptive, tecnici) fanno uscire, senza espulsione', () => {
  const s = playerFoulStatus([foul(1, 'PERSONAL'), foul(2, 'DISRUPTIVE'), foul(3, 'TECHNICAL_2'), foul(4, 'OFFENSIVE'), foul(5, 'DISRUPTIVE')], 'p1');
  expect(s).toMatchObject({ fouls: 5, gdFouls: 0, fouledOut: true, disqualified: false, out: true });
});

it('espulsione FIBA 2026: 2 tecnici cat. 1, 2 flagranti, 1 + 1, o un fallo da espulsione', () => {
  expect(playerFoulStatus([foul(1, 'TECHNICAL'), foul(2, 'TECHNICAL')], 'p1').disqualified).toBe(true);
  expect(playerFoulStatus([foul(1, 'FLAGRANT'), foul(2, 'FLAGRANT')], 'p1').disqualified).toBe(true);
  expect(playerFoulStatus([foul(1, 'FLAGRANT'), foul(2, 'TECHNICAL')], 'p1').disqualified).toBe(true);
  expect(playerFoulStatus([foul(1, 'DISQUALIFYING')], 'p1')).toMatchObject({ disqualified: true, out: true });
  // non contano: disruptive e tecnico di categoria 2
  expect(playerFoulStatus([foul(1, 'DISRUPTIVE'), foul(2, 'TECHNICAL_2'), foul(3, 'FLAGRANT')], 'p1').disqualified).toBe(false);
  // partite registrate prima del 2026: l'antisportivo conta come il flagrante
  expect(playerFoulStatus([foul(1, 'UNSPORTSMANLIKE'), foul(2, 'TECHNICAL')], 'p1').disqualified).toBe(true);
  // falli cancellati non contano
  expect(playerFoulStatus([foul(1, 'TECHNICAL'), foul(2, 'TECHNICAL', { deleted: true })], 'p1').disqualified).toBe(false);
});

it('allenatore espulso con 2 tecnici C, oppure con 3 tra B e C', () => {
  const c = (seq: number, k: string) => ev({ type: 'FOUL', seq, foulKind: k as never });
  expect(coachStatus([c(1, 'COACH_TECHNICAL')], 'US')).toMatchObject({ coach: 1, bench: 0, disqualified: false });
  expect(coachStatus([c(1, 'COACH_TECHNICAL'), c(2, 'COACH_TECHNICAL')], 'US').disqualified).toBe(true);
  expect(coachStatus([c(1, 'BENCH_TECHNICAL'), c(2, 'BENCH_TECHNICAL')], 'US').disqualified).toBe(false);
  expect(coachStatus([c(1, 'BENCH_TECHNICAL'), c(2, 'BENCH_TECHNICAL'), c(3, 'BENCH_TECHNICAL')], 'US').disqualified).toBe(true);
  expect(coachStatus([c(1, 'BENCH_TECHNICAL'), c(2, 'COACH_TECHNICAL'), c(3, 'BENCH_TECHNICAL')], 'US').disqualified).toBe(true);
  expect(coachStatus([c(1, 'COACH_TECHNICAL'), c(2, 'COACH_TECHNICAL')], 'THEM').disqualified).toBe(false);
  expect(isCoachFoul('BENCH_TECHNICAL')).toBe(true);
  expect(isCoachFoul('TECHNICAL')).toBe(false);
});

it('falli di squadra: i supplementari contano come ultimo quarto', () => {
  expect(teamFoulPeriod(2, 4)).toBe(2);
  expect(teamFoulPeriod(5, 4)).toBe(4);
  expect(teamFoulPeriod(6, 4)).toBe(4);
});

it('box score: tecnici di allenatore e panchina non sono falli di squadra né FF; i supplementari si sommano al 4° quarto', () => {
  const events = [ev({ type: 'PERIOD_START', seq: 1, period: 4 }),
    ev({ type: 'FOUL', seq: 2, period: 4, playerId: 'p1', foulKind: 'PERSONAL' }),
    ev({ type: 'FOUL', seq: 3, period: 4, foulKind: 'COACH_TECHNICAL' }),
    ev({ type: 'FOUL', seq: 4, period: 4, playerId: 'p2', foulKind: 'TECHNICAL_2' }),
    ev({ type: 'PERIOD_END', seq: 5, period: 4 }),
    ev({ type: 'PERIOD_START', seq: 6, period: 5 }),
    ev({ type: 'FOUL', seq: 7, period: 5, playerId: 'p1', foulKind: 'DISRUPTIVE' }),
    ev({ type: 'FOUL', seq: 8, period: 5, side: 'THEM', foulKind: 'BENCH_TECHNICAL' }),
    ev({ type: 'FOUL', seq: 9, period: 5, side: 'THEM', jerseyNumber: 7, foulKind: 'FLAGRANT' })];
  const bs = computeBoxScore(makeGame({ currentPeriod: 5 }), events, makePlayers());
  expect(bs.team.foulsByPeriod).toEqual({ 4: 3 });
  expect(bs.team.pf).toBe(3);
  expect(bs.players.find((l) => l.playerId === 'p1')!.pf).toBe(2);
  expect(bs.opponent.foulsByPeriod).toEqual({ 4: 1 });
  expect(bs.opponent.pf).toBe(1);
  expect(bs.opponent.foulsByJersey).toEqual({ 7: 1 });
});
