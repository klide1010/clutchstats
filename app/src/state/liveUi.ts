import { signal } from '@preact/signals';
import type { EventType, FoulKind, Side } from '@bkstats/shared';
import type { AddEventInput, LiveGame } from './liveGame';
import { toast, toastState } from '../ui/Toast';

export const side = signal<Side>('US');
export const selectedPlayerId = signal<string | null>(null);
export const selectedJersey = signal<number | null>(null);
export const pendingAction = signal<EventType | null>(null);
export const pendingFoulKind = signal<FoulKind>('PERSONAL');
export const pendingShot = signal<{ x: number; y: number } | null>(null);
export const lastToast = toastState;

/** Azioni che non richiedono un giocatore lato Noi. */
const TEAM_ONLY: ReadonlySet<EventType> = new Set<EventType>(['TIMEOUT']);

export function resetSelection(): void {
  selectedPlayerId.value = null;
  selectedJersey.value = null;
  pendingAction.value = null;
  pendingFoulKind.value = 'PERSONAL';
  pendingShot.value = null;
}

function buildInput(type: EventType): AddEventInput {
  const base: AddEventInput = { type, side: side.value };
  if (side.value === 'US') {
    if (!TEAM_ONLY.has(type)) base.playerId = selectedPlayerId.value ?? undefined;
  } else if (selectedJersey.value !== null && (type === 'FOUL' || type === 'SHOT_2' || type === 'SHOT_3' || type === 'FREE_THROW')) {
    base.jerseyNumber = selectedJersey.value;
  }
  if (type === 'FOUL') base.foulKind = pendingFoulKind.value;
  return base;
}

export async function commit(lg: LiveGame, type: EventType): Promise<boolean> {
  try {
    const ev = await lg.addEvent(buildInput(type));
    toast(lg.lastEventLabel.peek() || ev.type, 'ok');
    resetSelection();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    toast(msg === 'Periodo non aperto' || msg === 'Seleziona il giocatore' ? msg : 'Salvataggio fallito, riprova', 'error');
    return false;
  }
}

export async function onPlayerTap(id: string, lg: LiveGame): Promise<void> {
  if (pendingAction.value) {
    selectedPlayerId.value = id;
    await commit(lg, pendingAction.value);
    return;
  }
  selectedPlayerId.value = selectedPlayerId.value === id ? null : id;
}

export async function onActionTap(type: EventType, lg: LiveGame): Promise<void> {
  if (side.value === 'THEM' || TEAM_ONLY.has(type) || selectedPlayerId.value) {
    const ok = await commit(lg, type);
    if (!ok && side.value === 'US' && !TEAM_ONLY.has(type)) pendingAction.value = type; // il tap successivo ritenta
    return;
  }
  pendingAction.value = pendingAction.value === type ? null : type;
}
