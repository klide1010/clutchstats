import { useEffect, useState } from 'preact/hooks';
import type { GameEvent, Player } from '@bkstats/shared';
import { eventsRepo } from '../db';
import { games, loadGames } from '../state/games';
import { loadPlayers, players } from '../state/team';
import { computeSeason, type Season as SeasonData } from '../model/season';
import { fmtMinutes, fmtPct } from '../model/export';
import { SPECIAL_COLS, countSpecialFouls, type KindCounts, type SpecialFouls } from '../model/fouls';
import { Shot } from '../ui/BoxScoreTable';
import { PageTitle } from '../ui/PageTitle';

interface TableProps { season: SeasonData; players: Player[]; avg: boolean; special: SpecialFouls }

/** Tabella di stagione: totali (tiri con percentuale sotto, come nel box score) o medie a partita. */
export function SeasonTable({ season, players: list, avg, special }: TableProps) {
  const byId = new Map(list.map((p) => [p.id, p]));
  const d = (v: number, n: number) => (avg ? (n ? (v / n).toFixed(1) : '-') : String(v));
  const shots = (m: number, a: number) => (avg ? <td>{fmtPct(m, a)}</td> : <Shot m={m} a={a} />);
  const cols = SPECIAL_COLS.filter((c) => special.kinds.includes(c.kind));
  const extra = (k: KindCounts | undefined, n: number) => cols.map((c) => <td key={c.abbr}>{d(k ? k[c.kind] : 0, n)}</td>);
  const gp = season.gamesPlayed;
  const t = season.team;

  return (
    <>
      <div class="table-wrap">
        <table class="stats">
          <thead><tr><th class="sticky">Giocatore</th><th>PG</th><th>Min</th><th>PT</th><th>T2</th><th>T3</th><th>TL</th><th>RO</th><th>RD</th><th>RT</th><th>AS</th><th>PP</th><th>PR</th><th>ST</th><th>SS</th><th>FF</th>{cols.map((c) => <th key={c.abbr}>{c.abbr}</th>)}<th>FS</th><th>BL</th><th>+/-</th><th>Val</th></tr></thead>
          <tbody>
            {season.players.filter((l) => byId.get(l.playerId)?.active || l.gamesPlayed > 0).map((l) => {
              const p = byId.get(l.playerId); const n = l.gamesPlayed;
              return (
                <tr key={l.playerId}>
                  <td class="sticky"><span class="name-cell"><b>{p ? `#${p.number}` : ''}</b> {p?.lastName ?? l.playerId}</span></td>
                  <td>{n}</td><td>{avg ? (n ? fmtMinutes(l.seconds / n) : '-') : fmtMinutes(l.seconds)}</td>
                  <td><b>{d(l.pts, n)}</b></td>{shots(l.fg2m, l.fg2a)}{shots(l.fg3m, l.fg3a)}{shots(l.ftm, l.fta)}
                  <td>{d(l.oreb, n)}</td><td>{d(l.dreb, n)}</td><td>{d(l.reb, n)}</td><td>{d(l.ast, n)}</td><td>{d(l.tov, n)}</td><td>{d(l.stl, n)}</td>
                  <td>{d(l.blk, n)}</td><td>{d(l.blkR, n)}</td><td>{d(l.pf, n)}</td>{extra(special.byPlayer[l.playerId], n)}<td>{d(l.pfd, n)}</td><td>{d(l.screens, n)}</td><td>{d(l.plusMinus, n)}</td><td><b>{d(l.rating, n)}</b></td>
                </tr>
              );
            })}
            <tr class="total">
              <td class="sticky">Squadra</td><td>{gp}</td><td></td>
              <td>{d(t.pts, gp)}</td>{shots(t.fg2m, t.fg2a)}{shots(t.fg3m, t.fg3a)}{shots(t.ftm, t.fta)}
              <td>{d(t.oreb, gp)}</td><td>{d(t.dreb, gp)}</td><td>{d(t.reb, gp)}</td><td>{d(t.ast, gp)}</td><td>{d(t.tov, gp)}</td><td>{d(t.stl, gp)}</td>
              <td>{d(t.blk, gp)}</td><td>{d(t.blkR, gp)}</td><td>{d(t.pf, gp)}</td>{extra(special.team, gp)}<td>{d(t.pfd, gp)}</td><td>{d(t.screens, gp)}</td><td></td><td></td>
            </tr>
          </tbody>
        </table>
      </div>
      {cols.length > 0 && <p class="muted" style="margin:0;font-size:0.8rem">{cols.map((c) => `${c.abbr} ${c.label}`).join(' · ')} (già contati in FF)</p>}
    </>
  );
}

export function Season() {
  const [season, setSeason] = useState<SeasonData | null>(null);
  const [special, setSpecial] = useState<SpecialFouls | null>(null);
  const [avg, setAvg] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.all([loadGames(), loadPlayers()]);
      const closed = games.value.filter((g) => g.status === 'CLOSED');
      const byGame: Record<string, GameEvent[]> = {};
      for (const g of closed) byGame[g.id] = await eventsRepo.byGame(g.id);
      setSeason(computeSeason(closed, byGame, players.value));
      setSpecial(countSpecialFouls(closed.reduce((all, g) => all.concat(byGame[g.id]), [] as GameEvent[])));
    })();
  }, []);

  if (!season || !special) return <main class="page"><p class="muted">Caricamento…</p></main>;
  const gp = season.gamesPlayed;

  return (
    <main class="page stack">
      <PageTitle icon="trophy">Stagione</PageTitle>
      <div class="card">
        <div class="final-score"><b>{season.record.won}</b><span class="muted">V</span><span class="muted">–</span><b>{season.record.lost}</b><span class="muted">P</span></div>
        <p class="muted" style="text-align:center;margin:4px 0 0">{gp} partite chiuse · PT {season.team.pts} fatti, {season.opponentPts} subiti{gp ? ` · media ${(season.team.pts / gp).toFixed(1)} – ${(season.opponentPts / gp).toFixed(1)}` : ''}</p>
      </div>
      <div class="seg">
        <button class={`seg-btn${!avg ? ' active' : ''}`} onClick={() => setAvg(false)}>Totali</button>
        <button class={`seg-btn${avg ? ' active' : ''}`} onClick={() => setAvg(true)}>Medie</button>
      </div>
      <SeasonTable season={season} players={players.value} avg={avg} special={special} />
    </main>
  );
}
