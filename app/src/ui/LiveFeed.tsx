import { periodLabel } from '@bkstats/shared';
import { eventLabel, type LiveGame } from '../state/liveGame';
import { historyByPeriod } from '../model/gameView';
import { fmtClock } from './TopBar';

/** Ultime azioni della partita, dalla più recente, con il punteggio sui canestri. Visibile solo su tablet in orizzontale. */
export function LiveFeed({ lg, limit = 30 }: { lg: LiveGame; limit?: number }) {
  const g = lg.game.value;
  const rows = historyByPeriod(lg.events.value).reduce((all, p) => all.concat(p.rows), [] as ReturnType<typeof historyByPeriod>[number]['rows']).slice(0, limit);
  return (
    <aside class="live-feed">
      <span class="live-feed-title">Ultime azioni</span>
      <ul class="list history">
        {rows.map(({ e, score }) => (
          <li key={e.id}>
            <span class="muted live-feed-time">{periodLabel(e.period, g.periodsRegulation)}{e.clockSec !== undefined ? ` ${fmtClock(e.clockSec)}` : ''}</span>
            <span style="flex:1;min-width:0">{eventLabel(e, lg.players.value)}</span>
            {score && <span class="run-score">{e.side === 'US' ? <b class="accent-text">{score.us}</b> : score.us}–{e.side === 'THEM' ? <b class="accent-text">{score.them}</b> : score.them}</span>}
          </li>
        ))}
        {rows.length === 0 && <li class="muted">Nessuna azione</li>}
      </ul>
    </aside>
  );
}
