import { useState } from 'preact/hooks';
import { elapsedSec, periodLengthSec } from '@bkstats/shared';
import type { LiveGame } from '../state/liveGame';
import { MinutePicker } from './MinutePicker';
import { toast } from './Toast';

interface Props {
  lg: LiveGame;
  onClose: () => void;
}

export function SubsPanel({ lg, onClose }: Props) {
  const [outId, setOutId] = useState<string | null>(null);
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
  const defaultMin = Math.floor(elapsedSec(g, period, undefined) % periodLen / 60);

  return (
    <div class="popup-backdrop" onClick={onClose}>
      <div class="popup" onClick={(e) => e.stopPropagation()}>
        <div class="row">
          <strong>Cambi</strong>
          <button class="btn btn-sm" style="flex:0 0 auto" onClick={onClose}>Chiudi</button>
        </div>
        {askMinute && outId && inId ? (
          <MinutePicker maxMin={periodLen / 60} defaultMin={defaultMin} onConfirm={(m) => perform(periodLen - m * 60)} onCancel={() => setAskMinute(false)} />
        ) : (
          <div class="subs-cols">
            <div>
              <span class="muted">In campo</span>
              {onCourt.map((p) => (
                <button key={p.id} class={`btn btn-block sub-btn${outId === p.id ? ' active' : ''}`} onClick={() => pickOut(p.id)}>
                  #{p.number} {p.lastName} {fouls[p.id] ? <span class="muted">F{fouls[p.id]}</span> : null}
                </button>
              ))}
            </div>
            <div>
              <span class="muted">Panchina</span>
              {bench.map((p) => (
                <button key={p.id} class={`btn btn-block sub-btn${inId === p.id ? ' active' : ''}`} onClick={() => pickIn(p.id)}>
                  #{p.number} {p.lastName} {fouls[p.id] ? <span class="muted">F{fouls[p.id]}</span> : null}
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
