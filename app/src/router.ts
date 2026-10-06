import { signal } from '@preact/signals';

export type RouteName = 'home' | 'login' | 'roster' | 'opponents' | 'calendar' | 'game' | 'stats' | 'season' | 'settings';

export interface Route {
  name: RouteName;
  params: Record<string, string>;
}

const PATTERNS: { re: RegExp; name: RouteName; keys: string[] }[] = [
  { re: /^\/?$/, name: 'home', keys: [] },
  { re: /^\/login$/, name: 'login', keys: [] },
  { re: /^\/roster$/, name: 'roster', keys: [] },
  { re: /^\/opponents$/, name: 'opponents', keys: [] },
  { re: /^\/calendar$/, name: 'calendar', keys: [] },
  { re: /^\/game\/([^/]+)$/, name: 'game', keys: ['id'] },
  { re: /^\/stats\/([^/]+)$/, name: 'stats', keys: ['id'] },
  { re: /^\/season$/, name: 'season', keys: [] },
  { re: /^\/settings$/, name: 'settings', keys: [] },
];

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  for (const p of PATTERNS) {
    const m = path.match(p.re);
    if (m) {
      const params: Record<string, string> = {};
      p.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { name: p.name, params };
    }
  }
  return { name: 'home', params: {} };
}

export const route = signal<Route>(parseHash(typeof location !== 'undefined' ? location.hash : ''));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    route.value = parseHash(location.hash);
  });
}

export function navigate(hash: string): void {
  if (location.hash === hash) {
    route.value = parseHash(hash);
  } else {
    location.hash = hash;
  }
}
