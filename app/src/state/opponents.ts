import { signal } from '@preact/signals';
import { newId, type Opponent } from '@bkstats/shared';
import { opponentsRepo, type PutInput } from '../db';
import { shortNameFor } from './team';

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

/** "7, 12 23;00" → [7, 12, 23, 0]; ignora ciò che non è un numero e i duplicati. */
export function parseJerseyNumbers(text: string): number[] {
  const out: number[] = [];
  for (const tok of text.split(/[\s,;]+/)) {
    if (/^\d+$/.test(tok)) { const n = Number(tok); if (!out.includes(n)) out.push(n); }
  }
  return out;
}

/** Aggiunge numeri di maglia all'avversario (senza toccare quelli esistenti). */
export async function addNumbers(opponentId: string, numbers: number[]): Promise<Opponent> {
  const o = (await opponentsRepo.get(opponentId)) ?? opponents.value.find((x) => x.id === opponentId);
  if (!o) throw new Error('Avversario non trovato');
  const have = new Set(o.roster.map((r) => r.number));
  const added = numbers.filter((n) => !have.has(n)).map((n) => ({ number: n }));
  if (added.length === 0) return o;
  return saveOpponent({ ...o, roster: [...o.roster, ...added] });
}

export async function findOrCreateOpponent(name: string): Promise<Opponent> {
  const clean = name.trim();
  if (opponents.value.length === 0) await loadOpponents();
  const existing = opponents.value.find((o) => o.name.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  return saveOpponent({ id: newId(), name: clean, shortName: shortNameFor(clean), roster: [] });
}
