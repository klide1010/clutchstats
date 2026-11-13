import type { FoulKind, GameEvent } from '@bkstats/shared';

/** Sigla della colonna del box score: ogni colonna raccoglie uno o più tipi di fallo. */
export type SpecialKind = 'FO' | 'DI' | 'FL' | 'FA' | 'FT' | 'FE' | 'TA';
export type KindCounts = Record<SpecialKind, number>;

/**
 * Colonne dopo FF, nell'ordine (regole FIBA 2026). FA resta per le partite registrate prima del 2026 (antisportivo).
 * TA (tecnici di allenatore e panchina) compare solo nelle righe Squadra/Avversari e non è contato in FF.
 */
export const SPECIAL_COLS: { kind: SpecialKind; abbr: string; label: string; fouls: FoulKind[] }[] = [
  { kind: 'FO', abbr: 'FO', label: 'falli in attacco', fouls: ['OFFENSIVE'] },
  { kind: 'DI', abbr: 'DI', label: 'falli disruptive', fouls: ['DISRUPTIVE'] },
  { kind: 'FL', abbr: 'FL', label: 'falli flagranti', fouls: ['FLAGRANT'] },
  { kind: 'FA', abbr: 'FA', label: 'falli antisportivi', fouls: ['UNSPORTSMANLIKE'] },
  { kind: 'FT', abbr: 'FT', label: 'falli tecnici', fouls: ['TECHNICAL', 'TECHNICAL_2'] },
  { kind: 'FE', abbr: 'FE', label: 'falli da espulsione', fouls: ['DISQUALIFYING'] },
  { kind: 'TA', abbr: 'TA', label: 'tecnici allenatore e panchina', fouls: ['COACH_TECHNICAL', 'BENCH_TECHNICAL'] },
];

export interface SpecialFouls {
  byPlayer: Record<string, KindCounts>;
  /** Noi: giocatori più i falli senza giocatore (tecnici di allenatore e panchina). */
  team: KindCounts;
  opponent: KindCounts;
  /** Colonne con almeno un fallo, a chiunque: solo queste vengono mostrate. */
  kinds: SpecialKind[];
}

const zero = (): KindCounts => ({ FO: 0, DI: 0, FL: 0, FA: 0, FT: 0, FE: 0, TA: 0 });
const colOf = (k: FoulKind): SpecialKind | undefined => SPECIAL_COLS.find((c) => c.fouls.includes(k))?.kind;

export function countSpecialFouls(events: GameEvent[]): SpecialFouls {
  const out: SpecialFouls = { byPlayer: {}, team: zero(), opponent: zero(), kinds: [] };
  for (const e of events) {
    if (e.deleted || e.type !== 'FOUL' || !e.foulKind) continue;
    const k = colOf(e.foulKind);
    if (!k) continue;
    if (e.side === 'THEM') out.opponent[k]++;
    else {
      out.team[k]++;
      if (e.playerId) (out.byPlayer[e.playerId] = out.byPlayer[e.playerId] ?? zero())[k]++;
    }
  }
  out.kinds = SPECIAL_COLS.map((c) => c.kind).filter((k) => out.team[k] + out.opponent[k] > 0);
  return out;
}
