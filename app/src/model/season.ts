import { computeBoxScore, emptyStatLine, legaRating, type Game, type GameEvent, type Player, type PlayerLine, type StatLine, type TeamLine } from '@bkstats/shared';

export interface SeasonPlayerLine extends PlayerLine { gamesPlayed: number }

export interface Season {
  players: SeasonPlayerLine[];
  team: TeamLine;
  opponentPts: number;
  record: { won: number; lost: number };
  gamesPlayed: number;
}

const STAT_KEYS = Object.keys(emptyStatLine()) as (keyof StatLine)[];

function addLine(into: StatLine, from: StatLine): void {
  for (const k of STAT_KEYS) into[k] += from[k];
}

/** Totali di stagione sulle sole partite CLOSED. Le medie le calcola la UI dividendo per gamesPlayed. */
export function computeSeason(games: Game[], eventsByGame: Record<string, GameEvent[]>, players: Player[]): Season {
  const closed = games.filter((g) => g.status === 'CLOSED' && !g.deleted);
  const lines = new Map<string, SeasonPlayerLine>();
  const team: TeamLine = { ...emptyStatLine(), foulsByPeriod: {}, timeouts: 0 };
  let opponentPts = 0;
  let won = 0;
  let lost = 0;

  for (const p of players) lines.set(p.id, { ...emptyStatLine(), playerId: p.id, seconds: 0, plusMinus: 0, rating: 0, gamesPlayed: 0 });

  for (const g of closed) {
    const bs = computeBoxScore(g, eventsByGame[g.id] ?? [], players);
    addLine(team, bs.team);
    team.timeouts += bs.team.timeouts;
    opponentPts += bs.opponent.pts;
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
  return { players: result, team, opponentPts, record: { won, lost }, gamesPlayed: closed.length };
}
