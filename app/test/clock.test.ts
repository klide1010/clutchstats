import { it, expect } from 'vitest';
import { createClock } from '../src/state/clock';

function fakeNow() {
  let t = 0;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

it('starts at the period length and counts down while running', () => {
  const f = fakeNow();
  const c = createClock(600, f.now);
  expect(c.remainingSec.value).toBe(600);
  expect(c.running.value).toBe(false);
  c.start();
  f.advance(10_000);
  c.tick();
  expect(c.remainingSec.value).toBe(590);
});

it('stop freezes the remaining time', () => {
  const f = fakeNow();
  const c = createClock(600, f.now);
  c.start(); f.advance(5_000); c.tick(); c.stop(); f.advance(5_000); c.tick();
  expect(c.remainingSec.value).toBe(595);
  expect(c.running.value).toBe(false);
});

it('set changes the time and reaching zero stops the clock', () => {
  const f = fakeNow();
  const c = createClock(600, f.now);
  c.set(30);
  c.start(); f.advance(40_000); c.tick();
  expect(c.remainingSec.value).toBe(0);
  expect(c.running.value).toBe(false);
});

it('reset reloads a new period length and stops', () => {
  const f = fakeNow();
  const c = createClock(600, f.now);
  c.start(); f.advance(1000); c.tick();
  c.reset(300);
  expect(c.remainingSec.value).toBe(300);
  expect(c.running.value).toBe(false);
});
