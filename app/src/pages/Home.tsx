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

export function Home() {
  const [scores, setScores] = useState<Record<string, { us: number; them: number }>>({});

  useEffect(() => {
    (async () => {
      // Primo avvio su questo dispositivo: prova a scaricare i dati prima di creare una squadra vuota.
      if (!(await hasLocalTeam()) && isLoggedIn.peek()) await trySync();
      await ensureTeam();
      await Promise.all([loadGames(), loadOpponents(), loadPlayers()]);
      const closed = games.value.filter((g) => g.status === 'CLOSED').slice(-3);
      const s: Record<string, { us: number; them: number }> = {};
      for (const g of closed) {
        const evs: GameEvent[] = await eventsRepo.byGame(g.id);
        s[g.id] = computeBoxScore(g, evs, players.value).score;
      }
      setScores(s);
    })();
  }, []);

  const oppName = (g: Game) => opponents.value.find((o) => o.id === g.opponentId)?.name ?? 'Avversario';
  const live = games.value.find((g) => g.status === 'LIVE');
  const next = games.value.filter((g) => g.status === 'SCHEDULED').sort((a, b) => a.date.localeCompare(b.date))[0];
  const recent = games.value.filter((g) => g.status === 'CLOSED').slice(-3).reverse();
  const record = recent.reduce((r, g) => { const s = scores[g.id]; if (s) { if (s.us > s.them) r.won++; else if (s.us < s.them) r.lost++; } return r; }, { won: 0, lost: 0 });

  return (
    <main class="page stack">
      <h1>{myTeam.value?.name ?? 'BKStats'}</h1>
      {live && (
        <div class="card stack" style="border-color:var(--primary)">
          <strong>Partita in corso</strong>
          <span>{live.home ? 'vs' : '@'} {oppName(live)} · {fmtDate(live.date)}</span>
          <button class="btn btn-primary btn-block" onClick={() => navigate(`#/game/${live.id}`)}>Riprendi</button>
        </div>
      )}
      {next && (
        <div class="card stack">
          <strong>Prossima partita</strong>
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
          <h2>Ultime partite {record.won + record.lost > 0 ? `· ${record.won}V ${record.lost}P` : ''}</h2>
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
