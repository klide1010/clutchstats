import { signal } from '@preact/signals';
import { newId, type Opponent } from '@bkstats/shared';
import { opponentsRepo, type PutInput } from '../db';

export const opponents = signal<Opponent[]>([]);

export async function loadOpponents(): Promise<void> {
  const list = await opponentsRepo.all();
  list.sort((a, b) => a.name.localeCompare(b.name));
  opponents.value = list;
}

export async function saveOpponent(o: PutInput<Opponent>): Promise<Opponent> {
  const saved = await opponentsRepo.put(o);
  await loadOpponents();
  return saved;
}

export async function removeOpponent(id: string): Promise<void> {
  await opponentsRepo.softDelete(id);
  await loadOpponents();
}

function shortNameFor(name: string): string {
  const letters = name.replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();
  return letters.slice(0, 3) || 'AVV';
}

export async function findOrCreateOpponent(name: string): Promise<Opponent> {
  const clean = name.trim();
  if (opponents.value.length === 0) await loadOpponents();
  const existing = opponents.value.find((o) => o.name.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  return saveOpponent({ id: newId(), name: clean, shortName: shortNameFor(clean), roster: [] });
}
