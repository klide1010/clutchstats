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

it('isTabletScreen: lato corto da 600px in su (es. Galaxy Tab A 1000×600)', async () => {
  const { isTabletScreen } = await import('../src/state/orientation');
  expect(isTabletScreen(1000, 600)).toBe(true);
  expect(isTabletScreen(600, 1000)).toBe(true);
  expect(isTabletScreen(1440, 900)).toBe(true);
  expect(isTabletScreen(412, 915)).toBe(false);
});

it('markTabletScreen mette la classe tablet sulla radice solo sui tablet', async () => {
  const { markTabletScreen } = await import('../src/state/orientation');
  const root = document.createElement('html');
  markTabletScreen({ width: 1000, height: 600 }, root);
  expect(root.classList.contains('tablet')).toBe(true);
  const root2 = document.createElement('html');
  markTabletScreen({ width: 360, height: 760 }, root2);
  expect(root2.classList.contains('tablet')).toBe(false);
});
