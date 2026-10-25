import { it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { computeBoxScore, type Game, type GameEvent, type Player } from '@bkstats/shared';
import { BoxScoreTable } from '../src/ui/BoxScoreTable';
import { countSpecialFouls } from '../src/model/fouls';

afterEach(cleanup);

const game: Game = {
  id: 'g', teamId: 't', opponentId: 'o', date: '2026-10-22T19:00:00.000Z', home: true, status: 'CLOSED', useClock: false,
  periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 1, source: 'MANUAL', starters: ['a', 'b', 'c', 'd', 'e'], updatedAt: 0, deleted: false,
};
const players: Player[] = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, teamId: 't', firstName: '', lastName: `C${i}`, number: 4 + i, role: 'ALA', active: true, updatedAt: 0, deleted: false }));
let seq = 0;
const ev = (p: Partial<GameEvent>): GameEvent => ({ id: `e${++seq}`, gameId: 'g', seq, period: 1, side: 'US', type: 'TIMEOUT', createdAt: 0, updatedAt: 0, deleted: false, ...p } as GameEvent);

const header = (c: Element) => Array.from(c.querySelectorAll('thead th')).map((th) => th.textContent);
const rowOf = (c: Element, label: string) => Array.from(c.querySelectorAll('tbody tr')).find((tr) => tr.textContent!.includes(label))!;
const cellAt = (c: Element, label: string, col: string) => rowOf(c, label).children[header(c).indexOf(col)].textContent;

it('shows made/attempted and the percentage together', () => {
  const events = [ev({ type: 'PERIOD_START' }),
    ...[true, true, true, false].map((made) => ev({ type: 'SHOT_2', playerId: 'a', made, x: 0.5, y: 0.2 })),
    ev({ type: 'FREE_THROW', playerId: 'b', made: false })];
  const bs = computeBoxScore(game, events, players);
  const { container } = render(<BoxScoreTable bs={bs} players={players} />);
  expect(cellAt(container, 'C0', 'T2')).toBe('3/475%');
  expect(cellAt(container, 'C1', 'TL')).toBe('0/10%');
  expect(cellAt(container, 'C1', 'T2')).toBe('0/0');
  expect(cellAt(container, 'Squadra', 'T2')).toBe('3/475%');
});

it('adds a column only for the special foul kinds that happened, per player, team and opponent', () => {
  const events = [ev({ type: 'PERIOD_START' }),
    ev({ type: 'FOUL', playerId: 'a', foulKind: 'UNSPORTSMANLIKE' }),
    ev({ type: 'FOUL', playerId: 'a', foulKind: 'UNSPORTSMANLIKE', period: 3 }),
    ev({ type: 'FOUL', playerId: 'b', foulKind: 'PERSONAL' }),
    ev({ type: 'FOUL', foulKind: 'TECHNICAL' }),
    ev({ type: 'FOUL', side: 'THEM', jerseyNumber: 9, foulKind: 'TECHNICAL' }),
    ev({ type: 'FOUL', playerId: 'c', foulKind: 'OFFENSIVE', deleted: true })];
  const bs = computeBoxScore(game, events, players);
  const { container } = render(<BoxScoreTable bs={bs} players={players} special={countSpecialFouls(events)} />);
  const h = header(container);
  expect(h).toContain('FA');
  expect(h).toContain('FT');
  expect(h).not.toContain('FO');
  expect(h.indexOf('FA')).toBe(h.indexOf('FF') + 1);
  expect(cellAt(container, 'C0', 'FA')).toBe('2');
  expect(cellAt(container, 'C1', 'FA')).toBe('0');
  expect(cellAt(container, 'Squadra', 'FA')).toBe('2');
  expect(cellAt(container, 'Squadra', 'FT')).toBe('1');
  expect(cellAt(container, 'Avversari', 'FT')).toBe('1');
  expect(container.textContent).toContain('FA falli antisportivi');
});

it('without special fouls the table has no extra columns', () => {
  const bs = computeBoxScore(game, [ev({ type: 'PERIOD_START' })], players);
  const { container } = render(<BoxScoreTable bs={bs} players={players} special={countSpecialFouls([])} />);
  expect(header(container)).not.toContain('FA');
});

it('every shot cell keeps the percentage line, so rows have the same height', () => {
  const events = [ev({ type: 'PERIOD_START' }), ev({ type: 'SHOT_2', playerId: 'a', made: true, x: 0.5, y: 0.2 })];
  const bs = computeBoxScore(game, events, players);
  const { container } = render(<BoxScoreTable bs={bs} players={players} />);
  const row = rowOf(container, 'C1');
  for (const col of ['T2', 'T3', 'TL']) expect(row.children[header(container).indexOf(col)].querySelector('.pct')).not.toBeNull();
  expect(cellAt(container, 'C1', 'T2')).toBe('0/0');
});

it('chi non è entrato va in fondo, con N.E. al posto dei minuti', () => {
  const six = [...players, { ...players[0], id: 'f', lastName: 'C5', number: 1 }];
  const events = [ev({ type: 'PERIOD_START' }), ev({ type: 'SHOT_2', playerId: 'a', made: true, x: 0.5, y: 0.2 }), ev({ type: 'PERIOD_END' })];
  const bs = computeBoxScore(game, events, six);
  const { container } = render(<BoxScoreTable bs={bs} players={six} />);
  const names = Array.from(container.querySelectorAll('tbody tr')).map((tr) => tr.children[0].textContent);
  expect(names[5]).toContain('C5');
  expect(cellAt(container, 'C5', 'Min')).toBe('N.E.');
  expect(rowOf(container, 'C5').classList.contains('dnp')).toBe(true);
  expect(rowOf(container, 'C0').classList.contains('dnp')).toBe(false);
});
