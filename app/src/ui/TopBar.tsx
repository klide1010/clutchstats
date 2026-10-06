import { periodLabel } from '@bkstats/shared';
import type { LiveGame } from '../state/liveGame';
import { useRef } from 'preact/hooks';

interface Props {
  lg: LiveGame;
  onSubs: () => void;
  onMenu: () => void;
}

export function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function TopBar({ lg, onSubs, onMenu }: Props) {
  const g = lg.game.value;
  const bs = lg.boxScore.value;
  const period = Math.max(1, g.currentPeriod);
  const usFouls = bs.team.foulsByPeriod[period] ?? 0;
  const themFouls = bs.opponent.foulsByPeriod[period] ?? 0;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);

  const clockDown = () => { long.current = false; timer.current = setTimeout(() => { long.current = true; editClock(); }, 600); };
  const clockUp = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const clockClick = () => {
    if (long.current) { long.current = false; return; }
    if (!lg.periodOpen.value) return;
    if (lg.clock.running.value) lg.clock.stop(); else lg.clock.start();
  };
  const editClock = () => {
    const v = prompt('Tempo residuo (m:ss)', fmtClock(lg.clock.remainingSec.value));
    if (!v) return;
    const m = v.trim().match(/^(\d{1,2})[:.](\d{1,2})$/);
    if (m) lg.clock.set(Number(m[1]) * 60 + Number(m[2]));
  };

  return (
    <header class="topbar">
      <div class="score">
        <span class="score-team">{lg.players.value.length ? 'NOI' : 'NOI'}</span>
        <span class="score-num">{bs.score.us}</span>
        <span class={`fouls${usFouls >= 5 ? ' bonus' : ''}`}>F{usFouls}</span>
      </div>
      <div class="center">
        <span class="period">{g.currentPeriod === 0 ? '—' : periodLabel(g.currentPeriod, g.periodsRegulation)}</span>
        {g.useClock && (
          <button class={`clock${lg.clock.running.value ? ' running' : ''}`} onPointerDown={clockDown} onPointerUp={clockUp} onPointerLeave={clockUp} onClick={clockClick}>
            {fmtClock(lg.clock.remainingSec.value)}
          </button>
        )}
      </div>
      <div class="score them">
        <span class={`fouls${themFouls >= 5 ? ' bonus' : ''}`}>F{themFouls}</span>
        <span class="score-num">{bs.score.them}</span>
        <span class="score-team">{lg.opponent.value.shortName}</span>
      </div>
      <div class="topbar-actions">
        <button class="btn btn-sm" disabled={!lg.canUndo.value} onClick={() => void lg.undo()}>Undo</button>
        <button class="btn btn-sm" onClick={onSubs}>Cambi</button>
        <button class="btn btn-sm" onClick={onMenu}>☰</button>
      </div>
    </header>
  );
}
