import { it, expect, beforeEach } from 'vitest';
import { resetDb } from '../src/db';
import { findOrCreateOpponent, opponents, saveOpponent, removeOpponent, loadOpponents } from '../src/state/opponents';

beforeEach(async () => { await resetDb(); opponents.value = []; });

it('findOrCreateOpponent creates once, case-insensitive, with 3-letter shortName', async () => {
  const a = await findOrCreateOpponent('basket verdi');
  const b = await findOrCreateOpponent('Basket Verdi ');
  expect(a.id).toBe(b.id);
  expect(a.shortName).toBe('BAS');
  expect(a.roster).toEqual([]);
  expect(opponents.value).toHaveLength(1);
});

it('saveOpponent updates roster and removeOpponent hides it', async () => {
  const o = await findOrCreateOpponent('Basket Verdi');
  await saveOpponent({ ...o, roster: [{ number: 7, name: 'Bianchi' }] });
  await loadOpponents();
  expect(opponents.value[0].roster).toEqual([{ number: 7, name: 'Bianchi' }]);
  await removeOpponent(o.id);
  expect(opponents.value).toEqual([]);
});
