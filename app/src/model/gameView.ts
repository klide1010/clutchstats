import { emptyStatLine, type Game, type GameEvent, type PlayerLine, type StatLine } from '@bkstats/shared';

/** Partite divise per l'elenco: in corso, prossime (dalla più vicina), giocate (dalla più recente). */
export function groupGames(list: Game[]): { live: Game[]; upcoming: Game[]; played: Game[] } {
  const byDate = list.slice().sort((a, b) => a.date.localeCompare(b.date));
  return {
    live: byDate.filter((g) => g.status === 'LIVE'),
    upcoming: byDate.filter((g) => g.status === 'SCHEDULED'),
    played: byDate.filter((g) => g.status === 'CLOSED').reverse(),
  };
}

/** Palestra senza il prefisso "Campo: 12 - " del calendario federale. */
export function venueLabel(venue: string | undefined): string {
  return venue ? venue.replace(/^Campo:\s*\d+\s*-\s*/i, '') : '';
}

export interface Score { us: number; them: number }
export interface HistoryRow { e: GameEvent; score?: Score }
export interface HistoryPeriod extends Score { period: number; rows: HistoryRow[] }

function points(e: GameEvent): number {
  if (!e.made) return 0;
  return e.type === 'SHOT_2' ? 2 : e.type === 'SHOT_3' ? 3 : e.type === 'FREE_THROW' ? 1 : 0;
}

/**
 * Cronologia per periodo, dal più recente: ogni canestro porta il punteggio dopo l'azione,
 * ogni periodo il punteggio alla fine (o adesso, se è in corso). Un evento inserito più tardi
 * per un periodo già passato (es. un cambio col tempo del tabellone) va nel suo periodo.
 */
export function historyByPeriod(events: GameEvent[]): HistoryPeriod[] {
  const out: HistoryPeriod[] = [];
  const score: Score = { us: 0, them: 0 };
  for (const e of events.filter((x) => !x.deleted).sort((a, b) => a.period - b.period || a.seq - b.seq)) {
    let p = out[out.length - 1];
    if (!p || p.period !== e.period) { p = { period: e.period, us: score.us, them: score.them, rows: [] }; out.push(p); }
    const pts = points(e);
    if (pts) { if (e.side === 'US') score.us += pts; else score.them += pts; }
    p.us = score.us; p.them = score.them;
    p.rows.push(pts ? { e, score: { us: score.us, them: score.them } } : { e });
  }
  for (const p of out) p.rows.reverse();
  return out.reverse();
}

/** Punti e falli degli avversari per numero di maglia, in ordine di numero. */
export function opponentByJersey(pointsByJersey: Record<number, number>, foulsByJersey: Record<number, number>): { number: number; pts: number; fouls: number }[] {
  const nums = Object.keys(pointsByJersey).concat(Object.keys(foulsByJersey)).map(Number);
  return nums.filter((n, i) => nums.indexOf(n) === i).sort((a, b) => a - b)
    .map((n) => ({ number: n, pts: pointsByJersey[n] ?? 0, fouls: foulsByJersey[n] ?? 0 }));
}

/** Convocato non entrato: zero minuti e nessuna statistica (sul referto "N.E."). */
export function didNotPlay(l: PlayerLine): boolean {
  if (l.seconds > 0) return false;
  return (Object.keys(emptyStatLine()) as (keyof StatLine)[]).every((k) => l[k] === 0);
}

export type HistoryKind = 'ALL' | 'SHOTS' | 'FOULS' | 'SUBS';

/** Filtro della cronologia per tipo e giocatore (vale anche chi ha fatto l'assist o è entrato/uscito). */
export function matchesHistoryFilter(e: GameEvent, kind: HistoryKind, playerId: string): boolean {
  if (kind === 'SHOTS' && e.type !== 'SHOT_2' && e.type !== 'SHOT_3' && e.type !== 'FREE_THROW') return false;
  if (kind === 'FOULS' && e.type !== 'FOUL' && e.type !== 'FOUL_DRAWN') return false;
  if (kind === 'SUBS' && e.type !== 'SUBSTITUTION') return false;
  if (playerId === 'ALL') return true;
  return e.playerId === playerId || e.assistPlayerId === playerId || e.subInPlayerId === playerId || e.subOutPlayerId === playerId;
}
