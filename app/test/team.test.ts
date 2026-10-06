import { it, expect, beforeEach } from 'vitest';
import { resetDb, playersRepo } from '../src/db';
import { ensureTeam, myTeam, players, loadPlayers, savePlayer, removePlayer } from '../src/state/team';

beforeEach(async () => { await resetDb(); });

it('ensureTeam creates once', async () => {
  const a = await ensureTeam();
  const b = await ensureTeam();
  expect(a.id).toBe(b.id);
  expect(a).toMatchObject({ name: 'La mia squadra', shortName: 'NOI' });
  expect(myTeam.value?.id).toBe(a.id);
});

it('savePlayer assigns teamId and players signal is sorted by number', async () => {
  const t = await ensureTeam();
  await savePlayer({ id: 'b', firstName: 'B', lastName: 'B', number: 11, role: 'ALA', active: true });
  await savePlayer({ id: 'a', firstName: 'A', lastName: 'A', number: 4, role: 'PLAY', active: true });
  await loadPlayers();
  expect(players.value.map((p) => p.number)).toEqual([4, 11]);
  expect((await playersRepo.get('a'))!.teamId).toBe(t.id);
});

it('removePlayer soft deletes and hides from the list', async () => {
  await ensureTeam();
  await savePlayer({ id: 'a', firstName: 'A', lastName: 'A', number: 4, role: 'PLAY', active: true });
  await removePlayer('a');
  expect(players.value).toEqual([]);
  expect((await playersRepo.all(true))[0].deleted).toBe(true);
});

it('ensureTeam picks deterministically the team with players, then the smallest id', async () => {
  const { teamsRepo } = await import('../src/db');
  await teamsRepo.put({ id: 'zz', name: 'Vuota', shortName: 'V', color: '#000' });
  await teamsRepo.put({ id: 'aa', name: 'Piena', shortName: 'P', color: '#000' });
  await playersRepo.put({ id: 'p1', teamId: 'aa', firstName: 'A', lastName: 'B', number: 4, role: 'PLAY', active: true });
  myTeam.value = null;
  expect((await ensureTeam()).id).toBe('aa');
  await playersRepo.softDelete('p1');
  myTeam.value = null;
  expect((await ensureTeam()).id).toBe('aa');
});
