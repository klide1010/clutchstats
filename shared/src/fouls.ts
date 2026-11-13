import type { FoulKind, GameEvent, Side } from './types';

/** Tecnici di allenatore (C) e panchina (B): non sono falli di un giocatore né falli di squadra. */
export function isCoachFoul(kind?: FoulKind): boolean {
  return kind === 'COACH_TECHNICAL' || kind === 'BENCH_TECHNICAL';
}

/** Falli che contano per l'espulsione del giocatore: tecnico cat. 1, flagrante (e l'antisportivo delle partite pre-2026). */
export function countsTowardDisqualification(kind?: FoulKind): boolean {
  return kind === 'TECHNICAL' || kind === 'FLAGRANT' || kind === 'UNSPORTSMANLIKE';
}

/** I falli di squadra dei supplementari si sommano a quelli dell'ultimo periodo regolamentare. */
export function teamFoulPeriod(period: number, periodsRegulation: number): number {
  return Math.min(period, periodsRegulation);
}

export interface PlayerFoulStatus {
  /** Falli del giocatore (tutti tranne C e B): a 5 esce. */
  fouls: number;
  /** Tecnici cat. 1 e flagranti: a 2 è espulso. */
  gdFouls: number;
  fouledOut: boolean;
  /** Espulso: 2 tra tecnici cat. 1 e flagranti, oppure un fallo da espulsione. */
  disqualified: boolean;
  /** Non può più giocare (5 falli o espulso). */
  out: boolean;
}

export function playerFoulStatus(events: GameEvent[], playerId: string): PlayerFoulStatus {
  let fouls = 0;
  let gdFouls = 0;
  let direct = false;
  for (const e of events) {
    if (e.deleted || e.type !== 'FOUL' || e.side !== 'US' || e.playerId !== playerId || isCoachFoul(e.foulKind)) continue;
    fouls++;
    if (countsTowardDisqualification(e.foulKind)) gdFouls++;
    if (e.foulKind === 'DISQUALIFYING') direct = true;
  }
  const fouledOut = fouls >= 5;
  const disqualified = direct || gdFouls >= 2;
  return { fouls, gdFouls, fouledOut, disqualified, out: fouledOut || disqualified };
}

/** Allenatore: espulso con 2 tecnici C, oppure con 3 tecnici tra B e C. */
export function coachStatus(events: GameEvent[], side: Side): { coach: number; bench: number; disqualified: boolean } {
  let coach = 0;
  let bench = 0;
  for (const e of events) {
    if (e.deleted || e.type !== 'FOUL' || e.side !== side) continue;
    if (e.foulKind === 'COACH_TECHNICAL') coach++;
    else if (e.foulKind === 'BENCH_TECHNICAL') bench++;
  }
  return { coach, bench, disqualified: coach >= 2 || coach + bench >= 3 };
}
