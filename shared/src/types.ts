export type Role = 'PLAY' | 'GUARDIA' | 'ALA' | 'ALA_GRANDE' | 'CENTRO';

export const ROLE_LABELS: Record<Role, string> = {
  PLAY: 'Play',
  GUARDIA: 'Guardia',
  ALA: 'Ala',
  ALA_GRANDE: 'Ala grande',
  CENTRO: 'Centro',
};

export const ROLES: Role[] = ['PLAY', 'GUARDIA', 'ALA', 'ALA_GRANDE', 'CENTRO'];

export interface SyncMeta {
  id: string;
  updatedAt: number;
  deleted: boolean;
}

export interface Team extends SyncMeta {
  name: string;
  shortName: string;
  color: string;
}

export interface Player extends SyncMeta {
  teamId: string;
  firstName: string;
  lastName: string;
  number: number;
  role: Role;
  active: boolean;
  photoUrl?: string;
}

export interface OpponentRosterEntry {
  number: number;
  name?: string;
}

export interface Opponent extends SyncMeta {
  name: string;
  shortName: string;
  roster: OpponentRosterEntry[];
}

export type GameStatus = 'SCHEDULED' | 'LIVE' | 'CLOSED';

export interface Game extends SyncMeta {
  teamId: string;
  opponentId: string;
  date: string;
  home: boolean;
  competition?: string;
  venue?: string;
  status: GameStatus;
  useClock: boolean;
  periodLengthMin: number;
  periodsRegulation: number;
  currentPeriod: number;
  source: 'MANUAL' | 'ICS';
  icsUid?: string;
  starters: string[];
  notes?: string;
}

export type Side = 'US' | 'THEM';

export type EventType =
  | 'SHOT_2'
  | 'SHOT_3'
  | 'FREE_THROW'
  | 'REBOUND_OFF'
  | 'REBOUND_DEF'
  | 'TURNOVER'
  | 'STEAL'
  | 'BLOCK'
  | 'BLOCK_RECEIVED'
  | 'FOUL'
  | 'FOUL_DRAWN'
  | 'SCREEN'
  | 'SUBSTITUTION'
  | 'TIMEOUT'
  | 'PERIOD_START'
  | 'PERIOD_END';

export type FoulKind = 'PERSONAL' | 'UNSPORTSMANLIKE' | 'TECHNICAL' | 'OFFENSIVE';

export interface GameEvent extends SyncMeta {
  gameId: string;
  seq: number;
  period: number;
  clockSec?: number;
  side: Side;
  type: EventType;
  playerId?: string;
  jerseyNumber?: number;
  x?: number;
  y?: number;
  made?: boolean;
  assistPlayerId?: string;
  foulKind?: FoulKind;
  subInPlayerId?: string;
  subOutPlayerId?: string;
  createdAt: number;
}

export const THEM_ALLOWED_TYPES: ReadonlySet<EventType> = new Set<EventType>([
  'SHOT_2',
  'SHOT_3',
  'FREE_THROW',
  'REBOUND_OFF',
  'REBOUND_DEF',
  'TURNOVER',
  'STEAL',
  'BLOCK',
  'FOUL',
  'TIMEOUT',
]);

export const OT_LENGTH_MIN = 5;
