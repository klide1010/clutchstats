import { it, expect, beforeEach } from 'vitest';
import { resetDb, meta } from '../src/db';
import { theme, setTheme, initTheme } from '../src/state/theme';

beforeEach(async () => { await resetDb(); document.documentElement.removeAttribute('data-theme'); theme.value = 'dark'; });

it('setTheme applies the data-theme attribute and persists it', async () => {
  await setTheme('light');
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  expect(await meta.get('theme')).toBe('light');
  expect(theme.value).toBe('light');
});

it('initTheme restores the saved theme, defaulting to dark', async () => {
  await initTheme();
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  await meta.set('theme', 'light');
  await initTheme();
  expect(theme.value).toBe('light');
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');
});
