import { useState } from 'preact/hooks';
import { COURT, periodLabel, type Game, type GameEvent, type Player } from '@bkstats/shared';
import { Court } from './Court';
import { fmtPct } from '../model/export';

interface Props { game: Game; events: GameEvent[]; players: Player[] }

function distanceM(e: GameEvent): number {
  const xm = (e.x ?? 0.5) * COURT.widthM - COURT.basketX;
  const ym = (e.y ?? 0) * COURT.depthM - COURT.basketY;
  return Math.sqrt(xm * xm + ym * ym);
}

export function ShotChart({ game, events, players }: Props) {
  const [playerId, setPlayerId] = useState('ALL');
  const [period, setPeriod] = useState('ALL');
  const [outcome, setOutcome] = useState<'ALL' | 'MADE' | 'MISSED'>('ALL');
  const [sideSel, setSideSel] = useState<'US' | 'THEM'>('US');

  const shots = events.filter((e) => !e.deleted && (e.type === 'FREE_THROW' || ((e.type === 'SHOT_2' || e.type === 'SHOT_3') && e.x !== undefined && e.y !== undefined))
    && e.side === sideSel
    && (playerId === 'ALL' || e.playerId === playerId)
    && (period === 'ALL' || e.period === Number(period))
    && (outcome === 'ALL' || (outcome === 'MADE') === !!e.made));

  const periods = [...new Set(events.filter((e) => !e.deleted).map((e) => e.period))].sort((a, b) => a - b);
  const zone = (pred: (e: GameEvent) => boolean) => { const z = shots.filter(pred); return { m: z.filter((e) => e.made).length, a: z.length }; };
  const paint = zone((e) => e.type !== 'FREE_THROW' && distanceM(e) < 2);
  const mid = zone((e) => e.type === 'SHOT_2' && distanceM(e) >= 2);
  const three = zone((e) => e.type === 'SHOT_3');
  const ft = zone((e) => e.type === 'FREE_THROW');

  return (
    <div class="stack">
      <div class="row">
        <div class="seg">
          <button class={`seg-btn${sideSel === 'US' ? ' active' : ''}`} onClick={() => { setSideSel('US'); }}>Noi</button>
          <button class={`seg-btn${sideSel === 'THEM' ? ' active' : ''}`} onClick={() => { setSideSel('THEM'); setPlayerId('ALL'); }}>Loro</button>
        </div>
      </div>
      {sideSel === 'US' && (
        <div>
          <select value={playerId} onChange={(e) => setPlayerId((e.target as HTMLSelectElement).value)} style="margin:0">
            <option value="ALL">Tutti i giocatori</option>
            {players.map((p) => <option key={p.id} value={p.id}>#{p.number} {p.lastName}</option>)}
          </select>
        </div>
      )}
      <div class="row">
        <select value={period} onChange={(e) => setPeriod((e.target as HTMLSelectElement).value)} style="margin:0">
          <option value="ALL">Tutti i periodi</option>
          {periods.map((p) => <option key={p} value={String(p)}>{periodLabel(p, game.periodsRegulation)}</option>)}
        </select>
        <select value={outcome} onChange={(e) => setOutcome((e.target as HTMLSelectElement).value as 'ALL' | 'MADE' | 'MISSED')} style="margin:0">
          <option value="ALL">Tutti i tiri</option><option value="MADE">Segnati</option><option value="MISSED">Sbagliati</option>
        </select>
      </div>
      <div class="chart-wrap"><Court shots={shots} class="chart" /></div>
      <div class="zones">
        <div class="card"><span class="muted">Sotto canestro</span><br /><b>{paint.m}/{paint.a}</b> · {fmtPct(paint.m, paint.a)}</div>
        <div class="card"><span class="muted">Da 2</span><br /><b>{mid.m}/{mid.a}</b> · {fmtPct(mid.m, mid.a)}</div>
        <div class="card"><span class="muted">Da 3</span><br /><b>{three.m}/{three.a}</b> · {fmtPct(three.m, three.a)}</div>
        <div class="card"><span class="muted">Liberi</span><br /><b>{ft.m}/{ft.a}</b> · {fmtPct(ft.m, ft.a)}</div>
      </div>
      <p class="muted legend"><span class="legend-made" /> canestro <span class="legend-missed">✕</span> errore · i liberi sono sulla lunetta</p>
    </div>
  );
}
