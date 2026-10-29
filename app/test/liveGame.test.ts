import { it, expect, beforeEach } from 'vitest';
import { resetDb, eventsRepo, gamesRepo } from '../src/db';
import { ensureTeam, savePlayer } from '../src/state/team';
import { findOrCreateOpponent, opponents } from '../src/state/opponents';
import { createGame, games } from '../src/state/games';
import { openLiveGame, eventLabel, type LiveGame } from '../src/state/liveGame';

let lg: LiveGame;
let ids: string[];
const last = () => lg.events.value[lg.events.value.length - 1];

async function setup(useClock = false) {
  await resetDb();
  opponents.value = []; games.value = [];
  await ensureTeam();
  ids = [];
  for (let i = 0; i < 8; i++) {
    const id = `p${i + 1}`;
    ids.push(id);
    await savePlayer({ id, firstName: `N${i}`, lastName: `Cognome${i}`, number: 4 + i, role: 'ALA', active: true });
  }
  const opp = await findOrCreateOpponent('Verdi');
  const g = await createGame({ opponentId: opp.id, date: '2026-10-18T18:30:00.000Z', home: true, useClock });
  lg = await openLiveGame(g.id);
}

beforeEach(() => setup());

it('setStarters then startPeriod makes game LIVE with 5 on court', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  expect(lg.game.value.status).toBe('LIVE');
  expect(lg.game.value.currentPeriod).toBe(1);
  expect(lg.onCourt.value).toHaveLength(5);
  expect(lg.bench.value.map((p) => p.id)).toEqual(ids.slice(5));
  expect(lg.periodOpen.value).toBe(true);
  expect((await gamesRepo.get(lg.game.value.id))!.status).toBe('LIVE');
});

it('setStarters requires exactly 5 and only before period 1', async () => {
  await expect(lg.setStarters(ids.slice(0, 4))).rejects.toThrow();
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await expect(lg.setStarters(ids.slice(1, 6))).rejects.toThrow();
});

it('addEvent assigns seq and period and persists', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.addEvent({ type: 'SHOT_2', side: 'US', playerId: ids[0], made: true, x: 0.5, y: 0.2 });
  expect(lg.events.value).toHaveLength(2);
  expect(last()).toMatchObject({ seq: 2, period: 1, type: 'SHOT_2' });
  expect(await eventsRepo.byGame(lg.game.value.id)).toHaveLength(2);
  expect(lg.boxScore.value.score.us).toBe(2);
});

it('rejects US shot without player', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await expect(lg.addEvent({ type: 'SHOT_2', side: 'US', made: true })).rejects.toThrow();
});

it('rejects THEM types not allowed', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await expect(lg.addEvent({ type: 'SCREEN', side: 'THEM' })).rejects.toThrow();
});

it('rejects shots when period not open', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await expect(lg.addEvent({ type: 'SHOT_2', side: 'US', playerId: ids[0], made: true })).rejects.toThrow('Periodo non aperto');
});

it('undo soft-deletes last event but never PERIOD_START', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  expect(lg.canUndo.value).toBe(false);
  expect(await lg.undo()).toBeNull();
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] });
  expect(lg.canUndo.value).toBe(true);
  const u = await lg.undo();
  expect(u!.type).toBe('STEAL');
  expect(lg.boxScore.value.players.find((p) => p.playerId === ids[0])!.stl).toBe(0);
  expect(lg.canUndo.value).toBe(false);
  expect((await eventsRepo.byGame(lg.game.value.id)).filter((e) => e.deleted)).toHaveLength(1);
});

it('substitute without clock requires clockSec and updates onCourt', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[1] });
  await expect(lg.substitute(ids[0], ids[5])).rejects.toThrow();
  await lg.substitute(ids[0], ids[5], 300);
  expect(lg.onCourt.value).toContain(ids[5]);
  expect(lg.onCourt.value).not.toContain(ids[0]);
  expect(last().clockSec).toBe(300);
  expect(eventLabel(last(), lg.players.value)).toBe('Cambio: esce #4 entra #9');
});

it('endPeriod then startPeriod increments period; 5th period is overtime of 300 s', async () => {
  await lg.setStarters(ids.slice(0, 5));
  for (let p = 1; p <= 4; p++) { await lg.startPeriod(); await lg.endPeriod(); }
  expect(lg.periodOpen.value).toBe(false);
  await lg.startPeriod();
  expect(lg.game.value.currentPeriod).toBe(5);
  expect(lg.clock.remainingSec.value).toBe(300);
});

it('closeGame ends open period and sets CLOSED', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.closeGame();
  expect(lg.game.value.status).toBe('CLOSED');
  expect(last().type).toBe('PERIOD_END');
  expect(lg.periodOpen.value).toBe(false);
});

