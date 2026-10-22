import { useState } from 'preact/hooks';
import { elapsedSec, periodLengthSec } from '@bkstats/shared';
import type { LiveGame } from '../state/liveGame';
import { MinutePicker } from './MinutePicker';
import { toast } from './Toast';
import { FoulDots } from './FoulDots';
import { Icon } from './Icon';

interface Props {
  lg: LiveGame;
  onClose: () => void;
  /** Giocatore in campo già selezionato per uscire (es. dopo il quinto fallo). */
  initialOut?: string | null;
}

export function SubsPanel({ lg, onClose, initialOut = null }: Props) {
  const [outId, setOutId] = useState<string | null>(initialOut);
  const [inId, setInId] = useState<string | null>(null);
  const [askMinute, setAskMinute] = useState(false);

  const g = lg.game.value;
  const period = Math.max(1, g.currentPeriod);
  const onCourt = lg.players.value.filter((p) => lg.onCourt.value.includes(p.id)).sort((a, b) => a.number - b.number);
  const bench = lg.bench.value;
  const fouls: Record<string, number> = {};
  for (const l of lg.boxScore.value.players) fouls[l.playerId] = l.pf;

  const perform = async (clockSec?: number) => {
    if (!outId || !inId) return;
    try {
      await lg.substitute(outId, inId, clockSec);
      toast(lg.lastEventLabel.peek(), 'ok');
      setOutId(null); setInId(null); setAskMinute(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Errore', 'error');
      setAskMinute(false);
    }
  };

  const tryPerform = (o: string | null, i: string | null) => {
    if (!o || !i) return;
    // Con cronometro il tempo è quello del clock; tra un periodo e l'altro non serve; altrimenti chiedi il minuto.
    if (g.useClock || !lg.periodOpen.value) void perform(undefined);
    else setAskMinute(true);
  };

  const pickOut = (id: string) => { const next = outId === id ? null : id; setOutId(next); tryPerform(next, inId); };
  const pickIn = (id: string) => { const next = inId === id ? null : id; setInId(next); tryPerform(outId, next); };

  const periodLen = periodLengthSec(g, period);
  const defaultMin = periodLen / 60 - Math.floor(elapsedSec(g, period, undefined) % periodLen / 60);

  return (
    <div class="popup-backdrop" onClick={onClose}>
      <div class="popup" onClick={(e) => e.stopPropagation()}>
        <div class="row">
          <strong class="card-title"><Icon name="swap" size={18} /> Cambi</strong>
          <button class="btn btn-sm btn-icon icon-only btn-ghost" style="flex:0 0 auto" aria-label="Chiudi" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        {askMinute && outId && inId ? (
          <MinutePicker maxMin={periodLen / 60} defaultMin={defaultMin} onConfirm={(left) => perform(left * 60)} onCancel={() => setAskMinute(false)} />
        ) : (
          <div class="subs-cols">
            <div>
              <span class="muted">In campo</span>
              {onCourt.map((p) => (
                <button key={p.id} class={`btn btn-block sub-btn${outId === p.id ? ' active' : ''}`} onClick={() => pickOut(p.id)}>
                  <span class="sub-name">#{p.number} {p.lastName}</span><FoulDots count={fouls[p.id] ?? 0} />
                </button>
              ))}
            </div>
            <div>
              <span class="muted">Panchina</span>
              {bench.map((p) => (
                <button key={p.id} class={`btn btn-block sub-btn${inId === p.id ? ' active' : ''}`} disabled={(fouls[p.id] ?? 0) >= 5} onClick={() => pickIn(p.id)}>
                  <span class="sub-name">#{p.number} {p.lastName}</span><FoulDots count={fouls[p.id] ?? 0} />
                </button>
              ))}
              {bench.length === 0 && <p class="muted">Nessuno in panchina</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
