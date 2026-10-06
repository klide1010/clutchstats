import { openDB, type IDBPDatabase } from 'idb';
import type { Game, GameEvent, Opponent, Player, SyncMeta, Team } from '@bkstats/shared';
import { DB_NAME, DB_VERSION, ENTITY_STORES, type BkDb, type StoreName, type Stored } from './schema';

let dbPromise: Promise<IDBPDatabase<BkDb>> | null = null;

export function getDb(): Promise<IDBPDatabase<BkDb>> {
  if (!dbPromise) {
    dbPromise = openDB<BkDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of ENTITY_STORES) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('dirty', 'dirty');
          store.createIndex('updatedAt', 'updatedAt');
          if (name === 'players') (store as any).createIndex('teamId', 'teamId');
          if (name === 'events') {
            (store as any).createIndex('gameId', 'gameId');
            (store as any).createIndex('gameSeq', ['gameId', 'seq']);
          }
        }
        db.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

/** Chiude e cancella il database (per "cancella dati locali" e per i test). */
export async function resetDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function strip<T extends SyncMeta>(r: Stored<T> | undefined): T | undefined {
  if (!r) return undefined;
  const { dirty: _dirty, ...rest } = r;
  return rest as unknown as T;
}

export type PutInput<T extends SyncMeta> = Omit<T, 'updatedAt' | 'deleted'> & Partial<SyncMeta>;

export interface Repo<T extends SyncMeta> {
  get(id: string): Promise<T | undefined>;
  all(includeDeleted?: boolean): Promise<T[]>;
  put(record: PutInput<T>): Promise<T>;
  softDelete(id: string): Promise<void>;
  applyRemote(records: T[]): Promise<number>;
  dirty(): Promise<T[]>;
  /** Pulisce il flag dirty solo se il record non è cambiato dopo il push (stesso updatedAt). */
  clearDirty(pushed: { id: string; updatedAt: number }[]): Promise<void>;
}

export function repo<T extends SyncMeta>(store: StoreName): Repo<T> {
  const s = store as 'teams';
  return {
    async get(id) {
      const db = await getDb();
      return strip<T>((await db.get(s, id)) as unknown as Stored<T> | undefined);
    },
    async all(includeDeleted = false) {
      const db = await getDb();
      const rows = (await db.getAll(s)) as unknown as Stored<T>[];
      return rows.filter((r) => includeDeleted || !r.deleted).map((r) => strip<T>(r)!);
    },
    async put(record) {
      const db = await getDb();
      const full = { ...(record as object), updatedAt: Date.now(), deleted: record.deleted ?? false, dirty: 1 } as unknown as Stored<T>;
      await db.put(s, full as unknown as Stored<Team>);
      return strip<T>(full)!;
    },
    async softDelete(id) {
      const db = await getDb();
      const existing = (await db.get(s, id)) as unknown as Stored<T> | undefined;
      if (!existing) return;
      await db.put(s, { ...existing, deleted: true, updatedAt: Date.now(), dirty: 1 } as unknown as Stored<Team>);
    },
    async applyRemote(records) {
      const db = await getDb();
      const tx = db.transaction(s, 'readwrite');
      let applied = 0;
      for (const r of records) {
        const existing = (await tx.store.get(r.id)) as unknown as Stored<T> | undefined;
        if (existing && existing.updatedAt >= r.updatedAt) continue;
        await tx.store.put({ ...(r as object), dirty: 0 } as unknown as Stored<Team>);
        applied++;
      }
      await tx.done;
      return applied;
    },
    async dirty() {
      const db = await getDb();
      const rows = (await db.getAllFromIndex(s, 'dirty', 1)) as unknown as Stored<T>[];
      return rows.map((r) => strip<T>(r)!);
    },
    async clearDirty(pushed) {
      if (pushed.length === 0) return;
      const db = await getDb();
      const tx = db.transaction(s, 'readwrite');
      for (const { id, updatedAt } of pushed) {
        const existing = (await tx.store.get(id)) as unknown as Stored<T> | undefined;
        if (existing && existing.dirty === 1 && existing.updatedAt === updatedAt) await tx.store.put({ ...existing, dirty: 0 } as unknown as Stored<Team>);
      }
      await tx.done;
    },
  };
}

export const teamsRepo: Repo<Team> = repo<Team>('teams');
export const opponentsRepo: Repo<Opponent> = repo<Opponent>('opponents');
export const gamesRepo: Repo<Game> = repo<Game>('games');

export const playersRepo: Repo<Player> & { byTeam(teamId: string): Promise<Player[]> } = {
  ...repo<Player>('players'),
  async byTeam(teamId) {
    const db = await getDb();
    const rows = await db.getAllFromIndex('players', 'teamId', teamId);
    return rows.filter((r) => !r.deleted).map((r) => strip<Player>(r)!).sort((a, b) => a.number - b.number);
  },
};

export const eventsRepo: Repo<GameEvent> & { byGame(gameId: string): Promise<GameEvent[]> } = {
  ...repo<GameEvent>('events'),
  async byGame(gameId) {
    const db = await getDb();
    const rows = await db.getAllFromIndex('events', 'gameSeq', IDBKeyRange.bound([gameId, -Infinity], [gameId, Infinity]));
    return rows.map((r) => strip<GameEvent>(r)!);
  },
};

export const meta = {
  async get<T>(key: string): Promise<T | undefined> {
    const db = await getDb();
    const row = await db.get('meta', key);
    return row ? (row.value as T) : undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    const db = await getDb();
    await db.put('meta', { key, value });
  },
};
