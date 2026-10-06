import { useEffect, useState } from 'preact/hooks';
import type { GameEvent } from '@bkstats/shared';
import { eventsRepo } from '../db';
import { games, loadGames } from '../state/games';
import { loadPlayers, players } from '../state/team';
import { computeSeason, type Season as SeasonData } from '../model/season';
import { fmtMinutes, fmtPct } from '../model/export';

export function Season() {
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [avg, setAvg] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([loadGames(), loadPlayers()]);
      const closed = games.value.filter((g) => g.status === 'CLOSED');
      const byGame: Record<string, GameEvent[]> = {};
      for (const g of closed) byGame[g.id] = await eventsRepo.byGame(g.id);
      setSeason(computeSeason(closed, byGame, players.value));
    })();
  }, []);

  if (!season) return <main class="page"><p class="muted">Caricamento…</p></main>;
  const byId = new Map(players.value.map((p) => [p.id, p]));
  const d = (v: number, n: number) => (avg ? (n ? (v / n).toFixed(1) : '-') : String(v));
  const shots = (m: number, a: number, n: number) => (avg ? fmtPct(m, a) : `${m}/${a}`) + (avg && n ? '' : '');
  const gp = season.gamesPlayed;

  return (
    <main class="page stack">
      <h1>Stagione</h1>
      <div class="card">
        <div class="final-score"><b>{season.record.won}</b><span class="muted">V</span><span class="muted">–</span><b>{season.record.lost}</b><span class="muted">P</span></div>
        <p class="muted" style="text-align:center;margin:4px 0 0">{gp} partite chiuse · PT {season.team.pts} fatti, {season.opponentPts} subiti{gp ? ` · media ${(season.team.pts / gp).toFixed(1)} – ${(season.opponentPts / gp).toFixed(1)}` : ''}</p>
      </div>
      <div class="seg">
        <button class={`seg-btn${!avg ? ' active' : ''}`} onClick={() => setAvg(false)}>Totali</button>
        <button class={`seg-btn${avg ? ' active' : ''}`} onClick={() => setAvg(true)}>Medie</button>
      </div>
      <div class="table-wrap">
        <table class="stats">
          <thead><tr><th class="sticky">Giocatore</th><th>PG</th><th>Min</th><th>PT</th><th>T2</th><th>T3</th><th>TL</th><th>RO</th><th>RD</th><th>RT</th><th>AS</th><th>PP</th><th>PR</th><th>ST</th><th>SS</th><th>FF</th><th>FS</th><th>BL</th><th>+/-</th><th>Val</th></tr></thead>
          <tbody>
            {season.players.filter((l) => byId.get(l.playerId)?.active || l.gamesPlayed > 0).map((l) => {
              const p = byId.get(l.playerId); const n = l.gamesPlayed;
              return (
                <tr key={l.playerId}>
                  <td class="sticky"><b>{p ? `#${p.number}` : ''}</b> {p?.lastName ?? l.playerId}</td>
                  <td>{n}</td><td>{avg ? (n ? fmtMinutes(l.seconds / n) : '-') : fmtMinutes(l.seconds)}</td>
                  <td><b>{d(l.pts, n)}</b></td><td>{shots(l.fg2m, l.fg2a, n)}</td><td>{shots(l.fg3m, l.fg3a, n)}</td><td>{shots(l.ftm, l.fta, n)}</td>
                  <td>{d(l.oreb, n)}</td><td>{d(l.dreb, n)}</td><td>{d(l.reb, n)}</td><td>{d(l.ast, n)}</td><td>{d(l.tov, n)}</td><td>{d(l.stl, n)}</td>
                  <td>{d(l.blk, n)}</td><td>{d(l.blkR, n)}</td><td>{d(l.pf, n)}</td><td>{d(l.pfd, n)}</td><td>{d(l.screens, n)}</td><td>{d(l.plusMinus, n)}</td><td><b>{d(l.rating, n)}</b></td>
                </tr>
              );
            })}
            <tr class="total">
              <td class="sticky">Squadra</td><td>{gp}</td><td></td>
              <td>{d(season.team.pts, gp)}</td><td>{shots(season.team.fg2m, season.team.fg2a, gp)}</td><td>{shots(season.team.fg3m, season.team.fg3a, gp)}</td><td>{shots(season.team.ftm, season.team.fta, gp)}</td>
              <td>{d(season.team.oreb, gp)}</td><td>{d(season.team.dreb, gp)}</td><td>{d(season.team.reb, gp)}</td><td>{d(season.team.ast, gp)}</td><td>{d(season.team.tov, gp)}</td><td>{d(season.team.stl, gp)}</td>
              <td>{d(season.team.blk, gp)}</td><td>{d(season.team.blkR, gp)}</td><td>{d(season.team.pf, gp)}</td><td>{d(season.team.pfd, gp)}</td><td>{d(season.team.screens, gp)}</td><td></td><td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
