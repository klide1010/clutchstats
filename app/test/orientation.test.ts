import { it, expect, vi } from 'vitest';
import { isPhoneScreen, lockPortraitOnPhone } from '../src/state/orientation';

it('isPhoneScreen guarda il lato corto dello schermo', () => {
  expect(isPhoneScreen(360, 760)).toBe(true);
  expect(isPhoneScreen(760, 360)).toBe(true);
  expect(isPhoneScreen(800, 1280)).toBe(false);
  expect(isPhoneScreen(1280, 800)).toBe(false);
});

it('blocca in verticale solo i telefoni e ignora i rifiuti', async () => {
  const lock = vi.fn(() => Promise.reject(new Error('not supported')));
  lockPortraitOnPhone({ width: 360, height: 760, orientation: { lock } });
  expect(lock).toHaveBeenCalledWith('portrait');
  const lock2 = vi.fn(() => Promise.resolve());
  lockPortraitOnPhone({ width: 800, height: 1280, orientation: { lock: lock2 } });
  expect(lock2).not.toHaveBeenCalled();
  expect(() => lockPortraitOnPhone({ width: 360, height: 760 })).not.toThrow();
});
