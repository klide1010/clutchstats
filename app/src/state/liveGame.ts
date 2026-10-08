import { computed, effect, signal, type ReadonlySignal, type Signal } from '@preact/signals';
import {
  computeBoxScore, elapsedSec, newId, onCourtAfter, periodLengthSec, THEM_ALLOWED_TYPES,
  type BoxScore, type Game, type GameEvent, type Opponent, type Player,
} from '@bkstats/shared';
import { eventsRepo, gamesRepo, opponentsRepo, playersRepo } from '../db';
import { createClock, type GameClock } from './clock';
import { loadGames } from './games';
import { syncState } from '../api/sync';
import { getDeviceId } from './device';
import { addNumbers } from './opponents';

export type AddEventInput = Omit<GameEvent, 'id' | 'gameId' | 'seq' | 'period' | 'updatedAt' | 'deleted' | 'createdAt' | 'clockSec'> & { clockSec?: number };

export interface LiveGame {
  game: Signal<Game>;
  events: Signal<GameEvent[]>;
  /** Convocati (o tutti gli attivi se non impostati). */
  players: ReadonlySignal<Player[]>;
  /** Tutto il roster della squadra, per scegliere i convocati. */
  allPlayers: Signal<Player[]>;
  opponent: Signal<Opponent>;
  clock: GameClock;
  boxScore: ReadonlySignal<BoxScore>;
  onCourt: ReadonlySignal<string[]>;
  bench: ReadonlySignal<Player[]>;
  periodOpen: ReadonlySignal<boolean>;
  /** Partita in corso registrata da un altro dispositivo: chiedere se prenderla in carico. */
  foreignLive: ReadonlySignal<boolean>;
  /** Giocatori in campo con 5 falli: vanno sostituiti (o si annulla il fallo). */
  fouledOut: ReadonlySignal<string[]>;
  canUndo: ReadonlySignal<boolean>;
  lastEventLabel: ReadonlySignal<string>;
  addEvent(input: AddEventInput): Promise<GameEvent>;
  undo(): Promise<GameEvent | null>;
  deleteEvent(id: string): Promise<void>;
  startPeriod(): Promise<void>;
  endPeriod(): Promise<void>;
  substitute(outId: string, inId: string, clockSec?: number): Promise<void>;
  setStarters(ids: string[]): Promise<void>;
  setRoster(ids: string[]): Promise<void>;
  takeOver(): Promise<void>;
  restartFromScratch(): Promise<void>;
  addOpponentNumber(n: number): Promise<void>;
  /** Ultimo fallo (non cancellato) fischiato a un giocatore, per annullarlo. */
  lastFoulOf(playerId: string): GameEvent | null;
  closeGame(): Promise<void>;
  reload(): Promise<void>;
  dispose(): void;
}

const TYPE_LABELS: Record<string, string> = {
  REBOUND_OFF: 'Rimbalzo off.', REBOUND_DEF: 'Rimbalzo dif.', TURNOVER: 'Palla persa', STEAL: 'Palla recuperata',
  BLOCK: 'Stoppata', BLOCK_RECEIVED: 'Stoppata subita', FOUL: 'Fallo', FOUL_DRAWN: 'Fallo subito', SCREEN: 'Blocco',
  TIMEOUT: 'Timeout', PERIOD_START: 'Inizio periodo', PERIOD_END: 'Fine periodo',
};

const FOUL_LABELS: Record<string, string> = { PERSONAL: '', UNSPORTSMANLIKE: ' antisportivo', TECHNICAL: ' tecnico', OFFENSIVE: ' in attacco' };

