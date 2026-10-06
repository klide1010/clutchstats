import type { StatLine } from './boxscore';

/** Valutazione Lega: (PT + RT + AS + PR + ST + FS) − (TL sbagliati + T2 sbagliati + T3 sbagliati + PP + SS + FF). */
export function legaRating(l: StatLine): number {
  const positives = l.pts + l.reb + l.ast + l.stl + l.blk + l.pfd;
  const negatives = (l.fta - l.ftm) + (l.fg2a - l.fg2m) + (l.fg3a - l.fg3m) + l.tov + l.blkR + l.pf;
  return positives - negatives;
}
