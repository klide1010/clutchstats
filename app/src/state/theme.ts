import { signal } from '@preact/signals';
import { meta } from '../db';

export type Theme = 'dark' | 'light';

export const theme = signal<Theme>('dark');

function apply(t: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', t);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'dark' ? '#111318' : '#f4f5f8');
}

export async function initTheme(): Promise<void> {
  const saved = await meta.get<Theme>('theme');
  theme.value = saved === 'light' ? 'light' : 'dark';
  apply(theme.value);
}

export async function setTheme(t: Theme): Promise<void> {
  theme.value = t;
  apply(t);
  await meta.set('theme', t);
}
