import { computeBoxScore, manualScore, emptyStatLine, legaRating, type Game, type GameEvent, type Player, type PlayerLine, type StatLine, type TeamLine } from '@bkstats/shared';

export interface SeasonPlayerLine extends PlayerLine { gamesPlayed: number }

export interface Season {
  players: SeasonPlayerLine[];
  team: TeamLine;
  /** Punti fatti e subiti su tutte le partite chiuse, comprese quelle con il solo risultato. */
  pointsFor: number;
  opponentPts: number;
  record: { won: number; lost: number };
  /** Partite con le statistiche (le medie si calcolano su queste). */
  gamesPlayed: number;
  /** Partite chiuse con un risultato, comprese quelle "solo risultato". */
  results: number;
}

/** Stagione di una partita, da agosto a luglio: "2026/27". */
export function seasonOf(date: string): string {
  const d = new Date(date);
  const start = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Stagioni presenti nelle partite, dalla più recente. */
export function seasonsOf(games: Game[]): string[] {
  const out: string[] = [];
  for (const g of games) { const s = seasonOf(g.date); if (out.indexOf(s) < 0) out.push(s); }
  return out.sort().reverse();
}

/** Partite di una stagione: di campionato (friendly = false) o amichevoli (friendly = true). */
export function seasonGames(games: Game[], season: string, friendly: boolean): Game[] {
  return games.filter((g) => seasonOf(g.date) === season && !!g.friendly === friendly);
}

const STAT_KEYS = Object.keys(emptyStatLine()) as (keyof StatLine)[];

function addLine(into: StatLine, from: StatLine): void {
  for (const k of STAT_KEYS) into[k] += from[k];
}

/**
 * Totali di stagione sulle sole partite CLOSED. Le medie le calcola la UI dividendo per gamesPlayed.
 * Le partite con il solo risultato contano in record e punti fatti/subiti, non nelle statistiche.
 */
export function computeSeason(games: Game[], eventsByGame: Record<string, GameEvent[]>, players: Player[]): Season {
  const closed = games.filter((g) => g.status === 'CLOSED' && !g.deleted);
  const lines = new Map<string, SeasonPlayerLine>();
  const team: TeamLine = { ...emptyStatLine(), foulsByPeriod: {}, timeouts: 0 };
  let opponentPts = 0;
  let pointsFor = 0;
  let tracked = 0;
  let won = 0;
  let lost = 0;

  for (const p of players) lines.set(p.id, { ...emptyStatLine(), playerId: p.id, seconds: 0, plusMinus: 0, rating: 0, gamesPlayed: 0 });

  for (const g of closed) {
    const manual = manualScore(g);
    if (manual) {
      pointsFor += manual.us;
      opponentPts += manual.them;
      if (manual.us > manual.them) won++; else if (manual.us < manual.them) lost++;
      continue;
    }
    tracked++;
    const bs = computeBoxScore(g, eventsByGame[g.id] ?? [], players);
    addLine(team, bs.team);
    team.timeouts += bs.team.timeouts;
    opponentPts += bs.opponent.pts;
    pointsFor += bs.score.us;
    if (bs.score.us > bs.score.them) won++; else if (bs.score.us < bs.score.them) lost++;
    for (const l of bs.players) {
      let s = lines.get(l.playerId);
      if (!s) { s = { ...emptyStatLine(), playerId: l.playerId, seconds: 0, plusMinus: 0, rating: 0, gamesPlayed: 0 }; lines.set(l.playerId, s); }
      addLine(s, l);
      s.seconds += l.seconds;
      s.plusMinus += l.plusMinus;
      if (l.seconds > 0) s.gamesPlayed++;
    }
  }

  const numberOf = new Map(players.map((p) => [p.id, p.number]));
  const result = Array.from(lines.values()).map((l) => ({ ...l, rating: legaRating(l) }));
  result.sort((a, b) => (numberOf.get(a.playerId) ?? 999) - (numberOf.get(b.playerId) ?? 999));
  return { players: result, team, pointsFor, opponentPts, record: { won, lost }, gamesPlayed: tracked, results: closed.length };
}
