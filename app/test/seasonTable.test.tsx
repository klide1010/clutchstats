import { it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import type { Game, GameEvent, Player } from '@bkstats/shared';
import { computeSeason } from '../src/model/season';
import { countSpecialFouls } from '../src/model/fouls';
import { SeasonTable } from '../src/pages/Season';

afterEach(cleanup);

const mk = (id: string): Game => ({ id, updatedAt: 1, deleted: false, teamId: 't1', opponentId: 'o1', date: '2026-10-18T18:30:00.000Z', home: true, status: 'CLOSED', useClock: false, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 4, source: 'MANUAL', starters: ['p1', 'p2', 'p3', 'p4', 'p5'] });
const players: Player[] = Array.from({ length: 5 }, (_, i) => ({ id: `p${i + 1}`, teamId: 't1', firstName: 'M', lastName: `R${i + 1}`, number: 4 + i, role: 'ALA', active: true, updatedAt: 1, deleted: false }));
const ev = (gameId: string, o: Partial<GameEvent> & Pick<GameEvent, 'type' | 'seq'>): GameEvent => ({ id: `${gameId}-${o.seq}`, gameId, period: 1, side: 'US', createdAt: 1, updatedAt: 1, deleted: false, ...o });
const byGame = {
  g1: [ev('g1', { type: 'PERIOD_START', seq: 1 }), ev('g1', { type: 'SHOT_2', seq: 2, playerId: 'p1', made: true }), ev('g1', { type: 'SHOT_2', seq: 3, playerId: 'p1', made: false }), ev('g1', { type: 'FOUL', seq: 4, playerId: 'p1', foulKind: 'UNSPORTSMANLIKE' }), ev('g1', { type: 'PERIOD_END', seq: 5 })],
  g2: [ev('g2', { type: 'PERIOD_START', seq: 1 }), ev('g2', { type: 'FOUL', seq: 2, playerId: 'p1', foulKind: 'UNSPORTSMANLIKE' }), ev('g2', { type: 'PERIOD_END', seq: 3 })],
};
const season = computeSeason([mk('g1'), mk('g2')], byGame, players);
const special = countSpecialFouls([...byGame.g1, ...byGame.g2]);

const header = (c: Element) => Array.from(c.querySelectorAll('thead th')).map((th) => th.textContent);
const cell = (c: Element, label: string, col: string) => Array.from(c.querySelectorAll('tbody tr')).find((tr) => tr.textContent!.includes(label))!.children[header(c).indexOf(col)].textContent;

it('totali: tiri con percentuale sotto e colonna dei falli antisportivi', () => {
  const { container } = render(<SeasonTable season={season} players={players} avg={false} special={special} />);
  expect(cell(container, 'R1', 'T2')).toBe('1/250%');
  expect(header(container).indexOf('FA')).toBe(header(container).indexOf('FF') + 1);
  expect(cell(container, 'R1', 'FA')).toBe('2');
  expect(cell(container, 'Squadra', 'FA')).toBe('2');
  expect(header(container)).not.toContain('FT');
});

it('medie: falli speciali divisi per le partite giocate', () => {
  const { container } = render(<SeasonTable season={season} players={players} avg special={special} />);
  expect(cell(container, 'R1', 'FA')).toBe('1.0');
});
