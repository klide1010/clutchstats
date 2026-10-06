import { it, expect } from 'vitest';
import { shotValueFromPosition } from '../src/shotValue';

const m = (xm: number, ym: number) => [xm / 15, ym / 14] as const;

it('under the basket is 2', () => expect(shotValueFromPosition(...m(7.5, 1.6))).toBe(2));
it('just inside the arc on the axis is 2', () => expect(shotValueFromPosition(...m(7.5, 8.2))).toBe(2));
it('just outside the arc on the axis is 3', () => expect(shotValueFromPosition(...m(7.5, 8.4))).toBe(3));
it('corner inside the 0.90 m lane is 3 even if close to the basket line', () => expect(shotValueFromPosition(...m(0.5, 1.0))).toBe(3));
it('corner just inside the straight line is 2 when within the arc', () => expect(shotValueFromPosition(...m(1.5, 1.4))).toBe(2));
it('right corner is symmetric', () => expect(shotValueFromPosition(...m(14.5, 1.0))).toBe(3));
it('behind the basket between the lanes is 2', () => expect(shotValueFromPosition(...m(7.5, 0.5))).toBe(2));
