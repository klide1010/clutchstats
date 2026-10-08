export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const to = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Rapporto di contrasto WCAG tra due colori esadecimali. */
export function contrastRatio(a: string, b: string): number {
  const ra = hexToRgb(a); const rb = hexToRgb(b);
  if (!ra || !rb) return 1;
  const la = luminance(ra); const lb = luminance(rb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

function withLightness(rgb: Rgb, l: number): Rgb {
  const [h, s] = rgbToHsl(rgb);
  return hslToRgb([h, s, Math.max(0, Math.min(1, l))]);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export interface TeamPalette {
  /** Colore squadra, corretto se non contrasta con lo sfondo del tema. */
  primary: string;
  /** Testo sopra `primary`: bianco o navy, quello che contrasta di più. */
  onPrimary: string;
  /** Tinta leggera per sfondi di selezione (il testo del tema resta leggibile). */
  soft: string;
  /** Variante per bordi/evidenziazioni. */
  border: string;
}

export const BRAND_NAVY = '#1E3A8A';
const DARK_TEXT = '#0f1f3d';
const THEME_BG = { light: '#FAFBFC', dark: '#0E1116' } as const;
const THEME_FG = { light: DARK_TEXT, dark: '#e8ecf3' } as const;

/** Deriva la palette squadra per il tema: garantisce contrasto ≥ 3:1 col fondo e testo leggibile sopra il colore. */
export function deriveTeamPalette(hex: string, theme: 'light' | 'dark'): TeamPalette {
  const rgb = hexToRgb(hex) ?? hexToRgb(BRAND_NAVY)!;
  const bg = THEME_BG[theme];
  let primary: Rgb = rgb;
  let [, , l] = rgbToHsl(rgb);
  // Troppo simile allo sfondo: scurisci sul chiaro, schiarisci sullo scuro, finché il contrasto basta.
  for (let i = 0; i < 40 && contrastRatio(rgbToHex(primary), bg) < 3; i++) {
    l += theme === 'light' ? -0.02 : 0.02;
    primary = withLightness(rgb, l);
  }
  const primaryHex = rgbToHex(primary);
  const onPrimary = contrastRatio('#ffffff', primaryHex) >= contrastRatio(DARK_TEXT, primaryHex) ? '#ffffff' : DARK_TEXT;
  const bgRgb = hexToRgb(bg)!;
  // Tinta: mescola il colore con lo sfondo finché il testo del tema ci legge sopra.
  let soft = mix(bgRgb, primary, theme === 'light' ? 0.14 : 0.28);
  for (let t = theme === 'light' ? 0.14 : 0.28; t > 0.04 && contrastRatio(THEME_FG[theme], rgbToHex(soft)) < 4.5; t -= 0.02) soft = mix(bgRgb, primary, t);
  const border = rgbToHex(mix(primary, bgRgb, theme === 'light' ? 0.25 : 0.2));
  return { primary: primaryHex, onPrimary, soft: rgbToHex(soft), border };
}
