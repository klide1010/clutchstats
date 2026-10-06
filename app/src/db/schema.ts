import type { DBSchema } from 'idb';
import type { Game, GameEvent, Opponent, Player, Team } from '@bkstats/shared';

export const DB_NAME = 'bkstats';
export const DB_VERSION = 1;

export type StoreName = 'teams' | 'players' | 'opponents' | 'games' | 'events';
export const ENTITY_STORES: StoreName[] = ['teams', 'players', 'opponents', 'games', 'events'];

/** Record salvato: entità più flag dirty (0|1) per l'outbox di sync. */
export type Stored<T> = T & { dirty: 0 | 1 };

export interface BkDb extends DBSchema {
  teams: { key: string; value: Stored<Team>; indexes: { dirty: number; updatedAt: number } };
  players: { key: string; value: Stored<Player>; indexes: { dirty: number; updatedAt: number; teamId: string } };
  opponents: { key: string; value: Stored<Opponent>; indexes: { dirty: number; updatedAt: number } };
  games: { key: string; value: Stored<Game>; indexes: { dirty: number; updatedAt: number } };
  events: { key: string; value: Stored<GameEvent>; indexes: { dirty: number; updatedAt: number; gameId: string; gameSeq: [string, number] } };
  meta: { key: string; value: { key: string; value: unknown } };
}
