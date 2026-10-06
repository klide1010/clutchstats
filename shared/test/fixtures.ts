import type { Game, GameEvent, Player, Role } from '../src/types';

export function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    updatedAt: 1,
    deleted: false,
    teamId: 't1',
    opponentId: 'o1',
    date: '2026-10-18T18:30:00.000Z',
    home: true,
    status: 'LIVE',
    useClock: false,
    periodLengthMin: 10,
    periodsRegulation: 4,
    currentPeriod: 1,
    source: 'MANUAL',
    starters: ['p1', 'p2', 'p3', 'p4', 'p5'],
    ...overrides,
  };
}

const ROLES: Role[] = ['PLAY', 'GUARDIA', 'ALA', 'ALA_GRANDE', 'CENTRO', 'PLAY', 'ALA', 'CENTRO'];

export function makePlayers(): Player[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `p${i + 1}`,
    updatedAt: 1,
    deleted: false,
    teamId: 't1',
    firstName: `Nome${i + 1}`,
    lastName: `Cognome${i + 1}`,
    number: 4 + i,
    role: ROLES[i],
    active: true,
  }));
}

export function ev(overrides: Partial<GameEvent> & Pick<GameEvent, 'type' | 'seq'>): GameEvent {
  return {
    id: `e${overrides.seq}`,
    updatedAt: 1,
    deleted: false,
    gameId: 'g1',
    period: 1,
    side: 'US',
    createdAt: 1,
    ...overrides,
  };
}
