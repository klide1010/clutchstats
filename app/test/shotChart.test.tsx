import { it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import type { Game, GameEvent, Player } from '@bkstats/shared';
import { ShotChart } from '../src/ui/ShotChart';

afterEach(cleanup);

const game: Game = { id: 'g', updatedAt: 1, deleted: false, teamId: 't', opponentId: 'o', date: '2026-10-18T18:30:00.000Z', home: true, status: 'CLOSED', useClock: false, periodLengthMin: 10, periodsRegulation: 4, currentPeriod: 4, source: 'MANUAL', starters: [] };
const players: Player[] = [{ id: 'p1', teamId: 't', firstName: 'M', lastName: 'Rossi', number: 4, role: 'ALA', active: true, updatedAt: 1, deleted: false }];
const ev = (o: Partial<GameEvent> & Pick<GameEvent, 'id' | 'seq' | 'type'>): GameEvent => ({ gameId: 'g', period: 1, side: 'US', playerId: 'p1', createdAt: 1, updatedAt: 1, deleted: false, ...o });

it('counts free throws in their own zone and draws them on the chart', () => {
  const events = [ev({ id: 'a', seq: 1, type: 'SHOT_2', made: true, x: 0.5, y: 0.2 }), ev({ id: 'b', seq: 2, type: 'FREE_THROW', made: true }), ev({ id: 'c', seq: 3, type: 'FREE_THROW', made: false })];
  const { container } = render(<ShotChart game={game} events={events} players={players} />);
  expect(screen.getByText('Liberi')).toBeTruthy();
  expect(screen.getByText('1/2')).toBeTruthy();
  expect(container.querySelectorAll('.shot-ft')).toHaveLength(2);
});