export function eventLabel(e: GameEvent, players: Player[]): string {
  const byId = new Map(players.map((p) => [p.id, p]));
  const who = (id?: string) => { const p = id ? byId.get(id) : undefined; return p ? `#${p.number} ${p.lastName}` : 'Noi'; };
  if (e.type === 'SUBSTITUTION') return `Cambio: esce ${who(e.subOutPlayerId).replace(/ .*/, '')} entra ${who(e.subInPlayerId).replace(/ .*/, '')}`;
  if (e.type === 'PERIOD_START' || e.type === 'PERIOD_END') return `${TYPE_LABELS[e.type]} ${e.period}`;
  const subject = e.side === 'US' ? who(e.playerId) : e.jerseyNumber !== undefined ? `Loro #${e.jerseyNumber}` : 'Loro';
  let what: string;
  if (e.type === 'SHOT_2' || e.type === 'SHOT_3') what = `T${e.type === 'SHOT_3' ? 3 : 2} ${e.made ? 'segnato' : 'sbagliato'}`;
  else if (e.type === 'FREE_THROW') what = `TL ${e.made ? 'segnato' : 'sbagliato'}`;
  else if (e.type === 'FOUL') what = `Fallo${FOUL_LABELS[e.foulKind ?? 'PERSONAL'] ?? ''}`;
  else what = TYPE_LABELS[e.type] ?? e.type;
  return `${subject} · ${what}`;
}

