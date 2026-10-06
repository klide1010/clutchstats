import { it, expect } from 'vitest';
import { route, navigate } from '../src/router';

const go = (hash: string) => { location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); };

it('parses game route params', () => {
  go('#/game/abc');
  expect(route.value).toEqual({ name: 'game', params: { id: 'abc' } });
});

it('parses stats route params', () => {
  go('#/stats/xyz');
  expect(route.value).toEqual({ name: 'stats', params: { id: 'xyz' } });
});

it('unknown hash falls back to home', () => {
  go('#/nope');
  expect(route.value.name).toBe('home');
});

it('empty hash is home and navigate updates the hash', () => {
  go('');
  expect(route.value.name).toBe('home');
  navigate('#/roster');
  expect(location.hash).toBe('#/roster');
});
