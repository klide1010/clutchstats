import { useEffect, useState } from 'preact/hooks';
import { computeBoxScore, type Game, type GameEvent } from '@bkstats/shared';
import { eventsRepo } from '../db';
import { games, loadGames } from '../state/games';
import { loadOpponents, opponents } from '../state/opponents';
import { ensureTeam, hasLocalTeam, loadPlayers, myTeam, players } from '../state/team';
import { trySync } from '../api/sync';
import { isLoggedIn } from '../state/session';
import { navigate } from '../router';
import { fmtDate } from '../ui/IcsImport';
import { SyncButton } from '../ui/SyncButton';
import { Icon } from '../ui/Icon';
import { computeSeason } from '../model/season';
import { fmtPct } from '../model/export';

export function Home() {
  const [scores, setScores] = useState<Record<string, { us: number; them: number }>>({});
  const [tiles, setTiles] = useState<{ ppg: string; p3: string; rpg: string } | null>(null);

  useEffect(() => {
    (async () => {
      // Primo avvio su questo dispositivo: prova a scaricare i dati prima di creare una squadra vuota.
      if (!(await hasLocalTeam()) && isLoggedIn.peek()) await trySync();
      await ensureTeam();
      await Promise.all([loadGames(), loadOpponents(), loadPlayers()]);
      const allClosed = games.value.filter((g) => g.status === 'CLOSED');
      const byGame: Record<string, GameEvent[]> = {};
      for (const g of allClosed) byGame[g.id] = await eventsRepo.byGame(g.id);
      const s: Record<string, { us: number; them: number }> = {};
      for (const g of allClosed.slice(-3)) s[g.id] = computeBoxScore(g, byGame[g.id], players.value).score;
      setScores(s);
      if (allClosed.length) {
        const se = computeSeason(allClosed, byGame, players.value);
        const n = se.gamesPlayed || 1;
        setTiles({ ppg: (se.team.pts / n).toFixed(1), p3: fmtPct(se.team.fg3m, se.team.fg3a), rpg: (se.team.reb / n).toFixed(1) });
      }
    })();
  }, []);

  const oppName = (g: Game) => opponents.value.find((o) => o.id === g.opponentId)?.name ?? 'Avversario';
  const live = games.value.find((g) => g.status === 'LIVE');
  const next = games.value.filter((g) => g.status === 'SCHEDULED').sort((a, b) => a.date.localeCompare(b.date))[0];
  const recent = games.value.filter((g) => g.status === 'CLOSED').slice(-3).reverse();
  const record = recent.reduce((r, g) => { const s = scores[g.id]; if (s) { if (s.us > s.them) r.won++; else if (s.us < s.them) r.lost++; } return r; }, { won: 0, lost: 0 });

  return (
    <main class="page stack">
      <div class="brand">
        <span class="brand-mark"><img src="/clutchstats-mark.png" alt="" width="34" height="34" /></span>
        <span class="brand-name">Clutch<span>Stats</span></span>
      </div>
      <div class="row" style="justify-content:flex-start">
        {myTeam.value?.logoUrl ? <img src={myTeam.value.logoUrl} alt="" class="team-logo" style="flex:0 0 auto" /> : <span class="team-logo placeholder"><Icon name="ball" size={24} /></span>}
        <div style="flex:1;display:flex;flex-direction:column">
          <h1 style="margin:0">{myTeam.value?.name ?? 'La mia squadra'}</h1>
          {record.won + record.lost > 0 && <span class="muted" style="font-size:0.85rem;font-weight:600"><span class="ok-text">{record.won}V</span> <span class="err-text">{record.lost}P</span> nelle ultime {record.won + record.lost}</span>}
        </div>
      </div>
      {tiles && (
        <div class="tiles">
          <div class="tile"><span class="tile-label">Punti / g</span><span class="tile-value">{tiles.ppg}</span></div>
          <div class="tile"><span class="tile-label">Da 3</span><span class="tile-value accent-text">{tiles.p3}</span></div>
          <div class="tile"><span class="tile-label">Rimbalzi / g</span><span class="tile-value data-text">{tiles.rpg}</span></div>
        </div>
      )}
      {live && (
        <div class="card stack" style="border-color:var(--primary)">
          <strong class="card-title"><Icon name="play" size={18} /> Partita in corso</strong>
          <span>{live.home ? 'vs' : '@'} {oppName(live)} · {fmtDate(live.date)}</span>
          <button class="btn btn-primary btn-block" onClick={() => navigate(`#/game/${live.id}`)}>Riprendi</button>
        </div>
      )}
      {next && (
        <div class="card stack">
          <strong class="card-title"><Icon name="calendar" size={18} /> Prossima partita</strong>
          <span>{next.home ? 'vs' : '@'} {oppName(next)} · {fmtDate(next.date)}{next.venue ? ` · ${next.venue}` : ''}</span>
          <button class="btn btn-block" onClick={() => navigate(`#/game/${next.id}`)}>Apri</button>
        </div>
      )}
      {!live && !next && (
        <div class="card stack">
          <span class="muted">Nessuna partita programmata.</span>
          <button class="btn btn-block" onClick={() => navigate('#/calendar')}>Vai al calendario</button>
        </div>
      )}
      {recent.length > 0 && (
        <>
          <h2 class="with-icon"><Icon name="trophy" size={16} /> Ultime partite</h2>
          <ul class="list">
            {recent.map((g) => (
              <li key={g.id} onClick={() => navigate(`#/stats/${g.id}`)}>
                <span style="flex:1">{g.home ? 'vs' : '@'} {oppName(g)}<br /><span class="muted">{fmtDate(g.date)}</span></span>
                <b>{scores[g.id] ? `${scores[g.id].us} – ${scores[g.id].them}` : ''}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      <SyncButton />
    </main>
  );
}
