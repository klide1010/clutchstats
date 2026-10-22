import { useState } from 'preact/hooks';
import type { LiveGame } from '../state/liveGame';
import { navigate } from '../router';
import { EventHistory } from './EventHistory';
import { PlayerPicker } from './PlayerPicker';
import { toast } from './Toast';
import { trySync, syncState } from '../api/sync';
import { Icon } from './Icon';

interface Props {
  lg: LiveGame;
  onClose: () => void;
  onClosed?: () => void;
}

export function GameMenu({ lg, onClose, onClosed }: Props) {
  const [view, setView] = useState<'menu' | 'history' | 'lineup' | 'period'>('menu');
  const [sel, setSel] = useState<string[]>(lg.game.value.starters);
  const g = lg.game.value;
  const open = lg.periodOpen.value;
  const [next, setNext] = useState<string[]>(lg.onCourt.value);
  const fouledOut = lg.boxScore.value.players.filter((l) => l.pf >= 5).map((l) => l.playerId);
  const nextLabel = g.currentPeriod >= g.periodsRegulation ? 'Inizia supplementare' : 'Inizia periodo';
  const startNext = () => run(async () => { await lg.setPeriodLineup(next); await lg.startPeriod(); });

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    try { await fn(); if (okMsg) toast(okMsg, 'ok'); onClose(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Errore', 'error'); }
  };

  const closeGame = async () => {
    if (!confirm('Chiudere la partita? Potrai riaprirla dalle statistiche.')) return;
    await run(async () => { await lg.closeGame(); onClosed?.(); });
    void trySync();
    navigate(`#/stats/${g.id}`);
  };

  return (
    <div class="popup-backdrop" onClick={onClose}>
      <div class="popup" onClick={(e) => e.stopPropagation()} style="max-height:85vh;overflow:auto">
        <div class="row">
          {view !== 'menu' && <button class="btn btn-sm btn-icon icon-only btn-ghost" style="flex:0 0 auto" aria-label="Indietro" onClick={() => setView('menu')}><Icon name="back" size={18} /></button>}
          <strong class="card-title"><Icon name={view === 'menu' ? 'menu' : view === 'history' ? 'list' : 'users'} size={18} /> {view === 'menu' ? 'Menu partita' : view === 'history' ? 'Cronologia' : view === 'period' ? 'Chi inizia il periodo' : 'Quintetto'}</strong>
          <button class="btn btn-sm btn-icon icon-only btn-ghost" style="flex:0 0 auto" aria-label="Chiudi" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        {view === 'menu' && (
          <>
            {open
              ? <button class="btn btn-block" onClick={() => run(async () => { await lg.endPeriod(); void trySync(); }, 'Periodo chiuso')}>Fine periodo</button>
              : <button class="btn btn-block btn-primary" onClick={() => { setNext(lg.onCourt.value.filter((id) => !fouledOut.includes(id))); setView('period'); }}>{nextLabel}</button>}
            <div class="row">
              <button class="btn" onClick={() => run(() => lg.addEvent({ type: 'TIMEOUT', side: 'US' }).then(() => undefined), 'Timeout noi')}>Timeout noi</button>
              <button class="btn" onClick={() => run(() => lg.addEvent({ type: 'TIMEOUT', side: 'THEM' }).then(() => undefined), 'Timeout loro')}>Timeout loro</button>
            </div>
            <button class="btn btn-block btn-icon" disabled={syncState.value.running} onClick={() => run(async () => { const r = await trySync(); if (!r) throw new Error(syncState.value.lastError ?? 'Sync non riuscita'); }, 'Partita inviata: un altro telefono può prenderla in carico')}><Icon name="sync" size={18} /> Invia partita (sync)</button>
            <button class="btn btn-block" onClick={() => setView('history')}>Cronologia eventi</button>
            {g.currentPeriod === 0 && <button class="btn btn-block" onClick={() => setView('lineup')}>Modifica quintetto</button>}
            <button class="btn btn-block" onClick={() => navigate(`#/stats/${g.id}`)}>Statistiche</button>
            <button class="btn btn-block btn-icon btn-danger" onClick={closeGame}><Icon name="flag" size={18} /> Chiudi partita</button>
            <button class="btn btn-block btn-sm" onClick={() => navigate('#/calendar')}>Esci (la partita resta in corso)</button>
          </>
        )}
        {view === 'history' && <EventHistory lg={lg} />}
        {view === 'period' && (
          <>
            <span class="muted">Scegli i 5 in campo all'inizio del periodo: già selezionati quelli che hanno chiuso il precedente.</span>
            <PlayerPicker players={lg.players.value} selected={next} max={5} onChange={setNext} disabled={fouledOut} />
            <button class="btn btn-primary btn-block btn-icon" disabled={next.length !== 5} onClick={startNext}><Icon name="play" size={18} /> {nextLabel}</button>
          </>
        )}
        {view === 'lineup' && (
          <>
            <PlayerPicker players={lg.players.value} selected={sel} max={5} onChange={setSel} />
            <button class="btn btn-primary btn-block" disabled={sel.length !== 5} onClick={() => run(() => lg.setStarters(sel), 'Quintetto salvato')}>Salva</button>
          </>
        )}
      </div>
    </div>
  );
}
