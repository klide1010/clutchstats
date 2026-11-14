import type { Game } from './types';

/** Punteggio inserito a mano ("solo risultato"), se c'è. */
export function manualScore(g: Game): { us: number; them: number } | undefined {
  return typeof g.scoreUs === 'number' && typeof g.scoreThem === 'number' ? { us: g.scoreUs, them: g.scoreThem } : undefined;
}

/** Partita chiusa con il solo risultato, senza statistiche. */
export function isResultOnly(g: Game): boolean {
  return g.status === 'CLOSED' && manualScore(g) !== undefined;
}
