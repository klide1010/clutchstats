import type { Game, GameEvent, Player } from './types';
import { computeSecondsPlayed, liveEvents } from './minutes';
import { legaRating } from './rating';

export interface StatLine {
  pts: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  tov: number;
  stl: number;
  blk: number;
  blkR: number;
  pf: number;
  pfd: number;
  screens: number;
}

export interface PlayerLine extends StatLine {
  playerId: string;
  seconds: number;
  plusMinus: number;
  rating: number;
}

export interface TeamLine extends StatLine {
  foulsByPeriod: Record<number, number>;
  timeouts: number;
}

export interface OpponentLine extends TeamLine {
  foulsByJersey: Record<number, number>;
  pointsByJersey: Record<number, number>;
}

export interface BoxScore {
  players: PlayerLine[];
  team: TeamLine;
  opponent: OpponentLine;
  score: { us: number; them: number };
  scoreByPeriod: { period: number; us: number; them: number }[];
}

export function emptyStatLine(): StatLine {
  return { pts: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, ast: 0, tov: 0, stl: 0, blk: 0, blkR: 0, pf: 0, pfd: 0, screens: 0 };
}

function shotPoints(e: GameEvent): number {
  if (!e.made) return 0;
  if (e.type === 'SHOT_3') return 3;
  if (e.type === 'SHOT_2') return 2;
  if (e.type === 'FREE_THROW') return 1;
  return 0;
}

/** Applica un evento a una riga statistica (giocatore o squadra). */
function applyToLine(l: StatLine, e: GameEvent): void {
  switch (e.type) {
    case 'SHOT_2':
      l.fg2a++;
      if (e.made) { l.fg2m++; l.pts += 2; }
      break;
    case 'SHOT_3':
      l.fg3a++;
      if (e.made) { l.fg3m++; l.pts += 3; }
      break;
    case 'FREE_THROW':
      l.fta++;
      if (e.made) { l.ftm++; l.pts += 1; }
      break;
    case 'REBOUND_OFF': l.oreb++; l.reb++; break;
    case 'REBOUND_DEF': l.dreb++; l.reb++; break;
    case 'TURNOVER': l.tov++; break;
    case 'STEAL': l.stl++; break;
    case 'BLOCK': l.blk++; break;
    case 'BLOCK_RECEIVED': l.blkR++; break;
    case 'FOUL': l.pf++; break;
    case 'FOUL_DRAWN': l.pfd++; break;
    case 'SCREEN': l.screens++; break;
    default: break;
  }
}

export function computeBoxScore(game: Game, events: GameEvent[], players: Player[], nowElapsedSec?: number): BoxScore {
  const evs = liveEvents(events);
  const lines = new Map<string, PlayerLine>();
  const ensure = (id: string): PlayerLine => {
    let l = lines.get(id);
    if (!l) {
      l = { ...emptyStatLine(), playerId: id, seconds: 0, plusMinus: 0, rating: 0 };
      lines.set(id, l);
    }
    return l;
  };
  for (const p of players) if (p.teamId === game.teamId && !p.deleted) ensure(p.id);
  for (const id of game.starters) ensure(id);

  const team: TeamLine = { ...emptyStatLine(), foulsByPeriod: {}, timeouts: 0 };
  const opponent: OpponentLine = { ...emptyStatLine(), foulsByPeriod: {}, timeouts: 0, foulsByJersey: {}, pointsByJersey: {} };
  const byPeriod = new Map<number, { us: number; them: number }>();
  const onCourt = new Set(game.starters);

  for (const e of evs) {
    if (!byPeriod.has(e.period) && e.type !== 'SUBSTITUTION') byPeriod.set(e.period, { us: 0, them: 0 });
    const periodScore = byPeriod.get(e.period);

    if (e.type === 'SUBSTITUTION') {
      if (e.subOutPlayerId) onCourt.delete(e.subOutPlayerId);
      if (e.subInPlayerId) { onCourt.add(e.subInPlayerId); ensure(e.subInPlayerId); }
      continue;
    }
    if (e.type === 'TIMEOUT') {
      (e.side === 'US' ? team : opponent).timeouts++;
      continue;
    }
    if (e.type === 'PERIOD_START' || e.type === 'PERIOD_END') continue;

    const pts = shotPoints(e);
    if (e.side === 'US') {
      applyToLine(team, e);
      if (e.playerId) {
        const l = ensure(e.playerId);
        applyToLine(l, e);
        if (e.assistPlayerId && pts > 0 && e.type !== 'FREE_THROW') {
          ensure(e.assistPlayerId).ast++;
          team.ast++;
        }
      }
      if (e.type === 'FOUL') team.foulsByPeriod[e.period] = (team.foulsByPeriod[e.period] ?? 0) + 1;
      if (pts > 0) {
        if (periodScore) periodScore.us += pts;
        for (const id of onCourt) ensure(id).plusMinus += pts;
      }
    } else {
      applyToLine(opponent, e);
      if (e.type === 'FOUL') {
        opponent.foulsByPeriod[e.period] = (opponent.foulsByPeriod[e.period] ?? 0) + 1;
        if (e.jerseyNumber !== undefined) opponent.foulsByJersey[e.jerseyNumber] = (opponent.foulsByJersey[e.jerseyNumber] ?? 0) + 1;
      }
      if (pts > 0) {
        if (e.jerseyNumber !== undefined) opponent.pointsByJersey[e.jerseyNumber] = (opponent.pointsByJersey[e.jerseyNumber] ?? 0) + pts;
        if (periodScore) periodScore.them += pts;
        for (const id of onCourt) ensure(id).plusMinus -= pts;
      }
    }
  }

  const seconds = computeSecondsPlayed(game, evs, nowElapsedSec);
  const numberOf = new Map(players.map((p) => [p.id, p.number]));
  const playerLines = Array.from(lines.values()).map((l) => ({ ...l, seconds: seconds[l.playerId] ?? 0, rating: legaRating(l) }));
  playerLines.sort((a, b) => (numberOf.get(a.playerId) ?? 999) - (numberOf.get(b.playerId) ?? 999));

  const scoreByPeriod = Array.from(byPeriod.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([period, s]) => ({ period, ...s }));

  return { players: playerLines, team, opponent, score: { us: team.pts, them: opponent.pts }, scoreByPeriod };
}
