import { signal } from '@preact/signals';
import { newId, type Game } from '@bkstats/shared';
import { gamesRepo, meta } from '../db';
import { ensureTeam } from './team';
import type { GameProposal } from '../model/ics';

export const games = signal<Game[]>([]);

export interface CreateGameInput {
  opponentId: string;
  date: string;
  home: boolean;
  competition?: string;
  venue?: string;
  useClock: boolean;
  periodLengthMin?: number;
  source?: 'MANUAL' | 'ICS';
  icsUid?: string;
}

export async function loadGames(): Promise<void> {
  const list = await gamesRepo.all();
  list.sort((a, b) => a.date.localeCompare(b.date));
  games.value = list;
}

export async function defaultPeriodLengthMin(): Promise<number> {
  return (await meta.get<number>('defaultPeriodLengthMin')) ?? 10;
}

export async function createGame(input: CreateGameInput): Promise<Game> {
  const team = await ensureTeam();
  const game = await gamesRepo.put({
    id: newId(),
    teamId: team.id,
    opponentId: input.opponentId,
    date: input.date,
    home: input.home,
    competition: input.competition,
    venue: input.venue,
    status: 'SCHEDULED',
    useClock: input.useClock,
    periodLengthMin: input.periodLengthMin ?? (await defaultPeriodLengthMin()),
    periodsRegulation: 4,
    currentPeriod: 0,
    source: input.source ?? 'MANUAL',
    icsUid: input.icsUid,
    starters: [],
  });
  await loadGames();
  return game;
}

export async function updateGame(id: string, patch: Partial<Game>): Promise<Game | undefined> {
  const existing = await gamesRepo.get(id);
  if (!existing) return undefined;
  const saved = await gamesRepo.put({ ...existing, ...patch, id });
  await loadGames();
  return saved;
}

export async function removeGame(id: string): Promise<void> {
  await gamesRepo.softDelete(id);
  await loadGames();
}

/** Importa le proposte: aggiorna la partita con lo stesso icsUid, altrimenti la crea. */
export async function importProposals(
  proposals: GameProposal[],
  opponentIdByUid: Record<string, string>,
  useClock: boolean,
): Promise<{ created: number; updated: number }> {
  const all = await gamesRepo.all(true);
  let created = 0;
  let updated = 0;
  for (const p of proposals) {
    const opponentId = opponentIdByUid[p.icsUid];
    if (!opponentId) continue;
    const existing = all.find((g) => g.icsUid === p.icsUid);
    if (existing) {
      await gamesRepo.put({ ...existing, date: p.date, venue: p.venue, opponentId, home: p.home, deleted: false });
      updated++;
    } else {
      await createGame({ opponentId, date: p.date, home: p.home, venue: p.venue, useClock, source: 'ICS', icsUid: p.icsUid });
      created++;
    }
  }
  await loadGames();
  return { created, updated };
}