it('useClock game stamps clockSec from the clock', async () => {
  await setup(true);
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  lg.clock.set(123);
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] });
  expect(last().clockSec).toBe(123);
  await lg.substitute(ids[0], ids[5]);
  expect(last().clockSec).toBe(123);
});

it('deleteEvent removes a specific event and eventLabel describes events', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  const e1 = await lg.addEvent({ type: 'SHOT_3', side: 'US', playerId: ids[0], made: true });
  await lg.addEvent({ type: 'FOUL', side: 'THEM', jerseyNumber: 12, foulKind: 'PERSONAL' });
  expect(eventLabel(e1, lg.players.value)).toBe('#4 Cognome0 · T3 segnato');
  expect(eventLabel(last(), lg.players.value)).toBe('Loro #12 · Fallo');
  await lg.deleteEvent(e1.id);
  expect(lg.boxScore.value.score.us).toBe(0);
  expect(lg.boxScore.value.opponent.foulsByJersey[12]).toBe(1);
});

it('reopening a live game reloads persisted events', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] });
  const again = await openLiveGame(lg.game.value.id);
  expect(again.events.value).toHaveLength(2);
  expect(again.periodOpen.value).toBe(true);
  expect(again.game.value.currentPeriod).toBe(1);
});

it('reopening a clock game restores the clock from the last stamped event', async () => {
  await setup(true);
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  lg.clock.set(123);
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] });
  const again = await openLiveGame(lg.game.value.id);
  expect(again.clock.remainingSec.value).toBe(123);
  expect(again.clock.running.value).toBe(false);
});

it('concurrent addEvent calls get distinct seq', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  const [a, b] = await Promise.all([
    lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] }),
    lg.addEvent({ type: 'TURNOVER', side: 'US', playerId: ids[1] }),
  ]);
  expect(a.seq).not.toBe(b.seq);
  expect(new Set(lg.events.value.map((e) => e.seq)).size).toBe(3);
});

it('addEvent on a CLOSED game is rejected with a clear message', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.closeGame();
  await expect(lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] })).rejects.toThrow('Partita chiusa');
});

it('setRoster limits bench, box score and starters to the called-up players', async () => {
  await lg.setRoster(ids.slice(0, 7));
  expect(lg.game.value.roster).toEqual(ids.slice(0, 7));
  expect(lg.players.value.map((p) => p.id)).toEqual(ids.slice(0, 7));
  await expect(lg.setStarters([ids[0], ids[1], ids[2], ids[3], ids[7]])).rejects.toThrow();
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  expect(lg.bench.value.map((p) => p.id)).toEqual([ids[5], ids[6]]);
  expect(lg.boxScore.value.players.map((p) => p.playerId)).toEqual(ids.slice(0, 7));
});

it('a called-up inactive player stays available on the bench after being subbed out', async () => {
  await savePlayer({ id: ids[5], firstName: 'N5', lastName: 'Cognome5', number: 9, role: 'ALA', active: false });
  lg.dispose();
  lg = await openLiveGame(lg.game.value.id);
  await lg.setRoster(ids.slice(0, 7));
  await lg.setStarters([ids[0], ids[1], ids[2], ids[3], ids[5]]);
  await lg.startPeriod();
  expect(lg.bench.value.map((p) => p.id)).toEqual([ids[4], ids[6]]);
  await lg.substitute(ids[5], ids[4], 300);
  expect(lg.bench.value.map((p) => p.id)).toEqual([ids[5], ids[6]]);
  await lg.substitute(ids[0], ids[5], 200);
  expect(lg.onCourt.value).toContain(ids[5]);
});

it('reload picks up roster changes made while the game is open', async () => {
  await lg.setRoster(ids.slice(0, 7));
  await savePlayer({ id: ids[6], firstName: 'N6', lastName: 'Rinominato', number: 10, role: 'ALA', active: true });
  await lg.reload();
  expect(lg.players.value.find((p) => p.id === ids[6])?.lastName).toBe('Rinominato');
});

it('setRoster requires at least 5 players and is locked after period 1', async () => {
  await expect(lg.setRoster(ids.slice(0, 4))).rejects.toThrow();
  await lg.setRoster(ids.slice(0, 6));
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await expect(lg.setRoster(ids.slice(0, 7))).rejects.toThrow();
});

it('without a roster all active players are available', async () => {
  expect(lg.allPlayers.value).toHaveLength(8);
  expect(lg.players.value).toHaveLength(8);
});

it('startPeriod stamps the game with this device id', async () => {
  const { getDeviceId } = await import('../src/state/device');
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  expect(lg.game.value.ownerDevice).toBe(await getDeviceId());
});

