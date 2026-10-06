import { it, expect, beforeEach, vi } from 'vitest';
import { resetDb } from '../src/db';
import { ensureTeam, savePlayer } from '../src/state/team';
import { findOrCreateOpponent, opponents } from '../src/state/opponents';
import { createGame, games } from '../src/state/games';
import { openLiveGame, type LiveGame } from '../src/state/liveGame';
import { side, selectedPlayerId, selectedJersey, pendingAction, resetSelection, onPlayerTap, onActionTap, lastToast } from '../src/state/liveUi';

let lg: LiveGame;
let ids: string[];
const last = () => lg.events.value[lg.events.value.length - 1];

beforeEach(async () => {
  await resetDb();
  opponents.value = []; games.value = [];
  await ensureTeam();
  ids = [];
  for (let i = 0; i < 6; i++) { ids.push(`p${i}`); await savePlayer({ id: `p${i}`, firstName: 'N', lastName: `C${i}`, number: 4 + i, role: 'ALA', active: true }); }
  const opp = await findOrCreateOpponent('Verdi');
  const g = await createGame({ opponentId: opp.id, date: '2026-10-18T18:30:00.000Z', home: true, useClock: false });
  lg = await openLiveGame(g.id);
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
  resetSelection();
  side.value = 'US';
});

it('player then action commits a rebound', async () => {
  await onPlayerTap(ids[0], lg);
  await onActionTap('REBOUND_DEF', lg);
  expect(last()).toMatchObject({ type: 'REBOUND_DEF', playerId: ids[0], side: 'US' });
  expect(selectedPlayerId.value).toBeNull();
  expect(pendingAction.value).toBeNull();
});

it('action then player commits too', async () => {
  await onActionTap('STEAL', lg);
  expect(last().type).not.toBe('STEAL');
  expect(pendingAction.value).toBe('STEAL');
  await onPlayerTap(ids[1], lg);
  expect(last()).toMatchObject({ type: 'STEAL', playerId: ids[1] });
});

it('tapping the selected player again deselects it', async () => {
  await onPlayerTap(ids[0], lg);
  await onPlayerTap(ids[0], lg);
  expect(selectedPlayerId.value).toBeNull();
});

it('THEM action without jersey commits team event', async () => {
  side.value = 'THEM';
  await onActionTap('REBOUND_OFF', lg);
  expect(last()).toMatchObject({ type: 'REBOUND_OFF', side: 'THEM' });
  expect(last().jerseyNumber).toBeUndefined();
});

it('THEM foul with jersey', async () => {
  side.value = 'THEM';
  selectedJersey.value = 12;
  await onActionTap('FOUL', lg);
  expect(last()).toMatchObject({ type: 'FOUL', side: 'THEM', jerseyNumber: 12, foulKind: 'PERSONAL' });
  expect(selectedJersey.value).toBeNull();
});

it('US foul defaults to PERSONAL and keeps the side', async () => {
  await onPlayerTap(ids[2], lg);
  await onActionTap('FOUL', lg);
  expect(last()).toMatchObject({ type: 'FOUL', side: 'US', playerId: ids[2], foulKind: 'PERSONAL' });
  expect(side.value).toBe('US');
});

it('persistence failure keeps selection and shows error toast', async () => {
  vi.spyOn(lg, 'addEvent').mockRejectedValueOnce(new Error('idb'));
  await onPlayerTap(ids[0], lg);
  await onActionTap('STEAL', lg);
  expect(selectedPlayerId.value).toBe(ids[0]);
  expect(pendingAction.value).toBe('STEAL');
  expect(lastToast.value).toMatchObject({ kind: 'error' });
  expect(lastToast.value!.message).toContain('Salvataggio fallito');
});

it('successful commit toasts the event label', async () => {
  await onPlayerTap(ids[0], lg);
  await onActionTap('BLOCK', lg);
  expect(lastToast.value).toMatchObject({ kind: 'ok', message: '#4 C0 · Stoppata' });
});

it('a double tap while a commit is in flight records one event', async () => {
  await onPlayerTap(ids[0], lg);
  await Promise.all([onActionTap('STEAL', lg), onActionTap('STEAL', lg)]);
  expect(lg.events.value.filter((e) => e.type === 'STEAL')).toHaveLength(1);
});
