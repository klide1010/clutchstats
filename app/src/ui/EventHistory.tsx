import { periodLabel } from '@bkstats/shared';
import { eventLabel, type LiveGame } from '../state/liveGame';
import { fmtClock } from './TopBar';

export function EventHistory({ lg }: { lg: LiveGame }) {
  const g = lg.game.value;
  const events = lg.events.value.filter((e) => !e.deleted).slice().reverse();
  return (
    <ul class="list history">
      {events.map((e) => (
        <li key={e.id}>
          <span class="muted" style="flex:0 0 3.6em">{periodLabel(e.period, g.periodsRegulation)}{e.clockSec !== undefined ? ` ${fmtClock(e.clockSec)}` : ''}</span>
          <span style="flex:1">{eventLabel(e, lg.players.value)}</span>
          {e.type !== 'PERIOD_START' && e.type !== 'PERIOD_END' && (
            <button class="btn btn-sm" aria-label="Elimina" onClick={() => void lg.deleteEvent(e.id)}>Elimina</button>
          )}
        </li>
      ))}
      {events.length === 0 && <li class="muted">Nessun evento</li>}
    </ul>
  );
}
