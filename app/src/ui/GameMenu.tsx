import { useState } from 'preact/hooks';
import type { LiveGame } from '../state/liveGame';
import { navigate } from '../router';
import { EventHistory } from './EventHistory';
import { PlayerPicker } from './PlayerPicker';
import { toast } from './Toast';

interface Props {
  lg: LiveGame;
  onClose: () => void;
  onClosed?: () => void;
}

export function GameMenu({ lg, onClose, onClosed }: Props) {
  const [view, setView] = useState<'menu' | 'history' | 'lineup'>('menu');
  const [sel, setSel] = useState<string[]>(lg.game.value.starters);
  const g = lg.game.value;
  const open = lg.periodOpen.value;

  const run = async (fn: () => Promise<void>, okMsg?: string) => {
    try { await fn(); if (okMsg) toast(okMsg, 'ok'); onClose(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Errore', 'error'); }
  };

  const closeGame = async () => {
    if (!confirm('Chiudere la partita? Potrai riaprirla dalle statistiche.')) return;
    await run(async () => { await lg.closeGame(); onClosed?.(); });
    navigate(`#/stats/${g.id}`);
  };

  return (
    <div class="popup-backdrop" onClick={onClose}>
      <div class="popup" onClick={(e) => e.stopPropagation()} style="max-height:85vh;overflow:auto">
        <div class="row">
          <strong>{view === 'menu' ? 'Menu' : view === 'history' ? 'Cronologia' : 'Quintetto'}</strong>
          {view !== 'menu' && <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => setView('menu')}>‹ Menu</button>}
          <button class="btn btn-sm" style="flex:0 0 auto" onClick={onClose}>Chiudi</button>
        </div>
        {view === 'menu' && (
          <>
            {open
              ? <button class="btn btn-block" onClick={() => run(() => lg.endPeriod(), 'Periodo chiuso')}>Fine periodo</button>
              : <button class="btn btn-block btn-primary" onClick={() => run(() => lg.startPeriod())}>{g.currentPeriod >= g.periodsRegulation ? 'Inizia supplementare' : 'Inizia periodo'}</button>}
            <div class="row">
              <button class="btn" onClick={() => run(() => lg.addEvent({ type: 'TIMEOUT', side: 'US' }).then(() => undefined), 'Timeout noi')}>Timeout noi</button>
              <button class="btn" onClick={() => run(() => lg.addEvent({ type: 'TIMEOUT', side: 'THEM' }).then(() => undefined), 'Timeout loro')}>Timeout loro</button>
            </div>
            <button class="btn btn-block" onClick={() => setView('history')}>Cronologia eventi</button>
            {g.currentPeriod === 0 && <button class="btn btn-block" onClick={() => setView('lineup')}>Modifica quintetto</button>}
            <button class="btn btn-block" onClick={() => navigate(`#/stats/${g.id}`)}>Statistiche</button>
            <button class="btn btn-block" style="border-color:var(--err)" onClick={closeGame}>Chiudi partita</button>
            <button class="btn btn-block btn-sm" onClick={() => navigate('#/calendar')}>Esci (la partita resta in corso)</button>
          </>
        )}
        {view === 'history' && <EventHistory lg={lg} />}
        {view === 'lineup' && (
          <>
            <PlayerPicker players={lg.players.value.filter((p) => p.active)} selected={sel} max={5} onChange={setSel} />
            <button class="btn btn-primary btn-block" disabled={sel.length !== 5} onClick={() => run(() => lg.setStarters(sel), 'Quintetto salvato')}>Salva</button>
          </>
        )}
      </div>
    </div>
  );
}
