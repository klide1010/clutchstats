import { it, expect } from 'vitest';
import { computeBoxScore, type Game, type GameEvent, type Opponent, type Player } from '@bkstats/shared';
import { gameReportPdf, PdfDoc, textWidth } from '../src/model/pdf';

const str = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return s; };

const game: Game = {
  id: 'g1', teamId: 't1', opponentId: 'o1', date: '2026-10-22T18:30:00.000Z', home: true, venue: 'Campo: 3 - Palestra Rossi',
  status: 'CLOSED', useClock: false, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 1, source: 'MANUAL',
  starters: ['a', 'b', 'c', 'd', 'e'], roster: ['a', 'b', 'c', 'd', 'e', 'f'], updatedAt: 0, deleted: false,
};
const players: Player[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({
  id, teamId: 't1', firstName: 'Nome', lastName: i === 0 ? "D'Angelo (cap)" : `Cognome${i}`, number: 4 + i, role: 'ALA', active: i !== 5, updatedAt: 0, deleted: false,
}));
const opponent: Opponent = { id: 'o1', name: 'Vall Alta', shortName: 'VAL', roster: [], updatedAt: 0, deleted: false };
let seq = 0;
const ev = (p: Partial<GameEvent>): GameEvent => ({ id: `e${++seq}`, gameId: 'g1', seq, period: 1, side: 'US', type: 'TIMEOUT', createdAt: 0, updatedAt: 0, deleted: false, ...p } as GameEvent);
const events: GameEvent[] = [
  ev({ type: 'PERIOD_START' }),
  ev({ type: 'SHOT_3', playerId: 'a', made: true, x: 0.1, y: 0.5 }),
  ev({ type: 'SHOT_2', playerId: 'b', made: false, x: 0.5, y: 0.2 }),
  ev({ type: 'FREE_THROW', playerId: 'f', made: true }),
  ev({ type: 'SHOT_2', side: 'THEM', jerseyNumber: 12, made: true, x: 0.5, y: 0.15 }),
  ev({ type: 'PERIOD_END', clockSec: 0 }),
];

it('writes a well-formed PDF with a valid cross-reference table', () => {
  const bs = computeBoxScore(game, events, players);
  const s = str(gameReportPdf({ teamName: 'Fiore Outlanders', game, events, players, opponent, bs, dateLabel: 'gio 22 ott' }));
  expect(s.startsWith('%PDF-1.4')).toBe(true);
  expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
  const xref = Number(/startxref\n(\d+)/.exec(s)![1]);
  expect(s.slice(xref, xref + 4)).toBe('xref');
  const entries = s.slice(xref).split('\n').filter((l) => / 00000 n $/.test(l)).map((l) => Number(l.slice(0, 10)));
  entries.forEach((off, i) => expect(s.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  for (const m of s.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
    const start = m.index! + m[0].length;
    expect(s.slice(start + Number(m[1]), start + Number(m[1]) + 10)).toBe('\nendstream');
  }
  expect(s).toContain('(Fiore Outlanders vs Vall Alta)');
  expect(s).toContain("#4 D'Angelo \\(cap\\) N.");
  expect(s).toContain('Palestra Rossi');
  expect(s).not.toContain('Campo: 3');
});

it('encodes accents and dashes in WinAnsi and measures text', () => {
  const d = new PdfDoc();
  d.text(10, 10, 'Città – è…✓');
  const s = str(d.toBytes());
  expect(s).toContain('(Citt\xE0 \x96 \xE8\x85?)');
  expect(textWidth('00', 10)).toBeCloseTo(11.12);
});
