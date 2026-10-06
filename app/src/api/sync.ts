import { signal } from '@preact/signals';
import type { Game, GameEvent, Opponent, Player, SyncMeta, Team } from '@bkstats/shared';
import { eventsRepo, gamesRepo, meta, opponentsRepo, playersRepo, teamsRepo, type Repo } from '../db';
import { ApiError, apiFetch } from './client';
import { ensureTeam, loadPlayers, myTeam } from '../state/team';
import { loadOpponents } from '../state/opponents';
import { loadGames } from '../state/games';

export interface SyncResult { pushed: number; pulled: number; at: number }

export interface SyncState { running: boolean; pending: number; lastAt: number | null; lastError: string | null }

export const syncState = signal<SyncState>({ running: false, pending: 0, lastAt: null, lastError: null });

interface PullResponse {
  teams: Team[]; players: Player[]; opponents: Opponent[]; games: Game[]; events: GameEvent[]; serverTime: number;
}

const REPOS: { name: keyof Omit<PullResponse, 'serverTime'>; repo: Repo<SyncMeta> }[] = [
  { name: 'teams', repo: teamsRepo as Repo<SyncMeta> },
  { name: 'players', repo: playersRepo as Repo<SyncMeta> },
  { name: 'opponents', repo: opponentsRepo as Repo<SyncMeta> },
  { name: 'games', repo: gamesRepo as Repo<SyncMeta> },
  { name: 'events', repo: eventsRepo as Repo<SyncMeta> },
];

export async function countPending(): Promise<number> {
  let n = 0;
  for (const { repo } of REPOS) n += (await repo.dirty()).length;
  return n;
}

export async function refreshPending(): Promise<void> {
  const pending = await countPending();
  syncState.value = { ...syncState.value, pending };
}

export async function initSyncState(): Promise<void> {
  const lastAt = (await meta.get<number>('lastSyncAt')) ?? null;
  syncState.value = { ...syncState.value, lastAt, pending: await countPending() };
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.status === 401 ? 'Sessione scaduta' : `Errore server ${err.status}`;
  if (err instanceof TypeError) return 'Rete assente, sync rimandata';
  return err instanceof Error ? err.message : 'Errore sconosciuto';
}

/** Push dei record dirty, poi pull incrementale. I dirty non inviati restano tali in caso di errore. */
let inFlight: Promise<SyncResult> | null = null;

export function runSync(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = doSync().finally(() => { inFlight = null; });
  return inFlight;
}

async function doSync(): Promise<SyncResult> {
  syncState.value = { ...syncState.value, running: true, lastError: null };
  try {
    const dirtyByName: Record<string, SyncMeta[]> = {};
    let pushed = 0;
    for (const { name, repo } of REPOS) {
      const d = await repo.dirty();
      if (d.length) { dirtyByName[name] = d; pushed += d.length; }
    }
    if (pushed > 0) {
      await apiFetch<{ accepted: number; serverTime: number }>('/api/sync/push', { method: 'POST', json: dirtyByName });
      for (const { name, repo } of REPOS) {
        const d = dirtyByName[name];
        if (d) await repo.clearDirty(d.map((r) => ({ id: r.id, updatedAt: r.updatedAt })));
      }
    }

    const since = (await meta.get<number>('lastPulledAt')) ?? 0;
    const data = await apiFetch<PullResponse>(`/api/sync/pull?since=${since}`);
    let pulled = 0;
    for (const { name, repo } of REPOS) {
      const list = data[name] as SyncMeta[] | undefined;
      if (list && list.length) pulled += await repo.applyRemote(list);
    }
    await meta.set('lastPulledAt', data.serverTime);
    if (pulled > 0) await refreshStores();

    const at = Date.now();
    await meta.set('lastSyncAt', at);
    syncState.value = { running: false, pending: await countPending(), lastAt: at, lastError: null };
    return { pushed, pulled, at };
  } catch (err) {
    syncState.value = { ...syncState.value, running: false, pending: await countPending(), lastError: describeError(err) };
    throw err;
  }
}

/** Dopo una pull ricarica squadra e liste in memoria, così la UI riflette subito i dati del server. */
async function refreshStores(): Promise<void> {
  myTeam.value = null;
  await ensureTeam();
  await Promise.all([loadPlayers(), loadOpponents(), loadGames()]);
}

/** Tenta la sync senza propagare errori (uso dopo la chiusura partita). */
export async function trySync(): Promise<SyncResult | null> {
  try {
    return await runSync();
  } catch {
    return null;
  }
}