export async function openLiveGame(gameId: string): Promise<LiveGame> {
  const g = await gamesRepo.get(gameId);
  if (!g) throw new Error('Partita non trovata');
  const opp = (await opponentsRepo.get(g.opponentId)) ?? { id: g.opponentId, name: 'Avversario', shortName: 'AVV', roster: [], updatedAt: 0, deleted: false };

  const deviceId = await getDeviceId();
  const game = signal<Game>(g);
  const events = signal<GameEvent[]>(await eventsRepo.byGame(gameId));
  const allPlayers = signal<Player[]>(await playersRepo.byTeam(g.teamId));
  const players = computed(() => {
    const r = game.value.roster;
    return r && r.length ? allPlayers.value.filter((p) => r.includes(p.id)) : allPlayers.value.filter((p) => p.active);
  });
  const opponent = signal<Opponent>(opp);
  const clock = createClock(periodLengthSec(g, Math.max(1, g.currentPeriod)));
  // Ripristino del cronometro dopo un reload: ultimo evento del periodo corrente con tempo noto.
  if (g.useClock && g.currentPeriod > 0) {
    const live0 = events.value.filter((e) => !e.deleted && e.period === g.currentPeriod);
    const lastP = [...live0].reverse().find((e) => e.type === 'PERIOD_START' || e.type === 'PERIOD_END');
    if (lastP?.type === 'PERIOD_START') {
      const stamped = [...live0].reverse().find((e) => e.clockSec !== undefined);
      if (stamped?.clockSec !== undefined) clock.set(stamped.clockSec);
    }
  }
  let seqCounter = events.value.reduce((m, e) => Math.max(m, e.seq), 0);

  const live = computed(() => events.value.filter((e) => !e.deleted));
  const periodOpen = computed(() => {
    const l = live.value;
    const lastP = [...l].reverse().find((e) => e.type === 'PERIOD_START' || e.type === 'PERIOD_END');
    return lastP?.type === 'PERIOD_START';
  });
  const onCourt = computed(() => onCourtAfter(game.value, live.value, Number.MAX_SAFE_INTEGER));
  const bench = computed(() => players.value.filter((p) => p.active && !onCourt.value.includes(p.id)));
  const nowElapsed = computed(() => {
    const gm = game.value;
    if (!periodOpen.value || gm.currentPeriod === 0) return undefined;
    return gm.useClock ? elapsedSec(gm, gm.currentPeriod, clock.remainingSec.value) : undefined;
  });
  const boxScore = computed(() => computeBoxScore(game.value, live.value, players.value, nowElapsed.value));
  const foreignLive = computed(() => game.value.status === 'LIVE' && !!game.value.ownerDevice && game.value.ownerDevice !== deviceId);
  const foulsByPlayer = computed(() => {
    const m: Record<string, number> = {};
    for (const e of live.value) if (e.type === 'FOUL' && e.side === 'US' && e.playerId) m[e.playerId] = (m[e.playerId] ?? 0) + 1;
    return m;
  });
  const fouledOut = computed(() => onCourt.value.filter((id) => (foulsByPlayer.value[id] ?? 0) >= 5));
  const lastFoulOf = (playerId: string): GameEvent | null => [...live.value].reverse().find((e) => e.type === 'FOUL' && e.side === 'US' && e.playerId === playerId) ?? null;
  const undoable = computed(() => [...live.value].reverse().find((e) => e.type !== 'PERIOD_START' && e.type !== 'PERIOD_END') ?? null);
  const canUndo = computed(() => undoable.value !== null);
  const lastEventLabel = computed(() => { const l = live.value; return l.length ? eventLabel(l[l.length - 1], players.value) : ''; });

  const saveGame = async (patch: Partial<Game>) => {
    game.value = await gamesRepo.put({ ...game.value, ...patch });
    void loadGames().catch(() => undefined);
  };

  const nextSeq = () => ++seqCounter;

  const persist = async (partial: Omit<GameEvent, 'id' | 'gameId' | 'seq' | 'updatedAt' | 'deleted' | 'createdAt'>): Promise<GameEvent> => {
    const ev = await eventsRepo.put({ id: newId(), gameId, seq: nextSeq(), createdAt: Date.now(), ...partial });
    events.value = [...events.value, ev];
    return ev;
  };

  const stampClock = (clockSec?: number) => (clockSec !== undefined ? clockSec : game.value.useClock ? clock.remainingSec.value : undefined);

  const addEvent = async (input: AddEventInput): Promise<GameEvent> => {
    const gm = game.value;
    if (gm.status === 'CLOSED') throw new Error('Partita chiusa');
    if (input.type === 'PERIOD_START' || input.type === 'PERIOD_END') throw new Error('Usa startPeriod/endPeriod');
    if (!periodOpen.value && input.type !== 'TIMEOUT' && input.type !== 'SUBSTITUTION') throw new Error('Periodo non aperto');
    if (input.side === 'THEM' && !THEM_ALLOWED_TYPES.has(input.type)) throw new Error('Evento non ammesso per gli avversari');
    if (input.side === 'US' && (input.type === 'SHOT_2' || input.type === 'SHOT_3' || input.type === 'FREE_THROW') && !input.playerId) throw new Error('Seleziona il giocatore');
    if (input.side === 'US' && input.playerId && input.type !== 'SUBSTITUTION' && (foulsByPlayer.value[input.playerId] ?? 0) >= 5) {
      const p = allPlayers.value.find((x) => x.id === input.playerId);
      throw new Error(`${p ? '#' + p.number + ' ' + p.lastName : 'Giocatore'} ha 5 falli: va sostituito`);
    }
    return persist({ ...input, period: Math.max(1, gm.currentPeriod), clockSec: stampClock(input.clockSec) });
  };

  const markDeleted = async (e: GameEvent) => {
    await eventsRepo.softDelete(e.id);
    events.value = events.value.map((x) => (x.id === e.id ? { ...x, deleted: true } : x));
  };

  const undo = async (): Promise<GameEvent | null> => {
    const target = undoable.value;
    if (!target) return null;
    await markDeleted(target);
    return target;
  };

  const deleteEvent = async (id: string) => {
    const target = events.value.find((e) => e.id === id && !e.deleted);
    if (target) await markDeleted(target);
  };

  const startPeriod = async () => {
    if (periodOpen.value) throw new Error('Periodo già aperto');
    if (game.value.status === 'CLOSED') throw new Error('Partita chiusa');
    if (game.value.currentPeriod === 0 && game.value.starters.length !== 5) throw new Error('Scegli il quintetto iniziale');
    const period = game.value.currentPeriod + 1;
    await saveGame({ currentPeriod: period, status: 'LIVE', ownerDevice: game.value.ownerDevice ?? deviceId });
    clock.reset(periodLengthSec(game.value, period));
    await persist({ type: 'PERIOD_START', side: 'US', period, clockSec: stampClock() });
  };

  const endPeriod = async () => {
    if (!periodOpen.value) throw new Error('Nessun periodo aperto');
    clock.stop();
    await persist({ type: 'PERIOD_END', side: 'US', period: game.value.currentPeriod, clockSec: game.value.useClock ? 0 : undefined });
  };

  const substitute = async (outId: string, inId: string, clockSec?: number) => {
    if (!onCourt.value.includes(outId)) throw new Error('Giocatore non in campo');
    if (onCourt.value.includes(inId)) throw new Error('Giocatore già in campo');
    if ((foulsByPlayer.value[inId] ?? 0) >= 5) throw new Error('Ha 5 falli: non può rientrare');
    if (periodOpen.value && !game.value.useClock && clockSec === undefined) throw new Error('Indica il minuto del cambio');
    await addEvent({ type: 'SUBSTITUTION', side: 'US', subOutPlayerId: outId, subInPlayerId: inId, clockSec });
  };

  const setStarters = async (ids: string[]) => {
    if (game.value.currentPeriod !== 0) throw new Error('Quintetto modificabile solo prima della partita');
    if (new Set(ids).size !== 5) throw new Error('Servono esattamente 5 giocatori');
    const allowed = new Set(players.value.map((p) => p.id));
    if (!ids.every((id) => allowed.has(id))) throw new Error('Il quintetto deve essere tra i convocati');
    await saveGame({ starters: ids });
  };

  const setRoster = async (ids: string[]) => {
    if (game.value.currentPeriod !== 0) throw new Error('Convocati modificabili solo prima della partita');
    if (new Set(ids).size < 5) throw new Error('Servono almeno 5 convocati');
    const starters = game.value.starters.filter((id) => ids.includes(id));
    await saveGame({ roster: ids, starters });
  };

  const takeOver = async () => {
    await saveGame({ ownerDevice: deviceId });
  };

  /** Ignora la partita registrata altrove: cancella gli eventi e riporta la gara a programmata (la cancellazione si propaga con la sync). */
  const restartFromScratch = async () => {
    const now = Date.now();
    for (const e of events.value) if (!e.deleted) await eventsRepo.softDelete(e.id);
    events.value = events.value.map((e) => (e.deleted ? e : { ...e, deleted: true, updatedAt: now }));
    clock.reset(periodLengthSec(game.value, 1));
    await saveGame({ status: 'SCHEDULED', currentPeriod: 0, starters: [], ownerDevice: deviceId });
  };

  const addOpponentNumber = async (n: number) => {
    opponent.value = await addNumbers(opponent.value.id, [n]);
  };

  const closeGame = async () => {
    if (periodOpen.value) await endPeriod();
    await saveGame({ status: 'CLOSED' });
  };

  const reload = async () => {
    events.value = await eventsRepo.byGame(gameId);
    seqCounter = events.value.reduce((m, e) => Math.max(m, e.seq), seqCounter);
    const fresh = await gamesRepo.get(gameId);
    if (fresh) game.value = fresh;
  };

  let lastSeenSync = syncState.peek().lastAt;
  const stopSyncWatch = effect(() => {
    const at = syncState.value.lastAt;
    if (at !== lastSeenSync) { lastSeenSync = at; void reload(); }
  });

  return {
    game, events, players, allPlayers, opponent, clock, boxScore, onCourt, bench, periodOpen, foreignLive, fouledOut, canUndo, lastEventLabel,
    addEvent, undo, deleteEvent, startPeriod, endPeriod, substitute, setStarters, setRoster, takeOver, restartFromScratch, addOpponentNumber, lastFoulOf, closeGame, reload,
    dispose: () => { stopSyncWatch(); clock.dispose(); },
  };
}
