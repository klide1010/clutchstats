import type { Game, GameEvent } from './types';
import { elapsedSec } from './time';

export function liveEvents(events: GameEvent[]): GameEvent[] {
  return events.filter((e) => !e.deleted).sort((a, b) => a.seq - b.seq);
}

/** Giocatori in campo dopo l'evento con seq <= uptoSeq (starters + cambi). */
export function onCourtAfter(game: Game, events: GameEvent[], uptoSeq: number): string[] {
  const onCourt = new Set(game.starters);
  for (const e of liveEvents(events)) {
    if (e.seq > uptoSeq) break;
    if (e.type === 'SUBSTITUTION') {
      if (e.subOutPlayerId) onCourt.delete(e.subOutPlayerId);
      if (e.subInPlayerId) onCourt.add(e.subInPlayerId);
    }
  }
  return Array.from(onCourt);
}

/** Secondi giocati per giocatore, derivati da starters, cambi e periodi. */
export function computeSecondsPlayed(
  game: Game,
  events: GameEvent[],
  nowElapsedSec?: number,
): Record<string, number> {
  const totals: Record<string, number> = {};
  const onCourt = new Set(game.starters);
  const entered = new Map<string, number>();
  let periodOpen = false;
  let period = 0;
  let lastKnown = 0;

  const add = (id: string, sec: number) => {
    totals[id] = (totals[id] ?? 0) + Math.max(0, sec);
  };
  const closeAll = (at: number) => {
    for (const [id, start] of entered) add(id, at - start);
    entered.clear();
  };

  for (const e of liveEvents(events)) {
    switch (e.type) {
      case 'PERIOD_START': {
        period = e.period;
        periodOpen = true;
        const periodStart = elapsedSec(game, period, Number.MAX_SAFE_INTEGER);
        lastKnown = periodStart;
        for (const id of onCourt) entered.set(id, periodStart);
        break;
      }
      case 'PERIOD_END': {
        const end = elapsedSec(game, e.period, 0);
        closeAll(end);
        lastKnown = end;
        periodOpen = false;
        break;
      }
      case 'SUBSTITUTION': {
        if (periodOpen) {
          const t = elapsedSec(game, e.period, e.clockSec);
          lastKnown = Math.max(lastKnown, t);
          if (e.subOutPlayerId && entered.has(e.subOutPlayerId)) {
            add(e.subOutPlayerId, t - entered.get(e.subOutPlayerId)!);
            entered.delete(e.subOutPlayerId);
          }
          if (e.subInPlayerId) entered.set(e.subInPlayerId, t);
        }
        if (e.subOutPlayerId) onCourt.delete(e.subOutPlayerId);
        if (e.subInPlayerId) onCourt.add(e.subInPlayerId);
        break;
      }
      default:
        if (periodOpen && e.clockSec !== undefined) {
          lastKnown = Math.max(lastKnown, elapsedSec(game, e.period, e.clockSec));
        }
    }
  }

  if (periodOpen && entered.size > 0) {
    closeAll(nowElapsedSec !== undefined ? Math.max(nowElapsedSec, lastKnown) : lastKnown);
  }
  return totals;
}
