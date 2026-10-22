import type { GameEvent } from '@bkstats/shared';

export type SpecialKind = 'UNSPORTSMANLIKE' | 'TECHNICAL' | 'OFFENSIVE';
export type KindCounts = Record<SpecialKind, number>;

/** Sigle delle colonne del box score, nell'ordine in cui compaiono dopo FF. */
export const SPECIAL_COLS: { kind: SpecialKind; abbr: string; label: string }[] = [
  { kind: 'UNSPORTSMANLIKE', abbr: 'FA', label: 'falli antisportivi' },
  { kind: 'TECHNICAL', abbr: 'FT', label: 'falli tecnici' },
  { kind: 'OFFENSIVE', abbr: 'FO', label: 'falli in attacco' },
];

export interface SpecialFouls {
  byPlayer: Record<string, KindCounts>;
  /** Noi: giocatori più i falli senza giocatore (es. tecnico alla panchina). */
  team: KindCounts;
  opponent: KindCounts;
  /** Tipi fischiati almeno una volta, a chiunque: solo questi diventano colonne. */
  kinds: SpecialKind[];
}

const zero = (): KindCounts => ({ UNSPORTSMANLIKE: 0, TECHNICAL: 0, OFFENSIVE: 0 });

export function countSpecialFouls(events: GameEvent[]): SpecialFouls {
  const out: SpecialFouls = { byPlayer: {}, team: zero(), opponent: zero(), kinds: [] };
  for (const e of events) {
    if (e.deleted || e.type !== 'FOUL' || !e.foulKind || e.foulKind === 'PERSONAL') continue;
    const k = e.foulKind;
    if (e.side === 'THEM') out.opponent[k]++;
    else {
      out.team[k]++;
      if (e.playerId) (out.byPlayer[e.playerId] = out.byPlayer[e.playerId] ?? zero())[k]++;
    }
  }
  out.kinds = SPECIAL_COLS.map((c) => c.kind).filter((k) => out.team[k] + out.opponent[k] > 0);
  return out;
}
