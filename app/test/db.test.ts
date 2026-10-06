import { describe, it, expect, beforeEach } from 'vitest';
import { teamsRepo, eventsRepo, meta, resetDb } from '../src/db';

beforeEach(async () => { await resetDb(); });

describe('repo', () => {
  it('put sets updatedAt and marks dirty', async () => {
    const t = await teamsRepo.put({ id: 't1', name: 'Noi', shortName: 'NOI', color: '#000' });
    expect(t.updatedAt).toBeGreaterThan(0);
    expect(t.deleted).toBe(false);
    expect((await teamsRepo.dirty()).map((x) => x.id)).toEqual(['t1']);
  });

  it('clearDirty empties the outbox', async () => {
    await teamsRepo.put({ id: 't1', name: 'Noi', shortName: 'NOI', color: '#000' });
    await teamsRepo.clearDirty(['t1']);
    expect(await teamsRepo.dirty()).toEqual([]);
  });

  it('get and all do not expose the dirty flag', async () => {
    await teamsRepo.put({ id: 't1', name: 'Noi', shortName: 'NOI', color: '#000' });
    expect((await teamsRepo.get('t1')) as object).not.toHaveProperty('dirty');
    expect((await teamsRepo.all())[0] as object).not.toHaveProperty('dirty');
  });

  it('applyRemote keeps newer local record', async () => {
    const local = await teamsRepo.put({ id: 't1', name: 'Locale', shortName: 'L', color: '#000' });
    const n = await teamsRepo.applyRemote([{ ...local, name: 'Remoto', updatedAt: local.updatedAt - 1000 }]);
    expect(n).toBe(0);
    expect((await teamsRepo.get('t1'))!.name).toBe('Locale');
  });

  it('applyRemote overwrites older local record and is not dirty', async () => {
    const local = await teamsRepo.put({ id: 't1', name: 'Locale', shortName: 'L', color: '#000' });
    const n = await teamsRepo.applyRemote([{ ...local, name: 'Remoto', updatedAt: local.updatedAt + 1000 }]);
    expect(n).toBe(1);
    expect((await teamsRepo.get('t1'))!.name).toBe('Remoto');
    expect(await teamsRepo.dirty()).toEqual([]);
  });

  it('softDelete hides from all() but keeps for sync', async () => {
    await teamsRepo.put({ id: 't1', name: 'Noi', shortName: 'NOI', color: '#000' });
    await teamsRepo.clearDirty(['t1']);
    await teamsRepo.softDelete('t1');
    expect(await teamsRepo.all()).toEqual([]);
    expect(await teamsRepo.all(true)).toHaveLength(1);
    expect(await teamsRepo.dirty()).toHaveLength(1);
  });

  it('eventsRepo.byGame returns events ordered by seq', async () => {
    const base = { gameId: 'g1', period: 1, side: 'US' as const, type: 'STEAL' as const, createdAt: 1 };
    await eventsRepo.put({ id: 'e2', seq: 2, ...base });
    await eventsRepo.put({ id: 'e1', seq: 1, ...base });
    await eventsRepo.put({ id: 'x', seq: 1, ...base, gameId: 'g2' });
    expect((await eventsRepo.byGame('g1')).map((e) => e.seq)).toEqual([1, 2]);
  });

  it('meta get/set roundtrip', async () => {
    await meta.set('lastPulledAt', 5);
    expect(await meta.get<number>('lastPulledAt')).toBe(5);
    expect(await meta.get('missing')).toBeUndefined();
  });
});
