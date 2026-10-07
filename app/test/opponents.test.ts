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

it('parseJerseyNumbers accepts comma, space and semicolon separated lists', async () => {
  const { parseJerseyNumbers } = await import('../src/state/opponents');
  expect(parseJerseyNumbers('7, 12 23;00 x 7')).toEqual([7, 12, 23, 0]);
  expect(parseJerseyNumbers('')).toEqual([]);
});

it('addNumbers merges new jersey numbers into the opponent roster', async () => {
  const { addNumbers } = await import('../src/state/opponents');
  const o = await findOrCreateOpponent('Verdi');
  await saveOpponent({ ...o, roster: [{ number: 7, name: 'Bianchi' }] });
  const saved = await addNumbers(o.id, [7, 9]);
  expect(saved.roster).toEqual([{ number: 7, name: 'Bianchi' }, { number: 9 }]);
});
