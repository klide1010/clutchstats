import { OT_LENGTH_MIN, type Game } from './types';

type ClockGame = Pick<Game, 'periodLengthMin' | 'periodsRegulation'>;

/** Durata in secondi del periodo: regolamentare o supplementare (5 minuti). */
export function periodLengthSec(game: ClockGame, period: number): number {
  return period <= game.periodsRegulation ? game.periodLengthMin * 60 : OT_LENGTH_MIN * 60;
}

/** Secondi di gioco trascorsi dall'inizio partita. Senza cronometro si assume metà periodo. */
export function elapsedSec(game: ClockGame, period: number, clockSec?: number): number {
  let before = 0;
  for (let p = 1; p < period; p++) before += periodLengthSec(game, p);
  const len = periodLengthSec(game, period);
  const remaining = clockSec === undefined ? len / 2 : Math.min(Math.max(clockSec, 0), len);
  return before + (len - remaining);
}

export function periodLabel(period: number, periodsRegulation: number): string {
  return period <= periodsRegulation ? `Q${period}` : `OT${period - periodsRegulation}`;
}