it('a live game owned by another device is flagged and can be taken over', async () => {
  const { gamesRepo } = await import('../src/db');
  const { getDeviceId } = await import('../src/state/device');
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] });
  await gamesRepo.put({ ...lg.game.value, ownerDevice: 'other-device' });
  const again = await openLiveGame(lg.game.value.id);
  expect(again.foreignLive.value).toBe(true);
  await again.takeOver();
  expect(again.game.value.ownerDevice).toBe(await getDeviceId());
  expect(again.foreignLive.value).toBe(false);
  expect(again.events.value.filter((e) => !e.deleted)).toHaveLength(2);
});

it('restartFromScratch soft-deletes all events and resets the game to scheduled', async () => {
  const { gamesRepo } = await import('../src/db');
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] });
  await gamesRepo.put({ ...lg.game.value, ownerDevice: 'other-device' });
  const again = await openLiveGame(lg.game.value.id);
  await again.restartFromScratch();
  expect(again.game.value).toMatchObject({ status: 'SCHEDULED', currentPeriod: 0, starters: [] });
  expect(again.events.value.every((e) => e.deleted)).toBe(true);
  expect(again.events.value).toHaveLength(2);
  expect(again.foreignLive.value).toBe(false);
  expect(again.periodOpen.value).toBe(false);
});

it('addOpponentNumber persists a new jersey number on the opponent', async () => {
  const { opponentsRepo } = await import('../src/db');
  await lg.addOpponentNumber(12);
  await lg.addOpponentNumber(12);
  expect(lg.opponent.value.roster.map((r) => r.number)).toEqual([12]);
  expect((await opponentsRepo.get(lg.opponent.value.id))!.roster).toEqual([{ number: 12 }]);
});

it('a player with 5 fouls is flagged as fouled out and cannot record further actions until substituted', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  for (let i = 0; i < 5; i++) await lg.addEvent({ type: 'FOUL', side: 'US', playerId: ids[0], foulKind: 'PERSONAL' });
  expect(lg.fouledOut.value).toEqual([ids[0]]);
  expect(lg.lastFoulOf(ids[0])?.type).toBe('FOUL');
  await expect(lg.addEvent({ type: 'STEAL', side: 'US', playerId: ids[0] })).rejects.toThrow('5 falli');
  await expect(lg.addEvent({ type: 'SHOT_2', side: 'US', playerId: ids[0], made: true })).rejects.toThrow('5 falli');
  await lg.substitute(ids[0], ids[5], 300);
  expect(lg.fouledOut.value).toEqual([]);
  await expect(lg.substitute(ids[5], ids[0], 200)).rejects.toThrow('5 falli');
});

it('undoing the fifth foul clears the fouled-out state', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  for (let i = 0; i < 5; i++) await lg.addEvent({ type: 'FOUL', side: 'US', playerId: ids[0], foulKind: 'PERSONAL' });
  await lg.deleteEvent(lg.lastFoulOf(ids[0])!.id);
  expect(lg.fouledOut.value).toEqual([]);
});

it('setPeriodLineup between periods swaps in the chosen five without touching minutes', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await lg.endPeriod();
  await lg.setPeriodLineup([ids[0], ids[1], ids[5], ids[6], ids[7]]);
  expect([...lg.onCourt.value].sort()).toEqual([ids[0], ids[1], ids[5], ids[6], ids[7]].sort());
  const subs = lg.events.value.filter((e) => e.type === 'SUBSTITUTION' && !e.deleted);
  expect(subs).toHaveLength(3);
  expect(subs.every((e) => e.period === 1 && e.clockSec === undefined)).toBe(true);
  // stesso quintetto: nessun evento
  await lg.setPeriodLineup([ids[0], ids[1], ids[5], ids[6], ids[7]]);
  expect(lg.events.value.filter((e) => e.type === 'SUBSTITUTION')).toHaveLength(3);
  await lg.startPeriod();
  expect(lg.game.value.currentPeriod).toBe(2);
});

it('setPeriodLineup is refused during a period, with the wrong count or a fouled-out player', async () => {
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  await expect(lg.setPeriodLineup(ids.slice(1, 6))).rejects.toThrow('Periodo in corso');
  for (let i = 0; i < 5; i++) await lg.addEvent({ type: 'FOUL', side: 'US', playerId: ids[0] });
  await lg.endPeriod();
  await expect(lg.setPeriodLineup(ids.slice(1, 5))).rejects.toThrow('5 giocatori');
  await expect(lg.setPeriodLineup(ids.slice(0, 5))).rejects.toThrow('5 falli');
  await lg.setPeriodLineup(ids.slice(1, 6));
  expect(lg.onCourt.value).not.toContain(ids[0]);
});
