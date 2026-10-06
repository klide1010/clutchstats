import { signal } from '@preact/signals';
import { newId, type Player, type Team } from '@bkstats/shared';
import { playersRepo, teamsRepo, type PutInput } from '../db';

export const myTeam = signal<Team | null>(null);
export const players = signal<Player[]>([]);

/** Squadra locale: quella con più giocatori, a parità l'id più piccolo. Se non esiste la crea. */
export async function ensureTeam(): Promise<Team> {
  if (myTeam.value) return myTeam.value;
  const teams = await teamsRepo.all();
  let team: Team | undefined;
  if (teams.length > 0) {
    const counts = new Map<string, number>();
    for (const t of teams) counts.set(t.id, (await playersRepo.byTeam(t.id)).length);
    team = [...teams].sort((a, b) => (counts.get(b.id)! - counts.get(a.id)!) || a.id.localeCompare(b.id))[0];
  } else {
    team = await teamsRepo.put({ id: newId(), name: 'La mia squadra', shortName: 'NOI', color: '#e63946' });
  }
  myTeam.value = team;
  return team;
}

export async function hasLocalTeam(): Promise<boolean> {
  return (await teamsRepo.all()).length > 0;
}

export async function saveTeam(patch: Partial<Pick<Team, 'name' | 'shortName' | 'color'>>): Promise<void> {
  const t = await ensureTeam();
  myTeam.value = await teamsRepo.put({ ...t, ...patch });
}

export async function loadPlayers(): Promise<void> {
  const t = await ensureTeam();
  players.value = await playersRepo.byTeam(t.id);
}

export async function savePlayer(p: Omit<PutInput<Player>, 'teamId'> & { teamId?: string }): Promise<void> {
  const t = await ensureTeam();
  await playersRepo.put({ ...p, teamId: p.teamId ?? t.id });
  await loadPlayers();
}

export async function savePlayers(list: Player[]): Promise<void> {
  for (const p of list) await playersRepo.put(p);
  await loadPlayers();
}

export async function removePlayer(id: string): Promise<void> {
  await playersRepo.softDelete(id);
  await loadPlayers();
}
