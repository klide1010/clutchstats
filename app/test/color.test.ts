import { it, expect } from 'vitest';
import { contrastRatio, deriveTeamPalette, hexToRgb } from '../src/model/color';

it('parses 3 and 6 digit hex', () => {
  expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  expect(hexToRgb('#5b2d8e')).toEqual([91, 45, 142]);
  expect(hexToRgb('nope')).toBeNull();
});

it('contrast ratio of black on white is 21', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
});

it('a white team color on the light theme is darkened until it contrasts with the background', () => {
  const p = deriveTeamPalette('#ffffff', 'light');
  expect(contrastRatio(p.primary, '#FAFBFC')).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
});

it('a near-black team color on the dark theme is lightened', () => {
  const p = deriveTeamPalette('#101010', 'dark');
  expect(contrastRatio(p.primary, '#0E1116')).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
});

it('a red team color is kept as is and gets white text', () => {
  const p = deriveTeamPalette('#B91C1C', 'light');
  expect(p.primary.toLowerCase()).toBe('#b91c1c');
  expect(p.onPrimary).toBe('#ffffff');
});

it('a yellow team color gets dark text and a soft tint', () => {
  const p = deriveTeamPalette('#F4B942', 'light');
  expect(p.onPrimary).toBe('#0f1f3d');
  expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
  expect(p.soft).toMatch(/^#[0-9a-f]{6}$/i);
  expect(contrastRatio('#0F1F3D', p.soft)).toBeGreaterThanOrEqual(4.5);
});

it('invalid colors fall back to the brand navy', () => {
  expect(deriveTeamPalette('zzz', 'light').primary.toLowerCase()).toBe('#1e3a8a');
});
